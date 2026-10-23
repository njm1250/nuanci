package com.nuanci.scene

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.IdClass
import jakarta.persistence.Table
import org.hibernate.annotations.ColumnTransformer
import java.io.Serializable
import java.time.Instant

object SceneStatus {
	const val PUBLISHED = "published"
	const val DRAFT = "draft"
	const val HIDDEN = "hidden"
	val ALL = setOf(PUBLISHED, DRAFT, HIDDEN)
}

@Entity
@Table(name = "scene")
class Scene(
	@Id
	val id: String,
	var number: Int,
	var title: String,
	var status: String,
	@Column(name = "sort_order")
	var sortOrder: Int,
	@Column(name = "current_version")
	var currentVersion: Int,
	@Column(name = "updated_at")
	var updatedAt: Instant,
)

data class SceneVersionId(
	val sceneId: String = "",
	val version: Int = 0,
) : Serializable

@Entity
@Table(name = "scene_version")
@IdClass(SceneVersionId::class)
class SceneVersion(
	@Id
	@Column(name = "scene_id")
	val sceneId: String,
	@Id
	val version: Int,
	@Column(name = "content_hash")
	val contentHash: String,
	// 작성한 키 순서를 지키려고 jsonb로 바꾸지 않고 문자열 그대로 json 컬럼에 넣는다
	@ColumnTransformer(write = "?::json")
	val content: String,
	@Column(name = "created_at")
	val createdAt: Instant,
)
