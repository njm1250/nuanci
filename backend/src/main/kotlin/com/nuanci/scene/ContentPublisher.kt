package com.nuanci.scene

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.ObjectProvider
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.scheduling.annotation.EnableScheduling
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import tools.jackson.databind.json.JsonMapper

// 쌓인 발행 작업을 저장소에 올린다. 새로 생긴 해시 주소 파일을 먼저 올리고 목차를 올린 뒤, 마지막에 포인터를 바꾼다.
// 포인터에는 작업 번호를 릴리스 번호로 적고, 저장소의 포인터가 이미 더 새 릴리스면 덮지 않는다. 늦게 끝난 옛 발행이 새 발행을 되돌리지 못하게 하려는 것이다
@Service
class ContentPublisher(
	private val catalog: SceneCatalog,
	private val jdbc: JdbcClient,
	private val mapper: JsonMapper,
	private val stores: ObjectProvider<ContentStore>,
) {
	@Transactional
	fun publishPending(): Boolean {
		val store = stores.ifAvailable ?: return false
		// 쌓인 작업 중 가장 최근 것 하나만 하면 된다. 다른 서버가 하는 중이면 건너뛴다
		val job = jdbc.sql("select id from content_publish_job where done_at is null order by id desc limit 1 for update skip locked")
			.query(Long::class.java).optional().orElse(null) ?: return false
		val current = catalog.current()

		val pending = jdbc.sql("select hash, kind, content from published_content where uploaded_at is null")
			.query { rs, _ -> Triple(rs.getString("hash"), rs.getString("kind"), rs.getString("content")) }.list()
			.sortedBy { KIND_ORDER.indexOf(it.second) }
		for ((hash, kind, content) in pending) store.putImmutable("${FOLDERS.getValue(kind)}/$hash.json", content)
		if (pending.isNotEmpty()) {
			jdbc.sql("update published_content set uploaded_at = now() where hash in (:hashes)").param("hashes", pending.map { it.first }).update()
		}

		val pointer = mapper.writeValueAsString(mapOf("release" to job, "manifest" to current.hash))
		repeat(POINTER_TRIES) {
			val existing = store.readPointer()
			val release = existing?.let { mapper.readTree(it.body).path("release").asLong(0) } ?: 0
			if (release >= job || store.putPointer(pointer, existing?.etag)) {
				jdbc.sql("update content_publish_job set done_at = now() where id <= :job and done_at is null").param("job", job).update()
				return true
			}
		}
		error("포인터를 ${POINTER_TRIES}번 시도했지만 바꾸지 못했어요")
	}

	companion object {
		private const val POINTER_TRIES = 3
		// 목차가 가리키는 파일이 먼저 올라가 있어야 하므로 장면과 화면 데이터를 먼저 올린다
		private val KIND_ORDER = listOf("scene", "view", "manifest")
		private val FOLDERS = mapOf("scene" to "scenes", "view" to "views", "manifest" to "manifests")
	}
}

// 저장소가 설정된 서버에서만 5초마다 발행 작업을 확인한다. 실패한 작업은 남아 있다가 다음에 다시 시도한다
@Component
@EnableScheduling
@ConditionalOnBean(ContentStore::class)
class ContentPublishSchedule(private val publisher: ContentPublisher) {
	private val log = LoggerFactory.getLogger(javaClass)

	@Scheduled(fixedDelay = 5000, initialDelay = 5000)
	fun run() {
		try {
			publisher.publishPending()
		} catch (e: Exception) {
			log.warn("장면 발행에 실패했어요. 다음에 다시 시도해요", e)
		}
	}
}
