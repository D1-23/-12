import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ListChecks } from 'lucide-react';

export type MarginOption = 'narrow' | 'standard' | 'wide';
export type FontSizeOption = 'small' | 'medium' | 'large';

export const MARGIN_LABELS: Record<MarginOption, string> = {
  narrow: '窄',
  standard: '标准',
  wide: '宽',
};

export const FONT_SIZE_LABELS: Record<FontSizeOption, string> = {
  small: '小',
  medium: '中',
  large: '大',
};

interface ToolbarProps {
  margin: MarginOption;
  fontSize: FontSizeOption;
  allFields: string[];
  enabledFields: Record<string, boolean>;
  onMarginChange: (m: MarginOption) => void;
  onFontSizeChange: (s: FontSizeOption) => void;
  onToggleField: (field: string) => void;
}

const FONT_OPTIONS: FontSizeOption[] = ['small', 'medium', 'large'];

const Toolbar = ({
  margin,
  fontSize,
  allFields,
  enabledFields,
  onMarginChange,
  onFontSizeChange,
  onToggleField,
}: ToolbarProps) => {
  const [fieldsOpen, setFieldsOpen] = useState(false);
  const enabledCount = allFields.filter((f) => enabledFields[f]).length;

  return (
    <div className="relative flex items-center gap-1.5 px-2 py-1.5 border-b border-border bg-card">
      <Select
        value={margin}
        onValueChange={(v) => onMarginChange(v as MarginOption)}
      >
        <SelectTrigger size="sm" className="h-7 text-xs w-[72px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(MARGIN_LABELS) as MarginOption[]).map((key) => (
            <SelectItem key={key} value={key}>
              {MARGIN_LABELS[key]}边距
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center rounded-md border border-border overflow-hidden h-7">
        {FONT_OPTIONS.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onFontSizeChange(opt)}
            className={`px-2 text-xs h-full transition-colors ${
              fontSize === opt
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-muted-foreground hover:bg-accent'
            }`}
          >
            {FONT_SIZE_LABELS[opt]}
          </button>
        ))}
      </div>

      <Collapsible open={fieldsOpen} onOpenChange={setFieldsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-1.5 text-xs gap-1 ml-auto"
          >
            <ListChecks className="size-3.5" />
            <span>{enabledCount}字段</span>
            <ChevronDown
              className={`size-3 transition-transform ${
                fieldsOpen ? 'rotate-180' : ''
              }`}
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="absolute left-0 right-0 top-full z-20 bg-card border-b border-border shadow-sm max-h-40 overflow-y-auto px-2 py-1.5">
            {allFields.map((field) => (
              <label
                key={field}
                className="flex items-center gap-2 py-1 cursor-pointer hover:bg-accent rounded px-1"
              >
                <Checkbox
                  checked={enabledFields[field] ?? true}
                  onCheckedChange={() => onToggleField(field)}
                />
                <span className="text-xs text-foreground truncate">
                  {field}
                </span>
              </label>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default Toolbar;
