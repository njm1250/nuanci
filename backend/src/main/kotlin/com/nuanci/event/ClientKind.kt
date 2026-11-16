package com.nuanci.event

// 이벤트를 보낸 기기 종류. 검색 크롤러·링크 미리보기·자동화 브라우저는 bot으로 나눠 이용 지표에서 뺀다.
// User-Agent가 아예 없으면 판단할 근거가 없어서 bot이 아니라 unknown으로 둔다.
// 스스로 봇이라고 밝힌 것 말고도, 실제 브라우저라면 보낼 수 없는 조합(지운 버전 숫자, 출처와 맞지 않는 경로)을 봇으로 본다
object ClientKind {
	const val BOT = "bot"
	private val bot = Regex("(?i)bot\\b|bot/|crawl|spider|slurp|headless|lighthouse|preview|scrap|facebookexternalhit|meta-external|webindexer|embedly|yeti|daumoa|inspectiontool|python-requests|curl/|wget|okhttp|httpclient|java/")
	private val inApp = Regex("(?i)kakaotalk|instagram|fban|fbav|line/|naver\\(inapp|everytime|daumapps|barcelona|threads")

	// Chrome은 113부터 모든 요청에서 부 버전을 0.0.0으로 지운다. 앱이 직접 만드는 WebView·인앱·Electron 문자열은 예외라 빼고 본다
	private val fullChrome = Regex("Chrome/\\d+\\.(\\d+)\\.(\\d+)\\.(\\d+)")
	private val customShell = Regex("(?i); wv\\)|electron")

	// 인스타·스레드 링크(utm)로 왔는데 페이스북을 거쳐 들어오고 인스타·스레드 앱도 아닌 방문. 메타가 링크를 검사하러 보내는 방문이다
	private val metaSources = setOf("instagram", "threads")
	private val metaApp = Regex("(?i)instagram|barcelona")

	fun of(userAgent: String?, automated: Boolean, utmSource: String? = null, referrer: String? = null): String = when {
		automated -> BOT
		userAgent.isNullOrBlank() -> "unknown"
		bot.containsMatchIn(userAgent) -> BOT
		spoofedChrome(userAgent) -> BOT
		metaLinkCheck(userAgent, utmSource, referrer) -> BOT
		inApp.containsMatchIn(userAgent) -> "inapp"
		else -> "browser"
	}

	private fun spoofedChrome(ua: String): Boolean {
		if (customShell.containsMatchIn(ua) || inApp.containsMatchIn(ua)) return false
		val v = fullChrome.find(ua)?.groupValues ?: return false
		return v.drop(1).any { it != "0" }
	}

	private fun metaLinkCheck(ua: String, utmSource: String?, referrer: String?) =
		utmSource?.lowercase() in metaSources && referrer?.lowercase()?.contains("facebook.com") == true && !metaApp.containsMatchIn(ua)
}
