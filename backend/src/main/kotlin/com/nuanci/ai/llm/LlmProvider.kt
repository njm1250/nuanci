package com.nuanci.ai.llm

import tools.jackson.databind.JsonNode

// 호출 한 번의 결말. 기록과 지표에서 이 값으로 가른다
enum class LlmOutcome { OK, BLOCKED, RATE_LIMITED, REJECTED, UNAVAILABLE, TRUNCATED, INVALID, OVER_BUDGET, OFF }

data class ProviderReply(
	val outcome: LlmOutcome,
	val json: JsonNode? = null,
	val model: String,
	val inputTokens: Int = 0,
	val outputTokens: Int = 0,
	val attempts: Int = 1,
)

// 모델 회사 하나와 말하는 어댑터. 재시도·안전 설정·응답 형식 강제처럼 회사마다 다른 것은 여기 안에서 끝낸다
interface LlmProvider {
	val enabled: Boolean
	fun generate(spec: PromptSpec, user: String, schema: Map<String, Any>): ProviderReply
}
