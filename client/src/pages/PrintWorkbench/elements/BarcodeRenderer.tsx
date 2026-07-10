import { useRef, useEffect } from 'react';
import JsBarcode from 'jsbarcode';
import type { BarcodeElement } from '@/types/template';
import { mmToPx } from '@/types/template';
import { replaceVariables } from '../shared/variable-utils';

interface BarcodeRendererProps {
  element: BarcodeElement;
  zoom: number;
  record?: Record<string, unknown>;
  fieldTypes?: Record<string, number>;
  editMode: boolean;
}

const BarcodeRenderer = ({
  element,
  zoom,
  record,
  fieldTypes,
  editMode,
}: BarcodeRendererProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const content = editMode
    ? element.content
    : replaceVariables(element.content, record, fieldTypes);

  useEffect(() => {
    if (!canvasRef.current || !content) return;
    try {
      JsBarcode(canvasRef.current, content, {
        format: element.format,
        width: Math.max(1, 1.5 * zoom),
        height: mmToPx(element.height) * zoom * 0.6,
        margin: 0,
        fontSize: 10 * zoom,
        displayValue: true,
      });
    } catch {
      // invalid barcode content
    }
  }, [content, element.format, element.height, zoom]);

  const widthPx = mmToPx(element.width) * zoom;
  const heightPx = mmToPx(element.height) * zoom;

  return (
    <div
      style={{
        width: widthPx,
        height: heightPx,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {content ? (
        <canvas ref={canvasRef} />
      ) : (
        <span className="text-[10px] text-muted-foreground">请输入内容</span>
      )}
    </div>
  );
};

export default BarcodeRenderer;
