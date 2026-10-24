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
)
