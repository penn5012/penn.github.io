import assert from 'node:assert/strict'
import test from 'node:test'
import { buildApp } from '../src/app.js'
import { createOpenAiProvider } from '../src/providers/openai.provider.js'
import { ModelProviderUnavailableError } from '../src/providers/model-provider.js'
import { listMessages } from '../src/modules/conversations/conversation.service.js'
import { createShutdownHandler } from '../src/server-shutdown.js'

test('GET /api/demo accepts the correct code', async (t) => {
  const app = buildApp()
  t.after(() => app.close())

  const response = await app.inject({
    method: 'GET',
    url: '/api/demo?code=achat-demo',
  })

  assert.equal(response.statusCode, 200)
  assert.equal(response.json().message, '你好，今天你想做点什么有趣的事情？')
  assert.doesNotThrow(() => new Date(response.json().timestamp).toISOString())
})

test('GET /api/demo rejects an incorrect code', async (t) => {
  const app = buildApp()
  t.after(() => app.close())

  const response = await app.inject({
    method: 'GET',
    url: '/api/demo?code=wrong-code',
  })

  assert.equal(response.statusCode, 400)
  assert.deepEqual(response.json(), {
    error: {
      code: 'INVALID_DEMO_CODE',
      message: '请求参数错误，请输入正确的 Demo Code',
    },
  })
})

test('GET /health returns service availability', async (t) => {
  const app = buildApp()
  t.after(() => app.close())

  const response = await app.inject({
    method: 'GET',
    url: '/health',
  })

  assert.equal(response.statusCode, 200)
  const body = response.json()
  assert.equal(body.status, 'ok')
  assert.equal(body.service, 'ai-chat-backend')
  assert.deepEqual(Object.keys(body).sort(), ['service', 'status', 'timestamp'])
  assert.doesNotThrow(() => new Date(body.timestamp).toISOString())
})

test('POST /api/conversations creates and lists a conversation', async (t) => {
  const app = buildApp()
  t.after(() => app.close())

  const createResponse = await app.inject({
    method: 'POST',
    url: '/api/conversations',
    payload: { title: '  学习 Node.js  ' },
  })

  assert.equal(createResponse.statusCode, 201)
  const created = createResponse.json()
  assert.equal(created.title, '学习 Node.js')
  assert.match(created.id, /^[0-9a-f-]{36}$/)
  assert.doesNotThrow(() => new Date(created.createdAt).toISOString())
  assert.doesNotThrow(() => new Date(created.updatedAt).toISOString())

  const listResponse = await app.inject({
    method: 'GET',
    url: '/api/conversations',
  })

  assert.equal(listResponse.statusCode, 200)
  assert.ok(
    listResponse
      .json()
      .some((conversation: { id: string }) => conversation.id === created.id),
  )
})

test('POST /api/conversations rejects a missing title', async (t) => {
  const app = buildApp()
  t.after(() => app.close())

  const response = await app.inject({
    method: 'POST',
    url: '/api/conversations',
    payload: {},
  })

  assert.equal(response.statusCode, 400)
  assert.equal(response.json().error.code, 'INVALID_REQUEST')
})

test('POST /api/conversations rejects an empty title', async (t) => {
  const app = buildApp()
  t.after(() => app.close())

  const response = await app.inject({
    method: 'POST',
    url: '/api/conversations',
    payload: { title: '' },
  })

  assert.equal(response.statusCode, 400)
  assert.equal(response.json().error.code, 'INVALID_REQUEST')
})

test('POST message creates the user and assistant messages', async (t) => {
  let calls = 0
  const app = buildApp({
    modelProvider: {
      async generateReply(content) {
        calls += 1
        return `回复：${content.at(-1)?.content}`
      },
    },
  })
  t.after(() => app.close())

  const conversationResponse = await app.inject({
    method: 'POST',
    url: '/api/conversations',
    payload: { title: '消息测试' },
  })
  const conversationId = conversationResponse.json().id
  const response = await app.inject({
    method: 'POST',
    url: `/api/conversations/${conversationId}/messages`,
    payload: { content: '你好' },
  })

  assert.equal(response.statusCode, 201)
  assert.equal(calls, 1)
  assert.deepEqual(response.json().userMessage.role, 'user')
  assert.deepEqual(response.json().userMessage.content, '你好')
  assert.deepEqual(response.json().assistantMessage.role, 'assistant')
  assert.deepEqual(response.json().assistantMessage.content, '回复：你好')
  assert.equal(listMessages(conversationId).length, 2)
})

test('POST message sends prior user and assistant messages in order', async (t) => {
  const contexts: Array<readonly { role: string; content: string }[]> = []
  const app = buildApp({
    modelProvider: {
      async generateReply(messages) {
        contexts.push(messages)
        return `回复：${messages.at(-1)?.content}`
      },
    },
  })
  t.after(() => app.close())

  const conversationResponse = await app.inject({
    method: 'POST',
    url: '/api/conversations',
    payload: { title: '多轮上下文测试' },
  })
  const conversationId = conversationResponse.json().id

  for (const content of ['第一轮', '第二轮']) {
    const response = await app.inject({
      method: 'POST',
      url: `/api/conversations/${conversationId}/messages`,
      payload: { content },
    })
    assert.equal(response.statusCode, 201)
  }

  assert.deepEqual(contexts[1], [
    { role: 'user', content: '第一轮' },
    { role: 'assistant', content: '回复：第一轮' },
    { role: 'user', content: '第二轮' },
  ])
})

