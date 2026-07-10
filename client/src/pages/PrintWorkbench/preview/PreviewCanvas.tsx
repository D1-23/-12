import { forwardRef, useImperativeHandle, useRef } from 'react';
import type {
  PrintTemplate,
  PrintElement,
  TemplatePage,
  TextElement,
  TableElement,
  ImageElement,
  QrCodeElement,
  BarcodeElement,
  LineElement,
  AutoTableElement,
} from '@/types/template';
import { mmToPx, replaceTemplateVars } from '@/types/template';
import TextRenderer from '../elements/TextRenderer';
import TableRenderer from '../elements/TableRenderer';
import ImageRenderer from '../elements/ImageRenderer';
import QrCodeRenderer from '../elements/QrCodeRenderer';
import BarcodeRenderer from '../elements/BarcodeRenderer';
import LineRenderer from '../elements/LineRenderer';
import AutoTableRenderer from '../elements/AutoTableRenderer';
import { formatFieldValue } from '../field-utils';
import { formatPrintTime } from '../field-utils';
import type { BitableRecord } from '@/api/bitable';

export interface PreviewCanvasHandle {
  getContent: () => string;
  getPageElements: () => HTMLElement[];
}

interface PreviewCanvasProps {
  template: PrintTemplate;
  records: BitableRecord[];
  fieldTypes: Record<string, number>;
  tableName: string;
  zoom?: number;
  signatureAreas?: PrintTemplate['signatureAreas'];
  signatureData?: Record<string, string>;
  signatureEditMode?: boolean;
  onSign?: (recordIdx: number, areaId: string) => void;
  onMoveSig?: (areaId: string, xMm: number, yMm: number) => void;
}

const ZOOM = 1;

function checkVisibility(
  page: TemplatePage,
  record: Record<string, unknown>,
): boolean {
  if (!page.visibilityConditions || page.visibilityConditions.length === 0) {
    return true;
  }

  const results = page.visibilityConditions.map((cond) => {
    const rawValue = record[cond.field];
    const formatted = rawValue !== undefined && rawValue !== null
      ? formatFieldValue(rawValue)
      : '';
    const target = cond.value;

    switch (cond.operator) {
      case 'equals':
        return formatted === target;
      case 'not_equals':
        return formatted !== target;
      case 'greater':
        return Number(formatted) > Number(target);
      case 'less':
        return Number(formatted) < Number(target);
      case 'contains':
        return formatted.includes(target);
      default:
        return true;
    }
  });

  return page.visibilityLogic === 'all'
    ? results.every(Boolean)
    : results.some(Boolean);
}

function renderElement(
  element: PrintElement,
  record: Record<string, unknown> | undefined,
  fieldTypes: Record<string, number>,
  zoom: number,
  allFields?: string[],
) {
  switch (element.type) {
    case 'text':
      return (
        <TextRenderer
          element={element as TextElement}
          zoom={zoom}
          record={record}
          fieldTypes={fieldTypes}
          editMode={false}
        />
      );
    case 'table':
      return (
        <TableRenderer
          element={element as TableElement}
          zoom={zoom}
          record={record}
          fieldTypes={fieldTypes}
          editMode={false}
        />
      );
    case 'image':
      return (
        <ImageRenderer
          element={element as ImageElement}
          zoom={zoom}
          editMode={false}
        />
      );
    case 'qrcode':
      return (
        <QrCodeRenderer
          element={element as QrCodeElement}
          zoom={zoom}
          record={record}
          fieldTypes={fieldTypes}
          editMode={false}
        />
      );
    case 'barcode':
      return (
        <BarcodeRenderer
          element={element as BarcodeElement}
          zoom={zoom}
          record={record}
          fieldTypes={fieldTypes}
          editMode={false}
        />
      );
    case 'line':
      return <LineRenderer element={element as LineElement} zoom={zoom} />;
    case 'auto-table':
      return (
        <AutoTableRenderer
          element={element as AutoTableElement}
          zoom={zoom}
          record={record}
          fieldTypes={fieldTypes}
          editMode={false}
          availableFields={allFields}
        />
      );
    default:
      return null;
  }
}

