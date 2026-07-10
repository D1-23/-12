import type { TableCell } from '@/types/template';

export interface CellRange {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

export function isCellInMerged(
  cells: TableCell[][],
  row: number,
  col: number,
): boolean {
  if (row < 0 || row >= cells.length) return false;
  if (col < 0 || col >= cells[row].length) return false;
  return cells[row][col].isMerged;
}

export function findMergeOrigin(
  cells: TableCell[][],
  row: number,
  col: number,
): { row: number; col: number } | null {
  for (let r = Math.max(0, row - 10); r <= row; r++) {
    for (let c = Math.max(0, col - 10); c <= col; c++) {
      const cell = cells[r]?.[c];
      if (!cell || cell.isMerged) continue;
      if (cell.colspan > 1 || cell.rowspan > 1) {
        if (r + cell.rowspan > row && c + cell.colspan > col) {
          return { row: r, col: c };
        }
      }
    }
  }
  return null;
}

export function mergeCellRange(
  cells: TableCell[][],
  range: CellRange,
): TableCell[][] {
  const { startRow, startCol, endRow, endCol } = range;
  const numRows = cells.length;
  if (startRow >= numRows || endRow >= numRows) return cells;

  const newCells = cells.map((row) => row.map((cell) => ({ ...cell })));

  const origin = newCells[startRow][startCol];
  origin.colspan = endCol - startCol + 1;
  origin.rowspan = endRow - startRow + 1;

  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      if (r === startRow && c === startCol) continue;
      newCells[r][c] = {
        ...newCells[r][c],
        isMerged: true,
        colspan: 0,
        rowspan: 0,
        content: '',
      };
    }
  }

  return newCells;
}

export function splitCell(
  cells: TableCell[][],
  row: number,
  col: number,
): TableCell[][] {
  const newCells = cells.map((r) => r.map((cell) => ({ ...cell })));
  const cell = newCells[row]?.[col];
  if (!cell || cell.isMerged) {
    const origin = findMergeOrigin(cells, row, col);
    if (!origin) return cells;
    const originCell = newCells[origin.row][origin.col];
    const colspan = originCell.colspan;
    const rowspan = originCell.rowspan;
    originCell.colspan = 1;
    originCell.rowspan = 1;
    for (let r = origin.row; r < origin.row + rowspan; r++) {
      for (let c = origin.col; c < origin.col + colspan; c++) {
        if (r === origin.row && c === origin.col) continue;
        newCells[r][c] = {
          ...newCells[r][c],
          isMerged: false,
          colspan: 1,
          rowspan: 1,
        };
      }
    }
    return newCells;
  }

  if (cell.colspan <= 1 && cell.rowspan <= 1) return cells;

  const colspan = cell.colspan;
  const rowspan = cell.rowspan;
  cell.colspan = 1;
  cell.rowspan = 1;

  for (let r = row; r < row + rowspan; r++) {
    for (let c = col; c < col + colspan; c++) {
      if (r === row && c === col) continue;
      newCells[r][c] = {
        ...newCells[r][c],
        isMerged: false,
        colspan: 1,
        rowspan: 1,
      };
    }
  }

  return newCells;
}

export function addRow(
  cells: TableCell[][],
  cols: number,
  atIdx?: number,
): TableCell[][] {
  const newCells = cells.map((r) => r.map((cell) => ({ ...cell })));
  const newRow: TableCell[] = [];
  for (let c = 0; c < cols; c++) {
    newRow.push({
      content: '',
      fontSize: 14,
      bold: false,
      color: '#000000',
      backgroundColor: '#ffffff',
      align: 'left',
      isMerged: false,
      colspan: 1,
      rowspan: 1,
    });
  }
  const insertIdx = atIdx !== undefined ? atIdx + 1 : newCells.length;
  newCells.splice(insertIdx, 0, newRow);
  return newCells;
}

export function removeRow(
  cells: TableCell[][],
  rowIdx: number,
): TableCell[][] {
  const newCells = cells.map((r) => r.map((cell) => ({ ...cell })));
  newCells.splice(rowIdx, 1);
  return newCells;
}

export function addCol(
  cells: TableCell[][],
  atIdx?: number,
): TableCell[][] {
  const newCells = cells.map((r) => r.map((cell) => ({ ...cell })));
  const insertIdx = atIdx !== undefined ? atIdx + 1 : (newCells[0]?.length || 0);
  newCells.forEach((row) => {
    row.splice(insertIdx, 0, {
      content: '',
      fontSize: 14,
      bold: false,
      color: '#000000',
      backgroundColor: '#ffffff',
      align: 'left',
      isMerged: false,
      colspan: 1,
      rowspan: 1,
    });
  });
  return newCells;
}

export function removeCol(
  cells: TableCell[][],
  colIdx: number,
): TableCell[][] {
  const newCells = cells.map((r) => r.map((cell) => ({ ...cell })));
  newCells.forEach((row) => {
    row.splice(colIdx, 1);
  });
  return newCells;
}