test('POST message limits provider context to complete recent turns', async (t) => {
  const contexts: Array<readonly { role: string; content: string }[]> = []
  const app = buildApp({
    modelProvider: {
      async generateReply(messages) {
        contexts.push(messages)
        return `回复：${messages.at(-1)?.content}`
      },
    },
  })
  t.after(() => app.close())

  const conversationResponse = await app.inject({
    method: 'POST',
    url: '/api/conversations',
    payload: { title: '上下文上限测试' },
  })
  const conversationId = conversationResponse.json().id

  for (let round = 1; round <= 11; round += 1) {
    const response = await app.inject({
      method: 'POST',
      url: `/api/conversations/${conversationId}/messages`,
      payload: { content: `第${round}轮` },
    })
    assert.equal(response.statusCode, 201)
  }

  const latestContext = contexts.at(-1)
  assert.equal(latestContext?.length, 19)
  assert.deepEqual(latestContext?.[0], {
    role: 'user',
    content: '第2轮',
  })
  for (let index = 0; index < 18; index += 2) {
    assert.equal(latestContext?.[index]?.role, 'user')
    assert.equal(latestContext?.[index + 1]?.role, 'assistant')
  }
  assert.deepEqual(latestContext?.at(-1), {
    role: 'user',
    content: '第11轮',
  })
  assert.equal(
    latestContext?.some(
      (message) =>
        message.content === '第1轮' || message.content === '回复：第1轮',
    ),
    false,
  )
})

test('POST message does not call provider for a missing conversation', async (t) => {
  let calls = 0
  const app = buildApp({
    modelProvider: {
      async generateReply() {
        calls += 1
        return '不应出现'
      },
    },
  })
  t.after(() => app.close())

  const conversationId = '00000000-0000-4000-8000-000000000000'
  const response = await app.inject({
    method: 'POST',
    url: `/api/conversations/${conversationId}/messages`,
    payload: { content: '你好' },
  })

  assert.equal(response.statusCode, 404)
  assert.deepEqual(response.json(), {
    error: {
      code: 'CONVERSATION_NOT_FOUND',
      message: 'Conversation not found.',
    },
  })
  assert.equal(calls, 0)
})

test('POST message rejects blank content without creating messages', async (t) => {
  let calls = 0
  const app = buildApp({
    modelProvider: {
      async generateReply() {
        calls += 1
        return '不应出现'
      },
    },
  })
  t.after(() => app.close())

  const conversationResponse = await app.inject({
    method: 'POST',
    url: '/api/conversations',
    payload: { title: '空白消息测试' },
  })
  const conversationId = conversationResponse.json().id
  const response = await app.inject({
    method: 'POST',
    url: `/api/conversations/${conversationId}/messages`,
    payload: { content: '   ' },
  })

  assert.equal(response.statusCode, 400)
  assert.equal(response.json().error.code, 'INVALID_REQUEST')
  assert.equal(calls, 0)
  assert.equal(listMessages(conversationId).length, 0)
})

test('POST message maps provider unavailability to 503 without persisting', async (t) => {
  const app = buildApp({
    modelProvider: {
      async generateReply() {
        throw new ModelProviderUnavailableError()
      },
    },
  })
  t.after(() => app.close())

  const conversationResponse = await app.inject({
    method: 'POST',
    url: '/api/conversations',
    payload: { title: '供应商失败测试' },
  })
  const conversationId = conversationResponse.json().id
  const response = await app.inject({
    method: 'POST',
    url: `/api/conversations/${conversationId}/messages`,
    payload: { content: '你好' },
  })

  assert.equal(response.statusCode, 503)
  assert.equal(response.json().error.code, 'MODEL_PROVIDER_UNAVAILABLE')
  assert.equal(JSON.stringify(response.json()).includes('secret'), false)
  assert.equal(listMessages(conversationId).length, 0)
})

test('POST message maps empty provider output to 502 without persisting', async (t) => {
  const app = buildApp({
    modelProvider: {
      async generateReply() {
        return '   '
      },
    },
  })
  t.after(() => app.close())

  const conversationResponse = await app.inject({
    method: 'POST',
    url: '/api/conversations',
    payload: { title: '空输出测试' },
  })
  const conversationId = conversationResponse.json().id
  const response = await app.inject({
    method: 'POST',
    url: `/api/conversations/${conversationId}/messages`,
    payload: { content: '你好' },
  })

  assert.equal(response.statusCode, 502)
  assert.equal(response.json().error.code, 'MODEL_PROVIDER_ERROR')
  assert.equal(listMessages(conversationId).length, 0)
})

test('default OpenAI provider without a key returns 503', async (t) => {
  const app = buildApp({
    modelProvider: createOpenAiProvider({
      apiKey: undefined,
      model: 'gpt-5.4-nano',
      timeoutMs: 30_000,
    }),
  })
  t.after(() => app.close())

  const conversationResponse = await app.inject({
    method: 'POST',
    url: '/api/conversations',
    payload: { title: '缺少密钥测试' },
  })
  const conversationId = conversationResponse.json().id
  const response = await app.inject({
    method: 'POST',
    url: `/api/conversations/${conversationId}/messages`,
    payload: { content: '不会发送真实请求' },
  })

  assert.equal(response.statusCode, 503)
  assert.equal(response.json().error.code, 'MODEL_PROVIDER_UNAVAILABLE')
  assert.equal(
    JSON.stringify(response.json()).includes('OPENAI_API_KEY'),
    false,
  )
  assert.equal(listMessages(conversationId).length, 0)
})

test('shutdown handler closes the app once and exits successfully', async () => {
  let closeCalls = 0
  const exits: number[] = []
  const shutdown = createShutdownHandler(
    {
      async close() {
        closeCalls += 1
      },
      log: { error() {} },
    },
    (code) => exits.push(code),
  )

  await Promise.all([shutdown('SIGINT'), shutdown('SIGTERM')])
  assert.equal(closeCalls, 1)
  assert.deepEqual(exits, [0])
})
