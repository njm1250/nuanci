package com.nuanci.admin

import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpHeaders
import org.springframework.web.servlet.HandlerInterceptor
import org.springframework.web.servlet.config.annotation.InterceptorRegistry
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer

// /api/admin 아래는 로그인·로그아웃만 빼고 모두 여기서 한 번 더 로그인을 확인한다.
// API마다 sessions.require를 부르고 있지만, 새 API를 만들며 깜빡해도 열리지 않게 입구에서 막는다
class AdminAuthInterceptor(private val sessions: AdminSessions) : HandlerInterceptor {
	override fun preHandle(request: HttpServletRequest, response: HttpServletResponse, handler: Any): Boolean {
		if (request.method == "OPTIONS") return true
		sessions.require(request.getHeader(HttpHeaders.AUTHORIZATION))
		return true
	}
}

@Configuration
class AdminAuthConfig(private val sessions: AdminSessions) : WebMvcConfigurer {
	override fun addInterceptors(registry: InterceptorRegistry) {
		registry.addInterceptor(AdminAuthInterceptor(sessions))
			.addPathPatterns("/api/admin/**")
			.excludePathPatterns("/api/admin/login", "/api/admin/logout")
	}
}
