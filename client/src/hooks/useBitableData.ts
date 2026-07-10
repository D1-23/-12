import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import {
  getRecordsByPage,
  getFieldMetaList,
  getRecordById,
  getSelectedRecordIds,
  getRecordsByIds,
  getTableName,
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
  selectedRecords: BitableRecord[];
  fieldTypes: Record<string, number>;
  tableName: string;
}

const MAX_INIT_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useBitableData(): UseBitableDataResult {
  const [allFields, setAllFields] = useState<string[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<BitableRecord | null>(null);
  const [allRecords, setAllRecords] = useState<BitableRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [sdkAvailable, setSdkAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedRecords, setSelectedRecords] = useState<BitableRecord[]>([]);
  const [fieldTypes, setFieldTypes] = useState<Record<string, number>>({});
  const [tableName, setTableName] = useState<string>('');
  const fieldMapRef = useRef<Map<string, string>>(new Map());
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const allRecordsLoadedRef = useRef(false);
  const prevSelectionKeyRef = useRef<string>('');

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
      let token: number | undefined;

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

  const fetchSelectedRecords = useCallback(async () => {
    try {
      const selectedIds = await getSelectedRecordIds();
      const selectionKey = selectedIds.slice().sort().join(',');
      if (selectionKey === prevSelectionKeyRef.current) return;
      prevSelectionKeyRef.current = selectionKey;

      if (selectedIds.length === 0) {
        setSelectedRecords([]);
        return;
      }

      const records = await getRecordsByIds(selectedIds, fieldMapRef.current);
      setSelectedRecords(records);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`获取选中记录列表失败: ${msg}`);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const initWithRetry = async (attempt: number) => {
      try {
        logger.info(`Bitable 初始化第 ${attempt} 次尝试`);
        const metaList = await getFieldMetaList();
        if (cancelled) return;

        const map = new Map<string, string>();
        const types: Record<string, number> = {};
        for (const m of metaList) {
          map.set(m.id, m.name);
          types[m.name] = m.type;
        }
        fieldMapRef.current = map;
        setAllFields(metaList.map((m) => m.name));
        setFieldTypes(types);
        setSdkAvailable(true);
        logger.info('Bitable 字段元数据加载成功');

        const name = await getTableName();
        if (!cancelled && name) setTableName(name);

        const { bitable: sdk } = await import('@lark-base-open/js-sdk');
        const selection = await sdk.base.getSelection();
        if (cancelled) return;

        if (selection?.recordId) {
          await fetchSelectedRecord(selection.recordId);
        }
        await fetchSelectedRecords();

        const unsub = sdk.base.onSelectionChange(async (e) => {
          if (cancelled) return;
          const sel = e.data;
          if (sel?.recordId) {
            await fetchSelectedRecord(sel.recordId);
          }
          await fetchSelectedRecords();
        });

        const activeTable = await sdk.base.getActiveTable();
        const unsubRecordModify = (
          activeTable as unknown as {
            onRecordModify: (cb: () => void) => () => void;
          }
        ).onRecordModify(async () => {
          if (cancelled) return;
          const sel = await sdk.base.getSelection();
          if (sel?.recordId) {
            await fetchSelectedRecord(sel.recordId);
          }
          await fetchSelectedRecords();
        });

        if (cancelled) {
          unsub();
          unsubRecordModify();
          return;
        }
        unsubscribeRef.current = () => {
          unsub();
          unsubRecordModify();
        };
        logger.info('Bitable 事件监听器注册成功');
      } catch (err: unknown) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        logger.warn(`Bitable 初始化第 ${attempt} 次失败: ${msg}`);

        if (attempt < MAX_INIT_RETRIES) {
          logger.info(`将在 ${RETRY_DELAY_MS}ms 后重试...`);
          await sleep(RETRY_DELAY_MS);
          if (!cancelled) {
            await initWithRetry(attempt + 1);
          }
        } else {
          logger.error('Bitable 初始化已达到最大重试次数，放弃');
          setSdkAvailable(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    initWithRetry(1);

    return () => {
      cancelled = true;
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    };
  }, [fetchSelectedRecord, fetchSelectedRecords]);

  return {
    selectedRecord,
    allFields,
    allRecords,
    recordsLoading,
    sdkAvailable,
    loading,
    loadAllRecords,
    selectedRecords,
    fieldTypes,
    tableName,
  };
}
