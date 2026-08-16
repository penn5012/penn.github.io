import { useEffect, useState } from 'react'
import { apiClient } from './api/client'
import type { Conversation, HealthResponse } from './types/api'

export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([apiClient.health(), apiClient.listConversations()])
      .then(([healthResponse, conversationResponse]) => {
        setHealth(healthResponse)
        setConversations(conversationResponse)
      })
      .catch((requestError: unknown) => {
        setError(requestError instanceof Error ? requestError.message : '无法连接后端')
      })
  }, [])

  async function handleCreateConversation() {
    const nextTitle = title.trim()
    if (!nextTitle) return

    try {
      const conversation = await apiClient.createConversation(nextTitle)
      setConversations((current) => [conversation, ...current])
      setTitle('')
      setError('')
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : '创建会话失败')
    }
  }

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">AI CHAT PLATFORM · V0.1</p>
        <h1>把想法变成可持续迭代的 AI 产品。</h1>
        <p className="subtitle">前端负责体验，后端负责能力与安全。现在从一个清晰的会话工作台开始。</p>
        <div className="status-pill" data-online={Boolean(health)}>
          <span className="status-dot" />
          {health ? '后端服务已连接' : '正在连接后端'}
        </div>
      </section>

      <section className="workspace">
        <div className="panel panel-create">
          <div>
            <p className="panel-label">新建工作流</p>
            <h2>开始一个新会话</h2>
            <p className="muted">会话数据当前保存在后端内存中，下一阶段接入 PostgreSQL。</p>
          </div>
          <div className="create-form">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && void handleCreateConversation()}
              placeholder="例如：设计知识库问答 MVP"
              aria-label="会话标题"
            />
            <button type="button" onClick={() => void handleCreateConversation()}>
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
                <article className="conversation" key={conversation.id}>
                  <div className="conversation-icon">✦</div>
                  <div>
                    <h3>{conversation.title}</h3>
                    <p>{new Date(conversation.updatedAt).toLocaleString('zh-CN')}</p>
                  </div>
                  <span className="arrow">→</span>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
