package com.nuanci

import com.nuanci.scene.SceneRepository
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import
import kotlin.test.assertEquals

@SpringBootTest(properties = ["nuanci.admin-password=$TEST_ADMIN_PASSWORD"])
@Import(TestcontainersConfiguration::class)
class NuanciApplicationTests {
	@Autowired lateinit var scenes: SceneRepository

	@Test
	fun `서버가 떠도 장면 파일을 읽어 DB에 넣지 않는다`() {
		assertEquals(0, scenes.count())
	}
}
