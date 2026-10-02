# v0.59.4 artwork

`backgrounds/astral-gate-v1.webp` is original artwork generated for Elyndra with the built-in OpenAI image generation tool. It is used in the world-generation progress panel. Existing genre scene backgrounds and the landing castle remain unchanged.

The generated PNG was encoded as WebP at quality 84 without cropping or resizing: 1672 × 941, 174,260 bytes. The project serves the asset locally; no external image service is required at runtime.

Final generation prompt:

> Create a polished original background illustration for Elyndra, a fantasy tabletop role-playing web game. Wide landscape 16:9 cinematic matte painting. An ancient circular astronomical portal carved from dark stone, with delicate warm gold runes and a luminous midnight-blue center, stands on a ruined cliff overlooking misty mountains beneath a starry night. Small windblown grasses in foreground, subtle drifting golden motes, atmospheric depth, sophisticated painterly fantasy environment. Main portal on right third; left half has calm dark navy negative space for readable interface text. Palette midnight navy, muted teal, antique gold, restrained warm light. No people, no dice, no letters, no text, no watermark, no UI, no border. This is background artwork for a world-generation loading panel, not a screenshot or a new landing layout.

`icons/compass.svg`, `person.svg`, `world.svg`, `journal.svg`, `satchel.svg` and `d20.svg` are original, code-authored vector drawings. Navigation and feature icons are CSS masks with the existing visible labels retained. The D20 illustration is decorative; the displayed number and outcome come from the Engine.

The full-interface extension adds original vector drawings `icons/more.svg`, `settings.svg`, `save.svg`, `restore.svg` and `frames/surface-etching.svg`. The etching is a transparent, repeating material layer rendered at fixed CSS pixel sizes above the panel shading; it is not stretched to fit a panel. Full-screen and modal scenery reuse the existing five genre AVIF illustrations with `cover` and the same genre focal position. No additional raster generation or external runtime image service is used for this extension.

## v0.61.3 recovered world-style covers

Six distinct original PNGs were recovered from `UI_Development_Evidence/Generated_Images` and encoded locally with Pillow at WebP quality 86, method 6, without cropping or resizing (1672 × 941). Each recovered PNG matches the historical PNG SHA-256. Each deployed WebP matches a fresh encoding of its corresponding original; the accident-era WebP bytes are unavailable, so original WebP byte identity is unverified. Artwork remains illustrative and does not claim to depict a generated player world.

| Cover | Original PNG | WebP bytes |
|---|---|---:|
| `low-magic-politics-v1.webp` | `exec-0172d1ce-a163-48c6-9d9b-8883ece06acc.png` | 318,130 |
| `mythic-primordial-v1.webp` | `exec-86cd9e95-56bf-45c7-a4ea-47d7aa84c4b6.png` | 411,114 |
| `floating-islands-v1.webp` | `exec-4c2edc35-891f-4d8a-ae96-27b34a152d9e.png` | 365,514 |
| `arcane-metropolis-v1.webp` | `exec-bd56fd08-8860-41e2-a5e4-3699aedeece8.png` | 440,944 |
| `beast-symbiosis-v1.webp` | `exec-746a9744-9336-4df1-95a8-1ab5f77e9ee8.png` | 456,636 |
| `endless-winter-v1.webp` | `exec-4d44c14e-19ca-43b9-a01e-723db48268ed.png` | 403,884 |
