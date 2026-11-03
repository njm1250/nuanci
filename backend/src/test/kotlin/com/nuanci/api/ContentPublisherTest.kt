package com.nuanci.api

import com.nuanci.CONTENT_DIR
import com.nuanci.TestcontainersConfiguration
import com.nuanci.loadFixtures
import com.nuanci.scene.ContentPublisher
import com.nuanci.scene.ContentStore
import com.nuanci.scene.Pointer
import com.nuanci.scene.SceneCatalog
import com.nuanci.scene.SceneStore
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.context.TestConfiguration
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Import
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.transaction.annotation.Transactional
import tools.jackson.databind.json.JsonMapper
import tools.jackson.databind.node.ObjectNode
import java.nio.file.Files
import kotlin.test.assertEquals
import kotlin.test.assertTrue

// 저장소 대신 메모리에 쓰는 가짜. 포인터는 S3처럼 etag 조건부로만 바뀐다
class FakeContentStore : ContentStore {
	val files = linkedMapOf<String, String>()
	val puts = mutableListOf<String>()
	var pointer: Pointer? = null
	var conflictsLeft = 0
	private var tag = 0

	override fun putImmutable(key: String, json: String) {
		puts += key
		files[key] = json
	}

	override fun readPointer() = pointer

	override fun putPointer(json: String, expected: String?): Boolean {
		if (conflictsLeft > 0) {
			conflictsLeft--
			return false
		}
		if (pointer?.etag != expected) return false
		pointer = Pointer("e${++tag}", json)
		return true
	}

	fun reset() {
		files.clear()
		puts.clear()
		pointer = null
		conflictsLeft = 0
	}
}

@SpringBootTest
@Import(TestcontainersConfiguration::class, ContentPublisherTest.Store::class)
@Transactional
class ContentPublisherTest {
	@TestConfiguration
	class Store {
		@Bean
		fun contentStore() = FakeContentStore()
	}

	@Autowired lateinit var publisher: ContentPublisher
	@Autowired lateinit var fake: FakeContentStore
	@Autowired lateinit var store: SceneStore
	@Autowired lateinit var catalog: SceneCatalog
	@Autowired lateinit var mapper: JsonMapper
	@Autowired lateinit var jdbc: JdbcClient

	@BeforeEach
	fun seed() {
		fake.reset()
		catalog.forget()
		store.loadFixtures(mapper)
	}

	private fun release() = mapper.readTree(fake.pointer!!.body)

	private fun edit(id: String, note: String) {
		val scene = mapper.readTree(Files.readString(CONTENT_DIR.resolve("$id.json"))) as ObjectNode
		store.save(scene.put("discovery", "${scene.path("discovery").asString()} $note"))
	}

	private fun pendingJobs() = jdbc.sql("select count(*) from content_publish_job where done_at is null").query(Int::class.java).single()

	@Test
	fun `장면을 저장하면 같은 트랜잭션에 발행 작업이 남고, 발행하면 파일을 올린 뒤 마지막에 포인터를 바꾼다`() {
		assertTrue(pendingJobs() > 0)
		assertTrue(publisher.publishPending())

		assertEquals(0, pendingJobs())
		assertEquals(catalog.current().hash, release().path("manifest").asString())
		// 목차가 가리키는 장면과 화면 데이터가 목차보다 먼저 올라가 있다
		val manifestAt = fake.puts.indexOfFirst { it.startsWith("manifests/") }
		assertTrue(fake.puts.take(manifestAt).any { it.startsWith("scenes/") })
		assertTrue(fake.puts.take(manifestAt).any { it.startsWith("views/") })
	}

	@Test
	fun `장면 하나를 고치면 새로 생긴 주소만 올린다`() {
		publisher.publishPending()
		fake.puts.clear()

		edit("pudding", "다시 올리기.")
		publisher.publishPending()

		// 고친 장면 본문, 표현 모음, 목차. 나머지 장면은 이미 올라가 있어서 다시 올리지 않는다
		assertTrue(fake.puts.count { it.startsWith("scenes/") } == 1)
		assertTrue(fake.puts.count { it.startsWith("manifests/") } == 1)
		assertTrue(fake.puts.size <= 3)
	}

	@Test
	fun `저장소에 더 새 릴리스가 있으면 늦게 끝난 발행이 포인터를 되돌리지 않는다`() {
		fake.pointer = Pointer("newer", """{"release":${Long.MAX_VALUE},"manifest":"newer"}""")
		assertTrue(publisher.publishPending())
		assertEquals("newer", release().path("manifest").asString())
		assertEquals(0, pendingJobs())
	}

	@Test
	fun `포인터 쓰기가 겹치면 다시 읽고 다시 시도한다`() {
		fake.conflictsLeft = 2
		assertTrue(publisher.publishPending())
		assertEquals(catalog.current().hash, release().path("manifest").asString())
	}
}
