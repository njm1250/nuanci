package com.nuanci.event

// 이벤트를 보낸 기기 종류. 검색 크롤러·링크 미리보기·자동화 브라우저는 bot으로 나눠 이용 지표에서 뺀다.
// User-Agent가 아예 없으면 판단할 근거가 없어서 bot이 아니라 unknown으로 둔다
object ClientKind {
	const val BOT = "bot"
	private val bot = Regex("(?i)bot\\b|bot/|crawl|spider|slurp|headless|lighthouse|preview|scrap|facebookexternalhit|embedly|yeti|daumoa|inspectiontool|python-requests|curl/|wget|okhttp|httpclient|java/")
	private val inApp = Regex("(?i)kakaotalk|instagram|fban|fbav|line/|naver\\(inapp|everytime|daumapps|barcelona|threads")

	fun of(userAgent: String?, automated: Boolean): String = when {
		automated -> BOT
		userAgent.isNullOrBlank() -> "unknown"
		bot.containsMatchIn(userAgent) -> BOT
		inApp.containsMatchIn(userAgent) -> "inapp"
		else -> "browser"
	}
}
