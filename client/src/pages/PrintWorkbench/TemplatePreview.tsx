import { useCallback, useRef, useState, useMemo } from 'react';
import { ArrowLeft, Printer, Settings, CheckSquare, SlidersHorizontal, X, PenLine, Copy, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { showToast } from '@/api/bitable';
import type { PrintTemplate, BatchPreviewMode } from '@/types/template';
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
  batchSelectMode: boolean;
  onBatchModeChange: (mode: boolean) => void;
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
  batchSelectMode,
  onBatchModeChange,
  allFields,
  fieldTypes,
  tableName,
  onBack,
  onEdit,
  onUpdateFields,
  onUpdateSignatures,
}: TemplatePreviewProps) => {
  const previewRef = useRef<PreviewCanvasHandle>(null);
  const [showFieldDialog, setShowFieldDialog] = useState(false);
  const [previewMode, setPreviewMode] = useState<BatchPreviewMode>(template.previewMode ?? 'default');
  const [continuousPageHeight, setContinuousPageHeight] = useState<number>(template.continuousPageHeight ?? 297);
  const [signatureData, setSignatureData] = useState<Record<string, string>>({});
  const [signingArea, setSigningArea] = useState<{ recordIdx: number; areaId: string } | null>(null);
  const [sigEditMode, setSigEditMode] = useState(false);

  const displayRecords = useMemo(() => {
    if (batchSelectMode && selectedRecords.length > 0) {
      return selectedRecords.map((r) => r.record);
    }
    const single = recordsWithIds[0] ?? selectedRecords[0];
    return single ? [single.record] : [];
  }, [batchSelectMode, selectedRecords, recordsWithIds]);

  const displayCount = displayRecords.length;
  const isBatchActive = batchSelectMode && displayCount > 1;

  const handleToggleBatch = useCallback(() => {
    onBatchModeChange(!batchSelectMode);
  }, [batchSelectMode, onBatchModeChange]);

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
      let pageStyle: string;
      if (isBatchActive && previewMode === 'continuous') {
        pageStyle = `@media print { @page { size: ${template.pageWidth}mm ${continuousPageHeight}mm; margin: 0; } }`;
      } else {
        const pageSize = template.paperSize === 'Custom' ? 'auto' : template.paperSize;
        pageStyle = `@media print { @page { size: ${pageSize} ${orientation}; margin: 0; } }`;
      }
      const styleEl = document.createElement('style');
      styleEl.id = 'print-orientation';
      styleEl.textContent = pageStyle;
      document.head.appendChild(styleEl);
      window.print();
      document.head.removeChild(styleEl);
      printArea.innerHTML = '';
      void showToast('已打开打印对话框，可选择「另存为 PDF」或打印机', 'success');
    } else {
      void showToast('打印失败：无内容可打印', 'error');
    }
  }, [template, isBatchActive, previewMode, continuousPageHeight]);

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
        {!batchSelectMode ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1"
            onClick={handleToggleBatch}
          >
            <CheckSquare className="size-3.5" />
            批量选择
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1 text-primary"
            onClick={handleToggleBatch}
          >
            <X className="size-3.5" />
            退出批量
          </Button>
        )}
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

      {batchSelectMode && selectedRecords.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border-b border-primary/20 shrink-0">
          <CheckSquare className="size-3.5 text-primary shrink-0" />
          <span className="text-xs text-primary flex-1 truncate">
            已选择 {selectedRecords.length} 条记录
          </span>
        </div>
      )}

      {isBatchActive && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30 shrink-0">
          <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
            <Button
              variant={previewMode === 'default' ? 'default' : 'ghost'}
              size="sm"
              className="h-6 px-2 text-[11px] gap-1"
              onClick={() => setPreviewMode('default')}
            >
              <FileText className="size-3" />
              默认
            </Button>
            <Button
              variant={previewMode === 'continuous' ? 'default' : 'ghost'}
              size="sm"
              className="h-6 px-2 text-[11px] gap-1"
              onClick={() => setPreviewMode('continuous')}
            >
              <Copy className="size-3" />
              连续
            </Button>
          </div>
          {previewMode === 'continuous' && (
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-muted-foreground shrink-0">纸张高度</span>
              <Input
                type="number"
                value={continuousPageHeight}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!Number.isNaN(val) && val >= 100 && val <= 2000) {
                    setContinuousPageHeight(val);
                  }
                }}
                className="h-6 w-16 text-[11px]"
              />
              <span className="text-[11px] text-muted-foreground shrink-0">mm</span>
            </div>
          )}
        </div>
      )}

      <div className="flex-1 relative overflow-hidden flex flex-col">
        <PreviewCanvas
          ref={previewRef}
          records={displayRecords}
          enabledFields={template.fields}
          margin={template.margin}
          fontSize="small"
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
          previewMode={isBatchActive ? previewMode : 'default'}
          continuousPageHeight={continuousPageHeight}
        />
      </div>

      {displayCount === 0 && (
        <div className="px-2 py-1.5 text-[10px] text-warning bg-warning/10 text-center leading-relaxed">
          {recordsWithIds.length === 0
            ? '暂无数据，请在多维表格中添加记录。'
            : batchSelectMode
              ? '未选择记录，请在左侧多维表格中勾选记录。'
              : '请在多维表格中点击选择一条记录。'}
        </div>
      )}

      <div className="flex items-center gap-2 px-3 py-2 border-t border-border bg-card shrink-0">
        <span className="text-[11px] text-muted-foreground truncate flex-1">
          {template.fields.length} 个字段 · {batchSelectMode
            ? `${selectedRecords.length} 条记录`
            : `${recordsWithIds.length > 0 ? 1 : 0} 条记录`}
        </span>
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
