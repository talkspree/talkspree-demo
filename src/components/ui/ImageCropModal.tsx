import { useEffect, useRef, useState, useCallback, MouseEvent, TouchEvent, WheelEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ZoomIn, ZoomOut, RotateCcw, Check } from 'lucide-react';

interface ImageCropModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Source image File or URL to crop */
  source: File | string | null;
  /** Aspect ratio width / height (e.g. 1 for square, 16/9 for cover). Default 1 */
  aspect?: number;
  /** Crop frame shape – "round" (avatars) or "rect" (covers). Default "round" */
  shape?: 'round' | 'rect';
  /** Output image edge size (px). Default depends on shape. */
  outputSize?: number;
  /** Filename used for the produced File */
  outputFileName?: string;
  /** Title shown in the modal */
  title?: string;
  onCropComplete: (file: File, dataUrl: string) => void;
}

const VIEW_W = 320; // crop frame width in px (within modal)
const PADDING = 16;

export function ImageCropModal({
  open,
  onOpenChange,
  source,
  aspect = 1,
  shape = 'round',
  outputSize,
  outputFileName = 'cropped.jpg',
  title = 'Adjust your photo',
  onCropComplete,
}: ImageCropModalProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [minScale, setMinScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 }); // image top-left within the crop frame
  const dragStateRef = useRef<{ x: number; y: number; offX: number; offY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const frameWidth = VIEW_W;
  const frameHeight = Math.round(VIEW_W / aspect);

  // Load source whenever it changes / modal opens
  useEffect(() => {
    if (!open || !source) {
      setImageSrc(null);
      setImgEl(null);
      return;
    }
    let url: string | null = null;
    let revoke = false;
    if (typeof source === 'string') {
      url = source;
    } else {
      url = URL.createObjectURL(source);
      revoke = true;
    }
    setImageSrc(url);
    return () => {
      if (revoke && url) URL.revokeObjectURL(url);
    };
  }, [open, source]);

  // When the image element is loaded, compute initial fit so the image
  // covers the entire crop frame.
  const handleImageLoad = useCallback(
    (img: HTMLImageElement) => {
      setImgEl(img);
      const naturalW = img.naturalWidth;
      const naturalH = img.naturalHeight;
      const fitScale = Math.max(frameWidth / naturalW, frameHeight / naturalH);
      setMinScale(fitScale);
      setScale(fitScale);
      // Center the image
      setOffset({
        x: (frameWidth - naturalW * fitScale) / 2,
        y: (frameHeight - naturalH * fitScale) / 2,
      });
    },
    [frameWidth, frameHeight],
  );

  // Reset when source changes
  useEffect(() => {
    if (!open) {
      setScale(1);
      setOffset({ x: 0, y: 0 });
    }
  }, [open]);

  /**
   * Clamp the offset so the image always covers the crop frame.
   * (No transparent edges.)
   */
  const clampOffset = useCallback(
    (offX: number, offY: number, currentScale: number) => {
      if (!imgEl) return { x: offX, y: offY };
      const drawnW = imgEl.naturalWidth * currentScale;
      const drawnH = imgEl.naturalHeight * currentScale;
      const minX = Math.min(0, frameWidth - drawnW);
      const maxX = Math.max(0, frameWidth - drawnW);
      const minY = Math.min(0, frameHeight - drawnH);
      const maxY = Math.max(0, frameHeight - drawnH);
      return {
        x: Math.min(maxX, Math.max(minX, offX)),
        y: Math.min(maxY, Math.max(minY, offY)),
      };
    },
    [imgEl, frameWidth, frameHeight],
  );

  const onPointerDown = (clientX: number, clientY: number) => {
    dragStateRef.current = {
      x: clientX,
      y: clientY,
      offX: offset.x,
      offY: offset.y,
    };
  };

  const onPointerMove = (clientX: number, clientY: number) => {
    const drag = dragStateRef.current;
    if (!drag) return;
    const next = clampOffset(
      drag.offX + (clientX - drag.x),
      drag.offY + (clientY - drag.y),
      scale,
    );
    setOffset(next);
  };

  const onPointerUp = () => {
    dragStateRef.current = null;
  };

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    onPointerDown(e.clientX, e.clientY);
  };
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!dragStateRef.current) return;
    onPointerMove(e.clientX, e.clientY);
  };
  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 0) return;
    onPointerDown(e.touches[0].clientX, e.touches[0].clientY);
  };
  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 0) return;
    onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    if (!imgEl) return;
    e.preventDefault();
    const delta = -e.deltaY * 0.0015;
    const newScale = Math.min(minScale * 4, Math.max(minScale, scale + delta));
    applyScale(newScale, e.clientX, e.clientY);
  };

  const applyScale = (newScale: number, anchorClientX?: number, anchorClientY?: number) => {
    if (!imgEl || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    // Default anchor = center of frame
    const ax = anchorClientX != null ? anchorClientX - rect.left : frameWidth / 2;
    const ay = anchorClientY != null ? anchorClientY - rect.top : frameHeight / 2;
    // The point on the source image under the anchor before scaling
    const imgX = (ax - offset.x) / scale;
    const imgY = (ay - offset.y) / scale;
    // Adjust offset so the same image point stays under the anchor
    const newOff = clampOffset(ax - imgX * newScale, ay - imgY * newScale, newScale);
    setScale(newScale);
    setOffset(newOff);
  };

  const handleSliderChange = (vals: number[]) => {
    const v = vals[0];
    // Map slider 0..100 to minScale..(minScale*4)
    const newScale = minScale + (v / 100) * (minScale * 3);
    applyScale(newScale);
  };

  const sliderValue = Math.max(
    0,
    Math.min(100, ((scale - minScale) / (minScale * 3 || 1)) * 100),
  );

  const reset = () => {
    if (!imgEl) return;
    handleImageLoad(imgEl);
  };

  const handleSave = async () => {
    if (!imgEl) return;
    setIsProcessing(true);
    try {
      // Determine output canvas size
      const targetSize =
        outputSize ?? (shape === 'round' ? 512 : Math.max(512, frameWidth * 2));
      const targetW = targetSize;
      const targetH = Math.round(targetSize / aspect);

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not create canvas context');

      // Map crop-frame coordinates to natural image coordinates
      const sx = -offset.x / scale;
      const sy = -offset.y / scale;
      const sWidth = frameWidth / scale;
      const sHeight = frameHeight / scale;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(imgEl, sx, sy, sWidth, sHeight, 0, 0, targetW, targetH);

      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))),
          'image/jpeg',
          0.92,
        );
      });

      const file = new File([blob], outputFileName, { type: 'image/jpeg' });
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      onCropComplete(file, dataUrl);
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to crop image:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Drag to reposition. Use the slider or scroll to zoom.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          {/* Crop area */}
          <div
            ref={containerRef}
            className="relative bg-muted overflow-hidden cursor-grab active:cursor-grabbing select-none touch-none"
            style={{
              width: frameWidth + PADDING * 2,
              height: frameHeight + PADDING * 2,
              padding: PADDING,
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={onPointerUp}
            onMouseLeave={onPointerUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={onPointerUp}
            onWheel={handleWheel}
          >
            {/* Image layer */}
            {imageSrc && (
              <div
                className="absolute"
                style={{ left: PADDING, top: PADDING, width: frameWidth, height: frameHeight }}
              >
                <img
                  src={imageSrc}
                  alt="crop source"
                  draggable={false}
                  onLoad={(e) => handleImageLoad(e.currentTarget)}
                  style={{
                    position: 'absolute',
                    left: offset.x,
                    top: offset.y,
                    width: imgEl ? imgEl.naturalWidth * scale : 'auto',
                    height: imgEl ? imgEl.naturalHeight * scale : 'auto',
                    maxWidth: 'none',
                    maxHeight: 'none',
                    pointerEvents: 'none',
                    userSelect: 'none',
                  }}
                />
              </div>
            )}

            {/* Crop frame overlay */}
            <div
              className="absolute pointer-events-none"
              style={{
                left: PADDING,
                top: PADDING,
                width: frameWidth,
                height: frameHeight,
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
                borderRadius: shape === 'round' ? '9999px' : '12px',
                border: '2px solid rgba(255,255,255,0.85)',
              }}
            />
          </div>

          {/* Zoom controls */}
          <div className="w-full flex items-center gap-3 px-2">
            <ZoomOut className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Slider
              value={[sliderValue]}
              onValueChange={handleSliderChange}
              min={0}
              max={100}
              step={1}
              className="flex-1"
            />
            <ZoomIn className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </div>

          {/* Buttons */}
          <div className="w-full flex gap-2 pt-1">
            <Button type="button" variant="outline" onClick={reset} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="ml-auto"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!imgEl || isProcessing}
              className="gap-2 bg-gradient-primary"
            >
              <Check className="h-4 w-4" />
              {isProcessing ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
