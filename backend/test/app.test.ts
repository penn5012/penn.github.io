import assert from 'node:assert/strict'
import test from 'node:test'
import { buildApp } from '../src/app.js'
import {
  createGeminiProvider,
  type GeminiClient,
} from '../src/providers/gemini.provider.js'
import { createOpenAiProvider } from '../src/providers/openai.provider.js'
import {
  createModelProvider,
  createModelProviderFactory,
} from '../src/providers/model-provider-factory.js'
import { ModelProviderUnavailableError } from '../src/providers/model-provider.js'
import {
  createConversation,
  listMessages,
  prepareConversationMessage,
} from '../src/modules/conversations/conversation.service.js'
import { createShutdownHandler } from '../src/server-shutdown.js'

function parseSse(payload: string): Array<{ event: string; data: unknown }> {
  return payload
    .trim()
    .split('\n\n')
    .map((block) => {
      const lines = block.split('\n')
      const event = lines.find((line) => line.startsWith('event: '))
      const data = lines.find((line) => line.startsWith('data: '))
      assert.ok(event)
      assert.ok(data)
      return {
        event: event.slice('event: '.length),
        data: JSON.parse(data.slice('data: '.length)),
      }
    })
}

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

test('POST message resolves the requested provider and model per request', async (t) => {
  const selections: Array<{ provider?: string; model?: string }> = []
  const app = buildApp({
    modelProviderFactory(selection) {
      selections.push(selection ?? {})
      return {
        async generateReply(messages) {
          return `回复：${messages.at(-1)?.content}`
        },
      }
    },
  })
  t.after(() => app.close())

  const conversationResponse = await app.inject({
    method: 'POST',
    url: '/api/conversations',
    payload: { title: '供应商选择测试' },
  })
  const conversationId = conversationResponse.json().id
  const response = await app.inject({
    method: 'POST',
    url: `/api/conversations/${conversationId}/messages`,
    payload: {
      content: '使用 DeepSeek',
      provider: 'deepseek',
      model: 'deepseek-chat',
    },
  })

  assert.equal(response.statusCode, 201)
  assert.deepEqual(selections, [
    { provider: 'deepseek', model: 'deepseek-chat' },
  ])
})

test('POST message accepts the approved Gemini provider and model', async (t) => {
  const selections: Array<{ provider?: string; model?: string }> = []
  const app = buildApp({
    modelProviderFactory(selection) {
      selections.push(selection ?? {})
      return {
        async generateReply() {
          return 'Gemini 回复'
        },
      }
    },
  })
  t.after(() => app.close())

  const conversationResponse = await app.inject({
    method: 'POST',
    url: '/api/conversations',
    payload: { title: 'Gemini 供应商选择测试' },
  })
  const response = await app.inject({
    method: 'POST',
    url: `/api/conversations/${conversationResponse.json().id}/messages`,
    payload: {
      content: '使用 Gemini',
      provider: 'gemini',
      model: 'gemini-3.5-flash-lite',
    },
  })

  assert.equal(response.statusCode, 201)
  assert.deepEqual(selections, [
    { provider: 'gemini', model: 'gemini-3.5-flash-lite' },
  ])
})

test('POST message stream emits deltas and persists only the completed exchange', async (t) => {
  const app = buildApp({
    modelProvider: {
      async generateReply() {
        return '非流式回复'
      },
      async streamReply() {
        return (async function* () {
          yield '流式'
          yield '回复'
        })()
      },
    },
  })
  t.after(() => app.close())

  const conversationResponse = await app.inject({
    method: 'POST',
    url: '/api/conversations',
    payload: { title: '流式成功测试' },
  })
  const conversationId = conversationResponse.json().id
  const response = await app.inject({
    method: 'POST',
    url: `/api/conversations/${conversationId}/messages/stream`,
    payload: { content: '请流式回答' },
  })

  assert.equal(response.statusCode, 200)
  assert.match(response.headers['content-type'] ?? '', /^text\/event-stream/)
  const events = parseSse(response.payload)
  assert.deepEqual(
    events.map(({ event }) => event),
    ['assistant.delta', 'assistant.delta', 'message.completed'],
  )
  assert.deepEqual(events[0]?.data, { delta: '流式' })
  assert.deepEqual(events[1]?.data, { delta: '回复' })
  assert.equal(
    (events[2]?.data as { assistantMessage: { content: string } })
      .assistantMessage.content,
    '流式回复',
  )
  assert.deepEqual(
    listMessages(conversationId).map(({ role, content }) => ({
      role,
      content,
    })),
    [
      { role: 'user', content: '请流式回答' },
      { role: 'assistant', content: '流式回复' },
    ],
  )
})

