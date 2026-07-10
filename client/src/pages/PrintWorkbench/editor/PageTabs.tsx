import { Plus, MoreVertical, Eye, EyeOff } from 'lucide-react';
import type { TemplatePage } from '@/types/template';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PageTabsProps {
  pages: TemplatePage[];
  currentPageId: string;
  onSelect: (pageId: string) => void;
  onAdd: () => void;
  onDelete: (pageId: string) => void;
  onDuplicate: (pageId: string) => void;
  onMoveUp: (pageId: string) => void;
  onMoveDown: (pageId: string) => void;
  onToggleVisibility: (pageId: string) => void;
}

const PageTabs = ({
  pages,
  currentPageId,
  onSelect,
  onAdd,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onToggleVisibility,
}: PageTabsProps) => {
  return (
    <div className="flex items-center gap-1 h-10 px-3 border-t border-border bg-card shrink-0 overflow-x-auto">
      {pages.map((page, idx) => {
        const isActive = page.id === currentPageId;
        const hasConditions = page.visibilityConditions && page.visibilityConditions.length > 0;
        return (
          <div
            key={page.id}
            onClick={() => onSelect(page.id)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md cursor-pointer text-xs transition-colors whitespace-nowrap ${
              isActive
                ? 'bg-primary/10 text-primary font-medium border border-primary/20'
                : 'text-muted-foreground hover:bg-accent border border-transparent'
            }`}
          >
            <span>{page.name || `第${idx + 1}页`}</span>
            {hasConditions && (
              <span title="有显隐条件">
                {page.visibilityConditions?.length ? (
                  <EyeOff className="size-3 text-amber-500" />
                ) : (
                  <Eye className="size-3" />
                )}
              </span>
            )}
            {pages.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="size-4 flex items-center justify-center rounded hover:bg-accent"
                  >
                    <MoreVertical className="size-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => onDuplicate(page.id)}>
                    复制页面
                  </DropdownMenuItem>
                  {idx > 0 && (
                    <DropdownMenuItem onClick={() => onMoveUp(page.id)}>
                      上移
                    </DropdownMenuItem>
                  )}
                  {idx < pages.length - 1 && (
                    <DropdownMenuItem onClick={() => onMoveDown(page.id)}>
                      下移
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => onToggleVisibility(page.id)}>
                    {hasConditions ? '编辑显隐条件' : '设置显隐条件'}
                  </DropdownMenuItem>
                  {pages.length > 1 && (
                    <DropdownMenuItem
                      onClick={() => onDelete(page.id)}
                      className="text-red-500"
                    >
                      删除页面
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        );
      })}
      <button
        onClick={onAdd}
        className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      >
        <Plus className="size-3.5" />
        新增
      </button>
    </div>
  );
};

export default PageTabs;
