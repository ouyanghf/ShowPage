# 内网 HTML 演示台开发文档

## 1. 项目名称

**ShowPage**

中文名：**内网 HTML 演示台**

## 2. 项目目标

开发一个部署在公司内网的 HTML 演示工具。

用户可以将共享的 HTML 页面拖入系统，系统自动解析 HTML 内容，按照页面结构自动拆分模块，并生成左侧菜单栏。用户可通过菜单快速跳转不同模块，方便会议、汇报、方案演示和内部培训。

核心目标：

- 支持拖拽上传 HTML 文件
- 自动识别页面模块
- 自动生成演示菜单
- 支持内网演示链接
- 不修改用户原始内容逻辑
- 优先简单、稳定、可部署

## 3. MVP 范围

### 3.1 必须实现

- 首页上传入口
- 拖拽上传单个 `.html` 文件
- 后端保存上传文件
- 后端解析 HTML
- 自动识别模块
- 自动生成项目配置 JSON
- 演示页面左侧菜单
- iframe 展示 HTML 内容
- 点击菜单滚动到对应模块
- 支持键盘切换模块
- 支持全屏演示
- 支持生成内网访问链接
- Docker 部署

### 3.2 暂不实现

- 用户登录
- 多人协作
- 在线编辑 HTML
- PDF 导出
- PPT 导出
- 复杂权限
- 外部数据库或复杂数据服务
- 文件版本管理
- 复杂主题系统

## 4. 技术栈

### 4.1 前端

推荐：

- Vue 3
- Vite
- TypeScript
- 原生 CSS 或 Tailwind CSS

### 4.2 后端

推荐：

- Node.js
- Express
- TypeScript
- Multer
- Cheerio

用途说明：

- Express：提供 API、静态文件服务和演示页面路由
- Multer：处理 HTML 文件上传
- Cheerio：服务端解析 HTML，提取 `h1`、`h2`、`section`、`data-title` 等结构

### 4.3 存储

使用本地 SQLite 保存项目、分组、模块配置等元数据；HTML 内容使用本地磁盘存储，便于下载、备份和静态预览。

```text
storage/
  showpage.db
  projects/
    {projectId}/
      original.html
      parsed.html
```

### 4.4 部署

推荐：

- Docker
- Docker Compose
- Nginx 反向代理，可选

## 5. 总体架构

系统是一个扁平的单体内网工具：Express 统一提供页面、API、上传、HTML 解析和静态文件访问；Vue/Vite 只是浏览器界面源码，不作为独立系统拆分。

```text
用户浏览器
  ↓
Express 单体应用
  ├─ Vue 页面
  ├─ 上传和项目 API
  ├─ HTML 模块解析
  ├─ SQLite 元数据
  └─ 本地 HTML 文件
```

## 6. 页面设计

### 6.1 首页

路径：

```text
/
```

功能：

- 显示系统名称
- 显示拖拽上传区域
- 支持点击选择 HTML 文件
- 上传成功后跳转项目编辑页

页面结构：

```text
┌────────────────────────────────────┐
│ 内网 HTML 演示台                    │
├────────────────────────────────────┤
│                                    │
│        拖入 HTML 文件到这里          │
│                                    │
│        或点击选择文件                │
│                                    │
└────────────────────────────────────┘
```

### 6.2 项目编辑页

路径：

```text
/project/:projectId
```

功能：

- 显示项目标题
- 显示自动识别出的模块列表
- 支持模块重命名
- 支持模块隐藏
- 支持模块排序
- 右侧 iframe 预览 HTML
- 点击模块可跳转预览
- 提供“进入演示”按钮
- 提供“复制演示链接”按钮

页面结构：

```text
┌────────────────────────────────────────────┐
│ 项目名称                    [演示] [复制链接] │
├───────────────┬────────────────────────────┤
│ 模块菜单       │ HTML 预览                   │
│               │                            │
│ 1. 首页        │ iframe                      │
│ 2. 市场分析    │                            │
│ 3. 数据分析    │                            │
│ 4. 总结        │                            │
└───────────────┴────────────────────────────┘
```

### 6.3 演示页

路径：

```text
/view/:projectId
```

功能：

- 左侧模块菜单
- 右侧 HTML 内容区
- 点击菜单跳转模块
- 支持全屏
- 支持键盘切换模块
- 支持隐藏菜单

页面结构：

```text
┌───────────────┬────────────────────────────┐
│ 菜单           │ HTML 内容                   │
│               │                            │
│ 首页           │ iframe                      │
│ 市场分析       │                            │
│ 数据分析       │                            │
│ 总结           │                            │
└───────────────┴────────────────────────────┘
```

## 7. 自动模块识别规则

后端上传 HTML 后，需要自动解析模块。

识别优先级如下：

### 7.1 第一优先级：`data-title`

