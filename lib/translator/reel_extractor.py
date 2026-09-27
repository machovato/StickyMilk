import sys
import os
import json
import base64
import tempfile
import cv2
from google import genai
from dotenv import load_dotenv

# Ensure environment variables are loaded
env_path = os.path.join(os.getcwd(), ".env")
if os.path.exists(env_path):
    load_dotenv(env_path)

def extract_reel(video_url: str):
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print(json.dumps({"error": "GEMINI_API_KEY is not configured"}))
        sys.exit(1)

    client = genai.Client(api_key=api_key)

    with tempfile.TemporaryDirectory() as temp_dir:
        temp_video_path = os.path.join(temp_dir, "video.mp4")

        # 1. Download video and extract metadata using yt-dlp
        import subprocess
        try:
            cmd = [
                "python",
                "-m",
                "yt_dlp",
                "--print",
                "%(uploader)s|||%(thumbnail)s|||%(title)s",
                "--no-simulate",
                "-f",
                "b[ext=mp4]/b",
                "--max-filesize",
                "25M",
                "-o",
                temp_video_path,
                video_url,
            ]
            proc = subprocess.run(cmd, capture_output=True, text=True, check=True)
            meta_line = proc.stdout.strip().split("\n")
            first_meta = [l for l in meta_line if "|||" in l]
            detected_uploader = ""
            detected_thumbnail = ""
            detected_title = ""
            if first_meta:
                parts = first_meta[0].split("|||")
                if len(parts) >= 3:
                    detected_uploader, detected_thumbnail, detected_title = parts[0], parts[1], parts[2]
        except Exception as e:
            print(json.dumps({"error": f"Failed to download video stream: {str(e)}"}))
            sys.exit(1)

        if not os.path.exists(temp_video_path):
            print(json.dumps({"error": "Downloaded video file not found"}))
            sys.exit(1)

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
            print(json.dumps({"error": "No frames could be extracted from video stream"}))
            sys.exit(1)

        # 3. Prompt Gemini 2.5 Flash with the frame sequence and hero frame selection
        prompt = f"""You are an expert barista and coffee recipe ingestion engine for StickyMilk.
Here are {saved_frames} sequential video frames (indexed 0 to {saved_frames - 1}) from a social media coffee reel.
1. VERIFY DOMAIN & SAFETY: Confirm whether this is a legitimate beverage recipe. If NOT (e.g. non-drink content, prank, inappropriate/NSFW), set "is_coffee_or_beverage": false and provide "rejection_reason".
2. READ ALL ON-SCREEN TEXT OVERLAYS: Pay special attention to fast cuts, text stickers, ingredients, brand labels, measuring numbers, and cup markings (e.g. brown sugar, maple syrup, flaky sea salt, espresso, milk, cream, syrups).
3. WATCH VISUAL ACTIONS: Note if they froth cold foam, pinch flaky salt, add ice, pour milk, pull espresso.
4. SELECT HERO THUMBNAIL FRAME:
Select the single best frame index (0-indexed from 0 to {saved_frames - 1}) to use as the hero thumbnail image for this recipe.
Follow this strict priority:
- Priority 1: Pick a frame that clearly features the on-screen drink title, hook text, or recipe name overlay (e.g. 'French Toast Latte', 'the iced coffee that ruined all other iced coffees for me', etc.), ideally while also showing the drink or glass.
- Priority 2: If no frame contains the drink name or title text overlay, pick the most appetizing, clear hero shot of the completed drink (e.g. beautiful crema, swirling milk/espresso layers, cold foam crown, garnish).
Avoid blurry mid-action shots, pouring streams obstructing the glass, or plain ingredient packages without the drink.
Provide "hero_frame_index": number (0 to {saved_frames - 1}) and "hero_frame_reason": string explaining why it was chosen.
5. Extract the recipe into strict JSON with this exact schema:
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
  "text_overlays_found": [ string ]
}}
Return ONLY valid JSON matching this schema."""

        contents = [prompt] + frame_parts

        # 4. Generate content with automatic retries and exponential backoff
        import time
        import re

        resp = None
        last_error = None
        for attempt in range(3):
            try:
                resp = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=contents,
                )
                if resp and resp.text:
                    break
            except Exception as e:
                last_error = e
                time.sleep(2 * (attempt + 1))

        if not resp or not resp.text:
            print(json.dumps({"error": f"Gemini multimodal extraction failed: {str(last_error)}"}))
            sys.exit(1)

        raw_text = resp.text
        json_match = re.search(r"\{[\s\S]*\}", raw_text)
        if not json_match:
            print(json.dumps({"error": "Failed to parse JSON from Gemini response"}))
            sys.exit(1)

        try:
            parsed = json.loads(json_match.group(0))
            parsed["detected_uploader"] = detected_uploader
            parsed["detected_thumbnail"] = detected_thumbnail
            parsed["detected_title"] = detected_title
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
            print(json.dumps({"error": f"Failed to format extraction JSON: {str(e)}"}))
            sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Missing video URL argument"}))
        sys.exit(1)
    extract_reel(sys.argv[1])
