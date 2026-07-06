import {
  formatFieldValue,
  getFieldLevel,
  estimateUnitHeight,
  getColumnGapPx,
  LABEL_WIDTH,
  UNIT_GAP,
  type FieldLevel,
} from './field-utils';
import { mmToPx } from '@/types/template';

export interface FieldUnit {
  field: string;
  value: string;
  level: FieldLevel;
  height: number;
}

export interface LayoutSegment {
  type: 'columns' | 'fullwidth';
  columns: FieldUnit[][];
  fullWidthUnit: FieldUnit | null;
}

export interface PageLayout {
  segments: LayoutSegment[];
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

export function calculateColumns(
  fieldCount: number,
  contentWidthMm: number,
): number {
  let columns: number;
  if (fieldCount <= 15) {
    columns = 2;
  } else if (fieldCount <= 30) {
    columns = 3;
  } else {
    columns = 4;
  }

  while (columns > 1) {
    const gapMm = 8 * (columns - 1);
    const colWidth = (contentWidthMm - gapMm) / columns;
    if (colWidth >= 60) break;
    columns--;
  }

  return columns;
}

export function layoutRecordPages(params: LayoutParams): PageLayout[] {
  const {
    fields,
    record,
    fieldTypes,
    contentWidthMm,
    contentHeightPx,
  } = params;

  const numCols = calculateColumns(fields.length, contentWidthMm);
  const contentWidthPx = Math.round(mmToPx(contentWidthMm));
  const columnGapPx = getColumnGapPx();
  const columnWidthPx = Math.round(
    (contentWidthPx - columnGapPx * (numCols - 1)) / numCols,
  );
  const valueWidthPx = columnWidthPx - LABEL_WIDTH;
  const fullWidthValuePx = contentWidthPx - LABEL_WIDTH;

  const units: FieldUnit[] = fields.map((field) => {
    const rawValue = record[field];
    const formatted = formatFieldValue(rawValue);
    const type = fieldTypes[field];
    const level = getFieldLevel(type, rawValue, formatted);
    const height = estimateUnitHeight(
      level,
      formatted,
      level === 'single' ? valueWidthPx : fullWidthValuePx,
    );
    return { field, value: formatted, level, height };
  });

  const pages: PageLayout[] = [];
  let currentSegments: LayoutSegment[] = [];
  let columnCursors: number[] = new Array(numCols).fill(0);
  let pageUnitCount = 0;
  let currentSegment: LayoutSegment | null = null;

  const startNewColumnsSegment = (): LayoutSegment => {
    const seg: LayoutSegment = {
      type: 'columns',
      columns: Array.from({ length: numCols }, () => []),
      fullWidthUnit: null,
    };
    currentSegments.push(seg);
    return seg;
  };

  const finalizePage = (): void => {
    if (currentSegments.length > 0) {
      pages.push({
        segments: [...currentSegments],
        pageNumber: pages.length + 1,
        isFirst: pages.length === 0,
        isLast: false,
      });
    }
    currentSegments = [];
    columnCursors = new Array(numCols).fill(0);
    pageUnitCount = 0;
    currentSegment = null;
  };

  for (const unit of units) {
    if (unit.level === 'single') {
      const minCol = columnCursors.indexOf(Math.min(...columnCursors));
      const cursorPos = columnCursors[minCol];
      const bottom = cursorPos + unit.height;

      if (bottom > contentHeightPx && pageUnitCount > 0) {
        if (pageUnitCount === 1) {
          const removed = currentSegments.pop();
          if (removed && removed.type === 'columns') {
            for (const col of removed.columns) {
              for (const u of col) {
                columnCursors = new Array(numCols).fill(0);
              }
            }
          }
          columnCursors = new Array(numCols).fill(0);
          pageUnitCount = 0;
          currentSegment = null;
        } else {
          finalizePage();
        }
      }

      if (!currentSegment || currentSegment.type !== 'columns') {
        currentSegment = startNewColumnsSegment();
      }

      currentSegment.columns[minCol].push(unit);
      columnCursors[minCol] += unit.height + UNIT_GAP;
      pageUnitCount++;
    } else {
      const fullHeight = unit.height + UNIT_GAP * 2;
      const flatHeight = Math.max(...columnCursors);
      const bottom = flatHeight + fullHeight;

      if (bottom > contentHeightPx && pageUnitCount > 0) {
        if (pageUnitCount === 1) {
          currentSegments = [];
          columnCursors = new Array(numCols).fill(0);
          pageUnitCount = 0;
          currentSegment = null;
        } else {
          finalizePage();
        }
      }

      const fullSegment: LayoutSegment = {
        type: 'fullwidth',
        columns: [],
        fullWidthUnit: unit,
      };
      currentSegments.push(fullSegment);
      const newCursor = (Math.max(...columnCursors)) + fullHeight;
      columnCursors = new Array(numCols).fill(newCursor);
      pageUnitCount++;
      currentSegment = null;
    }
  }

  if (currentSegments.length > 0) {
    finalizePage();
  }

  if (pages.length === 0) {
    pages.push({
      segments: [],
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
