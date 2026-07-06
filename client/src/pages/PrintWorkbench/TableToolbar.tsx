import type { Editor } from '@tiptap/react';
import {
  Rows3,
  Columns3,
  Plus,
  Trash2,
  Merge,
  Split,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Eye,
  EyeOff,
  Square,
  Palette,
  Bold,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TableToolbarProps {
  editor: Editor | null;
  headerRows: number;
  footerRows: number;
  onToggleHeader: () => void;
  onToggleFooter: () => void;
  onOpenRowVisibility: (rowIdx: number) => void;
}

const COLORS = ['#ffffff', '#f3f4f6', '#dbeafe', '#dcfce7', '#fef3c7', '#fee2e2'];

const TableToolbar = ({
  editor,
  headerRows,
  footerRows,
  onToggleHeader,
  onToggleFooter,
  onOpenRowVisibility,
}: TableToolbarProps) => {
  if (!editor) return null;

  const btnClass = 'h-6 w-6 p-0';

  return (
    <div className="flex flex-wrap gap-0.5 px-2 py-1.5 border-b border-border bg-card shrink-0">
      <Button variant="ghost" size="sm" className={btnClass} title="上方插入行" onClick={() => editor.chain().focus().addRowBefore().run()}>
        <Plus className="size-3" />
        <Rows3 className="size-3 -ml-1" />
      </Button>
      <Button variant="ghost" size="sm" className={btnClass} title="下方插入行" onClick={() => editor.chain().focus().addRowAfter().run()}>
        <Plus className="size-3" />
        <Rows3 className="size-3 -ml-1 rotate-180" />
      </Button>
      <Button variant="ghost" size="sm" className={btnClass} title="删除行" onClick={() => editor.chain().focus().deleteRow().run()}>
        <Trash2 className="size-3" />
      </Button>

      <div className="w-px h-5 bg-border mx-0.5 self-center" />

      <Button variant="ghost" size="sm" className={btnClass} title="左侧插入列" onClick={() => editor.chain().focus().addColumnBefore().run()}>
        <Plus className="size-3" />
        <Columns3 className="size-3 -ml-1" />
      </Button>
      <Button variant="ghost" size="sm" className={btnClass} title="右侧插入列" onClick={() => editor.chain().focus().addColumnAfter().run()}>
        <Plus className="size-3" />
        <Columns3 className="size-3 -ml-1 rotate-180" />
      </Button>
      <Button variant="ghost" size="sm" className={btnClass} title="删除列" onClick={() => editor.chain().focus().deleteColumn().run()}>
        <Trash2 className="size-3" />
      </Button>

      <div className="w-px h-5 bg-border mx-0.5 self-center" />

      <Button variant="ghost" size="sm" className={btnClass} title="合并单元格" onClick={() => editor.chain().focus().mergeCells().run()}>
        <Merge className="size-3" />
      </Button>
      <Button variant="ghost" size="sm" className={btnClass} title="拆分单元格" onClick={() => editor.chain().focus().splitCell().run()}>
        <Split className="size-3" />
      </Button>

      <div className="w-px h-5 bg-border mx-0.5 self-center" />

      <Button variant="ghost" size="sm" className={btnClass} title="左对齐" onClick={() => editor.chain().focus().setTextAlign('left').run()}>
        <AlignLeft className="size-3" />
      </Button>
      <Button variant="ghost" size="sm" className={btnClass} title="居中" onClick={() => editor.chain().focus().setTextAlign('center').run()}>
        <AlignCenter className="size-3" />
      </Button>
      <Button variant="ghost" size="sm" className={btnClass} title="右对齐" onClick={() => editor.chain().focus().setTextAlign('right').run()}>
        <AlignRight className="size-3" />
      </Button>
      <Button variant="ghost" size="sm" className={btnClass} title="加粗" onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="size-3" />
      </Button>

      <div className="w-px h-5 bg-border mx-0.5 self-center" />

      <div className="flex items-center gap-0.5">
        <Palette className="size-3 text-muted-foreground" />
        {COLORS.map((c) => (
          <button
            key={c}
            className="w-4 h-4 rounded-sm border border-border/50 hover:scale-110 transition-transform"
            style={{ backgroundColor: c }}
            title={c}
            onClick={() => {
              editor.chain().focus().updateAttributes('tableCell', { backgroundColor: c }).run();
              editor.chain().focus().updateAttributes('tableHeader', { backgroundColor: c }).run();
            }}
          />
        ))}
      </div>

      <div className="w-px h-5 bg-border mx-0.5 self-center" />

      <Button
        variant={headerRows > 0 ? 'default' : 'ghost'}
        size="sm"
        className={`${btnClass} ${headerRows > 0 ? 'bg-primary/10 text-primary' : ''}`}
        title={headerRows > 0 ? '取消表头行' : '设为表头行'}
        onClick={onToggleHeader}
      >
        <Eye className="size-3" />
      </Button>
      <Button
        variant={footerRows > 0 ? 'default' : 'ghost'}
        size="sm"
        className={`${btnClass} ${footerRows > 0 ? 'bg-primary/10 text-primary' : ''}`}
        title={footerRows > 0 ? '取消表尾行' : '设为表尾行'}
        onClick={onToggleFooter}
      >
        <Square className="size-3" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={btnClass}
        title="行显隐"
        onClick={() => onOpenRowVisibility(0)}
      >
        <EyeOff className="size-3" />
      </Button>
    </div>
  );
};

export default TableToolbar;