const PreviewCanvas = forwardRef<PreviewCanvasHandle, PreviewCanvasProps>(
  (
    {
      template,
      records,
      fieldTypes,
      tableName,
      signatureAreas = [],
      signatureData = {},
      signatureEditMode = false,
      onSign,
      onMoveSig,
    },
    ref,
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const zoom = ZOOM;

    useImperativeHandle(ref, () => ({
      getContent: () => containerRef.current?.innerHTML || '',
      getPageElements: () =>
        Array.from(containerRef.current?.querySelectorAll('.print-page') || []),
    }));

    const printTime = formatPrintTime();
    const totalPages = records.length;
    const { pageWidth, pageHeight, margins } = template;

    const pageWidthPx = mmToPx(pageWidth);
    const pageHeightPx = mmToPx(pageHeight);

    return (
      <div ref={containerRef} className="flex flex-col items-center gap-4 py-4">
        {records.map((recordWithId, recordIdx) => {
          const record = recordWithId.record;
          const visiblePages = template.pages.filter((page) =>
            checkVisibility(page, record),
          );

          return visiblePages.map((page, pageIdx) => {
            const pageNumber = recordIdx * template.pages.length + pageIdx + 1;
            return (
              <div
                key={`${recordIdx}-${pageIdx}`}
                className="print-page relative bg-white"
                style={{
                  width: pageWidthPx,
                  minHeight: pageHeightPx,
                  boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                }}
              >
                {template.showHeader && template.header && template.header.text && (
                  <div
                    style={{
                      position: 'absolute',
                      top: mmToPx(margins.top) * 0.4,
                      left: margins.left ? mmToPx(margins.left) : 0,
                      right: margins.right ? mmToPx(margins.right) : 0,
                      fontSize: template.header.fontSize,
                      textAlign: template.header.alignment,
                      color: '#666',
                    }}
                  >
                    {replaceTemplateVars(
                      template.header.text,
                      pageNumber,
                      totalPages,
                      tableName,
                      printTime,
                    )}
                  </div>
                )}

                {page.elements.map((element) => (
                  <div
                    key={element.id}
                    style={{
                      position: 'absolute',
                      left: mmToPx(element.x) * zoom,
                      top: mmToPx(element.y) * zoom,
                      width: mmToPx(element.width) * zoom,
                      height: element.type === 'line' ? undefined : mmToPx(element.height) * zoom,
                    }}
                  >
                    {renderElement(element, record, fieldTypes, zoom)}
                  </div>
                ))}

                {signatureAreas.map((area) => {
                  const key = `${recordIdx}_${area.id}`;
                  const dataUrl = signatureData[key];
                  return (
                    <div
                      key={area.id}
                      style={{
                        position: 'absolute',
                        left: mmToPx(area.xMm),
                        top: mmToPx(area.yMm),
                        width: mmToPx(area.widthMm),
                        height: mmToPx(area.heightMm),
                        border: dataUrl ? 'none' : '1px dashed #ccc',
                        zIndex: 10,
                        cursor: signatureEditMode ? 'move' : dataUrl ? 'default' : 'pointer',
                      }}
                      onClick={
                        !signatureEditMode && !dataUrl
                          ? () => onSign?.(recordIdx, area.id)
                          : undefined
                      }
                    >
                      {dataUrl && (
                        <img
                          src={dataUrl}
                          alt="signature"
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                      )}
                    </div>
                  );
                })}

                {template.showFooter && template.footer && template.footer.text && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: mmToPx(margins.bottom) * 0.4,
                      left: margins.left ? mmToPx(margins.left) : 0,
                      right: margins.right ? mmToPx(margins.right) : 0,
                      fontSize: template.footer.fontSize,
                      textAlign: template.footer.alignment,
                      color: '#666',
                    }}
                  >
                    {replaceTemplateVars(
                      template.footer.text,
                      pageNumber,
                      totalPages,
                      tableName,
                      printTime,
                    )}
                  </div>
                )}
              </div>
            );
          });
        })}
      </div>
    );
  },
);

PreviewCanvas.displayName = 'PreviewCanvas';
export default PreviewCanvas;
