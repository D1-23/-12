import { useState, useCallback } from 'react';
import type { PrintElement } from '@/types/template';

export interface EditorState {
  currentPageId: string;
  selectedElementId: string | null;
  clipboard: PrintElement | null;
}

export function useEditorState(initialPageId: string) {
  const [currentPageId, setCurrentPageId] = useState(initialPageId);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<PrintElement | null>(null);

  const selectElement = useCallback((id: string | null) => {
    setSelectedElementId(id);
  }, []);

  const switchPage = useCallback((pageId: string) => {
    setCurrentPageId(pageId);
    setSelectedElementId(null);
  }, []);

  const copyElement = useCallback((element: PrintElement) => {
    setClipboard(element);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedElementId(null);
  }, []);

  return {
    currentPageId,
    selectedElementId,
    clipboard,
    selectElement,
    switchPage,
    copyElement,
    clearSelection,
    setClipboard,
  };
}
