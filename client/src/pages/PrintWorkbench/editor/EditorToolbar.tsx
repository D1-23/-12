import {
  ChevronLeft,
  Save,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Trash2,
  Undo2,
  Redo2,
  Plus,
  Minus,
} from 'lucide-react';
import type { PrintTemplate, PrintElement, TextElement, TableElement } from '@/types/template';
import { FONT_SIZE_OPTIONS } from '@/types/template';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface EditorToolbarProps {
  template: PrintTemplate;
  selectedElement: PrintElement | null;
  onBack: () => void;
  onNameChange: (name: string) => void;
  onElementChange: (element: PrintElement) => void;
  onAddPage: () => void;
  onClearPage: () => void;
  paperWidth: number;
  paperHeight: number;
}

const EditorToolbar = ({
  template,
  selectedElement,
  onBack,
  onNameChange,
  onElementChange,
  onClearPage,
}: EditorToolbarProps) => {
  const isTextElement = selectedElement?.type === 'text';
  const textEl = isTextElement ? (selectedElement as TextElement) : null;

  const updateText = (field: keyof TextElement, value: unknown) => {
    if (!textEl) return;
    onElementChange({ ...textEl, [field]: value } as TextElement);
  };

  return (
    <div className="flex items-center gap-2 h-12 px-3 border-b border-border bg-card shrink-0">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="size-4" />
        返回
      </button>

      <div className="w-px h-5 bg-border" />

      <input
        type="text"
        value={template.name}
        onChange={(e) => onNameChange(e.target.value)}
        className="text-sm font-medium bg-transparent outline-none border-0 px-1 py-0.5 rounded hover:bg-accent focus:bg-accent min-w-[80px] max-w-[160px]"
      />

      <div className="flex items-center gap-1 text-[10px] text-muted-foreground ml-1">
        <Save className="size-3" />
        <span>自动保存</span>
      </div>

      {textEl && (
        <>
          <div className="w-px h-5 bg-border mx-1" />

          <Select
            value={String(textEl.fontSize)}
            onValueChange={(v) => updateText('fontSize', Number(v))}
          >
            <SelectTrigger className="h-7 w-[60px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <button
            onClick={() => updateText('bold', !textEl.bold)}
            className={`size-7 flex items-center justify-center rounded hover:bg-accent ${
              textEl.bold ? 'bg-accent text-primary' : 'text-muted-foreground'
            }`}
            title="加粗"
          >
            <Bold className="size-3.5" />
          </button>

          <button
            onClick={() => updateText('italic', !textEl.italic)}
            className={`size-7 flex items-center justify-center rounded hover:bg-accent ${
              textEl.italic ? 'bg-accent text-primary' : 'text-muted-foreground'
            }`}
            title="斜体"
          >
            <Italic className="size-3.5" />
          </button>

          <button
            onClick={() => updateText('underline', !textEl.underline)}
            className={`size-7 flex items-center justify-center rounded hover:bg-accent ${
              textEl.underline ? 'bg-accent text-primary' : 'text-muted-foreground'
            }`}
            title="下划线"
          >
            <Underline className="size-3.5" />
          </button>

          <div className="w-px h-5 bg-border mx-1" />

          <button
            onClick={() => updateText('align', 'left')}
            className={`size-7 flex items-center justify-center rounded hover:bg-accent ${
              textEl.align === 'left' ? 'bg-accent text-primary' : 'text-muted-foreground'
            }`}
            title="左对齐"
          >
            <AlignLeft className="size-3.5" />
          </button>
          <button
            onClick={() => updateText('align', 'center')}
            className={`size-7 flex items-center justify-center rounded hover:bg-accent ${
              textEl.align === 'center' ? 'bg-accent text-primary' : 'text-muted-foreground'
            }`}
            title="居中"
          >
            <AlignCenter className="size-3.5" />
          </button>
          <button
            onClick={() => updateText('align', 'right')}
            className={`size-7 flex items-center justify-center rounded hover:bg-accent ${
              textEl.align === 'right' ? 'bg-accent text-primary' : 'text-muted-foreground'
            }`}
            title="右对齐"
          >
            <AlignRight className="size-3.5" />
          </button>
          <button
            onClick={() => updateText('align', 'justify')}
            className={`size-7 flex items-center justify-center rounded hover:bg-accent ${
              textEl.align === 'justify' ? 'bg-accent text-primary' : 'text-muted-foreground'
            }`}
            title="两端对齐"
          >
            <AlignJustify className="size-3.5" />
          </button>

          <div className="w-px h-5 bg-border mx-1" />

          <label className="flex items-center gap-1 text-[10px] text-muted-foreground cursor-pointer">
            文字
            <input
              type="color"
              value={textEl.color}
              onChange={(e) => updateText('color', e.target.value)}
              className="size-5 rounded cursor-pointer border border-border"
            />
          </label>
          <label className="flex items-center gap-1 text-[10px] text-muted-foreground cursor-pointer">
            背景
            <input
              type="color"
              value={textEl.backgroundColor}
              onChange={(e) => updateText('backgroundColor', e.target.value)}
              className="size-5 rounded cursor-pointer border border-border"
            />
          </label>
        </>
      )}

      <div className="flex-1" />

      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        {template.paperSize} {template.orientation === 'portrait' ? '纵向' : '横向'}
      </div>

      <div className="w-px h-5 bg-border" />

      <button
        onClick={onClearPage}
        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-error px-1.5 py-1 rounded hover:bg-accent transition-colors"
        title="清空当前页"
      >
        <Trash2 className="size-3" />
        清空
      </button>
    </div>
  );
};

export default EditorToolbar;