如果存在：

```html
<section data-title="业务概览">
  ...
</section>
```

生成模块：

```json
{
  "title": "业务概览",
  "selector": "#module-1"
}
```

### 7.2 第二优先级：`section`

如果存在：

```html
<section>
  <h2>市场分析</h2>
  ...
</section>
```

使用 `section` 内第一个 `h1,h2,h3` 作为标题。

### 7.3 第三优先级：标题标签

识别：

```html
<h1>首页</h1>
<h2>数据分析</h2>
<h2>方案建议</h2>
```

生成对应模块。

### 7.4 第四优先级：兜底模块

如果无法识别任何模块，则生成一个默认模块：

```json
{
  "id": "full-page",
  "title": "完整页面",
  "selector": "body",
  "order": 1
}
```

## 8. 项目数据结构

每个项目生成一个随机 ID。

目录结构：

```text
storage/
  showpage.db
  projects/
    p_8f3x92kq/
      original.html
      parsed.html
```

项目记录示例：

```json
{
  "id": "p_8f3x92kq",
  "title": "季度经营分析",
  "sourceFile": "original.html",
  "parsedFile": "parsed.html",
  "createdAt": "2026-06-06T10:00:00.000Z",
  "updatedAt": "2026-06-06T10:00:00.000Z",
  "modules": [
    {
      "id": "module-1",
      "title": "首页",
      "selector": "#module-1",
      "order": 1,
      "visible": true
    },
    {
      "id": "module-2",
      "title": "市场分析",
      "selector": "#module-2",
      "order": 2,
      "visible": true
    }
  ],
  "layout": {
    "showSidebar": true,
    "sidebarWidth": 260,
    "theme": "light"
  }
}
```

## 9. 后端 API 设计

### 9.1 上传 HTML

```http
POST /api/projects/upload
Content-Type: multipart/form-data
```

字段：

```text
file: HTML 文件
```

返回：

```json
{
  "projectId": "p_8f3x92kq",
  "title": "季度经营分析",
  "modules": [
    {
      "id": "module-1",
      "title": "首页",
      "selector": "#module-1",
      "order": 1,
      "visible": true
    }
  ],
  "editUrl": "/project/p_8f3x92kq",
  "viewUrl": "/view/p_8f3x92kq"
}
```

### 9.2 获取项目

```http
GET /api/projects/:projectId
```

返回：

```json
{
  "id": "p_8f3x92kq",
  "title": "季度经营分析",
  "modules": [],
  "htmlUrl": "/static/projects/p_8f3x92kq/parsed.html",
  "viewUrl": "/view/p_8f3x92kq"
}
```

### 9.3 更新项目

```http
PUT /api/projects/:projectId
Content-Type: application/json
```

请求体：

```json
{
  "title": "新的项目名称",
  "modules": [
    {
      "id": "module-1",
      "title": "新的模块名称",
      "selector": "#module-1",
      "order": 1,
      "visible": true
    }
  ],
  "layout": {
    "showSidebar": true,
    "sidebarWidth": 260,
    "theme": "light"
  }
}
```

返回：

```json
{
  "success": true
}
```

### 9.4 获取 HTML 文件

```http
GET /static/projects/:projectId/parsed.html
```

返回解析后的 HTML。

## 10. 后端核心模块

### 10.1 `htmlParser.ts`

职责：

- 接收 HTML 字符串
- 解析模块
- 给模块元素补充 `id`
- 注入滚动脚本
- 返回 `parsedHtml` 和 `modules`

核心类型：

```ts
export interface ParsedModule {
  id: string;
  title: string;
  selector: string;
  order: number;
  visible: boolean;
}

export interface ParseResult {
  html: string;
  modules: ParsedModule[];
}

export function parseHtmlModules(html: string): ParseResult;
```

示例逻辑：

```ts
import * as cheerio from "cheerio";

export function parseHtmlModules(html: string) {
  const $ = cheerio.load(html);
  const modules = [];

  $("[data-title]").each((index, el) => {
    const title = $(el).attr("data-title")?.trim();
    if (!title) return;

    const id = $(el).attr("id") || `module-${modules.length + 1}`;
    $(el).attr("id", id);

    modules.push({
      id,
      title,
      selector: `#${id}`,
      order: modules.length + 1,
      visible: true
    });
  });

  if (modules.length === 0) {
    $("section").each((index, el) => {
      const title =
        $(el).find("h1,h2,h3").first().text().trim() ||
        `模块 ${modules.length + 1}`;

      const id = $(el).attr("id") || `module-${modules.length + 1}`;
      $(el).attr("id", id);

      modules.push({
        id,
        title,
        selector: `#${id}`,
        order: modules.length + 1,
        visible: true
      });
    });
  }

  if (modules.length === 0) {
    $("h1,h2,h3").each((index, el) => {
      const title = $(el).text().trim();
      if (!title) return;

      const id = $(el).attr("id") || `module-${modules.length + 1}`;
      $(el).attr("id", id);

      modules.push({
        id,
        title,
        selector: `#${id}`,
        order: modules.length + 1,
        visible: true
      });
    });
  }

  if (modules.length === 0) {
    modules.push({
      id: "full-page",
      title: "完整页面",
      selector: "body",
      order: 1,
      visible: true
    });
  }

  injectPresenterBridge($);

  return {
    html: $.html(),
    modules
  };
}

