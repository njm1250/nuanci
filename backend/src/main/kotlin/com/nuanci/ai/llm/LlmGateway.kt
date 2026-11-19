package com.nuanci.ai.llm

import com.nuanci.config.NuanciProperties
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Service
import java.time.LocalDate
import java.time.ZoneId
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicInteger

// 기능 코드가 LLM을 부르는 유일한 문. 기능마다 하루 예산을 세고, 호출마다 결말·시간·토큰·프롬프트 버전을 ai_call에 남긴다.
// 기능 쪽은 모델 회사도, 재시도도, 기록도 모른 채 "이 프롬프트로 이 입력을" 부탁하고 결말만 받는다
@Service
class LlmGateway(private val provider: LlmProvider, private val props: NuanciProperties, private val jdbc: JdbcClient) {
	private val day = ConcurrentHashMap<String, Pair<LocalDate, AtomicInteger>>()

	fun call(spec: PromptSpec, user: String, schema: Map<String, Any>, visitorId: UUID?, sceneId: String?): ProviderReply {
		val started = System.nanoTime()
		val reply = when {
			!provider.enabled -> ProviderReply(LlmOutcome.OFF, model = "")
			!spend(spec.feature) -> ProviderReply(LlmOutcome.OVER_BUDGET, model = "")
			else -> provider.generate(spec, user, schema)
		}
		val ms = ((System.nanoTime() - started) / 1_000_000).toInt()
		runCatching {
			jdbc.sql(
				"""
				insert into ai_call (feature, prompt_version, model, outcome, latency_ms, input_tokens, output_tokens, attempts, visitor_id, scene_id)
				values (:f, :v, :m, :o, :ms, :i, :out, :a, :vis, :s)
				""",
			).param("f", spec.feature).param("v", spec.version).param("m", reply.model).param("o", reply.outcome.name.lowercase())
				.param("ms", ms).param("i", reply.inputTokens).param("out", reply.outputTokens).param("a", reply.attempts)
				.param("vis", visitorId).param("s", sceneId).update()
		}
		return reply
	}

	private fun spend(feature: String): Boolean {
		val today = LocalDate.now(SEOUL)
		val (date, count) = day.compute(feature) { _, v -> if (v == null || v.first != today) today to AtomicInteger() else v }!!
		return date == today && count.incrementAndGet() <= props.gemini.dailyLimit
	}

	companion object {
		val SEOUL: ZoneId = ZoneId.of("Asia/Seoul")
	}
}
