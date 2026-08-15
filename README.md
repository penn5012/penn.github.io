---
title: Maverick
date: 2023-11-15
author: Maverick
---

# 这里是博客正文 

这是我的第一篇技术博客，使用 **Markdown** 语法编写！

## AI Chat Platform

本仓库同时包含学习资料和一个前后端分离的 AI 应用基础工程：

- `frontend/`：React + Vite + TypeScript 客户端。
- `backend/`：Fastify + TypeScript API 服务。
- `docs/architecture.md`：模块边界、请求链路和演进路线。

首次运行：

```bash
npm install
npm run dev:backend   # 终端一：启动 http://localhost:3000
npm run dev:frontend  # 终端二：启动 http://localhost:5173
```

当前 MVP 提供健康检查、会话列表和创建会话接口；会话暂存于后端内存，下一阶段接入 PostgreSQL、鉴权和模型流式调用。前端不保存任何模型 API Key。

## 项目协作入口

- 产品范围：[docs/product/PRD.md](docs/product/PRD.md)
- 系统架构：[docs/architecture.md](docs/architecture.md)
- API 契约：[docs/api/openapi.yaml](docs/api/openapi.yaml)
- 设计交付：[docs/design/lanhu-workflow.md](docs/design/lanhu-workflow.md)
- Codex 任务边界：[docs/collaboration.md](docs/collaboration.md)
- 技术决策：[docs/adr/0001-web-platform-stack.md](docs/adr/0001-web-platform-stack.md)
