# Rounds production artwork

Source: the user-provided `WhatsApp Image 2026-09-10 at 2.22.50 AM.jpeg` in the repository root (444×436). The gray outer margin and pre-rounded tile were removed; the open teal ring and gold endpoint remain the brand. The original image is preserved.

The two masters were edited using the built-in image generation tool, not an API/CLI fallback. Actual delivered master resolution is 1254×1254. The store export is a native downsample to 1024×1024.

| File | Purpose |
| --- | --- |
| `rounds-master.png` | Opaque square master |
| `rounds-foreground-master.png` | Transparent master |
| `rounds-icon.png` | iOS/store/legacy Android icon |
| `rounds-adaptive.png` | Android adaptive foreground |
| `rounds-monochrome.png` | Android themed-icon mask |
| `rounds-splash.png` | Transparent splash mark |
| `rounds-favicon.png` | Web favicon |

Rebuild platform exports with `npm run brand:export` and validate with `npm run check:brand`. Legacy Expo starter artwork has been removed; native and web configuration use the assets in this directory.