test('POST message stream reports an in-stream error without persisting partial text', async (t) => {
  const app = buildApp({
    modelProvider: {
      async generateReply() {
        return '非流式回复'
      },
      async streamReply() {
        return (async function* () {
          yield '不会保存的半截回复'
          throw new ModelProviderUnavailableError()
        })()
      },
    },
  })
  t.after(() => app.close())

  const conversationResponse = await app.inject({
    method: 'POST',
    url: '/api/conversations',
    payload: { title: '流式失败测试' },
  })
  const conversationId = conversationResponse.json().id
  const response = await app.inject({
    method: 'POST',
    url: `/api/conversations/${conversationId}/messages/stream`,
    payload: { content: '触发流式失败' },
  })

  assert.equal(response.statusCode, 200)
  const events = parseSse(response.payload)
  assert.deepEqual(
    events.map(({ event }) => event),
    ['assistant.delta', 'error'],
  )
  assert.deepEqual(events[1]?.data, {
    error: {
      code: 'MODEL_PROVIDER_UNAVAILABLE',
      message:
        'The assistant is temporarily unavailable. Please try again later.',
    },
  })
  assert.equal(listMessages(conversationId).length, 0)
})

test('stopping a stream keeps the interrupted topic for a later continue message', async (t) => {
  const generatedContexts: Array<Array<{ role: string; content: string }>> = []
  let resolveProviderAborted!: () => void
  const providerAborted = new Promise<void>((resolve) => {
    resolveProviderAborted = resolve
  })

  const app = buildApp({
    modelProvider: {
      async generateReply(context) {
        generatedContexts.push(
          context.map(({ role, content }) => ({ role, content })),
        )
        return `回复：${context.at(-1)?.content}`
      },
      async streamReply(_context, signal) {
        assert.ok(signal)
        return (async function* (): AsyncGenerator<string> {
          // Simulate a slow model that has connected but has not produced its
          // first token. The route must still remember the submitted topic when
          // the browser closes the SSE request.
          await new Promise<void>((resolve) => {
            const onAbort = () => {
              resolveProviderAborted()
              resolve()
            }
            if (signal.aborted) {
              onAbort()
              return
            }
            signal.addEventListener('abort', onAbort, { once: true })
          })
          // The route checks the aborted signal before accepting this value.
          yield 'abort 后不应被保存'
        })()
      },
    },
  })
  t.after(() => app.close())

  const origin = await app.listen({ host: '127.0.0.1', port: 0 })
  const conversationResponse = await app.inject({
    method: 'POST',
    url: '/api/conversations',
    payload: { title: '停止后继续测试' },
  })
  const conversationId = conversationResponse.json().id

  const firstResponse = await app.inject({
    method: 'POST',
    url: `/api/conversations/${conversationId}/messages`,
    payload: { content: '第一个话题' },
  })
  assert.equal(firstResponse.statusCode, 201)

  const controller = new AbortController()
  const streamResponse = await fetch(
    `${origin}/api/conversations/${conversationId}/messages/stream`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: '第二个被停止的话题' }),
      signal: controller.signal,
    },
  )
  assert.equal(streamResponse.status, 200)

  controller.abort()
  await providerAborted

  const continueResponse = await app.inject({
    method: 'POST',
    url: `/api/conversations/${conversationId}/messages`,
    payload: { content: '继续' },
  })
  assert.equal(continueResponse.statusCode, 201)
  assert.deepEqual(generatedContexts.at(-1), [
    { role: 'user', content: '第一个话题' },
    { role: 'assistant', content: '回复：第一个话题' },
    { role: 'user', content: '第二个被停止的话题' },
    { role: 'user', content: '继续' },
  ])
  assert.deepEqual(
    listMessages(conversationId).map(({ role, content }) => ({
      role,
      content,
    })),
    [
      { role: 'user', content: '第一个话题' },
      { role: 'assistant', content: '回复：第一个话题' },
      { role: 'user', content: '第二个被停止的话题' },
      { role: 'user', content: '继续' },
      { role: 'assistant', content: '回复：继续' },
    ],
  )
})

