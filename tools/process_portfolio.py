#!/usr/bin/env python3
"""
Улучшение качества фото портфолио (без ресайза/кропа, чтобы не обрезать предмет).
 Кадр и размеры 880x1100 не меняются — только:
   лёгкое шумоподавление, авто-контраст, умеренный unsharp-маск, небольшая
   насыщенность, оптимизированный экспорт JPEG (q=86, progressive).
 Исходники перед обработкой сохраняются в /tmp (portfolio_orig_*).
"""
import os
import shutil
import tempfile
from PIL import Image, ImageFilter, ImageEnhance, ImageOps

def process(path):
    shutil.copy2(path, os.path.join(tempfile.gettempdir(), "portfolio_orig_" + os.path.basename(path)))
    img = Image.open(path).convert("RGB")
    img = img.filter(ImageFilter.MedianFilter(size=3))          # шум
    img = ImageOps.autocontrast(img, cutoff=1)                  # свет/контраст
    img = img.filter(ImageFilter.UnsharpMask(radius=2,
                                             percent=110,
                                             threshold=3))      # резкость
    img = ImageEnhance.Color(img).enhance(1.05)                 # насыщенность
    img.save(path, "JPEG", quality=86, optimize=True, progressive=True)
    return img.size

def main():
    d = "assets/portfolio"
    for name in sorted(os.listdir(d)):
        if not name.lower().endswith(".jpg"):
            continue
        p = os.path.join(d, name)
        size = process(p)
        print(f"{name}: ok {size[0]}x{size[1]}")

if __name__ == "__main__":
    main()