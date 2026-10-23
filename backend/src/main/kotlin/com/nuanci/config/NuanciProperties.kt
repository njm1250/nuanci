package com.nuanci.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties("nuanci")
data class NuanciProperties(
	val adminId: String = "admin",
	val adminPassword: String = "",
)
