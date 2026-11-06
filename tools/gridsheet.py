from PIL import Image, ImageDraw
import sys
ids=sys.argv[2:]; out=sys.argv[1]; S=420; cols=3
rows=(len(ids)+cols-1)//cols
sheet=Image.new('RGB',(S*cols,(S+24)*rows),(30,22,30)); d=ImageDraw.Draw(sheet)
for i,n in enumerate(ids):
    im=Image.open(f'art/cut/{n}.png').convert('RGBA').resize((S,S))
    bg=Image.new('RGBA',(S,S),(60,50,60,255)); bg.alpha_composite(im)
    x=(i%cols)*S; y=(i//cols)*(S+24)
    sheet.paste(bg.convert('RGB'),(x,y+24))
    for k in range(1,10):
        c=(255,255,0) if k==5 else (120,200,255)
        d.line([(x+k*S/10,y+24),(x+k*S/10,y+24+S)],fill=c,width=1)
        d.line([(x,y+24+k*S/10),(x+S,y+24+k*S/10)],fill=c,width=1)
        d.text((x+k*S/10+2,y+26),str(k),fill=(255,255,255)); d.text((x+2,y+24+k*S/10+1),str(k),fill=(255,255,255))
    d.text((x+6,y+5),n,fill=(255,80,80))
sheet.save(out,quality=85)
