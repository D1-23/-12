import { useMemo, useRef, useImperativeHandle, forwardRef, useCallback, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { MarginOption, FontSizeOption, PageMargins, SignatureArea, HeaderFooterConfig, BatchPreviewMode } from '@/types/template';
import { FONT_SIZES, mmToPx, replaceTemplateVars } from '@/types/template';
import { formatFieldValue, formatPrintTime, LABEL_WIDTH } from './field-utils';
import {
  buildMergedRows,
  paginateMergedRows,
  paginateContinuousRows,
  RECORD_SEPARATOR_HEIGHT,
  TITLE_HEIGHT_PX,
  FOOTER_HEIGHT_PX,
  type MergedRow,
  type ContinuousPage,
} from './layout-engine';
import SignatureLayer from './SignatureLayer';

export interface PreviewCanvasHandle {
  getContent: () => string;
  getPageElements: () => HTMLElement[];
}

interface PreviewCanvasProps {
  records: Array<Record<string, unknown>>;
  enabledFields: string[];
  margin: MarginOption;
  fontSize: FontSizeOption;
  titleField: string;
  pageWidth: number;
  pageHeight: number;
  margins: PageMargins;
  fieldTypes: Record<string, number>;
  tableName: string;
  signatureAreas: SignatureArea[];
  showSignature: boolean;
  signatureData: Record<string, string>;
  signatureEditMode: boolean;
  showHeader: boolean;
  showFooter: boolean;
  header?: HeaderFooterConfig;
  footer?: HeaderFooterConfig;
  previewMode?: BatchPreviewMode;
  continuousPageHeight?: number;
  onSign: (recordIdx: number, areaId: string) => void;
  onMoveSig: (areaId: string, xMm: number, yMm: number) => void;
}

const PreviewCanvas = forwardRef<PreviewCanvasHandle, PreviewCanvasProps>(
  (
    {
      records,
      enabledFields,
      fontSize,
      titleField,
      pageWidth,
      pageHeight,
      margins,
      fieldTypes,
      tableName,
      signatureAreas,
      showSignature,
      signatureData,
      signatureEditMode,
      showHeader,
      showFooter,
      header,
      footer,
      previewMode = 'default',
      continuousPageHeight = 297,
      onSign,
      onMoveSig,
    },
    ref,
  ) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const dragState = useRef<{ startX: number; startY: number; scrollLeft: number; scrollTop: number } | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      const el = scrollRef.current;
      if (!el) return;
      if ((e.target as HTMLElement).closest('button, a, [role="button"], [data-sig-layer]')) return;
      dragState.current = {
        startX: e.pageX,
        startY: e.pageY,
        scrollLeft: el.scrollLeft,
        scrollTop: el.scrollTop,
      };
      setIsDragging(true);
    }, []);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      if (!dragState.current) return;
      const el = scrollRef.current;
      if (!el) return;
      const dx = e.pageX - dragState.current.startX;
      const dy = e.pageY - dragState.current.startY;
      el.scrollLeft = dragState.current.scrollLeft - dx;
      el.scrollTop = dragState.current.scrollTop - dy;
    }, []);

    const handleStopDrag = useCallback(() => {
      dragState.current = null;
      setIsDragging(false);
    }, []);

    useImperativeHandle(ref, () => ({
      getContent: () => {
        const node = contentRef.current;
        if (!node) return '';
        const clone = node.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('[data-sig-empty], [data-sig-outside]').forEach((el) => el.remove());
        return clone.innerHTML;
      },
      getPageElements: () => {
        const container = contentRef.current;
        if (!container) return [];
        return Array.from(container.querySelectorAll('.print-page'));
      },
    }));

    const pageWidthPx = Math.round(mmToPx(pageWidth));
    const pageHeightPx = Math.round(mmToPx(pageHeight));
    const marginsPx = useMemo<PageMargins>(
      () => ({
        top: Math.round(mmToPx(margins.top)),
        right: Math.round(mmToPx(margins.right)),
        bottom: Math.round(mmToPx(margins.bottom)),
        left: Math.round(mmToPx(margins.left)),
      }),
      [margins],
    );

    const fs = FONT_SIZES.small;
    const scaledWidth = pageWidthPx * 0.70;
    const contentWidthMm = pageWidth - margins.left - margins.right;

    const recordMergedRows = useMemo<MergedRow[][]>(() => {
      return records.map((record) =>
        buildMergedRows({
          fields: enabledFields,
          record,
          fieldTypes,
          contentWidthMm,
          fontSize: fs,
        }),
      );
    }, [records, enabledFields, fieldTypes, contentWidthMm, fs]);

    const availableContentHeight = useMemo(() => {
      let h = pageHeightPx - marginsPx.top - marginsPx.bottom;
      if (showSignature && signatureAreas.length > 0) {
        h -= 80;
      }
      return Math.max(h, 100);
    }, [pageHeightPx, marginsPx, showSignature, signatureAreas]);

    const isContinuous = previewMode === 'continuous' && records.length > 1;

    const continuousPageHeightPx = Math.round(mmToPx(continuousPageHeight));

    const continuousAvailableHeight = useMemo(() => {
      let h = continuousPageHeightPx - marginsPx.top - marginsPx.bottom;
      return Math.max(h, 100);
    }, [continuousPageHeightPx, marginsPx]);

    const pagedRecords = useMemo(() => {
      const result: { rows: MergedRow[]; recordIdx: number; pageNum: number; totalPages: number }[] = [];
      recordMergedRows.forEach((rows, recordIdx) => {
        const totalPages = rows.reduce((sum, r) => sum + r.height, 0);
        const pages = paginateMergedRows(rows, availableContentHeight);
        if (pages.length > 1 || totalPages > availableContentHeight) {
          logger.info('[Pagination]', {
            recordIdx,
            totalRowsHeight: totalPages,
            availableContentHeight,
            pages: pages.length,
            rowCount: rows.length,
          });
        }
        pages.forEach((pageRows, pageNum) => {
          result.push({
            rows: pageRows,
            recordIdx,
            pageNum,
            totalPages: pages.length,
          });
        });
      });
      return result;
    }, [recordMergedRows, availableContentHeight]);

    const continuousPages = useMemo(() => {
      if (!isContinuous) return [];
      return paginateContinuousRows(recordMergedRows, continuousAvailableHeight);
    }, [isContinuous, recordMergedRows, continuousAvailableHeight]);

    const totalGlobalPages = isContinuous ? continuousPages.length : pagedRecords.length;

    const labelTdStyle: React.CSSProperties = {
      width: LABEL_WIDTH,
      background: '#FFFFFF',
      border: '1px solid #333333',
      padding: '3px 6px',
      fontSize: fs,
      fontWeight: 600,
      color: '#000000',
      lineHeight: `${Math.round(fs * 1.4)}px`,
      textAlign: 'left',
      verticalAlign: 'top',
      wordBreak: 'break-all',
      overflowWrap: 'break-word',
    };

    const valueTdStyle: React.CSSProperties = {
      background: '#FFFFFF',
      border: '1px solid #333333',
      padding: '3px 6px',
      fontSize: fs,
      color: '#1F2329',
      lineHeight: `${Math.round(fs * 1.4)}px`,
      textAlign: 'left',
      verticalAlign: 'top',
      wordBreak: 'break-word',
      overflowWrap: 'break-word',
    };

    const tableStyle: React.CSSProperties = {
      borderCollapse: 'collapse',
      width: '100%',
      tableLayout: 'fixed',
    };

    const renderMergedTable = (rows: MergedRow[]) => (
      <table style={tableStyle}>
        <colgroup>
          <col style={{ width: LABEL_WIDTH }} />
          <col style={{ width: 'auto' }} />
          <col style={{ width: LABEL_WIDTH }} />
          <col style={{ width: 'auto' }} />
        </colgroup>
        <tbody>
          {rows.map((row, idx) => {
            if (row.type === 'paired') {
              return (
                <tr key={`row-${idx}`} className="field-row">
                  <td style={labelTdStyle}>{row.left?.field ?? ''}</td>
                  <td style={valueTdStyle}>{row.left?.value ?? ''}</td>
                  <td style={labelTdStyle}>{row.right?.field ?? ''}</td>
                  <td style={valueTdStyle}>{row.right?.value ?? ''}</td>
                </tr>
              );
            }
            return (
              <tr key={`row-${idx}`} className="field-row">
                <td style={labelTdStyle}>{row.unit!.field}</td>
                <td style={valueTdStyle} colSpan={3}>{row.unit!.value}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );

    const renderRecord = (
      rows: MergedRow[],
      recordIdx: number,
      pageNum: number,
      totalPagesInRecord: number,
      globalPageNum: number,
    ) => {
      const record = records[recordIdx];
      const title = titleField
        ? (formatFieldValue(record[titleField]) || '未命名记录')
        : null;

      const printTime = formatPrintTime();
      const totalRecords = records.length;
      const isFirstPage = pageNum === 0;
      const isLastPage = pageNum === totalPagesInRecord - 1;

      return (
        <div
          key={`${recordIdx}-${pageNum}`}
          className="print-page bg-card rounded-md shadow-sm overflow-hidden"
          style={{
            width: pageWidthPx,
            height: pageHeightPx,
            boxSizing: 'border-box',
            paddingTop: marginsPx.top,
            paddingRight: marginsPx.right,
            paddingBottom: marginsPx.bottom,
            paddingLeft: marginsPx.left,
            fontSize: fs,
            marginBottom: 30,
            position: 'relative',
          }}
          >
            {showHeader && header?.text && (
              <div
                style={{
                  position: 'absolute',
                  top: Math.round(marginsPx.top * 0.35),
                  left: marginsPx.left,
                  right: marginsPx.right,
                  fontSize: header.fontSize,
                  textAlign: header.alignment,
                  color: '#86909C',
                  lineHeight: '14px',
                }}
              >
                {replaceTemplateVars(header.text, recordIdx + 1, totalRecords, tableName, printTime)}
              </div>
            )}
            {renderMergedTable(rows)}

            {showSignature && signatureAreas.length > 0 && isLastPage && (
              <SignatureLayer
                areas={signatureAreas}
                signatureData={signatureData}
                recordIdx={recordIdx}
                pageWidthMm={pageWidth}
                pageHeightMm={pageHeight}
                zoom={0.70}
                editMode={signatureEditMode}
                onSign={onSign}
                onMove={onMoveSig}
              />
            )}
          {showFooter && footer?.text && (
            <div
              style={{
                position: 'absolute',
                bottom: Math.round(marginsPx.bottom * 0.35),
                left: marginsPx.left,
                right: marginsPx.right,
                fontSize: footer.fontSize,
                textAlign: footer.alignment,
                color: '#86909C',
                lineHeight: '14px',
              }}
            >
              {replaceTemplateVars(footer.text, recordIdx + 1, totalRecords, tableName, printTime)}
            </div>
          )}
        </div>
      );
    };

    const renderContinuousPage = (page: ContinuousPage, pageNum: number, totalPages: number) => {
      const printTime = formatPrintTime();
      const totalRecords = records.length;
      const effectivePageHeightPx = continuousPageHeightPx;

      return (
        <div
          key={`continuous-${pageNum}`}
          className="print-page bg-card rounded-md shadow-sm overflow-hidden"
          style={{
            width: pageWidthPx,
            height: effectivePageHeightPx,
            boxSizing: 'border-box',
            paddingTop: marginsPx.top,
            paddingRight: marginsPx.right,
            paddingBottom: marginsPx.bottom,
            paddingLeft: marginsPx.left,
            fontSize: fs,
            marginBottom: 30,
            position: 'relative',
          }}
        >
          {showHeader && header?.text && (
            <div
              style={{
                position: 'absolute',
                top: Math.round(marginsPx.top * 0.35),
                left: marginsPx.left,
                right: marginsPx.right,
                fontSize: header.fontSize,
                textAlign: header.alignment,
                color: '#86909C',
                lineHeight: '14px',
              }}
            >
              {replaceTemplateVars(header.text, pageNum, totalPages, tableName, printTime)}
            </div>
          )}
          {page.segments.map((segment, segIdx) => (
            <div key={`seg-${segIdx}`}>
              {segIdx > 0 && (
                <div
                  style={{
                    borderTop: '1px dashed #ccc',
                    margin: `${RECORD_SEPARATOR_HEIGHT / 2}px 0`,
                  }}
                />
              )}
              {renderMergedTable(segment.rows)}
            </div>
          ))}
          {showFooter && footer?.text && (
            <div
              style={{
                position: 'absolute',
                bottom: Math.round(marginsPx.bottom * 0.35),
                left: marginsPx.left,
                right: marginsPx.right,
                fontSize: footer.fontSize,
                textAlign: footer.alignment,
                color: '#86909C',
                lineHeight: '14px',
              }}
            >
              {replaceTemplateVars(footer.text, pageNum, totalPages, tableName, printTime)}
            </div>
          )}
        </div>
      );
    };

    return (
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto bg-background py-3 select-none"
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleStopDrag}
        onMouseLeave={handleStopDrag}
      >
        <div style={{ width: scaledWidth, margin: '0 auto' }}>
          <div
            ref={contentRef}
            id="preview-content"
            style={{
              width: pageWidthPx,
              zoom: 0.70,
            }}
          >
            {isContinuous
              ? continuousPages.map((page, idx) =>
                  renderContinuousPage(page, idx + 1, continuousPages.length),
                )
              : pagedRecords.map((page, idx) =>
                  renderRecord(page.rows, page.recordIdx, page.pageNum, page.totalPages, idx + 1),
                )}
          </div>
        </div>
      </div>
    );
  },
);

PreviewCanvas.displayName = 'PreviewCanvas';

export default PreviewCanvas;
