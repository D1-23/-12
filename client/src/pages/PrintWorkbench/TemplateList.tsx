import { useState, useMemo } from 'react';
import { Plus, Search, FileText, Table2, Trash2, Copy, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PrintTemplate, TemplateType } from '@/types/template';
import { TEMPLATE_TYPE_LABELS } from '@/types/template';

interface TemplateListProps {
  templates: PrintTemplate[];
  activeTemplateId: string | null;
  onSelect: (template: PrintTemplate) => void;
  onCreate: (name: string, type: TemplateType) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

const TemplateList = ({
  templates,
  activeTemplateId,
  onSelect,
  onCreate,
  onDelete,
  onDuplicate,
}: TemplateListProps) => {
  const [search, setSearch] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<TemplateType>('record');
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const list = keyword
      ? templates.filter((t) => t.name.toLowerCase().includes(keyword))
      : templates;
    return list.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.createdAt - a.createdAt;
    });
  }, [templates, search]);

  const recordTemplates = filtered.filter((t) => t.type === 'record');
  const viewTemplates = filtered.filter((t) => t.type === 'view');

  const handleCreate = () => {
    if (!newName.trim()) return;
    onCreate(newName.trim(), newType);
    setNewName('');
    setNewType('record');
    setShowCreateDialog(false);
  };

  const renderCard = (template: PrintTemplate) => {
    const isActive = template.id === activeTemplateId;
    const showActions = actionMenuId === template.id;

    return (
      <div
        key={template.id}
        className={`relative flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-colors ${
          isActive
            ? 'bg-primary/10 border border-primary/30'
            : 'bg-card border border-transparent hover:bg-accent hover:border-border'
        }`}
        onClick={() => onSelect(template)}
      >
        <div className="shrink-0">
          {template.type === 'record' ? (
            <FileText className="size-4 text-primary" />
          ) : (
            <Table2 className="size-4 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground truncate">
            {template.name}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            {template.fields.length} 个字段 · {new Date(template.createdAt).toLocaleDateString('zh-CN')}
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="size-6 p-0 shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            setActionMenuId(showActions ? null : template.id);
          }}
        >
          <span className="text-muted-foreground text-xs">···</span>
        </Button>

        {showActions && (
          <div className="absolute right-0 top-full mt-1 z-30 bg-card border border-border rounded-md shadow-md py-1 min-w-[100px]">
            <button
              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-foreground hover:bg-accent"
              onClick={(e) => {
                e.stopPropagation();
                setActionMenuId(null);
                onDuplicate(template.id);
              }}
            >
              <Copy className="size-3" />
              复制
            </button>
            <button
              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10"
              onClick={(e) => {
                e.stopPropagation();
                setActionMenuId(null);
                onDelete(template.id);
              }}
            >
              <Trash2 className="size-3" />
              删除
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderGroup = (title: string, items: PrintTemplate[]) => (
    <div className="mb-3">
      <div className="text-xs font-medium text-muted-foreground px-1 mb-1.5 uppercase tracking-wide">
        {title} ({items.length})
      </div>
      <div className="space-y-1">
        {items.map(renderCard)}
        {items.length === 0 && (
          <div className="text-xs text-muted-foreground px-3 py-2 italic">
            暂无{title}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-3 pb-2 space-y-2 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">打印模板</h2>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs gap-1"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="size-3.5" />
            新建
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="搜索模板..."
            className="h-7 pl-7 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {renderGroup('记录模板', recordTemplates)}
        {renderGroup('视图模板', viewTemplates)}
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-[300px]">
          <DialogHeader>
            <DialogTitle className="text-sm">新建模板</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                模板名称
              </label>
              <Input
                placeholder="输入模板名称"
                className="h-8 text-xs"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                模板类型
              </label>
              <Select
                value={newType}
                onValueChange={(v) => setNewType(v as TemplateType)}
              >
                <SelectTrigger size="sm" className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="record">记录模板</SelectItem>
                  <SelectItem value="view">视图模板</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCreateDialog(false)}
            >
              取消
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={!newName.trim()}>
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TemplateList;
