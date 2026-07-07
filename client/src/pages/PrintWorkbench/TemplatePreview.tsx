import { useCallback, useRef, useState, useMemo } from 'react';
import { ArrowLeft, Printer, Settings, FileDown, CheckSquare, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { PrintTemplate } from '@/types/template';
import { TEMPLATE_TYPE_LABELS, mmToPx } from '@/types/template';
import PreviewCanvas, { type PreviewCanvasHandle } from './PreviewCanvas';
import FieldSettingsDialog from './FieldSettingsDialog';

interface RecordWithId {
  id: string;
  record: Record<string, unknown>;
}

interface TemplatePreviewProps {
  template: PrintTemplate;
  recordsWithIds: RecordWithId[];
  selectedRecords: RecordWithId[];
  allFields: string[];
  fieldTypes: Record<string, number>;
  tableName: string;
  onBack: () => void;
  onEdit: () => void;
  onUpdateFields?: (fields: string[]) => void;
}

const TemplatePreview = ({
  template,
  recordsWithIds,
  selectedRecords,
  allFields,
  fieldTypes,
  tableName,
  onBack,
  onEdit,
  onUpdateFields,
}: TemplatePreviewProps) => {
  const previewRef = useRef<PreviewCanvasHandle>(null);
  const [batchMode, setBatchMode] = useState(false);
  const [showFieldDialog, setShowFieldDialog] = useState(false);
  const [batchDismissed, setBatchDismissed] = useState(false);

  const hasMultipleSelected = selectedRecords.length > 1;
  const showBatchPrompt = hasMultipleSelected && !batchMode && !batchDismissed;

  const displayRecords = useMemo(() => {
    if (batchMode && selectedRecords.length > 0) {
      return selectedRecords.map((r) => r.record);
    }
    return recordsWithIds.map((r) => r.record);
  }, [batchMode, selectedRecords, recordsWithIds]);

  const displayCount = displayRecords.length;

  const handleEnterBatch = useCallback(() => {
    setBatchMode(true);
    setBatchDismissed(false);
  }, []);

  const handleDismissBatch = useCallback(() => {
    setBatchDismissed(true);
  }, []);

  const handleExitBatch = useCallback(() => {
    setBatchMode(false);
    setBatchDismissed(false);
  }, []);

  const handlePrint = useCallback(() => {
    const content = previewRef.current?.getContent();
    const printArea = document.getElementById('print-area');
    if (content && printArea) {
      printArea.innerHTML = content;
      window.print();
      printArea.innerHTML = '';
    }
  }, []);

  const handleExportPdf = useCallback(async () => {
    const content = previewRef.current?.getContent();
    if (!content) return;

    const pageWidthPx = Math.round(mmToPx(template.pageWidth));
    const marginArr = [
      template.margins.top,
      template.margins.right,
      template.margins.bottom,
      template.margins.left,
    ];

    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      (window as unknown as Record<string, unknown>).html2canvas = html2canvas;

      const iframe = document.createElement('iframe');
      iframe.style.cssText =
        `position:fixed;left:-9999px;top:0;width:${pageWidthPx}px;height:${pageWidthPx * 4}px;border:none;visibility:hidden;`;
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument!;
      iframeDoc.open();
      iframeDoc.write(`<!DOCTYPE html><html><head><style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{width:${pageWidthPx}px;background:#fff;font-family:system-ui,-apple-system,sans-serif}
        .print-page{width:auto !important;padding:0 !important;margin:0 !important;margin-bottom:0 !important;box-shadow:none !important;border-radius:0 !important;overflow:visible !important}
        tr{break-inside:avoid;page-break-inside:avoid}
        table{break-inside:auto}
        thead{display:table-header-group}
      </style></head><body>${content}</body></html>`);
      iframeDoc.close();

      await new Promise<void>((resolve) => {
        const check = () => {
          if (iframeDoc.readyState === 'complete') resolve();
          else setTimeout(check, 50);
        };
        check();
      });

      const pageElements = Array.from(
        iframeDoc.querySelectorAll('.print-page')
      ) as HTMLElement[];

      const pdf = new jsPDF({
        orientation: template.pageWidth > template.pageHeight ? 'l' : 'p',
        unit: 'mm',
        format: [template.pageWidth, template.pageHeight],
      });

      for (let i = 0; i < pageElements.length; i++) {
        if (i > 0) {
          pdf.addPage(
            [template.pageWidth, template.pageHeight],
            template.pageWidth > template.pageHeight ? 'l' : 'p',
          );
        }

        await pdf.html(pageElements[i], {
          margin: marginArr,
          autoPaging: 'text',
          html2canvas: { scale: 2, useCORS: true, logging: false },
        });
      }

      document.body.removeChild(iframe);

      const dateStr = new Date().toISOString().slice(0, 10);
      pdf.save(`${template.name}_${dateStr}.pdf`);
    } catch (err) {
      logger.error('PDF导出失败', String(err));
    }
  }, [template]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card shrink-0">
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onBack}>
          <ArrowLeft className="size-3.5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground truncate">
            {template.name}
          </div>
          <Badge variant="secondary" className="text-[10px] mt-0.5 px-1.5 py-0">
            {TEMPLATE_TYPE_LABELS[template.type]}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs gap-1"
          onClick={() => setShowFieldDialog(true)}
        >
          <SlidersHorizontal className="size-3.5" />
          编辑
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs gap-1"
          onClick={onEdit}
        >
          <Settings className="size-3.5" />
          配置
        </Button>
      </div>

      {showBatchPrompt && (
        <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border-b border-primary/20 shrink-0">
          <CheckSquare className="size-3.5 text-primary shrink-0" />
          <span className="text-xs text-primary flex-1 truncate">
            已选择 {selectedRecords.length} 条记录
          </span>
          <Button
            size="sm"
            className="h-6 px-2 text-[11px] bg-primary text-primary-foreground"
            onClick={handleEnterBatch}
          >
            批量预览
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground"
            onClick={handleDismissBatch}
          >
            <X className="size-3" />
          </Button>
        </div>
      )}

      <div className="flex-1 relative overflow-auto">
        <PreviewCanvas
          ref={previewRef}
          records={displayRecords}
          enabledFields={template.fields}
          margin={template.margin}
          fontSize={template.fontSize}
          mode={template.type}
          titleField={template.titleField}
          pageWidth={template.pageWidth}
          pageHeight={template.pageHeight}
          margins={template.margins}
          fieldTypes={fieldTypes}
          tableName={tableName}
        />
      </div>

      {displayCount === 0 && (
        <div className="px-2 py-1.5 text-[10px] text-warning bg-warning/10 text-center leading-relaxed">
          {recordsWithIds.length === 0
            ? '暂无数据，请在多维表格中添加记录。'
            : batchMode
              ? '未选择记录，请在多维表格中勾选记录。'
              : '请在多维表格中点击选择一条记录。'}
        </div>
      )}

      <div className="flex items-center gap-2 px-3 py-2 border-t border-border bg-card shrink-0">
        <span className="text-[11px] text-muted-foreground truncate flex-1">
          {template.fields.length} 个字段 · {batchMode
            ? `${selectedRecords.length} 条记录`
            : `${recordsWithIds.length > 0 ? 1 : 0} 条记录`}
        </span>
        {batchMode && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1 text-muted-foreground"
            onClick={handleExitBatch}
          >
            <X className="size-3.5" />
            退出批量
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs gap-1"
          onClick={handleExportPdf}
          disabled={displayCount === 0 || template.fields.length === 0}
        >
          <FileDown className="size-3.5" />
          PDF
        </Button>
        <Button
          size="sm"
          className="h-7 px-3 text-xs gap-1 bg-primary text-primary-foreground"
          onClick={handlePrint}
          disabled={displayCount === 0 || template.fields.length === 0}
          data-ai-section-type="button"
        >
          <Printer className="size-3.5" />
          打印
        </Button>
      </div>

      <div id="print-area" className="hidden" />

      <FieldSettingsDialog
        open={showFieldDialog}
        onOpenChange={setShowFieldDialog}
        allFields={allFields}
        enabledFields={template.fields}
        onConfirm={(fields) => onUpdateFields?.(fields)}
      />
    </div>
  );
};

export default TemplatePreview;
