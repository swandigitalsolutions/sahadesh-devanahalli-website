"""Cut the photo areas out of the client's posters into HD WebP files.

Run:  python tools/crop_images.py
Each crop is upscaled 4x with Real-ESRGAN (tools/upscale.py) straight from the poster pixels,
then saved at twice its on-screen width for sharp phone/retina screens.
Upscales are cached in tools/.sr-cache, so re-runs only process changed crops.
Each entry: name -> (poster, (left, top, right, bottom), display_width)
"""
import json
from pathlib import Path
from PIL import Image, ImageDraw
from upscale import upscale4

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "source-posters"
OUT = ROOT / "site-src" / "img"

CROPS = {
    # Portraits of Dr. T. M. Sahadesh
    "sahadesh-vidhanasoudha": (3, (140, 250, 820, 995), 900),
    "sahadesh-waistcoat": (1, (0, 155, 280, 430), 520),
    "sahadesh-whiteshirt": (6, (608, 100, 853, 505), 520),
    "sahadesh-namaste-blue": (14, (0, 60, 380, 394), 640),
    "sahadesh-namaste-pink": (16, (40, 20, 380, 330), 560),
    "sahadesh-armscrossed": (7, (656, 15, 853, 288), 440),
    "sahadesh-orange2": (13, (0, 0, 240, 225), 420),
    # Honours
    "doctorate-certificate": (1, (625, 185, 835, 355), 460),
    "guinness-medal": (1, (705, 362, 836, 528), 360),
    "guinness-group": (1, (701, 541, 838, 708), 360),
    # Service / event photos
    "camp-health": (1, (12, 760, 290, 895), 600),
    "camp-environment": (1, (293, 760, 567, 895), 600),
    "camp-awareness": (1, (572, 760, 845, 895), 600),
    "seva-aadhaar": (6, (24, 484, 137, 552), 360),
    "seva-sapling": (6, (152, 484, 267, 552), 360),
    "seva-health": (6, (282, 484, 395, 552), 360),
    "seva-blood": (6, (409, 484, 498, 552), 360),
    "poster-release": (5, (0, 300, 853, 690), 1000),
    "constitution-award": (18, (0, 790, 375, 985), 640),
    "constitution-certificate": (18, (380, 795, 660, 965), 520),
    "constitution-trophy": (18, (660, 790, 853, 985), 360),
    "constitution-audience": (18, (0, 995, 330, 1150), 560),
    "memorandum": (20, (0, 0, 1080, 760), 1080),
    # Devanahalli heritage (tiles in the heritage poster)
    "place-fort": (16, (35, 625, 205, 765), 460),
    "place-venugopala": (16, (244, 625, 412, 765), 460),
    "place-avathi": (16, (453, 625, 623, 765), 460),
    "place-temple2": (16, (660, 625, 830, 765), 460),
    "place-nandi": (16, (35, 838, 205, 975), 460),
    "place-tippu": (16, (244, 838, 412, 975), 460),
    "place-railway": (16, (453, 838, 623, 975), 460),
    "place-lake": (16, (660, 838, 830, 975), 460),
    "place-nandi-sign": (8, (660, 420, 845, 590), 420),
    # Petitions / infrastructure
    "petition-buses": (8, (12, 680, 330, 808), 600),
    "petition-busstand": (8, (560, 650, 840, 800), 520),
    "petition-metro": (14, (350, 897, 552, 1022), 520),
    "busstand-ksrtc": (14, (290, 714, 560, 833), 520),
    "busstand-bmtc": (14, (604, 714, 841, 833), 520),
    "infra-roads": (15, (20, 449, 278, 523), 480),
    "infra-airport": (15, (301, 449, 559, 523), 480),
    "infra-hospital": (15, (574, 449, 840, 523), 480),
    "infra-education": (15, (20, 667, 278, 747), 480),
    "infra-water": (15, (301, 667, 559, 747), 480),
    "infra-power": (15, (574, 667, 840, 747), 480),
    "infra-industry": (15, (20, 885, 278, 952), 480),
    "infra-stadium": (15, (301, 885, 559, 952), 480),
    "infra-busstand": (15, (574, 885, 840, 952), 480),
    # Schemes
    "scheme-gruhalakshmi": (7, (23, 527, 154, 605), 400),
    "scheme-gas": (7, (188, 527, 319, 605), 400),
    "scheme-education": (7, (353, 527, 484, 605), 400),
    "scheme-farmer": (7, (518, 527, 649, 605), 400),
    "scheme-youth": (7, (688, 527, 824, 605), 400),
    "scheme-elderly": (7, (23, 737, 154, 805), 400),
    "scheme-disabled": (7, (188, 737, 319, 805), 400),
    "scheme-women": (7, (357, 737, 484, 805), 400),
    "scheme-loan": (7, (518, 737, 651, 778), 400),
    "scheme-hospital": (7, (683, 737, 824, 805), 400),
    "scheme-gramaone": (13, (618, 795, 1254, 1065), 760),
    "scheme-lifecert": (11, (726, 740, 845, 900), 340),
    "valmiki-shop": (4, (27, 402, 130, 488), 340),
    "valmiki-auto": (4, (668, 384, 800, 478), 360),
    "valmiki-foodtruck": (4, (32, 667, 220, 766), 400),
    "valmiki-shg": (4, (264, 640, 446, 702), 400),
    "valmiki-irrigation": (4, (488, 642, 644, 709), 400),
    "valmiki-farm": (4, (682, 640, 826, 708), 400),
}


