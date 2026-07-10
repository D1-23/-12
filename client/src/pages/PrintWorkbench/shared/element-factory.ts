import type {
  PrintElement,
  TextElement,
  TableElement,
  ImageElement,
  QrCodeElement,
  BarcodeElement,
  LineElement,
  AutoTableElement,
  TableCell,
} from '@/types/template';
import { generateId, DEFAULT_ELEMENT_FONT_SIZE } from '@/types/template';

function createEmptyCells(rows: number, cols: number): TableCell[][] {
  const cells: TableCell[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: TableCell[] = [];
    for (let c = 0; c < cols; c++) {
      row.push({
        content: '',
        fontSize: DEFAULT_ELEMENT_FONT_SIZE,
        bold: false,
        color: '#000000',
        backgroundColor: '#ffffff',
        align: 'left',
        isMerged: false,
        colspan: 1,
        rowspan: 1,
      });
    }
    cells.push(row);
  }
  return cells;
}

export function createElement(
  type: PrintElement['type'],
  x: number,
  y: number,
): PrintElement {
  const id = generateId();

  switch (type) {
    case 'text': {
      const el: TextElement = {
        id,
        type: 'text',
        x,
        y,
        width: 120,
        height: 40,
        content: '文本内容',
        fontSize: DEFAULT_ELEMENT_FONT_SIZE,
        bold: false,
        italic: false,
        underline: false,
        align: 'left',
        color: '#000000',
        backgroundColor: '#ffffff',
        lineHeight: 1.4,
      };
      return el;
    }
    case 'table': {
      const el: TableElement = {
        id,
        type: 'table',
        x,
        y,
        width: 170,
        height: 80,
        rows: 3,
        cols: 3,
        cells: createEmptyCells(3, 3),
        headerRowCount: 1,
        tailRowCount: 0,
      };
      return el;
    }
    case 'image': {
      const el: ImageElement = {
        id,
        type: 'image',
        x,
        y,
        width: 80,
        height: 80,
        src: '',
        fit: 'contain',
      };
      return el;
    }
    case 'qrcode': {
      const el: QrCodeElement = {
        id,
        type: 'qrcode',
        x,
        y,
        width: 60,
        height: 60,
        content: 'https://example.com',
      };
      return el;
    }
    case 'barcode': {
      const el: BarcodeElement = {
        id,
        type: 'barcode',
        x,
        y,
        width: 100,
        height: 40,
        content: '1234567890',
        format: 'CODE128',
      };
      return el;
    }
    case 'line': {
      const el: LineElement = {
        id,
        type: 'line',
        x,
        y,
        width: 170,
        height: 1,
        color: '#000000',
        thickness: 1,
        style: 'solid',
      };
      return el;
    }
    case 'auto-table': {
      const el: AutoTableElement = {
        id,
        type: 'auto-table',
        x,
        y,
        width: 170,
        height: 80,
        selectedFieldIds: [],
      };
      return el;
    }
    default:
      throw new Error(`Unknown element type: ${type}`);
  }
}

export { createEmptyCells };
