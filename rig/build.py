# Build puppet rigs: cut parts out of each cutout, fill the gaps behind them, pack into an atlas.
import json, sys, glob, os, cv2, numpy as np
from PIL import Image
S = 512
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # project root
def shape_mask(shape):
    m = np.zeros((S, S), np.uint8)
    if shape[0] == 'e':
        _, cx, cy, rx, ry, ang = shape
        cv2.ellipse(m, (int(cx*S), int(cy*S)), (max(1,int(rx*S)), max(1,int(ry*S))), ang, 0, 360, 255, -1)
    else:
        pts = np.array([[int(x*S), int(y*S)] for x, y in shape[1]], np.int32)
        cv2.fillPoly(m, [pts], 255)
    return m
def fg_mask(mid, src):
    """strict creature mask via GrabCut (cached)"""
    cp = f'{ROOT}/rig/fg_{mid}.png'
    if os.path.exists(cp): return np.array(Image.open(cp)) > 127
    bgr = cv2.cvtColor(src[:, :, :3], cv2.COLOR_RGB2BGR)
    m = np.zeros((S, S), np.uint8)
    m[src[:, :, 3] < 20] = cv2.GC_BGD; m[src[:, :, 3] >= 20] = cv2.GC_PR_BGD
    core = np.zeros((S, S), np.uint8); cv2.ellipse(core, (S//2, int(S*0.52)), (int(S*0.2), int(S*0.22)), 0, 0, 360, 1, -1)
    m[(core > 0) & (src[:, :, 3] > 200)] = cv2.GC_PR_FGD
    bg = np.zeros((1, 65)); fgm = np.zeros((1, 65))
    try:
        cv2.grabCut(bgr, m, None, bg, fgm, 5, cv2.GC_INIT_WITH_MASK)
        f = ((m == 1) | (m == 3)).astype(np.uint8) * 255
    except Exception:
        f = (src[:, :, 3] > 160).astype(np.uint8) * 255
    f = cv2.morphologyEx(f, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
    Image.fromarray(f).save(cp)
    return f > 127

def transform_parts(mid, parts):
    tx_p = f'{ROOT}/rig/tx_{mid}.json'
    if not os.path.exists(tx_p):
        return parts
    M_inv = np.array(json.load(open(tx_p)), dtype=np.float32)
    scale = float(np.hypot(M_inv[0, 0], M_inv[1, 0]))
    ang_off = float(np.degrees(np.arctan2(M_inv[1, 0], M_inv[0, 0])))
    def tx_pt(x, y):
        px, py = x * S, y * S
        return float((M_inv[0, 0]*px + M_inv[0, 1]*py + M_inv[0, 2]) / S), float((M_inv[1, 0]*px + M_inv[1, 1]*py + M_inv[1, 2]) / S)
    out = []
    for t, sh, piv, opt in parts:
        npiv = list(tx_pt(piv[0], piv[1]))
        if sh[0] == 'e':
            _, ecx, ecy, erx, ery, eang = sh
            ncx, ncy = tx_pt(ecx, ecy)
            mul = 1.12 if t not in ('jaw', 'maw') else 1.0
            nsh = ['e', ncx, ncy, erx * scale * mul, ery * scale * mul, eang + ang_off]
        else:
            nsh = ['p', [list(tx_pt(px, py)) for px, py in sh[1]]]
        out.append([t, nsh, npiv, opt])
    return out

def build(mid, orig_parts):
    parts = transform_parts(mid, orig_parts)
    src = np.array(Image.open(f'{ROOT}/art/cut/{mid}.png').convert('RGBA').resize((S, S), Image.LANCZOS))
    rgb = src[:, :, :3].copy(); a = src[:, :, 3].astype(np.float32) / 255
    fg = fg_mask(mid, src)
    fgs = cv2.GaussianBlur(cv2.dilate(fg.astype(np.uint8) * 255, np.ones((5, 5), np.uint8)), (0, 0), 2).astype(np.float32) / 255
    masks = [shape_mask(sh) for _, sh, _, _ in parts]

    # Geodesic limb/head extension inside creature foreground so un-cropped hands/feet/horns/weapons move with their part
    cre = (a > 0.06)
    limb_idx = [i for i, p in enumerate(parts) if p[0] not in ('jaw', 'maw')]
    if limb_idx and cre.any():
        yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
        body_pivs = [parts[i][2] for i in limb_idx if parts[i][0] in ('head', 'arm', 'leg')] or [parts[i][2] for i in limb_idx]
        tcx = float(np.mean([p[0] for p in body_pivs]) * S)
        tcy = float(np.mean([p[1] for p in body_pivs]) * S)
        r_torso = max(25.0, 0.78 * float(np.mean([np.hypot(p[0]*S - tcx, p[1]*S - tcy) for p in body_pivs])))

        union_limbs = np.zeros((S, S), np.uint8)
        for i in limb_idx:
            hm = masks[i].copy()
            px, py = parts[i][2][0] * S, parts[i][2][1] * S
            dx, dy = px - tcx, py - tcy
            if np.hypot(dx, dy) < 5:
                ys_m, xs_m = np.where(hm > 0)
                if len(xs_m): dx, dy = xs_m.mean() - px, ys_m.mean() - py
            L = max(1.0, np.hypot(dx, dy))
            ux, uy = dx / L, dy / L
            outward = ((xx - px) * ux + (yy - py) * uy) > -10
            for _ in range(8):
                if ((hm > 0) & cre & outward).sum() >= 350: break
                hm = cv2.dilate(hm, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11)))
            masks[i] = np.where((hm > 0) & (outward | (masks[i] > 0)), 255, 0).astype(np.uint8)
            union_limbs |= masks[i]

        torso_disk = ((xx - tcx)**2 + (yy - tcy)**2) <= (r_torso ** 2)
        torso_core = cre & torso_disk & (~(union_limbs > 0))
        if not torso_core.any():
            torso_core = cre & (~(union_limbs > 0))

        owner = np.zeros((S, S), np.int32)
        owner[torso_core] = 1
        for k, i in enumerate(limb_idx):
            owner[(masks[i] > 0) & cre] = 2 + k

        unassigned = cre & (owner == 0)
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        for _ in range(180):
            if not unassigned.any(): break
            best_lbl = np.zeros((S, S), np.int32)
            for lbl in range(1, 2 + len(limb_idx)):
                d = cv2.dilate((owner == lbl).astype(np.uint8), kernel) > 0
                newly = unassigned & d & (best_lbl == 0)
                best_lbl[newly] = lbl
            if not (best_lbl > 0).any(): break
            owner[best_lbl > 0] = best_lbl[best_lbl > 0]
            unassigned = cre & (owner == 0)

        if unassigned.any():
            _, labels_dt = cv2.distanceTransformWithLabels((owner == 0).astype(np.uint8), cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
            seed_vals = owner[owner > 0]
            if len(seed_vals):
                owner[unassigned] = seed_vals[labels_dt[unassigned] - 1]

        for k, i in enumerate(limb_idx):
            ext = (owner == (2 + k)).astype(np.uint8) * 255
            ext = cv2.morphologyEx(ext, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
            masks[i] = masks[i] | ext

    body_rgb = rgb.astype(np.float32).copy()
    inpaint_mask = np.zeros((S, S), np.uint8)
    mouth_body = np.zeros((S, S), bool)
    out_parts = []; crops = []
    head_idx = [i for i, p in enumerate(parts) if p[0] == 'head']
    for i, (t, shape, pivot, opt) in enumerate(parts):
        hm = masks[i].copy()
        # later jaws / maws are cut out of earlier parts (e.g. the jaw out of the head)
        later_mouth = np.zeros((S, S), np.uint8)
        for j in range(i + 1, len(parts)):
            if parts[j][0] in ('jaw', 'maw'): later_mouth |= masks[j]
        own = (hm > 0) & ~(later_mouth > 0)
        soft = cv2.GaussianBlur(own.astype(np.uint8) * 255, (0, 0), 3).astype(np.float32) / 255
        cover = fgs if (t not in ('head', 'jaw', 'maw', 'body') and fg[hm > 0].mean() > 0.15) else np.ones_like(fgs)
        pa = a * soft * cover
        prgb = rgb.astype(np.float32).copy()
        if t == 'head' and later_mouth.any():          # dark mouth inside the head where the jaw sits
            mm = (cv2.erode(later_mouth, np.ones((9, 9), np.uint8)) > 0) & (hm > 0)
            prgb[mm] = [22, 3, 6]; pa = np.where(mm, np.maximum(pa, a * 0.98), pa)
        ys, xs = np.where(pa > 0.03)
        if len(xs) == 0: continue
        x0, x1, y0, y1 = max(0, xs.min()-2), min(S, xs.max()+3), max(0, ys.min()-2), min(S, ys.max()+3)
        crops.append(np.dstack([np.clip(prgb[y0:y1, x0:x1], 0, 255).astype(np.uint8), (pa[y0:y1, x0:x1] * 255).astype(np.uint8)]))
        out_parts.append({'t': t, 'ox': int(x0), 'oy': int(y0), 'w': int(x1-x0), 'h': int(y1-y0), 'px': round(pivot[0]*S, 1), 'py': round(pivot[1]*S, 1),
                          'z': opt.get('z', 1), 'side': 'L' if pivot[0] < 0.5 else 'R', 'ph': round(float(np.random.rand() * 6.28), 2)})
        if t in ('jaw', 'maw'):
            inside_head = any(masks[h][int(pivot[1]*S) % S, int(pivot[0]*S) % S] > 0 for h in head_idx if h < i)
            if not inside_head: mouth_body |= (cv2.erode(hm, np.ones((9, 9), np.uint8)) > 0) & (a > 0.2)
        else:
            inpaint_mask |= (((hm > 0) & (fg | (a > 0.08)))).astype(np.uint8) * 255
    inpaint_mask = cv2.dilate(inpaint_mask, np.ones((5, 5), np.uint8))
    inpaint_mask[mouth_body] = 0

    # Fill non-valid pixels with nearest valid torso RGB so cv2.inpaint never pulls black from transparent background
    valid = (a > 0.4) & ~(inpaint_mask > 0)
    if valid.any():
        _, labels_v = cv2.distanceTransformWithLabels((~valid).astype(np.uint8), cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
        filled_rgb = rgb[valid][labels_v - 1]
    else:
        filled_rgb = rgb
    bgr = cv2.cvtColor(filled_rgb, cv2.COLOR_RGB2BGR)
    inp = cv2.cvtColor(cv2.inpaint(bgr, inpaint_mask, 15, cv2.INPAINT_TELEA), cv2.COLOR_BGR2RGB).astype(np.float32)
    # blur the filled area so it reads as soft shadowy flesh behind the limbs
    blur = cv2.GaussianBlur(inp, (0, 0), 8)
    im = (inpaint_mask > 0)
    body_rgb[im] = blur[im] * 0.72

    # Keep body alpha on the torso and inside a soft joint socket around pivots, erasing distal ghost limbs
    torso_rem = ((a > 0.05) & ~(inpaint_mask > 0)).astype(np.uint8) * 255
    joints = np.zeros((S, S), np.uint8)
    for i, (t, shape, pivot, opt) in enumerate(parts):
        if t not in ('jaw', 'maw'):
            jr = int(opt.get('joint', 0.08) * S)
            cv2.circle(joints, (int(pivot[0]*S), int(pivot[1]*S)), jr, 255, -1)
    socket = cv2.dilate(torso_rem, np.ones((19, 19), np.uint8)) | joints
    socket_soft = cv2.GaussianBlur(socket, (0, 0), 10).astype(np.float32) / 255.0
    body_a = a.copy()
    body_a[im] = a[im] * socket_soft[im]

    if mouth_body.any():
        dist = cv2.distanceTransform(mouth_body.astype(np.uint8) * 255, cv2.DIST_L2, 5); dist = dist / (dist.max() + 1e-6)
        col = np.stack([30 - 22*dist, 4 - 3*dist, 7 - 5*dist], -1)
        body_rgb = np.where(mouth_body[..., None], col, body_rgb)
        body_a = np.where(mouth_body, a, body_a)
    body = np.dstack([np.clip(body_rgb, 0, 255).astype(np.uint8), (body_a * 255).astype(np.uint8)])
    x, y, rowh = S, 0, 0; W = S + 512; placed = []
    for c in crops:
        h, w = c.shape[:2]
        if x + w > W: x, y, rowh = S, y + rowh, 0
        placed.append((x, y)); x += w; rowh = max(rowh, h)
    H = max(S, y + rowh)
    atlas = np.zeros((H, W, 4), np.uint8); atlas[:S, :S] = body
    for (px, py), c, p in zip(placed, crops, out_parts):
        atlas[py:py+c.shape[0], px:px+c.shape[1]] = c; p['sx'] = int(px); p['sy'] = int(py)
    Image.fromarray(atlas).save(f'{ROOT}/game/a/rig_{mid}.webp', quality=86, method=6)
    return {'s': S, 'parts': out_parts}
if __name__ == '__main__':
    rigs = {}
    for f in sorted(glob.glob(f'{ROOT}/rig/rigs_*.json')):
        rigs.update(json.load(open(f)))
    only = sys.argv[1:]
    out = {}
    if os.path.exists(f'{ROOT}/rig/built.json'): out = json.load(open(f'{ROOT}/rig/built.json'))
    for mid, parts in rigs.items():
        if only and mid not in only: continue
        out[mid] = build(mid, parts); print(mid, len(out[mid]['parts']), flush=True)
    json.dump(out, open(f'{ROOT}/rig/built.json', 'w'))
    open(f'{ROOT}/game/rigs.js', 'w').write('// generated by rig/build.py\nconst RIGS = ' + json.dumps(out, separators=(',', ':')) + ';\n')
