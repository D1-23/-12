import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import {
  getRecordsByPage,
  getFieldMetaList,
  getRecordById,
  type BitableRecord,
} from '@/api/bitable';

interface UseBitableDataResult {
  selectedRecord: BitableRecord | null;
  allFields: string[];
  allRecords: BitableRecord[];
  recordsLoading: boolean;
  sdkAvailable: boolean;
  loading: boolean;
  loadAllRecords: () => void;
}

export function useBitableData(): UseBitableDataResult {
  const [allFields, setAllFields] = useState<string[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<BitableRecord | null>(null);
  const [allRecords, setAllRecords] = useState<BitableRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [sdkAvailable, setSdkAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const fieldMapRef = useRef<Map<string, string>>(new Map());
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const allRecordsLoadedRef = useRef(false);

  const fetchSelectedRecord = useCallback(async (recordId: string) => {
    try {
      const rec = await getRecordById(recordId, fieldMapRef.current);
      if (rec) setSelectedRecord(rec);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`获取选中记录失败: ${msg}`);
    }
  }, []);

  const loadAllRecords = useCallback(async () => {
    if (allRecordsLoadedRef.current || recordsLoading) return;
    setRecordsLoading(true);
    try {
      const collected: BitableRecord[] = [];
      let token: string | undefined;

      do {
        const page = await getRecordsByPage(fieldMapRef.current, token);
        collected.push(...page.records);
        setAllRecords([...collected]);
        token = page.pageToken;
      } while (token);

      allRecordsLoadedRef.current = true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`全量记录加载失败: ${msg}`);
    } finally {
      setRecordsLoading(false);
    }
  }, [recordsLoading]);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      setLoading(true);
      try {
        const metaList = await getFieldMetaList();
        if (cancelled) return;

        const map = new Map<string, string>();
        for (const m of metaList) {
          map.set(m.id, m.name);
        }
        fieldMapRef.current = map;
        setAllFields(metaList.map((m) => m.name));
        setSdkAvailable(true);

        const { bitable: sdk } = await import('@lark-base-open/js-sdk');
        const selection = await sdk.base.getSelection();
        if (cancelled) return;

        if (selection?.recordId) {
          await fetchSelectedRecord(selection.recordId);
        }

        const unsub = sdk.base.onSelectionChange(async (e) => {
          if (cancelled) return;
          const sel = e.data;
          if (sel?.recordId) {
            await fetchSelectedRecord(sel.recordId);
          }
        });

        if (cancelled) {
          unsub();
          return;
        }
        unsubscribeRef.current = unsub;
      } catch (err: unknown) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        logger.warn(`Bitable 初始化失败: ${msg}`);
        setSdkAvailable(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    init();

    return () => {
      cancelled = true;
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    };
  }, [fetchSelectedRecord]);

  return {
    selectedRecord,
    allFields,
    allRecords,
    recordsLoading,
    sdkAvailable,
    loading,
    loadAllRecords,
  };
}
