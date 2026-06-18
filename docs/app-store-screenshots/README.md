# App Store Screenshots & Icon

Все графические материалы для App Store Connect лежат в этой папке.

## Структура

```
docs/app-store-screenshots/
├── README.md                 ← вы здесь
├── 01-diagnostic.png         ← оригиналы с симулятора (~550×1024)
├── 02-parts.png
├── 03-locator.png
├── 04-results.png
├── CONNECT-UPLOAD-6.9/       ← ★ основной: Connect → iPhone 6.9" Display (1290×2796)
├── CONNECT-UPLOAD-6.5/       ← fallback: Connect → iPhone 6.5" Display (1242×2688)
├── CONNECT-UPLOAD-IPAD-13/   ← ★ обязательно: Connect → iPad 13" Display (2064×2752)
├── CONNECT-UPLOAD-6.7/       ← устарело; используйте CONNECT-UPLOAD-6.9
├── CONNECT-UPLOAD-ICON/      ← ★ иконка 1024×1024 для App Information
└── upload/                   ← исходные upscaled файлы
    ├── AppIcon-1024.png      ← иконка 1024×1024 (из LOGO_TRA_v1.svg)
    ├── iphone-6.7/           ← iPhone 6.7" (1290×2796) — обязательно
    │   ├── 01-diagnostic.png
    │   ├── 02-parts.png
    │   ├── 03-locator.png
    │   └── 04-results.png
    ├── iphone-6.5/           ← iPhone 6.5" (1284×2778)
    │   └── … (те же 4 экрана)
    ├── xcodebuild-archive.log
    └── xcodebuild-export.log
```

## Что куда загружать

| Назначение | Папка / файл | Размер |
|------------|--------------|--------|
| **Скриншоты iPhone 6.9"** (рекомендуется) | `CONNECT-UPLOAD-6.9/*.png` | 1290×2796 PNG sRGB |
| **Скриншоты iPad 13"** (обязательно для iPad) | `CONNECT-UPLOAD-IPAD-13/*.png` | 2064×2752 PNG sRGB |
| Скриншоты iPhone 6.5" (fallback) | `CONNECT-UPLOAD-6.5/*.png` | 1242×2688 PNG sRGB |
| Устаревшие upscaled | `upload/iphone-6.7/*.png` | JPEG в .png — не загружать |
| **Иконка приложения** | `upload/AppIcon-1024.png` | 1024×1024 PNG, без прозрачности |
| Исходники скриншотов | `01-*.png` … `04-*.png` (корень папки) | ~550×1024 |

## Иконка — источник истины

**Единственный канонический логотип:** `LOGO_TRA_v1.svg` в корне репозитория.

```
/Users/rm/truck-repair-assistant_v3/LOGO_TRA_v1.svg
```

`public/logo.svg` — копия для веб-приложения, не использовать для App Store.

Пересоздать `upload/AppIcon-1024.png`:

```bash
cd /Users/rm/truck-repair-assistant_v3
qlmanage -t -s 1024 -o docs/app-store-screenshots/upload LOGO_TRA_v1.svg
python3 - <<'PY'
from pathlib import Path
from PIL import Image
src = Path('docs/app-store-screenshots/upload/LOGO_TRA_v1.svg.png')
out = Path('docs/app-store-screenshots/upload/AppIcon-1024.png')
img = Image.open(src).convert('RGBA')
bg = Image.new('RGBA', img.size, (255, 255, 255, 255))
Image.alpha_composite(bg, img).convert('RGB').save(out, 'PNG')
src.unlink()
print('Wrote', out)
PY
```

Альтернатива (если установлен librsvg): `rsvg-convert -w 1024 -h 1024 LOGO_TRA_v1.svg -o docs/app-store-screenshots/upload/AppIcon-1024.png`

## Пересоздать скриншоты для Connect

Из оригиналов в корне папки (Pillow, sRGB PNG без альфы):

```bash
cd docs/app-store-screenshots
python3 - <<'PY'
from PIL import Image, ImageCms
import os
BASE = "."
SOURCES = ["01-diagnostic.png", "02-parts.png", "03-locator.png", "04-results.png"]
BG = (11, 16, 18)
SRGB = ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB")).tobytes()
for folder, (tw, th) in {"CONNECT-UPLOAD-6.9": (1290, 2796), "CONNECT-UPLOAD-6.5": (1242, 2688)}.items():
    for name in SOURCES:
        img = Image.open(os.path.join(BASE, name)).convert("RGB")
        sw, sh = img.size
        scale = min(tw / sw, th / sh)
        nw, nh = round(sw * scale), round(sh * scale)
        resized = img.resize((nw, nh), Image.Resampling.LANCZOS)
        canvas = Image.new("RGB", (tw, th), BG)
        canvas.paste(resized, ((tw - nw) // 2, (th - nh) // 2))
        out = os.path.join(BASE, folder, name)
        os.makedirs(os.path.dirname(out), exist_ok=True)
        canvas.save(out, "PNG", optimize=True, icc_profile=SRGB)
        print("Wrote", out)
PY
```

> **Не используйте `sips` без `-s format png`** — он сохраняет JPEG в файлы с расширением `.png`, и App Store Connect отклоняет их с ошибкой «wrong format».

## Связанные документы

- [APP_STORE_UPLOAD_NOW.md](../APP_STORE_UPLOAD_NOW.md) — copy-paste пути и метаданные для загрузки
- [APP_STORE_SUBMISSION.md](../APP_STORE_SUBMISSION.md) — полный чеклист публикации
