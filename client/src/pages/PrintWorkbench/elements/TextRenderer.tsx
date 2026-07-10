import { useRef, useEffect } from 'react';
import type { TextElement } from '@/types/template';
import { mmToPx } from '@/types/template';
import { replaceVariables } from '../shared/variable-utils';
import { formatFieldValue } from '../field-utils';

interface TextRendererProps {
  element: TextElement;
  zoom: number;
  record?: Record<string, unknown>;
  fieldTypes?: Record<string, number>;
  editMode: boolean;
  onContentChange?: (content: string) => void;
}

const TextRenderer = ({
  element,
  zoom,
  record,
  fieldTypes,
  editMode,
  onContentChange,
}: TextRendererProps) => {
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editMode && textRef.current) {
      textRef.current.style.height = 'auto';
      textRef.current.style.height = `${textRef.current.scrollHeight}px`;
    }
  }, [editMode, element.content]);

  const displayContent = editMode
    ? element.content
    : replaceVariables(
        element.content,
        record,
        fieldTypes,
      );

  const widthPx = mmToPx(element.width) * zoom;
  const heightPx = mmToPx(element.height) * zoom;

  if (editMode) {
    return (
      <textarea
        ref={textRef}
        value={element.content}
        onChange={(e) => onContentChange?.(e.target.value)}
        onPointerDown={(e) => e.stopPropagation()}
        className="w-full h-full resize-none outline-none border-0 bg-transparent overflow-hidden p-0"
        style={{
          fontSize: element.fontSize * zoom,
          fontWeight: element.bold ? 700 : 400,
          fontStyle: element.italic ? 'italic' : 'normal',
          textDecoration: element.underline ? 'underline' : 'none',
          textAlign: element.align,
          color: element.color,
          backgroundColor: element.backgroundColor === '#ffffff' ? 'transparent' : element.backgroundColor,
          lineHeight: element.lineHeight,
          width: widthPx,
          minHeight: heightPx,
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        }}
        rows={1}
      />
    );
  }

  return (
    <div
      style={{
        fontSize: element.fontSize * zoom,
        fontWeight: element.bold ? 700 : 400,
        fontStyle: element.italic ? 'italic' : 'normal',
        textDecoration: element.underline ? 'underline' : 'none',
        textAlign: element.align,
        color: element.color,
        backgroundColor: element.backgroundColor === '#ffffff' ? 'transparent' : element.backgroundColor,
        lineHeight: element.lineHeight,
        width: widthPx,
        minHeight: heightPx,
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {displayContent || ' '}
    </div>
  );
};

export default TextRenderer;
