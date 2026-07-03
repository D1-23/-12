export type TemplateType = 'record' | 'view';
export type MarginOption = 'narrow' | 'standard' | 'wide';
export type FontSizeOption = 'small' | 'medium' | 'large';

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
