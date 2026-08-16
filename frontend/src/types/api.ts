// Shared response types defined by docs/api/openapi.yaml.
export type Conversation = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

export type HealthResponse = {
  status: 'ok'
  service: string
  timestamp: string
}
