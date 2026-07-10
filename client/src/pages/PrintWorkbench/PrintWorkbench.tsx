import { useState, useEffect, useCallback, useRef } from 'react';
import { FileText } from 'lucide-react';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import type { PrintTemplate, SignatureArea, TemplatePage } from '@/types/template';
import {
  loadTemplates,
  saveTemplates,
  migrateTemplate,
  DEFAULT_PAGE_MARGINS,
  DEFAULT_HEADER,
  DEFAULT_FOOTER,
  DEFAULT_ELEMENT_FONT_SIZE,
  generateId,
} from '@/types/template';
import { useBitableData } from '@/hooks/useBitableData';
import TemplateList from './TemplateList';
import TemplatePreview from './TemplatePreview';
import TemplateEditor from './editor/TemplateEditor';

type ViewMode = 'list' | 'editor' | 'preview';

function createDefaultTemplate(name: string): PrintTemplate {
  return {
    id: generateId(),
    name,
    pages: [{
      id: generateId(),
      name: '第1页',
      elements: [],
      visibilityLogic: 'all',
    }],
    paperSize: 'A4',
    orientation: 'portrait',
    pageWidth: 210,
    pageHeight: 297,
    margins: { ...DEFAULT_PAGE_MARGINS },
    defaultFontSize: DEFAULT_ELEMENT_FONT_SIZE,
    pinned: false,
    createdAt: Date.now(),
    signatureAreas: [],
    showHeader: false,
    showFooter: true,
    header: { ...DEFAULT_HEADER },
    footer: { ...DEFAULT_FOOTER },
  };
}

const PrintWorkbench = () => {
  const [view, setView] = useState<ViewMode>('list');
  const [templates, setTemplates] = useState<PrintTemplate[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const {
    selectedRecord,
    allFields,
    allRecords,
    sdkAvailable,
    loading,
    selectedRecords,
    fieldTypes,
    tableName,
  } = useBitableData();

  useEffect(() => {
    const initTemplates = async () => {
      if (loading) return;
      const stored = (await loadTemplates()).map(migrateTemplate);
      if (stored.length > 0) {
        setTemplates(stored);
        if (stored.some((t) => !t.pages)) {
          void saveTemplates(stored);
        }
      } else {
        const defaultTpl = createDefaultTemplate('排版示例');
        setTemplates([defaultTpl]);
        void saveTemplates([defaultTpl]);
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
      const newTemplate = createDefaultTemplate(name);
      const updated = [...templates, newTemplate];
      setTemplates(updated);
      void saveTemplates(updated);
      setActiveTemplateId(newTemplate.id);
      setView('editor');
    },
    [templates],
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
    [templates, activeTemplateId],
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
        pages: source.pages.map((p) => ({
          ...p,
          id: generateId(),
          elements: p.elements.map((e) => ({ ...e, id: generateId() })),
        })),
      };
      const updated = [...templates, copy];
      setTemplates(updated);
      void saveTemplates(updated);
    },
    [templates],
  );

  const handleSaveTemplate = useCallback(
    (updated: PrintTemplate) => {
      const newTemplates = templates.map((t) =>
        t.id === updated.id ? updated : t,
      );
      setTemplates(newTemplates);
      void saveTemplates(newTemplates);
    },
    [templates],
  );

  const handleUpdateSignatures = useCallback(
    (templateId: string, areas: SignatureArea[]) => {
      const newTemplates = templates.map((t) =>
        t.id === templateId ? { ...t, signatureAreas: areas } : t,
      );
      setTemplates(newTemplates);
      void saveTemplates(newTemplates);
    },
    [templates],
  );

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-xs text-muted-foreground">加载中...</div>
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

  if (view === 'editor' && activeTemplate) {
    const recordData = sdkAvailable && selectedRecord
      ? selectedRecord.record
      : allRecords[0]?.record;
    return (
      <TemplateEditor
        template={activeTemplate}
        allFields={allFields}
        fieldTypes={fieldTypes}
        record={recordData}
        onSave={handleSaveTemplate}
        onBack={() => setView('list')}
        onPreview={() => setView('preview')}
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
        allFields={allFields}
        fieldTypes={fieldTypes}
        tableName={tableName}
        onBack={() => setView('list')}
        onEdit={() => setView('editor')}
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
