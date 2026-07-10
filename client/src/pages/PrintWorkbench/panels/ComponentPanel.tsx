import {
  Type,
  Table,
  ImageIcon,
  QrCode,
  Barcode,
  Minus,
  TableProperties,
} from 'lucide-react';
import type { ElementType } from '@/types/template';

interface ComponentItem {
  type: ElementType;
  label: string;
  icon: typeof Type;
  description: string;
}

const COMPONENTS: ComponentItem[] = [
  { type: 'text', label: '文本', icon: Type, description: '可编辑文本，支持字段变量' },
  { type: 'table', label: '表格', icon: Table, description: '自定义表格，支持合并/拆分' },
  { type: 'image', label: '图片', icon: ImageIcon, description: '静态图片或附件字段' },
  { type: 'qrcode', label: '二维码', icon: QrCode, description: '生成二维码，支持变量' },
  { type: 'barcode', label: '条形码', icon: Barcode, description: '生成条形码，支持变量' },
  { type: 'line', label: '水平线', icon: Minus, description: '分割线，虚线/实线/点线' },
  { type: 'auto-table', label: '自动表格', icon: TableProperties, description: '一键生成字段表格' },
];

interface ComponentPanelProps {
  onDragStart: (type: ElementType) => void;
}

const ComponentPanel = ({ onDragStart }: ComponentPanelProps) => {
  return (
    <div className="flex flex-col gap-1 p-2">
      <div className="text-[11px] font-medium text-muted-foreground px-1 py-1">
        拖动排版元素到右侧
      </div>
      {COMPONENTS.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.type}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('text/plain', item.type);
              onDragStart(item.type);
            }}
            className="flex items-center gap-2 px-2 py-2 rounded-md cursor-grab border border-border bg-card hover:bg-accent hover:border-primary/30 transition-colors active:cursor-grabbing"
          >
            <Icon className="size-4 text-primary shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium text-foreground">{item.label}</span>
              <span className="text-[10px] text-muted-foreground truncate">{item.description}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ComponentPanel;
