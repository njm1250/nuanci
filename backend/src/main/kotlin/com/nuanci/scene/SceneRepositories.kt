package com.nuanci.scene

import org.springframework.data.jpa.repository.JpaRepository

interface SceneRepository : JpaRepository<Scene, String> {
	fun findAllByStatusOrderBySortOrder(status: String): List<Scene>
}

interface SceneVersionRepository : JpaRepository<SceneVersion, SceneVersionId>
