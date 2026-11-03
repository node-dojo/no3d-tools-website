"""Build normalized, reduced display meshes; never modifies the printable sources.
Requires numpy and fast-simplification. See docs/design/v3/PRINT-PART-VIEWERS.md.
"""
import argparse, hashlib, json, struct
from pathlib import Path
import numpy as np
import fast_simplification

parser = argparse.ArgumentParser()
parser.add_argument('--mace-dir', type=Path, required=True)
parser.add_argument('--planter-dir', type=Path, required=True)
parser.add_argument('--standing-dir', type=Path, required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
out = root / 'v3/assets/prints/previews'
out.mkdir(parents=True, exist_ok=True)
specs = [
    (args.mace_dir, '111mm Mace Ball_0919_39_1412_001.stl', 'mace-111mm', 18000),
    (args.mace_dir, 'Big Chain_0919_31_1412_001.stl', 'big-chain', 22000),
    (args.mace_dir, 'Lighter Holding Haft handle_0919_58_1409_001.stl', 'lighter-haft', 18000),
    (args.planter_dir, 'Spike Vase 01 - 142 mm - main body.stl', 'planter-body', 26000),
    (args.planter_dir, 'Spike Vase 01 - 142 mm - drip tray.stl', 'planter-tray', 18000),
    (args.planter_dir, 'Spike Vase 01 - 142 mm - wall mount hanger.stl', 'planter-hanger', 1000),
    (args.standing_dir, 'Spike Planter 01 - Free Standing - 142 mm - Main Body.stl', 'planter-standing-body', 26000),
    (args.standing_dir, 'Spike Planter 01 - Free Standing - 142 mm - Drip Tray.stl', 'planter-standing-tray', 18000),
]
manifest = []
for directory, filename, slug, target in specs:
    data = (directory / filename).read_bytes()
    count = struct.unpack_from('<I', data, 80)[0]
    assert len(data) == 84 + count * 50, f'Expected binary STL: {filename}'
    dtype = np.dtype([('normal', '<f4', (3,)), ('points', '<f4', (3, 3)), ('attr', '<u2')])
    soup = np.frombuffer(data, dtype=dtype, count=count, offset=84)['points'].reshape(-1, 3)
    assert np.isfinite(soup).all()
    points, inverse = np.unique(soup, axis=0, return_inverse=True)
    faces = inverse.reshape(-1, 3).astype(np.int32)
    points, faces = fast_simplification.simplify(points, faces, target_count=min(target, count), agg=5)
    center = (points.min(axis=0) + points.max(axis=0)) / 2
    points = ((points - center) / np.max(np.linalg.norm(points - center, axis=1))).astype('<f4')
    faces = faces.astype('<u4')
    payload = b'N3DP' + struct.pack('<II', len(points), len(faces)) + points.tobytes() + faces.tobytes()
    digest = hashlib.sha256(payload).hexdigest()
    asset = f'{slug}-{digest[:10]}.bin'
    (out / asset).write_bytes(payload)
    item = {'id': slug, 'source': filename, 'sourceSha256': hashlib.sha256(data).hexdigest(), 'sourceTriangles': count,
            'previewTriangles': len(faces), 'vertices': len(points), 'asset': asset, 'bytes': len(payload), 'sha256': digest}
    manifest.append(item)
    print(json.dumps(item), flush=True)
(root / 'docs/design/v3/print-preview-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
