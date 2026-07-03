import { useState, useEffect, useCallback, useRef } from 'react';
import { Printer, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { bitable } from '@/api';
import Toolbar, {
  MARGIN_LABELS,
  FONT_SIZE_LABELS,
  type MarginOption,
  type FontSizeOption,
} from './Toolbar';
import PreviewCanvas, { type PreviewCanvasHandle } from './PreviewCanvas';

const SAMPLE_RECORDS: Array<Record<string, unknown>> = [
  {
    '客户名称': { text: '张三科技有限公司' },
    '拜访日期': 1719792000000,
    '跟进要点': { text: '讨论了Q3大客户回访计划，客户对新方案表示认可，希望在下周安排一次技术评审会议。' },
    '联系人': { text: '李经理' },
    '联系电话': '13800138000',
    '预算金额': 150000,
    '状态': '进行中',
    '下次拜访': 1720396800000,
    '备注': { text: '需要准备详细的技术方案文档，包含系统架构和实施时间表。' },
  },
];

const PrintWorkbench = () => {
  const [margin, setMargin] = useState<MarginOption>('standard');
  const [fontSize, setFontSize] = useState<FontSizeOption>('medium');
  const [allFields, setAllFields] = useState<string[]>([]);
  const [enabledFields, setEnabledFields] = useState<Record<string, boolean>>({});
  const [records, setRecords] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [pluginAvailable, setPluginAvailable] = useState(true);
  const previewRef = useRef<PreviewCanvasHandle>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        if (bitable.isPluginConfigured()) {
          const result = await bitable.searchRecords({ pageSize: 10 });
          const mapped = result.records.map((r) => r.record);
          setRecords(mapped.length > 0 ? mapped : SAMPLE_RECORDS);
        } else {
          setPluginAvailable(false);
          setRecords(SAMPLE_RECORDS);
        }
      } catch (err) {
        logger.error('加载数据失败', String(err));
        setPluginAvailable(false);
        setRecords(SAMPLE_RECORDS);
      }
      setLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (records.length > 0 && allFields.length === 0) {
      const fields = Object.keys(records[0]);
      setAllFields(fields);
      const initial: Record<string, boolean> = {};
      fields.forEach((f) => { initial[f] = true; });
      setEnabledFields(initial);
    }
  }, [records, allFields.length]);

  const toggleField = useCallback((field: string) => {
    setEnabledFields((prev) => ({ ...prev, [field]: !prev[field] }));
  }, []);

  const activeFieldList = allFields.filter((f) => enabledFields[f]);

  const handlePrint = useCallback(() => {
    const content = previewRef.current?.getContent();
    const printArea = document.getElementById('print-area');
    if (content && printArea) {
      printArea.innerHTML = content;
      window.print();
      printArea.innerHTML = '';
    }
  }, []);

  const enabledCount = activeFieldList.length;
  const summaryText = `${MARGIN_LABELS[margin]}边距 · ${FONT_SIZE_LABELS[fontSize]}字 · ${enabledCount}个字段`;

  if (records.length === 0 && !loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileText className="size-6" />
            </EmptyMedia>
            <EmptyTitle>暂无记录</EmptyTitle>
            <EmptyDescription>
              请在多维表格中选择要打印的记录
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Toolbar
        margin={margin}
        fontSize={fontSize}
        allFields={allFields}
        enabledFields={enabledFields}
        onMarginChange={setMargin}
        onFontSizeChange={setFontSize}
        onToggleField={toggleField}
      />

      <PreviewCanvas
        ref={previewRef}
        records={records}
        enabledFields={activeFieldList}
        margin={margin}
        fontSize={fontSize}
      />

      {!pluginAvailable && (
        <div className="px-2 py-1 text-[10px] text-warning bg-warning/10 text-center">
          多维表格未配置，当前显示示例数据
        </div>
      )}

      <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-card shrink-0">
        <span className="text-[11px] text-muted-foreground truncate max-w-[200px]">
          {summaryText}
        </span>
        <Button
          size="sm"
          className="bg-primary text-primary-foreground gap-1.5"
          onClick={handlePrint}
          disabled={loading || activeFieldList.length === 0}
          data-ai-section-type="button"
        >
          <Printer className="size-3.5" />
          打印
        </Button>
      </div>

      <div id="print-area" className="hidden" />
    </div>
  );
};

export default PrintWorkbench;
