import { formatFieldValue } from '../field-utils';

interface FieldTypeInfo {
  [fieldName: string]: number | undefined;
}

export function replaceVariables(
  text: string,
  record: Record<string, unknown> | undefined,
  fieldTypes?: FieldTypeInfo,
): string {
  if (!text || !record) return text;

  return text.replace(/\{\{([^}]+)\}\}/g, (match, fieldName: string) => {
    const trimmed = fieldName.trim();
    const value = record[trimmed];
    if (value === undefined || value === null) return '';
    const fieldType = fieldTypes?.[trimmed];
    return formatFieldValue(value, fieldType);
  });
}

export function hasVariables(text: string): boolean {
  return /\{\{[^}]+\}\}/.test(text);
}

export function extractVariableNames(text: string): string[] {
  const matches = text.match(/\{\{([^}]+)\}\}/g);
  if (!matches) return [];
  return matches.map((m) => m.replace(/\{\{|\}\}/g, '').trim());
}
