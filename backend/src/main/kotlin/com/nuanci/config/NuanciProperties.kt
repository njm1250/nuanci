package com.nuanci.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties("nuanci")
data class NuanciProperties(
	val contentDir: String,
	val adminToken: String = "",
)
