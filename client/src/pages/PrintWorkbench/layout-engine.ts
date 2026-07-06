import {
  formatFieldValue,
  getFieldLevel,
  estimateUnitHeight,
  LABEL_WIDTH,
  type FieldLevel,
} from './field-utils';
import { mmToPx } from '@/types/template';

export interface FieldUnit {
  field: string;
  value: string;
  level: FieldLevel;
  height: number;
}

export interface MergedRow {
  type: 'paired' | 'full';
  height: number;
  left?: FieldUnit;
  right?: FieldUnit;
  unit?: FieldUnit;
}

export interface PageLayout {
  rows: MergedRow[];
  pageNumber: number;
  isFirst: boolean;
  isLast: boolean;
}

export interface LayoutParams {
  fields: string[];
  record: Record<string, unknown>;
  fieldTypes: Record<string, number>;
  contentWidthMm: number;
  contentHeightPx: number;
  fontSize: number;
}

const NUM_COLS = 2;
const HEADER_HEIGHT = 50;
const FOOTER_HEIGHT = 45;

export function layoutRecordPages(params: LayoutParams): PageLayout[] {
  const {
    fields,
    record,
    fieldTypes,
    contentWidthMm,
    contentHeightPx,
  } = params;

  const contentWidthPx = Math.round(mmToPx(contentWidthMm));
  const valueWidthPx = Math.round(
    (contentWidthPx - LABEL_WIDTH * NUM_COLS) / NUM_COLS,
  );
  const fullWidthValuePx = contentWidthPx - LABEL_WIDTH;

  const units: FieldUnit[] = fields.map((field) => {
    const rawValue = record[field];
    const type = fieldTypes[field];
    const formatted = formatFieldValue(rawValue, type);
    const level = getFieldLevel(type, rawValue, formatted);
    const height = estimateUnitHeight(
      level,
      formatted,
      level === 'single' ? valueWidthPx : fullWidthValuePx,
    );
    return { field, value: formatted, level, height };
  });

  const columns: FieldUnit[][] = Array.from({ length: NUM_COLS }, () => []);
  const fullWidthUnits: FieldUnit[] = [];
  let columnCursors: number[] = new Array(NUM_COLS).fill(0);

  for (const unit of units) {
    if (unit.level === 'single') {
      const minCol = columnCursors.indexOf(Math.min(...columnCursors));
      columns[minCol].push(unit);
      columnCursors[minCol] += unit.height;
    } else {
      fullWidthUnits.push(unit);
      const newCursor = Math.max(...columnCursors) + unit.height;
      columnCursors = new Array(NUM_COLS).fill(newCursor);
    }
  }

  const maxRows = Math.max(...columns.map((c) => c.length));
  const mergedRows: MergedRow[] = [];

  for (let i = 0; i < maxRows; i++) {
    const left = columns[0][i];
    const right = columns[1][i];
    const height = Math.max(left?.height ?? 0, right?.height ?? 0);
    mergedRows.push({ type: 'paired', height, left, right });
  }

  for (const unit of fullWidthUnits) {
    mergedRows.push({ type: 'full', height: unit.height, unit });
  }

  const pages: PageLayout[] = [];
  let currentRows: MergedRow[] = [];
  let accumulatedHeight = 0;
  let isFirstPage = true;

  for (const row of mergedRows) {
    const availableHeight = isFirstPage
      ? contentHeightPx - HEADER_HEIGHT - FOOTER_HEIGHT
      : contentHeightPx - FOOTER_HEIGHT;

    if (accumulatedHeight + row.height > availableHeight && currentRows.length > 0) {
      pages.push({
        rows: currentRows,
        pageNumber: pages.length + 1,
        isFirst: isFirstPage,
        isLast: false,
      });
      currentRows = [];
      accumulatedHeight = 0;
      isFirstPage = false;
    }

    currentRows.push(row);
    accumulatedHeight += row.height;
  }

  if (currentRows.length > 0) {
    pages.push({
      rows: currentRows,
      pageNumber: pages.length + 1,
      isFirst: isFirstPage,
      isLast: false,
    });
  }

  if (pages.length === 0) {
    pages.push({
      rows: [],
      pageNumber: 1,
      isFirst: true,
      isLast: true,
    });
  }

  for (let i = 0; i < pages.length; i++) {
    pages[i].isLast = i === pages.length - 1;
  }

  return pages;
}
