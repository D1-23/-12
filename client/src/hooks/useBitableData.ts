import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import {
  getAllRecords,
  getFieldMetaList,
  getRecordById,
  type BitableRecord,
} from '@/api/bitable';

interface UseBitableDataResult {
  records: BitableRecord[];
  allFields: string[];
  selectedRecord: BitableRecord | null;
  sdkAvailable: boolean;
  loading: boolean;
  reload: () => void;
}

export function useBitableData(): UseBitableDataResult {
  const [records, setRecords] = useState<BitableRecord[]>([]);
  const [allFields, setAllFields] = useState<string[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<BitableRecord | null>(null);
  const [sdkAvailable, setSdkAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const fieldMapRef = useRef<Map<string, string>>(new Map());
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const reloadFlag = useRef(0);

  const fetchSelectedRecord = useCallback(async (recordId: string) => {
    try {
      const rec = await getRecordById(recordId, fieldMapRef.current);
      if (rec) setSelectedRecord(rec);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`获取选中记录失败: ${msg}`);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const metaList = await getFieldMetaList();
      const map = new Map<string, string>();
      for (const m of metaList) {
        map.set(m.id, m.name);
      }
      fieldMapRef.current = map;

      const fieldNames = metaList.map((m) => m.name);
      setAllFields(fieldNames);

      const allRecs = await getAllRecords(map);
      setRecords(allRecs);

      setSdkAvailable(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(`Bitable 数据加载失败，降级为 demo 模式: ${msg}`);
      setSdkAvailable(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      await loadData();
      if (cancelled) return;

      try {
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
        logger.warn(`Bitable 选中监听初始化失败: ${msg}`);
      }
    };

    init();

    return () => {
      cancelled = true;
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    };
  }, [loadData, fetchSelectedRecord, reloadFlag.current]);

  const reload = useCallback(() => {
    reloadFlag.current += 1;
    loadData();
  }, [loadData]);

  return {
    records,
    allFields,
    selectedRecord,
    sdkAvailable,
    loading,
    reload,
  };
}
