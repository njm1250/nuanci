package com.nuanci

import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.post

const val TEST_ADMIN_PASSWORD = "test-pw"

fun MockMvc.adminToken(): String {
	val body = post("/api/admin/login") {
		contentType = MediaType.APPLICATION_JSON
		content = """{"id":"admin","password":"$TEST_ADMIN_PASSWORD"}"""
	}.andReturn().response.contentAsString
	return Regex("\"token\":\"([0-9a-f]+)\"").find(body)!!.groupValues[1]
}
