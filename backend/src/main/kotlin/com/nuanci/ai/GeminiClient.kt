package com.nuanci.ai

import com.nuanci.config.NuanciProperties
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import tools.jackson.databind.JsonNode
import tools.jackson.databind.json.JsonMapper
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.net.http.HttpTimeoutException
import java.time.Duration

// Gemini 구조화 응답 호출. 응답 형식은 프롬프트로 부탁하지 않고 responseSchema로 강제하고, temperature 0으로 같은 입력에 같은 답을 받는다.
// 실패는 갈라서 다룬다: 일시 오류(5xx·시간 초과)는 잠깐 쉬고 다시, 호출량 제한(429)과 요청 거부는 바로 포기, 출력이 잘리면 한도를 두 배로 한 번만 다시.
// 어떤 실패든 null을 돌려서 부르는 쪽이 "LLM 없이" 흐름으로 넘어가게 한다
@Component
class GeminiClient(private val props: NuanciProperties, private val mapper: JsonMapper) {
	private val log = LoggerFactory.getLogger(javaClass)
	private val http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build()

	val enabled get() = props.gemini.apiKey.isNotBlank()

	fun generate(system: String, user: String, schema: Map<String, Any>, maxTokens: Int = 256): JsonNode? {
		if (!enabled) return null
		var tokens = maxTokens
		var truncatedOnce = false
		var attempt = 0
		while (attempt <= props.gemini.maxRetries) {
			val res = try {
				http.send(request(system, user, schema, tokens), HttpResponse.BodyHandlers.ofString())
			} catch (e: HttpTimeoutException) {
				null
			} catch (e: java.io.IOException) {
				null
			}
			when {
				res == null || res.statusCode() >= 500 -> {
					attempt++
					if (attempt > props.gemini.maxRetries) break
					Thread.sleep(BACKOFF_MS * (1L shl (attempt - 1)))
					continue
				}
				res.statusCode() == 429 -> {
					log.warn("Gemini 호출량 제한")
					return null
				}
				res.statusCode() >= 400 -> {
					log.warn("Gemini 요청 거부 {}: {}", res.statusCode(), res.body().take(200))
					return null
				}
			}
			val body = mapper.readTree(res!!.body())
			val candidate = body.path("candidates").path(0)
			if (candidate.path("finishReason").asString("") == "MAX_TOKENS") {
				if (truncatedOnce) return null
				truncatedOnce = true
				tokens *= 2
				continue
			}
			val text = candidate.path("content").path("parts").path(0).path("text").asString("")
			if (text.isBlank()) return null
			return runCatching { mapper.readTree(text) }.getOrNull()
		}
		log.warn("Gemini 일시 오류가 이어져 포기")
		return null
	}

	private fun request(system: String, user: String, schema: Map<String, Any>, maxTokens: Int): HttpRequest {
		val body = mapOf(
			"systemInstruction" to mapOf("parts" to listOf(mapOf("text" to system))),
			"contents" to listOf(mapOf("role" to "user", "parts" to listOf(mapOf("text" to user)))),
			"generationConfig" to mapOf(
				"responseMimeType" to "application/json",
				"responseSchema" to schema,
				"temperature" to 0,
				"maxOutputTokens" to maxTokens,
			),
		)
		return HttpRequest.newBuilder(URI.create("$BASE/${props.gemini.model}:generateContent"))
			.timeout(Duration.ofMillis(props.gemini.timeoutMs))
			.header("Content-Type", "application/json")
			.header("x-goog-api-key", props.gemini.apiKey)
			.POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)))
			.build()
	}

	companion object {
		const val BASE = "https://generativelanguage.googleapis.com/v1beta/models"
		const val BACKOFF_MS = 300L
	}
}
