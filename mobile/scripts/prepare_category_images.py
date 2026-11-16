"""Prepare faithful category thumbnails; originals are never changed.
Run --write to regenerate, or --check to validate the bundled results.
Requires Pillow in the development environment, not in the mobile app.
"""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "photos"
OUTPUT = ROOT / "assets" / "muscles"
# Source-pixel bounds, visually checked against anatomy and embedded caption locations.
CROPS = {
    "chest": (0, 0, 2943, 3000),
    "back": (0, 0, 2648, 2800),
    "shoulders": (0, 0, 3040, 2850),
    "biceps": (0, 0, 2681, 2900),
    "triceps": (0, 0, 2667, 3000),
    "forearms": (100, 0, 2633, 3500),
    "legs": (180, 0, 2700, 3330),
    "cardio": (100, 120, 2600, 3400),
    "abs": (0, 0, 2833, 2900),
    "full_body": (480, 0, 2230, 3040),
}

# Train cards use dedicated 5:3 crops around the complete highlighted regions,
# rather than contain-fitting a portrait into a landscape slot.
TRAIN_CROPS = {
    "chest": (1, 700, 2941, 2464),
    "back": (1, 1100, 2646, 2687),
    "biceps": (0, 700, 2680, 2308),
    "triceps": (1, 950, 2666, 2549),
}

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def decode(path):
    with Image.open(path) as image:
        if image.format != "JPEG":
            raise ValueError(f"{path}: expected actual JPEG, got {image.format}")
        image.verify()
    with Image.open(path) as image:
        image.load()
        return image.convert("RGB")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--write", action="store_true")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    if not args.write and not args.check:
        parser.error("choose --write or --check")
    manifest = {}
    for name, box in CROPS.items():
        source = SOURCE / (name + ".jpg")
        image = decode(source)
        before = digest(source)
        if not (0 <= box[0] < box[2] <= image.width and 0 <= box[1] < box[3] <= image.height):
            raise ValueError(f"{name}: crop outside original image")
        prepared = image.crop(box)
        prepared.thumbnail((768, 768), Image.Resampling.LANCZOS)
        output = OUTPUT / source.name
        if args.write:
            OUTPUT.mkdir(exist_ok=True)
            prepared.save(output, "JPEG", quality=95, subsampling=0, optimize=True)
        bundled = decode(output)
        if bundled.size != prepared.size:
            raise ValueError(f"{name}: wrong prepared dimensions {bundled.size}")
        if digest(source) != before:
            raise ValueError(f"{name}: source changed")
        manifest[name] = {
            "source": "../photos/" + source.name,
            "sourceSize": list(image.size), "cropBox": list(box),
            "preparedSize": list(bundled.size), "sourceSha256": before,
            "preparedSha256": digest(output),
        }
    audit = OUTPUT / "preparation.json"
    if args.write:
        audit.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    if json.loads(audit.read_text(encoding="utf-8")) != manifest:
        raise ValueError("Asset audit does not match current sources/prepared files")
    train_manifest = {}
    train_output = OUTPUT / "train"
    for name, box in TRAIN_CROPS.items():
        source = SOURCE / (name + ".jpg")
        image = decode(source)
        before = digest(source)
        if not (0 <= box[0] < box[2] <= image.width and 0 <= box[1] < box[3] <= image.height):
            raise ValueError(f"{name}: Train crop outside original image")
        if (box[2] - box[0]) * 3 != (box[3] - box[1]) * 5:
            raise ValueError(f"{name}: Train crop must be 5:3 without distortion")
        prepared = image.crop(box).resize((800, 480), Image.Resampling.LANCZOS)
        output = train_output / source.name
        if args.write:
            train_output.mkdir(exist_ok=True)
            prepared.save(output, "JPEG", quality=95, subsampling=0, optimize=True)
        bundled = decode(output)
        if bundled.size != (800, 480) or digest(source) != before:
            raise ValueError(f"{name}: invalid Train output or changed source")
        train_manifest[name] = {
            "source": "../../photos/" + source.name,
            "sourceSize": list(image.size), "cropBox": list(box),
            "preparedSize": list(bundled.size), "sourceSha256": before,
            "preparedSha256": digest(output),
        }
    train_audit = train_output / "preparation.json"
    if args.write:
        train_audit.write_text(json.dumps(train_manifest, indent=2) + "\n", encoding="utf-8")
    if json.loads(train_audit.read_text(encoding="utf-8")) != train_manifest:
        raise ValueError("Train asset audit does not match the sources/prepared files")
    print(f"PASS: {len(train_manifest)} Train landscape JPEGs decoded; 5:3 bounds, dimensions and SHA-256 audit match.")
    print(f"PASS: {len(manifest)} original/prepared JPEG pairs decoded; dimensions and SHA-256 audit match.")
    for name, record in manifest.items():
        print(f"{name}: {record['sourceSize']} -> {record['preparedSize']}")

if __name__ == "__main__":
    main()
