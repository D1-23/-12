import { useState } from 'react';
import type { TableElement, TableCell as CellType } from '@/types/template';
import { mmToPx } from '@/types/template';
import { replaceVariables } from '../shared/variable-utils';
import {
  mergeCellRange,
  splitCell,
  addRow,
  removeRow,
  addCol,
  removeCol,
  findMergeOrigin,
  type CellRange,
} from '../shared/table-utils';

interface TableRendererProps {
  element: TableElement;
  zoom: number;
  record?: Record<string, unknown>;
  fieldTypes?: Record<string, number>;
  editMode: boolean;
  onChange?: (element: TableElement) => void;
}

const TableRenderer = ({
  element,
  zoom,
  record,
  fieldTypes,
  editMode,
  onChange,
}: TableRendererProps) => {
  const [selectedRange, setSelectedRange] = useState<CellRange | null>(null);
  const [dragStart, setDragStart] = useState<{ row: number; col: number } | null>(null);

  const widthPx = mmToPx(element.width) * zoom;

  const handleCellMouseDown = (row: number, col: number, e: React.MouseEvent) => {
    if (!editMode) return;
    e.stopPropagation();
    setDragStart({ row, col });
    setSelectedRange({
      startRow: row,
      startCol: col,
      endRow: row,
      endCol: col,
    });
  };

  const handleCellMouseEnter = (row: number, col: number) => {
    if (!editMode || !dragStart) return;
    setSelectedRange({
      startRow: Math.min(dragStart.row, row),
      startCol: Math.min(dragStart.col, col),
      endRow: Math.max(dragStart.row, row),
      endCol: Math.max(dragStart.col, col),
    });
  };

  const handleCellMouseUp = () => {
    setDragStart(null);
  };

  const isCellSelected = (row: number, col: number): boolean => {
    if (!selectedRange) return false;
    return (
      row >= selectedRange.startRow &&
      row <= selectedRange.endRow &&
      col >= selectedRange.startCol &&
      col <= selectedRange.endCol
    );
  };

  const isCellMerged = (row: number, col: number): boolean => {
    return element.cells[row]?.[col]?.isMerged === true;
  };

  const handleMerge = () => {
    if (!selectedRange || !onChange) return;
    const newCells = mergeCellRange(element.cells, selectedRange);
    onChange({ ...element, cells: newCells });
    setSelectedRange(null);
  };

  const handleSplit = () => {
    if (!selectedRange || !onChange) return;
    const newCells = splitCell(element.cells, selectedRange.startRow, selectedRange.startCol);
    onChange({ ...element, cells: newCells });
    setSelectedRange(null);
  };

  const canMerge = () => {
    if (!selectedRange) return false;
    const totalCells =
      (selectedRange.endRow - selectedRange.startRow + 1) *
      (selectedRange.endCol - selectedRange.startCol + 1);
    return totalCells > 1;
  };

  const canSplit = () => {
    if (!selectedRange) return false;
    const cell = element.cells[selectedRange.startRow]?.[selectedRange.startCol];
    if (!cell) return false;
    if (cell.isMerged) return true;
    return cell.colspan > 1 || cell.rowspan > 1;
  };

  const handleCellContentChange = (row: number, col: number, content: string) => {
    if (!onChange) return;
    const newCells = element.cells.map((r) => r.map((c) => ({ ...c })));
    if (newCells[row]?.[col]) {
      newCells[row][col].content = content;
    }
    onChange({ ...element, cells: newCells });
  };

  const handleCellColorChange = (
    row: number,
    col: number,
    field: 'color' | 'backgroundColor',
    value: string,
  ) => {
    if (!onChange) return;
    const newCells = element.cells.map((r) => r.map((c) => ({ ...c })));
    if (!selectedRange) {
      if (newCells[row]?.[col]) {
        newCells[row][col][field] = value;
      }
    } else {
      for (let r = selectedRange.startRow; r <= selectedRange.endRow; r++) {
        for (let c = selectedRange.startCol; c <= selectedRange.endCol; c++) {
          if (newCells[r]?.[c] && !newCells[r][c].isMerged) {
            newCells[r][c][field] = value;
          }
        }
      }
    }
    onChange({ ...element, cells: newCells });
  };

  const handleAddRow = (atIdx?: number) => {
    if (!onChange) return;
    const newCells = addRow(element.cells, element.cols, atIdx);
    onChange({ ...element, cells: newCells, rows: newCells.length });
  };

  const handleRemoveRow = (rowIdx: number) => {
    if (!onChange || element.rows <= 1) return;
    const newCells = removeRow(element.cells, rowIdx);
    onChange({ ...element, cells: newCells, rows: newCells.length });
    setSelectedRange(null);
  };

  const handleAddCol = (atIdx?: number) => {
    if (!onChange) return;
    const newCells = addCol(element.cells, atIdx);
    onChange({ ...element, cells: newCells, cols: newCells[0]?.length || element.cols });
  };

  const handleRemoveCol = (colIdx: number) => {
    if (!onChange || element.cols <= 1) return;
    const newCells = removeCol(element.cells, colIdx);
    onChange({ ...element, cells: newCells, cols: newCells[0]?.length || element.cols });
    setSelectedRange(null);
  };

  const renderCell = (cell: CellType, rowIdx: number, colIdx: number) => {
    if (cell.isMerged) return null;

    const displayContent = editMode
      ? cell.content
      : replaceVariables(cell.content, record, fieldTypes);

    const isHeaderRow = rowIdx < element.headerRowCount;
    const isTailRow = rowIdx >= element.rows - element.tailRowCount;

    const isSelected = isCellSelected(rowIdx, colIdx);

    return (
      <td
        key={`${rowIdx}-${colIdx}`}
        colSpan={cell.colspan > 1 ? cell.colspan : undefined}
        rowSpan={cell.rowspan > 1 ? cell.rowspan : undefined}
        onMouseDown={(e) => handleCellMouseDown(rowIdx, colIdx, e)}
        onMouseEnter={() => handleCellMouseEnter(rowIdx, colIdx)}
        onMouseUp={handleCellMouseUp}
        style={{
          fontSize: cell.fontSize * zoom,
          fontWeight: cell.bold ? 700 : (isHeaderRow ? 600 : 400),
          color: cell.color,
          backgroundColor: isSelected && editMode
            ? 'rgba(59, 130, 246, 0.15)'
            : cell.backgroundColor !== '#ffffff'
              ? cell.backgroundColor
              : isHeaderRow
                ? '#f3f4f6'
                : undefined,
          textAlign: cell.align,
          border: '1px solid #d1d5db',
          padding: `${4 * zoom}px ${6 * zoom}px`,
          width: `${(element.width / element.cols) * mmToPx(1) * zoom}px`,
          maxWidth: 0,
          position: 'relative',
        }}
      >
        {editMode ? (
          <input
            type="text"
            value={cell.content}
            onChange={(e) => handleCellContentChange(rowIdx, colIdx, e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
            className="w-full bg-transparent outline-none border-0 p-0"
            style={{
              fontSize: cell.fontSize * zoom,
              color: cell.color,
              textAlign: cell.align as 'left' | 'center' | 'right',
            }}
          />
        ) : (
          displayContent
        )}
      </td>
    );
  };

  return (
    <div style={{ width: widthPx }} className="relative">
      {editMode && selectedRange && (
        <div className="absolute -top-8 left-0 flex items-center gap-1 z-20 bg-card border border-border rounded-md shadow-sm px-1 py-0.5">
          {canMerge() && (
            <button
              onClick={handleMerge}
              className="text-[10px] px-1.5 py-0.5 rounded hover:bg-accent text-foreground"
            >
              合并
            </button>
          )}
          {canSplit() && (
            <button
              onClick={handleSplit}
              className="text-[10px] px-1.5 py-0.5 rounded hover:bg-accent text-foreground"
            >
              拆分
            </button>
          )}
          <input
            type="color"
            value={element.cells[selectedRange.startRow]?.[selectedRange.startCol]?.color || '#000000'}
            onChange={(e) =>
              handleCellColorChange(
                selectedRange.startRow,
                selectedRange.startCol,
                'color',
                e.target.value,
              )
            }
            className="size-5 rounded cursor-pointer border border-border"
            title="文字颜色"
          />
          <input
            type="color"
            value={element.cells[selectedRange.startRow]?.[selectedRange.startCol]?.backgroundColor || '#ffffff'}
            onChange={(e) =>
              handleCellColorChange(
                selectedRange.startRow,
                selectedRange.startCol,
                'backgroundColor',
                e.target.value,
              )
            }
            className="size-5 rounded cursor-pointer border border-border"
            title="背景颜色"
          />
          <button
            onClick={() => handleAddRow(selectedRange.endRow)}
            className="text-[10px] px-1 py-0.5 rounded hover:bg-accent text-foreground"
            title="下方插入行"
          >
            +行
          </button>
          <button
            onClick={() => handleRemoveRow(selectedRange.startRow)}
            className="text-[10px] px-1 py-0.5 rounded hover:bg-accent text-foreground"
            title="删除行"
          >
            -行
          </button>
          <button
            onClick={() => handleAddCol(selectedRange.endCol)}
            className="text-[10px] px-1 py-0.5 rounded hover:bg-accent text-foreground"
            title="右侧插入列"
          >
            +列
          </button>
          <button
            onClick={() => handleRemoveCol(selectedRange.startCol)}
            className="text-[10px] px-1 py-0.5 rounded hover:bg-accent text-foreground"
            title="删除列"
          >
            -列
          </button>
        </div>
      )}
      <table
        className="border-collapse"
        style={{
          width: '100%',
          tableLayout: 'fixed',
        }}
        onMouseLeave={handleCellMouseUp}
      >
        <tbody>
          {element.cells.map((row, rowIdx) => (
            <tr key={rowIdx}>
              {row.map((_, colIdx) => renderCell(element.cells[rowIdx][colIdx], rowIdx, colIdx))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TableRenderer;
