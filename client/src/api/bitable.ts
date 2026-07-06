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

export async function getAllRecords(
  fieldMap: Map<string, string>
): Promise<BitableRecord[]> {
  const sdk = await getSDK();
  if (!sdk) throw new Error('Bitable SDK 不可用');

  const table = await sdk.base.getActiveTable();
  const allRecords: BitableRecord[] = [];
  let pageToken: string | undefined;

  do {
    const result = await table.getRecords({ pageSize: 500, pageToken });
    for (const rec of result.records) {
      const mapped: Record<string, unknown> = {};
      if (rec.fields) {
        for (const [fieldId, cellValue] of Object.entries(rec.fields)) {
          const fieldName = fieldMap.get(fieldId) || fieldId;
          mapped[fieldName] = cellValue;
        }
      }
      allRecords.push({ id: rec.recordId, record: mapped });
    }
    pageToken = result.hasMore ? result.pageToken : undefined;
  } while (pageToken);

  return allRecords;
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
