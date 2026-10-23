package com.nuanci

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class NuanciApplication

fun main(args: Array<String>) {
	runApplication<NuanciApplication>(*args)
}
