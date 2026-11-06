#!/usr/bin/env python3
"""
Generate clean, flat-green-background versions of each monster with Nano Banana (Gemini image model).

  pip install google-genai pillow
  export GEMINI_API_KEY=...            # your AI Studio key — keep it out of git / chats
  python tools/nano_banana.py          # all monsters (skips ones already done)
  python tools/nano_banana.py m30 m31  # just these
  python tools/nano_banana.py --roar m30   # optional open-mouth roar frame

Output: art/clean/<id>.png  (and art/clean/<id>_roar.png for --roar)
Then run:  python tools/import_clean.py   to key out the green, align, and rebuild the rigs.
"""
import os, sys, io, time, glob
from PIL import Image

MODEL = os.environ.get('NANO_MODEL', 'gemini-2.5-flash-image')   # override if a newer Nano Banana model is available
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

CLEAN = ("Recreate this exact creature as a single character on a perfectly flat, solid pure green background (#00FF00). "
         "Keep the same design, pose, camera angle, colours, proportions and level of detail. Show the whole body with some "
         "empty space around it. No ground, no shadow, no floor, no props, no text, no frame, no other creatures. "
         "Even lighting, sharp clean edges. Square image.")
ROAR = ("Same creature, same pose and camera angle, on a perfectly flat solid pure green background (#00FF00), but with its "
        "mouth wide open in a roar. Change nothing else. No floor, no shadow.")

def source_for(mid):
    for d in ('raw', 'raw2'):
        p = f'{ROOT}/art/{d}/{mid}.jpg'
        if os.path.exists(p): return p
    return None

def all_ids():
    ids = []
    for p in sorted(glob.glob(f'{ROOT}/art/raw*/*.jpg')):
        ids.append(os.path.splitext(os.path.basename(p))[0])
    return ids

def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    roar = '--roar' in sys.argv
    key = os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY')
    if not key: sys.exit('Set GEMINI_API_KEY first (export GEMINI_API_KEY=...)')
    from google import genai
    client = genai.Client(api_key=key)
    os.makedirs(f'{ROOT}/art/clean', exist_ok=True)
    ids = args or all_ids()
    for mid in ids:
        src = source_for(mid)
        if not src: print('no source for', mid); continue
        out = f'{ROOT}/art/clean/{mid}{"_roar" if roar else ""}.png'
        if os.path.exists(out): print('skip (exists)', mid); continue
        for attempt in range(3):
            try:
                resp = client.models.generate_content(model=MODEL, contents=[ROAR if roar else CLEAN, Image.open(src)])
                img = None
                for part in resp.candidates[0].content.parts:
                    if getattr(part, 'inline_data', None) and part.inline_data.data:
                        img = Image.open(io.BytesIO(part.inline_data.data)); break
                if img is None: raise RuntimeError('no image in response')
                img.convert('RGB').save(out); print('ok', mid, img.size); break
            except Exception as e:
                print('retry', mid, attempt + 1, e); time.sleep(4 * (attempt + 1))
        time.sleep(1.5)   # be gentle with rate limits

if __name__ == '__main__':
    main()
