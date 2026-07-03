import { useState, useMemo } from 'react';
import { X, Search, CheckSquare, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

interface RecordWithId {
  id: string;
  record: Record<string, unknown>;
}

interface RecordSelectorProps {
  recordsWithIds: RecordWithId[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  titleField: string;
  onClose: () => void;
}

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object' && value !== null && 'text' in value) {
    return String((value as { text: unknown }).text ?? '');
  }
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'number') return String(value);
  return String(value);
}

function getRecordSummary(record: Record<string, unknown>, titleField: string): string {
  const titleValue = formatFieldValue(record[titleField]);
  if (titleValue) return titleValue;

  for (const key of Object.keys(record)) {
    const val = formatFieldValue(record[key]);
    if (val && val.length > 0 && val.length < 50) return val;
  }
  return '未命名记录';
}

const RecordSelector = ({
  recordsWithIds,
  selectedIds,
  onToggle,
  onSelectAll,
  onDeselectAll,
  titleField,
  onClose,
}: RecordSelectorProps) => {
  const [search, setSearch] = useState('');

  const filteredRecords = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return recordsWithIds;
    return recordsWithIds.filter(({ record }) => {
      for (const key of Object.keys(record)) {
        const val = formatFieldValue(record[key]).toLowerCase();
        if (val.includes(keyword)) return true;
      }
      return false;
    });
  }, [recordsWithIds, search]);

  const selectedCount = selectedIds.size;
  const totalCount = recordsWithIds.length;
  const isAllSelected = selectedCount === totalCount;

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-background">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card shrink-0">
        <span className="text-sm font-medium text-foreground flex-1 truncate">
          选择记录 ({selectedCount}/{totalCount})
        </span>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
          <X className="size-3.5" />
        </Button>
      </div>

      <div className="px-3 py-2 border-b border-border shrink-0">
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="搜索记录..."
            className="h-7 pl-7 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px] gap-1"
            onClick={isAllSelected ? onDeselectAll : onSelectAll}
          >
            {isAllSelected ? <Square className="size-3" /> : <CheckSquare className="size-3" />}
            {isAllSelected ? '取消全选' : '全选'}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        {filteredRecords.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-4">
            无匹配记录
          </div>
        ) : (
          <div className="space-y-1">
            {filteredRecords.map(({ id, record }, idx) => {
              const isChecked = selectedIds.has(id);
              const summary = getRecordSummary(record, titleField);
              return (
                <div
                  key={id}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                    isChecked ? 'bg-primary/5' : 'hover:bg-accent/50'
                  }`}
                  onClick={() => onToggle(id)}
                >
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={() => onToggle(id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="text-[10px] text-muted-foreground w-5 text-right shrink-0">
                    {idx + 1}
                  </span>
                  <span className="flex-1 text-xs text-foreground truncate">
                    {summary}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="px-3 py-2 border-t border-border bg-card shrink-0">
        <Button
          size="sm"
          className="w-full h-8 text-xs bg-primary text-primary-foreground"
          onClick={onClose}
        >
          确定 ({selectedCount} 条已选)
        </Button>
      </div>
    </div>
  );
};

export default RecordSelector;
