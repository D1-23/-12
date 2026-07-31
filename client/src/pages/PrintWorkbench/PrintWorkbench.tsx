import { useState, useEffect, useCallback, useRef } from 'react';
import { FileText, AlertTriangle, TableProperties, RefreshCw } from 'lucide-react';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@/components/ui/empty';
import { Button } from '@/components/ui/button';
import type { PrintTemplate, SignatureArea } from '@/types/template';
import { loadTemplates, saveTemplates, migrateTemplate, DEFAULT_PAGE_MARGINS } from '@/types/template';
import { useBitableData } from '@/hooks/useBitableData';
import TemplateList from './TemplateList';
import TemplatePreview from './TemplatePreview';
import TemplateConfig from './TemplateConfig';

type ViewMode = 'list' | 'preview' | 'config';

function extractFieldsFromRecords(
  recs: Array<{ record: Record<string, unknown> }>
): string[] {
  const fieldSet = new Set<string>();
  for (const { record } of recs) {
    for (const key of Object.keys(record)) {
      fieldSet.add(key);
    }
  }
  return Array.from(fieldSet);
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function createDefaultTemplates(allFields: string[]): PrintTemplate[] {
  const now = Date.now();
  return [
    {
      id: generateId(),
      name: '记录详情',
      type: 'record',
      fields: [...allFields],
      margin: 'standard',
      fontSize: 'medium',
      titleField: allFields[0] || '',
      pinned: false,
      createdAt: now,
      paperSize: 'A4',
      orientation: 'portrait',
      pageWidth: 210,
      pageHeight: 297,
      margins: { ...DEFAULT_PAGE_MARGINS },
      signatureAreas: [],
      showSignature: true,
      showHeader: false,
      showFooter: true,
      header: { text: '', fontSize: 10, alignment: 'center' },
      footer: { text: '第 {{page_number}} / {{total_pages}} 页', fontSize: 10, alignment: 'center' },
    },
  ];
}

const PrintWorkbench = () => {
  const [view, setView] = useState<ViewMode>('list');
  const [templates, setTemplates] = useState<PrintTemplate[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [batchSelectMode, setBatchSelectMode] = useState(false);
  const {
    selectedRecord,
    allFields,
    allRecords,
    sdkAvailable,
    loading,
    selectedRecords,
    fieldTypes,
    tableName,
  } = useBitableData(batchSelectMode);

  useEffect(() => {
    const initTemplates = async () => {
      if (loading) return;
      const fields = allFields.length > 0 ? allFields : extractFieldsFromRecords(allRecords);
      const stored = (await loadTemplates()).map(migrateTemplate).map((t) =>
        t.type === 'record' ? t : { ...t, type: 'record' as const }
      );
      if (stored.length > 0) {
        setTemplates(stored);
        if (stored.some((t) => !t.paperSize)) {
          void saveTemplates(stored);
        }
      } else {
        const defaults = createDefaultTemplates(fields);
        setTemplates(defaults);
        void saveTemplates(defaults);
      }
    };
    void initTemplates();
  }, [loading]);

  const autoSwitchedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!sdkAvailable || !selectedRecord || templates.length === 0) return;
    if (autoSwitchedIdRef.current !== selectedRecord.id) {
      autoSwitchedIdRef.current = selectedRecord.id;
      if (view === 'list') {
        setActiveTemplateId(templates[0].id);
        setView('preview');
      }
    }
  }, [sdkAvailable, selectedRecord, view, templates]);

  const activeTemplate = templates.find((t) => t.id === activeTemplateId) ?? null;

  const handleSelectTemplate = useCallback((template: PrintTemplate) => {
    setActiveTemplateId(template.id);
    setView('preview');
  }, []);

  const handleCreateTemplate = useCallback(
    (name: string) => {
      const newTemplate: PrintTemplate = {
        id: generateId(),
        name,
        type: 'record',
        fields: [...allFields],
        margin: 'standard',
        fontSize: 'medium',
        titleField: allFields[0] || '',
        pinned: false,
        createdAt: Date.now(),
        paperSize: 'A4',
        orientation: 'portrait',
        pageWidth: 210,
        pageHeight: 297,
        margins: { ...DEFAULT_PAGE_MARGINS },
        signatureAreas: [],
        showSignature: true,
        showHeader: false,
        showFooter: true,
        header: { text: '', fontSize: 10, alignment: 'center' },
        footer: { text: '第 {{page_number}} / {{total_pages}} 页', fontSize: 10, alignment: 'center' },
      };
      const updated = [...templates, newTemplate];
      setTemplates(updated);
      void saveTemplates(updated);
      setActiveTemplateId(newTemplate.id);
      setView('preview');
    },
    [templates, allFields]
  );

  const handleDeleteTemplate = useCallback(
    (id: string) => {
      if (templates.length <= 1) return;
      const updated = templates.filter((t) => t.id !== id);
      setTemplates(updated);
      void saveTemplates(updated);
      if (activeTemplateId === id) {
        setActiveTemplateId(null);
        setView('list');
      }
    },
    [templates, activeTemplateId]
  );

  const handleDuplicateTemplate = useCallback(
    (id: string) => {
      const source = templates.find((t) => t.id === id);
      if (!source) return;
      const copy: PrintTemplate = {
        ...source,
        id: generateId(),
        name: `${source.name} (副本)`,
        createdAt: Date.now(),
      };
      const updated = [...templates, copy];
      setTemplates(updated);
      void saveTemplates(updated);
    },
    [templates]
  );

  const handleSaveTemplate = useCallback(
    (updated: PrintTemplate) => {
      const newTemplates = templates.map((t) =>
        t.id === updated.id ? updated : t
      );
      setTemplates(newTemplates);
      void saveTemplates(newTemplates);
    },
    [templates]
  );

  const handleUpdateFields = useCallback(
    (templateId: string, fields: string[]) => {
      const newTemplates = templates.map((t) =>
        t.id === templateId ? { ...t, fields } : t
      );
      setTemplates(newTemplates);
      void saveTemplates(newTemplates);
    },
    [templates]
  );

  const handleUpdateSignatures = useCallback(
    (templateId: string, areas: SignatureArea[]) => {
      const newTemplates = templates.map((t) =>
        t.id === templateId ? { ...t, signatureAreas: areas } : t
      );
      setTemplates(newTemplates);
      void saveTemplates(newTemplates);
    },
    [templates]
  );

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-xs text-muted-foreground">加载中...</div>
      </div>
    );
  }

  // 场景一：无法获取多维表格数据结构（SDK 初始化重试耗尽）
  // 提供明确引导，避免用户在空白界面中困惑
  if (!sdkAvailable) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <AlertTriangle className="size-6" />
            </EmptyMedia>
            <EmptyTitle>无法连接多维表格</EmptyTitle>
            <EmptyDescription>
              插件未能读取当前多维表格的数据结构。请确认已在多维表格中打开本插件，然后重试。
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" onClick={() => window.location.reload()}>
              <RefreshCw className="size-4" />
              重新加载
            </Button>
            <p className="text-xs text-muted-foreground">
              若多次失败，请关闭边栏后重新打开插件
            </p>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  // 场景二：数据表无字段（空表或仅含附件等不可打印结构）
  if (allFields.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <TableProperties className="size-6" />
            </EmptyMedia>
            <EmptyTitle>当前数据表没有可打印字段</EmptyTitle>
            <EmptyDescription>
              请在多维表格中添加至少一个文本类字段后，再返回插件重试。
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
              <RefreshCw className="size-4" />
              添加字段后刷新
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  if (view === 'list') {
    return (
      <TemplateList
        templates={templates}
        activeTemplateId={activeTemplateId}
        onSelect={handleSelectTemplate}
        onCreate={handleCreateTemplate}
        onDelete={handleDeleteTemplate}
        onDuplicate={handleDuplicateTemplate}
      />
    );
  }

  if (view === 'config' && activeTemplate) {
    return (
      <TemplateConfig
        template={activeTemplate}
        allFields={allFields}
        onSave={handleSaveTemplate}
        onBack={() => setView('preview')}
      />
    );
  }

  if (view === 'preview' && activeTemplate) {
    const defaultRecords = sdkAvailable && selectedRecord
      ? [selectedRecord]
      : allRecords;
    return (
      <TemplatePreview
        template={activeTemplate}
        recordsWithIds={defaultRecords}
        selectedRecords={selectedRecords}
        batchSelectMode={batchSelectMode}
        onBatchModeChange={setBatchSelectMode}
        allFields={allFields}
        fieldTypes={fieldTypes}
        tableName={tableName}
        onBack={() => setView('list')}
        onEdit={() => setView('config')}
        onUpdateFields={(fields) => handleUpdateFields(activeTemplate.id, fields)}
        onUpdateSignatures={(areas) => handleUpdateSignatures(activeTemplate.id, areas)}
      />
    );
  }

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
};

export default PrintWorkbench;
