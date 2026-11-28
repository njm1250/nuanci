package com.nuanci.query

import com.nuanci.admin.AdminSessions
import jakarta.validation.Valid
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.Size
import org.springframework.http.HttpHeaders
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException

// days는 SQL에 {{since}}를 썼을 때 그 시작일을 정하는 기간(일). 0은 전체
data class QueryRequest(@field:Size(min = 1, max = 20000) val sql: String, @field:Min(0) @field:Max(3650) val days: Int = 14)
data class QueryResult(val columns: List<String>, val rows: List<List<String?>>, val truncated: Boolean)
data class TableColumn(val name: String, val type: String, val nullable: Boolean)
data class QueryTable(val name: String, val columns: List<TableColumn>)

@RestController
@RequestMapping("/api/admin/query")
class QueryController(private val sessions: AdminSessions, private val runner: QueryRunner) {
	@ExceptionHandler(ResponseStatusException::class)
	fun error(e: ResponseStatusException): ResponseEntity<Map<String, String>> =
		ResponseEntity.status(e.statusCode).body(mapOf("message" to (e.reason ?: "조회할 수 없어요")))

	// 기본 테이블과 지표 뷰(metrics 스키마)를 함께 보여 준다. 뷰는 스키마 이름을 붙여 쓴다
	@GetMapping("/schema")
	fun schema(@RequestHeader(HttpHeaders.AUTHORIZATION, required = false) auth: String?): List<QueryTable> {
		sessions.require(auth)
		return runner.exclusive {
			runner.connect { connection ->
				connection.prepareStatement("""
					select case when table_schema = 'public' then table_name else table_schema || '.' || table_name end, column_name, data_type, is_nullable
					from information_schema.columns
					where table_schema in ('public', 'metrics') and has_table_privilege(current_user, quote_ident(table_schema) || '.' || quote_ident(table_name), 'SELECT')
					order by table_schema desc, table_name, ordinal_position
				""").use { statement ->
					statement.executeQuery().use { rs ->
						val tables = linkedMapOf<String, MutableList<TableColumn>>()
						while (rs.next()) tables.getOrPut(rs.getString(1)) { mutableListOf() }.add(TableColumn(rs.getString(2), rs.getString(3), rs.getString(4) == "YES"))
						tables.map { QueryTable(it.key, it.value) }
					}
				}
			}
		}
	}

	@PostMapping
	fun query(@Valid @RequestBody request: QueryRequest, @RequestHeader(HttpHeaders.AUTHORIZATION, required = false) auth: String?): QueryResult {
		sessions.require(auth)
		return runner.run(request.sql, request.days)
	}
}
