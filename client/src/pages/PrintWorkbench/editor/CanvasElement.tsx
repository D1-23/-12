import { useRef, useCallback } from 'react';
import type { PrintElement } from '@/types/template';
import { mmToPx, pxToMm } from '@/types/template';
import TextRenderer from '../elements/TextRenderer';
import TableRenderer from '../elements/TableRenderer';
import ImageRenderer from '../elements/ImageRenderer';
import QrCodeRenderer from '../elements/QrCodeRenderer';
import BarcodeRenderer from '../elements/BarcodeRenderer';
import LineRenderer from '../elements/LineRenderer';
import AutoTableRenderer from '../elements/AutoTableRenderer';

interface CanvasElementProps {
  element: PrintElement;
  zoom: number;
  selected: boolean;
  editMode: boolean;
  record?: Record<string, unknown>;
  fieldTypes?: Record<string, number>;
  availableFields?: string[];
  onSelect: () => void;
  onChange: (element: PrintElement) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  pageWidthMm: number;
  pageHeightMm: number;
}

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const HANDLES: ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

const HANDLE_POSITIONS: Record<ResizeHandle, string> = {
  nw: 'left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize',
  n: 'left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize',
  ne: 'right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize',
  e: 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-ew-resize',
  se: 'right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize',
  s: 'left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-ns-resize',
  sw: 'left-0 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize',
  w: 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize',
};

const MIN_SIZE_MM = 10;

const CanvasElement = ({
  element,
  zoom,
  selected,
  editMode,
  record,
  fieldTypes,
  availableFields,
  onSelect,
  onChange,
  onDelete,
  onDuplicate,
  pageWidthMm,
  pageHeightMm,
}: CanvasElementProps) => {
  const dragStateRef = useRef<{
    type: 'move' | ResizeHandle;
    startClientX: number;
    startClientY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
  } | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, type: 'move' | ResizeHandle) => {
      e.stopPropagation();
      e.preventDefault();
      onSelect();

      dragStateRef.current = {
        type,
        startClientX: e.clientX,
        startClientY: e.clientY,
        origX: element.x,
        origY: element.y,
        origW: element.width,
        origH: element.height,
      };

      const handleMouseMove = (ev: MouseEvent) => {
        const ds = dragStateRef.current;
        if (!ds) return;

        const dxMm = pxToMm((ev.clientX - ds.startClientX) / zoom);
        const dyMm = pxToMm((ev.clientY - ds.startClientY) / zoom);

        if (ds.type === 'move') {
          let newX = ds.origX + dxMm;
          let newY = ds.origY + dyMm;
          newX = Math.max(-ds.origW + MIN_SIZE_MM, Math.min(newX, pageWidthMm - MIN_SIZE_MM));
          newY = Math.max(-ds.origH + MIN_SIZE_MM, Math.min(newY, pageHeightMm - MIN_SIZE_MM));
          onChange({ ...element, x: newX, y: newY });
        } else {
          let { origX: nx, origY: ny, origW: nw, origH: nh } = ds;
          const handle = ds.type;

          if (handle.includes('w')) {
            const newW = Math.max(MIN_SIZE_MM, nw - dxMm);
            nx = ds.origX + (nw - newW);
            nw = newW;
          }
          if (handle.includes('e')) {
            nw = Math.max(MIN_SIZE_MM, nw + dxMm);
          }
          if (handle.includes('n')) {
            const newH = Math.max(MIN_SIZE_MM, nh - dyMm);
            ny = ds.origY + (nh - newH);
            nh = newH;
          }
          if (handle.includes('s')) {
            nh = Math.max(MIN_SIZE_MM, nh + dyMm);
          }

          if (element.type === 'qrcode') {
            const maxDim = Math.max(nw, nh);
            nw = maxDim;
            nh = maxDim;
          }

          onChange({ ...element, x: nx, y: ny, width: nw, height: nh });
        }
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        dragStateRef.current = null;
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [element, zoom, onChange, onSelect, pageWidthMm, pageHeightMm],
  );

  const renderElementContent = () => {
    switch (element.type) {
      case 'text':
        return (
          <TextRenderer
            element={element}
            zoom={zoom}
            record={record}
            fieldTypes={fieldTypes}
            editMode={editMode}
            onContentChange={(content) => onChange({ ...element, content })}
          />
        );
      case 'table':
        return (
          <TableRenderer
            element={element}
            zoom={zoom}
            record={record}
            fieldTypes={fieldTypes}
            editMode={editMode}
            onChange={(el) => onChange(el)}
          />
        );
      case 'image':
        return (
          <ImageRenderer
            element={element}
            zoom={zoom}
            editMode={editMode}
            onUpload={(src) => onChange({ ...element, src })}
          />
        );
      case 'qrcode':
        return (
          <QrCodeRenderer
            element={element}
            zoom={zoom}
            record={record}
            fieldTypes={fieldTypes}
            editMode={editMode}
          />
        );
      case 'barcode':
        return (
          <BarcodeRenderer
            element={element}
            zoom={zoom}
            record={record}
            fieldTypes={fieldTypes}
            editMode={editMode}
          />
        );
      case 'line':
        return <LineRenderer element={element} zoom={zoom} />;
      case 'auto-table':
        return (
          <AutoTableRenderer
            element={element}
            zoom={zoom}
            record={record}
            fieldTypes={fieldTypes}
            editMode={editMode}
            availableFields={availableFields}
            onFieldToggle={(fieldId) => {
              const ids = element.selectedFieldIds.includes(fieldId)
                ? element.selectedFieldIds.filter((id) => id !== fieldId)
                : [...element.selectedFieldIds, fieldId];
              onChange({ ...element, selectedFieldIds: ids });
            }}
          />
        );
      default:
        return null;
    }
  };

  const leftPx = mmToPx(element.x) * zoom;
  const topPx = mmToPx(element.y) * zoom;
  const widthPx = mmToPx(element.width) * zoom;
  const heightPx = mmToPx(element.height) * zoom;

  return (
    <div
      onMouseDown={(e) => handleMouseDown(e, 'move')}
      style={{
        position: 'absolute',
        left: leftPx,
        top: topPx,
        width: widthPx,
        height: element.type === 'line' ? undefined : heightPx,
        cursor: editMode ? 'move' : 'default',
        zIndex: selected ? 20 : 10,
      }}
      className="group"
    >
      {renderElementContent()}

      {selected && editMode && (
        <>
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ border: '1.5px solid #3b82f6', borderRadius: 2 }}
          />
          {HANDLES.map((handle) => (
            <div
              key={handle}
              onMouseDown={(e) => handleMouseDown(e, handle)}
              className={`absolute size-2.5 bg-white border border-blue-500 rounded-sm ${HANDLE_POSITIONS[handle]} z-30`}
            />
          ))}
          <div className="absolute -top-7 right-0 flex items-center gap-0.5 z-30">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              className="size-5 flex items-center justify-center bg-card border border-border rounded shadow-sm hover:bg-accent text-muted-foreground"
              title="复制"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="size-5 flex items-center justify-center bg-card border border-border rounded shadow-sm hover:bg-red-50 hover:text-red-500 text-muted-foreground"
              title="删除"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default CanvasElement;
