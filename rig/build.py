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

def build(mid, parts):
    src = np.array(Image.open(f'{ROOT}/art/cut/{mid}.png').convert('RGBA').resize((S, S), Image.LANCZOS))
    rgb = src[:, :, :3].copy(); a = src[:, :, 3].astype(np.float32) / 255
    fg = fg_mask(mid, src)
    fgs = cv2.GaussianBlur(cv2.dilate(fg.astype(np.uint8) * 255, np.ones((5, 5), np.uint8)), (0, 0), 2).astype(np.float32) / 255
    masks = [shape_mask(sh) for _, sh, _, _ in parts]
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
            inpaint_mask |= (((hm > 0) & (fg | (a > 0.85))) ).astype(np.uint8) * 255
    inpaint_mask = cv2.dilate(inpaint_mask, np.ones((5, 5), np.uint8))
    inpaint_mask[mouth_body] = 0
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    inp = cv2.cvtColor(cv2.inpaint(bgr, inpaint_mask, 15, cv2.INPAINT_TELEA), cv2.COLOR_BGR2RGB).astype(np.float32)
    # blur the filled area so it reads as soft shadowy flesh behind the limbs
    blur = cv2.GaussianBlur(inp, (0, 0), 6)
    im = (inpaint_mask > 0)
    body_rgb[im] = blur[im] * 0.6
    if mouth_body.any():
        dist = cv2.distanceTransform(mouth_body.astype(np.uint8) * 255, cv2.DIST_L2, 5); dist = dist / (dist.max() + 1e-6)
        col = np.stack([30 - 22*dist, 4 - 3*dist, 7 - 5*dist], -1)
        body_rgb = np.where(mouth_body[..., None], col, body_rgb)
    body = np.dstack([np.clip(body_rgb, 0, 255).astype(np.uint8), (a * 255).astype(np.uint8)])
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
