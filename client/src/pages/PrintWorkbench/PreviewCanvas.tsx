import { useMemo, useRef, useImperativeHandle, forwardRef } from 'react';
import type { TemplateType, MarginOption, FontSizeOption, PageMargins, TableLayout, CellStyle } from '@/types/template';
import { MARGIN_VALUES, FONT_SIZES, mmToPx } from '@/types/template';

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
  tableLayout?: TableLayout;
}

const A4_WIDTH = 794;
const A4_HEIGHT = 1123;
const TITLE_HEIGHT = 36;
const FIELD_ROW_BASE = 28;
const FIELD_ROW_LINE = 18;

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined) return '';

  // 多维表格标准字段结构 { bizType: 'Text', value: [...] }
  if (typeof value === 'object' && value !== null && 'bizType' in value && 'value' in value) {
    const typed = value as { bizType: string; value: unknown };
    return formatFieldValue(typed.value);
  }

  // 纯文本对象 { text: 'xxx' }
  if (typeof value === 'object' && value !== null && 'text' in value) {
    return String((value as { text: unknown }).text ?? '');
  }

  // 单选 { id: string, text: string }
  if (typeof value === 'object' && value !== null && 'id' in value && 'text' in value) {
    return String((value as { text: unknown }).text ?? '');
  }

  // 用户/人员 { id: string, name: string, ... }
  if (typeof value === 'object' && value !== null && 'name' in value) {
    return String((value as { name: unknown }).name ?? '');
  }

  // 链接 { text: string, recordIds: string[], tableId: string }
  if (typeof value === 'object' && value !== null && 'recordIds' in value) {
    const link = value as { text?: unknown; recordIds?: string[] };
    if (link.recordIds && link.recordIds.length > 0) {
      return link.recordIds.join(', ');
    }
    return String(link.text ?? '');
  }

  // 数组处理（多选、多行文本段落等）
  if (Array.isArray(value)) {
    return value
      .map((item) => formatFieldValue(item))
      .filter(Boolean)
      .join(', ');
  }

  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? '是' : '否';

  // 最后兜底转字符串
  try {
    const str = String(value);
    if (str === '[object Object]') {
      return JSON.stringify(value);
    }
    return str;
  } catch {
    return '';
  }
}

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '...';
}

interface PageInfo {
  items: Array<{ record: Record<string, unknown>; startField?: number; endField?: number }>;
}

function calculateRecordPages(
  records: Array<Record<string, unknown>>,
  enabledFields: string[],
  margin: MarginOption,
  fontSize: FontSizeOption,
  pageHeightPx: number,
  marginsPx: PageMargins
): PageInfo[] {
  const fs = FONT_SIZES[fontSize];
  const contentHeight = pageHeightPx - marginsPx.top - marginsPx.bottom;
  const rowHeight = fs * 1.4 + 18;
  const maxRowsPerPage = Math.max(1, Math.floor(contentHeight / rowHeight));

  const pages: PageInfo[] = [];
  for (const record of records) {
    const totalFields = enabledFields.length;
    if (totalFields === 0) {
      pages.push({ items: [{ record, startField: 0, endField: 0 }] });
      continue;
    }
    let offset = 0;
    while (offset < totalFields) {
      const end = Math.min(offset + maxRowsPerPage, totalFields);
      pages.push({ items: [{ record, startField: offset, endField: end }] });
      offset = end;
    }
  }
  return pages;
}

function calculateViewPages(
  records: Array<Record<string, unknown>>,
  enabledFields: string[],
  _margin: MarginOption,
  fontSize: FontSizeOption,
  pageHeightPx: number,
  marginsPx: PageMargins
): PageInfo[] {
  const contentHeight = pageHeightPx - marginsPx.top - marginsPx.bottom;
  const fs = FONT_SIZES[fontSize];
  const headerHeight = 32;
  const rowHeight = fs * 1.8 + 8;
  const recordGap = 4;

  const pages: PageInfo[] = [];
  let currentItems: PageInfo['items'] = [];
  let usedHeight = headerHeight;

  for (const record of records) {
    const neededHeight = rowHeight + recordGap;
    if (usedHeight + neededHeight > contentHeight && currentItems.length > 0) {
      pages.push({ items: currentItems });
      currentItems = [];
      usedHeight = headerHeight;
    }
    currentItems.push({ record });
    usedHeight += neededHeight;
  }

  if (currentItems.length > 0) {
    pages.push({ items: currentItems });
  }

  return pages;
}

