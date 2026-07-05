import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';

interface SelectedRecord {
  id: string;
  record: Record<string, unknown>;
}

interface UseBitableSelectionResult {
  selectedRecord: SelectedRecord | null;
  loading: boolean;
  available: boolean;
  error: string | null;
}

export function useBitableSelection(): UseBitableSelectionResult {
  const [selectedRecord, setSelectedRecord] = useState<SelectedRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fieldMapRef = useRef<Map<string, string>>(new Map());
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const fetchRecord = useCallback(async (recordId: string) => {
    setLoading(true);
    try {
      const { bitable: bitableSDK } = await import('@lark-base-open/js-sdk');
      const table = await bitableSDK.base.getActiveTable();
      const recordValue = await table.getRecordById(recordId);

      if (recordValue) {
        const mapped: Record<string, unknown> = {};
        for (const [fieldId, cellValue] of Object.entries(recordValue.fields)) {
          const fieldName = fieldMapRef.current.get(fieldId) || fieldId;
          mapped[fieldName] = cellValue;
        }
        setSelectedRecord({
          id: recordId,
          record: mapped,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`获取选中记录失败: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const { bitable: bitableSDK } = await import('@lark-base-open/js-sdk');

        const table = await bitableSDK.base.getActiveTable();
        const fieldMetaList = await table.getFieldMetaList();
        const map = new Map<string, string>();
        for (const meta of fieldMetaList) {
          map.set(meta.id, meta.name);
        }
        fieldMapRef.current = map;

        const selection = await bitableSDK.base.getSelection();
        if (cancelled) return;

        if (selection?.recordId) {
          await fetchRecord(selection.recordId);
        }

        const unsub = bitableSDK.base.onSelectionChange(async (e) => {
          if (cancelled) return;
          const sel = e.data;
          if (sel?.recordId) {
            await fetchRecord(sel.recordId);
          }
        });

        if (cancelled) {
          unsub();
          return;
        }

        unsubscribeRef.current = unsub;
        setAvailable(true);
        setError(null);
      } catch (err: unknown) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        logger.warn(`Bitable SDK 不可用，降级为手动选择模式: ${msg}`);
        setAvailable(false);
        setError(msg);
      }
    };

    init();

    return () => {
      cancelled = true;
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    };
  }, [fetchRecord]);

  return { selectedRecord, loading, available, error };
}
