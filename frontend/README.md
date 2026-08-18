# Frontend

React + Vite + TypeScript 客户端，负责页面体验、状态展示和后端 API 调用。

## 目录结构

```text
frontend/
├── .vscode/       # 前端调试、编辑器设置和代码片段
├── bin/           # 前端专用脚本
├── CI_Config/     # 前端持续集成配置
├── public/        # 不经过构建处理的静态资源
├── plugins/       # 项目级前端插件
├── src/
│   ├── api/       # HTTP 请求与传输细节
│   ├── assets/    # 参与构建的图片、字体等资源
│   ├── components/ # 可复用 UI 组件
│   ├── config/    # 浏览器端安全运行配置
│   ├── hooks/     # React hooks
│   ├── pages/     # 页面级组件
│   ├── styles/    # 全局样式和样式基础
│   └── types/     # 前端 TypeScript 类型
├── .env.example
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

空目录使用 `.gitkeep` 保留，后续按实际功能逐步填充。`.env` 只用于本地配置且不会提交，公开示例统一维护在 `.env.example`。

## 启动

在仓库根目录执行：

```bash
npm install
npm run dev:frontend
```

默认访问 <http://localhost:5173>。开发服务器会把 `/api` 和 `/health` 代理到 `http://localhost:3000`。
首页的“前后端联调 Demo”接收 `code` 参数；输入 `achat-demo` 会显示 Fastify 返回的成功消息，其他值会显示失败提示。

## 约定

- API 调用统一放在 `src/api/`，组件不直接拼接请求细节。
- 运行时配置使用 `VITE_` 前缀，禁止把服务端密钥放进前端环境变量。
- 页面组件按业务能力拆分到 `src/components/`，当前 MVP 保持在 `App.tsx` 便于快速验证。
