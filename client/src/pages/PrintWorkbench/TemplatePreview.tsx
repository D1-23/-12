import { useCallback, useRef } from 'react';
import { ArrowLeft, Printer, Settings, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { PrintTemplate } from '@/types/template';
import { TEMPLATE_TYPE_LABELS } from '@/types/template';
import PreviewCanvas, { type PreviewCanvasHandle } from './PreviewCanvas';

interface TemplatePreviewProps {
  template: PrintTemplate;
  records: Array<Record<string, unknown>>;
  onBack: () => void;
  onEdit: () => void;
}

const TemplatePreview = ({
  template,
  records,
  onBack,
  onEdit,
}: TemplatePreviewProps) => {
  const previewRef = useRef<PreviewCanvasHandle>(null);

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

    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      const container = document.createElement('div');
      container.style.cssText =
        'position:fixed;left:-9999px;top:0;width:794px;background:#fff;';
      container.innerHTML = content;
      document.body.appendChild(container);

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      document.body.removeChild(container);

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const dateStr = new Date().toISOString().slice(0, 10);
      pdf.save(`${template.name}_${dateStr}.pdf`);
    } catch (err) {
      logger.error('PDF导出失败', String(err));
    }
  }, [template.name]);

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
          onClick={onEdit}
        >
          <Settings className="size-3.5" />
          配置
        </Button>
      </div>

      <PreviewCanvas
        ref={previewRef}
        records={records}
        enabledFields={template.fields}
        margin={template.margin}
        fontSize={template.fontSize}
        mode={template.type}
        titleField={template.titleField}
      />

      {records.length === 0 && (
        <div className="px-2 py-1.5 text-[10px] text-warning bg-warning/10 text-center leading-relaxed">
          暂无数据，请在多维表格中添加记录。
        </div>
      )}

      <div className="flex items-center gap-2 px-3 py-2 border-t border-border bg-card shrink-0">
        <span className="text-[11px] text-muted-foreground truncate flex-1">
          {template.fields.length} 个字段 · {records.length} 条记录
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs gap-1"
          onClick={handleExportPdf}
          disabled={records.length === 0 || template.fields.length === 0}
        >
          <FileDown className="size-3.5" />
          PDF
        </Button>
        <Button
          size="sm"
          className="h-7 px-3 text-xs gap-1 bg-primary text-primary-foreground"
          onClick={handlePrint}
          disabled={records.length === 0 || template.fields.length === 0}
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

export default TemplatePreview;
