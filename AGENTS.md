# UI 设计指南

> **设计类型**: App 设计（应用架构设计）
> **确认检查**: 本指南适用于可交互的应用/网站/工具。

> ℹ️ Section 1 为设计意图与决策上下文。Code agent 实现时以 Section 2 及之后的具体参数为准。

## 1. Design Archetype (设计原型)

### 1.1 内容理解

- **目标用户**: 飞书多维表格用户，在侧边栏内管理模板列表/预览打印，编辑时进入全屏可视化拖拽编辑器
- **核心目的**: 引导行动 — 拖拽组件自由排版、绑定字段变量、预览并确认打印效果
- **情绪基调**: 稳重、专业、工具化

### 1.2 设计方向

- **Design Style**: Feishu Design — 飞书设计语言 x 中性灰底 x 蓝色主交互
- **Application Type**: Tool (Sidebar Plugin) — 列表/预览在侧边栏内，编辑器为全屏覆盖层
- **Aesthetic Direction**: 冷灰白底色 + 飞书蓝主交互色 + 中性灰文字层级，圆角柔和

## 2. Color System (色彩系统)

**色彩关系**: 冷灰白底 + 深灰文字 + 飞书蓝交互反馈
**配色设计理由**: 中性灰底降低视觉干扰，飞书蓝提供明确的交互指引，深灰文字保证可读性
**使用比例**: 80% 中性灰底 / 15% 纯白纸张 / 5% 蓝色交互

### 2.1 主题颜色

| Token                | HSL 值                  | 说明                                 |
| -------------------- | ----------------------- | ------------------------------------ |
| `background`         | hsl(210, 20%, 98%)      | 边栏底色，冷灰白                     |
| `card`               | hsl(0, 0%, 100%)        | A4预览纸张背景，纯白                 |
| `foreground`         | hsl(215, 25%, 15%)      | 主文字，深灰                         |
| `muted-foreground`   | hsl(215, 15%, 50%)      | 次要说明、中灰                       |
| `primary`            | hsl(212, 100%, 45%)     | 飞书蓝，打印按钮与关键交互           |
| `primary-foreground` | hsl(0, 0%, 100%)        | 主按钮文字                           |
| `accent`             | hsl(212, 30%, 95%)      | 淡蓝灰，控件hover/focus反馈背景      |
| `accent-foreground`  | hsl(215, 25%, 20%)      | accent上的文字                       |
| `border`             | hsl(210, 15%, 90%)      | 控件边框、分割线                     |

### 2.2 导航区配色

- **基调关系**: 无全局导航，顶部工具栏复用主配色系统
- **关键状态**: 控件 hover 用 `bg-accent`（淡蓝灰），激活用 `bg-primary/10` + `text-primary`（蓝色薄层）
- **边界与背景**: 底部操作栏用 `border-t border-border` 分隔，非透明背景

### 2.3 语义颜色

| 用途       | HSL 值                  | 衍生说明                     |
| ---------- | ----------------------- | ---------------------------- |
| `success`  | hsl(142, 71%, 45%)      | 打印成功提示，绿色系         |
| `warning`  | hsl(38, 92%, 50%)       | 字段未选警告，橙黄           |
| `error`    | hsl(0, 84%, 60%)        | 打印失败/空状态，红色系      |

### 2.4 图表配色

| 角色 | HSL 值 | 用途 |
|------|--------|------|
| chart-1 | hsl(212, 80%, 56%) | 主色蓝 |
| chart-2 | hsl(174, 77%, 46%) | 青绿 |
| chart-3 | hsl(38, 92%, 50%) | 橙黄 |
| chart-4 | hsl(142, 71%, 45%) | 绿色 |
| chart-5 | hsl(292, 54%, 76%) | 紫色 |

## 3. Typography (字体排版)

- **Heading**: Inter + system-ui, -apple-system, sans-serif
- **Body**: Inter + system-ui, -apple-system, sans-serif
- **字体策略**: 优先系统字体栈保证跨平台渲染一致；数字用 tabular-nums 确保对齐
- **排版特征**: 标题 `tracking-tight`，微标签 `uppercase tracking-wide`

## 4. Layout Strategy (布局策略)

- **导航意图**: 列表/预览视图在侧边栏内（窄布局）；编辑器为全屏 `position:fixed` 覆盖层，三栏布局（240px左面板 + flex画布 + 底部页签栏）
- **页面架构**: 列表/预览 max-w-[360px]；编辑器全屏三栏（组件/数据源面板 + A4画布 + 页面标签）
- **响应式**: 预览画布按A4等比缩放适配；编辑器画布根据容器宽度自适应缩放

## 5. Visual Language (视觉语言)

- **形态参数**: 圆角 `0.375rem` · 阴影 `shadow-sm` (纸张悬浮感) · 间距基调 `compact`
- **识别签名**: A4纸张带浅灰分页虚线 · 冷灰白底 · 飞书蓝交互
- **装饰策略**: 分页虚线与页码标注为功能性装饰；无额外纹理覆盖
- **动效原则**: 预览实时跟随，150ms ease-out 过渡；hover 反馈 180ms
- **可及性**: 对比度 ≥ 4.5:1；纸张上文字用 `foreground`；分页线用 `border-dashed border-gray-300`

## 6. Component Principles (组件原则)

- **状态完整性**: Slider/Dropdown/Checkbox 覆盖 Default/Hover/Focus/Disabled；拖拽时预览即时更新
- **层级清晰**: 打印按钮 `bg-primary text-primary-foreground`；设置摘要用 `text-muted-foreground text-xs`
- **一致性**: 所有控件使用 shadcn/ui small size；圆角 0.375rem 贯穿；字段勾选列表用折叠面板收纳
- **Hover 反馈**: hover-elevate 系统使用黑色透明薄层 `rgba(0,0,0,0.03)`

## 7. Image Direction (图片与视觉资产，按需)

- **Image Role**: 无强制图片需求
- **Image Art Direction**: 无强制图片需求，优先通过A4纸张拟物、分页虚线、附件缩略图建立视觉记忆点
- **Image Prompt Keywords**: 无
- **Image Avoidance**: 无

## 8. 应避免 (Anti-patterns)

- ❌ 在360px侧边栏的列表/预览视图中使用多列布局或复杂导航结构
- ❌ 预览区添加非功能性装饰（渐变、插画），破坏纸张真实感
- ❌ 控件纵向堆叠占用预览空间，应横向排列或折叠收纳
- ❌ 编辑器中元素坐标使用 px 存储，必须使用 mm 以保证打印一致性
- ❌ 在编辑器画布中使用 CSS 变量或动态插值，会导致 styled-jsx 卡死
