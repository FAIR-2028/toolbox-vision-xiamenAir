"""Detect missing stable slots in the user's photographed toolbox.

The two reference photographs are selected by feature matching. This is a narrow
same-box demo detector, so uncertain registration is returned for review.
"""
import json
import sys
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data' / 'real_demo'
CONFIG = json.loads((DATA / 'slots.json').read_text(encoding='utf-8'))
REFERENCES = {int(x['id']): x for x in CONFIG['references']}
# Stable regions only. Dense bit-head rows are intentionally left for review.
STABLE = {'large_driver_handle', 'small_driver_handle', 'short_extension_adapter', 'long_extension_bar', 'socket'}


def decode():
    request = json.loads(sys.stdin.read())
    image = cv2.imdecode(np.frombuffer(bytes.fromhex(request['imageHex']), np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError('invalid image')
    return image


def features(image):
    sift = cv2.SIFT_create(nfeatures=5000)
    key, desc = sift.detectAndCompute(image, None)
    if desc is None:
        raise ValueError('no image features')
    return sift, key, desc


def register(image, reference):
    sift, key, desc = features(image)
    _, ref_key, ref_desc = features(reference)
    pairs = cv2.BFMatcher().knnMatch(desc, ref_desc, k=2)
    good = [a for a, b in pairs if a.distance < 0.7 * b.distance]
    if len(good) < 12:
        return None, 0
    matrix, mask = cv2.findHomography(
        np.float32([key[m.queryIdx].pt for m in good]),
        np.float32([ref_key[m.trainIdx].pt for m in good]),
        cv2.RANSAC, 4,
    )
    return matrix, int(mask.sum()) if mask is not None else 0


def occupancy(image, reference, slot):
    x1, y1, x2, y2 = slot['box']
    current = cv2.cvtColor(image[y1:y2, x1:x2], cv2.COLOR_BGR2GRAY)
    expected = cv2.cvtColor(reference[y1:y2, x1:x2], cv2.COLOR_BGR2GRAY)
    if current.size == 0 or expected.size == 0:
        return 0.0
    h, w = current.shape
    inner = (slice(max(1, int(h * .12)), max(2, int(h * .88)),), slice(max(1, int(w * .12)), max(2, int(w * .88))))
    a, b = current[inner], expected[inner]
    # Empty molded recesses expose dark insert. Tool metal/colour raises local intensity.
    return float(np.mean(a)) / max(float(np.mean(b)), 1.0)


def main():
    original = decode()
    height, width = original.shape[:2]
    # Reference images are canonical warped canvases. Resize upload for matching,
    # then map reference boxes back through the inverse homography.
    scale = 1200 / height
    image = cv2.resize(original, (round(width * scale), 1200))
    candidates = []
    for rid, item in REFERENCES.items():
        reference = cv2.imread(str(DATA / item['image']))
        matrix, inliers = register(image, reference)
        if matrix is not None:
            candidates.append((inliers, rid, matrix, reference))
    if not candidates:
        print(json.dumps({'status': 'needs_review', 'reason': 'registration_failed', 'missingSlots': []}))
        return
    inliers, rid, matrix, reference = max(candidates, key=lambda x: x[0])
    inverse = np.linalg.inv(matrix)
    warped = cv2.warpPerspective(image, matrix, (reference.shape[1], reference.shape[0]))
    result = []
    for slot in REFERENCES[rid]['slots']:
        if slot['category'] not in STABLE:
            continue
        ratio = occupancy(warped, reference, slot)
        # Stable empty slots in the captured photos fall below .66. Keep a wide
        # review band to avoid claiming certainty on glare or occlusion.
        if ratio < 0.66:
            x1, y1, x2, y2 = slot['box']
            corners = np.float32([[[x1, y1], [x2, y1], [x2, y2], [x1, y2]]])
            mapped = cv2.perspectiveTransform(corners, inverse)[0]
            bx = [max(0, min(1000, round(float(v[0]) / image.shape[1] * 1000, 2))) for v in mapped]
            by = [max(0, min(1000, round(float(v[1]) / image.shape[0] * 1000, 2))) for v in mapped]
            result.append({'slot': slot['id'], 'classId': slot['category'], 'label': {'large_driver_handle': '大号螺丝刀手柄', 'small_driver_handle': '小号螺丝刀手柄', 'short_extension_adapter': '短延长杆', 'long_extension_bar': '长延长杆', 'socket': '套筒'}.get(slot['category'], slot['category']), 'ratio': round(ratio, 3), 'confidence': round(max(0, min(1, 1 - ratio)), 3), 'bbox': [min(bx[0::2]), min(by[0::2]), max(bx[0::2]), max(by[0::2])]})
    print(json.dumps({'status': 'needs_review', 'referenceId': rid, 'registrationInliers': inliers, 'missingSlots': result, 'image': {'width': width, 'height': height}}, ensure_ascii=False))


if __name__ == '__main__':
    main()
