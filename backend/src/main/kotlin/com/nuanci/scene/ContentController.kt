package com.nuanci.scene

import org.springframework.http.CacheControl
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.concurrent.TimeUnit

// 해시 주소로 공개 장면을 내보내는 읽기 전용 API. 목차와 장면은 내용이 바뀌면 주소가 바뀌므로 영구 캐시로 내보내고, current만 매번 확인하게 한다
@RestController
@RequestMapping("/api/content")
class ContentController(private val catalog: SceneCatalog) {
	@GetMapping("/current")
	fun current(@RequestHeader(HttpHeaders.IF_NONE_MATCH, required = false) etag: String?): ResponseEntity<Map<String, String>> {
		val hash = catalog.current().hash
		val tag = "\"$hash\""
		val head = ResponseEntity.status(if (etag == tag) HttpStatus.NOT_MODIFIED else HttpStatus.OK).eTag(tag).cacheControl(CacheControl.noCache())
		return if (etag == tag) head.build() else head.body(mapOf("manifest" to hash))
	}

	@GetMapping("/manifests/{hash}")
	fun manifest(@PathVariable hash: String): ResponseEntity<String> {
		val current = catalog.current()
		return if (current.hash == hash) immutable(current.manifest) else ResponseEntity.notFound().build()
	}

	@GetMapping("/objects/{hash}")
	fun scene(@PathVariable hash: String): ResponseEntity<String> =
		catalog.current().objects[hash]?.let(::immutable) ?: ResponseEntity.notFound().build()

	private fun immutable(json: String) =
		ResponseEntity.ok().cacheControl(CacheControl.maxAge(365, TimeUnit.DAYS).cachePublic().immutable()).contentType(MediaType.APPLICATION_JSON).body(json)
}
