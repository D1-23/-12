import { useCallback, useRef } from 'react';
import type { SignatureArea } from '@/types/template';
import { mmToPx } from '@/types/template';

interface SignatureLayerProps {
  areas: SignatureArea[];
  signatureData: Record<string, string>;
  recordIdx: number;
  pageWidthMm: number;
  pageHeightMm: number;
  zoom: number;
  editMode: boolean;
  onSign: (recordIdx: number, areaId: string) => void;
  onMove: (areaId: string, xMm: number, yMm: number) => void;
}

const DRAG_THRESHOLD = 5;
const pxToMm = (px: number) => px / 3.779527559;

const SignatureLayer = ({
  areas,
  signatureData,
  recordIdx,
  pageWidthMm,
  pageHeightMm,
  zoom,
  editMode,
  onSign,
  onMove,
}: SignatureLayerProps) => {
  const dragStateRef = useRef<{
    areaId: string;
    startClientX: number;
    startClientY: number;
    origXMm: number;
    origYMm: number;
    hasMoved: boolean;
  } | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, area: SignatureArea) => {
      e.preventDefault();
      e.stopPropagation();
      dragStateRef.current = {
        areaId: area.id,
        startClientX: e.clientX,
        startClientY: e.clientY,
        origXMm: area.xMm,
        origYMm: area.yMm,
        hasMoved: false,
      };

      const handleMouseMove = (ev: MouseEvent) => {
        const ds = dragStateRef.current;
        if (!ds) return;
        const dxPx = (ev.clientX - ds.startClientX) / zoom;
        const dyPx = (ev.clientY - ds.startClientY) / zoom;

        if (Math.abs(ev.clientX - ds.startClientX) > DRAG_THRESHOLD ||
            Math.abs(ev.clientY - ds.startClientY) > DRAG_THRESHOLD) {
          ds.hasMoved = true;
        }

        let newX = ds.origXMm + pxToMm(dxPx);
        let newY = ds.origYMm + pxToMm(dyPx);

        newX = Math.max(-area.widthMm + 10, Math.min(newX, pageWidthMm - 10));
        newY = Math.max(-area.heightMm + 10, Math.min(newY, pageHeightMm - 10));

        onMove(ds.areaId, newX, newY);
      };

      const handleMouseUp = (ev: MouseEvent) => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        const ds = dragStateRef.current;
        dragStateRef.current = null;
        if (ds && !ds.hasMoved) {
          onSign(recordIdx, ds.areaId);
        }
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [zoom, pageWidthMm, pageHeightMm, onMove, onSign, recordIdx],
  );

  if (areas.length === 0) return null;

  return (
    <>
      {areas.map((area) => {
        const key = `${recordIdx}_${area.id}`;
        const dataUrl = signatureData[key];
        const widthPx = Math.round(mmToPx(area.widthMm));
        const heightPx = Math.round(mmToPx(area.heightMm));
        const leftPx = Math.round(mmToPx(area.xMm));
        const topPx = Math.round(mmToPx(area.yMm));
        const isEmpty = !dataUrl;
        const isOutside =
          area.xMm + area.widthMm < 0 || area.xMm > pageWidthMm ||
          area.yMm + area.heightMm < 0 || area.yMm > pageHeightMm;

        const placeholderStyle: React.CSSProperties = isEmpty
          ? {
              width: '100%',
              height: '100%',
              border: editMode
                ? '1px dashed #86909C'
                : '1px dashed #BFBFBF',
              borderRadius: 2,
              background: editMode
                ? 'rgba(0,0,0,0.05)'
                : 'rgba(0,0,0,0.03)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              color: '#86909C',
              pointerEvents: 'none',
            }
          : {};

        return (
          <div
            key={area.id}
            className={`signature-area ${editMode ? 'signature-area-edit' : ''}`}
            data-sig-empty={isEmpty ? '' : undefined}
            data-sig-outside={isOutside ? '' : undefined}
            style={{
              position: 'absolute',
              left: leftPx,
              top: topPx,
              width: widthPx,
              height: heightPx,
              cursor: editMode ? 'move' : 'pointer',
              zIndex: 10,
            }}
            onMouseDown={editMode ? (e) => handleMouseDown(e, area) : undefined}
            onClick={!editMode && isEmpty ? () => onSign(recordIdx, area.id) : undefined}
          >
            {dataUrl ? (
              <img
                src={dataUrl}
                alt="signature"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  pointerEvents: 'none',
                }}
              />
            ) : (
              <div style={placeholderStyle}>
                {editMode && '点击签名'}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
};

export default SignatureLayer;
