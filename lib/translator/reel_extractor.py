import sys
import os
import json
import base64
import tempfile
import re
import subprocess
import time
import cv2
from google import genai
from google.genai import errors as genai_errors
from google.genai import types as genai_types
from dotenv import load_dotenv

# Ensure environment variables are loaded
env_path = os.path.join(os.getcwd(), ".env")
if os.path.exists(env_path):
    load_dotenv(env_path)

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Error codes shared with lib/translator/video-ai.ts (VideoExtractionErrorCode).
# Always exit 0 and report failures as {"error", "code"} JSON on stdout so the
# Node side can tell "TikTok blocked us" apart from "Gemini is down".
def fail(code: str, message: str):
    print(json.dumps({"error": message, "code": code}))
    sys.exit(0)


# HTTP statuses worth retrying. 4xx other than 429 (bad request, auth, payload
# rejected) will fail the same way every time, so retrying only adds latency.
RETRYABLE_STATUS = {429, 500, 502, 503, 504}

# Structured-output schema: Gemini is constrained to return exactly this shape,
# so no regex-scraping of JSON out of free text.
RESPONSE_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "is_coffee_or_beverage": {"type": "BOOLEAN"},
        "rejection_reason": {"type": "STRING"},
        "raw_title": {"type": "STRING"},
        "hero_frame_index": {"type": "INTEGER"},
        "hero_frame_reason": {"type": "STRING"},
        "creator_handle": {"type": "STRING"},
        "creator_name": {"type": "STRING"},
        "stated_coffee": {
            "type": "OBJECT",
            "properties": {
                "raw_name": {"type": "STRING"},
                "system": {"type": "STRING", "enum": ["vertuo", "original", "capsule", "instant"]},
                "shots": {"type": "NUMBER"},
                "roast_profile": {"type": "STRING", "enum": ["light", "medium", "dark"]},
            },
        },
        "raw_ingredients": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "amount": {"type": "NUMBER"},
                    "unit": {"type": "STRING"},
                    "item": {"type": "STRING"},
                    "group": {"type": "STRING", "enum": ["Cold Foam", "Latte Base", "Garnish"]},
                    "optional": {"type": "BOOLEAN"},
                },
                "required": ["item"],
            },
        },
        "raw_steps": {"type": "ARRAY", "items": {"type": "STRING"}},
        "text_overlays_found": {"type": "ARRAY", "items": {"type": "STRING"}},
        # Hot vs iced, a one-line tasting description, and the kind of drink
        "temperature": {"type": "STRING", "enum": ["iced", "hot", "blended"]},
        "description": {"type": "STRING"},
        "drink_style": {"type": "STRING"},
    },
    "required": ["is_coffee_or_beverage", "raw_ingredients", "raw_steps"],
}


