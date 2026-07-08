import { useMemo, useRef, useImperativeHandle, forwardRef } from 'react';
import type { MarginOption, FontSizeOption, PageMargins, SignatureArea } from '@/types/template';
import { FONT_SIZES, mmToPx } from '@/types/template';
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
  signatureData: Record<string, string>;
  signatureEditMode: boolean;
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
      signatureData,
      signatureEditMode,
      onSign,
      onMoveSig,
    },
    ref,
  ) => {
    const contentRef = useRef<HTMLDivElement>(null);

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
      fontSize: 11,
      fontWeight: 600,
      color: '#000000',
      lineHeight: '16px',
      textAlign: 'left',
      verticalAlign: 'top',
      wordBreak: 'break-all',
      overflowWrap: 'break-word',
    };

    const valueTdStyle: React.CSSProperties = {
      background: '#FFFFFF',
      border: '1px solid #333333',
      padding: '3px 6px',
      fontSize: 11,
      color: '#1F2329',
      lineHeight: '16px',
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
            paddingTop: marginsPx.top,
            paddingRight: marginsPx.right,
            paddingBottom: marginsPx.bottom,
            paddingLeft: marginsPx.left,
            fontSize: fs,
            marginBottom: 30,
            position: 'relative',
          }}
        >
          {title && (
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                lineHeight: '18px',
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

          {signatureAreas.length > 0 && (
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
        </div>
      );
    };

    return (
      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-background py-3">
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
