import { useMemo, useRef, useImperativeHandle, forwardRef } from 'react';
import type { TemplateType, MarginOption, FontSizeOption } from '@/types/template';
import { MARGIN_VALUES, FONT_SIZES } from '@/types/template';

export interface PreviewCanvasHandle {
  getContent: () => string;
}

interface PreviewCanvasProps {
  records: Array<Record<string, unknown>>;
  enabledFields: string[];
  margin: MarginOption;
  fontSize: FontSizeOption;
  mode: TemplateType;
  titleField: string;
}

const A4_WIDTH = 794;
const A4_HEIGHT = 1123;
const TITLE_HEIGHT = 36;
const FIELD_ROW_BASE = 28;
const FIELD_ROW_LINE = 18;

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined) return '';

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

  // 附件 { name: string, ... }
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

  // 多行文本段落数组 [{ type: 'text', text: 'xxx' }, ...]
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'object' && item !== null && 'text' in item) {
          return String((item as { text: unknown }).text ?? '');
        }
        if (typeof item === 'object' && item !== null && 'name' in item) {
          return String((item as { name: unknown }).name ?? '');
        }
        return String(item ?? '');
      })
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
  fontSize: FontSizeOption
): PageInfo[] {
  const marginPx = MARGIN_VALUES[margin];
  const contentHeight = A4_HEIGHT - marginPx * 2;
  const fs = FONT_SIZES[fontSize];
  const rowHeight = FIELD_ROW_BASE + (fs - 14) * 0.5;
  const maxCharsPerLine = Math.floor((A4_WIDTH - marginPx * 2) / (fs * 0.55));

  const pages: PageInfo[] = [];

  for (const record of records) {
    let usedHeight = TITLE_HEIGHT;
    let startField = 0;

    for (let i = 0; i < enabledFields.length; i++) {
      const rawValue = record[enabledFields[i]];
      const text = formatFieldValue(rawValue);
      const lineCount = Math.max(1, Math.ceil(text.length / Math.max(maxCharsPerLine, 1)));
      const fieldHeight = rowHeight + Math.max(0, lineCount - 1) * FIELD_ROW_LINE;

      if (usedHeight + fieldHeight > contentHeight && i > startField) {
        pages.push({ items: [{ record, startField, endField: i }] });
        startField = i;
        usedHeight = TITLE_HEIGHT;
      }
      usedHeight += fieldHeight;
    }

    if (startField < enabledFields.length) {
      pages.push({ items: [{ record, startField, endField: enabledFields.length }] });
    }
  }

  return pages;
}

function calculateViewPages(
  records: Array<Record<string, unknown>>,
  enabledFields: string[],
  margin: MarginOption,
  fontSize: FontSizeOption
): PageInfo[] {
  const marginPx = MARGIN_VALUES[margin];
  const contentHeight = A4_HEIGHT - marginPx * 2;
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
  ({ records, enabledFields, margin, fontSize, mode, titleField }, ref) => {
    const contentRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
      getContent: () => contentRef.current?.innerHTML ?? '',
    }));

    const pages = useMemo(
      () =>
        mode === 'record'
          ? calculateRecordPages(records, enabledFields, margin, fontSize)
          : calculateViewPages(records, enabledFields, margin, fontSize),
      [records, enabledFields, margin, fontSize, mode]
    );

    const marginPx = MARGIN_VALUES[margin];
    const fs = FONT_SIZES[fontSize];
    const scaledWidth = A4_WIDTH * 0.39;

    const renderRecordPage = (page: PageInfo, pageIdx: number) => {
      const item = page.items[0];
      if (!item) return null;
      const { record, startField = 0, endField = enabledFields.length } = item;
      const title = formatFieldValue(record[titleField]) || formatFieldValue(record['标题']) || formatFieldValue(record['客户名称']) || '未命名记录';

      return (
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
          {startField === 0 && (
            <div
              className="font-semibold mb-3 pb-2 border-b border-border text-foreground truncate"
              style={{ fontSize: fs + 4 }}
            >
              {title}
            </div>
          )}
          {enabledFields.slice(startField, endField).map((field) => (
            <div key={field} className="flex gap-2 py-1.5 border-b border-border/50">
              <span
                className="text-muted-foreground shrink-0 font-medium"
                style={{ width: 72 }}
              >
                {field}
              </span>
              <span className="text-foreground break-words flex-1">
                {formatFieldValue(record[field]) || '-'}
              </span>
            </div>
          ))}
          <div className="page-break-line border-t border-dashed border-gray-300 mt-4 pt-1">
            <span className="page-number text-[10px] text-muted-foreground">
              第 {pageIdx + 1} / {pages.length} 页
            </span>
          </div>
        </div>
      );
    };

    const renderViewPage = (page: PageInfo, pageIdx: number) => {
      const maxCellChars = Math.floor((A4_WIDTH - marginPx * 2 - enabledFields.length * 8) / (enabledFields.length * fs * 0.55));

      return (
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
          <table className="w-full border-collapse" style={{ fontSize: fs - 1 }}>
            <thead>
              <tr>
                {enabledFields.map((field) => (
                  <th
                    key={field}
                    className="text-left font-semibold py-1.5 px-1 border-b-2 border-foreground/20 text-muted-foreground whitespace-nowrap"
                    style={{ maxWidth: `${(A4_WIDTH - marginPx * 2) / enabledFields.length}px` }}
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
                      style={{ maxWidth: `${(A4_WIDTH - marginPx * 2) / enabledFields.length}px` }}
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