NO_UPSCALE = {"memorandum"}  # a real camera photo, already 1080 px wide
CACHE = Path(__file__).resolve().parent / ".sr-cache"
GALLERY_POSTERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 15, 16, 18, 19]


# Poster labels that overlap plain background in a crop: (left, top, right, bottom) as fractions of the crop.
ERASE = {
    "sahadesh-namaste-blue": [(0.73, 0.0, 1.0, 0.10)],
    "sahadesh-waistcoat": [(0.76, 0.0, 1.0, 0.05)],
}


def _from_cache(name, poster, box):
    """An upscale of this exact box, or a larger cached one cropped down to it."""
    exact = CACHE / f"{name}-{poster}-{'-'.join(map(str, box))}.png"
    if exact.exists():
        return Image.open(exact).convert("RGB")
    for f in CACHE.glob(f"{name}-{poster}-*.png"):
        ob = tuple(map(int, f.stem.split("-")[-4:]))
        if ob[0] <= box[0] and ob[1] <= box[1] and ob[2] >= box[2] and ob[3] >= box[3]:
            im = Image.open(f).convert("RGB")
            k = im.width / (ob[2] - ob[0])
            return im.crop(tuple(round(v) for v in ((box[0] - ob[0]) * k, (box[1] - ob[1]) * k,
                                                     (box[2] - ob[0]) * k, (box[3] - ob[1]) * k)))
    return None


def _erase(name, im):
    if name not in ERASE:
        return im
    import cv2
    import numpy as np
    arr = np.asarray(im)[:, :, ::-1].copy()
    mask = np.zeros(arr.shape[:2], np.uint8)
    h, w = mask.shape
    for fx0, fy0, fx1, fy1 in ERASE[name]:
        mask[int(fy0 * h):int(fy1 * h), int(fx0 * w):int(fx1 * w)] = 255
    out = cv2.inpaint(arr, mask, 9, cv2.INPAINT_TELEA)
    return Image.fromarray(out[:, :, ::-1])


def hd_crop(name, poster, box):
    src = Image.open(SRC / f"{poster}.webp").convert("RGB").crop(box)
    if name in NO_UPSCALE:
        return src
    CACHE.mkdir(exist_ok=True)
    big = _from_cache(name, poster, box)
    if big is None:
        big = upscale4(src)
        big.save(CACHE / f"{name}-{poster}-{'-'.join(map(str, box))}.png")
    return _erase(name, big)