function injectPresenterBridge($: cheerio.CheerioAPI) {
  const script = `
    <script>
      window.addEventListener("message", function(event) {
        var data = event.data || {};
        if (data.type !== "SCROLL_TO_MODULE") return;
        var el = document.querySelector(data.selector);
        if (!el) return;
        el.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      });
    </script>
  `;

  $("body").append(script);
}
```

### 10.2 `projects.ts` 和 `storage.ts`

职责：

- `projects.ts`：创建、读取、更新、删除项目，并维护模块配置、分组和排序
- `storage.ts`：创建项目目录，保存原始 HTML 和解析后 HTML
- `db.ts`：保存项目、分组、模块配置等本地元数据

函数：

```ts
export function createProject(params: {
  originalFilename: string;
  html: string;
  folderId?: string | null;
}): Project;

export function getProject(projectId: string): Project;

export function updateProject(
  projectId: string,
  patch: Partial<Project>
): Project;
```

## 11. 前端核心组件

### 11.1 `UploadDropzone.vue`

职责：

- 拖拽上传
- 点击上传
- 调用 `/api/projects/upload`
- 上传成功后跳转 `/project/:projectId`

### 11.2 `ModuleMenu.vue`

职责：

- 展示模块列表
- 高亮当前模块
- 点击模块触发跳转
- 支持编辑页中的重命名、排序、隐藏

Props：

```ts
interface ModuleMenuProps {
  modules: ParsedModule[];
  activeModuleId?: string;
  editable?: boolean;
}
```

Events：

```ts
select(module: ParsedModule)
rename(moduleId: string, title: string)
toggleVisible(moduleId: string, visible: boolean)
reorder(modules: ParsedModule[])
```

### 11.3 `HtmlPreview.vue`

职责：

- iframe 加载 parsed.html
- 接收模块 selector
- 发送 postMessage 到 iframe
- 提供 reload 能力

核心方法：

```ts
function scrollToModule(selector: string) {
  iframeRef.value?.contentWindow?.postMessage(
    {
      type: "SCROLL_TO_MODULE",
      selector
    },
    "*"
  );
}
```

### 11.4 `PresenterView.vue`

职责：

- 演示页面布局
- 左侧菜单
- 右侧 iframe
- 键盘切换模块
- 全屏
- 隐藏菜单

快捷键：

| 快捷键 | 功能 |
|---|---|
| ArrowDown | 下一个模块 |
| ArrowRight | 下一个模块 |
| Space | 下一个模块 |
| ArrowUp | 上一个模块 |
| ArrowLeft | 上一个模块 |
| F | 全屏 |
| M | 显示 / 隐藏菜单 |
| Esc | 退出全屏 |

## 12. 前端路由

```ts
const routes = [
  {
    path: "/",
    component: HomePage
  },
  {
    path: "/project/:projectId",
    component: ProjectEditor
  },
  {
    path: "/view/:projectId",
    component: PresenterView
  }
];
```

## 13. 基础样式要求

### 13.1 编辑页布局

```css
.app-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  height: 100vh;
}

.sidebar {
  border-right: 1px solid #e5e7eb;
  overflow-y: auto;
}

.preview {
  height: 100%;
  overflow: hidden;
}

.preview iframe {
  width: 100%;
  height: 100%;
  border: none;
}
```

### 13.2 演示页布局

```css
.presenter-layout {
  display: grid;
  grid-template-columns: 260px 1fr;
  height: 100vh;
  background: #111827;
}

.presenter-layout.sidebar-hidden {
  grid-template-columns: 1fr;
}

.presenter-sidebar {
  background: #ffffff;
  border-right: 1px solid #e5e7eb;
  overflow-y: auto;
}

.presenter-content {
  background: #ffffff;
  overflow: hidden;
}