test('a paused stream stores delivered assistant text only once', () => {
  const conversation = createConversation('暂停片段测试')
  const prepared = prepareConversationMessage(conversation.id, '未完成的话题')

  prepared.pause('已经生成的半截内容')
  // Both the request and response can report the same closed connection. A
  // second pause notification must not duplicate the interrupted exchange.
  prepared.pause('不应重复保存')

  assert.deepEqual(
    listMessages(conversation.id).map(({ role, content }) => ({
      role,
      content,
    })),
    [
      { role: 'user', content: '未完成的话题' },
      { role: 'assistant', content: '已经生成的半截内容' },
    ],
  )
  assert.deepEqual(
    prepareConversationMessage(conversation.id, '继续').context,
    [
      { role: 'user', content: '未完成的话题' },
      { role: 'assistant', content: '已经生成的半截内容' },
      { role: 'user', content: '继续' },
    ],
  )
})

test('POST message stream rejects a provider without streaming support before SSE starts', async (t) => {
  const app = buildApp({
    modelProvider: {
      async generateReply() {
        return '只支持非流式'
      },
    },
  })
  t.after(() => app.close())

  const conversationResponse = await app.inject({
    method: 'POST',
    url: '/api/conversations',
    payload: { title: '流式能力检查' },
  })
  const response = await app.inject({
    method: 'POST',
    url: `/api/conversations/${conversationResponse.json().id}/messages/stream`,
    payload: { content: '尝试流式回答' },
  })

  assert.equal(response.statusCode, 400)
  assert.deepEqual(response.json().error, {
    code: 'MODEL_STREAMING_UNSUPPORTED',
    message: 'The selected model provider does not support streaming.',
  })
})

