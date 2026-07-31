/**
 * 多维表格边栏插件构建产物归一化脚本
 *
 * 背景：@lark-apaas/fullstack-vite-preset 面向全栈应用，构建产物默认输出到
 * `dist/client/`，且 html-output-plugin 会把 HTML 从 `dist/client/client/index.html`
 * 上移一层到 `dist/client/index.html`，但不会重写其中的 `../assets/` 引用。
 *
 * 多维表格平台校验要求 `dist/index.html` 位于 dist 根目录，且资源引用为相对路径。
 * 本脚本在 `vite build` 完成后执行，把产物提升到 `dist/` 根目录，重写 `../assets/`
 * 为 `./assets/`，并清理 `dist/client/` 残留，确保产物自洽可部署。
 *
 * 用法：node scripts/normalize-dist.cjs
 */
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const distRoot = path.join(projectRoot, 'dist');
const clientDir = path.join(distRoot, 'client');

if (!fs.existsSync(distRoot)) {
  console.error('[normalize-dist] dist 目录不存在，请先执行 vite build');
  process.exit(1);
}

function moveIfExists(src, dest) {
  if (fs.existsSync(src) && !fs.existsSync(dest)) {
    fs.renameSync(src, dest);
    console.log(`[normalize-dist] 移动 ${path.relative(projectRoot, src)} -> ${path.relative(projectRoot, dest)}`);
    return true;
  }
  return false;
}

// 1. 将 index.html 提升到 dist 根目录
const rootIndex = path.join(distRoot, 'index.html');
const clientIndex = path.join(clientDir, 'index.html');
moveIfExists(clientIndex, rootIndex);

// 2. 将 assets/ 提升到 dist 根目录
moveIfExists(path.join(clientDir, 'assets'), path.join(distRoot, 'assets'));

// 3. 将 HTML 直接引用的 polyfills.js / favicon.svg 提升到根目录
for (const f of ['polyfills.js', 'favicon.svg']) {
  moveIfExists(path.join(clientDir, f), path.join(distRoot, f));
}

// 4. 重写 dist/index.html 中的资源引用：../assets/ -> ./assets/
//    （HTML 被 html-output-plugin 上移一层后，原 ../assets/ 指向了 dist 外部）
if (fs.existsSync(rootIndex)) {
  let html = fs.readFileSync(rootIndex, 'utf-8');
  const before = html;
  html = html.replace(/\.\.\/assets\//g, './assets/');
  if (html !== before) {
    fs.writeFileSync(rootIndex, html);
    console.log('[normalize-dist] 重写 ../assets/ -> ./assets/ 于 dist/index.html');
  }
} else {
  console.warn('[normalize-dist] 未找到 dist/index.html，归一化中止');
  process.exit(1);
}

// 5. 清理 dist/client 残留目录（预设的全栈产物，多维表格部署只需 dist 根目录）
if (fs.existsSync(clientDir)) {
  fs.rmSync(clientDir, { recursive: true, force: true });
  console.log('[normalize-dist] 已清理 dist/client 残留目录');
}

// 6. 校验最终产物
const checks = [
  { label: 'dist/index.html', ok: fs.existsSync(rootIndex) },
  { label: 'dist/assets/', ok: fs.existsSync(path.join(distRoot, 'assets')) },
  { label: 'dist/polyfills.js', ok: fs.existsSync(path.join(distRoot, 'polyfills.js')) },
];
const allOk = checks.every((c) => c.ok);
console.log('\n[normalize-dist] 产物校验:');
checks.forEach((c) => console.log(`  ${c.ok ? '✓' : '✗'} ${c.label}`));
console.log(allOk ? '\n✓ dist 归一化完成，可提交部署' : '\n✗ 产物校验未通过');
process.exit(allOk ? 0 : 1);
