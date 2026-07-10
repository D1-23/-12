export type TemplateType = 'record';
export type MarginOption = 'narrow' | 'standard' | 'wide';
export type FontSizeOption = 'small' | 'medium' | 'large';
export type PaperSize = 'A4' | 'A3' | 'A5' | 'Letter' | 'Custom';
export type Orientation = 'portrait' | 'landscape';
export type HeaderFooterAlignment = 'left' | 'center' | 'right';

export interface PageMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface SignatureArea {
  id: string;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
}

export interface HeaderFooterConfig {
  text: string;
  fontSize: number;
  alignment: HeaderFooterAlignment;
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
  signatureAreas?: SignatureArea[];
  showSignature?: boolean;
  showHeader?: boolean;
  showFooter?: boolean;
  header?: HeaderFooterConfig;
  footer?: HeaderFooterConfig;
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

export const DEFAULT_HEADER: HeaderFooterConfig = {
  text: '',
  fontSize: 10,
  alignment: 'center',
};

export const DEFAULT_FOOTER: HeaderFooterConfig = {
  text: '第 {{page_number}} / {{total_pages}} 页',
  fontSize: 10,
  alignment: 'center',
};

export function mmToPx(mm: number): number {
  return mm * 3.779527559;
}

export function replaceTemplateVars(
  text: string,
  pageNumber: number,
  totalPages: number,
  tableName: string,
  printTime: string,
): string {
  return text
    .replace(/\{\{page_number\}\}/g, String(pageNumber))
    .replace(/\{\{total_pages\}\}/g, String(totalPages))
    .replace(/\{\{table_name\}\}/g, tableName)
    .replace(/\{\{print_time\}\}/g, printTime);
}

export function migrateTemplate(t: PrintTemplate): PrintTemplate {
  const base = t.type === 'record' ? t : { ...t, type: 'record' as TemplateType };
  const marginVal = MARGIN_VALUES[t.margin] || 25;

  const result: PrintTemplate = (base.paperSize && base.margins)
    ? (base.signatureAreas ? base : { ...base, signatureAreas: [] })
    : {
        ...t,
        type: 'record' as TemplateType,
        paperSize: 'A4' as PaperSize,
        orientation: 'portrait' as Orientation,
        pageWidth: 210,
        pageHeight: 297,
        margins: {
          top: marginVal,
          right: marginVal,
          bottom: marginVal,
          left: marginVal,
        },
      };

  return {
    ...result,
    fields: result.fields ?? [],
    pinned: result.pinned ?? false,
    createdAt: result.createdAt ?? Date.now(),
    showSignature: result.showSignature ?? true,
    showHeader: result.showHeader ?? false,
    showFooter: result.showFooter ?? false,
    header: result.header ?? { ...DEFAULT_HEADER },
    footer: result.footer ?? { ...DEFAULT_FOOTER },
  };
}

const STORAGE_KEY = 'docugenius_templates';
const ACTIVE_KEY = 'docugenius_active_template_id';

function loadTemplatesLocal(): PrintTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as PrintTemplate[];
  } catch {
    // ignore
  }
  return [];
}

function saveTemplatesLocal(templates: PrintTemplate[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

function loadActiveIdLocal(): string | null {
  return localStorage.getItem(ACTIVE_KEY);
}

function saveActiveIdLocal(id: string): void {
  localStorage.setItem(ACTIVE_KEY, id);
}

export async function loadTemplates(): Promise<PrintTemplate[]> {
  try {
    const { bridgeGetData } = await import('@/api/bitable');
    const data = await bridgeGetData<PrintTemplate[]>(STORAGE_KEY);
    if (data != null && Array.isArray(data)) {
      saveTemplatesLocal(data);
      return data;
    }
  } catch {
    // Bridge not available
  }
  return loadTemplatesLocal();
}

export async function saveTemplates(templates: PrintTemplate[]): Promise<void> {
  saveTemplatesLocal(templates);
  try {
    const { bridgeSetData } = await import('@/api/bitable');
    await bridgeSetData(STORAGE_KEY, templates);
  } catch {
    // Bridge not available
  }
}

export async function loadActiveId(): Promise<string | null> {
  try {
    const { bridgeGetData } = await import('@/api/bitable');
    const data = await bridgeGetData<string>(ACTIVE_KEY);
    if (data) {
      saveActiveIdLocal(data);
      return data;
    }
  } catch {
    // Bridge not available
  }
  return loadActiveIdLocal();
}

export async function saveActiveId(id: string): Promise<void> {
  saveActiveIdLocal(id);
  try {
    const { bridgeSetData } = await import('@/api/bitable');
    await bridgeSetData(ACTIVE_KEY, id);
  } catch {
    // Bridge not available
  }
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