const PreviewCanvas = forwardRef<PreviewCanvasHandle, PreviewCanvasProps>(
  ({ records, enabledFields, margin, fontSize, mode, titleField, pageWidth, pageHeight, margins, tableLayout }, ref) => {
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
    const pageHeightPx = Math.round(mmToPx(pageHeight));
    const marginsPx = useMemo<PageMargins>(() => ({
      top: Math.round(mmToPx(margins.top)),
      right: Math.round(mmToPx(margins.right)),
      bottom: Math.round(mmToPx(margins.bottom)),
      left: Math.round(mmToPx(margins.left)),
    }), [margins]);

    const pages = useMemo(
      () =>
        mode === 'record'
          ? calculateRecordPages(records, enabledFields, margin, fontSize, pageHeightPx, marginsPx)
          : calculateViewPages(records, enabledFields, margin, fontSize, pageHeightPx, marginsPx),
      [records, enabledFields, margin, fontSize, mode, pageHeightPx, marginsPx]
    );

    const fs = FONT_SIZES[fontSize];
    const scaledWidth = pageWidthPx * 0.39;

    const renderRecordPage = (page: PageInfo, pageIdx: number) => {
      const item = page.items[0];
      if (!item) return null;
      const { record, startField = 0, endField = enabledFields.length } = item;
      const pageFields = enabledFields.slice(startField, endField);

      if (!tableLayout) {
        const labelStyle: React.CSSProperties = {
          border: '1px solid #d1d5db',
          padding: '6px 12px',
          verticalAlign: 'top',
          width: '28%',
          backgroundColor: '#f3f4f6',
          color: '#374151',
          fontWeight: 500,
          whiteSpace: 'nowrap',
        };
        const valueStyle: React.CSSProperties = {
          border: '1px solid #d1d5db',
          padding: '6px 12px',
          verticalAlign: 'top',
          color: '#111827',
          wordBreak: 'break-word',
        };
        return (
          <div key={pageIdx} className="print-page bg-card rounded-md shadow-sm overflow-hidden"
            style={{ width: pageWidthPx, minHeight: pageHeightPx, paddingTop: marginsPx.top, paddingRight: marginsPx.right, paddingBottom: marginsPx.bottom, paddingLeft: marginsPx.left, fontSize: fs, marginBottom: 30 }}>
            <table className="w-full" style={{ fontSize: fs, borderCollapse: 'collapse', border: '1px solid #d1d5db' }}>
              <tbody>
                {pageFields.map((field) => (
                  <tr key={field} style={{ breakInside: 'avoid-page' as React.CSSProperties['breakInside'], pageBreakInside: 'avoid' }}>
                    <td style={labelStyle}>{field}</td>
                    <td style={valueStyle}>{formatFieldValue(record[field]) || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="page-break-line border-t border-dashed border-gray-300 mt-4 pt-1">
              <span className="page-number text-[10px] text-muted-foreground">第 {pageIdx + 1} / {pages.length} 页</span>
            </div>
          </div>
        );
      }

      const layout = tableLayout;
      const borderStyle = layout.borders.show ? `1px solid ${layout.borders.color}` : 'none';

      if (layout.tableContent) {
        const occupied = new Map<string, boolean>();
        for (const mc of layout.mergedCells) {
          for (let r = 0; r < mc.rowSpan; r++) {
            for (let c = 0; c < mc.colSpan; c++) {
              if (r === 0 && c === 0) continue;
              occupied.set(`${mc.row + r}-${mc.col + c}`, true);
            }
          }
        }

        const headerRowCount = layout.headerRows;
        const footerRowCount = layout.footerRows;
        const totalRows = enabledFields.length;
        const bodyStart = headerRowCount;
        const bodyEnd = totalRows - footerRowCount;

        const renderCellForRow = (rowIdx: number, field: string, colIdx: number, isHeader: boolean) => {
          if (occupied.get(`${rowIdx}-${colIdx}`)) return null;
          const merge = layout.mergedCells.find((m) => m.row === rowIdx && m.col === colIdx);
          const cs: CellStyle = layout.cellStyles[`${rowIdx}-${colIdx}`] ?? {};
          const cellStyle: React.CSSProperties = {
            border: borderStyle,
            padding: '6px 12px',
            verticalAlign: 'top',
            wordBreak: 'break-word',
            backgroundColor: cs.bg ?? (isHeader ? '#f3f4f6' : undefined),
            color: cs.color ?? (isHeader ? '#374151' : '#111827'),
            textAlign: cs.align ?? 'left',
            fontWeight: cs.bold ? 'bold' : (isHeader ? 500 : 'normal'),
          };
          if (layout.colWidths[colIdx] && !merge?.colSpan) {
            cellStyle.width = `${layout.colWidths[colIdx]}%`;
          }
          const Tag = isHeader ? 'th' : 'td';
          const extraProps: Record<string, unknown> = {};
          if (merge?.rowSpan && merge.rowSpan > 1) extraProps.rowSpan = merge.rowSpan;
          if (merge?.colSpan && merge.colSpan > 1) extraProps.colSpan = merge.colSpan;
          return (
            <Tag key={`${rowIdx}-${colIdx}`} style={cellStyle} {...extraProps}>
              {isHeader ? field : (formatFieldValue(record[field]) || '-')}
            </Tag>
          );
        };

        const renderRow = (rowIdx: number, isHeader: boolean) => {
          const field = enabledFields[rowIdx] ?? '';
          return (
            <tr key={`r-${rowIdx}`} style={{ breakInside: 'avoid-page' as React.CSSProperties['breakInside'], pageBreakInside: 'avoid' }}>
              {renderCellForRow(rowIdx, field, 0, isHeader)}
            </tr>
          );
        };

        return (
          <div key={pageIdx} className="print-page bg-card rounded-md shadow-sm overflow-hidden"
            style={{ width: pageWidthPx, minHeight: pageHeightPx, paddingTop: marginsPx.top, paddingRight: marginsPx.right, paddingBottom: marginsPx.bottom, paddingLeft: marginsPx.left, fontSize: fs, marginBottom: 30 }}>
            <table className="w-full" style={{ fontSize: fs, borderCollapse: 'collapse', border: borderStyle }}>
              {headerRowCount > 0 && (
                <thead>
                  {Array.from({ length: headerRowCount }).map((_, ri) => renderRow(ri, true))}
                </thead>
              )}
              <tbody>
                {enabledFields.slice(bodyStart, bodyEnd).map((_, i) => renderRow(bodyStart + i, false))}
              </tbody>
              {footerRowCount > 0 && (
                <tfoot>
                  {Array.from({ length: footerRowCount }).map((_, ri) => renderRow(totalRows - footerRowCount + ri, true))}
                </tfoot>
              )}
            </table>
            <div className="page-break-line border-t border-dashed border-gray-300 mt-4 pt-1">
              <span className="page-number text-[10px] text-muted-foreground">第 {pageIdx + 1} / {pages.length} 页</span>
            </div>
          </div>
        );
      }

      const labelStyle: React.CSSProperties = {
        border: borderStyle,
        padding: '6px 12px',
        verticalAlign: 'top',
        width: '28%',
        backgroundColor: '#f3f4f6',
        color: '#374151',
        fontWeight: 500,
        whiteSpace: 'nowrap',
      };
      const valueStyle: React.CSSProperties = {
        border: borderStyle,
        padding: '6px 12px',
        verticalAlign: 'top',
        color: '#111827',
        wordBreak: 'break-word',
      };

      return (
        <div key={pageIdx} className="print-page bg-card rounded-md shadow-sm overflow-hidden"
          style={{ width: pageWidthPx, minHeight: pageHeightPx, paddingTop: marginsPx.top, paddingRight: marginsPx.right, paddingBottom: marginsPx.bottom, paddingLeft: marginsPx.left, fontSize: fs, marginBottom: 30 }}>
          <table className="w-full" style={{ fontSize: fs, borderCollapse: 'collapse', border: borderStyle }}>
            <tbody>
              {pageFields.map((field, ri) => {
                const cs: CellStyle = layout.cellStyles[`${ri}-0`] ?? {};
                const vs: CellStyle = layout.cellStyles[`${ri}-1`] ?? {};
                return (
                  <tr key={field} style={{ breakInside: 'avoid-page' as React.CSSProperties['breakInside'], pageBreakInside: 'avoid' }}>
                    <td style={{ ...labelStyle, backgroundColor: cs.bg ?? labelStyle.backgroundColor, color: cs.color ?? labelStyle.color }}>{field}</td>
                    <td style={{ ...valueStyle, backgroundColor: vs.bg, color: vs.color }}>{formatFieldValue(record[field]) || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="page-break-line border-t border-dashed border-gray-300 mt-4 pt-1">
            <span className="page-number text-[10px] text-muted-foreground">第 {pageIdx + 1} / {pages.length} 页</span>
          </div>
        </div>
      );
    };

    const renderViewPage = (page: PageInfo, pageIdx: number) => {
      const contentW = pageWidthPx - marginsPx.left - marginsPx.right;
      const maxCellChars = Math.floor((contentW - enabledFields.length * 8) / (enabledFields.length * fs * 0.55));

      return (
        <div
          key={pageIdx}
          className="print-page bg-card rounded-md shadow-sm overflow-hidden"
          style={{
            width: pageWidthPx,
            minHeight: pageHeightPx,
            paddingTop: marginsPx.top,
            paddingRight: marginsPx.right,
            paddingBottom: marginsPx.bottom,
            paddingLeft: marginsPx.left,
            fontSize: fs,
            marginBottom: 30,
          }}
        >
          <table className="w-full border-collapse" style={{ fontSize: fs - 1 }}>
            <thead>
              <tr>
                {enabledFields.map((field) => (
                  <th
                    key={field}
                    className="text-left font-semibold py-1.5 px-1 border-b-2 border-foreground/20 text-muted-foreground whitespace-nowrap"
                    style={{ maxWidth: `${contentW / enabledFields.length}px` }}
                  >
                    {field}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {page.items.map((item, rowIdx) => (
                <tr
                  key={rowIdx}
                  className={rowIdx % 2 === 0 ? 'bg-accent/30' : ''}
                >
                  {enabledFields.map((field) => (
                    <td
                      key={field}
                      className="py-1 px-1 border-b border-border/40 text-foreground"
                      style={{ maxWidth: `${contentW / enabledFields.length}px` }}
                      title={formatFieldValue(item.record[field])}
                    >
                      {truncateText(formatFieldValue(item.record[field]) || '-', Math.max(maxCellChars, 8))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="page-break-line border-t border-dashed border-gray-300 mt-4 pt-1">
            <span className="page-number text-[10px] text-muted-foreground">
              第 {pageIdx + 1} / {pages.length} 页
            </span>
          </div>
        </div>
      );
    };

    return (
      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-background py-3">
        <div
          style={{
            width: scaledWidth,
            height: pages.length * pageHeightPx * 0.39 + (pages.length - 1) * 12,
            margin: '0 auto',
          }}
        >
          <div
            ref={contentRef}
            id="preview-content"
            style={{
              width: pageWidthPx,
              transform: 'scale(0.39)',
              transformOrigin: 'top left',
            }}
          >
            {pages.map((page, idx) =>
              mode === 'record'
                ? renderRecordPage(page, idx)
                : renderViewPage(page, idx)
            )}
          </div>
        </div>
      </div>
    );
  }
);

PreviewCanvas.displayName = 'PreviewCanvas';

export default PreviewCanvas;
