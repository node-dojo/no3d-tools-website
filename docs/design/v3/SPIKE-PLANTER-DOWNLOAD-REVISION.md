# Spike Planter download revision — 2026-11-02

Local candidate. Not uploaded or deployed. The active delivery pointer in
`api/prints/lib/delivery.json` has deliberately not changed: it still references
the existing package. Upload and verify this private immutable object before
updating that pointer and releasing the revised listing. Do not deploy the
new included-file claims on their own.

## Package

`/Users/joebowers/Library/CloudStorage/Dropbox/Caveman Creative/THE WELL_Digital Assets/THE WELL_play files/Spike Vases/NO3D Download Packages/2026-11-02-wall-and-standing/spike-planter-01.zip`

Bytes: 140220875. SHA-256: `03dbdad5ed17e21ec7f9fa72d11be8e15ec148a6f76eda852bfea7985e9e1b8c`.
Candidate object key: `no3d-prints/spike-planter-01/03dbdad5ed17e21e/spike-planter-01.zip`.

The adjacent `package-manifest.json` records source identities, exact dimensions,
file hashes, export cleanup, ZIP verification, and serialized STL validation.
The package contains five STLs, the original Bambu Studio 3MF, and a units note.
Original files remain in their source folder and are byte-identical to the
renamed wall-mounted files in this candidate. The 3MF is wall-mounted only.

## Source and dimensions

Wall-mounted authority is the original `Spike Vase 01 STLS:3DFs` files, not
geometry in the current Blend file. New free-standing authority is Blender
`Spike Vase V03`, PID 68618 / port 9880, object
`Spike Vase - Standing Version`, modifier/node group `Vase Processing.004`.
The evaluated mesh includes separate body and tray components.

Joe confirmed that the free-standing version should match the original nominal
142 mm size. Its uniform export scale is 0.821653448194071,
matching the original body's measured maximum XY extent of
142.714394 mm. Both standing parts use that same factor.
STLs are unitless; the serialized numbers represent millimeters. No automatic
meter conversion was applied despite the Blender scene's meter unit label.
The source object's identity transform scale was verified; its scene-position
offset is excluded from the export. Each new part is centered and seated at
Z=0. The tray is rotated opening-down for a flat lip on the build plate.

| Version / part | X × Y × Z (mm) |
| --- | --- |
| Spike Planter 01 - Wall Mounted - 142 mm - Main Body | 142.648 × 142.714 × 130.389 |
| Spike Planter 01 - Wall Mounted - 142 mm - Drip Tray | 125.272 × 125.192 × 52.346 |
| Spike Planter 01 - Wall Mounted - 142 mm - Hanger | 22.417 × 51.164 × 4.791 |
| Spike Planter 01 - Free Standing - 142 mm - Main Body | 142.714 × 142.691 × 123.859 |
| Spike Planter 01 - Free Standing - 142 mm - Drip Tray | 137.073 × 137.133 × 49.669 |

## Verification and limits

The original wall-mounted files were verified byte-for-byte after copying and
inside the ZIP. The new exports were reopened: each has one closed shell, zero
boundary/non-manifold edges, zero inconsistent edge winding, no zero-area
triangles, outward normals, and the intended millimeter dimensions.
The standing tray export removes ten opposite duplicate triangles and two
stray triangles, and retriangulates three collinear faces. Body face winding
was corrected in the exported copy. No source object, modifier, node, or Blend
file was edited or saved. The live source was checked unchanged after capture.
Physical printing and thread-fit validation have not been performed.

## Listing / viewer integration

The shared catalog now distinguishes the two versions, lists all six download
files, and explains millimeter import at 100% scale. Existing wall-mounted
preview names were clarified. The ongoing viewer implementation is separate:
its three original wall-mounted previews are preserved; the additional standing
STLs are currently listed in the preview notes. Add their viewer derivatives
from this package when integrating that work, without replacing the original
wall-mounted mesh sources with this Blend file.

Local website checks passed: 195 unit tests, Prints browser acceptance, and the
V3 eight-route acceptance suite at 390×844 and 1440×1100. The catalog and campaign
models expose the same six-file list. These use local fixtures and do not prove
production download delivery. Dependency audit remains at nine advisories
(4 low, 1 moderate, 4 high); no dependencies changed in this revision.
