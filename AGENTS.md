# UI 设计指南

> **设计类型**: App 设计（应用架构设计）
> **确认检查**: 本指南适用于可交互的应用/网站/工具。

> ℹ️ Section 1 为设计意图与决策上下文。Code agent 实现时以 Section 2 及之后的具体参数为准。

## 1. Design Archetype (设计原型)

### 1.1 内容理解

- **目标用户**: 飞书多维表格用户，在360px窄边栏内高频操作打印预览，需高效不跳转
- **核心目的**: 引导行动 — 快速调整排版参数并确认打印效果
- **情绪基调**: 专注/跟手感 / 避免拥挤、焦虑

### 1.2 设计方向

- **Design Style**: Muji 极简 + Rounded 辅助 — 窄边栏工具需极致克制，纸张拟物感强化「所见即所得」记忆点
- **Application Type**: Tool (Sidebar Plugin) — 单页线性工具，无全局导航
- **Aesthetic Direction**: 纯白纸张悬浮于中性灰底，蓝色点睛操作，控件紧凑但不压迫

## 2. Color System (色彩系统)

**色彩关系**: 飞书蓝主色 + 中性灰底 + 纯白纸张 + 深灰文字
**配色设计理由**: 延续飞书设计语言降低认知负荷，纸张拟物强化打印预览心智模型
**主色推导**: primary 取飞书蓝用于打印按钮与激活态，关联「确认输出」的关键行动
**使用比例**: 70% 中性灰白 / 25% 纸张白 / 5% 飞书蓝；primary 仅用于打印按钮、滑块激活态、链接

### 2.1 主题颜色

| Token                | HSL 值                  | 说明                                 |
| -------------------- | ----------------------- | ------------------------------------ |
| `background`         | hsl(210, 20%, 98%)      | 边栏底色，飞书中性灰                 |
| `card`               | hsl(0, 0%, 100%)        | A4预览纸张背景                       |
| `foreground`         | hsl(215, 25%, 15%)      | 主文字，深灰确保可读性               |
| `muted-foreground`   | hsl(215, 15%, 50%)      | 次要说明、设置摘要文字               |
| `primary`            | hsl(212, 100%, 45%)     | 飞书蓝，打印按钮与关键交互           |
| `primary-foreground` | hsl(0, 0%, 100%)        | 主按钮文字                           |
| `accent`             | hsl(212, 30%, 95%)      | 控件hover/focus反馈、折叠面板展开背景 |
| `accent-foreground`  | hsl(215, 25%, 20%)      | accent上的文字                       |
| `border`             | hsl(210, 15%, 90%)      | 控件边框、分隔线                     |

### 2.2 导航区配色

- **基调关系**: 无全局导航，顶部工具栏复用主配色系统
- **关键状态**: 控件 hover 用 `bg-accent`，激活用 `bg-primary/10` + `text-primary`
- **边界与背景**: 底部操作栏用 `border-t border-border` 分隔，非透明背景

### 2.3 语义颜色

| 用途       | HSL 值                  | 衍生说明                     |
| ---------- | ----------------------- | ---------------------------- |
| `success`  | hsl(142, 71%, 45%)      | 打印成功提示，绿色系         |
| `warning`  | hsl(38, 92%, 50%)       | 字段未选警告，橙黄大字号可用 |
| `error`    | hsl(0, 84%, 60%)        | 打印失败/空状态，红色系      |

## 3. Typography (字体排版)

- **Heading**: Inter + system-ui, -apple-system, sans-serif
- **Body**: Inter + system-ui, -apple-system, sans-serif
- **字体策略**: 优先系统字体栈保证跨平台渲染一致；数字用 tabular-nums 确保对齐

## 4. Layout Strategy (布局策略)

- **导航意图**: 无全局导航；顶部工具栏+底部吸底栏构成固定框架，中间预览区独立滚动
- **页面架构**: 单列垂直布局 max-w-[360px]；预览画布占满剩余高度
- **响应式**: 边栏宽度固定360px，预览画布按A4等比缩放适配

## 5. Visual Language (视觉语言)

- **形态参数**: 圆角 `rounded-md (0.375rem)` · 阴影 `shadow-sm` (纸张) · 间距基调 `compact`
- **识别签名**: A4纸张带浅灰分页虚线 · 控件横向紧凑排列 · 设置摘要胶囊标签
- **装饰策略**: 仅用分页虚线与页码标注作为功能性装饰，无纯装饰元素
- **动效原则**: 预览实时跟随，150ms ease-out 过渡
- **可及性**: 对比度 ≥ 4.5:1；纸张上文字用 `foreground`；分页线用 `border-dashed border-gray-300`

## 6. Component Principles (组件原则)

- **状态完整性**: Slider/Dropdown/Checkbox 覆盖 Default/Hover/Focus/Disabled；拖拽时预览即时更新
- **层级清晰**: 打印按钮 `bg-primary text-primary-foreground`；设置摘要用 `text-muted-foreground text-xs`
- **一致性**: 所有控件使用 shadcn/ui small size；字段勾选列表用折叠面板收纳

## 7. Image Direction (图片与视觉资产，按需)

- **Image Role**: 无强制图片需求
- **Image Art Direction**: 无强制图片需求，优先通过A4纸张拟物、分页虚线、附件缩略图建立视觉记忆点
- **Image Prompt Keywords**: 无
- **Image Avoidance**: 无

## 8. 应避免 (Anti-patterns)

- ❌ 在360px边栏内使用多列布局或复杂导航结构
- ❌ 预览区添加非功能性装饰（纹理、渐变、插画），破坏纸张真实感
- ❌ 控件纵向堆叠占用预览空间，应横向排列或折叠收纳