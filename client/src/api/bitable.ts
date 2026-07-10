import { logger } from '@lark-apaas/client-toolkit/logger';

export interface BitableRecord {
  id: string;
  record: Record<string, unknown>;
}

export interface FieldMeta {
  id: string;
  name: string;
  type: number;
}

let sdkModule: typeof import('@lark-base-open/js-sdk') | null = null;
let sdkInitFailed = false;

const SDK_CALL_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} 超时 (${ms}ms)`)), ms),
    ),
  ]);
}

async function getSDKModule(): Promise<typeof import('@lark-base-open/js-sdk') | null> {
  if (sdkInitFailed) return null;
  if (!sdkModule) {
    try {
      sdkModule = await import('@lark-base-open/js-sdk');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(`Bitable SDK 加载失败: ${msg}`);
      sdkInitFailed = true;
      return null;
    }
  }
  return sdkModule;
}

async function getSDK() {
  const mod = await getSDKModule();
  return mod?.bitable ?? null;
}

export function isSDKAvailable(): boolean {
  return !sdkInitFailed;
}

export async function getFieldMetaList(): Promise<FieldMeta[]> {
  const sdk = await getSDK();
  if (!sdk) throw new Error('Bitable SDK 不可用');
  const table = await withTimeout(sdk.base.getActiveTable(), SDK_CALL_TIMEOUT_MS, 'getActiveTable');
  const metaList = await withTimeout(table.getFieldMetaList(), SDK_CALL_TIMEOUT_MS, 'getFieldMetaList');
  return metaList.map((m: { id: string; name: string; type?: number }) => ({
    id: m.id,
    name: m.name,
    type: m.type ?? 0,
  }));
}

export interface RecordsPage {
  records: BitableRecord[];
  hasMore: boolean;
  pageToken?: number;
}

function mapRecordFields(
  rec: { recordId: string; fields: Record<string, unknown> },
  fieldMap: Map<string, string>
): BitableRecord {
  const mapped: Record<string, unknown> = {};
  if (rec.fields) {
    for (const [fieldId, cellValue] of Object.entries(rec.fields)) {
      const fieldName = fieldMap.get(fieldId) || fieldId;
      mapped[fieldName] = cellValue;
    }
  }
  return { id: rec.recordId, record: mapped };
}

export async function getRecordsByPage(
  fieldMap: Map<string, string>,
  pageToken?: number
): Promise<RecordsPage> {
  const sdk = await getSDK();
  if (!sdk) throw new Error('Bitable SDK 不可用');

  const table = await sdk.base.getActiveTable();
  const result = await table.getRecordsByPage({ pageSize: 500, pageToken });
  const records = result.records.map(
    (rec: { recordId: string; fields: Record<string, unknown> }) =>
      mapRecordFields(rec, fieldMap),
  );

  return {
    records,
    hasMore: result.hasMore,
    pageToken: result.hasMore ? result.pageToken : undefined,
  };
}

export async function getAllRecords(
  fieldMap: Map<string, string>
): Promise<BitableRecord[]> {
  const allRecords: BitableRecord[] = [];
  let token: number | undefined;

  do {
    const page = await getRecordsByPage(fieldMap, token);
    allRecords.push(...page.records);
    token = page.pageToken;
  } while (token);

  return allRecords;
}

export async function getSelectedRecordIds(): Promise<string[]> {
  const sdk = await getSDK();
  if (!sdk) return [];
  try {
    const table = await sdk.base.getActiveTable();
    const view = await table.getActiveView();
    const gridView = view as unknown as { getSelectedRecordIdList?: () => Promise<string[]> };
    if (typeof gridView.getSelectedRecordIdList !== 'function') return [];
    const ids = await gridView.getSelectedRecordIdList();
    return ids ?? [];
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`getSelectedRecordIds 获取失败: ${msg}`);
    return [];
  }
}

export async function getRecordsByIds(
  recordIds: string[],
  fieldMap: Map<string, string>
): Promise<BitableRecord[]> {
  const sdk = await getSDK();
  if (!sdk) throw new Error('Bitable SDK 不可用');
  if (recordIds.length === 0) return [];

  const table = await sdk.base.getActiveTable();
  const results = await Promise.allSettled(
    recordIds.map((id) => table.getRecordById(id)),
  );
  const records: BitableRecord[] = [];
  results.forEach((result, idx) => {
    if (result.status === 'fulfilled' && result.value) {
      records.push(
        mapRecordFields(
          { recordId: recordIds[idx], fields: result.value.fields as Record<string, unknown> },
          fieldMap,
        ),
      );
    }
  });
  return records;
}

export async function selectRecordsFromBitable(): Promise<BitableRecord[]> {
  const sdk = await getSDK();
  if (!sdk) throw new Error('Bitable SDK 不可用');

  const { tableId, viewId } = await sdk.base.getSelection();
  const recordIdList: string[] = await sdk.ui.selectRecordIdList(tableId, viewId);
  if (!recordIdList || recordIdList.length === 0) return [];

  const metaList = await getFieldMetaList();
  const fieldMap = new Map<string, string>();
  for (const m of metaList) fieldMap.set(m.id, m.name);

  return getRecordsByIds(recordIdList, fieldMap);
}

export async function getTableName(): Promise<string> {
  const sdk = await getSDK();
  if (!sdk) return '';
  try {
    const table = await sdk.base.getActiveTable();
    return await table.getName();
  } catch {
    return '';
  }
}

export async function getRecordById(
  recordId: string,
  fieldMap: Map<string, string>
): Promise<BitableRecord | null> {
  const sdk = await getSDK();
  if (!sdk) throw new Error('Bitable SDK 不可用');

  const table = await sdk.base.getActiveTable();
  const recordValue = await table.getRecordById(recordId);

  if (!recordValue) return null;

  const mapped: Record<string, unknown> = {};
  if (recordValue.fields) {
    for (const [fieldId, cellValue] of Object.entries(recordValue.fields)) {
      const fieldName = fieldMap.get(fieldId) || fieldId;
      mapped[fieldName] = cellValue;
    }
  }

  return { id: recordId, record: mapped };
}

export async function bridgeSetData<T>(key: string, data: T): Promise<boolean> {
  const sdk = await getSDK();
  if (!sdk) return false;
  try {
    return await withTimeout(sdk.bridge.setData(key, data), SDK_CALL_TIMEOUT_MS, 'bridge.setData');
  } catch (err) {
    logger.warn(`bridge.setData 失败: ${String(err)}`);
    return false;
  }
}

export async function bridgeGetData<T>(key: string): Promise<T | null> {
  const sdk = await getSDK();
  if (!sdk) return null;
  try {
    const data = await withTimeout(sdk.bridge.getData<T>(key), SDK_CALL_TIMEOUT_MS, 'bridge.getData');
    return data ?? null;
  } catch (err) {
    logger.warn(`bridge.getData 失败: ${String(err)}`);
    return null;
  }
}

export async function showToast(
  message: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'info',
): Promise<void> {
  const mod = await getSDKModule();
  if (!mod) return;
  try {
    const toastType = mod.ToastType?.[type];
    await mod.bitable.ui.showToast({ toastType, message });
  } catch (err) {
    logger.warn(`showToast 失败: ${String(err)}`);
  }
}
