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
curl 'http://localhost:3000/api/demo?code=achat-demo'
curl -X POST http://localhost:3000/api/conversations \
  -H 'content-type: application/json' \
  -d '{"title":"我的第一个会话"}'
```

## 非流式消息生成（阶段一）

将 `backend/.env.example` 复制为 `backend/.env`，在服务端设置
`MODEL_PROVIDER=openai` 或 `MODEL_PROVIDER=deepseek`，并填写对应的
`OPENAI_API_KEY` 或 `DEEPSEEK_API_KEY`；密钥不会被前端接收，也不能提交到 Git。
OpenAI 默认模型为 `gpt-5.4-nano`，DeepSeek 默认模型为 `deepseek-chat`，请求超时默认为
`30000` 毫秒。未配置当前供应商密钥时服务仍可启动，
但消息接口会返回 `503 MODEL_PROVIDER_UNAVAILABLE`。账户额度不足、鉴权、限流、
网络或上游超时也会安全地映射为 503，不会把 OpenAI 的内部详情返回给客户端。

先创建会话，再发送一条非流式消息：

```bash
conversation_id="$(curl -s -X POST http://localhost:3000/api/conversations \
  -H 'content-type: application/json' \
  -d '{"title":"我的第一个会话"}' | node -e "let s=''; process.stdin.on('data',d=>s+=d).on('end',()=>process.stdout.write(JSON.parse(s).id))")"

curl -X POST "http://localhost:3000/api/conversations/${conversation_id}/messages" \
  -H 'content-type: application/json' \
  -d '{"content":"请用通俗的语言解释 Node.js 事件循环。","provider":"openai","model":"gpt-5.4-nano"}'
```

当前接口故意采用非流式响应，返回完整的 `userMessage` 和 `assistantMessage`。
流式输出、停止生成、取消和断线恢复将在后续契约阶段实现。

也可以在单次请求中选择 DeepSeek：

```bash
curl -X POST "http://localhost:3000/api/conversations/${conversation_id}/messages" \
  -H 'content-type: application/json' \
  -d '{"content":"请用通俗的语言解释 Node.js 事件循环。","provider":"deepseek","model":"deepseek-chat"}'
```

OpenAI 使用 Responses API；DeepSeek 使用其 OpenAI-compatible Chat Completions 接口。
客户端只能选择服务端批准的 provider/model 配对，不能提交 API Key 或 base URL。

消息生成会把当前会话最近最多 20 条 user/assistant 消息按时间顺序传给模型，
上下文目前只保存在进程内存中；服务重启后会话和上下文都会丢失。

## 分层约定

- `app.ts` 只组装插件和路由，不监听端口，方便测试。
- `server.ts` 是唯一的生产启动入口。
- `modules/` 按业务域拆分路由和服务，路由不直接承载持久化细节。
- `config/` 统一读取环境变量；模型 Key、数据库密码等只放在服务端环境。
- 当前会话服务是内存实现，用于验证 API 契约；下一步替换为 PostgreSQL + Prisma。
