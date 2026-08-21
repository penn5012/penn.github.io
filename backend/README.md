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
`MODEL_PROVIDER=openai`、`MODEL_PROVIDER=deepseek` 或 `MODEL_PROVIDER=gemini`，并填写对应的
`OPENAI_API_KEY`、`DEEPSEEK_API_KEY` 或 `GEMINI_API_KEY`；密钥不会被前端接收，也不能提交到 Git。
OpenAI 默认模型为 `gpt-5.4-nano`，DeepSeek 默认模型为 `deepseek-chat`，Gemini 默认模型为
`gemini-3.5-flash-lite`。`MODEL` 是可选的统一覆盖项；留空时会按当前 `MODEL_PROVIDER` 自动选择上述默认值。
请求超时默认为 `30000` 毫秒。未配置当前供应商密钥时服务仍可启动，
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

普通消息接口保留原子 JSON 响应，返回完整的 `userMessage` 和 `assistantMessage`；需要增量展示时
使用后文的 SSE 接口。

也可以在单次请求中选择 DeepSeek：

```bash
curl -X POST "http://localhost:3000/api/conversations/${conversation_id}/messages" \
  -H 'content-type: application/json' \
  -d '{"content":"请用通俗的语言解释 Node.js 事件循环。","provider":"deepseek","model":"deepseek-chat"}'
```

OpenAI 使用 Responses API；DeepSeek 使用其 OpenAI-compatible Chat Completions 接口。
客户端只能选择服务端批准的 provider/model 配对，不能提交 API Key 或 base URL。

Gemini 使用官方 `@google/genai` SDK 的最新 Interactions API。AChat 会把本地历史转换为
`user_input` / `model_output` 时间线，并设置 `store: false`，继续由应用自身负责历史裁剪和保存；
Provider 不会在导入或测试时自动发起真实请求。Google API Key 仅从服务端
`GEMINI_API_KEY` 读取。

也可以在单次请求中选择 Gemini：

```bash
curl -X POST "http://localhost:3000/api/conversations/${conversation_id}/messages" \
  -H 'content-type: application/json' \
  -d '{"content":"请用通俗的语言解释 Node.js 事件循环。","provider":"gemini","model":"gemini-3.5-flash-lite"}'
```

## Gemini SSE 流式输出

使用 `curl -N` 关闭 curl 的输出缓冲，即可看到文本增量逐段到达：

```bash
curl -N -X POST "http://localhost:3000/api/conversations/${conversation_id}/messages/stream" \
  -H 'content-type: application/json' \
  -d '{"content":"请分三步解释 Node.js 事件循环。","provider":"gemini","model":"gemini-3.5-flash-lite"}'
```

流中包含三类事件：

- `assistant.delta`：追加到当前助手消息的文本片段。
- `message.completed`：完整生成结束，并已原子保存用户消息和助手消息。
- `error`：HTTP 200 已开始后发生的上游错误；半截回复不会保存。

浏览器端停止 `fetch` 或关闭连接时，后端会先把本轮用户消息和已经输出的助手片段保存为“暂停上下文”，再通过 `AbortSignal` 取消本地 Gemini SDK 请求并释放连接。如果停止时还没有生成第一个片段，则只保存用户消息；随后发送“继续”时，模型仍能看到被暂停的话题。上游模型自身报错时不会保存失败的半截输出。
当前只有 Gemini Provider 实现了增量流；其他 Provider 调用流式端点会返回
`400 MODEL_STREAMING_UNSUPPORTED`。断线续传尚未实现。

消息生成会把当前会话最近最多 18 条历史消息和本轮用户消息按时间顺序传给模型（合计最多 19 条）；历史中允许存在被暂停但尚无助手回复的用户消息，并会避免从孤立的助手消息开始。上下文目前只保存在进程内存中；服务重启后会话和上下文都会丢失。

## 分层约定

- `app.ts` 只组装插件和路由，不监听端口，方便测试。
- `server.ts` 是唯一的生产启动入口。
- `modules/` 按业务域拆分路由和服务，路由不直接承载持久化细节。
- `config/` 统一读取环境变量；模型 Key、数据库密码等只放在服务端环境。
- 当前会话服务是内存实现，用于验证 API 契约；下一步替换为 PostgreSQL + Prisma。
