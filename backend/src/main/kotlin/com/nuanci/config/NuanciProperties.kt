package com.nuanci.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties("nuanci")
data class NuanciProperties(
	val adminId: String = "admin",
	val adminPassword: String = "",
	// 구글 로그인. 클라이언트 id가 비어 있으면 로그인 버튼을 숨긴다
	val googleClientId: String = "",
	val googleClientSecret: String = "",
	// 사용자가 보는 사이트 주소. 로그인 뒤 돌아갈 곳과 구글에 등록한 리디렉션 주소의 기준이다
	val siteUrl: String = "http://localhost:3000",
	// 공개 장면을 내보내는 S3 버킷. 버킷이 비어 있으면 발행 작업은 쌓이기만 하고 올리지 않는다
	val content: ContentProperties = ContentProperties(),
	// 웹 푸시(VAPID) 키. 둘 중 하나라도 비어 있으면 알림을 받지도 보내지도 않는다
	val push: PushProperties = PushProperties(),
)

data class PushProperties(
	// X.509 공개 키와 PKCS#8 개인 키(base64url)
	val publicKey: String = "",
	val privateKey: String = "",
	val subject: String = "mailto:nuanci.contact@gmail.com",
) {
	val enabled get() = publicKey.isNotBlank() && privateKey.isNotBlank()
}

data class ContentProperties(
	val bucket: String = "",
	val region: String = "ap-northeast-2",
	// 같은 버킷을 운영(prod)과 로컬(dev)이 나눠 쓴다
	val prefix: String = "dev",
	val accessKey: String = "",
	val secretKey: String = "",
)
