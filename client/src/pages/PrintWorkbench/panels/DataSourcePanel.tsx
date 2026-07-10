import { useState } from 'react';
import { Search, Copy, Variable } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface DataSourcePanelProps {
  allFields: string[];
  fieldTypes?: Record<string, number>;
  onCopyVariable?: (varName: string) => void;
  onDragVariable?: (varName: string) => void;
}

const FIELD_TYPE_ICONS: Record<string, string> = {
  text: 'Aa',
  number: '#',
  date: '📅',
  select: '◉',
  checkbox: '☑',
  attachment: '📎',
  link: '🔗',
  user: '👤',
  formula: 'ƒ',
};

function getTypeLabel(type: number | undefined): string {
  if (type === undefined) return 'text';
  const map: Record<number, string> = {
    1: 'text',
    2: 'number',
    3: 'select',
    4: 'datetime',
    5: 'date',
    7: 'checkbox',
    11: 'user',
    13: 'phone',
    15: 'url',
    17: 'attachment',
    18: 'link',
    19: 'formula',
    20: 'duplink',
    21: 'location',
    22: 'group',
    1001: 'ctime',
    1002: 'mtime',
    1003: 'createdby',
    1004: 'modifiedby',
    1005: 'autonumber',
  };
  return map[type] || 'text';
}

const DataSourcePanel = ({
  allFields,
  onCopyVariable,
  onDragVariable,
}: DataSourcePanelProps) => {
  const [search, setSearch] = useState('');

  const filtered = allFields.filter((f) =>
    f.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b border-border">
        <div className="flex items-center gap-1 mb-2">
          <Variable className="size-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">数据源</span>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索字段"
            className="h-7 pl-7 text-xs"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-1">
        {filtered.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-4">
            暂无字段
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {filtered.map((field) => {
              const varName = `{{${field}}}`;
              return (
                <div
                  key={field}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/variable', field);
                    onDragVariable?.(field);
                  }}
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-accent cursor-grab active:cursor-grabbing group"
                >
                  <span className="text-[10px] text-muted-foreground font-mono w-5 text-center shrink-0">
                    {FIELD_TYPE_ICONS[getTypeLabel(undefined)] || 'Aa'}
                  </span>
                  <span className="text-xs text-foreground flex-1 truncate">{field}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCopyVariable?.(field);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    title="复制变量"
                  >
                    <Copy className="size-3 text-muted-foreground hover:text-foreground" />
                  </button>
                  <code className="text-[10px] text-primary bg-primary/5 px-1 py-0.5 rounded shrink-0">
                    {varName}
                  </code>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DataSourcePanel;
