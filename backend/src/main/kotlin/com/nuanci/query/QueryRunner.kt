package com.nuanci.query

import com.zaxxer.hikari.HikariDataSource
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Component
import org.springframework.web.server.ResponseStatusException
import java.sql.DriverManager
import java.sql.SQLException
import java.time.LocalDate
import java.time.ZoneId
import java.util.concurrent.Semaphore
import javax.sql.DataSource

// 관리자가 쓴 SELECT를 조회 전용 역할로 실행한다. SQL 콘솔과 보드 차트가 같이 쓴다.
// 운영 DB가 작은 서버 한 대라 한 번에 하나만 돌린다. 보드는 여러 차트를 슬롯 하나를 잡은 채 차례로 돌린다
@Component
class QueryRunner(private val dataSource: DataSource) {
	private val slot = Semaphore(1)

	// 실패한 차트 하나가 보드 전체를 막지 않게, 결과나 오류 문구 중 하나를 돌려준다
	data class Outcome(val result: QueryResult?, val error: String?)

	fun run(sql: String, days: Int): QueryResult = exclusive { execute(prepare(sql, days)) }

	fun runAll(sqls: List<String>, days: Int): List<Outcome> = exclusive {
		sqls.map { sql ->
			try {
				Outcome(execute(prepare(sql, days)), null)
			} catch (e: ResponseStatusException) {
				Outcome(null, e.reason)
			}
		}
	}

	// 한 문장만 받는다. 쓰기 CTE·함수 우회는 아래 DB 역할과 READ ONLY가 함께 막는다.
	// {{since}}는 기간의 시작일(한국 날짜)로 바꾼다. 서버가 만든 날짜만 들어가므로 SQL에 사용자 값이 섞이지 않는다
	private fun prepare(raw: String, days: Int): String {
		val sql = raw.trim().removeSuffix(";").trim().replace(SINCE, "DATE '${since(days)}'")
		if (!Regex("(?is)^(select|with)\\b.*").matches(sql) || ';' in sql || Regex("(?i)\\b(set_config|dblink|lo_import|lo_export)\\b|\\\\").containsMatchIn(sql)) {
			throw ResponseStatusException(HttpStatus.BAD_REQUEST, "SELECT 또는 WITH 조회 한 문장만 실행할 수 있어요")
		}
		return sql
	}

	private fun execute(sql: String): QueryResult = connect { connection ->
		connection.prepareStatement(sql).use { statement ->
			statement.queryTimeout = 5
			statement.maxRows = MAX_ROWS + 1
			statement.executeQuery().use { rs ->
				val columns = (1..rs.metaData.columnCount).map { rs.metaData.getColumnLabel(it) }
				if (columns.size > 100) throw ResponseStatusException(HttpStatus.BAD_REQUEST, "컬럼은 100개까지 조회할 수 있어요")
				val rows = mutableListOf<List<String?>>()
				var chars = 0
				while (rs.next()) {
					if (rows.size == MAX_ROWS || chars >= 1_000_000) return@connect QueryResult(columns, rows, true)
					val row = columns.indices.map { rs.getString(it + 1)?.take(4000) }
					chars += row.sumOf { it?.length ?: 0 }
					rows.add(row)
				}
				QueryResult(columns, rows, false)
			}
		}
	}

	fun <T> exclusive(block: () -> T): T {
		if (!slot.tryAcquire()) throw ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "다른 조회가 실행 중이에요. 잠시 뒤 다시 실행해 주세요")
		try {
			return block()
		} finally {
			slot.release()
		}
	}

	// 매번 별도 연결을 닫아 사용자 SQL의 세션 설정·잠금이 앱 연결 풀에 남지 않게 한다.
	// 차트마다 연결을 새로 여는 것은, 한 조회가 실패하면 같은 트랜잭션의 다음 조회가 모두 실패하기 때문이다
	fun <T> connect(block: (java.sql.Connection) -> T): T {
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
		}
	}

	companion object {
		const val SINCE = "{{since}}"
		const val MAX_ROWS = 500
		// 기간 0은 전체. 서비스를 연 달의 첫날부터로 둔다(날짜를 채우는 차트가 너무 길어지지 않게)
		val OPENED: LocalDate = LocalDate.of(2026, 10, 1)
		private val SEOUL: ZoneId = ZoneId.of("Asia/Seoul")

		fun since(days: Int): LocalDate =
			if (days <= 0) OPENED else LocalDate.now(SEOUL).minusDays((days - 1).toLong()).coerceAtLeast(OPENED)
	}
}