test('POST message rejects an unsupported provider/model pair', async (t) => {
  const app = buildApp({
    modelProviderFactory: createModelProviderFactory({
      provider: 'openai',
      model: 'gpt-5.4-nano',
      openAiApiKey: undefined,
      deepSeekApiKey: undefined,
      timeoutMs: 30_000,
    }),
  })
  t.after(() => app.close())

  const conversationResponse = await app.inject({
    method: 'POST',
    url: '/api/conversations',
    payload: { title: '供应商配对测试' },
  })
  const conversationId = conversationResponse.json().id
  const response = await app.inject({
    method: 'POST',
    url: `/api/conversations/${conversationId}/messages`,
    payload: {
      content: '不应调用模型',
      provider: 'openai',
      model: 'deepseek-chat',
    },
  })

  assert.equal(response.statusCode, 400)
  assert.deepEqual(response.json().error, {
    code: 'MODEL_SELECTION_UNSUPPORTED',
    message: 'The selected provider and model combination is not supported.',
  })
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

test('DeepSeek provider without a key returns 503 without a live request', async (t) => {
  const app = buildApp({
    modelProvider: createModelProvider({
      provider: 'deepseek',
      model: 'deepseek-chat',
      openAiApiKey: undefined,
      deepSeekApiKey: undefined,
      timeoutMs: 30_000,
    }),
  })
  t.after(() => app.close())

  const conversationResponse = await app.inject({
    method: 'POST',
    url: '/api/conversations',
    payload: { title: 'DeepSeek 测试' },
  })
  const conversationId = conversationResponse.json().id
  const response = await app.inject({
    method: 'POST',
    url: `/api/conversations/${conversationId}/messages`,
    payload: { content: '不会发送真实请求' },
  })

  assert.equal(response.statusCode, 503)
  assert.equal(response.json().error.code, 'MODEL_PROVIDER_UNAVAILABLE')
  assert.equal(listMessages(conversationId).length, 0)
})

test('Gemini provider uses the Interactions API without a live request', async () => {
  let request: unknown
  let requestOptions: unknown
  const provider = createGeminiProvider({
    apiKey: 'test-key',
    model: 'gemini-3.5-flash-lite',
    timeoutMs: 12_345,
    client: {
      interactions: {
        async create(parameters: unknown, options: unknown) {
          request = parameters
          requestOptions = options
          return { output_text: '  Gemini 回复  ' }
        },
      },
    } as unknown as GeminiClient,
  })

  const output = await provider.generateReply([
    { role: 'user', content: '第一轮' },
    { role: 'assistant', content: '第一轮回复' },
    { role: 'user', content: '第二轮' },
  ])

  assert.equal(output, 'Gemini 回复')
  assert.deepEqual(request, {
    model: 'gemini-3.5-flash-lite',
    input: [
      { type: 'user_input', content: [{ type: 'text', text: '第一轮' }] },
      {
        type: 'model_output',
        content: [{ type: 'text', text: '第一轮回复' }],
      },
      { type: 'user_input', content: [{ type: 'text', text: '第二轮' }] },
    ],
    store: false,
  })
  assert.deepEqual(requestOptions, { timeout: 12_345 })
})

test('Gemini provider maps Interactions API text deltas without a live request', async () => {
  let request: unknown
  let requestOptions: unknown
  const abortController = new AbortController()
  const provider = createGeminiProvider({
    apiKey: 'test-key',
    model: 'gemini-3.5-flash-lite',
    timeoutMs: 12_345,
    client: {
      interactions: {
        async create(parameters: unknown, options: unknown) {
          request = parameters
          requestOptions = options
          return (async function* () {
            yield {
              event_type: 'interaction.created',
              interaction: { id: 'int-test', status: 'in_progress' },
            }
            yield {
              event_type: 'step.delta',
              index: 0,
              delta: { type: 'text', text: '增量一' },
            }
            yield {
              event_type: 'step.delta',
              index: 0,
              delta: { type: 'text', text: '增量二' },
            }
            yield {
              event_type: 'interaction.completed',
              interaction: { id: 'int-test', status: 'completed' },
            }
          })()
        },
      },
    } as unknown as GeminiClient,
  })

  const stream = await provider.streamReply?.(
    [{ role: 'user', content: '流式回答' }],
    abortController.signal,
  )
  assert.ok(stream)
  const deltas: string[] = []
  for await (const delta of stream) deltas.push(delta)

  assert.deepEqual(deltas, ['增量一', '增量二'])
  assert.deepEqual(request, {
    model: 'gemini-3.5-flash-lite',
    input: [
      {
        type: 'user_input',
        content: [{ type: 'text', text: '流式回答' }],
      },
    ],
    store: false,
    stream: true,
  })
  assert.deepEqual(requestOptions, {
    timeout: 12_345,
    fetchOptions: { signal: abortController.signal },
  })
})

test('Gemini provider without a key returns 503 without a live request', async (t) => {
  const app = buildApp({
    modelProvider: createModelProvider({
      provider: 'gemini',
      model: 'gemini-3.5-flash-lite',
      openAiApiKey: undefined,
      deepSeekApiKey: undefined,
      geminiApiKey: undefined,
      timeoutMs: 30_000,
    }),
  })
  t.after(() => app.close())

  const conversationResponse = await app.inject({
    method: 'POST',
    url: '/api/conversations',
    payload: { title: 'Gemini 缺少密钥测试' },
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
    JSON.stringify(response.json()).includes('GEMINI_API_KEY'),
    false,
  )
  assert.equal(listMessages(conversationId).length, 0)
})

test('Gemini stream without a key returns JSON 503 before SSE starts', async (t) => {
  const app = buildApp({
    modelProvider: createModelProvider({
      provider: 'gemini',
      model: 'gemini-3.5-flash-lite',
      openAiApiKey: undefined,
      deepSeekApiKey: undefined,
      geminiApiKey: undefined,
      timeoutMs: 30_000,
    }),
  })
  t.after(() => app.close())

  const conversationResponse = await app.inject({
    method: 'POST',
    url: '/api/conversations',
    payload: { title: 'Gemini 流式缺少密钥测试' },
  })
  const conversationId = conversationResponse.json().id
  const response = await app.inject({
    method: 'POST',
    url: `/api/conversations/${conversationId}/messages/stream`,
    payload: { content: '不会发送真实请求' },
  })

  assert.equal(response.statusCode, 503)
  assert.match(response.headers['content-type'] ?? '', /^application\/json/)
  assert.equal(response.json().error.code, 'MODEL_PROVIDER_UNAVAILABLE')
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
