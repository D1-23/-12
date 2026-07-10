import { useRef, useCallback } from 'react';
import type { PrintTemplate, PrintElement, TemplatePage } from '@/types/template';
import { mmToPx, pxToMm } from '@/types/template';
import { createElement } from '../shared/element-factory';
import CanvasElement from './CanvasElement';

interface EditorCanvasProps {
  template: PrintTemplate;
  currentPage: TemplatePage;
  zoom: number;
  selectedElementId: string | null;
  record?: Record<string, unknown>;
  fieldTypes?: Record<string, number>;
  allFields: string[];
  onSelectElement: (id: string | null) => void;
  onChangeElement: (element: PrintElement) => void;
  onDeleteElement: (id: string) => void;
  onDuplicateElement: (id: string) => void;
  onPageChange: (page: TemplatePage) => void;
}

const EditorCanvas = ({
  template,
  currentPage,
  zoom,
  selectedElementId,
  record,
  fieldTypes,
  allFields,
  onSelectElement,
  onChangeElement,
  onDeleteElement,
  onDuplicateElement,
  onPageChange,
}: EditorCanvasProps) => {
  const canvasRef = useRef<HTMLDivElement>(null);

  const { pageWidth, pageHeight, margins } = template;
  const innerWidthMm = pageWidth - margins.left - margins.right;
  const innerHeightMm = pageHeight - margins.top - margins.bottom;

  const pageWidthPx = mmToPx(pageWidth) * zoom;
  const pageHeightPx = mmToPx(pageHeight) * zoom;

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const elementType = e.dataTransfer.getData('text/plain');
      const variableName = e.dataTransfer.getData('text/variable');

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const xMm = pxToMm((e.clientX - rect.left) / zoom);
      const yMm = pxToMm((e.clientY - rect.top) / zoom);

      if (variableName) {
        const varText = `{{${variableName}}}`;
        if (selectedElementId) {
          const el = currentPage.elements.find((e2) => e2.id === selectedElementId);
          if (el && el.type === 'text') {
            onChangeElement({ ...el, content: el.content + varText });
            return;
          }
        }
        const newEl = createElement('text', xMm, yMm);
        if (newEl.type === 'text') {
          newEl.content = varText;
        }
        onPageChange({
          ...currentPage,
          elements: [...currentPage.elements, newEl],
        });
        return;
      }

      if (elementType && elementType !== '') {
        const newEl = createElement(elementType as PrintElement['type'], xMm, yMm);
        if (newEl.type === 'auto-table' && allFields.length > 0) {
          newEl.selectedFieldIds = [...allFields];
        }
        onPageChange({
          ...currentPage,
          elements: [...currentPage.elements, newEl],
        });
      }
    },
    [zoom, selectedElementId, currentPage, onChangeElement, onPageChange, allFields],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onSelectElement(null);
      }
    },
    [onSelectElement],
  );

  return (
    <div
      className="flex justify-center py-6 overflow-y-auto"
      style={{ minHeight: '100%' }}
    >
      <div
        ref={canvasRef}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={handleCanvasClick}
        className="relative bg-white shadow-lg"
        style={{
          width: pageWidthPx,
          minHeight: pageHeightPx,
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        }}
      >
        <div
          className="absolute border-dashed border-gray-200 pointer-events-none"
          style={{
            left: mmToPx(margins.left) * zoom,
            top: mmToPx(margins.top) * zoom,
            width: mmToPx(innerWidthMm) * zoom,
            height: mmToPx(innerHeightMm) * zoom,
          }}
        />

        {currentPage.elements.map((element) => (
          <CanvasElement
            key={element.id}
            element={element}
            zoom={zoom}
            selected={element.id === selectedElementId}
            editMode
            record={record}
            fieldTypes={fieldTypes}
            availableFields={allFields}
            onSelect={() => onSelectElement(element.id)}
            onChange={onChangeElement}
            onDelete={() => onDeleteElement(element.id)}
            onDuplicate={() => onDuplicateElement(element.id)}
            pageWidthMm={pageWidth}
            pageHeightMm={pageHeight}
          />
        ))}
      </div>
    </div>
  );
};

export default EditorCanvas;