def extract_reel(video_url: str, user_caption: str = ""):
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        fail("NOT_CONFIGURED", "GEMINI_API_KEY is not configured")

    client = genai.Client(api_key=api_key)

    with tempfile.TemporaryDirectory() as temp_dir:
        temp_video_path = os.path.join(temp_dir, "video.mp4")

        # 1. Download video and extract metadata using yt-dlp
        detected_uploader = ""
        detected_thumbnail = ""
        detected_title = ""
        detected_description = ""
        detected_comments = []

        try:
            cmd = [
                sys.executable,
                "-m",
                "yt_dlp",
                "--dump-json",
                "--write-comments",
                "--no-simulate",
                "-f",
                "b[ext=mp4]/b",
                "--max-filesize",
                "25M",
                "-o",
                temp_video_path,
                video_url,
            ]
            proc = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                check=True,
            )
            for line in proc.stdout.strip().split("\n"):
                line = line.strip()
                if line.startswith("{") and line.endswith("}"):
                    try:
                        meta = json.loads(line)
                        detected_uploader = meta.get("uploader") or meta.get("uploader_id") or ""
                        detected_thumbnail = meta.get("thumbnail") or ""
                        detected_title = meta.get("title") or ""
                        detected_description = meta.get("description") or ""
                        comments_raw = meta.get("comments") or []
                        if isinstance(comments_raw, list):
                            detected_comments = [
                                f"{c.get('author', 'User')}: {c.get('text', '')}"
                                for c in comments_raw
                                if isinstance(c, dict) and c.get("text")
                            ]
                        break
                    except Exception:
                        continue
        except subprocess.CalledProcessError as e:
            stderr = (e.stderr or "").strip()
            fail("DOWNLOAD_FAILED", f"Failed to download video stream: {stderr[-500:] or e}")
        except Exception as e:
            fail("DOWNLOAD_FAILED", f"Failed to download video stream: {e}")

        if not os.path.exists(temp_video_path):
            # yt-dlp exits 0 but skips the download when --max-filesize is exceeded
            output = f"{proc.stdout}\n{proc.stderr}"
            if "max-filesize" in output or "larger than max" in output:
                fail("TOO_LARGE", "Video is larger than the 25 MB limit")
            fail("DOWNLOAD_FAILED", "Downloaded video file not found")

        # 2. Extract frames at high temporal resolution (2 FPS = every 0.5s) to catch fast micro-cuts
        cap = cv2.VideoCapture(temp_video_path)
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 0
        duration = total_frames / fps if fps else 0

        # Calculate sampling interval: default to 2 FPS (every 0.5s) for short reels
        # For longer videos (>20s), dynamically scale so total frames stay around 40-45
        step_seconds = 0.5
        if duration > 20:
            step_seconds = max(0.5, duration / 45.0)

        step_frames = max(1, int(fps * step_seconds))

        frame_parts = []
        raw_frame_data = []
        frame_idx = 0
        saved_frames = 0

        while cap.isOpened() and saved_frames < 48:
            ret, frame = cap.read()
            if not ret:
                break
            if frame_idx % step_frames == 0:
                # Resize large frames to max width 540 to keep Gemini payload compact and fast
                h, w = frame.shape[:2]
                if w > 540:
                    scale = 540.0 / w
                    frame = cv2.resize(frame, (540, int(h * scale)))

                success, enc = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
                if success:
                    b64_str = base64.b64encode(enc.tobytes()).decode("utf-8")
                    raw_frame_data.append(b64_str)
                    frame_parts.append({
                        "inline_data": {
                            "mime_type": "image/jpeg",
                            "data": b64_str,
                        }
                    })
                    saved_frames += 1
            frame_idx += 1

        cap.release()

        if not frame_parts:
            fail("NO_FRAMES", "No frames could be extracted from video stream")

        # 3. Build unified caption & comments context
        caption_context_parts = []
        if user_caption and user_caption.strip():
            caption_context_parts.append(f"USER SUPPLIED CAPTION / COMMENTS:\n{user_caption.strip()}")
        if detected_description and detected_description.strip():
            caption_context_parts.append(f"CREATOR POST CAPTION / DESCRIPTION:\n{detected_description.strip()}")
        if detected_comments:
            comments_text = "\n".join(detected_comments[:10])
            caption_context_parts.append(f"REEL COMMENTS (CREATOR & TOP COMMENTS):\n{comments_text.strip()}")

        full_caption_context = "\n\n".join(caption_context_parts)

        caption_prompt_section = ""
        if full_caption_context:
            caption_prompt_section = f"""2. CROSS-REFERENCE VISUAL ACTIONS WITH POST CAPTION & COMMENTS:
The creator included the following text in their post caption/description or comments:
\"\"\"
{full_caption_context}
\"\"\"
CRITICAL RULES FOR EXTRACTING INGREDIENTS & MEASUREMENTS:
- Social media coffee creators almost always write the exact recipe measurements (oz, ml, tbsp, tsp, pumps, grams, cups, pinches, dashes) in their caption or comments.
- Correlate what you see poured/prepared in the video with the ingredients and measurements in the text above.
- When numerical quantities or units (e.g. "0.5oz maple syrup", "0.5oz honey", "2oz espresso", "6-8oz milk", "dash of cinnamon", "dash of salt") are listed in the caption or comments, you MUST extract those exact numbers into "amount" and exact unit strings into "unit" in "raw_ingredients".
- For qualitative measurements like "dash of cinnamon" or "pinch of salt", set amount=1 and unit="dash" or "pinch" (or set unit="dash").
- Do NOT output ingredients with missing amounts if the measurement is clearly stated in the caption or comments above!"""
        else:
            caption_prompt_section = "2. WATCH VISUAL ACTIONS & INGREDIENT RATIOS: Note pouring volumes, milk levels, syrup pumps, and spices added."

        # 4. Prompt Gemini with the frame sequence, caption context, and hero frame selection
        prompt = f"""You are an expert barista and coffee recipe ingestion engine for StickyMilk.
Here are {saved_frames} sequential video frames (indexed 0 to {saved_frames - 1}) from a social media coffee reel.
1. VERIFY DOMAIN & SAFETY: Confirm whether this is a legitimate beverage recipe. If NOT (e.g. non-drink content, prank, inappropriate/NSFW), set "is_coffee_or_beverage": false and provide "rejection_reason".
{caption_prompt_section}
3. READ ALL ON-SCREEN TEXT OVERLAYS: Pay special attention to fast cuts, text stickers, ingredients, brand labels, measuring numbers, and cup markings (e.g. brown sugar, maple syrup, flaky sea salt, espresso, milk, cream, syrups).
4. SELECT HERO THUMBNAIL FRAME:
Select the single best frame index (0-indexed from 0 to {saved_frames - 1}) to use as the hero thumbnail image for this recipe.
Follow this strict priority:
- Priority 1: Pick a frame that clearly features the on-screen drink title, hook text, or recipe name overlay (e.g. 'French Toast Latte', 'the iced coffee that ruined all other iced coffees for me', etc.), ideally while also showing the drink or glass.
- Priority 2: If no frame contains the drink name or title text overlay, pick the most appetizing, clear hero shot of the completed drink (e.g. beautiful crema, swirling milk/espresso layers, cold foam crown, garnish).
Avoid blurry mid-action shots, pouring streams obstructing the glass, or plain ingredient packages without the drink.
5. IDENTIFY COFFEE PREPARATION METHOD & SYSTEM:
Accurately identify the original coffee preparation method:
- "instant": If the video or caption uses instant coffee powder, crystals, or granules (e.g. Nescafé, Medaglia d'Oro, instant espresso, granules dissolved in hot water).
- "capsule": If the creator uses a frozen liquid coffee extract capsule (e.g. Cometeer).
- "vertuo": If the creator brews a Nespresso Vertuo dome-shaped pod.
- "original": If the creator uses a standard espresso machine (portafilter shot, Breville, De'Longhi, moka pot, or small Nespresso Original capsule).
Set "raw_name" to the specific coffee used (e.g. "Instant Coffee", "Nescafé Gold", "Double Espresso Chiaro", "Espresso").
6. Extract the recipe into strict JSON with this exact schema:
{{
  "is_coffee_or_beverage": boolean,
  "rejection_reason": string,
  "raw_title": string,
  "hero_frame_index": number,
  "hero_frame_reason": string,
  "creator_handle": string,
  "creator_name": string,
  "stated_coffee": {{
    "raw_name": string,
    "system": "vertuo" | "original" | "capsule" | "instant",
    "shots": number,
    "roast_profile": "light" | "medium" | "dark"
  }},
  "raw_ingredients": [
    {{
      "amount": number,
      "unit": string,
      "item": string,
      "group": "Cold Foam" | "Latte Base" | "Garnish",
      "optional": boolean
    }}
  ],
  "raw_steps": [ string ],
  "text_overlays_found": [ string ],
  "temperature": "iced" | "hot" | "blended",
  "description": string,   // ONE sentence in your own words on how the drink tastes; no marketing fluff
  "drink_style": string    // 1-3 lowercase words, e.g. "iced latte", "cappuccino", "shaken espresso", "cold brew"
}}
Return ONLY valid JSON matching this schema."""

        contents = [prompt] + frame_parts

        # 5. Generate content, trying fallback models if quota is exhausted or model is unavailable
        config = genai_types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=RESPONSE_SCHEMA,
        )
        FALLBACK_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-3.5-flash-lite", "gemini-3.8-flash"]
        resp = None
        last_error = None
        for model_name in FALLBACK_MODELS:
            for attempt in range(2):
                try:
                    resp = client.models.generate_content(
                        model=model_name,
                        contents=contents,
                        config=config,
                    )
                    if resp and resp.text:
                        break
                except genai_errors.APIError as e:
                    last_error = e
                    # If quota exhausted (429) or not found (404), break immediately to next model
                    if e.code in (429, 404):
                        break
                    if e.code not in RETRYABLE_STATUS:
                        break
                    time.sleep(2 * (attempt + 1))
                except Exception as e:
                    last_error = e
                    time.sleep(2 * (attempt + 1))
            if resp and resp.text:
                break

        if not resp or not resp.text:
            fail("MODEL_UNAVAILABLE", f"Gemini multimodal extraction failed across fallback models: {last_error}")

        raw_text = resp.text
        json_match = re.search(r"\{[\s\S]*\}", raw_text)
        if not json_match:
            fail("PARSE_FAILED", "Failed to parse JSON from Gemini response")

        try:
            parsed = json.loads(json_match.group(0))
            parsed["detected_uploader"] = detected_uploader
            parsed["detected_thumbnail"] = detected_thumbnail
            parsed["detected_title"] = detected_title
            parsed["detected_description"] = detected_description
            parsed["video_duration"] = duration
            parsed["frames_analyzed"] = saved_frames

            # Extract hero frame base64
            hero_idx = parsed.get("hero_frame_index")
            if isinstance(hero_idx, int) and 0 <= hero_idx < len(raw_frame_data):
                parsed["hero_frame_base64"] = raw_frame_data[hero_idx]
            elif raw_frame_data:
                parsed["hero_frame_base64"] = raw_frame_data[0]

            print(json.dumps(parsed))
        except Exception as e:
            fail("PARSE_FAILED", f"Failed to format extraction JSON: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        fail("UNKNOWN", "Missing video URL argument")
    user_caption = sys.argv[2] if len(sys.argv) > 2 else ""
    extract_reel(sys.argv[1], user_caption)
