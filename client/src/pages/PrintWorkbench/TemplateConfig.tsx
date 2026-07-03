import { useState, useEffect } from 'react';
import {
  ChevronUp,
  ChevronDown,
  ArrowLeft,
  Save,
  CheckSquare,
  Square,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PrintTemplate, MarginOption, FontSizeOption, TemplateType } from '@/types/template';
import {
  MARGIN_LABELS,
  FONT_SIZE_LABELS,
  TEMPLATE_TYPE_LABELS,
} from '@/types/template';

interface TemplateConfigProps {
  template: PrintTemplate;
  allFields: string[];
  onSave: (updated: PrintTemplate) => void;
  onBack: () => void;
}

const FONT_OPTIONS: FontSizeOption[] = ['small', 'medium', 'large'];

const TemplateConfig = ({
  template,
  allFields,
  onSave,
  onBack,
}: TemplateConfigProps) => {
  const [draft, setDraft] = useState<PrintTemplate>({ ...template });

  useEffect(() => {
    setDraft({ ...template });
  }, [template.id]);

  const enabledSet = new Set(draft.fields);
  const disabledFields = allFields.filter((f) => !enabledSet.has(f));

  const toggleField = (field: string) => {
    setDraft((prev) => {
      const has = prev.fields.includes(field);
      return {
        ...prev,
        fields: has
          ? prev.fields.filter((f) => f !== field)
          : [...prev.fields, field],
      };
    });
  };

  const selectAll = () => {
    setDraft((prev) => ({ ...prev, fields: [...allFields] }));
  };

  const deselectAll = () => {
    setDraft((prev) => ({ ...prev, fields: [] }));
  };

  const moveUp = (idx: number) => {
    if (idx <= 0) return;
    setDraft((prev) => {
      const fields = [...prev.fields];
      [fields[idx - 1], fields[idx]] = [fields[idx], fields[idx - 1]];
      return { ...prev, fields };
    });
  };

  const moveDown = (idx: number) => {
    setDraft((prev) => {
      if (idx >= prev.fields.length - 1) return prev;
      const fields = [...prev.fields];
      [fields[idx], fields[idx + 1]] = [fields[idx + 1], fields[idx]];
      return { ...prev, fields };
    });
  };

  const handleSave = () => {
    onSave(draft);
    onBack();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card shrink-0">
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onBack}>
          <ArrowLeft className="size-3.5" />
        </Button>
        <span className="text-sm font-medium text-foreground flex-1 truncate">
          编辑配置
        </span>
        <Button
          size="sm"
          className="h-7 px-3 text-xs gap-1 bg-primary text-primary-foreground"
          onClick={handleSave}
        >
          <Save className="size-3" />
          保存
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            模板名称
          </label>
          <Input
            className="h-8 text-xs"
            value={draft.name}
            onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            模板类型
          </label>
          <Select
            value={draft.type}
            onValueChange={(v) =>
              setDraft((prev) => ({ ...prev, type: v as TemplateType }))
            }
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

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">
              边距
            </label>
            <Select
              value={draft.margin}
              onValueChange={(v) =>
                setDraft((prev) => ({ ...prev, margin: v as MarginOption }))
              }
            >
              <SelectTrigger size="sm" className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(MARGIN_LABELS) as MarginOption[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {MARGIN_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">
              字号
            </label>
            <div className="flex items-center rounded-md border border-border overflow-hidden h-8">
              {FONT_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setDraft((prev) => ({ ...prev, fontSize: opt }))}
                  className={`flex-1 text-xs h-full transition-colors ${
                    draft.fontSize === opt
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {FONT_SIZE_LABELS[opt]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {draft.fields.length > 0 && (
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              标题字段
            </label>
            <Select
              value={draft.titleField}
              onValueChange={(v) =>
                setDraft((prev) => ({ ...prev, titleField: v }))
              }
            >
              <SelectTrigger size="sm" className="h-8 text-xs">
                <SelectValue placeholder="选择标题字段" />
              </SelectTrigger>
              <SelectContent>
                {draft.fields.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-muted-foreground">
              字段选择 ({draft.fields.length}/{allFields.length})
            </label>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px]"
                onClick={selectAll}
              >
                全选
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px]"
                onClick={deselectAll}
              >
                取消
              </Button>
            </div>
          </div>

          <div className="border border-border rounded-md divide-y divide-border">
            {draft.fields.map((field, idx) => (
              <div
                key={field}
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent/50"
              >
                <Checkbox
                  checked
                  onCheckedChange={() => toggleField(field)}
                />
                <span className="flex-1 text-xs text-foreground truncate">
                  {field}
                </span>
                <button
                  type="button"
                  className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  disabled={idx === 0}
                  onClick={() => moveUp(idx)}
                >
                  <ChevronUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  disabled={idx === draft.fields.length - 1}
                  onClick={() => moveDown(idx)}
                >
                  <ChevronDown className="size-3.5" />
                </button>
              </div>
            ))}

            {disabledFields.map((field) => (
              <div
                key={field}
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent/50"
              >
                <Checkbox
                  checked={false}
                  onCheckedChange={() => toggleField(field)}
                />
                <span className="flex-1 text-xs text-muted-foreground truncate">
                  {field}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateConfig;
