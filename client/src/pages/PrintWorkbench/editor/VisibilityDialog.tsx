import { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import type { VisibilityCondition } from '@/types/template';

interface VisibilityDialogProps {
  open: boolean;
  onClose: () => void;
  conditions: VisibilityCondition[];
  logic: 'all' | 'any';
  allFields: string[];
  onConfirm: (conditions: VisibilityCondition[], logic: 'all' | 'any') => void;
}

const OPERATORS: { value: VisibilityCondition['operator']; label: string }[] = [
  { value: 'equals', label: '等于' },
  { value: 'not_equals', label: '不等于' },
  { value: 'greater', label: '大于' },
  { value: 'less', label: '小于' },
  { value: 'contains', label: '包含' },
];

const VisibilityDialog = ({
  open,
  onClose,
  conditions,
  logic,
  allFields,
  onConfirm,
}: VisibilityDialogProps) => {
  const [localConditions, setLocalConditions] = useState<VisibilityCondition[]>(conditions || []);
  const [localLogic, setLocalLogic] = useState<'all' | 'any'>(logic || 'all');

  useEffect(() => {
    if (open) {
      setLocalConditions(conditions || []);
      setLocalLogic(logic || 'all');
    }
  }, [open, conditions, logic]);

  const addCondition = () => {
    setLocalConditions([
      ...localConditions,
      { field: allFields[0] || '', operator: 'equals', value: '' },
    ]);
  };

  const removeCondition = (idx: number) => {
    setLocalConditions(localConditions.filter((_, i) => i !== idx));
  };

  const updateCondition = (idx: number, field: keyof VisibilityCondition, value: string) => {
    setLocalConditions(
      localConditions.map((c, i) => (i === idx ? { ...c, [field]: value } : c)),
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-sm">页面显隐条件</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">满足条件：</span>
            <Select value={localLogic} onValueChange={(v) => setLocalLogic(v as 'all' | 'any')}>
              <SelectTrigger className="h-7 w-[80px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="any">任一</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-muted-foreground">时显示此页</span>
          </div>

          {localConditions.length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-4">
              暂无条件，点击下方添加
            </div>
          )}

          {localConditions.map((cond, idx) => (
            <div key={idx} className="flex items-center gap-1">
              <Select
                value={cond.field}
                onValueChange={(v) => updateCondition(idx, 'field', v)}
              >
                <SelectTrigger className="h-7 flex-1 text-xs">
                  <SelectValue placeholder="选择字段" />
                </SelectTrigger>
                <SelectContent>
                  {allFields.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={cond.operator}
                onValueChange={(v) => updateCondition(idx, 'operator', v)}
              >
                <SelectTrigger className="h-7 w-[70px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPERATORS.map((op) => (
                    <SelectItem key={op.value} value={op.value}>
                      {op.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={cond.value}
                onChange={(e) => updateCondition(idx, 'value', e.target.value)}
                className="h-7 flex-1 text-xs"
                placeholder="值"
              />
              <button
                onClick={() => removeCondition(idx)}
                className="size-7 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-red-500 shrink-0"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}

          <button
            onClick={addCondition}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Plus className="size-3.5" />
            添加条件
          </button>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onClose}>
            取消
          </Button>
          <Button
            size="sm"
            className="h-7 text-xs bg-primary text-primary-foreground"
            onClick={() => {
              onConfirm(localConditions, localLogic);
              onClose();
            }}
          >
            确认
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VisibilityDialog;
