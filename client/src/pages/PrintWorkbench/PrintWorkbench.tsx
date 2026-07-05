import { useState, useEffect, useCallback } from 'react';
import { FileText } from 'lucide-react';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { bitable } from '@/api';
import type { PrintTemplate, TemplateType } from '@/types/template';
import { loadTemplates, saveTemplates } from '@/types/template';
import { useBitableSelection } from '@/hooks/useBitableSelection';
import TemplateList from './TemplateList';
import TemplatePreview from './TemplatePreview';
import TemplateConfig from './TemplateConfig';

type ViewMode = 'list' | 'preview' | 'config';

interface RecordWithId {
  id: string;
  record: Record<string, unknown>;
}

const SAMPLE_RECORDS: RecordWithId[] = [
  {
    id: 'sample_1',
    record: {
      '客户名称': { text: '张三科技有限公司' },
      '拜访日期': 1719792000000,
      '跟进要点': { text: '讨论了 Q3 大客户回访计划，客户对新方案表示认可，希望在下周安排一次技术评审会议。' },
      '联系人': { text: '李经理' },
      '联系电话': '13800138000',
      '预算金额': 150000,
      '状态': '进行中',
      '下次拜访': 1720396800000,
      '备注': { text: '需要准备详细的技术方案文档，包含系统架构和实施时间表。' },
    },
  },
  {
    id: 'sample_2',
    record: {
      '客户名称': { text: '李四网络科技公司' },
      '拜访日期': 1719878400000,
      '跟进要点': { text: '客户提出了新的需求，关于系统集成方面的要求。' },
      '联系人': { text: '王总监' },
      '联系电话': '13900139000',
      '预算金额': 280000,
      '状态': '待确认',
      '下次拜访': 1720483200000,
      '备注': { text: '需要与技术团队讨论可行性方案。' },
    },
  },
];

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function createDefaultTemplates(allFields: string[]): PrintTemplate[] {
  const now = Date.now();
  return [
    {
      id: generateId(),
      name: '记录详情',
      type: 'record',
      fields: [...allFields],
      margin: 'standard',
      fontSize: 'medium',
      titleField: allFields[0] || '',
      pinned: false,
      createdAt: now,
    },
    {
      id: generateId(),
      name: '列表总览',
      type: 'view',
      fields: allFields.slice(0, Math.min(5, allFields.length)),
      margin: 'narrow',
      fontSize: 'small',
      titleField: allFields[0] || '',
      pinned: false,
      createdAt: now - 1,
    },
  ];
}

