---
name: image-editing
description: Edit an existing mockup in the sandbox with ImageMagick or your own Python or Node scripts (crop, colour, background removal, compositing, masks, anything custom). Load this before acting on any feedback about a mockup, to decide whether to edit it or regenerate it.
---

# Edit first, regenerate last

Editing keeps everything the customer already liked. Regenerating with `generate_mockup` redraws the whole image and can change things nobody asked to change. So when feedback arrives, first decide whether you can make the change by editing.

Customers' requests are personal and often oddly specific. Don't limit yourself to a fixed list: if you can do it with ImageMagick or a script, edit.

**Edit** for anything that works on the pixels you already have, for example:

- Crop, framing, resize, pad, aspect ratio, rotate, mirror
- Brightness, contrast, saturation, warmth, tint, greyscale, curves
- Remove or replace a plain background, add a shadow, border, or vignette
- Sharpen, blur, denoise, clean up a stray mark on a plain area
- Nudge or scale the logo slightly when it sits on a flat area (cut it out with a mask and composite it back)
- Put several mockups side by side, add a caption, convert format

**Regenerate** with `generate_mockup` and the feedback only when editing can't get there:

- Move the logo to another side of the product, or wrap it around a curve differently
- Change the camera angle or show another side of the product
- Change the print style (embroidery, engraving, foil, debossed)
- Change the product's colour or material realistically
- Fix a garbled or wrong-looking logo

If a request mixes both, regenerate first, then edit the new mockup.

# The edit loop

1. `load_image` with the item's current mockup URL. It returns an absolute path in the sandbox.
2. Edit with `bash`: ImageMagick commands, or write a script and run it. Save each result to a new file (`…-v2.png`, `…-v3.png`) so you can go back to the last good one.
3. If you need to see an intermediate result, open it with `read_file`.
4. `publish_mockup` with the final path. It returns the image. Check it, and if it's wrong, keep editing.

Outputs must be `.png`, `.jpg`, or `.webp`.

# What's installed

- **ImageMagick 6:** `convert`, `identify`, `mogrify`, `composite` (there's no `magick` command).
- **Python 3:** Pillow and NumPy. Run scripts with `python3`.
- **Node 24:** `sharp`, installed in `~/image-tools`. Write Node scripts there (`cd ~/image-tools && node edit.mjs`) so `import sharp from "sharp"` resolves.
- **Network:** only the npm and PyPI registries. If you need another library, `npm install` it in `~/image-tools`, or `pip install --user --break-system-packages <name>`.

# ImageMagick starting points

```bash
identify -format '%wx%h %m alpha:%A\n' in.png              # size, format, transparency
convert in.png -crop 800x800+120+60 +repage out.png         # crop WxH+X+Y
convert in.png -trim +repage out.png                        # cut a flat border
convert in.png -resize 1200x out.png                        # resize to a width
convert in.png -background white -gravity center -extent 1600x1600 out.png   # pad to a square
convert in.png -brightness-contrast 10x5 out.png            # brighter, a bit more contrast
convert in.png -modulate 100,130,100 out.png                # more saturated (100 = unchanged)
convert in.png -alpha set -fuzz 10% -fill none -floodfill +0+0 white out.png   # clear a white background from a corner
convert in.png -unsharp 0x1 out.png                         # sharpen
convert in.png -background white -flatten out.jpg           # to JPEG without black where it was transparent
```

# When to write a script instead

Use Python or Node when the edit needs masks, selections, per-pixel logic, or several steps you want to tweak and rerun: for example, warming only the background, compositing the creative onto a region, or painting over a stray mark with a nearby patch. Keep the script in the sandbox next to the image so you can adjust and rerun it as the customer gives more feedback.
