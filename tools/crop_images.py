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
    "sahadesh-whiteshirt": (6, (590, 100, 853, 520), 520),
    "sahadesh-namaste-blue": (14, (0, 60, 380, 400), 640),
    "sahadesh-namaste-blue2": (8, (130, 60, 340, 400), 440),
    "sahadesh-namaste-pink": (16, (40, 20, 380, 330), 560),
    "sahadesh-white-airport": (16, (480, 20, 840, 300), 560),
    "sahadesh-armscrossed": (7, (640, 15, 853, 300), 440),
    "sahadesh-orange": (8, (562, 1048, 800, 1278), 420),
    "sahadesh-orange2": (13, (0, 0, 240, 225), 420),
    "sahadesh-suit-small": (5, (700, 10, 853, 180), 340),
    # Honours
    "doctorate-certificate": (1, (625, 185, 835, 355), 460),
    "guinness-medal": (1, (700, 360, 845, 530), 360),
    "guinness-group": (1, (700, 540, 845, 710), 360),
    # Service / event photos
    "camp-health": (1, (12, 760, 290, 895), 600),
    "camp-environment": (1, (293, 760, 567, 895), 600),
    "camp-awareness": (1, (572, 760, 845, 895), 600),
    "seva-aadhaar": (6, (14, 470, 148, 540), 360),
    "seva-sapling": (6, (162, 470, 298, 540), 360),
    "seva-health": (6, (312, 470, 448, 540), 360),
    "seva-blood": (6, (464, 470, 598, 540), 360),
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
    "petition-buses": (8, (10, 670, 350, 810), 600),
    "petition-busstand": (8, (560, 650, 840, 800), 520),
    "petition-metro": (14, (341, 895, 560, 1040), 520),
    "busstand-ksrtc": (14, (281, 712, 562, 835), 520),
    "busstand-bmtc": (14, (579, 712, 843, 835), 520),
    "infra-roads": (15, (17, 446, 281, 531), 480),
    "infra-airport": (15, (298, 446, 562, 531), 480),
    "infra-hospital": (15, (571, 446, 843, 531), 480),
    "infra-education": (15, (17, 664, 281, 757), 480),
    "infra-water": (15, (298, 664, 562, 757), 480),
    "infra-power": (15, (571, 664, 843, 757), 480),
    "infra-industry": (15, (17, 882, 281, 962), 480),
    "infra-stadium": (15, (298, 882, 562, 962), 480),
    "infra-busstand": (15, (571, 882, 843, 962), 480),
    # Schemes
    "scheme-gruhalakshmi": (7, (17, 527, 158, 605), 400),
    "scheme-gas": (7, (182, 527, 323, 605), 400),
    "scheme-education": (7, (347, 527, 488, 605), 400),
    "scheme-farmer": (7, (512, 527, 653, 605), 400),
    "scheme-youth": (7, (677, 527, 828, 605), 400),
    "scheme-elderly": (7, (17, 737, 158, 805), 400),
    "scheme-disabled": (7, (182, 737, 323, 805), 400),
    "scheme-women": (7, (347, 737, 488, 805), 400),
    "scheme-loan": (7, (512, 737, 655, 778), 400),
    "scheme-hospital": (7, (677, 737, 828, 805), 400),
    "scheme-gramaone": (13, (618, 795, 1254, 1065), 760),
    "scheme-lifecert": (11, (700, 740, 853, 900), 340),
    "valmiki-shop": (4, (20, 395, 135, 480), 340),
    "valmiki-auto": (4, (640, 400, 780, 480), 360),
    "valmiki-foodtruck": (4, (20, 690, 180, 780), 400),
    "valmiki-shg": (4, (290, 620, 470, 700), 400),
    "valmiki-irrigation": (4, (545, 650, 685, 720), 400),
    "valmiki-farm": (4, (705, 655, 845, 715), 400),
}


NO_UPSCALE = {"memorandum"}  # a real camera photo, already 1080 px wide
CACHE = Path(__file__).resolve().parent / ".sr-cache"
GALLERY_POSTERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 15, 16, 18, 19]


def hd_crop(name, poster, box):
    src = Image.open(SRC / f"{poster}.webp").convert("RGB").crop(box)
    if name in NO_UPSCALE:
        return src
    CACHE.mkdir(exist_ok=True)
    key = CACHE / f"{name}-{poster}-{'-'.join(map(str, box))}.png"
    if key.exists():
        return Image.open(key).convert("RGB")
    big = upscale4(src)
    big.save(key)
    return big


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
        if im.width != target:
            im = im.resize((target, round(im.height * target / im.width)), Image.LANCZOS)
        im.save(OUT / f"{name}.webp", "WEBP", quality=88, method=6)
        print(f"{i}/{len(CROPS)} {name} {im.size}", flush=True)
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
