# HTML Demo Hub

一个面向公司内网的 HTML 演示台。

把别人发来的 HTML 页面拖进系统，自动解析页面结构，生成可点击的演示菜单。适合内部汇报、方案演示、培训材料、产品原型和一次性活动页面的快速展示。

## 为什么需要它

很多团队会用 AI、低代码工具、设计工具或前端脚本快速生成 HTML 页面，但真正拿去会议演示时，经常会遇到几个问题：

- 文件散落在聊天记录或共享盘里，不方便管理。
- 页面很长，演示时只能手动滚动。
- 每次发给别人都要解释“打开哪个文件、看哪一段”。
- 内网环境不能随便部署外部 SaaS。
- 为了一次演示搭建完整前端项目太重。

HTML Demo Hub 的目标很简单：上传 HTML，自动变成一个可管理、可演示、可分享的内网页面。

## 功能亮点

- 拖拽上传 `.html` / `.htm` 文件
- 自动识别页面模块并生成左侧菜单
- 支持 `data-title`、`section`、`h1/h2/h3` 等结构识别
- 保留原始 HTML，可下载原文件
- 生成演示链接，适合内网共享
- 支持编辑项目标题、模块名称、模块显示状态和排序
- 支持全屏演示、键盘切换模块、隐藏菜单
- 支持项目分组、移动、重命名、批量删除
- 本地 SQLite 保存元数据，本地文件保存 HTML 内容
- 单体部署，无需独立前后端服务
- 支持 Docker / Docker Compose 内网部署

## 适用场景

- AI 生成的 HTML 报告展示
- 产品方案、经营分析、市场分析页面演示
- 内部培训课件和流程说明
- 设计稿转 HTML 后的快速预览
- 客户或领导汇报材料的内网分享
- 临时活动页面、原型页面集中管理

## 快速开始

环境要求：

- Node.js 20+
- npm

安装依赖：

```bash
npm install
```

开发模式：

```bash
npm run dev
```

默认访问：

```text
http://localhost:3000
```

生产构建：

```bash
npm run build
```

生产启动：

```bash
npm start
```

## Docker 部署

使用 Docker Compose：

```bash
docker compose up -d --build
```

默认访问：

```text
http://服务器IP:8080
```

数据会保存在本地 `storage/` 目录：

```text
storage/
  html-demo-hub.db
  projects/
    {projectId}/
      original.html
      parsed.html
```

## 使用方式

1. 打开首页。
2. 选择上传目标分组，也可以先创建新分组。
3. 拖入一个 HTML 文件。
4. 系统自动解析模块并生成项目。
5. 进入编辑页调整标题、模块名称、显示状态和排序。
6. 点击“演示”进入演示模式。
7. 将演示链接发给内网同事访问。

## HTML 模块识别规则

系统会按以下优先级识别模块：

1. 带 `data-title` 的元素
2. `section` 标签
3. 页面中的 `h1`、`h2`、`h3`
4. 如果没有识别到模块，则生成“完整页面”

推荐在 HTML 中显式添加 `data-title`：

```html
<section data-title="业务概览">
  <h2>业务概览</h2>
  ...
</section>
```

## 项目结构

```text
src/
  server/
    index.ts
    routes/
    services/
    lib/
  ui/
    index.html
    main.ts
    pages/
    components/
    api/
    styles/

storage/
  html-demo-hub.db
  projects/

dist/
  public/
```

说明：

- `src/server` 是 Express 单体服务，负责 API、上传、解析、静态 HTML 访问。
- `src/ui` 是浏览器界面源码，由 Vite 构建到 `dist/public`。
- `storage` 是运行数据目录，部署时需要持久化。
- `dist` 是构建产物，不需要手工维护。

## 技术栈

- Node.js
- Express
- TypeScript
- Vue 3
- Vite
- SQLite
- Cheerio
- Multer

## 设计原则

- 简单优先：一个服务完成上传、管理、演示和静态访问。
- 内网友好：无需外部服务，数据保存在本地。
- 不改原始内容逻辑：保留原始 HTML，同时生成用于演示滚动的解析版本。
- 轻量部署：Docker Compose 一条命令即可运行。

## 常用命令

```bash
npm run dev      # 开发模式
npm run build    # 构建前端和服务端
npm start        # 启动生产服务
```

## License

当前项目未指定开源许可证。对外发布前建议补充许可证，例如 MIT。
