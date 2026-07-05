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
  fontSize: FontSizeOption
): PageInfo[] {
  const marginPx = MARGIN_VALUES[margin];
  const contentHeight = A4_HEIGHT - marginPx * 2;
  const fs = FONT_SIZES[fontSize];
  const headerHeight = 36; // 表头高度
  const rowHeight = fs * 1.8 + 12; // 数据行高度

  const pages: PageInfo[] = [];
  let currentItems: PageInfo['items'] = [];
  let usedHeight = headerHeight;

  for (const record of records) {
    if (usedHeight + rowHeight > contentHeight && currentItems.length > 0) {
      pages.push({ items: currentItems });
      currentItems = [];
      usedHeight = headerHeight;
    }
    currentItems.push({ record });
    usedHeight += rowHeight;
  }

  if (currentItems.length > 0) {
    pages.push({ items: currentItems });
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
          <table className="w-full border-collapse" style={{ fontSize: fs }}>
            <thead>
              <tr>
                {enabledFields.map((field) => (
                  <th
                    key={field}
                    className="text-left font-semibold py-2 px-2 border border-border bg-accent/30 text-muted-foreground whitespace-nowrap"
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
                  className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-accent/10'}
                >
                  {enabledFields.map((field) => (
                    <td
                      key={field}
                      className="py-1.5 px-2 border border-border text-foreground break-words"
                      style={{ maxWidth: `${(A4_WIDTH - marginPx * 2) / enabledFields.length}px` }}
                      title={formatFieldValue(item.record[field])}
                    >
                      {formatFieldValue(item.record[field]) || '-'}
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
