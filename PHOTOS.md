# Recipe photos

AI-generated recipe photos in one consistent **"home kitchen plus"** style:
same kitchen, light and angle every time, with fresh background staging per
render so no two photos are the same shot with a different drink.

## Using it
1. Sign in as admin and open a recipe's **Edit** page.
2. **Photo studio → Generate photos.** Two candidates render (up to a minute),
   each with its own staging and composition.
3. **Use this photo** saves it to `public/recipes/<slug>-ai-<id>.jpg`, points the
   recipe at it and marks it `image_source: "ai"`. **Try again** for new ones.
   Nothing is saved until you pick one.

Replace AI photos with real ones as you kitchen-test recipes; `image_source`
tells you which are which (`ai`, `photo`, `video_frame`).

## How a photo is built (`lib/photo/prompt.ts`)
Every prompt = **house style** (fixed) + **vessel** for the drink type +
the drink's **money shot** + **staging** that changes every render:

| Part | Where it comes from |
|---|---|
| House style, "never" list | `content/brand/photo-style.json` |
| Vessel (white cup, faceted iced glass, rocks glass...) | drink type |
| Money shot | e.g. coffee poured over milk → swirl; cold foam → foam cap; hot → latte art |
| Ingredient props (up to 2) | the recipe's ingredients: honey → honey jar, cinnamon → sticks... |
| Background items (1–2) + composition | random per render from the pools in the style file; candidates shown side by side always get different compositions (close-up, medium, wide, straight-on...) |
| Style reference | the photos in `content/brand/anchors/` are sent with every request, for light, color and mood only (the prompt tells the model not to copy their layout) |

## Tuning
- Change the look: edit `content/brand/photo-style.json` (no code changes).
- Change the reference look: replace the photos in `content/brand/anchors/`
  (2–3 square photos you love).
- Each candidate's "prompt" dropdown shows exactly what was asked for.

## Models
Uses `GEMINI_API_KEY`. Tries image models in order until one works:
`gemini-2.5-flash-image`, `gemini-3-pro-image-preview`, `imagen-4.0-generate-001`
(Imagen can't use the reference photos). Override with `PHOTO_MODELS` in `.env`
(comma-separated). Every result is finished as a 1200×1200 JPEG.

Tests: `npm run test:photo`.
