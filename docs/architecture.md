# AI Chat Platform 架构

## 目标

当前仓库从学习资料扩展为一个前后端分离的 AI 应用基础工程。第一阶段只保留最小可运行闭环，后续再接入鉴权、数据库、模型代理和流式响应。

## 目录边界

```text
frontend/                 React + Vite 客户端
├── src/
│   ├── api/               HTTP 客户端与后端契约
│   ├── components/        可复用 UI（后续扩展）
│   ├── App.tsx            页面编排
│   ├── main.tsx           应用入口
│   └── styles.css         全局样式
└── public/                静态资源

backend/                  Fastify + TypeScript 服务端
├── src/
│   ├── config/            环境变量和运行配置
│   ├── modules/           按业务域拆分的路由与服务
│   │   ├── health/
│   │   └── conversations/
│   ├── shared/            跨模块错误处理等基础设施
│   ├── app.ts              可测试的 Fastify 实例
│   └── server.ts           生产启动入口
└── tests/                  接口与服务测试（后续补充）
```

## 请求链路

```text
浏览器
  → frontend/api/client.ts
  → backend /api/*
  → module route
  → module service
  → 持久化/模型 Provider（后续接入）
```

`app.ts` 只负责组装插件和路由，不监听端口，便于测试；`server.ts` 负责读取配置并启动 HTTP 服务。模型 API Key 只允许放在后端环境变量中，禁止进入前端代码。

## 当前 API

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| GET | `/health` | 服务存活检查 |
| GET | `/api/conversations` | 获取会话列表 |
| POST | `/api/conversations` | 创建会话 |

当前会话数据使用内存存储，仅用于验证前后端边界；下一阶段替换为 PostgreSQL + Prisma，不改变前端 API 契约。

## 后续演进

1. PostgreSQL + Prisma 持久化用户、会话和消息。
2. JWT 鉴权与资源归属校验。
3. LLM Provider 抽象和 SSE 流式聊天接口。
4. Vitest 接口测试、请求 ID、结构化日志和限流。
