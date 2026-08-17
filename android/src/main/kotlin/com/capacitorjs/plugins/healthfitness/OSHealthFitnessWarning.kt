package com.capacitorjs.plugins.healthfitness

enum class OSHealthFitnessWarning(val code: Int, val message: String) {
    DEPRECATED_TIME_UNIT(405,
        "The TimeUnit parameters of type MILLISECONDS or SECONDS are deprecated on Android. By default, TimeUnit will be set to MINUTE.");
}
