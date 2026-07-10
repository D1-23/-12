import { QRCodeSVG } from 'qrcode.react';
import type { QrCodeElement } from '@/types/template';
import { mmToPx } from '@/types/template';
import { replaceVariables } from '../shared/variable-utils';

interface QrCodeRendererProps {
  element: QrCodeElement;
  zoom: number;
  record?: Record<string, unknown>;
  fieldTypes?: Record<string, number>;
  editMode: boolean;
}

const QrCodeRenderer = ({
  element,
  zoom,
  record,
  fieldTypes,
  editMode,
}: QrCodeRendererProps) => {
  const content = editMode
    ? element.content
    : replaceVariables(element.content, record, fieldTypes);

  const sizePx = mmToPx(Math.min(element.width, element.height)) * zoom;

  return (
    <div
      style={{
        width: mmToPx(element.width) * zoom,
        height: mmToPx(element.height) * zoom,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <QRCodeSVG
        value={content || ' '}
        size={sizePx}
        level="M"
      />
    </div>
  );
};

export default QrCodeRenderer;
