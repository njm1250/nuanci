package com.nuanci.ai.llm

// 프롬프트 하나의 정의. 무엇을 시키는지(system), 어떤 모델 등급으로, 출력은 얼마나, 안전 기준은 어떻게인지를 한곳에 둔다.
// 버전은 호출 기록(ai_call)에 같이 남아서, 프롬프트를 고친 뒤 결과가 달라졌는지 기록으로 가를 수 있다
data class PromptSpec(
	val feature: String,
	val version: String,
	val tier: ModelTier,
	val system: String,
	val maxTokens: Int,
	val safety: Map<HarmCategory, Threshold> = DEFAULT_SAFETY,
)

// LITE는 고르기처럼 짧은 판단, STANDARD는 말투를 읽고 한 줄을 쓰는 일
enum class ModelTier { LITE, STANDARD }

enum class HarmCategory(val api: String) {
	HARASSMENT("HARM_CATEGORY_HARASSMENT"),
	HATE("HARM_CATEGORY_HATE_SPEECH"),
	SEXUAL("HARM_CATEGORY_SEXUALLY_EXPLICIT"),
	DANGEROUS("HARM_CATEGORY_DANGEROUS_CONTENT"),
}

enum class Threshold(val api: String) { NONE("BLOCK_NONE"), HIGH("BLOCK_ONLY_HIGH"), MEDIUM("BLOCK_MEDIUM_AND_ABOVE"), LOW("BLOCK_LOW_AND_ABOVE") }

// 일상 욕설("oh shit", "fuck you man")은 대화의 재미라서 막지 않는다. 혐오·차별은 낮은 확률부터 막는다.
// 성적 표현은 중간부터 막는다. 낮게 두면 "fuck yeah" 같은 일상 욕설까지 성적 표현으로 걸린다. 그 사이는 모델이 too_far로 한 번 더 거른다
val DEFAULT_SAFETY = mapOf(
	HarmCategory.HARASSMENT to Threshold.NONE,
	HarmCategory.HATE to Threshold.LOW,
	HarmCategory.SEXUAL to Threshold.MEDIUM,
	HarmCategory.DANGEROUS to Threshold.MEDIUM,
)
