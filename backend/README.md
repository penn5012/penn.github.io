# Backend

Fastify + TypeScript 服务端，负责 API、业务规则和后续模型/数据库集成。

## 启动

在仓库根目录执行：

```bash
npm install
npm run dev:backend
```

服务默认监听 `http://127.0.0.1:3000`，可以用下面的命令验证：

```bash
curl http://localhost:3000/health
curl -X POST http://localhost:3000/api/conversations \
  -H 'content-type: application/json' \
  -d '{"title":"我的第一个会话"}'
```

## 分层约定

- `app.ts` 只组装插件和路由，不监听端口，方便测试。
- `server.ts` 是唯一的生产启动入口。
- `modules/` 按业务域拆分路由和服务，路由不直接承载持久化细节。
- `config/` 统一读取环境变量；模型 Key、数据库密码等只放在服务端环境。
- 当前会话服务是内存实现，用于验证 API 契约；下一步替换为 PostgreSQL + Prisma。
