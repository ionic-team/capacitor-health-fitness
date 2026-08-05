package com.capacitorjs.plugins.healthfitness

import com.getcapacitor.Logger

class HealthFitness {

    fun echo(value: String): String {
        Logger.info("Echo", value)

        return value
    }
}
