import { useState, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

interface FieldSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allFields: string[];
  enabledFields: string[];
  onConfirm: (fields: string[]) => void;
}

interface FieldItem {
  name: string;
  enabled: boolean;
}

function SortableFieldItem({
  item,
  onToggle,
}: {
  item: FieldItem;
  onToggle: (name: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.name, disabled: !item.enabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-2 py-1.5 rounded transition-colors ${
        item.enabled
          ? 'bg-card hover:bg-accent/50'
          : 'bg-muted/30 opacity-60'
      }`}
    >
      <button
        type="button"
        className={`p-0.5 cursor-grab active:cursor-grabbing ${
          item.enabled
            ? 'text-muted-foreground hover:text-foreground'
            : 'text-muted-foreground/40 cursor-default'
        }`}
        {...(item.enabled ? { ...attributes, ...listeners } : {})}
        tabIndex={-1}
      >
        <GripVertical className="size-3.5" />
      </button>
      <Checkbox
        checked={item.enabled}
        onCheckedChange={() => onToggle(item.name)}
      />
      <span
        className={`flex-1 text-xs truncate ${
          item.enabled ? 'text-foreground' : 'text-muted-foreground'
        }`}
      >
        {item.name}
      </span>
    </div>
  );
}

const FieldSettingsDialog = ({
  open,
  onOpenChange,
  allFields,
  enabledFields,
  onConfirm,
}: FieldSettingsDialogProps) => {
  const [items, setItems] = useState<FieldItem[]>(() => {
    const enabledSet = new Set(enabledFields);
    const enabled: FieldItem[] = enabledFields.map((f) => ({
      name: f,
      enabled: true,
    }));
    const disabled: FieldItem[] = allFields
      .filter((f) => !enabledSet.has(f))
      .map((f) => ({ name: f, enabled: false }));
    return [...enabled, ...disabled];
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const enabledCount = useMemo(
    () => items.filter((i) => i.enabled).length,
    [items]
  );

  const handleToggle = (name: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.name === name);
      if (!target) return prev;

      if (!target.enabled) {
        const enabledPart = prev.filter((i) => i.enabled);
        const disabledPart = prev.filter(
          (i) => !i.enabled && i.name !== name
        );
        return [
          ...enabledPart,
          { name, enabled: true },
          ...disabledPart,
        ];
      }

      if (enabledCount <= 1) return prev;

      const enabledPart = prev.filter(
        (i) => i.enabled && i.name !== name
      );
      const disabledPart = prev.filter((i) => !i.enabled);
      return [
        ...enabledPart,
        { name, enabled: false },
        ...disabledPart,
      ];
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setItems((prev) => {
      const enabledPart = prev.filter((i) => i.enabled);
      const disabledPart = prev.filter((i) => !i.enabled);
      const oldIndex = enabledPart.findIndex((i) => i.name === active.id);
      const newIndex = enabledPart.findIndex((i) => i.name === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return [...arrayMove(enabledPart, oldIndex, newIndex), ...disabledPart];
    });
  };

  const handleConfirm = () => {
    const selected = items.filter((i) => i.enabled).map((i) => i.name);
    onConfirm(selected);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-sm">字段显示设置</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
          <span>已选 {enabledCount}/{allFields.length} 个字段</span>
        </div>

        <div className="overflow-y-auto flex-1 space-y-1 border border-border rounded-md p-1 max-h-[40vh]">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((i) => i.name)}
              strategy={verticalListSortingStrategy}
            >
              {items.map((item) => (
                <SortableFieldItem
                  key={item.name}
                  item={item}
                  onToggle={handleToggle}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={handleCancel}
          >
            取消
          </Button>
          <Button
            size="sm"
            className="h-7 text-xs bg-primary text-primary-foreground"
            onClick={handleConfirm}
            disabled={enabledCount === 0}
          >
            确定
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FieldSettingsDialog;