const PrintWorkbench = () => {
  const [view, setView] = useState<ViewMode>('list');
  const [templates, setTemplates] = useState<PrintTemplate[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [allFields, setAllFields] = useState<string[]>([]);
  const [records, setRecords] = useState<RecordWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectedRecord, available: sdkAvailable } = useBitableSelection();

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        let loadedRecords: RecordWithId[];
        if (bitable.isPluginConfigured()) {
          const result = await bitable.searchRecords({ pageSize: 50 });
          loadedRecords = result.records.map((r) => ({ id: r.id, record: r.record }));
          if (loadedRecords.length === 0) loadedRecords = SAMPLE_RECORDS;
        } else {
          loadedRecords = SAMPLE_RECORDS;
        }
        setRecords(loadedRecords);

        const fieldSet = new Set<string>();
        for (const { record } of loadedRecords) {
          for (const key of Object.keys(record)) {
            fieldSet.add(key);
          }
        }
        const fields = Array.from(fieldSet);
        setAllFields(fields);

        const stored = loadTemplates();
        if (stored.length > 0) {
          setTemplates(stored);
        } else {
          const defaults = createDefaultTemplates(fields);
          setTemplates(defaults);
          saveTemplates(defaults);
        }
      } catch (err) {
        logger.error('加载数据失败', String(err));
        const fallbackRecords = SAMPLE_RECORDS;
        setRecords(fallbackRecords);
        const fieldSet = new Set<string>();
        for (const { record } of fallbackRecords) {
          for (const key of Object.keys(record)) {
            fieldSet.add(key);
          }
        }
        const fields = Array.from(fieldSet);
        setAllFields(fields);
        const defaults = createDefaultTemplates(fields);
        setTemplates(defaults);
        saveTemplates(defaults);
      }
      setLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (sdkAvailable && selectedRecord && view === 'list' && templates.length > 0) {
      const first = templates[0];
      setActiveTemplateId(first.id);
      setView('preview');
    }
  }, [sdkAvailable, selectedRecord, view, templates]);

  useEffect(() => {
    if (sdkAvailable && selectedRecord) {
      const newFields = Object.keys(selectedRecord.record);
      setAllFields((prev) => {
        const prevSet = new Set(prev);
        let changed = false;
        for (const f of newFields) {
          if (!prevSet.has(f)) { changed = true; break; }
        }
        if (!changed && prev.length === newFields.length) return prev;
        return newFields;
      });
    }
  }, [sdkAvailable, selectedRecord]);

  const activeTemplate = templates.find((t) => t.id === activeTemplateId) ?? null;

  const handleSelectTemplate = useCallback((template: PrintTemplate) => {
    setActiveTemplateId(template.id);
    setView('preview');
  }, []);

  const handleCreateTemplate = useCallback(
    (name: string, type: TemplateType) => {
      const newTemplate: PrintTemplate = {
        id: generateId(),
        name,
        type,
        fields: [...allFields],
        margin: 'standard',
        fontSize: 'medium',
        titleField: allFields[0] || '',
        pinned: false,
        createdAt: Date.now(),
      };
      const updated = [...templates, newTemplate];
      setTemplates(updated);
      saveTemplates(updated);
      setActiveTemplateId(newTemplate.id);
      setView('preview');
    },
    [templates, allFields]
  );

  const handleDeleteTemplate = useCallback(
    (id: string) => {
      if (templates.length <= 1) return;
      const updated = templates.filter((t) => t.id !== id);
      setTemplates(updated);
      saveTemplates(updated);
      if (activeTemplateId === id) {
        setActiveTemplateId(null);
        setView('list');
      }
    },
    [templates, activeTemplateId]
  );

  const handleDuplicateTemplate = useCallback(
    (id: string) => {
      const source = templates.find((t) => t.id === id);
      if (!source) return;
      const copy: PrintTemplate = {
        ...source,
        id: generateId(),
        name: `${source.name} (副本)`,
        createdAt: Date.now(),
      };
      const updated = [...templates, copy];
      setTemplates(updated);
      saveTemplates(updated);
    },
    [templates]
  );

  const handleSaveTemplate = useCallback(
    (updated: PrintTemplate) => {
      const newTemplates = templates.map((t) =>
        t.id === updated.id ? updated : t
      );
      setTemplates(newTemplates);
      saveTemplates(newTemplates);
    },
    [templates]
  );

  const handleUpdateFields = useCallback(
    (templateId: string, fields: string[]) => {
      const newTemplates = templates.map((t) =>
        t.id === templateId ? { ...t, fields } : t
      );
      setTemplates(newTemplates);
      saveTemplates(newTemplates);
    },
    [templates]
  );

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-xs text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (view === 'list') {
    return (
      <TemplateList
        templates={templates}
        activeTemplateId={activeTemplateId}
        onSelect={handleSelectTemplate}
        onCreate={handleCreateTemplate}
        onDelete={handleDeleteTemplate}
        onDuplicate={handleDuplicateTemplate}
      />
    );
  }

  if (view === 'config' && activeTemplate) {
    return (
      <TemplateConfig
        template={activeTemplate}
        allFields={allFields}
        onSave={handleSaveTemplate}
        onBack={() => setView('preview')}
      />
    );
  }

  if (view === 'preview' && activeTemplate) {
    const previewRecords = sdkAvailable && selectedRecord
      ? [selectedRecord]
      : records;
    return (
      <TemplatePreview
        template={activeTemplate}
        recordsWithIds={previewRecords}
        allFields={allFields}
        onBack={() => setView('list')}
        onEdit={() => setView('config')}
        onUpdateFields={(fields) => handleUpdateFields(activeTemplate.id, fields)}
      />
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileText className="size-6" />
          </EmptyMedia>
          <EmptyTitle>暂无记录</EmptyTitle>
          <EmptyDescription>
            请在多维表格中选择要打印的记录
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
};

export default PrintWorkbench;
