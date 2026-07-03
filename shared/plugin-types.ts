// ---- plugin:feishu_bitable_record_query_for_print ----
// ============================================================
// 插件 feishu_bitable_record_query_for_print (飞书多维表格记录查询（打印专用）) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FeishuBitableRecordQueryForPrintGetrecordInput {
  /** [object Object] */
  recordID: string;
}

/**
 * capabilityClient.load('feishu_bitable_record_query_for_print').call<FeishuBitableRecordQueryForPrintGetrecordOutput>('getRecord', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { id, record } = result;
 */
export interface FeishuBitableRecordQueryForPrintGetrecordOutput {
  /** [object Object] */
  id: string;
  /** [object Object] */
  record?: {
    '零件代码': {
      text: string;
    };
    '逾期天数': unknown;
    '判责人一.直属上级': number[];
    '判责人三': number[];
    '判责人四': number[];
    'COGI累计条目': number;
    '责任人一': number[];
    '责任人二': number[];
    '责任人二.直属上级': number[];
    '责任人三': number[];
    '判责人一直属上级': number[];
    '判责人三直属上级': number[];
    '判责人三直属上级.直属上级': number[];
    '责任人二.部门': string[];
    '责任人二直属上级': number[];
    '责任人三直属上级.直属上级': number[];
    'COGI开始日期（拉取）': unknown;
    '判责人二': number[];
    '判责人四.直属上级': number[];
    '判责人四直属上级': number[];
    '最后更新时间': number;
    'COGI累计数量': number;
    '责任人一.直属上级': number[];
    '责任人三.部门': string[];
    '当前升级对象': number[];
    '判责人一': number[];
    '判责人二直属上级.直属上级': number[];
    '判责人四直属上级.直属上级': number[];
    '记录创建时间': number;
    '判责人一直属上级.直属上级': number[];
    '判责人二直属上级': number[];
    '工厂零件号': unknown;
    'COGI创建时间（格式化）': unknown;
    '持续时间区间': unknown;
    '物料描述': unknown;
    '后勤处理组': unknown;
    '责任人一直属上级': number[];
    '责任人三.直属上级': number[];
    '责任人三直属上级': number[];
    '状态': unknown;
    '判责人二.直属上级': number[];
    '工厂代码': unknown;
    'COGI产生原因': string;
    '责任人一直属上级.直属上级': number[];
    '开始日期（格式）': {
      bizType: string;
      value: unknown;
    };
    '计划完成日期': unknown;
    '持续天数': number;
    '判责人三.直属上级': number[];
    '库控判责日期': number;
    '单位': unknown;
    '责任人一.部门': string[];
    '责任人二直属上级.直属上级': number[];
    'COGI创建时间': unknown;
    '判责人是否可见': unknown;
  };
}

export interface FeishuBitableRecordQueryForPrintSearchrecordsInput {
  /** [object Object] */
  sort?: {
    fieldName: string;
    desc: boolean;
  }[];
  /** [object Object] */
  filter?: {
    conditions: {
      operator: string;
      value: string[];
      fieldName: string;
    }[];
    conjunction: string;
  };
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  fieldNames?: string[];
}

/**
 * capabilityClient.load('feishu_bitable_record_query_for_print').call<FeishuBitableRecordQueryForPrintSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { hasMore, pageToken, total, ... } = result;
 */
export interface FeishuBitableRecordQueryForPrintSearchrecordsOutput {
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  total?: number;
  /** [object Object] */
  records: {
    id: string;
    record: {
      '责任人二直属上级.直属上级': number[];
      '状态': unknown;
      '判责人二直属上级': number[];
      '判责人三': number[];
      '判责人三直属上级.直属上级': number[];
      '零件代码': {
        text: string;
      };
      '责任人三.部门': string[];
      '持续天数': number;
      '库控判责日期': number;
      '物料描述': unknown;
      '责任人二直属上级': number[];
      '责任人三.直属上级': number[];
      '开始日期（格式）': {
        bizType: string;
        value: unknown;
      };
      '判责人一.直属上级': number[];
      '判责人三.直属上级': number[];
      '判责人四直属上级': number[];
      '判责人四直属上级.直属上级': number[];
      '责任人一直属上级': number[];
      '责任人一.部门': string[];
      '判责人一直属上级': number[];
      '判责人一直属上级.直属上级': number[];
      '判责人三直属上级': number[];
      '最后更新时间': number;
      '判责人是否可见': unknown;
      '工厂零件号': unknown;
      'COGI累计条目': number;
      '责任人二.直属上级': number[];
      '责任人三直属上级.直属上级': number[];
      '判责人二': number[];
      '判责人二.直属上级': number[];
      '判责人四': number[];
      '判责人四.直属上级': number[];
      '持续时间区间': unknown;
      '责任人一': number[];
      '后勤处理组': unknown;
      '责任人二': number[];
      '责任人三直属上级': number[];
      '计划完成日期': unknown;
      '逾期天数': unknown;
      'COGI开始日期（拉取）': unknown;
      '判责人一': number[];
      '单位': unknown;
      'COGI产生原因': string;
      '责任人一直属上级.直属上级': number[];
      '责任人二.部门': string[];
      '当前升级对象': number[];
      'COGI创建时间': unknown;
      'COGI创建时间（格式化）': unknown;
      'COGI累计数量': number;
      '责任人一.直属上级': number[];
      '责任人三': number[];
      '判责人二直属上级.直属上级': number[];
      '记录创建时间': number;
      '工厂代码': unknown;
    };
  }[];
}
// ---- end:feishu_bitable_record_query_for_print ----