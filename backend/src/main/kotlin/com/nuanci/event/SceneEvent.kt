package com.nuanci.event

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import org.springframework.data.jpa.repository.JpaRepository
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "scene_event")
class SceneEvent(
	val type: String,
	@Column(name = "scene_id")
	val sceneId: String?,
	@Column(name = "scene_version")
	val sceneVersion: Int?,
	@Column(name = "attempt_id")
	val attemptId: UUID?,
	@Column(name = "visitor_id")
	val visitorId: UUID,
	val step: String?,
	@Column(name = "choice_id")
	val choiceId: String?,
	val entry: String?,
	@Column(name = "created_at")
	val createdAt: Instant = Instant.now(),
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	val id: Long? = null,
	@Column(name = "user_id")
	val userId: UUID? = null,
	@Column(name = "auth_state")
	val authState: String = "unknown",
)

interface SceneEventRepository : JpaRepository<SceneEvent, Long>
