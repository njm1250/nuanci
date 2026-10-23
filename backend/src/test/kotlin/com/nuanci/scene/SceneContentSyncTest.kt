package com.nuanci.scene

import com.nuanci.TestcontainersConfiguration
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import
import org.springframework.transaction.annotation.Transactional
import java.nio.file.Files
import java.nio.file.Path
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

@SpringBootTest
@Import(TestcontainersConfiguration::class)
@Transactional
class SceneContentSyncTest {
	@Autowired lateinit var sync: SceneContentSync
	@Autowired lateinit var scenes: SceneRepository

	private val contentDir: Path = Path.of("../content/scenes")

	@Test
	fun `시작할 때 콘텐츠 폴더의 장면이 버전 1로 들어간다`() {
		val published = scenes.findAllByStatusOrderBySortOrder(SceneStatus.PUBLISHED)
		assertEquals(listOf("eat-a-lot", "file-request"), published.map { it.id })
		assertTrue(published.all { it.currentVersion == 1 })
	}

	@Test
	fun `내용이 같으면 새 버전을 만들지 않는다`() {
		val result = sync.sync(contentDir)
		assertEquals(SyncResult(emptyList(), emptyList(), emptyList()), result)
	}

	@Test
	fun `내용이 바뀐 장면만 새 버전이 되고 파일이 없어진 장면은 숨겨진다`(@TempDir dir: Path) {
		val original = Files.readString(contentDir.resolve("eat-a-lot.json"))
		Files.writeString(dir.resolve("eat-a-lot.json"), original.replace("\"많이 먹어\"", "\"많이 먹어 (수정)\""))

		val result = sync.sync(dir)

		assertEquals(listOf("eat-a-lot"), result.updated)
		assertEquals(listOf("file-request"), result.hidden)
		val scene = scenes.findById("eat-a-lot").orElseThrow()
		assertEquals(2, scene.currentVersion)
		assertEquals("많이 먹어 (수정)", scene.title)
	}

	@Test
	fun `id와 파일 이름이 다르면 거부한다`(@TempDir dir: Path) {
		Files.writeString(dir.resolve("wrong-name.json"), Files.readString(contentDir.resolve("eat-a-lot.json")))
		assertFailsWith<IllegalArgumentException> { sync.sync(dir) }
	}

	@Test
	fun `파일끼리 number가 겹치면 거부한다`(@TempDir dir: Path) {
		Files.copy(contentDir.resolve("eat-a-lot.json"), dir.resolve("eat-a-lot.json"))
		val other = Files.readString(contentDir.resolve("file-request.json")).replace("\"number\": 1,", "\"number\": 9,")
		Files.writeString(dir.resolve("file-request.json"), other)
		assertFailsWith<IllegalArgumentException> { sync.sync(dir) }
	}

	@Test
	fun `다른 장면이 이미 쓰는 number를 쓰면 거부한다`(@TempDir dir: Path) {
		val renamed = Files.readString(contentDir.resolve("file-request.json")).replace("\"id\": \"file-request\"", "\"id\": \"file-request-new\"")
		Files.writeString(dir.resolve("file-request-new.json"), renamed)
		Files.copy(contentDir.resolve("eat-a-lot.json"), dir.resolve("eat-a-lot.json"))
		assertFailsWith<IllegalArgumentException> { sync.sync(dir) }
	}
}
