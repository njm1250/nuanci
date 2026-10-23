package com.nuanci

import com.nuanci.scene.SceneStore
import tools.jackson.databind.json.JsonMapper
import java.nio.file.Files
import java.nio.file.Path
import kotlin.io.path.listDirectoryEntries

val CONTENT_DIR: Path = Path.of("../content/scenes")

// 레포의 장면 JSON을 테스트 DB에 넣는다. 각 테스트는 트랜잭션이라 끝나면 되돌아간다
fun SceneStore.loadFixtures(mapper: JsonMapper) {
	CONTENT_DIR.listDirectoryEntries("*.json").sorted().forEach { save(mapper.readTree(Files.readString(it))) }
}
