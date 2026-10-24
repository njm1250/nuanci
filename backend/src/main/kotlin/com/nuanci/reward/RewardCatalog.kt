package com.nuanci.reward

// 보상을 얻는 조건. 맞혔는지는 조건에 넣지 않는다. 틀린 말을 골라 보는 것도 이 앱의 재미라서다
sealed interface Rule {
	// 서로 다른 장면을 N개 끝내면
	data class Milestone(val count: Int) : Rule

	// 특정 장면을 끝내면 그 장면의 물건을 기념품으로
	data class Scene(val sceneId: String) : Rule

	// 같은 장소의 장면을 모두 끝내면. group은 화면에 보이는 묶음 이름이다
	data class Bundle(val group: String, val sceneIds: List<String>) : Rule

	// 친구가 내 공유 링크로 장면을 끝내면 둘 다
	data object Share : Rule

	// 깜짝 상자에서만 나온다
	data object Box : Rule
}

// wear는 주인공이 쓰는 아이템(장면에도 나온다), room은 아지트에 놓는 물건.
// 쓰는 아이템은 slot(머리·얼굴·목)마다 하나씩 함께 쓸 수 있다. colors가 있으면 얻을 때 색을 고른다
data class RewardDef(val id: String, val name: String, val kind: String, val rule: Rule, val colors: List<String> = emptyList(), val slot: String? = null)

object RewardCatalog {
	private fun wear(id: String, name: String, slot: String, rule: Rule, vararg colors: String) = RewardDef(id, name, "wear", rule, colors.toList(), slot)

	private fun room(id: String, name: String, rule: Rule) = RewardDef(id, name, "room", rule)

	val ITEMS = listOf(
		wear("cap", "모자", "head", Rule.Milestone(1), "red", "blue", "yellow"),
		room("plant", "화분", Rule.Milestone(3)),
		wear("glasses", "동그란 안경", "face", Rule.Milestone(5), "yellow", "red", "black"),
		wear("headphones", "헤드폰", "head", Rule.Milestone(9), "blue", "red", "yellow"),
		wear("scarf", "목도리", "neck", Rule.Milestone(11), "red", "green", "yellow"),
		room("poster", "포스터", Rule.Milestone(12)),
		wear("cat-ears", "고양이 귀", "head", Rule.Milestone(14), "black", "pink", "yellow"),
		wear("sunglasses", "선글라스", "face", Rule.Milestone(17)),
		wear("crown", "왕관", "head", Rule.Milestone(20)),
		wear("bowtie", "나비넥타이", "neck", Rule.Milestone(22), "red", "yellow", "pink"),
		wear("beanie", "비니", "head", Rule.Milestone(26), "blue", "pink", "green"),
		wear("flower", "꽃 핀", "head", Rule.Milestone(30), "pink", "yellow", "red"),
		room("pudding", "푸딩", Rule.Scene("pudding")),
		room("fishbowl", "어항", Rule.Scene("elevator-stuck")),
		room("cake", "케이크", Rule.Scene("roommate-interrogation")),
		room("mic", "마이크", Rule.Scene("friday-karaoke")),
		room("gamepad", "게임패드", Rule.Scene("touch-grass")),
		room("dumbbell", "아령", Rule.Scene("gym-day-one")),
		room("ramen", "컵라면", Rule.Scene("two-am-store")),
		room("camera", "카메라", Rule.Scene("park-photo")),
		room("vase", "꽃병", Rule.Scene("blind-date")),
		room("mirror", "거울", Rule.Scene("haircut")),
		wear("badge", "사원증", "neck", Rule.Bundle("회사", listOf("file-request", "did-you-eat", "pop-quiz-panic", "ten-minutes-before-meeting", "boss-treats-dinner"))),
		room("coffee", "커피잔", Rule.Bundle("카페", listOf("cafe-to-go", "leaving-the-cafe"))),
		room("mirrorball", "미러볼", Rule.Bundle("노래방", listOf("karaoke-breakup", "friday-karaoke"))),
		room("frame", "사진 액자", Rule.Share),
		room("rug", "러그", Rule.Box),
		room("lamp", "스탠드", Rule.Box),
		room("trophy", "트로피", Rule.Box),
		room("clock", "벽시계", Rule.Box),
		room("guitar", "기타", Rule.Box),
		room("lights", "꼬마전구", Rule.Box),
		room("beanbag", "빈백", Rule.Box),
	)

	// 깜짝 상자가 열리는 장면 수. 상자에서는 아직 없는 물건만 나와서 꽝이 없다
	val BOXES = listOf(7, 15, 25, 35, 45)

	private val byId = ITEMS.associateBy { it.id }

	fun find(id: String) = byId[id]
}
