# Frontend

React + Vite + TypeScript 客户端，负责页面体验、状态展示和后端 API 调用。

## 启动

在仓库根目录执行：

```bash
npm install
npm run dev:frontend
```

默认访问 <http://localhost:5173>。开发服务器会把 `/api` 和 `/health` 代理到 `http://localhost:3000`。

## 约定

- API 调用统一放在 `src/api/`，组件不直接拼接请求细节。
- 运行时配置使用 `VITE_` 前缀，禁止把服务端密钥放进前端环境变量。
- 页面组件按业务能力拆分到 `src/components/`，当前 MVP 保持在 `App.tsx` 便于快速验证。
