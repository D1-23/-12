import {
  formatFieldValue,
  getFieldLevel,
  estimateUnitHeight,
  LABEL_WIDTH,
  COLUMN_GAP_PX,
  type FieldLevel,
} from './field-utils';
import { mmToPx } from '@/types/template';

export interface FieldUnit {
  field: string;
  value: string;
  level: FieldLevel;
  height: number;
}

export interface PageLayout {
  units: FieldUnit[];
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

export function layoutRecordPages(params: LayoutParams): PageLayout[] {
  const {
    fields,
    record,
    fieldTypes,
    contentWidthMm,
    contentHeightPx,
  } = params;

  const contentWidthPx = Math.round(mmToPx(contentWidthMm));
  const columnWidthPx = Math.round(
    (contentWidthPx - COLUMN_GAP_PX * (NUM_COLS - 1)) / NUM_COLS,
  );
  const valueWidthPx = columnWidthPx - LABEL_WIDTH;
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

  const pages: PageLayout[] = [];
  let currentUnits: FieldUnit[] = [];
  let columnCursors: number[] = new Array(NUM_COLS).fill(0);

  const finalizePage = (): void => {
    if (currentUnits.length > 0) {
      pages.push({
        units: [...currentUnits],
        pageNumber: pages.length + 1,
        isFirst: pages.length === 0,
        isLast: false,
      });
    }
    currentUnits = [];
    columnCursors = new Array(NUM_COLS).fill(0);
  };

  for (const unit of units) {
    if (unit.level === 'single') {
      const minCol = columnCursors.indexOf(Math.min(...columnCursors));
      const bottom = columnCursors[minCol] + unit.height;

      if (bottom > contentHeightPx && currentUnits.length > 0) {
        finalizePage();
      }

      currentUnits.push(unit);
      const col = columnCursors.indexOf(Math.min(...columnCursors));
      columnCursors[col] += unit.height;
    } else {
      const flatHeight = Math.max(...columnCursors);
      const bottom = flatHeight + unit.height;

      if (bottom > contentHeightPx && currentUnits.length > 0) {
        finalizePage();
      }

      currentUnits.push(unit);
      const newCursor = Math.max(...columnCursors) + unit.height;
      columnCursors = new Array(NUM_COLS).fill(newCursor);
    }
  }

  if (currentUnits.length > 0) {
    finalizePage();
  }

  if (pages.length === 0) {
    pages.push({
      units: [],
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
