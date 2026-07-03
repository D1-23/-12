import { useMemo, useRef, useImperativeHandle, forwardRef } from 'react';
import type { MarginOption, FontSizeOption } from './Toolbar';

export interface PreviewCanvasHandle {
  getContent: () => string;
}

interface PreviewCanvasProps {
  records: Array<Record<string, unknown>>;
  enabledFields: string[];
  margin: MarginOption;
  fontSize: FontSizeOption;
}

const MARGIN_VALUES: Record<MarginOption, number> = {
  narrow: 15,
  standard: 25,
  wide: 35,
};

const FONT_SIZES: Record<FontSizeOption, number> = {
  small: 12,
  medium: 14,
  large: 16,
};

const A4_WIDTH = 794;
const A4_HEIGHT = 1123;
const TITLE_HEIGHT = 36;
const FIELD_ROW_BASE = 28;
const FIELD_ROW_LINE = 18;
const MAX_FIELD_CHARS = 42;

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object' && value !== null && 'text' in value) {
    return String((value as { text: unknown }).text ?? '');
  }
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

function calculatePages(
  records: Array<Record<string, unknown>>,
  enabledFields: string[],
  margin: MarginOption,
  fontSize: FontSizeOption
): Array<{ record: Record<string, unknown>; startField: number; endField: number }> {
  const marginPx = MARGIN_VALUES[margin];
  const contentHeight = A4_HEIGHT - marginPx * 2;
  const fs = FONT_SIZES[fontSize];
  const rowHeight = FIELD_ROW_BASE + (fs - 14) * 0.5;
  const maxCharsPerLine = Math.floor((A4_WIDTH - marginPx * 2) / (fs * 0.55));

  const pages: Array<{ record: Record<string, unknown>; startField: number; endField: number }> = [];

  for (const record of records) {
    let usedHeight = TITLE_HEIGHT;
    let startField = 0;

    for (let i = 0; i < enabledFields.length; i++) {
      const rawValue = record[enabledFields[i]];
      const text = formatFieldValue(rawValue);
      const lineCount = Math.max(1, Math.ceil(text.length / Math.max(maxCharsPerLine, 1)));
      const fieldHeight = rowHeight + Math.max(0, lineCount - 1) * FIELD_ROW_LINE;

      if (usedHeight + fieldHeight > contentHeight && i > startField) {
        pages.push({ record, startField, endField: i });
        startField = i;
        usedHeight = TITLE_HEIGHT;
      }
      usedHeight += fieldHeight;
    }

    if (startField < enabledFields.length) {
      pages.push({ record, startField, endField: enabledFields.length });
    }
  }

  return pages;
}

const PreviewCanvas = forwardRef<PreviewCanvasHandle, PreviewCanvasProps>(
  ({ records, enabledFields, margin, fontSize }, ref) => {
    const contentRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
      getContent: () => contentRef.current?.innerHTML ?? '',
    }));

    const pages = useMemo(
      () => calculatePages(records, enabledFields, margin, fontSize),
      [records, enabledFields, margin, fontSize]
    );

    const marginPx = MARGIN_VALUES[margin];
    const fs = FONT_SIZES[fontSize];
    const scaledWidth = A4_WIDTH * 0.39;

    return (
      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-background py-3">
        <div
          style={{
            width: scaledWidth,
            height: pages.length * A4_HEIGHT * 0.39 + (pages.length - 1) * 12,
            margin: '0 auto',
          }}
        >
          <div
            ref={contentRef}
            id="preview-content"
            style={{
              width: A4_WIDTH,
              transform: 'scale(0.39)',
              transformOrigin: 'top left',
            }}
          >
            {pages.map((page, pageIdx) => (
              <div
                key={pageIdx}
                className="print-page bg-card rounded-md shadow-sm overflow-hidden"
                style={{
                  width: A4_WIDTH,
                  minHeight: A4_HEIGHT,
                  padding: marginPx,
                  fontSize: fs,
                  marginBottom: 30,
                }}
              >
                {page.startField === 0 && (
                  <div
                    className="font-semibold mb-3 pb-2 border-b border-border text-foreground truncate"
                    style={{ fontSize: fs + 4 }}
                  >
                    {formatFieldValue(page.record['标题']) ||
                      formatFieldValue(page.record['客户名称']) ||
                      '未命名记录'}
                  </div>
                )}
                {enabledFields.slice(page.startField, page.endField).map((field) => (
                  <div
                    key={field}
                    className="flex gap-2 py-1.5 border-b border-border/50"
                  >
                    <span
                      className="text-muted-foreground shrink-0 font-medium"
                      style={{ width: 72 }}
                    >
                      {field}
                    </span>
                    <span className="text-foreground break-words flex-1">
                      {formatFieldValue(page.record[field]) || '-'}
                    </span>
                  </div>
                ))}

                <div className="page-break-line border-t border-dashed border-gray-300 mt-4 pt-1">
                  <span className="page-number text-[10px] text-muted-foreground">
                    第 {pageIdx + 1} / {pages.length} 页
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
);

PreviewCanvas.displayName = 'PreviewCanvas';

export default PreviewCanvas;
