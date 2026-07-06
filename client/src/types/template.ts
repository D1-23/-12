export type TemplateType = 'record' | 'view';
export type MarginOption = 'narrow' | 'standard' | 'wide';
export type FontSizeOption = 'small' | 'medium' | 'large';
export type PaperSize = 'A4' | 'A3' | 'A5' | 'Letter' | 'Custom';
export type Orientation = 'portrait' | 'landscape';

export interface PageMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type CellAlign = 'left' | 'center' | 'right';

export interface CellStyle {
  bg?: string;
  color?: string;
  align?: CellAlign;
  bold?: boolean;
}

export interface RowVisibilityRule {
  field: string;
  operator: 'eq' | 'neq' | 'empty' | 'notEmpty';
  value?: string;
}

export interface MergedCell {
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
}

export interface TableBorders {
  show: boolean;
  color: string;
}

export interface TableLayout {
  headerRows: number;
  footerRows: number;
  colWidths: number[];
  rowVisibility: Record<number, RowVisibilityRule>;
  cellStyles: Record<string, CellStyle>;
  mergedCells: MergedCell[];
  borders: TableBorders;
  tableContent?: string;
}

export interface PrintTemplate {
  id: string;
  name: string;
  type: TemplateType;
  fields: string[];
  margin: MarginOption;
  fontSize: FontSizeOption;
  titleField: string;
  pinned: boolean;
  createdAt: number;
  paperSize: PaperSize;
  orientation: Orientation;
  pageWidth: number;
  pageHeight: number;
  margins: PageMargins;
  tableLayout?: TableLayout;
}

export const MARGIN_LABELS: Record<MarginOption, string> = {
  narrow: '窄',
  standard: '标准',
  wide: '宽',
};

export const FONT_SIZE_LABELS: Record<FontSizeOption, string> = {
  small: '小',
  medium: '中',
  large: '大',
};

export const TEMPLATE_TYPE_LABELS: Record<TemplateType, string> = {
  record: '记录模板',
  view: '视图模板',
};

export const MARGIN_VALUES: Record<MarginOption, number> = {
  narrow: 15,
  standard: 25,
  wide: 35,
};

export const FONT_SIZES: Record<FontSizeOption, number> = {
  small: 12,
  medium: 14,
  large: 16,
};

export const PAPER_SIZE_LABELS: Record<PaperSize, string> = {
  A4: 'A4',
  A3: 'A3',
  A5: 'A5',
  Letter: 'Letter',
  Custom: '自定义',
};

export const ORIENTATION_LABELS: Record<Orientation, string> = {
  portrait: '纵向',
  landscape: '横向',
};

export const PAPER_SIZES: Record<Exclude<PaperSize, 'Custom'>, { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  A3: { width: 297, height: 420 },
  A5: { width: 148, height: 210 },
  Letter: { width: 216, height: 279 },
};

export const DEFAULT_PAGE_MARGINS: PageMargins = {
  top: 25,
  right: 25,
  bottom: 25,
  left: 25,
};

export function mmToPx(mm: number): number {
  return mm * 3.779527559;
}

export function migrateTemplate(t: PrintTemplate): PrintTemplate {
  if (t.paperSize && t.margins) return t;
  const marginVal = MARGIN_VALUES[t.margin] || 25;
  return {
    ...t,
    paperSize: 'A4',
    orientation: 'portrait',
    pageWidth: 210,
    pageHeight: 297,
    margins: {
      top: marginVal,
      right: marginVal,
      bottom: marginVal,
      left: marginVal,
    },
  };
}

const STORAGE_KEY = 'docugenius_templates';
const ACTIVE_KEY = 'docugenius_active_template_id';

export function loadTemplates(): PrintTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as PrintTemplate[];
  } catch {
    // ignore
  }
  return [];
}

export function saveTemplates(templates: PrintTemplate[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

export function loadActiveId(): string | null {
  return localStorage.getItem(ACTIVE_KEY);
}

export function saveActiveId(id: string): void {
  localStorage.setItem(ACTIVE_KEY, id);
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
