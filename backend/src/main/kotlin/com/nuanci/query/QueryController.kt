package com.nuanci.query

import com.nuanci.admin.AdminSessions
import com.zaxxer.hikari.HikariDataSource
import jakarta.validation.Valid
import jakarta.validation.constraints.Size
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException
import java.sql.DriverManager
import java.sql.SQLException
import java.util.concurrent.Semaphore
import javax.sql.DataSource

data class QueryRequest(@field:Size(min = 1, max = 20000) val sql: String)
data class QueryResult(val columns: List<String>, val rows: List<List<String?>>, val truncated: Boolean)
data class TableColumn(val name: String, val type: String, val nullable: Boolean)
data class QueryTable(val name: String, val columns: List<TableColumn>)

@RestController
@RequestMapping("/api/admin/query")
class QueryController(private val sessions: AdminSessions, private val dataSource: DataSource) {
	private val slot = Semaphore(1)

	@ExceptionHandler(ResponseStatusException::class)
	fun error(e: ResponseStatusException): ResponseEntity<Map<String, String>> =
		ResponseEntity.status(e.statusCode).body(mapOf("message" to (e.reason ?: "조회할 수 없어요")))

	@GetMapping("/schema")
	fun schema(@RequestHeader(HttpHeaders.AUTHORIZATION, required = false) auth: String?): List<QueryTable> {
		sessions.require(auth)
		return read { connection ->
			connection.prepareStatement("""
				select table_name, column_name, data_type, is_nullable from information_schema.columns
				where table_schema = 'public' and has_table_privilege(current_user, quote_ident(table_schema) || '.' || quote_ident(table_name), 'SELECT')
				order by table_name, ordinal_position
			""").use { statement ->
				statement.executeQuery().use { rs ->
					val tables = linkedMapOf<String, MutableList<TableColumn>>()
					while (rs.next()) tables.getOrPut(rs.getString(1)) { mutableListOf() }.add(TableColumn(rs.getString(2), rs.getString(3), rs.getString(4) == "YES"))
					tables.map { QueryTable(it.key, it.value) }
				}
			}
		}
	}

	@PostMapping
	fun query(@Valid @RequestBody request: QueryRequest, @RequestHeader(HttpHeaders.AUTHORIZATION, required = false) auth: String?): QueryResult {
		sessions.require(auth)
		val sql = request.sql.trim().removeSuffix(";").trim()
		// 한 문장만 받는다. 쓰기 CTE·함수 우회는 아래 DB 역할과 READ ONLY가 함께 막는다
		if (!Regex("(?is)^(select|with)\\b.*").matches(sql) || ';' in sql || Regex("(?i)\\b(set_config|dblink|lo_import|lo_export)\\b|\\\\").containsMatchIn(sql)) {
			throw ResponseStatusException(HttpStatus.BAD_REQUEST, "SELECT 또는 WITH 조회 한 문장만 실행할 수 있어요")
		}
		return read { connection ->
			connection.prepareStatement(sql).use { statement ->
				statement.queryTimeout = 5
				statement.maxRows = 501
				statement.executeQuery().use { rs ->
					val columns = (1..rs.metaData.columnCount).map { rs.metaData.getColumnLabel(it) }
					if (columns.size > 100) throw ResponseStatusException(HttpStatus.BAD_REQUEST, "컬럼은 100개까지 조회할 수 있어요")
					val rows = mutableListOf<List<String?>>()
					var chars = 0
					while (rs.next()) {
						if (rows.size == 500 || chars >= 1_000_000) return@read QueryResult(columns, rows, true)
						val row = columns.indices.map { rs.getString(it + 1)?.take(4000) }
						chars += row.sumOf { it?.length ?: 0 }
						rows.add(row)
					}
					QueryResult(columns, rows, false)
				}
			}
		}
	}

	// 매번 별도 연결을 닫아 사용자 SQL의 세션 설정·잠금이 앱 연결 풀에 남지 않게 한다
	private fun <T> read(block: (java.sql.Connection) -> T): T {
		if (!slot.tryAcquire()) throw ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "다른 조회가 실행 중이에요. 잠시 뒤 다시 실행해 주세요")
		try {
			val pool = dataSource.unwrap(HikariDataSource::class.java)
			DriverManager.getConnection(pool.jdbcUrl, pool.username, pool.password).use { connection ->
				connection.autoCommit = false
				try {
					connection.createStatement().use {
						it.execute("SET TRANSACTION READ ONLY")
						it.execute("SET LOCAL ROLE nuanci_query_reader")
						it.execute("SET LOCAL statement_timeout = '5s'")
						it.execute("SET LOCAL lock_timeout = '1s'")
					}
					return block(connection)
				} finally {
					connection.rollback()
				}
			}
		} catch (e: SQLException) {
			val message = when (e.sqlState) {
				"57014", "55P03" -> "조회 제한 시간(5초)을 넘겼거나 잠긴 데이터예요"
				"25006", "42501" -> "읽기 전용 조회만 가능해요. 쓰기 작업과 로그인 세션 테이블은 허용하지 않아요"
				else -> e.message?.substringBefore("\n")?.take(300) ?: "쿼리를 확인해 주세요"
			}
			throw ResponseStatusException(HttpStatus.BAD_REQUEST, message)
		} finally {
			slot.release()
		}
	}
}
