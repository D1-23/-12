import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { ArrowLeft, Printer, Settings, FileDown, CheckSquare, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { PrintTemplate } from '@/types/template';
import { TEMPLATE_TYPE_LABELS, mmToPx } from '@/types/template';
import PreviewCanvas, { type PreviewCanvasHandle } from './PreviewCanvas';
import RecordSelector from './RecordSelector';
import FieldSettingsDialog from './FieldSettingsDialog';

interface RecordWithId {
  id: string;
  record: Record<string, unknown>;
}

interface TemplatePreviewProps {
  template: PrintTemplate;
  recordsWithIds: RecordWithId[];
  allRecords: RecordWithId[];
  allFields: string[];
  recordsLoading: boolean;
  onLoadAllRecords: () => void;
  onBack: () => void;
  onEdit: () => void;
  onUpdateFields?: (fields: string[]) => void;
}

const TemplatePreview = ({
  template,
  recordsWithIds,
  allRecords,
  allFields,
  recordsLoading,
  onLoadAllRecords,
  onBack,
  onEdit,
  onUpdateFields,
}: TemplatePreviewProps) => {
  const previewRef = useRef<PreviewCanvasHandle>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(recordsWithIds.map((r) => r.id))
  );
  const [showSelector, setShowSelector] = useState(false);
  const [showFieldDialog, setShowFieldDialog] = useState(false);
  const hasInitSelectedRef = useRef(false);

  useEffect(() => {
    if (!hasInitSelectedRef.current && recordsWithIds.length > 0) {
      hasInitSelectedRef.current = true;
      setSelectedIds(new Set(recordsWithIds.map((r) => r.id)));
    }
  }, [recordsWithIds]);

  const filteredRecords = useMemo(
    () => recordsWithIds.filter((r) => selectedIds.has(r.id)).map((r) => r.record),
    [recordsWithIds, selectedIds]
  );

  const handleToggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(recordsWithIds.map((r) => r.id)));
  }, [recordsWithIds]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
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
    const pageHeightPx = Math.round(mmToPx(template.pageHeight));

    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      const iframe = document.createElement('iframe');
      iframe.style.cssText =
        `position:fixed;left:-9999px;top:0;width:${pageWidthPx}px;height:5000px;border:none;visibility:hidden;`;
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument!;
      iframeDoc.open();
      iframeDoc.write(`<!DOCTYPE html><html><head><style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{width:${pageWidthPx}px;background:#fff;font-family:system-ui,-apple-system,sans-serif}
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
        const el = pageElements[i];

        const canvas = await html2canvas(el as HTMLElement, {
          scale: 2,
          useCORS: true,
          logging: false,
          width: pageWidthPx,
          height: pageHeightPx,
          backgroundColor: '#ffffff',
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);

        if (i > 0) {
          pdf.addPage([template.pageWidth, template.pageHeight], template.pageWidth > template.pageHeight ? 'l' : 'p');
        }
        pdf.addImage(imgData, 'JPEG', 0, 0, template.pageWidth, template.pageHeight);
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

      <div className="flex-1 relative overflow-hidden">
        <PreviewCanvas
          ref={previewRef}
          records={filteredRecords}
          enabledFields={template.fields}
          margin={template.margin}
          fontSize={template.fontSize}
          mode={template.type}
          titleField={template.titleField}
          pageWidth={template.pageWidth}
          pageHeight={template.pageHeight}
          margins={template.margins}
        />
        {showSelector && (
          <RecordSelector
            recordsWithIds={allRecords.length > 0 ? allRecords : recordsWithIds}
            selectedIds={selectedIds}
            onToggle={handleToggle}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            titleField={template.titleField}
            onClose={() => setShowSelector(false)}
            loading={recordsLoading}
          />
        )}
      </div>

      {filteredRecords.length === 0 && (
        <div className="px-2 py-1.5 text-[10px] text-warning bg-warning/10 text-center leading-relaxed">
          {recordsWithIds.length === 0
            ? '暂无数据，请在多维表格中添加记录。'
            : '未选择记录，请点击下方按钮选择要打印的记录。'}
        </div>
      )}

      <div className="flex items-center gap-2 px-3 py-2 border-t border-border bg-card shrink-0">
        <span className="text-[11px] text-muted-foreground truncate flex-1">
          {template.fields.length} 个字段 · {selectedIds.size}/{recordsWithIds.length} 条记录
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs gap-1"
          onClick={() => {
            setShowSelector(true);
            onLoadAllRecords();
          }}
        >
          <CheckSquare className="size-3.5" />
          选择
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs gap-1"
          onClick={handleExportPdf}
          disabled={filteredRecords.length === 0 || template.fields.length === 0}
        >
          <FileDown className="size-3.5" />
          PDF
        </Button>
        <Button
          size="sm"
          className="h-7 px-3 text-xs gap-1 bg-primary text-primary-foreground"
          onClick={handlePrint}
          disabled={filteredRecords.length === 0 || template.fields.length === 0}
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
