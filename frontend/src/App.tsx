import { useEffect, useState } from 'react'
import { apiClient } from './api/client'
import type { Conversation, DemoResponse, Message } from './types/api'

export default function App() {
  const [demo, setDemo] = useState<DemoResponse | null>(null)
  const [demoCode, setDemoCode] = useState('')
  const [demoLoading, setDemoLoading] = useState(false)
  const [demoError, setDemoError] = useState('')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState('')
  const [messagesByConversation, setMessagesByConversation] = useState<
    Record<string, Message[]>
  >({})
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [chatError, setChatError] = useState('')

  const activeConversation = conversations.find(
    (conversation) => conversation.id === activeConversationId,
  )
  const activeMessages = activeConversationId
    ? (messagesByConversation[activeConversationId] ?? [])
    : []

  useEffect(() => {
    async function loadConversations() {
      try {
        const conversationResponse = await apiClient.listConversations()
        setConversations(conversationResponse)
        setActiveConversationId(
          (current) => current || conversationResponse[0]?.id || '',
        )
      } catch (requestError: unknown) {
        setError(
          requestError instanceof Error ? requestError.message : '加载会话失败',
        )
      }
    }

    void loadConversations()
  }, [])

  async function handleDemoCall() {
    const code = demoCode.trim()
    setDemo(null)
    setDemoError('')

    if (!code) {
      setDemoError('请输入 Demo Code')
      return
    }

    setDemoLoading(true)

    try {
      setDemo(await apiClient.demo(code))
    } catch (requestError: unknown) {
      setDemo(null)
      setDemoError(
        requestError instanceof Error
          ? requestError.message
          : 'Demo 接口调用失败',
      )
    } finally {
      setDemoLoading(false)
    }
  }

  async function handleCreateConversation() {
    const nextTitle = title.trim()
    if (!nextTitle || sending) return

    try {
      const conversation = await apiClient.createConversation(nextTitle)
      setConversations((current) => [conversation, ...current])
      setActiveConversationId(conversation.id)
      setMessagesByConversation((current) => ({
        ...current,
        [conversation.id]: [],
      }))
      setTitle('')
      setError('')
      setChatError('')
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error ? requestError.message : '创建会话失败',
      )
    }
  }

  async function handleSendMessage() {
    const content = draft.trim()
    const conversationId = activeConversationId

    if (!content || !conversationId || sending) return

    setSending(true)
    setChatError('')

    try {
      const result = await apiClient.sendMessage(conversationId, content)

      setMessagesByConversation((current) => ({
        ...current,
        [conversationId]: [
          ...(current[conversationId] ?? []),
          result.userMessage,
          result.assistantMessage,
        ],
      }))
      setConversations((current) => {
        const conversation = current.find((item) => item.id === conversationId)

        if (!conversation) return current

        return [
          {
            ...conversation,
            updatedAt: result.assistantMessage.createdAt,
          },
          ...current.filter((item) => item.id !== conversationId),
        ]
      })
      setDraft('')
    } catch (requestError: unknown) {
      setChatError(
        requestError instanceof Error
          ? requestError.message
          : '消息发送失败，请稍后重试。',
      )
    } finally {
      setSending(false)
    }
  }

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">AI CHAT PLATFORM · V0.1</p>
        <h1>把想法变成可持续迭代的 AI 产品。</h1>
        <p className="subtitle">
          前端负责体验，后端负责能力与安全。现在从一个清晰的会话工作台开始。
        </p>
      </section>

      <section className="workspace">
        <div className="panel panel-demo">
          <div>
            <p className="panel-label">前后端联调 Demo</p>
            <h2>浏览器调用 Fastify 接口</h2>
            <p className="muted">
              输入请求参数后，前端会通过开发代理调用本机 3000 端口。
            </p>
          </div>
          <div className="demo-form">
            <label htmlFor="demo-code">请求参数 code</label>
            <div className="demo-actions">
              <input
                id="demo-code"
                value={demoCode}
                onChange={(event) => setDemoCode(event.target.value)}
                onKeyDown={(event) =>
                  event.key === 'Enter' && void handleDemoCall()
                }
                placeholder="请输入 Demo Code"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => void handleDemoCall()}
                disabled={demoLoading}
              >
                {demoLoading ? '调用中…' : '调用接口'}
              </button>
            </div>
            <p className="demo-hint">
              正确示例：<code>achat-demo</code>
            </p>
          </div>
          <div className="demo-result" data-success={Boolean(demo)}>
            {demoLoading && <span>正在调用接口…</span>}
            {!demoLoading && !demo && !demoError && (
              <span>等待输入请求参数</span>
            )}
            {!demoLoading && demo && (
              <div>
                <strong>{demo.message}</strong>
                <small>
                  服务端时间：{new Date(demo.timestamp).toLocaleString('zh-CN')}
                </small>
              </div>
            )}
            {!demoLoading && demoError && (
              <span className="error">{demoError}</span>
            )}
          </div>
        </div>

        <div className="panel panel-create">
          <div>
            <p className="panel-label">新建工作流</p>
            <h2>开始一个新会话</h2>
            <p className="muted">
              会话数据当前保存在后端内存中，下一阶段接入 PostgreSQL。
            </p>
          </div>
          <div className="create-form">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) =>
                event.key === 'Enter' && void handleCreateConversation()
              }
              placeholder="例如：设计知识库问答 MVP"
              aria-label="会话标题"
              disabled={sending}
            />
            <button
              type="button"
              onClick={() => void handleCreateConversation()}
              disabled={sending}
            >
              创建会话
            </button>
          </div>
          {error && <p className="error">{error}</p>}
        </div>

        <div className="panel">
          <div className="panel-heading">
            <div>
              <p className="panel-label">最近会话</p>
              <h2>你的工作台</h2>
            </div>
            <span className="count">{conversations.length} 个</span>
          </div>
          {conversations.length === 0 ? (
            <div className="empty-state">还没有会话，创建一个开始吧。</div>
          ) : (
            <div className="conversation-list">
              {conversations.map((conversation) => (
                <button
                  className="conversation"
                  data-active={conversation.id === activeConversationId}
                  disabled={sending}
                  key={conversation.id}
                  onClick={() => {
                    setActiveConversationId(conversation.id)
                    setChatError('')
                  }}
                  type="button"
                >
                  <div className="conversation-icon">✦</div>
                  <div>
                    <h3>{conversation.title}</h3>
                    <p>
                      {new Date(conversation.updatedAt).toLocaleString('zh-CN')}
                    </p>
                  </div>
                  <span className="arrow">→</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="panel panel-chat">
          <div className="panel-heading chat-heading">
            <div>
              <p className="panel-label">真实 AI 对话</p>
              <h2>{activeConversation?.title ?? '选择一个会话开始'}</h2>
            </div>
            <span className="provider-badge">由后端安全调用模型</span>
          </div>

          <p className="chat-note">
            当前只展示本页面中成功返回的消息；刷新页面不会恢复消息历史。
          </p>

          <div className="message-list" aria-live="polite">
            {!activeConversation && (
              <div className="chat-empty">请先创建或选择一个会话。</div>
            )}
            {activeConversation && activeMessages.length === 0 && !sending && (
              <div className="chat-empty">
                还没有消息，向 AI 提出第一个问题吧。
              </div>
            )}
            {activeMessages.map((message) => (
              <article
                className={`message message-${message.role}`}
                key={message.id}
              >
                <span>{message.role === 'user' ? '你' : 'AI'}</span>
                <p>{message.content}</p>
              </article>
            ))}
            {sending && (
              <div className="thinking" role="status">
                AI 正在思考…
              </div>
            )}
          </div>

          <div className="composer">
            <label htmlFor="chat-draft">聊天内容</label>
            <textarea
              id="chat-draft"
              maxLength={10000}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === 'Enter' &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault()
                  void handleSendMessage()
                }
              }}
              placeholder={
                activeConversation
                  ? '输入问题，Enter 发送，Shift + Enter 换行'
                  : '请先创建或选择会话'
              }
              disabled={!activeConversation || sending}
              value={draft}
            />
            <div className="composer-footer">
              <span>本阶段为非流式回复，请等待完整结果。</span>
              <button
                type="button"
                onClick={() => void handleSendMessage()}
                disabled={!draft.trim() || !activeConversation || sending}
              >
                {sending ? '发送中…' : '发送消息'}
              </button>
            </div>
            {chatError && (
              <p className="error" role="alert">
                {chatError} 输入内容已保留，可以重试。
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
