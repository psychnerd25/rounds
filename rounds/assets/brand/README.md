# Rounds production artwork

Source: the user-provided `WhatsApp Image 2026-09-10 at 2.22.50 AM.jpeg` in the repository root (444×436). The gray outer margin and pre-rounded tile were removed; the open teal ring and gold endpoint remain the brand. The original image is preserved.

The two masters were edited using the **built-in imagegen tool**, not the API/CLI fallback. Actual delivered master resolution is 1254×1254; the requested 2048 size was not returned by the tool. The store export is a native downsample to 1024×1024, not an inflated resolution claim.

| File | Purpose |
| --- | --- |
| `rounds-master.png` | Opaque square master, 1254×1254 |
| `rounds-foreground-master.png` | Transparent master, 1254×1254 |
| `rounds-icon.png` | iOS/store/legacy Android icon, opaque 1024×1024 |
| `rounds-adaptive.png` | Android foreground, 1024×1024 with central safe-area padding |
| `rounds-monochrome.png` | Android themed-icon white alpha mask, 1024×1024 |
| `rounds-splash.png` | Transparent splash mark, 1024×1024 |
| `rounds-favicon.png` | Web favicon, 64×64 |

Rebuild platform exports with `npm run brand:export`. It only performs deterministic resizing, transparent padding and monochrome-mask conversion on the generated masters using Expo's installed image tooling dependencies. Validate with `npm run check:brand`. Existing Expo sample assets are retained but are no longer referenced by the app's icon/splash configuration. The in-app wordmark and attribution text remain unchanged.

## Exact imagegen prompts

Opaque master, editing the WhatsApp image:

> Use case: precise-object-edit / logo-brand. Edit the attached WhatsApp logo into a polished high resolution production app-icon master for Rounds. Preserve its exact idea and appearance: a thick, smooth teal near-circular open ring, rounded ends, gap at the top between approximately 11 o'clock and 1 o'clock, with a small warm gold circular dot overlapping the upper-right endpoint. Solid dark charcoal navy background, approximately #24272F; teal approximately #4A9B8A and gold #E7B54C. Clean symmetric geometry, even stroke width, perfectly circular dot, crisp antialiased edges, flat solid colors. Remove the outer gray photograph margin, JPEG artifacts and any unevenness. Output one square 2048x2048 opaque icon, background fills all edges completely: no rounded-square perimeter, no border, no outer padding from the photograph, no pre-rounded corners, no shadow, no gradients, no texture, no lettering. Center the symbol optically. Ring external diameter about 72% of canvas, ring stroke about 6.5% of canvas; the gold dot diameter about 8.5%. This is a faithful cleanup, not a redesign. Single icon only, no mockup or contact sheet.

Transparent master, editing the opaque generated master:

> Edit this exact Rounds ring logo into a production Android adaptive-icon foreground. Preserve its open teal circular ring and gold upper-right endpoint dot, gap, proportions and rounded ends. Remove all dark background completely: genuine transparent alpha, no simulated checkerboard, no colored matte. Output a single square 2048x2048 transparent PNG. Scale and center the entire symbol so its OUTER diameter occupies only 58% of total canvas width and height; ample transparent padding about 21% on each side is REQUIRED for Android safe zones. The ring and dot must both remain entirely inside the central 60% square. Flat teal #4A9B8A and gold #E7B54C, clean even geometry, crisp edges, no texture, no shadow, no glow, no extra objects or text. Only the ring and gold dot should be nontransparent.
