package com.nuanci.scene

import com.nuanci.config.NuanciProperties
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression
import org.springframework.stereotype.Component
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider
import software.amazon.awssdk.core.sync.RequestBody
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.model.GetObjectRequest
import software.amazon.awssdk.services.s3.model.NoSuchKeyException
import software.amazon.awssdk.services.s3.model.PutObjectRequest
import software.amazon.awssdk.services.s3.model.S3Exception

// 지금 목차를 가리키는 포인터 파일. etag는 조건부 쓰기에 쓴다
data class Pointer(val etag: String, val body: String)

// 공개 장면을 내보내는 저장소. 해시 주소 파일은 덮어쓰지 않고 쌓고, 포인터만 조건부로 바꾼다
interface ContentStore {
	fun putImmutable(key: String, json: String)

	fun readPointer(): Pointer?

	// expected가 있으면 그 etag일 때만, 없으면 포인터가 아직 없을 때만 쓴다. 조건이 맞지 않으면 false
	fun putPointer(json: String, expected: String?): Boolean
}

@Component
@ConditionalOnExpression("!'\${nuanci.content.bucket:}'.isEmpty()")
class S3ContentStore(properties: NuanciProperties) : ContentStore {
	private val config = properties.content
	private val s3 = S3Client.builder()
		.region(Region.of(config.region))
		.credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(config.accessKey, config.secretKey)))
		.build()

	private fun key(name: String) = "${config.prefix}/$name"

	override fun putImmutable(key: String, json: String) {
		s3.putObject(put(key).cacheControl("public, max-age=31536000, immutable").build(), RequestBody.fromString(json))
	}

	override fun readPointer(): Pointer? =
		try {
			s3.getObjectAsBytes(GetObjectRequest.builder().bucket(config.bucket).key(key(POINTER)).build()).let { Pointer(it.response().eTag(), it.asUtf8String()) }
		} catch (_: NoSuchKeyException) {
			null
		}

	override fun putPointer(json: String, expected: String?): Boolean {
		val request = put(POINTER).cacheControl("public, max-age=30").let { if (expected == null) it.ifNoneMatch("*") else it.ifMatch(expected) }.build()
		return try {
			s3.putObject(request, RequestBody.fromString(json))
			true
		} catch (e: S3Exception) {
			// 412: 조건이 맞지 않음, 409: 같은 키에 쓰기가 겹침. 둘 다 다시 읽고 판단한다
			if (e.statusCode() == 412 || e.statusCode() == 409) false else throw e
		}
	}

	private fun put(name: String) = PutObjectRequest.builder().bucket(config.bucket).key(key(name)).contentType("application/json")

	companion object {
		const val POINTER = "current.json"
	}
}
