# Photography intake

Status (Task 028A): the three owner-supplied AI-generated concept JPEGs below are
retained locally but no longer referenced by active Home or Train UI. JPEG format
and dimensions were verified in Task 026C. Owner
approval for integration does not independently verify redistribution or
commercial-use rights; applicable generation terms still require confirmation.

## Required destinations

| Repository path | Recommended dimensions | Aspect ratio | Compressed size target |
| --- | --- | --- | --- |
| `mobile/assets/photos/home-gym-hero.jpg` | 1600 x 1000 px | 8:5 | 180–300 KB |
| `mobile/assets/photos/strength-equipment.jpg` | 960 x 640 px | 3:2 | 50–100 KB |
| `mobile/assets/photos/cardio-equipment.jpg` | 960 x 640 px | 3:2 | 50–100 KB |

## Intake checklist (each JPEG)

- [ ] Record the exact source, creator, and evidence of ownership or permission
      to redistribute the image inside the mobile app. Record applicable terms,
      attribution requirements, review date, and reviewer. A source URL or license
      label alone does not establish approval for the exact image.
- [ ] Review recognizable people, property, logos, and trademarks; document any
      necessary permissions. Do not imply endorsement or identify photographed
      people as FitSocial trainers, verified professionals, or members. Prefer
      equipment-focused scenes without identifiable people.
- [ ] Export a real JPEG at the dimensions/aspect ratio above. Compress toward
      the stated size target without visible artifacts or crushed shadow detail.
- [ ] Apply orientation before export, remove EXIF metadata (including location,
      device, and personal information), and check the exported orientation.
- [ ] Review dark cinematic tones against the existing charcoal/lime identity.
      Keep quiet space behind hero text/actions and crop-safe equipment detail
      near category image centers. Check narrow and wide cover crops.
- [ ] Preview with a dark overlay: text must remain readable, including captions
      and enlarged text. Target at least 4.5:1 contrast for normal text; do not
      rely on the photograph alone for readability.
- [ ] Record final filename, dimensions, byte size, provenance, rights evidence,
      and visual review outcome before marking any asset approved or bundled.

The `../asset-manifest.json` records these three files under `retainedPhotos`, their
former usage, owner-supplied provenance, and outstanding rights confirmation.
`bundledPhotos` is empty because active screens now use native illustrations. The older
Pexels candidate remains unbundled and is unrelated to these files. The checklist
above remains a review checklist, not a completed rights or device certification.

Home and Train use original static native shape illustrations, with no photo
loading or network dependency. Original photo components/references are preserved
for review and their failure behavior remains tested. Physical-device text
scaling, touch and accessibility checks remain required before release.
