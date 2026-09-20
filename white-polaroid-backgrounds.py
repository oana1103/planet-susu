"""Replace exterior gray paper only; preserve original sticker pixels losslessly."""
from pathlib import Path
import json
import base64
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent
DEST = ROOT / 'assets/fourcut/white'
DEST.mkdir(exist_ok=True)
checks = []
sheet = Image.new('RGB', (1500, 1200), 'white')
for i in range(1, 11):
    source = ROOT / f'assets/fourcut/look-{i:02d}.{"png" if i in (2, 7) else "jpg"}'
    original = Image.open(source).convert('RGB')
    pixels = np.array(original)
    h, w = pixels.shape[:2]
    background = np.median(pixels[:30, :30], axis=(0, 1))
    foreground = (np.abs(pixels.astype(float) - background).max(axis=2) > 24)
    mask = Image.fromarray((foreground * 255).astype('uint8')).copy()
    seed = (round(w * .35), round(h * .40))
    assert mask.getpixel(seed) == 255, (source, 'Subject seed is outside sticker')
    ImageDraw.floodfill(mask, seed, 128)
    component = Image.fromarray((np.array(mask) == 128).astype('uint8') * 255).copy()
    # Fill enclosed regions to protect even gray garment details inside the sticker.
    ImageDraw.floodfill(component, (0, 0), 64)
    solid = Image.fromarray((np.array(component) != 64).astype('uint8') * 255)
    # Remove just two pixels of the outer white sticker rim to avoid JPEG gray fringe.
    protected = np.array(solid.filter(ImageFilter.MinFilter(5))) == 255
    assert .15 < protected.mean() < .6, (source, 'Unexpected subject mask')
    output = pixels.copy()
    output[~protected] = 255
    assert np.array_equal(output[protected], pixels[protected])
    result = Image.fromarray(output)
    result.save(DEST / f'look-{i:02d}.png', optimize=True)
    checks.append({'look': i, 'protected_pixels': int(protected.sum()), 'changed_subject_pixels': 0})
    # Paired originals and results for manual inspection, never used by the website.
    x, y = ((i - 1) % 5) * 300, ((i - 1) // 5) * 600
    sheet.paste(original.resize((300, 300)), (x, y))
    sheet.paste(result.resize((300, 300)), (x, y + 300))
sheet.save(DEST / 'review-contact-sheet.jpg')
print(json.dumps(checks, indent=2))
export_files = [ROOT / 'assets/camera/polaroid-frame.png'] + sorted(DEST.glob('look-*.png'))
export_assets = {
    path.relative_to(ROOT / 'assets').as_posix(): 'data:image/png;base64,' + base64.b64encode(path.read_bytes()).decode('ascii')
    for path in export_files
}
(ROOT / 'assets/polaroid-export-white.js').write_text(
    'window.polaroidExportAssets=' + json.dumps(export_assets, separators=(',', ':')) + ';\n',
    encoding='utf-8',
)
