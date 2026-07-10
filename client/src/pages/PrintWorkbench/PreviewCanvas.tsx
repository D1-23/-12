import { useMemo, useRef, useImperativeHandle, forwardRef, useCallback, useState } from 'react';
import type { MarginOption, FontSizeOption, PageMargins, SignatureArea, HeaderFooterConfig } from '@/types/template';
import { FONT_SIZES, mmToPx, replaceTemplateVars } from '@/types/template';
import { formatFieldValue, formatPrintTime, LABEL_WIDTH } from './field-utils';
import { buildMergedRows, type MergedRow } from './layout-engine';
import SignatureLayer from './SignatureLayer';

export interface PreviewCanvasHandle {
  getContent: () => string;
  getPageElements: () => HTMLElement[];
}

interface PreviewCanvasProps {
  records: Array<Record<string, unknown>>;
  enabledFields: string[];
  margin: MarginOption;
  fontSize: FontSizeOption;
  titleField: string;
  pageWidth: number;
  pageHeight: number;
  margins: PageMargins;
  fieldTypes: Record<string, number>;
  tableName: string;
  signatureAreas: SignatureArea[];
  showSignature: boolean;
  signatureData: Record<string, string>;
  signatureEditMode: boolean;
  showHeader: boolean;
  showFooter: boolean;
  header?: HeaderFooterConfig;
  footer?: HeaderFooterConfig;
  onSign: (recordIdx: number, areaId: string) => void;
  onMoveSig: (areaId: string, xMm: number, yMm: number) => void;
}

