export type PaperSize = 'A4' | 'A3' | 'A5' | 'Letter' | 'Custom';
export type Orientation = 'portrait' | 'landscape';
export type HeaderFooterAlignment = 'left' | 'center' | 'right';
export type TextAlign = 'left' | 'center' | 'right' | 'justify';

export type ElementType =
  | 'text'
  | 'table'
  | 'image'
  | 'qrcode'
  | 'barcode'
  | 'line'
  | 'auto-table';

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

export interface BaseElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TextElement extends BaseElement {
  type: 'text';
  content: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: TextAlign;
  color: string;
  backgroundColor: string;
  lineHeight: number;
}

export interface TableCell {
  content: string;
  fontSize: number;
  bold: boolean;
  color: string;
  backgroundColor: string;
  align: TextAlign;
  isMerged: boolean;
  colspan: number;
  rowspan: number;
}

export interface TableElement extends BaseElement {
  type: 'table';
  rows: number;
  cols: number;
  cells: TableCell[][];
  headerRowCount: number;
  tailRowCount: number;
}

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string;
  fit: 'contain' | 'cover' | 'fill';
}

export interface QrCodeElement extends BaseElement {
  type: 'qrcode';
  content: string;
}

export interface BarcodeElement extends BaseElement {
  type: 'barcode';
  content: string;
  format: 'CODE128' | 'EAN13' | 'CODE39';
}

export interface LineElement extends BaseElement {
  type: 'line';
  color: string;
  thickness: number;
  style: 'solid' | 'dashed' | 'dotted';
}

export interface AutoTableElement extends BaseElement {
  type: 'auto-table';
  selectedFieldIds: string[];
}

export type PrintElement =
  | TextElement
  | TableElement
  | ImageElement
  | QrCodeElement
  | BarcodeElement
  | LineElement
  | AutoTableElement;

export interface VisibilityCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater' | 'less' | 'contains';
  value: string;
}

export interface TemplatePage {
  id: string;
  name: string;
  elements: PrintElement[];
  visibilityConditions?: VisibilityCondition[];
  visibilityLogic: 'all' | 'any';
}

export interface PrintTemplate {
  id: string;
  name: string;
  pages: TemplatePage[];
  paperSize: PaperSize;
  orientation: Orientation;
  pageWidth: number;
  pageHeight: number;
  margins: PageMargins;
  defaultFontSize: number;
  pinned: boolean;
  createdAt: number;
  signatureAreas?: SignatureArea[];
  showHeader?: boolean;
  showFooter?: boolean;
  header?: HeaderFooterConfig;
  footer?: HeaderFooterConfig;
}

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
  top: 20,
  right: 20,
  bottom: 20,
  left: 20,
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

export const FONT_SIZE_OPTIONS = [9, 10, 11, 12, 14, 16, 18, 24, 32, 48, 72];

export const DEFAULT_ELEMENT_FONT_SIZE = 14;

export function mmToPx(mm: number): number {
  return mm * 3.779527559;
}

export function pxToMm(px: number): number {
  return px / 3.779527559;
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

function migrateOldFieldsTemplate(
  t: Record<string, unknown>,
  id: string,
): PrintTemplate {
  const fields = Array.isArray(t.fields) ? (t.fields as string[]) : [];
  const elements: PrintElement[] = [];

  if (fields.length > 0) {
    elements.push({
      id: generateId(),
      type: 'auto-table',
      x: 10,
      y: 20,
      width: 190,
      height: 100,
      selectedFieldIds: [...fields],
    });
  }

  return {
    id,
    name: (t.name as string) || '记录详情',
    pages: [{
      id: generateId(),
      name: '第1页',
      elements,
      visibilityLogic: 'all',
    }],
    paperSize: 'A4',
    orientation: 'portrait',
    pageWidth: 210,
    pageHeight: 297,
    margins: { ...DEFAULT_PAGE_MARGINS },
    defaultFontSize: DEFAULT_ELEMENT_FONT_SIZE,
    pinned: false,
    createdAt: Date.now(),
    signatureAreas: [],
    showHeader: false,
    showFooter: true,
    header: { ...DEFAULT_HEADER },
    footer: { ...DEFAULT_FOOTER },
  };
}

export function migrateTemplate(t: unknown): PrintTemplate {
  const raw = t as Record<string, unknown>;
  const id = (raw.id as string) || generateId();

  if (Array.isArray(raw.pages) && raw.pages.length > 0) {
    const page = raw.pages[0] as Record<string, unknown>;
    if (Array.isArray(page.elements)) {
      return {
        id,
        name: (raw.name as string) || '未命名模板',
        pages: (raw.pages as unknown[]).map((p) => {
          const pg = p as Record<string, unknown>;
          return {
            id: (pg.id as string) || generateId(),
            name: (pg.name as string) || '第1页',
            elements: (pg.elements as PrintElement[]) || [],
            visibilityConditions: pg.visibilityConditions as VisibilityCondition[] | undefined,
            visibilityLogic: (pg.visibilityLogic as 'all' | 'any') || 'all',
          };
        }),
        paperSize: (raw.paperSize as PaperSize) || 'A4',
        orientation: (raw.orientation as Orientation) || 'portrait',
        pageWidth: (raw.pageWidth as number) || 210,
        pageHeight: (raw.pageHeight as number) || 297,
        margins: (raw.margins as PageMargins) || { ...DEFAULT_PAGE_MARGINS },
        defaultFontSize: (raw.defaultFontSize as number) || DEFAULT_ELEMENT_FONT_SIZE,
        pinned: (raw.pinned as boolean) || false,
        createdAt: (raw.createdAt as number) || Date.now(),
        signatureAreas: (raw.signatureAreas as SignatureArea[]) || [],
        showHeader: (raw.showHeader as boolean) ?? false,
        showFooter: (raw.showFooter as boolean) ?? true,
        header: (raw.header as HeaderFooterConfig) || { ...DEFAULT_HEADER },
        footer: (raw.footer as HeaderFooterConfig) || { ...DEFAULT_FOOTER },
      };
    }
  }

  return migrateOldFieldsTemplate(raw, id);
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
