# ಸಾರ್ವಜನಿಕ ಸಂಪರ್ಕ ಕೇಂದ್ರ, ದೇವನಹಳ್ಳಿ – Kannada website

Client: Dr. T. M. Sahadesh (ಡಾ. ಟಿ.ಎಂ. ಸಹದೇಶ್), Founder State President.
Built by SWAN Digital Solutions, October 2026. Live: https://sahadesh.vercel.app (Vercel project `sahadesh`, deploys on every push to `main`).

## What it is
- Static, Kannada-only website: 80 pages, a main portal plus 12 themed sub-websites
  (ಪರಿಚಯ, ಸಂಸ್ಥೆ, ದಾಖಲೆ ಸೇವೆ, ಯೋಜನೆಗಳು, ಉದ್ಯೋಗ, ಸಮಾಜ ಸೇವೆ, ಮನವಿಗಳು, ಅಭಿವೃದ್ಧಿ, ನಮ್ಮ ದೇವನಹಳ್ಳಿ, ಕಾರ್ಯಕ್ರಮ, ಗ್ಯಾಲರಿ, ಸಹಾಯವಾಣಿ).
- Live features (plain JS, no backend): deadline / event countdowns computed from today's date, festival greeting banner,
  scheme eligibility finder, document checklists (saved on the visitor's device), HR / helpline / service search,
  site-wide search, CM Relief Fund form that fills and prints, WhatsApp enquiry forms (nothing is stored on a server),
  photo lightbox, offline support (service worker on https).
- Home page is ~14 KB gzipped HTML; images are WebP with fixed sizes and lazy loading.

## Folders
- `source-posters/` – the client's posters as received (20 files).
- `tools/crop_images.py` – cuts the photos out of the posters and upscales each 4x with Real-ESRGAN (`tools/upscale.py`,
  weights in `tools/models/`, not in git – download `RealESRGAN_x4plus.pth` from github.com/xinntao/Real-ESRGAN releases v0.1.0),
  saved at 2x display size. Upscales are cached in `tools/.sr-cache/` (first full run ~20 min on CPU).
- `site-src/data.mjs` – ALL text and data (schemes, dates, HR numbers, events…). Edit this to update the site.
- `site-src/build.mjs` – page generator; `site-src/assets/` – CSS + JS; `site-src/icons.mjs` – icon set.
- `site/` – the built website. Upload the contents of this folder to hosting.

## Commands
```
python tools/crop_images.py      # only when photos change
node site-src/build.mjs          # rebuild site/ after editing data.mjs
python -m http.server 5240 --directory site   # local preview at http://localhost:5240
```

## Going live (Hostinger / any Apache host)
1. If a custom domain is added, set it in `site-src/data.mjs` → `site.url` and rebuild.
2. Upload everything inside `site/` (including `.htaccess`) to `public_html/`.
3. Add the domain in Google Search Console and submit `/sitemap.xml`.

## Confirm with the client before launch
1. Official logo file – the round emblem in the header is a stand-in drawn in code.
2. Custom domain, if wanted (the site currently uses https://sahadesh.vercel.app).
3. Contact count for the record: certificate says 23,000+, bio poster says 25,000+, Asia Book of Records poster says 20,000. Site shows "23,000+ (Guinness), now 25,000+".
4. Doctorate university name: certificate "Hosur Global University", bio poster "Global International University, Hosur". Site says "ಹೊಸೂರಿನ ಗ್ಲೋಬಲ್ ಯೂನಿವರ್ಸಿಟಿ".
5. Gruha Lakshmi life-certificate rule (1 Nov – 31 Dec) is taken from their poster – confirm it is official.
6. Department helpline numbers (080-… / 1800-…) are copied from their poster and labelled "verify before calling"; the emergency numbers (112, 108, 104, 1902, 1912, 1967, 1947…) are standard.
7. Facebook page link and YouTube channel link (only names were on the posters). Instagram link used: instagram.com/devanahallisahadesh.
8. Permission to publish the 23 HR mobile numbers from the "Job Contact" poster.
9. Name spelling: some posters say "ಸಹದೇವ್"; the site uses "ಸಹದೇಶ್" everywhere.
10. Puneeth Rajkumar 5th death anniversary programme is dated 29 Oct 2026 (Udayavani report of 30 Oct).
11. **For true HD, ask for the original photos** (WhatsApp "Document" or Google Drive). The posters are WhatsApp-compressed and the
    photos inside them are small; the site uses AI-upscaled crops, and tiny crowd photos were left out because faces can't be recovered.
12. Photos only in the later posters (Udayavani news photo, toll-board portraits, NHRC meeting, Yakshagana invite, caste-certificate poster) were not available as files – drop them into `source-posters/` to add them.
13. Number 9141142742 (from the fan-club Independence Day poster) is not used; the site uses 8296902742, 7829449336 and WhatsApp 8748959336.
