import { useCallback, useRef, useState, useMemo } from 'react';
import { ArrowLeft, Printer, Settings, CheckSquare, SlidersHorizontal, X, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { showToast } from '@/api/bitable';
import type { PrintTemplate, FontSizeOption } from '@/types/template';
import type { BitableRecord } from '@/api/bitable';
import { FONT_SIZE_LABELS } from '@/types/template';
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
  manualRecords: BitableRecord[];
  onSelectRecords: () => void;
  onClearManual: () => void;
  allFields: string[];
  fieldTypes: Record<string, number>;
  tableName: string;
  onBack: () => void;
  onEdit: () => void;
  onUpdateFields?: (fields: string[]) => void;
  onUpdateSignatures?: (areas: SignatureArea[]) => void;
  onUpdateFontSize?: (fontSize: FontSizeOption) => void;
}

const TemplatePreview = ({
  template,
  recordsWithIds,
  selectedRecords,
  manualRecords,
  onSelectRecords,
  onClearManual,
  allFields,
  fieldTypes,
  tableName,
  onBack,
  onEdit,
  onUpdateFields,
  onUpdateSignatures,
  onUpdateFontSize,
}: TemplatePreviewProps) => {
  const previewRef = useRef<PreviewCanvasHandle>(null);
  const [batchMode, setBatchMode] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [showFieldDialog, setShowFieldDialog] = useState(false);
  const [batchDismissed, setBatchDismissed] = useState(false);
  const [signatureData, setSignatureData] = useState<Record<string, string>>({});
  const [signingArea, setSigningArea] = useState<{ recordIdx: number; areaId: string } | null>(null);
  const [sigEditMode, setSigEditMode] = useState(false);

  const hasMultipleSelected = selectedRecords.length > 1;
  const showBatchPrompt = hasMultipleSelected && !batchMode && !manualMode && !batchDismissed;

  const displayRecords = useMemo(() => {
    if (manualMode && manualRecords.length > 0) {
      return manualRecords.map((r) => r.record);
    }
    if (batchMode && selectedRecords.length > 0) {
      return selectedRecords.map((r) => r.record);
    }
    return recordsWithIds.map((r) => r.record);
  }, [manualMode, manualRecords, batchMode, selectedRecords, recordsWithIds]);

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

  const handleManualSelect = useCallback(() => {
    onSelectRecords();
    setManualMode(true);
  }, [onSelectRecords]);

  const handleExitManual = useCallback(() => {
    setManualMode(false);
    onClearManual();
  }, [onClearManual]);

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
        <div className="flex items-center rounded-md border border-border overflow-hidden h-7 shrink-0">
          {(['small', 'medium', 'large'] as FontSizeOption[]).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onUpdateFontSize?.(opt)}
              className={`px-1.5 text-[10px] h-full transition-colors ${
                template.fontSize === opt
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-muted-foreground hover:bg-accent'
              }`}
            >
              {FONT_SIZE_LABELS[opt]}
            </button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs gap-1"
          onClick={handleManualSelect}
        >
          <CheckSquare className="size-3.5" />
          批量选择
        </Button>
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

      {manualMode && manualRecords.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border-b border-primary/20 shrink-0">
          <CheckSquare className="size-3.5 text-primary shrink-0" />
          <span className="text-xs text-primary flex-1 truncate">
            已手动选择 {manualRecords.length} 条记录
          </span>
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
          showSignature={template.showSignature ?? true}
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
            : manualMode
              ? '未选择记录，请点击「批量选择」重新选取。'
              : batchMode
                ? '未选择记录，请在多维表格中勾选记录。'
                : '请在多维表格中点击选择一条记录。'}
        </div>
      )}

      <div className="flex items-center gap-2 px-3 py-2 border-t border-border bg-card shrink-0">
        <span className="text-[11px] text-muted-foreground truncate flex-1">
          {template.fields.length} 个字段 · {manualMode
            ? `${manualRecords.length} 条记录`
            : batchMode
              ? `${selectedRecords.length} 条记录`
              : `${recordsWithIds.length > 0 ? 1 : 0} 条记录`}
        </span>
        {manualMode && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1 text-muted-foreground"
            onClick={handleExitManual}
          >
            <X className="size-3.5" />
            退出批量
          </Button>
        )}
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
        {(template.showSignature ?? true) && signatureAreas.length > 0 && (
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
