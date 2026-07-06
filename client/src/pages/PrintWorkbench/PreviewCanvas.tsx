import { useMemo, useRef, useImperativeHandle, forwardRef } from 'react';
import type { TemplateType, MarginOption, FontSizeOption, PageMargins } from '@/types/template';
import { FONT_SIZES, mmToPx } from '@/types/template';
import { formatFieldValue, formatPrintTime, LABEL_WIDTH, COLUMN_GAP_PX } from './field-utils';
import { layoutRecordPages, type PageLayout, type FieldUnit } from './layout-engine';

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

interface ViewPageInfo {
  items: Array<{ record: Record<string, unknown> }>;
}

function calculateViewPages(
  records: Array<Record<string, unknown>>,
  enabledFields: string[],
  fontSize: FontSizeOption,
  pageHeightPx: number,
  marginsPx: PageMargins,
): ViewPageInfo[] {
  const contentHeight = pageHeightPx - marginsPx.top - marginsPx.bottom;
  const fs = FONT_SIZES[fontSize];
  const headerHeight = 32;
  const rowHeight = fs * 1.8 + 8;
  const recordGap = 4;

  const pages: ViewPageInfo[] = [];
  let currentItems: ViewPageInfo['items'] = [];
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
  (
    {
      records,
      enabledFields,
      fontSize,
      mode,
      titleField,
      pageWidth,
      pageHeight,
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
    const contentHeightPx = pageHeightPx - marginsPx.top - marginsPx.bottom;

    const recordPages = useMemo<PageLayout[]>(() => {
      if (mode !== 'record' || records.length === 0) return [];
      return layoutRecordPages({
        fields: enabledFields,
        record: records[0],
        fieldTypes,
        contentWidthMm,
        contentHeightPx,
        fontSize: fs,
      });
    }, [mode, records, enabledFields, fieldTypes, contentWidthMm, contentHeightPx, fs]);

    const viewPages = useMemo<ViewPageInfo[]>(() => {
      if (mode !== 'view') return [];
      return calculateViewPages(records, enabledFields, fontSize, pageHeightPx, marginsPx);
    }, [mode, records, enabledFields, fontSize, pageHeightPx, marginsPx]);

    const totalPages = mode === 'record' ? recordPages.length : viewPages.length;

    const renderFieldUnit = (unit: FieldUnit, isFirst: boolean) => {
      const isFullWidth = unit.level !== 'single';

      const rowStyle: React.CSSProperties = {
        display: 'flex',
        width: '100%',
        breakInside: 'avoid',
        pageBreakInside: 'avoid',
        overflow: 'hidden',
        marginTop: isFirst ? 0 : -1,
        columnSpan: isFullWidth ? 'all' : undefined,
      };

      const labelStyle: React.CSSProperties = {
        minWidth: LABEL_WIDTH,
        width: 'auto',
        flexShrink: 0,
        background: 'hsl(33, 22%, 90%)',
        border: '1px solid hsl(30, 8%, 88%)',
        borderRight: 'none',
        padding: '5px 8px',
        fontSize: 12,
        color: 'hsl(0, 0%, 10%)',
        lineHeight: '22px',
        textAlign: 'left',
      };

      const valueStyle: React.CSSProperties = {
        flex: 1,
        minWidth: 0,
        background: '#FFFFFF',
        border: '1px solid hsl(30, 8%, 88%)',
        padding: '5px 8px',
        fontSize: 12,
        color: 'hsl(0, 0%, 10%)',
        lineHeight: '22px',
        textAlign: 'left',
        wordBreak: 'break-word',
        overflowWrap: 'break-word',
      };

      return (
        <div key={unit.field} className="field-row" style={rowStyle}>
          <div style={labelStyle}>{unit.field}</div>
          <div style={valueStyle}>{unit.value}</div>
        </div>
      );
    };

    const renderRecordPage = (page: PageLayout, pageIdx: number) => {
      const record = records[0];
      const title =
        formatFieldValue(record[titleField]) ||
        formatFieldValue(record['标题']) ||
        formatFieldValue(record['客户名称']) ||
        formatFieldValue(record['零件代码']) ||
        '未命名记录';

      const printTime = formatPrintTime();

      return (
        <div
          key={pageIdx}
          className="print-page bg-card shadow-sm overflow-hidden"
          style={{
            width: pageWidthPx,
            minHeight: pageHeightPx,
            paddingTop: marginsPx.top,
            paddingRight: marginsPx.right,
            paddingBottom: marginsPx.bottom,
            paddingLeft: marginsPx.left,
            fontSize: fs,
            marginBottom: 30,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {page.isFirst && (
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: 'hsl(0, 0%, 10%)',
                textAlign: 'left',
                paddingBottom: 8,
                marginBottom: 12,
                borderBottom: '2px solid hsl(30, 8%, 88%)',
                flexShrink: 0,
              }}
            >
              {title}
            </div>
          )}

          <div style={{ flex: 1 }}>
            <div
              style={{
                columns: 2,
                columnGap: `${COLUMN_GAP_PX}px`,
                columnFill: 'balance',
              }}
            >
              {page.units.map((unit, idx) => renderFieldUnit(unit, idx === 0))}
            </div>
          </div>

          {page.isLast ? (
            <div
              style={{
                marginTop: 'auto',
                paddingTop: 12,
                borderTop: '1px solid hsl(30, 8%, 88%)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                fontSize: 11,
                color: 'hsl(25, 5%, 40%)',
                flexShrink: 0,
              }}
            >
              <div>
                {tableName && <div>Table Name: {tableName}</div>}
                <div>Print Time: {printTime}</div>
              </div>
              <span>
                第 {pageIdx + 1} / {totalPages} 页
              </span>
            </div>
          ) : (
            <div
              style={{
                marginTop: 'auto',
                paddingTop: 12,
                borderTop: '1px solid hsl(30, 8%, 88%)',
                display: 'flex',
                justifyContent: 'flex-end',
                fontSize: 11,
                color: 'hsl(25, 5%, 40%)',
                flexShrink: 0,
              }}
            >
              <span>
                第 {pageIdx + 1} / {totalPages} 页
              </span>
            </div>
          )}
        </div>
      );
    };

    const renderViewPage = (page: ViewPageInfo, pageIdx: number) => {
      const contentW = pageWidthPx - marginsPx.left - marginsPx.right;
      const maxCellChars = Math.floor(
        (contentW - enabledFields.length * 8) / (enabledFields.length * fs * 0.55),
      );

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
                <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-accent/30' : ''}>
                  {enabledFields.map((field) => (
                    <td
                      key={field}
                      className="py-1 px-1 border-b border-border/40 text-foreground"
                      style={{ maxWidth: `${contentW / enabledFields.length}px` }}
                      title={formatFieldValue(item.record[field])}
                    >
                      {truncateText(
                        formatFieldValue(item.record[field]),
                        Math.max(maxCellChars, 8),
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="page-break-line border-t border-dashed border-gray-300 mt-4 pt-1">
            <span className="page-number text-[10px] text-muted-foreground">
              第 {pageIdx + 1} / {totalPages} 页
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
            height:
              totalPages * pageHeightPx * 0.39 + (totalPages - 1) * 12,
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
            {mode === 'record'
              ? recordPages.map((page, idx) => renderRecordPage(page, idx))
              : viewPages.map((page, idx) => renderViewPage(page, idx))}
          </div>
        </div>
      </div>
    );
  },
);

PreviewCanvas.displayName = 'PreviewCanvas';

export default PreviewCanvas;
