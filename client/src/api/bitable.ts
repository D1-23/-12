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

async function getSDK() {
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
  return sdkModule.bitable;
}

export function isSDKAvailable(): boolean {
  return !sdkInitFailed;
}

export async function getFieldMetaList(): Promise<FieldMeta[]> {
  const sdk = await getSDK();
  if (!sdk) throw new Error('Bitable SDK 不可用');
  const table = await sdk.base.getActiveTable();
  const metaList = await table.getFieldMetaList();
  return metaList.map((m: { id: string; name: string; type?: number }) => ({
    id: m.id,
    name: m.name,
    type: m.type ?? 0,
  }));
}

export interface RecordsPage {
  records: BitableRecord[];
  hasMore: boolean;
  pageToken?: string;
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
  pageToken?: string
): Promise<RecordsPage> {
  const sdk = await getSDK();
  if (!sdk) throw new Error('Bitable SDK 不可用');

  const table = await sdk.base.getActiveTable();
  const result = await table.getRecords({ pageSize: 500, pageToken });
  const records = result.records.map((rec) => mapRecordFields(rec, fieldMap));

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
  let token: string | undefined;

  do {
    const page = await getRecordsByPage(fieldMap, token);
    allRecords.push(...page.records);
    token = page.pageToken;
  } while (token);

  return allRecords;
}

export async function getSelectedRecordIds(): Promise<string[]> {
  const sdk = await getSDK();
  if (!sdk) {
    logger.warn('getSelectedRecordIds: SDK 不可用');
    return [];
  }
  try {
    const table = await sdk.base.getActiveTable();
    const view = await table.getActiveView();
    const viewType = await view.getType();
    logger.info(`getSelectedRecordIds: 当前视图类型=${viewType}`);

    const gridView = view as unknown as { getSelectedRecordIdList?: () => Promise<string[]> };
    if (!gridView.getSelectedRecordIdList) {
      logger.warn('getSelectedRecordIds: 当前视图不支持 getSelectedRecordIdList');
      return [];
    }
    const ids = await gridView.getSelectedRecordIdList();
    logger.info(`getSelectedRecordIds: 获取到 ${ids?.length ?? 0} 条选中记录`);
    return ids ?? [];
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`getSelectedRecordIds: 获取失败 - ${msg}`);
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
  const recordValues = await table.getRecordsByIds(recordIds);
  return recordValues.map((rec, idx) =>
    mapRecordFields(
      { recordId: recordIds[idx], fields: rec.fields as Record<string, unknown> },
      fieldMap,
    )
  );
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

  const table = await sdk.base.getActiveTable();
  const records: BitableRecord[] = [];
  for (const recordId of recordIdList) {
    const rec = await table.getRecordById(recordId);
    if (rec) {
      records.push(mapRecordFields(
        { recordId, fields: rec.fields as Record<string, unknown> },
        fieldMap,
      ));
    }
  }
  return records;
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
