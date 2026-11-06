#!/usr/bin/env python3
"""
Turn Nano Banana's flat-green images (art/clean/<id>.png) into new cut-outs and rebuild the puppet rigs.

  python tools/import_clean.py           # every image in art/clean/
  python tools/import_clean.py m30 m31   # just these

For each monster:
  1. key out the green background (with edge de-spill) -> clean transparent creature
  2. ALIGN it to the old cut-out (art/cut/<id>.png) so the hand-made part outlines in rig/rigs_*.json still fit
     (feature matching + similarity transform; falls back to bounding-box fit)
  3. save the old cut-out to art/cut_orig/ (once) and write the new one to art/cut/<id>.png
  4. rebuild the rig atlas + game/rigs.js, and refresh the game's sprite/card images

Check rig/align_<id>.jpg afterwards: left = old, right = new aligned. If a monster looks shifted,
nudge its part outlines in rig/rigs_*.json (use tools/gridsheet.py to get a gridded view) and rerun rig/build.py.
"""
import os, sys, glob, shutil, subprocess, cv2, numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = 512

def key_green(rgb):
    f = rgb.astype(np.float32)
    r, g, b = f[..., 0], f[..., 1], f[..., 2]
    greenness = g - np.maximum(r, b)                       # how much greener than the other channels
    alpha = np.clip(1 - (greenness - 25) / 60, 0, 1)        # >85 = fully background, <25 = fully creature
    a8 = (alpha * 255).astype(np.uint8)
    a8 = cv2.morphologyEx(a8, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats((a8 > 128).astype(np.uint8))
    if n > 1:                                               # keep the main creature (+ big pieces)
        big = 1 + np.argmax(st[1:, cv2.CC_STAT_AREA]); keep = np.zeros_like(a8)
        for i in range(1, n):
            if i == big or st[i, cv2.CC_STAT_AREA] > st[big, cv2.CC_STAT_AREA] * 0.08: keep[lab == i] = 1
        a8 = (a8 * keep).astype(np.uint8)
    a8 = cv2.GaussianBlur(a8, (0, 0), 0.8)
    # de-spill: pull green down on semi-transparent edge pixels
    edge = (a8 > 0) & (a8 < 250)
    f[..., 1] = np.where(edge | (greenness > 0), np.minimum(g, np.maximum(r, b) + 8), g)
    return np.dstack([np.clip(f, 0, 255).astype(np.uint8), a8])

def align(new_rgba, old_rgba):
    """similarity transform mapping new -> old frame"""
    def gray(x):
        a = x[..., 3:4].astype(np.float32) / 255
        return cv2.cvtColor((x[..., :3] * a).astype(np.uint8), cv2.COLOR_RGB2GRAY)
    g1, g2 = gray(new_rgba), gray(old_rgba)
    orb = cv2.ORB_create(3000)
    k1, d1 = orb.detectAndCompute(g1, (new_rgba[..., 3] > 60).astype(np.uint8))
    k2, d2 = orb.detectAndCompute(g2, (old_rgba[..., 3] > 60).astype(np.uint8))
    M = None
    if d1 is not None and d2 is not None and len(k1) > 20 and len(k2) > 20:
        m = cv2.BFMatcher(cv2.NORM_HAMMING).knnMatch(d1, d2, k=2)
        good = [a for a, b in (p for p in m if len(p) == 2) if a.distance < 0.78 * b.distance]
        if len(good) >= 12:
            src = np.float32([k1[x.queryIdx].pt for x in good]); dst = np.float32([k2[x.trainIdx].pt for x in good])
            M, inl = cv2.estimateAffinePartial2D(src, dst, method=cv2.RANSAC, ransacReprojThreshold=6)
            if M is not None:
                s = np.hypot(M[0, 0], M[1, 0])
                if inl is None or inl.sum() < 10 or not (0.5 < s < 2.0): M = None
    how = 'features'
    if M is None:                                           # fallback: match bounding boxes of the creature
        how = 'bbox'
        def box(x):
            ys, xs = np.where(x[..., 3] > 100); return xs.min(), ys.min(), xs.max(), ys.max()
        a, b = box(new_rgba), box(old_rgba)
        s = min((b[2] - b[0]) / max(1, a[2] - a[0]), (b[3] - b[1]) / max(1, a[3] - a[1]))
        cxa, cya, cxb, cyb = (a[0] + a[2]) / 2, (a[1] + a[3]) / 2, (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
        M = np.float32([[s, 0, cxb - s * cxa], [0, s, cyb - s * cya]])
    out = cv2.warpAffine(new_rgba, M, (S, S), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))
    return out, how

def refresh_game_images(mid, rgba):
    im = Image.fromarray(rgba)
    im.resize((384, 384), Image.LANCZOS).save(f'{ROOT}/game/a/{mid}.webp', quality=82, method=6)

def main():
    ids = sys.argv[1:] or sorted(os.path.splitext(os.path.basename(p))[0] for p in glob.glob(f'{ROOT}/art/clean/*.png') if '_roar' not in p)
    os.makedirs(f'{ROOT}/art/cut_orig', exist_ok=True)
    done = []
    for mid in ids:
        src = f'{ROOT}/art/clean/{mid}.png'
        if not os.path.exists(src): print('missing', src); continue
        old_p = f'{ROOT}/art/cut/{mid}.png'
        bak = f'{ROOT}/art/cut_orig/{mid}.png'
        if not os.path.exists(bak) and os.path.exists(old_p): shutil.copy(old_p, bak)
        old = np.array(Image.open(bak if os.path.exists(bak) else old_p).convert('RGBA').resize((S, S), Image.LANCZOS))
        new = np.array(Image.open(src).convert('RGB'))
        h, w = new.shape[:2]; side = max(h, w)                 # pad to square with green, then 512
        sq = np.zeros((side, side, 3), np.uint8); sq[..., 1] = 255; sq[(side - h) // 2:(side - h) // 2 + h, (side - w) // 2:(side - w) // 2 + w] = new
        keyed = key_green(cv2.resize(sq, (S, S), interpolation=cv2.INTER_AREA))
        aligned, how = align(keyed, old)
        Image.fromarray(aligned).save(old_p)
        fg = f'{ROOT}/rig/fg_{mid}.png'                        # creature mask is now just the alpha
        Image.fromarray(((aligned[..., 3] > 127) * 255).astype(np.uint8)).save(fg)
        refresh_game_images(mid, aligned)
        vis = np.concatenate([old, aligned], 1); bg = np.full_like(vis, (60, 50, 60, 255)); a = vis[..., 3:4] / 255
        Image.fromarray((vis[..., :3] * a + bg[..., :3] * (1 - a)).astype(np.uint8)).save(f'{ROOT}/rig/align_{mid}.jpg', quality=85)
        print(f'{mid}: aligned by {how}'); done.append(mid)
    if done:
        subprocess.run([sys.executable, f'{ROOT}/rig/build.py'] + done, check=True)
        print('Rebuilt rigs for', ' '.join(done))

if __name__ == '__main__':
    main()
