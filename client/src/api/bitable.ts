import { capabilityClient } from '@lark-apaas/client-toolkit';
import { logger } from '@lark-apaas/client-toolkit/logger';

const BITABLE_PLUGIN_ID = 'feishu_bitable_record_query_for_print';

export interface BitableRecord {
  id: string;
  record: Record<string, unknown>;
}

export interface SearchRecordsResult {
  records: BitableRecord[];
  hasMore: boolean;
  pageToken?: string;
  total: number;
}

export interface GetRecordResult {
  id: string;
  record: Record<string, unknown>;
}

export interface SearchRecordsParams {
  filter?: {
    conjunction: 'and' | 'or';
    conditions: Array<{
      fieldName: string;
      operator: string;
      value: string[];
    }>;
  };
  sort?: Array<{
    fieldName: string;
    desc: boolean;
  }>;
  pageSize?: number;
  pageToken?: string;
}

let cachedPlugin: ReturnType<typeof capabilityClient.load> | null = null;
let configError = false;

function getPlugin() {
  if (configError) return null;
  if (!cachedPlugin) {
    try {
      cachedPlugin = capabilityClient.load(BITABLE_PLUGIN_ID);
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        err.name === 'CapabilityNotFoundError'
      ) {
        configError = true;
        logger.error('多维表格插件未配置，请在插件配置页面完成配置');
        return null;
      }
      throw err;
    }
  }
  return cachedPlugin;
}

export function isPluginConfigured(): boolean {
  return !configError;
}

export function resetPluginCache(): void {
  cachedPlugin = null;
  configError = false;
}

export async function searchRecords(
  params: SearchRecordsParams = {}
): Promise<SearchRecordsResult> {
  const plugin = getPlugin();
  if (!plugin) {
    throw new Error('多维表格插件未配置，请在插件配置页面完成配置');
  }
  try {
    const input: Record<string, unknown> = { ...params };
    const result = await plugin.call<SearchRecordsResult>(
      'searchRecords',
      input
    );
    return result;
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : String(err);
    logger.error(`searchRecords 调用失败: ${message}`);
    throw err;
  }
}

export async function getRecord(
  recordID: string
): Promise<GetRecordResult> {
  const plugin = getPlugin();
  if (!plugin) {
    throw new Error('多维表格插件未配置，请在插件配置页面完成配置');
  }
  try {
    const input: Record<string, unknown> = { recordID };
    const result = await plugin.call<GetRecordResult>(
      'getRecord',
      input
    );
    return result;
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : String(err);
    logger.error(`getRecord 调用失败: ${message}`);
    throw err;
  }
}
