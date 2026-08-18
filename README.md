# AChat

AChat 是一个响应式 AI 聊天 Web 项目，也是学习计划中持续迭代的实战工程。项目采用前后端分离结构：

- `frontend/`：React + Vite + TypeScript，运行在浏览器中。
- `backend/`：Fastify + TypeScript，自带 HTTP 服务，不需要 Tomcat。
- `docs/`：产品范围、API 契约、架构与设计交付说明。

## 当前范围

当前版本用于验证项目骨架和前后端调用链路，提供：

- 健康检查接口 `GET /health`。
- 前后端联调接口 `GET /api/demo`。
- 会话列表及创建接口 `GET/POST /api/conversations`。
- 前端加载、成功、空数据和接口失败状态。
- 服务端环境变量管理，浏览器端不保存模型 API Key。

本阶段明确不做：模型训练、模型微调、复杂 Agent、知识库、数据库持久化和生产部署。

## 环境要求

- Node.js 20 或更高版本。
- npm 10 或更高版本。

Tomcat 是 Java Web 应用常用的服务器。本项目后端使用 Node.js + Fastify，执行启动命令后 Fastify 会直接监听本机 `3000` 端口。

## 首次运行

在仓库根目录执行：

```bash
npm install
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
npm run dev
```

然后访问 <http://localhost:5173>，在“前后端联调 Demo”中输入 `achat-demo` 并点击“调用接口”。页面显示“你好，今天你想做点什么有趣的事情？”，即表示：

```text
浏览器 -> Vite 开发服务器 -> /api 代理 -> Fastify 后端 -> JSON 响应 -> React 页面
```

也可以分别启动，便于观察日志：

```bash
npm run dev:backend
npm run dev:frontend
```

后端地址是 <http://localhost:3000>，可直接验证：

```bash
curl http://localhost:3000/health
curl 'http://localhost:3000/api/demo?code=achat-demo'
```

## 环境配置

- `backend/.env`：仅供后端读取，配置监听地址、端口、跨域来源，以及未来的数据库或模型密钥。
- `frontend/.env`：只能放允许暴露给浏览器的变量，任何 `VITE_` 变量都会进入前端构建产物。
- 本地开发时 `VITE_API_BASE_URL` 保持为空，由 Vite 把 `/api` 和 `/health` 转发到后端。
- `.env` 已被 Git 忽略，只提交不含真实秘密的 `.env.example`。

## 验证

```bash
npm run verify
```

该命令依次执行 Lint、格式检查、TypeScript 类型检查、后端接口测试和前后端构建。

## 项目文档

- [产品范围](docs/product/PRD.md)
- [系统架构](docs/architecture.md)
- [API 契约](docs/api/openapi.yaml)
- [设计交付](docs/design/lanhu-workflow.md)
- [协作边界](docs/collaboration.md)
- [技术决策](docs/adr/0001-web-platform-stack.md)
