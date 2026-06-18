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
├── CONNECT-UPLOAD-6.5/       ← ★ перетащить в Connect → iPhone 6.5" Display
├── CONNECT-UPLOAD-6.7/       ← ★ перетащить в Connect → iPhone 6.7" Display
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
| **Скриншоты iPhone 6.7"** (обязательно) | `upload/iphone-6.7/*.png` | 1290×2796 |
| Скриншоты iPhone 6.5" (опционально) | `upload/iphone-6.5/*.png` | 1284×2778 |
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

## Пересоздать upscaled скриншоты

Из оригиналов в корне папки:

```bash
cd docs/app-store-screenshots
mkdir -p upload/iphone-6.7 upload/iphone-6.5
for f in 0*.png; do
  sips -z 2796 1290 "$f" --out "upload/iphone-6.7/$f"
  sips -z 2778 1284 "$f" --out "upload/iphone-6.5/$f"
done
```

## Связанные документы

- [APP_STORE_UPLOAD_NOW.md](../APP_STORE_UPLOAD_NOW.md) — copy-paste пути и метаданные для загрузки
- [APP_STORE_SUBMISSION.md](../APP_STORE_SUBMISSION.md) — полный чеклист публикации