.presenter-content iframe {
  width: 100%;
  height: 100%;
  border: none;
}
```

## 14. 安全要求

### 14.1 上传限制

第一版只允许上传：

```text
.html
.htm
```

第二版再支持：

```text
.zip
文件夹
图片
css
js
```

### 14.2 文件大小限制

默认限制：

```text
单个 HTML 文件最大 20MB
```

### 14.3 文件名处理

不得直接信任用户上传文件名。

需要：

- 生成随机 projectId
- 文件统一保存为 `original.html`
- 输出统一保存为 `parsed.html`

### 14.4 路径安全

必须防止路径穿越。

禁止出现：

```text
../
..\
```

### 14.5 iframe 安全

第一版为了兼容内部 HTML，可默认不加严格 sandbox。

后续可增加两种模式：

```text
安全模式：iframe sandbox="allow-scripts"
兼容模式：不设置 sandbox 或 sandbox="allow-scripts allow-same-origin"
```

## 15. Docker 部署

### 15.1 `docker-compose.yml`

```yaml
services:
  showpage:
    build: .
    container_name: showpage
    ports:
      - "8080:8080"
    volumes:
      - ./storage:/app/storage
    restart: always
```

### 15.2 内网访问

直接访问：

```text
http://服务器IP:8080
```

如有内网 DNS：

```text
http://html-demo.company.local
```

## 16. 推荐项目目录

```text
showpage/
  docker-compose.yml
  package.json
  tsconfig.server.json
  vite.config.ts

  src/
    server.ts
    db.ts
    projects.ts
    folders.ts
    storage.ts
    htmlParser.ts
    projectRoutes.ts
    folderRoutes.ts
    staticRoutes.ts
    types.ts
    id.ts
    fileSafe.ts

    ui/
      index.html
      main.ts
      router.ts
      App.vue
      pages/
        HomePage.vue
        ProjectEditor.vue
        PresenterView.vue
      components/
        UploadDropzone.vue
        ModuleMenu.vue
        HtmlPreview.vue
        TopBar.vue
      api/
        projectApi.ts
      types/
        project.ts
      styles/
        global.css
      public/
        favicon.svg

  storage/
    showpage.db
    projects/
      {projectId}/
        original.html
        parsed.html
```

## 17. 开发顺序

### 阶段 1：后端基础

- 初始化 Express 服务
- 实现上传接口
- 实现项目目录创建
- 实现 HTML 解析
- 实现 SQLite 元数据保存
- 实现静态文件访问

### 阶段 2：前端上传和编辑页

- 实现首页
- 实现拖拽上传
- 实现项目编辑页
- 实现模块菜单
- 实现 iframe 预览
- 实现点击菜单滚动

### 阶段 3：演示页

- 实现 `/view/:projectId`
- 实现演示布局
- 实现键盘切换
- 实现全屏
- 实现菜单隐藏

### 阶段 4：部署

- 编写 Dockerfile
- 编写 docker-compose.yml
- 配置 storage volume
- 内网服务器部署测试

## 18. 验收标准

### 18.1 上传验收

- 用户可以拖入一个 HTML 文件
- 上传后生成项目 ID
- 后端保存 original.html
- 后端生成 parsed.html
- 后端保存 SQLite 项目记录

### 18.2 解析验收

以下结构可以被识别：

```html
<section data-title="模块 A"></section>
```

```html
<section>
  <h2>模块 B</h2>
</section>
```

```html
<h1>模块 C</h1>
<h2>模块 D</h2>
```

如果没有任何结构，则生成：

```text
完整页面
```

### 18.3 菜单验收

- 左侧显示模块菜单
- 菜单顺序正确
- 点击菜单，右侧 iframe 滚动到对应位置
- 当前模块高亮

### 18.4 演示验收

- `/view/:projectId` 可访问
- 左侧菜单可点击
- 方向键可切换模块
- Space 可进入下一个模块
- F 可全屏
- M 可隐藏或显示菜单

### 18.5 部署验收

- Docker Compose 可启动
- `storage` 数据重启后不丢失
- 内网其他电脑可以访问演示链接

## 19. 后续版本规划

### V1.1

- 支持模块重命名
- 支持模块排序
- 支持模块隐藏
- 支持复制演示链接

### V1.2

- 支持上传 ZIP
- 支持 HTML 相关 assets
- 支持图片、CSS、JS 资源路径
- 支持项目标题编辑

### V1.3

- 支持简单登录
- 支持项目列表
- 支持删除项目
- 支持访问密码

### V2.0

- 支持企业微信 / 飞书 / LDAP 登录
- 支持团队项目空间
- 支持模板主题
- 支持 PDF 导出
- 支持演讲者备注

## 20. Codex 开发提示

请优先实现 MVP，不要过度设计。

实现顺序建议：

1. 先完成后端上传、解析、保存。
2. 再完成前端上传页面。
3. 再完成项目编辑页。
4. 再完成演示页。
5. 最后补 Docker 部署。

关键原则：

- 不需要数据库。
- 不需要登录。
- 不需要复杂 UI。
- 不修改用户原始业务逻辑。
- 只在 parsed.html 中补充模块 id 和滚动脚本。
- 所有项目数据存在 `storage/projects/{projectId}`。
- 保证内网部署后稳定可用。
