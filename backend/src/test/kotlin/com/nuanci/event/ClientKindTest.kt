package com.nuanci.event

import org.junit.jupiter.api.Test
import kotlin.test.assertEquals

// 운영에 실제로 들어온 문자열로 확인한다. 반응한 사람의 문자열이 봇으로 잘못 걸리지 않는 것이 가장 중요하다
class ClientKindTest {
	private val chromeNow = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36"
	private val iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0.1 Mobile/15E148 Safari/604.1"
	private val fbWebView = "Mozilla/5.0 (Linux; Android 12; STG-LX1 Build/HUAWEISTG-LX1; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/114.0.5735.196 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/562.0.0.53.83;]"
	private val igApp = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 400.0.0.0.0"

	@Test
	fun `지금 Chrome과 아이폰 사파리는 사람으로 둔다`() {
		assertEquals("browser", ClientKind.of(chromeNow, false))
		assertEquals("browser", ClientKind.of(iphone, false, "instagram", null))
	}

	@Test
	fun `부 버전이 남은 Chrome은 봇이다`() =
		assertEquals("bot", ClientKind.of("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.60 Safari/537.36", false))

	@Test
	fun `앱이 만든 WebView 문자열은 부 버전이 있어도 인앱으로 둔다`() = assertEquals("inapp", ClientKind.of(fbWebView, false))

	@Test
	fun `인스타 링크인데 페이스북을 거쳐 온 방문은 봇이다`() {
		assertEquals("bot", ClientKind.of(chromeNow, false, "instagram", "facebook.com"))
		assertEquals("bot", ClientKind.of(fbWebView, false, "instagram", "m.facebook.com"))
	}

	@Test
	fun `인스타 앱에서 연 방문은 페이스북 경로여도 사람으로 둔다`() = assertEquals("inapp", ClientKind.of(igApp, false, "instagram", "facebook.com"))

	@Test
	fun `메타 크롤러 이름은 봇이다`() = assertEquals("bot", ClientKind.of("meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)", false))
}
