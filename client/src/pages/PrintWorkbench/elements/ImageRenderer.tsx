import { useRef } from 'react';
import type { ImageElement } from '@/types/template';
import { mmToPx } from '@/types/template';

interface ImageRendererProps {
  element: ImageElement;
  zoom: number;
  editMode: boolean;
  onUpload?: (dataUrl: string) => void;
}

const ImageRenderer = ({
  element,
  zoom,
  editMode,
  onUpload,
}: ImageRendererProps) => {
  const fileRef = useRef<HTMLInputElement>(null);

  const widthPx = mmToPx(element.width) * zoom;
  const heightPx = mmToPx(element.height) * zoom;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onUpload?.(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  if (!element.src) {
    return (
      <div
        onClick={() => editMode && fileRef.current?.click()}
        style={{ width: widthPx, height: heightPx }}
        className="flex items-center justify-center border border-dashed border-border rounded bg-muted/30 cursor-pointer text-muted-foreground"
      >
        <span className="text-[10px]">点击上传图片</span>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
      </div>
    );
  }

  return (
    <div style={{ width: widthPx, height: heightPx, overflow: 'hidden' }}>
      <img
        src={element.src}
        alt=""
        style={{
          width: '100%',
          height: '100%',
          objectFit: element.fit,
        }}
      />
    </div>
  );
};

export default ImageRenderer;
