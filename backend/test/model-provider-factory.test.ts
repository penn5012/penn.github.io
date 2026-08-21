import assert from 'node:assert/strict'
import test from 'node:test'
import { AppError } from '../src/shared/http/app-error.js'
import {
  resolveModelProviderSelection,
  type ModelProviderSelection,
} from '../src/providers/model-provider-factory.js'

const serverDefaults = {
  provider: 'openai' as const,
  model: 'gpt-5.4-nano',
}
const retiredGeminiModel = ['gemini-3', '7-flash'].join('.')

const providerDefaults: ReadonlyArray<Required<ModelProviderSelection>> = [
  { provider: 'openai', model: 'gpt-5.4-nano' },
  { provider: 'deepseek', model: 'deepseek-chat' },
  { provider: 'gemini', model: 'gemini-3.5-flash-lite' },
]

for (const expected of providerDefaults) {
  test(`provider-only selection defaults ${expected.provider} to ${expected.model}`, () => {
    assert.deepEqual(
      resolveModelProviderSelection(serverDefaults, {
        provider: expected.provider,
      }),
      expected,
    )
  })
}

test('an omitted provider and model preserve the server defaults', () => {
  assert.deepEqual(
    resolveModelProviderSelection(serverDefaults),
    serverDefaults,
  )
})

test('the retired Gemini model is rejected explicitly', () => {
  assert.throws(
    () =>
      resolveModelProviderSelection(serverDefaults, {
        provider: 'gemini',
        model: retiredGeminiModel,
      }),
    (error: unknown) => {
      assert.ok(error instanceof AppError)
      assert.equal(error.statusCode, 400)
      assert.equal(error.code, 'MODEL_SELECTION_UNSUPPORTED')
      return true
    },
  )
})