const PreviewCanvas = forwardRef<PreviewCanvasHandle, PreviewCanvasProps>(
  (
    {
      records,
      enabledFields,
      fontSize,
      titleField,
      pageWidth,
      pageHeight,
      margins,
      fieldTypes,
      tableName,
      signatureAreas,
      showSignature,
      signatureData,
      signatureEditMode,
      showHeader,
      showFooter,
      header,
      footer,
      onSign,
      onMoveSig,
    },
    ref,
  ) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const dragState = useRef<{ startX: number; startY: number; scrollLeft: number; scrollTop: number } | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      const el = scrollRef.current;
      if (!el) return;
      if ((e.target as HTMLElement).closest('button, a, [role="button"], [data-sig-layer]')) return;
      dragState.current = {
        startX: e.pageX,
        startY: e.pageY,
        scrollLeft: el.scrollLeft,
        scrollTop: el.scrollTop,
      };
      setIsDragging(true);
    }, []);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      if (!dragState.current) return;
      const el = scrollRef.current;
      if (!el) return;
      const dx = e.pageX - dragState.current.startX;
      const dy = e.pageY - dragState.current.startY;
      el.scrollLeft = dragState.current.scrollLeft - dx;
      el.scrollTop = dragState.current.scrollTop - dy;
    }, []);

    const handleStopDrag = useCallback(() => {
      dragState.current = null;
      setIsDragging(false);
    }, []);

    useImperativeHandle(ref, () => ({
      getContent: () => {
        const node = contentRef.current;
        if (!node) return '';
        const clone = node.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('[data-sig-empty], [data-sig-outside]').forEach((el) => el.remove());
        return clone.innerHTML;
      },
      getPageElements: () => {
        const container = contentRef.current;
        if (!container) return [];
        return Array.from(container.querySelectorAll('.print-page'));
      },
    }));

    const pageWidthPx = Math.round(mmToPx(pageWidth));
    const pageHeightPx = Math.round(mmToPx(pageHeight));
    const marginsPx = useMemo<PageMargins>(
      () => ({
        top: Math.round(mmToPx(margins.top)),
        right: Math.round(mmToPx(margins.right)),
        bottom: Math.round(mmToPx(margins.bottom)),
        left: Math.round(mmToPx(margins.left)),
      }),
      [margins],
    );

    const fs = FONT_SIZES[fontSize];
    const scaledWidth = pageWidthPx * 0.39;
    const contentWidthMm = pageWidth - margins.left - margins.right;

    const recordMergedRows = useMemo<MergedRow[][]>(() => {
      return records.map((record) =>
        buildMergedRows({
          fields: enabledFields,
          record,
          fieldTypes,
          contentWidthMm,
          fontSize: fs,
        }),
      );
    }, [records, enabledFields, fieldTypes, contentWidthMm, fs]);

    const labelTdStyle: React.CSSProperties = {
      width: LABEL_WIDTH,
      background: '#FFFFFF',
      border: '1px solid #333333',
      padding: '3px 6px',
      fontSize: fs,
      fontWeight: 600,
      color: '#000000',
      lineHeight: `${Math.round(fs * 1.4)}px`,
      textAlign: 'left',
      verticalAlign: 'top',
      wordBreak: 'break-all',
      overflowWrap: 'break-word',
    };

    const valueTdStyle: React.CSSProperties = {
      background: '#FFFFFF',
      border: '1px solid #333333',
      padding: '3px 6px',
      fontSize: fs,
      color: '#1F2329',
      lineHeight: `${Math.round(fs * 1.4)}px`,
      textAlign: 'left',
      verticalAlign: 'top',
      wordBreak: 'break-word',
      overflowWrap: 'break-word',
    };

    const tableStyle: React.CSSProperties = {
      borderCollapse: 'collapse',
      width: '100%',
      tableLayout: 'fixed',
    };

    const renderMergedTable = (rows: MergedRow[]) => (
      <table style={tableStyle}>
        <colgroup>
          <col style={{ width: LABEL_WIDTH }} />
          <col style={{ width: 'auto' }} />
          <col style={{ width: LABEL_WIDTH }} />
          <col style={{ width: 'auto' }} />
        </colgroup>
        <tbody>
          {rows.map((row, idx) => {
            if (row.type === 'paired') {
              return (
                <tr key={`row-${idx}`} className="field-row">
                  <td style={labelTdStyle}>{row.left?.field ?? ''}</td>
                  <td style={valueTdStyle}>{row.left?.value ?? ''}</td>
                  <td style={labelTdStyle}>{row.right?.field ?? ''}</td>
                  <td style={valueTdStyle}>{row.right?.value ?? ''}</td>
                </tr>
              );
            }
            return (
              <tr key={`row-${idx}`} className="field-row">
                <td style={labelTdStyle}>{row.unit!.field}</td>
                <td style={valueTdStyle} colSpan={3}>{row.unit!.value}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );

    const renderRecord = (rows: MergedRow[], recordIdx: number) => {
      const record = records[recordIdx];
      const title = titleField
        ? (formatFieldValue(record[titleField]) || '未命名记录')
        : null;

      const printTime = formatPrintTime();
      const totalRecords = records.length;

      return (
        <div
          key={recordIdx}
          className="print-page bg-card rounded-md shadow-sm overflow-hidden"
          style={{
            width: pageWidthPx,
            height: pageHeightPx,
            boxSizing: 'border-box',
            paddingTop: marginsPx.top,
            paddingRight: marginsPx.right,
            paddingBottom: marginsPx.bottom,
            paddingLeft: marginsPx.left,
            fontSize: fs,
            marginBottom: 30,
            position: 'relative',
          }}
          >
            {showHeader && header?.text && (
              <div
                style={{
                  position: 'absolute',
                  top: Math.round(marginsPx.top * 0.35),
                  left: marginsPx.left,
                  right: marginsPx.right,
                  fontSize: header.fontSize,
                  textAlign: header.alignment,
                  color: '#86909C',
                  lineHeight: '14px',
                }}
              >
                {replaceTemplateVars(header.text, recordIdx + 1, totalRecords, tableName, printTime)}
              </div>
            )}
            {title && (
            <div
              style={{
              fontSize: fs + 1,
              fontWeight: 700,
              lineHeight: `${Math.round((fs + 1) * 1.4)}px`,
                color: '#1F2329',
                textAlign: 'left',
                paddingBottom: 4,
                marginBottom: 2,
                borderBottom: '1px solid #e5e5e5',
              }}
            >
              {title}
            </div>
          )}

          {renderMergedTable(rows)}

          {showSignature && signatureAreas.length > 0 && (
            <SignatureLayer
              areas={signatureAreas}
              signatureData={signatureData}
              recordIdx={recordIdx}
              pageWidthMm={pageWidth}
              pageHeightMm={pageHeight}
              zoom={0.39}
              editMode={signatureEditMode}
              onSign={onSign}
              onMove={onMoveSig}
            />
          )}

          <div
            style={{
              marginTop: 4,
              paddingTop: 4,
              borderTop: '1px solid #E5E6EB',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              fontSize: 11,
              lineHeight: '14px',
              color: '#86909C',
            }}
          >
            <div>
              {tableName && <div>Table Name: {tableName}</div>}
              <div>Print Time: {printTime}</div>
            </div>
            <span>
              第 {recordIdx + 1} / {totalRecords} 条
            </span>
          </div>
          {showFooter && footer?.text && (
            <div
              style={{
                position: 'absolute',
                bottom: Math.round(marginsPx.bottom * 0.35),
                left: marginsPx.left,
                right: marginsPx.right,
                fontSize: footer.fontSize,
                textAlign: footer.alignment,
                color: '#86909C',
                lineHeight: '14px',
              }}
            >
              {replaceTemplateVars(footer.text, recordIdx + 1, totalRecords, tableName, printTime)}
            </div>
          )}
        </div>
      );
    };

    return (
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto bg-background py-3 select-none"
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleStopDrag}
        onMouseLeave={handleStopDrag}
      >
        <div style={{ width: scaledWidth, margin: '0 auto' }}>
          <div
            ref={contentRef}
            id="preview-content"
            style={{
              width: pageWidthPx,
              zoom: 0.39,
            }}
          >
            {recordMergedRows.map((rows, idx) => renderRecord(rows, idx))}
          </div>
        </div>
      </div>
    );
  },
);

PreviewCanvas.displayName = 'PreviewCanvas';

export default PreviewCanvas;
