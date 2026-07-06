import { useState, useCallback, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Bold from '@tiptap/extension-bold';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import TextAlign from '@tiptap/extension-text-align';
import { ArrowLeft, Save, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { PrintTemplate, TableLayout, RowVisibilityRule } from '@/types/template';
import TableToolbar from './TableToolbar';

interface RecordWithId {
  id: string;
  record: Record<string, unknown>;
}

interface TableEditorProps {
  template: PrintTemplate;
  recordsWithIds: RecordWithId[];
  onSave: (template: PrintTemplate) => void;
  onBack: () => void;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object' && value !== null && 'value' in value) {
    return formatValue((value as { value: unknown }).value);
  }
  if (typeof value === 'object' && value !== null && 'text' in value) {
    return String((value as { text: unknown }).text ?? '');
  }
  if (typeof value === 'object' && value !== null && 'name' in value) {
    return String((value as { name: unknown }).name ?? '');
  }
  if (Array.isArray(value)) return value.map((v) => formatValue(v)).filter(Boolean).join(', ');
  return String(value);
}

function buildInitialContent(
  records: RecordWithId[],
  fields: string[],
  tableLayout?: TableLayout,
): string {
  if (tableLayout?.tableContent) return tableLayout.tableContent;
  const record = records[0]?.record ?? {};
  const rows = fields.map((f) => {
    const val = formatValue(record[f]) || '-';
    const escaped = val.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<tr><td data-field="${f}"><p>${escaped}</p></td></tr>`;
  }).join('');
  return `<table><tbody>${rows}</tbody></table>`;
}

function extractTableLayout(editor: ReturnType<typeof useEditor>): TableLayout | undefined {
  if (!editor) return undefined;
  const doc = editor.state.doc;
  const cellStyles: Record<string, { bg?: string; color?: string; align?: 'left' | 'center' | 'right'; bold?: boolean }> = {};
  const mergedCells: Array<{ row: number; col: number; rowSpan: number; colSpan: number }> = [];
  const colWidths: number[] = [];
  let rowIdx = 0;

  doc.forEach((node) => {
    if (node.type.name !== 'table') return;
    node.forEach((row) => {
      if (row.type.name !== 'tableRow') return;
      let colIdx = 0;
      row.forEach((cell) => {
        if (cell.type.name !== 'tableCell' && cell.type.name !== 'tableHeader') return;
        const attrs = cell.attrs;
        const style: typeof cellStyles[string] = {};
        if (attrs.backgroundColor) style.bg = attrs.backgroundColor;
        if (attrs.textColor) style.color = attrs.textColor;
        if (attrs.textAlign) style.align = attrs.textAlign;
        if (attrs.bold) style.bold = true;
        if (Object.keys(style).length > 0) {
          cellStyles[`${rowIdx}-${colIdx}`] = style;
        }
        if ((attrs.rowspan ?? 1) > 1 || (attrs.colspan ?? 1) > 1) {
          mergedCells.push({
            row: rowIdx,
            col: colIdx,
            rowSpan: attrs.rowspan ?? 1,
            colSpan: attrs.colspan ?? 1,
          });
        }
        colIdx += (attrs.colspan ?? 1);
      });
      rowIdx++;
    });
  });

  const firstRow = doc.firstChild?.firstChild;
  if (firstRow) {
    let colIdx = 0;
    firstRow.forEach((cell) => {
      const cw = cell.attrs.colwidth;
      colWidths[colIdx] = (Array.isArray(cw) && cw[0]) ? cw[0] : 0;
      colIdx++;
    });
  }

  const totalWidth = colWidths.reduce((a, b) => a + b, 0);
  const colWidthPcts = totalWidth > 0
    ? colWidths.map((w) => Math.round((w / totalWidth) * 100))
    : [];

  return {
    headerRows: 0,
    footerRows: 0,
    colWidths: colWidthPcts,
    rowVisibility: {},
    cellStyles,
    mergedCells,
    borders: { show: true, color: '#d1d5db' },
  };
}

const TableEditor = ({ template, recordsWithIds, onSave, onBack }: TableEditorProps) => {
  const [headerRows, setHeaderRows] = useState(template.tableLayout?.headerRows ?? 0);
  const [footerRows, setFooterRows] = useState(template.tableLayout?.footerRows ?? 0);
  const [rowVisibility, setRowVisibility] = useState<Record<number, RowVisibilityRule>>(
    template.tableLayout?.rowVisibility ?? {},
  );
  const [showRowDialog, setShowRowDialog] = useState(false);
  const [editingRowIdx, setEditingRowIdx] = useState(0);
  const [ruleField, setRuleField] = useState('');
  const [ruleOperator, setRuleOperator] = useState<RowVisibilityRule['operator']>('eq');
  const [ruleValue, setRuleValue] = useState('');

  const initialContent = useMemo(
    () => buildInitialContent(recordsWithIds, template.fields, template.tableLayout),
    [],
  );

  const editor = useEditor({
    extensions: [
      Document,
      Paragraph,
      Text,
      Bold,
      Table.configure({ resizable: true }),
      TableRow,
      TableCell.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            backgroundColor: { default: null, parseHTML: (el: HTMLElement) => el.getAttribute('data-bg-color'), renderHTML: (attrs: Record<string, unknown>) => attrs.backgroundColor ? { 'data-bg-color': attrs.backgroundColor, style: `background-color: ${attrs.backgroundColor}` } : {} },
            textColor: { default: null, parseHTML: (el: HTMLElement) => el.getAttribute('data-text-color'), renderHTML: (attrs: Record<string, unknown>) => attrs.textColor ? { 'data-text-color': attrs.textColor, style: `color: ${attrs.textColor}` } : {} },
            textAlign: { default: null, parseHTML: (el: HTMLElement) => el.getAttribute('data-text-align'), renderHTML: (attrs: Record<string, unknown>) => attrs.textAlign ? { 'data-text-align': attrs.textAlign, style: `text-align: ${attrs.textAlign}` } : {} },
            bold: { default: false, parseHTML: (el: HTMLElement) => el.getAttribute('data-bold') === 'true', renderHTML: (attrs: Record<string, unknown>) => attrs.bold ? { 'data-bold': 'true', style: 'font-weight: bold' } : {} },
          };
        },
      }),
      TableHeader.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            backgroundColor: { default: '#f3f4f6', parseHTML: (el: HTMLElement) => el.getAttribute('data-bg-color'), renderHTML: (attrs: Record<string, unknown>) => attrs.backgroundColor ? { 'data-bg-color': attrs.backgroundColor, style: `background-color: ${attrs.backgroundColor}` } : {} },
            textColor: { default: null, parseHTML: (el: HTMLElement) => el.getAttribute('data-text-color'), renderHTML: (attrs: Record<string, unknown>) => attrs.textColor ? { 'data-text-color': attrs.textColor, style: `color: ${attrs.textColor}` } : {} },
            textAlign: { default: null, parseHTML: (el: HTMLElement) => el.getAttribute('data-text-align'), renderHTML: (attrs: Record<string, unknown>) => attrs.textAlign ? { 'data-text-align': attrs.textAlign, style: `text-align: ${attrs.textAlign}` } : {} },
            bold: { default: false, parseHTML: (el: HTMLElement) => el.getAttribute('data-bold') === 'true', renderHTML: (attrs: Record<string, unknown>) => attrs.bold ? { 'data-bold': 'true', style: 'font-weight: bold' } : {} },
          };
        },
      }),
      TextStyle,
      Color,
      TextAlign.configure({ types: ['paragraph', 'heading', 'tableCell', 'tableHeader'] }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'tiptap-table-editor',
      },
    },
  });

  const handleSave = useCallback(() => {
    if (!editor) return;
    const tableLayout = extractTableLayout(editor);
    if (tableLayout) {
      tableLayout.headerRows = headerRows;
      tableLayout.footerRows = footerRows;
      tableLayout.rowVisibility = rowVisibility;
      tableLayout.tableContent = editor.getHTML();
    }
    onSave({ ...template, tableLayout });
    onBack();
  }, [editor, template, headerRows, footerRows, rowVisibility, onSave, onBack]);

  const handleToggleHeader = useCallback(() => {
    setHeaderRows((prev) => (prev > 0 ? 0 : 1));
  }, []);

  const handleToggleFooter = useCallback(() => {
    setFooterRows((prev) => (prev > 0 ? 0 : 1));
  }, []);

  const openRowVisibility = useCallback((rowIdx: number) => {
    setEditingRowIdx(rowIdx);
    const existing = rowVisibility[rowIdx];
    setRuleField(existing?.field ?? '');
    setRuleOperator(existing?.operator ?? 'eq');
    setRuleValue(existing?.value ?? '');
    setShowRowDialog(true);
  }, [rowVisibility]);

  const confirmRowVisibility = useCallback(() => {
    if (!ruleField) {
      const next = { ...rowVisibility };
      delete next[editingRowIdx];
      setRowVisibility(next);
    } else {
      setRowVisibility({
        ...rowVisibility,
        [editingRowIdx]: { field: ruleField, operator: ruleOperator, value: ruleValue },
      });
    }
    setShowRowDialog(false);
  }, [editingRowIdx, ruleField, ruleOperator, ruleValue, rowVisibility]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card shrink-0">
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onBack}>
          <ArrowLeft className="size-3.5" />
        </Button>
        <span className="text-sm font-medium text-foreground flex-1 truncate">
          编辑表格
        </span>
        <Button size="sm" className="h-7 px-3 text-xs gap-1 bg-primary text-primary-foreground" onClick={handleSave}>
          <Save className="size-3.5" />
          保存
        </Button>
      </div>

      <TableToolbar
        editor={editor}
        headerRows={headerRows}
        footerRows={footerRows}
        onToggleHeader={handleToggleHeader}
        onToggleFooter={handleToggleFooter}
        onOpenRowVisibility={openRowVisibility}
      />

      <div className="flex-1 overflow-auto p-2 bg-background">
        <style dangerouslySetInnerHTML={{ __html: `
          .tiptap-table-editor {
            min-width: 320px;
            font-size: 13px;
          }
          .tiptap-table-editor table {
            border-collapse: collapse;
            width: 100%;
          }
          .tiptap-table-editor td,
          .tiptap-table-editor th {
            border: 1px solid #d1d5db;
            padding: 5px 10px;
            vertical-align: top;
            min-width: 60px;
            position: relative;
          }
          .tiptap-table-editor th {
            background-color: #f3f4f6;
            font-weight: 500;
          }
          .tiptap-table-editor .selectedCell {
            outline: 2px solid hsl(212, 100%, 45%);
            outline-offset: -2px;
          }
          .tiptap-table-editor p {
            margin: 0;
          }
        ` }} />
        <EditorContent editor={editor} />
      </div>

      <Dialog open={showRowDialog} onOpenChange={setShowRowDialog}>
        <DialogContent className="max-w-[320px]">
          <DialogHeader>
            <DialogTitle className="text-sm">行 {editingRowIdx + 1} 显隐条件</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={ruleField} onValueChange={setRuleField}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="选择字段" />
              </SelectTrigger>
              <SelectContent>
                {template.fields.map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={ruleOperator} onValueChange={(v) => setRuleOperator(v as RowVisibilityRule['operator'])}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="eq">等于</SelectItem>
                <SelectItem value="neq">不等于</SelectItem>
                <SelectItem value="empty">为空</SelectItem>
                <SelectItem value="notEmpty">非空</SelectItem>
              </SelectContent>
            </Select>
            {(ruleOperator === 'eq' || ruleOperator === 'neq') && (
              <input
                className="w-full h-8 px-2 text-xs border border-border rounded-md bg-background"
                value={ruleValue}
                onChange={(e) => setRuleValue(e.target.value)}
                placeholder="输入比较值"
              />
            )}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" onClick={() => setShowRowDialog(false)}>
                取消
              </Button>
              <Button size="sm" className="flex-1 h-7 text-xs bg-primary text-primary-foreground" onClick={confirmRowVisibility}>
                确定
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TableEditor;
