# UI 设计指南

> **设计类型**: App 设计（应用架构设计）
> **确认检查**: 本指南适用于可交互的应用/网站/工具。

> ℹ️ Section 1 为设计意图与决策上下文。Code agent 实现时以 Section 2 及之后的具体参数为准。

## 1. Design Archetype (设计原型)

### 1.1 内容理解

- **目标用户**: 飞书多维表格用户，在360px窄边栏内高频操作打印预览，需高效不跳转
- **核心目的**: 引导行动 — 快速调整排版参数并确认打印效果
- **情绪基调**: 从容、高端、建筑图纸般严谨

### 1.2 设计方向

- **Design Style**: Swiss Brutalist — 瑞士国际主义排版 x 暖白纸张底 x 金色交互反馈；Muji 极简 x Editorial 经典排版
- **Application Type**: Tool (Sidebar Plugin) — 单页线性工具，无全局导航
- **Aesthetic Direction**: 暖白纸张悬浮于近黑纤细线条之上，金色严格限制为交互反馈色（hover/active/focus 瞬间出现），零圆角全直角系统

## 2. Color System (色彩系统)

**色彩关系**: 暖白纸张底 + 近黑文字 + 金色交互反馈
**配色设计理由**: 暖白底色模拟高端纸张质感，近黑色（非纯黑）提供柔和高对比，金色严格限制为交互反馈色——仅在 hover/active/focus 时出现，克制中传递惊喜
**使用比例**: 70% 暖白底 / 25% 纯白纸张 / 5% 金色交互；primary 仅出现在打印按钮、hover 反馈、focus 指示

### 2.1 主题颜色

| Token                | HSL 值                  | 说明                                 |
| -------------------- | ----------------------- | ------------------------------------ |
| `background`         | hsl(40, 20%, 97%)       | 边栏底色，暖白米纸                   |
| `card`               | hsl(0, 0%, 100%)        | A4预览纸张背景，纯白                 |
| `foreground`         | hsl(0, 0%, 10%)         | 主文字，近黑非纯黑                   |
| `muted-foreground`   | hsl(25, 5%, 40%)        | 次要说明、暖灰                       |
| `primary`            | hsl(45, 63%, 52%)       | 金色，打印按钮与关键交互反馈         |
| `primary-foreground` | hsl(0, 0%, 100%)        | 主按钮文字                           |
| `accent`             | hsl(33, 22%, 90%)       | 暖米灰，控件hover/focus反馈背景      |
| `accent-foreground`  | hsl(0, 0%, 15%)         | accent上的文字                       |
| `border`             | hsl(30, 8%, 88%)        | 控件边框、纤细分割线                 |

### 2.2 导航区配色

- **基调关系**: 无全局导航，顶部工具栏复用主配色系统
- **关键状态**: 控件 hover 用 `bg-accent`（暖米灰），激活用 `bg-primary/10` + `text-primary`（金色薄层）
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
| chart-1 | hsl(0, 0%, 10%) | 近黑（健康态） |
| chart-2 | hsl(45, 63%, 52%) | 金色（警告态） |
| chart-3 | hsl(25, 5%, 40%) | 暖灰（风险态） |
| chart-4 | hsl(33, 22%, 90%) | 米灰（空态） |

## 3. Typography (字体排版)

- **Heading**: Inter + system-ui, -apple-system, sans-serif
- **Body**: Inter + system-ui, -apple-system, sans-serif
- **字体策略**: 优先系统字体栈保证跨平台渲染一致；数字用 tabular-nums 确保对齐
- **排版特征**: 标题 `tracking-tight`（极紧密），微标签 `uppercase tracking-[0.2em]`（小字大间距）

## 4. Layout Strategy (布局策略)

- **导航意图**: 无全局导航；顶部工具栏+底部吸底栏构成固定框架，中间预览区独立滚动
- **页面架构**: 单列垂直布局 max-w-[360px]；预览画布占满剩余高度
- **响应式**: 边栏宽度固定360px，预览画布按A4等比缩放适配

## 5. Visual Language (视觉语言)

- **形态参数**: 圆角 `0`（全直角系统，通知圆点 `rounded-full` 唯一例外） · 阴影 `shadow-sm` (纸张悬浮感) · 间距基调 `compact`
- **识别签名**: A4纸张带浅灰分页虚线 · 暖白底 + 纸张杂点纹理 3% 透明度 · 金色仅出现在交互瞬间
- **装饰策略**: SVG fractalNoise 杂点纹理 `body::before` fixed 全屏覆盖 3% 透明度，模拟纸张物理质感；分页虚线与页码标注为功能性装饰
- **动效原则**: 预览实时跟随，150ms ease-out 过渡；hover 反馈 300ms
- **可及性**: 对比度 ≥ 4.5:1；纸张上文字用 `foreground`；分页线用 `border-dashed border-gray-300`

## 6. Component Principles (组件原则)

- **状态完整性**: Slider/Dropdown/Checkbox 覆盖 Default/Hover/Focus/Disabled；拖拽时预览即时更新
- **层级清晰**: 打印按钮 `bg-primary text-primary-foreground`；设置摘要用 `text-muted-foreground text-xs`
- **一致性**: 所有控件使用 shadcn/ui small size；零圆角贯穿所有元素；字段勾选列表用折叠面板收纳
- **Hover 反馈**: hover-elevate 系统使用金色透明薄层 `hsla(45, 63%, 52%, 0.06)`

## 7. Image Direction (图片与视觉资产，按需)

- **Image Role**: 无强制图片需求
- **Image Art Direction**: 无强制图片需求，优先通过A4纸张拟物、分页虚线、杂点纹理、附件缩略图建立视觉记忆点
- **Image Prompt Keywords**: 无
- **Image Avoidance**: 无

## 8. 应避免 (Anti-patterns)

- ❌ 在360px边栏内使用多列布局或复杂导航结构
- ❌ 预览区添加非功能性装饰（渐变、插画），破坏纸张真实感
- ❌ 控件纵向堆叠占用预览空间，应横向排列或折叠收纳
- ❌ 使用任何圆角（`rounded-md`/`rounded-lg` 等），全直角是核心签名
- ❌ 金色用于非交互场景（装饰色块、静态背景），金色严格限制为交互反馈色
