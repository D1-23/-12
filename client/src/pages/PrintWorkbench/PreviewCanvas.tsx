import { useMemo, useRef, useImperativeHandle, forwardRef } from 'react';
import type { TemplateType, MarginOption, FontSizeOption, PageMargins } from '@/types/template';
import { FONT_SIZES, mmToPx } from '@/types/template';
import { formatFieldValue, formatPrintTime, LABEL_WIDTH } from './field-utils';
import { buildMergedRows, type MergedRow } from './layout-engine';

export interface PreviewCanvasHandle {
  getContent: () => string;
  getPageElements: () => HTMLElement[];
}

interface PreviewCanvasProps {
  records: Array<Record<string, unknown>>;
  enabledFields: string[];
  margin: MarginOption;
  fontSize: FontSizeOption;
  mode: TemplateType;
  titleField: string;
  pageWidth: number;
  pageHeight: number;
  margins: PageMargins;
  fieldTypes: Record<string, number>;
  tableName: string;
}

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '...';
}

const PreviewCanvas = forwardRef<PreviewCanvasHandle, PreviewCanvasProps>(
  (
    {
      records,
      enabledFields,
      fontSize,
      mode,
      titleField,
      pageWidth,
      margins,
      fieldTypes,
      tableName,
    },
    ref,
  ) => {
    const contentRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
      getContent: () => contentRef.current?.innerHTML ?? '',
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
      if (mode !== 'record') return [];
      return records.map((record) =>
        buildMergedRows({
          fields: enabledFields,
          record,
          fieldTypes,
          contentWidthMm,
          fontSize: fs,
        }),
      );
    }, [mode, records, enabledFields, fieldTypes, contentWidthMm, fs]);

    const labelTdStyle: React.CSSProperties = {
      width: LABEL_WIDTH,
      background: '#F7F8FA',
      border: '1px solid #E5E6EB',
      padding: '3px 6px',
      fontSize: 11,
      color: '#1F2329',
      lineHeight: '16px',
      textAlign: 'left',
      verticalAlign: 'top',
      wordBreak: 'break-all',
      overflowWrap: 'break-word',
    };

    const valueTdStyle: React.CSSProperties = {
      background: '#FFFFFF',
      border: '1px solid #E5E6EB',
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
      const title =
        formatFieldValue(record[titleField]) ||
        formatFieldValue(record['标题']) ||
        formatFieldValue(record['客户名称']) ||
        formatFieldValue(record['零件代码']) ||
        '未命名记录';

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
          }}
        >
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

          {renderMergedTable(rows)}

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

    const renderView = () => {
      const contentW = pageWidthPx - marginsPx.left - marginsPx.right;
      const maxCellChars = Math.floor(
        (contentW - enabledFields.length * 8) / (enabledFields.length * fs * 0.55),
      );
      const colWidth = contentW / enabledFields.length;

      const thStyle: React.CSSProperties = {
        textAlign: 'left',
        fontWeight: 600,
        padding: '6px 4px',
        borderBottom: '2px solid rgba(31,35,41,0.2)',
        color: '#86909C',
        whiteSpace: 'nowrap',
        maxWidth: `${colWidth}px`,
        fontSize: fs - 1,
      };

      const tdStyle: React.CSSProperties = {
        padding: '4px 4px',
        borderBottom: '1px solid rgba(229,230,235,0.4)',
        color: '#1F2329',
        maxWidth: `${colWidth}px`,
        fontSize: fs - 1,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      };

      return (
        <div
          className="print-page bg-card rounded-md shadow-sm overflow-hidden"
          style={{
            width: pageWidthPx,
            paddingTop: marginsPx.top,
            paddingRight: marginsPx.right,
            paddingBottom: marginsPx.bottom,
            paddingLeft: marginsPx.left,
            fontSize: fs,
            marginBottom: 30,
          }}
        >
          <table style={{ ...tableStyle, fontSize: fs - 1 }}>
            <thead>
              <tr>
                {enabledFields.map((field) => (
                  <th key={field} style={thStyle}>
                    {field}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((record, rowIdx) => (
                <tr
                  key={rowIdx}
                  style={rowIdx % 2 === 0 ? { background: 'rgba(240,244,248,0.5)' } : undefined}
                >
                  {enabledFields.map((field) => (
                    <td
                      key={field}
                      style={tdStyle}
                      title={formatFieldValue(record[field])}
                    >
                      {truncateText(
                        formatFieldValue(record[field]),
                        Math.max(maxCellChars, 8),
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
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
            {mode === 'record'
              ? recordMergedRows.map((rows, idx) => renderRecord(rows, idx))
              : renderView()}
          </div>
        </div>
      </div>
    );
  },
);

PreviewCanvas.displayName = 'PreviewCanvas';

export default PreviewCanvas;
