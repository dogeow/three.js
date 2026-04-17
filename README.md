# Three.js Gallery (Next.js)

将原 `index.html`（7800+ 行）重构为 Next.js App Router 应用。

## 架构

- **数据源**：`data/demos.json`、`data/categories.json` 由 `scripts/extract.mjs` 生成
- **静态资源**：`public/demos` → 通过 symlink 指向仓库根目录，562 个 demo 目录零拷贝复用
- **预览**：`components/PreviewModal.tsx` 内置分屏拖动，使用 `requestAnimationFrame` + iframe pointer-shield 避免卡顿

## 首次启动

```bash
cd next-app
# 1. 生成 demos.json（已包含全部 562 项，其中 55 项已自动注册）
npm run extract

# 2. 建立 symlink，让 /demos/<slug>/ 能访问到旧示例目录
mkdir -p public && ln -s ../../ public/demos

# 3. 安装依赖并启动
npm install
npm run dev
```

访问 http://localhost:3000 。

## 未来更新示例数据

每次新增/修改旧 `index.html` 中的卡片信息后：

```bash
npm run extract
```

自动注册的目录（`autoRegistered: true`）会显示 NEW 标记，可手动在 `data/demos.json` 中补完 `title`/`desc`/`categories`。
