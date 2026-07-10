import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { PrintTemplate, PrintElement, TemplatePage } from '@/types/template';
import { generateId, mmToPx } from '@/types/template';
import { useEditorState } from '@/hooks/useEditorState';
import ComponentPanel from '../panels/ComponentPanel';
import DataSourcePanel from '../panels/DataSourcePanel';
import EditorToolbar from './EditorToolbar';
import EditorCanvas from './EditorCanvas';
import PageTabs from './PageTabs';
import VisibilityDialog from './VisibilityDialog';

interface TemplateEditorProps {
  template: PrintTemplate;
  allFields: string[];
  fieldTypes?: Record<string, number>;
  record?: Record<string, unknown>;
  onSave: (template: PrintTemplate) => void;
  onBack: () => void;
  onPreview: () => void;
}

const TemplateEditor = ({
  template,
  allFields,
  fieldTypes,
  record,
  onSave,
  onBack,
  onPreview,
}: TemplateEditorProps) => {
  const [leftPanelTab, setLeftPanelTab] = useState<'component' | 'data'>('component');
  const [zoom, setZoom] = useState(1);
  const [visibilityPageId, setVisibilityPageId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentPageId = template.pages[0]?.id || '';
  const editorState = useEditorState(currentPageId);

  const currentPage = useMemo(
    () => template.pages.find((p) => p.id === editorState.currentPageId) || template.pages[0],
    [template.pages, editorState.currentPageId],
  );

  const selectedElement = useMemo(
    () => currentPage?.elements.find((e) => e.id === editorState.selectedElementId) || null,
    [currentPage, editorState.selectedElementId],
  );

  useEffect(() => {
    const calcZoom = () => {
      const containerWidth = containerRef.current?.clientWidth ?? 800;
      const availableWidth = containerWidth - 80;
      const pageWidthPx = mmToPx(template.pageWidth);
      const newZoom = Math.min(1, availableWidth / pageWidthPx);
      setZoom(Math.max(0.3, newZoom));
    };
    calcZoom();
    window.addEventListener('resize', calcZoom);
    return () => window.removeEventListener('resize', calcZoom);
  }, [template.pageWidth]);

  const updateTemplate = useCallback(
    (updated: PrintTemplate) => {
      onSave(updated);
    },
    [onSave],
  );

  const handleNameChange = useCallback(
    (name: string) => {
      updateTemplate({ ...template, name });
    },
    [template, updateTemplate],
  );

  const handlePageChange = useCallback(
    (page: TemplatePage) => {
      const newPages = template.pages.map((p) => (p.id === page.id ? page : p));
      updateTemplate({ ...template, pages: newPages });
    },
    [template, updateTemplate],
  );

  const handleElementChange = useCallback(
    (element: PrintElement) => {
      if (!currentPage) return;
      const newElements = currentPage.elements.map((e) =>
        e.id === element.id ? element : e,
      );
      handlePageChange({ ...currentPage, elements: newElements });
    },
    [currentPage, handlePageChange],
  );

  const handleDeleteElement = useCallback(
    (id: string) => {
      if (!currentPage) return;
      const newElements = currentPage.elements.filter((e) => e.id !== id);
      handlePageChange({ ...currentPage, elements: newElements });
      editorState.selectElement(null);
    },
    [currentPage, handlePageChange, editorState],
  );

  const handleDuplicateElement = useCallback(
    (id: string) => {
      if (!currentPage) return;
      const source = currentPage.elements.find((e) => e.id === id);
      if (!source) return;
      const copy: PrintElement = {
        ...source,
        id: generateId(),
        x: source.x + 10,
        y: source.y + 10,
      } as PrintElement;
      handlePageChange({
        ...currentPage,
        elements: [...currentPage.elements, copy],
      });
      editorState.selectElement(copy.id);
    },
    [currentPage, handlePageChange, editorState],
  );

  const handleAddPage = useCallback(() => {
    const newPage: TemplatePage = {
      id: generateId(),
      name: `第${template.pages.length + 1}页`,
      elements: [],
      visibilityLogic: 'all',
    };
    updateTemplate({ ...template, pages: [...template.pages, newPage] });
    editorState.switchPage(newPage.id);
  }, [template, updateTemplate, editorState]);

  const handleDeletePage = useCallback(
    (pageId: string) => {
      if (template.pages.length <= 1) return;
      const newPages = template.pages.filter((p) => p.id !== pageId);
      updateTemplate({ ...template, pages: newPages });
      if (editorState.currentPageId === pageId) {
        editorState.switchPage(newPages[0].id);
      }
    },
    [template, updateTemplate, editorState],
  );

  const handleDuplicatePage = useCallback(
    (pageId: string) => {
      const source = template.pages.find((p) => p.id === pageId);
      if (!source) return;
      const copy: TemplatePage = {
        ...source,
        id: generateId(),
        name: `${source.name} (副本)`,
        elements: source.elements.map((e) => ({ ...e, id: generateId() }) as PrintElement),
      };
      const idx = template.pages.findIndex((p) => p.id === pageId);
      const newPages = [...template.pages];
      newPages.splice(idx + 1, 0, copy);
      updateTemplate({ ...template, pages: newPages });
    },
    [template, updateTemplate],
  );

  const handleMovePage = useCallback(
    (pageId: string, direction: 'up' | 'down') => {
      const idx = template.pages.findIndex((p) => p.id === pageId);
      if (idx < 0) return;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= template.pages.length) return;
      const newPages = [...template.pages];
      [newPages[idx], newPages[targetIdx]] = [newPages[targetIdx], newPages[idx]];
      updateTemplate({ ...template, pages: newPages });
    },
    [template, updateTemplate],
  );

  const handleToggleVisibility = useCallback((pageId: string) => {
    setVisibilityPageId(pageId);
  }, []);

  const handleVisibilityConfirm = useCallback(
    (conditions: TemplatePage['visibilityConditions'], logic: 'all' | 'any') => {
      if (!visibilityPageId) return;
      const newPages = template.pages.map((p) =>
        p.id === visibilityPageId
          ? { ...p, visibilityConditions: conditions, visibilityLogic: logic }
          : p,
      );
      updateTemplate({ ...template, pages: newPages });
    },
    [visibilityPageId, template, updateTemplate],
  );

  const handleClearPage = useCallback(() => {
    if (!currentPage) return;
    handlePageChange({ ...currentPage, elements: [] });
    editorState.selectElement(null);
  }, [currentPage, handlePageChange, editorState]);

  const visibilityPage = template.pages.find((p) => p.id === visibilityPageId);

  if (!currentPage) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-sm text-muted-foreground">无页面</span>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-background" ref={containerRef}>
      <EditorToolbar
        template={template}
        selectedElement={selectedElement}
        onBack={onBack}
        onNameChange={handleNameChange}
        onElementChange={handleElementChange}
        onAddPage={handleAddPage}
        onClearPage={handleClearPage}
        paperWidth={template.pageWidth}
        paperHeight={template.pageHeight}
      />

      <div className="flex-1 flex overflow-hidden">
        <div className="w-[240px] shrink-0 border-r border-border bg-card flex flex-col">
          <div className="flex border-b border-border">
            <button
              onClick={() => setLeftPanelTab('component')}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${
                leftPanelTab === 'component'
                  ? 'text-primary border-b-2 border-primary bg-primary/5'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              组件
            </button>
            <button
              onClick={() => setLeftPanelTab('data')}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${
                leftPanelTab === 'data'
                  ? 'text-primary border-b-2 border-primary bg-primary/5'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              数据源
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            {leftPanelTab === 'component' ? (
              <ComponentPanel onDragStart={() => editorState.selectElement(null)} />
            ) : (
              <DataSourcePanel
                allFields={allFields}
                fieldTypes={fieldTypes}
                onCopyVariable={(varName) => {
                  if (selectedElement?.type === 'text') {
                    handleElementChange({
                      ...selectedElement,
                      content: selectedElement.content + `{{${varName}}}`,
                    } as PrintElement);
                  }
                }}
              />
            )}
          </div>
        </div>

        <div className="flex-1 overflow-hidden bg-gray-100 flex flex-col">
          <div className="flex-1 overflow-auto">
            <EditorCanvas
              template={template}
              currentPage={currentPage}
              zoom={zoom}
              selectedElementId={editorState.selectedElementId}
              record={record}
              fieldTypes={fieldTypes}
              allFields={allFields}
              onSelectElement={editorState.selectElement}
              onChangeElement={handleElementChange}
              onDeleteElement={handleDeleteElement}
              onDuplicateElement={handleDuplicateElement}
              onPageChange={handlePageChange}
            />
          </div>
          <PageTabs
            pages={template.pages}
            currentPageId={editorState.currentPageId}
            onSelect={editorState.switchPage}
            onAdd={handleAddPage}
            onDelete={handleDeletePage}
            onDuplicate={handleDuplicatePage}
            onMoveUp={(id) => handleMovePage(id, 'up')}
            onMoveDown={(id) => handleMovePage(id, 'down')}
            onToggleVisibility={handleToggleVisibility}
          />
        </div>
      </div>

      <div className="h-9 flex items-center justify-between px-3 border-t border-border bg-card shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">
            缩放 {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(Math.max(0.3, zoom - 0.1))}
            className="size-5 flex items-center justify-center rounded hover:bg-accent text-muted-foreground"
          >
            -
          </button>
          <button
            onClick={() => setZoom(Math.min(2, zoom + 0.1))}
            className="size-5 flex items-center justify-center rounded hover:bg-accent text-muted-foreground"
          >
            +
          </button>
        </div>
        <button
          onClick={onPreview}
          className="px-3 py-1 text-xs font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
        >
          完成编辑
        </button>
      </div>

      {visibilityPage && (
        <VisibilityDialog
          open={!!visibilityPageId}
          onClose={() => setVisibilityPageId(null)}
          conditions={visibilityPage.visibilityConditions || []}
          logic={visibilityPage.visibilityLogic}
          allFields={allFields}
          onConfirm={handleVisibilityConfirm}
        />
      )}
    </div>
  );
};

export default TemplateEditor;
