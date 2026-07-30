import {
  formatFieldValue,
  getFieldLevel,
  estimateUnitHeight,
  LABEL_WIDTH,
  type FieldLevel,
} from './field-utils';
import { mmToPx } from '@/types/template';

export const TITLE_HEIGHT_PX = 30;
export const FOOTER_HEIGHT_PX = 20;
export const RECORD_SEPARATOR_HEIGHT = 12;

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

export interface LayoutParams {
  fields: string[];
  record: Record<string, unknown>;
  fieldTypes: Record<string, number>;
  contentWidthMm: number;
  fontSize: number;
}

const NUM_COLS = 2;

export function buildMergedRows(params: LayoutParams): MergedRow[] {
  const { fields, record, fieldTypes, contentWidthMm } = params;

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
      field,
      formatted,
      level === 'single' ? valueWidthPx : fullWidthValuePx,
      LABEL_WIDTH,
      params.fontSize,
    );
    return { field, value: formatted, level, height };
  });

  const mergedRows: MergedRow[] = [];
  const colBuffers: FieldUnit[][] = Array.from({ length: NUM_COLS }, () => []);
  const colCursors: number[] = new Array(NUM_COLS).fill(0);

  const flushPaired = () => {
    const maxRows = Math.max(...colBuffers.map((c) => c.length));
    for (let i = 0; i < maxRows; i++) {
      const left = colBuffers[0][i];
      const right = colBuffers[1][i];
      const height = Math.max(left?.height ?? 0, right?.height ?? 0);
      mergedRows.push({ type: 'paired', height, left, right });
    }
    colBuffers.forEach((c) => (c.length = 0));
    colCursors.fill(0);
  };

  for (const unit of units) {
    if (unit.level === 'single') {
      const minCol = colCursors.indexOf(Math.min(...colCursors));
      colBuffers[minCol].push(unit);
      colCursors[minCol] += unit.height;
    } else {
      flushPaired();
      mergedRows.push({ type: 'full', height: unit.height, unit });
    }
  }
  flushPaired();

  return mergedRows;
}

export function paginateMergedRows(
  rows: MergedRow[],
  availableHeight: number,
): MergedRow[][] {
  if (rows.length === 0) return [[]];

  const pages: MergedRow[][] = [];
  let currentHeight = 0;
  let currentPage: MergedRow[] = [];

  for (const row of rows) {
    if (currentHeight + row.height > availableHeight && currentPage.length > 0) {
      pages.push(currentPage);
      currentPage = [];
      currentHeight = 0;
    }
    currentPage.push(row);
    currentHeight += row.height;
  }

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return pages.length > 0 ? pages : [[]];
}

export interface ContinuousSegment {
  rows: MergedRow[];
  recordIdx: number;
}

export interface ContinuousPage {
  segments: ContinuousSegment[];
}

export function paginateContinuousRows(
  allRecordRows: MergedRow[][],
  availableHeight: number,
): ContinuousPage[] {
  if (allRecordRows.length === 0 || allRecordRows.every((r) => r.length === 0)) {
    return [];
  }

  const pages: ContinuousPage[] = [];
  let currentSegments: ContinuousSegment[] = [];
  let currentRows: MergedRow[] = [];
  let currentHeight = 0;
  let currentRecordIdx = -1;

  const flushSegment = () => {
    if (currentRows.length > 0) {
      currentSegments.push({ rows: currentRows, recordIdx: currentRecordIdx });
      currentRows = [];
    }
  };

  const flushPage = () => {
    flushSegment();
    if (currentSegments.length > 0) {
      pages.push({ segments: currentSegments });
      currentSegments = [];
    }
    currentHeight = 0;
  };

  for (let recordIdx = 0; recordIdx < allRecordRows.length; recordIdx++) {
    const rows = allRecordRows[recordIdx];

    if (recordIdx > 0 && currentHeight > 0) {
      if (currentHeight + RECORD_SEPARATOR_HEIGHT > availableHeight && currentRows.length > 0) {
        flushPage();
      } else {
        currentHeight += RECORD_SEPARATOR_HEIGHT;
      }
    }

    currentRecordIdx = recordIdx;

    for (const row of rows) {
      if (currentHeight + row.height > availableHeight && currentRows.length > 0) {
        flushPage();
        currentRecordIdx = recordIdx;
      }
      currentRows.push(row);
      currentHeight += row.height;
    }

    flushSegment();
  }

  flushPage();

  return pages;
}
