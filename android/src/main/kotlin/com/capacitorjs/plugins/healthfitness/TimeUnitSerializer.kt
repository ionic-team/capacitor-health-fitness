package com.capacitorjs.plugins.healthfitness

import com.google.gson.JsonDeserializationContext
import com.google.gson.JsonDeserializer
import com.google.gson.JsonElement
import com.google.gson.JsonParseException
import com.google.gson.JsonPrimitive
import com.google.gson.JsonSerializationContext
import com.google.gson.JsonSerializer
import io.ionic.libs.ionhealthfitnesslib.data.HealthEnumTimeUnit
import java.lang.reflect.Type

class TimeUnitSerializer(
    private val onDeprecatedFound: () -> Unit
) : JsonSerializer<HealthEnumTimeUnit>, JsonDeserializer<HealthEnumTimeUnit> {

    override fun serialize(
        src: HealthEnumTimeUnit?,
        typeOfSrc: Type?,
        context: JsonSerializationContext?
    ): JsonElement {
        return JsonPrimitive(src?.name)
    }

    override fun deserialize(
        json: JsonElement?,
        typeOfT: Type?,
        context: JsonDeserializationContext?
    ): HealthEnumTimeUnit {
        return when (val value = json?.asString) {
            "SECONDS", "MILLISECONDS" -> {
                onDeprecatedFound()
                HealthEnumTimeUnit.MINUTE
            }
            "MINUTE" -> HealthEnumTimeUnit.MINUTE
            "HOUR" -> HealthEnumTimeUnit.HOUR
            "DAY" -> HealthEnumTimeUnit.DAY
            "WEEK" -> HealthEnumTimeUnit.WEEK
            "MONTH" -> HealthEnumTimeUnit.MONTH
            "YEAR" -> HealthEnumTimeUnit.YEAR
            else -> throw JsonParseException("Unknown time unit: $value")
        }
    }
}
