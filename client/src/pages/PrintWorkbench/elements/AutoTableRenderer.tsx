import type { AutoTableElement } from '@/types/template';
import { mmToPx } from '@/types/template';
import { formatFieldValue } from '../field-utils';

interface AutoTableRendererProps {
  element: AutoTableElement;
  zoom: number;
  record?: Record<string, unknown>;
  fieldTypes?: Record<string, number>;
  editMode: boolean;
  onFieldToggle?: (fieldId: string) => void;
  availableFields?: string[];
}

const AutoTableRenderer = ({
  element,
  zoom,
  record,
  fieldTypes,
  editMode,
  onFieldToggle,
  availableFields,
}: AutoTableRendererProps) => {
  const widthPx = mmToPx(element.width) * zoom;

  if (editMode) {
    return (
      <div
        style={{ width: widthPx, minHeight: mmToPx(element.height) * zoom }}
        className="border border-dashed border-primary/40 rounded bg-primary/5 p-2"
      >
        <div className="text-[10px] text-muted-foreground mb-1">自动表格</div>
        <div className="flex flex-wrap gap-1">
          {(availableFields || []).map((field) => {
            const selected = element.selectedFieldIds.includes(field);
            return (
              <button
                key={field}
                onClick={() => onFieldToggle?.(field)}
                className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                  selected
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-foreground border-border hover:bg-accent'
                }`}
              >
                {field}
              </button>
            );
          })}
          {(!availableFields || availableFields.length === 0) && (
            <span className="text-[10px] text-muted-foreground">请选择字段</span>
          )}
        </div>
        <div className="text-[10px] text-muted-foreground mt-1">
          已选 {element.selectedFieldIds.length} 个字段
        </div>
      </div>
    );
  }

  const selectedFields = element.selectedFieldIds;
  if (selectedFields.length === 0) {
    return (
      <div
        style={{ width: widthPx }}
        className="text-[10px] text-muted-foreground text-center py-2 border border-dashed border-border rounded"
      >
        未选择字段
      </div>
    );
  }

  const halfIdx = Math.ceil(selectedFields.length / 2);
  const leftFields = selectedFields.slice(0, halfIdx);
  const rightFields = selectedFields.slice(halfIdx);

  const renderFieldRow = (field: string) => {
    const value = record?.[field];
    const formatted = value !== undefined ? formatFieldValue(value, fieldTypes?.[field]) : '';
    return (
      <tr key={field}>
        <td
          style={{
            fontSize: 12 * zoom,
            fontWeight: 500,
            color: '#6b7280',
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            padding: `${3 * zoom}px ${6 * zoom}px`,
            width: '30%',
            whiteSpace: 'nowrap',
          }}
        >
          {field}
        </td>
        <td
          style={{
            fontSize: 12 * zoom,
            color: '#111827',
            border: '1px solid #e5e7eb',
            padding: `${3 * zoom}px ${6 * zoom}px`,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {formatted}
        </td>
      </tr>
    );
  };

  return (
    <div style={{ width: widthPx }}>
      {leftFields.length > 0 && rightFields.length > 0 ? (
        <div className="flex gap-2">
          <table className="border-collapse flex-1" style={{ tableLayout: 'fixed' }}>
            <tbody>{leftFields.map(renderFieldRow)}</tbody>
          </table>
          <table className="border-collapse flex-1" style={{ tableLayout: 'fixed' }}>
            <tbody>{rightFields.map(renderFieldRow)}</tbody>
          </table>
        </div>
      ) : (
        <table className="border-collapse w-full" style={{ tableLayout: 'fixed' }}>
          <tbody>{selectedFields.map(renderFieldRow)}</tbody>
        </table>
      )}
    </div>
  );
};

export default AutoTableRenderer;
