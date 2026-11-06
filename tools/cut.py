import cv2,numpy as np,sys
def cut(src,dst,crop=None,size=512):
    im=cv2.imread(src)
    if crop: x0,y0,x1,y1=crop; h,w=im.shape[:2]; im=im[int(y0*h):int(y1*h),int(x0*w):int(x1*w)]
    h,w=im.shape[:2]; s=min(h,w)
    # square crop centered
    cy,cx=h//2,w//2; im=im[cy-s//2:cy+s//2, cx-s//2:cx+s//2]
    im=cv2.resize(im,(size,size),interpolation=cv2.INTER_AREA)
    mask=np.zeros((size,size),np.uint8)
    r=(int(size*.04),int(size*.04),int(size*.92),int(size*.94))
    bg=np.zeros((1,65),np.float64);fg=np.zeros((1,65),np.float64)
    cv2.grabCut(im,mask,r,bg,fg,6,cv2.GC_INIT_WITH_RECT)
    m=np.where((mask==1)|(mask==3),255,0).astype(np.uint8)
    # keep largest component
    n,lab,st,_=cv2.connectedComponentsWithStats(m)
    if n>1:
        k=1+np.argmax(st[1:,cv2.CC_STAT_AREA]); m=np.where(lab==k,255,0).astype(np.uint8)
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((9,9),np.uint8))
    m=cv2.GaussianBlur(m,(0,0),3)
    # ellipse vignette to soften hard edges
    yy,xx=np.mgrid[0:size,0:size]; d=np.sqrt(((xx-size/2)/(size*.5))**2+((yy-size/2)/(size*.52))**2)
    v=np.clip((1-d)/0.12,0,1)
    core=np.clip((0.78-d)/0.25,0,1)
    a=(np.maximum(m/255.0,core)*v*255).astype(np.uint8)
    out=cv2.cvtColor(im,cv2.COLOR_BGR2BGRA); out[:,:,3]=a
    cv2.imwrite(dst,out)
if __name__=='__main__':
    cut(sys.argv[1],sys.argv[2])
