package com.nuanci.ai.llm

import com.nuanci.config.NuanciProperties
import org.springframework.stereotype.Component
import tools.jackson.databind.JsonNode
import tools.jackson.databind.json.JsonMapper
import java.io.IOException
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.time.Duration

// Gemini 어댑터. 응답 형식은 프롬프트로 부탁하지 않고 responseSchema로 강제하고, temperature 0으로 같은 입력에 같은 답을 받는다.
// 실패는 갈라서 다룬다: 일시 오류(5xx·시간 초과·연결 실패)는 잠깐 쉬고 다시, 호출량 제한(429)과 요청 거부(4xx)는 바로 포기,
// 출력이 잘리면 한도를 두 배로 한 번만 다시, 안전 기준에 걸리면 BLOCKED. 어떤 결말이든 예외 대신 ProviderReply로 돌려준다
@Component
class GeminiProvider(private val props: NuanciProperties, private val mapper: JsonMapper) : LlmProvider {
	private val http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build()

	override val enabled get() = props.gemini.apiKey.isNotBlank()

	private fun modelOf(tier: ModelTier) = if (tier == ModelTier.LITE) props.gemini.model else props.gemini.reactModel

	override fun generate(spec: PromptSpec, user: String, schema: Map<String, Any>): ProviderReply {
		val model = modelOf(spec.tier)
		if (!enabled) return ProviderReply(LlmOutcome.OFF, model = model)
		var tokens = spec.maxTokens
		var truncatedOnce = false
		var attempts = 0
		var transient = 0
		while (true) {
			attempts++
			val res = try {
				http.send(request(model, spec, user, schema, tokens), HttpResponse.BodyHandlers.ofString())
			} catch (e: IOException) {
				null
			}
			if (res == null || res.statusCode() >= 500) {
				if (++transient > props.gemini.maxRetries) return ProviderReply(LlmOutcome.UNAVAILABLE, model = model, attempts = attempts)
				Thread.sleep(BACKOFF_MS shl (transient - 1))
				continue
			}
			if (res.statusCode() == 429) return ProviderReply(LlmOutcome.RATE_LIMITED, model = model, attempts = attempts)
			if (res.statusCode() >= 400) return ProviderReply(LlmOutcome.REJECTED, model = model, attempts = attempts)

			val body = mapper.readTree(res.body())
			val usage = body.path("usageMetadata")
			val inTok = usage.path("promptTokenCount").asInt(0)
			val outTok = usage.path("candidatesTokenCount").asInt(0)
			if (!body.path("promptFeedback").path("blockReason").isMissingNode) return ProviderReply(LlmOutcome.BLOCKED, model = model, inputTokens = inTok, attempts = attempts)
			val candidate = body.path("candidates").path(0)
			val finish = candidate.path("finishReason").asString("")
			if (finish in BLOCK_REASONS) return ProviderReply(LlmOutcome.BLOCKED, model = model, inputTokens = inTok, outputTokens = outTok, attempts = attempts)
			if (finish == "MAX_TOKENS") {
				if (truncatedOnce) return ProviderReply(LlmOutcome.TRUNCATED, model = model, inputTokens = inTok, outputTokens = outTok, attempts = attempts)
				truncatedOnce = true
				tokens *= 2
				continue
			}
			val text = candidate.path("content").path("parts").firstOrNull { it.has("text") && !it.path("thought").asBoolean(false) }?.path("text")?.asString("").orEmpty()
			val json: JsonNode? = runCatching { mapper.readTree(text) }.getOrNull()?.takeIf { it.isObject }
			return ProviderReply(if (json == null) LlmOutcome.INVALID else LlmOutcome.OK, json, model, inTok, outTok, attempts)
		}
	}

	private fun request(model: String, spec: PromptSpec, user: String, schema: Map<String, Any>, maxTokens: Int): HttpRequest {
		val body = mapOf(
			"systemInstruction" to mapOf("parts" to listOf(mapOf("text" to spec.system))),
			"contents" to listOf(mapOf("role" to "user", "parts" to listOf(mapOf("text" to user)))),
			"safetySettings" to spec.safety.map { (c, t) -> mapOf("category" to c.api, "threshold" to t.api) },
			"generationConfig" to mapOf(
				"responseMimeType" to "application/json",
				"responseSchema" to schema,
				"temperature" to 0,
				"maxOutputTokens" to maxTokens,
			),
		)
		return HttpRequest.newBuilder(URI.create("$BASE/$model:generateContent"))
			.timeout(Duration.ofMillis(props.gemini.timeoutMs))
			.header("Content-Type", "application/json")
			.header("x-goog-api-key", props.gemini.apiKey)
			.POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)))
			.build()
	}

	companion object {
		const val BASE = "https://generativelanguage.googleapis.com/v1beta/models"
		const val BACKOFF_MS = 300L
		val BLOCK_REASONS = setOf("SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "SPII")
	}
}
