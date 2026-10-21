# ToolStack app icons

Selected by Suraj: **dark TS monogram**. The blue stacked mark is retained as an alternative. Both source images were created with the built-in image generation tool, with no API key or external icon service. The web wordmark is unchanged.

- `ts-monogram.png`: selected source.
- `stacked-mark.png`: alternative source.
- `../../public/icons/`: exported installation icons (192 / 512), maskable icon (512), Apple touch icon (180) and favicon (32).
- `../../public/favicon.svg`: the existing favicon URL, now displaying the selected TS mark.
- `../../public/favicon.ico`: a matching conventional ICO with 16 / 32 / 48 pixel frames.

The selected mark stays inside the central safe area for OS icon masks. It has an opaque background. Export with the Sharp dependency included by Next:

```sh
node scripts/generate-app-icons.mjs
```

An alternative source can be passed as an argument. Exporting sizes does not change the design; use image generation for creative edits.

## Generation prompts

### Blue stacked mark

Use case: logo-brand. Asset type: production app icon for ToolStack, a privacy-first browser toolbox with a two-color black/blue ToolStack wordmark. Create ONE square, crisp, professional flat app icon: a bold white geometric T built from three neatly stacked horizontal tool trays, with a short central vertical stem subtly reading T. Solid saturated sky blue (#0284c7) square background extending fully to all four edges, no rounded outer corners (OS applies mask). Keep the whole white mark inside the central 60% of the canvas so it is safe for circular Android masks. Flat vector-like precision, generous negative space, friendly sturdy silhouette, recognisable at 32px. No text, no captions, no gradients, no texture, no shadows, no border, no device/mockup, no extra icons. Produce the icon alone, centered, filling a square canvas.

### Dark TS monogram

Use case: logo-brand. Create ONE alternative standalone app icon for ToolStack, a privacy-first browser toolbox. Square canvas, solid very dark navy (#0b1220) to all four edges, no rounded outer corners. A bold crisp geometric 'TS' monogram centered: white T interlocks with sky blue (#0284c7) S built of three horizontal stacked bars with open negative space. Simple legible sophisticated geometric construction, exceptionally readable at 32px, flat vector-like color. All letter shapes strictly inside central 60% of square (safe for circular app icon masks). Only text TS, no other text, no border, no gradients, no shadow, no texture, no mockup, no devices. Strong high contrast, familiar software product identity, clean perfectly centered composition. Produce the icon alone.
