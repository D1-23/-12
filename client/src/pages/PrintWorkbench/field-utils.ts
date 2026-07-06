import { mmToPx } from '@/types/template';

export type FieldLevel = 'single' | 'full' | 'block';

export const LABEL_WIDTH = 120;
export const LINE_HEIGHT = 22;
export const UNIT_MIN_HEIGHT = 30;
export const UNIT_GAP = 8;
export const COLUMN_GAP_MM = 8;
export const MIN_COLUMN_WIDTH_MM = 60;

const FULL_WIDTH_TYPES = new Set<number>([
  4,
  15,
  18,
  19,
  20,
  21,
  22,
]);

const BLOCK_TYPES = new Set<number>([17]);

const DATE_TYPES = new Set<number>([5, 1001, 1002]);

function formatDate(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatFieldValue(value: unknown, fieldType?: number): string {
  if (value === null || value === undefined) return '';

  if (
    typeof value === 'object' &&
    value !== null &&
    'bizType' in value &&
    'value' in value
  ) {
    const typed = value as { bizType: string; value: unknown };
    return formatFieldValue(typed.value, fieldType);
  }

  if (typeof value === 'object' && value !== null && 'text' in value) {
    return String((value as { text: unknown }).text ?? '');
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'text' in value
  ) {
    return String((value as { text: unknown }).text ?? '');
  }

  if (typeof value === 'object' && value !== null && 'name' in value) {
    return String((value as { name: unknown }).name ?? '');
  }

  if (typeof value === 'object' && value !== null && 'recordIds' in value) {
    const link = value as { text?: unknown; recordIds?: string[] };
    if (link.recordIds && link.recordIds.length > 0) {
      return link.recordIds.join(', ');
    }
    return String(link.text ?? '');
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => formatFieldValue(item))
      .filter(Boolean)
      .join(', ');
  }

  if (typeof value === 'number') {
    if (fieldType !== undefined && DATE_TYPES.has(fieldType)) {
      return formatDate(value);
    }
    return String(value);
  }
  if (typeof value === 'boolean') return value ? '是' : '否';

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

function isMultiValue(value: unknown): boolean {
  if (Array.isArray(value) && value.length > 1) return true;

  if (
    typeof value === 'object' &&
    value !== null &&
    'value' in value &&
    Array.isArray((value as { value: unknown }).value)
  ) {
    return (value as { value: unknown[] }).value.length > 1;
  }

  return false;
}

function isLongText(formatted: string): boolean {
  return formatted.length > 30 || formatted.includes('\n');
}

export function getFieldLevel(
  type: number | undefined,
  rawValue: unknown,
  formattedValue: string,
): FieldLevel {
  if (type !== undefined && BLOCK_TYPES.has(type)) return 'block';

  if (type !== undefined && FULL_WIDTH_TYPES.has(type)) {
    if (type === 18 && !isMultiValue(rawValue)) return 'single';
    return 'full';
  }

  if (type === 1 && isLongText(formattedValue)) return 'full';

  if (
    (type === 11 || type === 1003 || type === 1004) &&
    isMultiValue(rawValue)
  ) {
    return 'full';
  }

  if (formattedValue.length > 30) return 'full';

  return 'single';
}

export function estimateUnitHeight(
  level: FieldLevel,
  formattedValue: string,
  valueWidthPx: number,
): number {
  if (level === 'block') return 120;

  const baseHeight = UNIT_MIN_HEIGHT;
  const charPerLine = Math.max(
    1,
    Math.floor(valueWidthPx / (LINE_HEIGHT * 0.55)),
  );

  let lineCount = 1;
  if (formattedValue.length > 0) {
    const explicitLines = formattedValue.split('\n').length;
    const wrappedLines = Math.ceil(formattedValue.length / charPerLine);
    lineCount = Math.max(explicitLines, wrappedLines);
  }

  return Math.max(baseHeight, lineCount * LINE_HEIGHT + 8);
}

export function getColumnGapPx(): number {
  return Math.round(mmToPx(COLUMN_GAP_MM));
}

export function formatPrintTime(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
