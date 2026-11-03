package com.nuanci.scene

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query

interface SceneRepository : JpaRepository<Scene, String> {
	fun findAllByStatusOrderBySortOrder(status: String): List<Scene>

	fun findByNumber(number: Int): Scene?
}

interface SceneVersionRepository : JpaRepository<SceneVersion, SceneVersionId> {
	// 복합키라서 findAllById는 키마다 따로 조회한다. 상태가 같은 장면의 현재 버전을 한 번에 가져온다
	@Query("select v from SceneVersion v, Scene s where s.id = v.sceneId and s.currentVersion = v.version and s.status = :status")
	fun findCurrentByStatus(status: String): List<SceneVersion>
}
