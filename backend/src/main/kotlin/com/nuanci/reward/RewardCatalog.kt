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
// 쓰는 아이템은 slot(머리 모양·머리·얼굴·목)마다 하나씩 함께 쓸 수 있다. 머리 모양 아이템은 주인공에 따라 모습과 이름이 달라서 화면이 하나를 골라 보여준다. colors가 있으면 얻을 때 색을 고른다
data class RewardDef(val id: String, val name: String, val kind: String, val rule: Rule, val colors: List<String> = emptyList(), val slot: String? = null)

object RewardCatalog {
	private fun wear(id: String, name: String, slot: String, rule: Rule, vararg colors: String) = RewardDef(id, name, "wear", rule, colors.toList(), slot)

	private fun room(id: String, name: String, rule: Rule) = RewardDef(id, name, "room", rule)

	// 받는 간격이 너무 촘촘하면 보상이 흔해져서, 장면 수 보상은 5~10장면마다, 장면 기념품은 기억에 남는 장면 몇 개에만 둔다.
	// 나머지 방 물건은 깜짝 상자에서 나온다
	val ITEMS = listOf(
		wear("cap", "모자", "head", Rule.Milestone(1), "red", "blue", "yellow"),
		wear("hair-1", "단발머리·덮은 머리", "hair", Rule.Milestone(3), "pink", "black", "yellow"),
		room("plant", "화분", Rule.Milestone(5)),
		wear("hair-2", "양갈래 머리·가르마 머리", "hair", Rule.Milestone(7), "yellow", "pink", "blue"),
		wear("glasses", "동그란 안경", "face", Rule.Milestone(10), "yellow", "red", "black"),
		wear("headphones", "헤드폰", "head", Rule.Milestone(15), "blue", "red", "yellow"),
		wear("hair-3", "리본 긴 머리·뽀글 파마", "hair", Rule.Milestone(18), "yellow", "black", "red"),
		room("poster", "포스터", Rule.Milestone(20)),
		wear("hair-4", "만두 머리·삐죽 머리", "hair", Rule.Milestone(25), "blue", "pink", "black"),
		wear("scarf", "목도리", "neck", Rule.Milestone(30), "red", "green", "yellow"),
		wear("hair-5", "옆으로 묶은 머리·울프컷", "hair", Rule.Milestone(35), "black", "red", "green"),
		wear("cat-ears", "고양이 귀", "head", Rule.Milestone(40), "black", "pink", "yellow"),
		wear("hair-6", "웨이브 머리·올림 머리", "hair", Rule.Milestone(45), "red", "pink", "yellow"),
		wear("crown", "왕관", "head", Rule.Milestone(50)),
		wear("sunglasses", "선글라스", "face", Rule.Milestone(60)),
		wear("bowtie", "나비넥타이", "neck", Rule.Milestone(70), "red", "yellow", "pink"),
		wear("beanie", "비니", "head", Rule.Milestone(80), "blue", "pink", "green"),
		wear("flower", "꽃 핀", "head", Rule.Milestone(100), "pink", "yellow", "red"),
		room("pudding", "푸딩", Rule.Scene("pudding")),
		room("fishbowl", "어항", Rule.Scene("elevator-stuck")),
		room("dumbbell", "아령", Rule.Scene("gym-day-one")),
		wear("badge", "사원증", "neck", Rule.Bundle("회사", listOf("file-request", "did-you-eat", "pop-quiz-panic", "ten-minutes-before-meeting", "boss-treats-dinner"))),
		room("mirrorball", "미러볼", Rule.Bundle("노래방", listOf("karaoke-breakup", "friday-karaoke"))),
		room("frame", "사진 액자", Rule.Share),
		room("rug", "러그", Rule.Box),
		room("lamp", "스탠드", Rule.Box),
		room("trophy", "트로피", Rule.Box),
		room("clock", "벽시계", Rule.Box),
		room("guitar", "기타", Rule.Box),
		room("lights", "꼬마전구", Rule.Box),
		room("beanbag", "빈백", Rule.Box),
		room("cake", "케이크", Rule.Box),
		room("mic", "마이크", Rule.Box),
		room("gamepad", "게임패드", Rule.Box),
		room("ramen", "컵라면", Rule.Box),
		room("camera", "카메라", Rule.Box),
		room("vase", "꽃병", Rule.Box),
		room("mirror", "거울", Rule.Box),
		room("coffee", "커피잔", Rule.Box),
	)

	// 깜짝 상자가 열리는 장면 수. 상자에서는 아직 없는 물건만 나와서 꽝이 없다
	val BOXES = listOf(12, 25, 45, 65, 90)

	private val byId = ITEMS.associateBy { it.id }

	fun find(id: String) = byId[id]

	fun configured(milestones: Map<String, Int>) = ITEMS.map { def ->
		if (def.rule is Rule.Milestone) def.copy(rule = Rule.Milestone(milestones.getValue(def.id))) else def
	}
}
