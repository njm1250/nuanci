package com.nuanci.account

import com.nuanci.config.NuanciProperties
import org.springframework.http.MediaType
import org.springframework.stereotype.Component
import org.springframework.util.LinkedMultiValueMap
import org.springframework.web.client.RestClient
import org.springframework.web.util.UriComponentsBuilder

data class GoogleProfile(val sub: String, val email: String?, val name: String?, val picture: String?)

interface GoogleClient {
	fun authorizeUrl(state: String): String

	fun profile(code: String): GoogleProfile
}

// 구글 OAuth 인가 코드 흐름. 코드를 토큰으로 바꾼 뒤 사용자 정보 API에서 계정 정보를 읽는다
@Component
class HttpGoogleClient(private val props: NuanciProperties) : GoogleClient {
	private val http = RestClient.create()
	private val redirectUri get() = "${props.siteUrl}/api/auth/google/callback"

	override fun authorizeUrl(state: String): String =
		UriComponentsBuilder.fromUriString("https://accounts.google.com/o/oauth2/v2/auth")
			.queryParam("client_id", props.googleClientId)
			.queryParam("redirect_uri", redirectUri)
			.queryParam("response_type", "code")
			.queryParam("scope", "openid email profile")
			.queryParam("state", state)
			.queryParam("prompt", "select_account")
			.encode()
			.toUriString()

	override fun profile(code: String): GoogleProfile {
		val form = LinkedMultiValueMap<String, String>().apply {
			add("code", code)
			add("client_id", props.googleClientId)
			add("client_secret", props.googleClientSecret)
			add("redirect_uri", redirectUri)
			add("grant_type", "authorization_code")
		}
		val token = http.post().uri("https://oauth2.googleapis.com/token")
			.contentType(MediaType.APPLICATION_FORM_URLENCODED)
			.body(form)
			.retrieve()
			.body(Map::class.java)
			?.get("access_token") as? String ?: error("구글 토큰을 받지 못했어요")
		val info = http.get().uri("https://openidconnect.googleapis.com/v1/userinfo")
			.header("Authorization", "Bearer $token")
			.retrieve()
			.body(Map::class.java) ?: error("구글 계정 정보를 받지 못했어요")
		return GoogleProfile(info["sub"] as String, info["email"] as? String, info["name"] as? String, info["picture"] as? String)
	}
}
