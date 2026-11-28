package com.nuanci.query

import com.nuanci.admin.AdminSessions
import jakarta.validation.Valid
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException

data class AdminChart(
	val id: Long,
	val title: String,
	val description: String?,
	val sql: String,
	val kind: String,
	val xCol: String?,
	val yCol: String?,
	val splitCol: String?,
	val width: Int,
)

// 열 이름은 조회 결과의 열 이름 그대로다. yCol의 "*"는 숫자 열 전체를 나란히 그린다는 뜻이다
data class SaveChart(
	@field:NotBlank @field:Size(max = 200) val title: String,
	@field:Size(max = 500) val description: String? = null,
	@field:NotBlank @field:Size(max = 20000) val sql: String,
	@field:Pattern(regexp = "number|bar|hbar|line|table") val kind: String,
	@field:Size(max = 100) val xCol: String? = null,
	@field:Size(max = 100) val yCol: String? = null,
	@field:Size(max = 100) val splitCol: String? = null,
	@field:Min(1) @field:Max(4) val width: Int = 2,
)

data class BoardChart(val chart: AdminChart, val result: QueryResult?, val error: String?)
data class Board(val since: String, val days: Int, val charts: List<BoardChart>)

// 어드민 보드: 저장한 조회를 차트 설정과 함께 모아 한 화면에서 같은 기간으로 본다(ADR 0045)
@RestController
@RequestMapping("/api/admin/charts")
class AdminChartController(private val sessions: AdminSessions, private val jdbc: JdbcClient, private val runner: QueryRunner) {
	@ExceptionHandler(ResponseStatusException::class)
	fun error(e: ResponseStatusException): ResponseEntity<Map<String, String>> =
		ResponseEntity.status(e.statusCode).body(mapOf("message" to (e.reason ?: "차트를 처리할 수 없어요")))

	@GetMapping
	fun list(@RequestHeader(HttpHeaders.AUTHORIZATION, required = false) auth: String?): List<AdminChart> {
		sessions.require(auth)
		return all()
	}

	@GetMapping("/{id}")
	fun one(@PathVariable id: Long, @RequestHeader(HttpHeaders.AUTHORIZATION, required = false) auth: String?): AdminChart {
		sessions.require(auth)
		return find(id)
	}

	// 차트를 모두 실행한다. 한 차트의 SQL이 틀려도 그 칸에만 오류를 보여 주고 나머지는 그린다
	@GetMapping("/board")
	fun board(@RequestParam(defaultValue = "14") days: Int, @RequestHeader(HttpHeaders.AUTHORIZATION, required = false) auth: String?): Board {
		sessions.require(auth)
		val period = days.coerceIn(0, 3650)
		val charts = all()
		val runs = runner.runAll(charts.map { it.sql }, period)
		return Board(QueryRunner.since(period).toString(), period, charts.zip(runs) { c, r -> BoardChart(c, r.result, r.error) })
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	fun create(@Valid @RequestBody req: SaveChart, @RequestHeader(HttpHeaders.AUTHORIZATION, required = false) auth: String?): AdminChart {
		sessions.require(auth)
		val id = jdbc.sql(
			"""
			insert into admin_chart (title, description, sql, kind, x_col, y_col, split_col, width, sort_order)
			values (:title, :description, :sql, :kind, :x, :y, :split, :width, coalesce((select max(sort_order) from admin_chart), 0) + 10)
			returning id
			""",
		).params(params(req)).query(Long::class.java).single()
		return find(id)
	}

	@PutMapping("/{id}")
	fun update(@PathVariable id: Long, @Valid @RequestBody req: SaveChart, @RequestHeader(HttpHeaders.AUTHORIZATION, required = false) auth: String?): AdminChart {
		sessions.require(auth)
		val n = jdbc.sql(
			"""
			update admin_chart set title = :title, description = :description, sql = :sql, kind = :kind, x_col = :x, y_col = :y, split_col = :split,
			  width = :width, updated_at = now() where id = :id
			""",
		).params(params(req) + ("id" to id)).update()
		if (n == 0) throw ResponseStatusException(HttpStatus.NOT_FOUND, "차트가 없어요")
		return find(id)
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	fun delete(@PathVariable id: Long, @RequestHeader(HttpHeaders.AUTHORIZATION, required = false) auth: String?) {
		sessions.require(auth)
		jdbc.sql("delete from admin_chart where id = :id").param("id", id).update()
	}

	// 바로 앞이나 뒤 차트와 자리를 바꾼다
	@PostMapping("/{id}/move")
	@Transactional
	fun move(@PathVariable id: Long, @RequestParam @Pattern(regexp = "up|down") dir: String, @RequestHeader(HttpHeaders.AUTHORIZATION, required = false) auth: String?): List<AdminChart> {
		sessions.require(auth)
		val order = jdbc.sql("select id, sort_order from admin_chart order by sort_order, id").query { rs, _ -> rs.getLong(1) to rs.getInt(2) }.list()
		val at = order.indexOfFirst { it.first == id }
		if (at < 0) throw ResponseStatusException(HttpStatus.NOT_FOUND, "차트가 없어요")
		val other = if (dir == "up") at - 1 else at + 1
		if (other in order.indices) {
			// 정렬 값이 같은 차트가 있어도 자리가 바뀌게 먼저 10 간격으로 다시 매긴다
			order.forEachIndexed { i, (cid, _) -> jdbc.sql("update admin_chart set sort_order = :o where id = :id").param("o", (i + 1) * 10).param("id", cid).update() }
			jdbc.sql("update admin_chart set sort_order = :o where id = :id").param("o", (other + 1) * 10).param("id", id).update()
			jdbc.sql("update admin_chart set sort_order = :o where id = :id").param("o", (at + 1) * 10).param("id", order[other].first).update()
		}
		return all()
	}

	private fun params(req: SaveChart) = mapOf(
		"title" to req.title.trim(), "description" to req.description?.trim()?.ifEmpty { null }, "sql" to req.sql.trim(), "kind" to req.kind,
		"x" to req.xCol?.ifBlank { null }, "y" to req.yCol?.ifBlank { null }, "split" to req.splitCol?.ifBlank { null }, "width" to req.width,
	)

	private fun all(): List<AdminChart> = jdbc.sql("select * from admin_chart order by sort_order, id").query(::chart).list()

	private fun find(id: Long): AdminChart =
		jdbc.sql("select * from admin_chart where id = :id").param("id", id).query(::chart).optional()
			.orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "차트가 없어요") }

	private fun chart(rs: java.sql.ResultSet, @Suppress("UNUSED_PARAMETER") n: Int) = AdminChart(
		rs.getLong("id"), rs.getString("title"), rs.getString("description"), rs.getString("sql"), rs.getString("kind"),
		rs.getString("x_col"), rs.getString("y_col"), rs.getString("split_col"), rs.getInt("width"),
	)
}
