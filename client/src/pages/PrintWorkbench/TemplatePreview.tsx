import { useCallback, useRef, useState, useMemo } from 'react';
import { ArrowLeft, Printer, Settings, ImageDown, CheckSquare, SlidersHorizontal, X, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { showToast } from '@/api/bitable';
import type { PrintTemplate } from '@/types/template';
import { mmToPx } from '@/types/template';
import PreviewCanvas, { type PreviewCanvasHandle } from './PreviewCanvas';
import FieldSettingsDialog from './FieldSettingsDialog';
import SignaturePad from './SignaturePad';
import type { SignatureArea } from '@/types/template';
import { generateId } from '@/types/template';

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
  onUpdateSignatures?: (areas: SignatureArea[]) => void;
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
  onUpdateSignatures,
}: TemplatePreviewProps) => {
  const previewRef = useRef<PreviewCanvasHandle>(null);
  const [batchMode, setBatchMode] = useState(false);
  const [showFieldDialog, setShowFieldDialog] = useState(false);
  const [batchDismissed, setBatchDismissed] = useState(false);
  const [signatureData, setSignatureData] = useState<Record<string, string>>({});
  const [signingArea, setSigningArea] = useState<{ recordIdx: number; areaId: string } | null>(null);
  const [sigEditMode, setSigEditMode] = useState(false);

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

  const signatureAreas = template.signatureAreas ?? [];

  const handleSign = useCallback((recordIdx: number, areaId: string) => {
    setSigningArea({ recordIdx, areaId });
  }, []);

  const handleSignConfirm = useCallback((dataUrl: string) => {
    if (!signingArea) return;
    const key = `${signingArea.recordIdx}_${signingArea.areaId}`;
    setSignatureData((prev) => ({ ...prev, [key]: dataUrl }));
    setSigningArea(null);
  }, [signingArea]);

  const handleMoveSig = useCallback((areaId: string, xMm: number, yMm: number) => {
    if (!onUpdateSignatures) return;
    const updated = signatureAreas.map((a) =>
      a.id === areaId ? { ...a, xMm, yMm } : a,
    );
    onUpdateSignatures(updated);
  }, [onUpdateSignatures, signatureAreas]);

  const handlePrint = useCallback(() => {
    const content = previewRef.current?.getContent();
    const printArea = document.getElementById('print-area');
    if (content && printArea) {
      printArea.innerHTML = content;
      const orientation = template.orientation === 'landscape' ? 'landscape' : 'portrait';
      const pageSize = template.paperSize === 'Custom' ? 'auto' : template.paperSize;
      const styleEl = document.createElement('style');
      styleEl.id = 'print-orientation';
      styleEl.textContent = `@media print { @page { size: ${pageSize} ${orientation}; margin: 0; } }`;
      document.head.appendChild(styleEl);
      window.print();
      document.head.removeChild(styleEl);
      printArea.innerHTML = '';
      void showToast('已打开打印对话框，可选择「另存为 PDF」或打印机', 'success');
    } else {
      void showToast('打印失败：无内容可打印', 'error');
    }
  }, [template]);

  const handleExportImage = useCallback(async () => {
    const content = previewRef.current?.getContent();
    if (!content) return;

    const pageWidthPx = Math.round(mmToPx(template.pageWidth));
    const pageHeightPx = Math.round(mmToPx(template.pageHeight));

    try {
      const { default: html2canvas } = await import('html2canvas');

      const container = document.createElement('div');
      container.style.cssText =
        `position:fixed;left:-9999px;top:0;width:${pageWidthPx}px;background:#fff;font-family:system-ui,-apple-system,sans-serif;`;
      container.innerHTML = content;

      const exportStyle = document.createElement('style');
      exportStyle.textContent = `
        .print-page table {
          border-collapse: collapse !important;
          width: 100% !important;
          table-layout: fixed !important;
        }
        .print-page col:first-child,
        .print-page col:nth-child(3) { width: 110px !important; }
        .print-page col:nth-child(2),
        .print-page col:nth-child(4) { width: auto !important; }
        .print-page td {
          border: 1px solid #333333 !important;
          padding: 3px 6px !important;
          font-size: 11px !important;
          line-height: 16px !important;
          vertical-align: top !important;
          word-break: break-word !important;
          overflow-wrap: break-word !important;
          background: #FFFFFF !important;
        }
        .print-page td:nth-child(odd) {
          width: 110px !important;
          font-weight: 600 !important;
          color: #000000 !important;
        }
        .print-page td:nth-child(even) {
          color: #1F2329 !important;
        }
        .print-page td[colspan] {
          font-weight: 600 !important;
          color: #000000 !important;
        }
      `;
      container.appendChild(exportStyle);
      document.body.appendChild(container);

      const pageElements = Array.from(
        container.querySelectorAll('.print-page'),
      ) as HTMLElement[];

      pageElements.forEach((el) => {
        el.style.height = `${pageHeightPx}px`;
        el.style.width = `${pageWidthPx}px`;
        el.style.marginBottom = '0';
      });

      const canvases: HTMLCanvasElement[] = [];
      for (const el of pageElements) {
        const canvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
        });
        canvases.push(canvas);
      }

      document.body.removeChild(container);

      const totalHeight = canvases.reduce((sum, c) => sum + c.height, 0);
      const merged = document.createElement('canvas');
      merged.width = canvases[0].width;
      merged.height = totalHeight;
      const ctx = merged.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context unavailable');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, merged.width, merged.height);

      let offsetY = 0;
      for (const c of canvases) {
        ctx.drawImage(c, 0, offsetY);
        offsetY += c.height;
      }

      const dateStr = new Date().toISOString().slice(0, 10);
      const blob: Blob = await new Promise((resolve, reject) => {
        merged.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error('toBlob failed'));
        }, 'image/png');
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${template.name}_${dateStr}.png`;
      a.click();
      URL.revokeObjectURL(url);

      void showToast('长图已生成', 'success');
    } catch (err) {
      logger.error('长图导出失败', String(err));
      void showToast('长图导出失败', 'error');
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

      <div className="flex-1 relative overflow-hidden flex flex-col">
        <PreviewCanvas
          ref={previewRef}
          records={displayRecords}
          enabledFields={template.fields}
          margin={template.margin}
          fontSize={template.fontSize}
          titleField={template.titleField}
          pageWidth={template.pageWidth}
          pageHeight={template.pageHeight}
          margins={template.margins}
          fieldTypes={fieldTypes}
          tableName={tableName}
          signatureAreas={signatureAreas}
          signatureData={signatureData}
          signatureEditMode={sigEditMode}
          showHeader={template.showHeader ?? false}
          showFooter={template.showFooter ?? false}
          header={template.header}
          footer={template.footer}
          onSign={handleSign}
          onMoveSig={handleMoveSig}
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
        {signatureAreas.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className={`h-7 px-2 text-xs gap-1 ${sigEditMode ? 'text-primary' : 'text-muted-foreground'}`}
            onClick={() => setSigEditMode((v) => !v)}
          >
            <PenLine className="size-3.5" />
            {sigEditMode ? '完成' : '签名'}
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs gap-1"
          onClick={handleExportImage}
          disabled={displayCount === 0 || template.fields.length === 0}
        >
          <ImageDown className="size-3.5" />
          长图
        </Button>
        <Button
          size="sm"
          className="h-7 px-3 text-xs gap-1 bg-primary text-primary-foreground"
          onClick={handlePrint}
          disabled={displayCount === 0 || template.fields.length === 0}
          data-ai-section-type="button"
        >
          <Printer className="size-3.5" />
          打印 / PDF
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

      <SignaturePad
        open={signingArea !== null}
        onClose={() => setSigningArea(null)}
        onConfirm={handleSignConfirm}
      />
    </div>
  );
};

export default TemplatePreview;
