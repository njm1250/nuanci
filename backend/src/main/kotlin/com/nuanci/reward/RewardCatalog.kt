package com.nuanci.reward

// 보상을 얻는 조건. 맞혔는지는 조건에 넣지 않는다. 틀린 말을 골라 보는 것도 이 앱의 재미라서다
sealed interface Rule {
	// 서로 다른 장면을 N개 끝내면
	data class Milestone(val count: Int) : Rule

	// 특정 장면을 끝내면 그 장면의 물건을 기념품으로
	data class Scene(val sceneId: String) : Rule

	// 친구가 내 공유 링크로 장면을 끝내면 둘 다
	data object Share : Rule

	// 깜짝 상자에서만 나온다
	data object Box : Rule
}

// wear는 주인공이 쓰는 아이템(장면에도 나온다), room은 아지트에 놓는 물건. colors가 있으면 얻을 때 색을 고른다
data class RewardDef(val id: String, val name: String, val kind: String, val rule: Rule, val colors: List<String> = emptyList())

object RewardCatalog {
	private val COLORS = listOf("red", "blue", "yellow")

	val ITEMS = listOf(
		RewardDef("cap", "모자", "wear", Rule.Milestone(1), COLORS),
		RewardDef("plant", "화분", "room", Rule.Milestone(3)),
		RewardDef("glasses", "동그란 안경", "wear", Rule.Milestone(5), COLORS),
		RewardDef("headphones", "헤드폰", "wear", Rule.Milestone(9), COLORS),
		RewardDef("poster", "포스터", "room", Rule.Milestone(12)),
		RewardDef("crown", "왕관", "wear", Rule.Milestone(20)),
		RewardDef("pudding", "푸딩", "room", Rule.Scene("pudding")),
		RewardDef("fishbowl", "어항", "room", Rule.Scene("elevator-stuck")),
		RewardDef("cake", "케이크", "room", Rule.Scene("roommate-interrogation")),
		RewardDef("mic", "마이크", "room", Rule.Scene("friday-karaoke")),
		RewardDef("frame", "사진 액자", "room", Rule.Share),
		RewardDef("rug", "러그", "room", Rule.Box),
		RewardDef("lamp", "스탠드", "room", Rule.Box),
		RewardDef("trophy", "트로피", "room", Rule.Box),
		RewardDef("clock", "벽시계", "room", Rule.Box),
	)

	// 깜짝 상자가 열리는 장면 수. 상자에서는 아직 없는 물건만 나와서 꽝이 없다
	val BOXES = listOf(7, 15, 25, 35)

	private val byId = ITEMS.associateBy { it.id }

	fun find(id: String) = byId[id]
}
