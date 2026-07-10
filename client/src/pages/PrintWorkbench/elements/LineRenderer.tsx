import type { LineElement } from '@/types/template';
import { mmToPx } from '@/types/template';

interface LineRendererProps {
  element: LineElement;
  zoom: number;
}

const LineRenderer = ({ element, zoom }: LineRendererProps) => {
  const widthPx = mmToPx(element.width) * zoom;
  const borderStyle = element.style;

  return (
    <div
      style={{
        width: widthPx,
        borderTopWidth: `${element.thickness * zoom}px`,
        borderTopStyle: borderStyle,
        borderTopColor: element.color,
        height: 0,
      }}
    />
  );
};

export default LineRenderer;