def icon(size):
    s = size
    im = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse((0, 0, s - 1, s - 1), fill=(13, 44, 108))
    r = int(s * 0.06)
    d.ellipse((r, r, s - 1 - r, s - 1 - r), outline=(255, 210, 63), width=max(2, s // 28))

    def person(cx, cy, sc, col):
        hr = int(s * 0.075 * sc)
        d.ellipse((cx - hr, cy - hr, cx + hr, cy + hr), fill=col)
        bw, bh = int(s * 0.13 * sc), int(s * 0.17 * sc)
        d.rounded_rectangle((cx - bw, cy + hr + int(s * 0.02), cx + bw, cy + hr + bh), radius=int(bw * 0.8), fill=col)

    person(int(s * 0.33), int(s * 0.42), 0.85, (255, 210, 63))
    person(int(s * 0.67), int(s * 0.42), 0.85, (232, 64, 64))
    person(int(s * 0.5), int(s * 0.36), 1.05, (255, 255, 255))
    d.arc((int(s * 0.2), int(s * 0.55), int(s * 0.8), int(s * 0.86)), 20, 160, fill=(255, 210, 63), width=max(2, s // 22))
    return im


def upscale_shard(i: int, n: int) -> None:
    """Fill the upscale cache for every n-th crop (run several shards in parallel)."""
    import torch
    torch.set_num_threads(max(1, 12 // n))
    for k, (name, (poster, box, _)) in enumerate(CROPS.items()):
        if k % n == i:
            hd_crop(name, poster, box)
            print(f"shard {i}: {name}", flush=True)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "posters").mkdir(exist_ok=True)
    for i, (name, (poster, box, width)) in enumerate(CROPS.items(), 1):
        im = hd_crop(name, poster, box)
        target = min(1600, width * 2, im.width)
        full = im if im.width == target else im.resize((target, round(im.height * target / im.width)), Image.LANCZOS)
        full.save(OUT / f"{name}.webp", "WEBP", quality=84, method=6)
        small_w = min(width, target)
        if small_w < target:  # 1x version for normal screens; the browser picks via srcset
            full.resize((small_w, round(full.height * small_w / full.width)), Image.LANCZOS).save(
                OUT / f"{name}-sm.webp", "WEBP", quality=82, method=6)
        print(f"{i}/{len(CROPS)} {name} {full.size}", flush=True)
    for n in GALLERY_POSTERS:  # posters at their full received resolution
        Image.open(SRC / f"{n}.webp").convert("RGB").save(OUT / "posters" / f"poster-{n}.webp", "WEBP", quality=92, method=6)
    cover = Image.open(SRC / "3.webp").convert("RGB").crop((0, 270, 960, 775)).resize((1200, 631), Image.LANCZOS).crop((0, 0, 1200, 630))
    cover.save(OUT / "og-cover.jpg", quality=88)
    for sz in (192, 512):
        icon(sz).save(OUT / f"icon-{sz}.png")
    icon(180).save(OUT / "apple-touch-icon.png")
    icon(48).save(OUT / "favicon-48.png")
    sizes = {}
    for p in sorted(OUT.rglob("*")):
        if p.suffix.lower() in (".webp", ".jpg", ".png"):
            with Image.open(p) as im:
                sizes[p.relative_to(OUT).as_posix()] = list(im.size)
    (OUT / "sizes.json").write_text(json.dumps(sizes, indent=0))
    print(f"{len(CROPS)} photos + {len(GALLERY_POSTERS)} posters -> {OUT}")


if __name__ == "__main__":
    import sys
    if len(sys.argv) == 2 and "/" in sys.argv[1]:
        a, b = map(int, sys.argv[1].split("/"))
        upscale_shard(a, b)
    else:
        main()
