package com.capacitorjs.plugins.healthfitness

import android.app.Activity
import android.app.AlarmManager
import android.content.Context
import com.google.gson.Gson
import com.google.gson.GsonBuilder
import io.ionic.libs.ionhealthfitnesslib.background.BackgroundJobParameters
import io.ionic.libs.ionhealthfitnesslib.background.DatabaseManager
import io.ionic.libs.ionhealthfitnesslib.background.UpdateBackgroundJobParameters
import io.ionic.libs.ionhealthfitnesslib.data.Constants
import io.ionic.libs.ionhealthfitnesslib.data.HealthEnumTimeUnit
import io.ionic.libs.ionhealthfitnesslib.data.HealthRecord
import io.ionic.libs.ionhealthfitnesslib.data.types.HealthAdvancedQueryParameters
import io.ionic.libs.ionhealthfitnesslib.data.types.HealthFitnessGroupPermission
import io.ionic.libs.ionhealthfitnesslib.data.types.HealthFitnessPermission
import io.ionic.libs.ionhealthfitnesslib.helpers.ActivityTransitionHelper
import io.ionic.libs.ionhealthfitnesslib.helpers.AlarmManagerHelper
import io.ionic.libs.ionhealthfitnesslib.helpers.HealthConnectHelper
import io.ionic.libs.ionhealthfitnesslib.repository.HealthConnectRepository
import io.ionic.libs.ionhealthfitnesslib.viewmodel.HealthConnectDataManager
import io.ionic.libs.ionhealthfitnesslib.viewmodel.HealthConnectViewModel

/**
 * Business logic - delegates directly to the shared `ion-android-healthfitness`
 * native library, exactly like the Cordova plugin's OSHealthFitnessPlugin.kt does.
 * No Capacitor imports here; only plain Android/library types.
 */
class HealthFitness(context: Context) {

    val gson: Gson by lazy { Gson() }

    private val database = DatabaseManager(context)
    private val healthConnectDataManager = HealthConnectDataManager(database)
    val healthConnectHelper = HealthConnectHelper()
    val alarmManagerHelper = AlarmManagerHelper()
    val activityTransitionHelper = ActivityTransitionHelper()
    private val healthConnectRepository = HealthConnectRepository(healthConnectDataManager)

    val healthConnectViewModel = HealthConnectViewModel(
        healthConnectRepository,
        healthConnectHelper,
        alarmManagerHelper,
        activityTransitionHelper
    )

    val alarmManager: AlarmManager =
        context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

    // Saved between setBackgroundJob and the permission-request callbacks that
    // follow it, same as the Cordova bridge's backgroundParameters field.
    var backgroundParameters: BackgroundJobParameters? = null
    var requestingExactAlarmPermission: Boolean = false

    fun getForegroundNotificationTitle(context: Context): String = context.resources.getString(
        context.resources.getIdentifier("background_notification_title", "string", context.packageName)
    )

    fun getForegroundNotificationDescription(context: Context): String = context.resources.getString(
        context.resources.getIdentifier("background_notification_description", "string", context.packageName)
    )

    fun getPrivacyPolicyUrl(activity: Activity): String = activity.resources.getString(
        activity.resources.getIdentifier("privacy_policy_url", "string", activity.packageName)
    )

    fun parseCustomPermissions(json: String): Array<HealthFitnessPermission> =
        gson.fromJson(json, Array<HealthFitnessPermission>::class.java)

    fun parseGroupPermission(json: String): HealthFitnessGroupPermission =
        gson.fromJson(json, HealthFitnessGroupPermission::class.java)

    fun advancedQueryGson(onDeprecatedUsage: () -> Unit): Gson = GsonBuilder().registerTypeAdapter(
        HealthEnumTimeUnit::class.java,
        TimeUnitSerializer(onDeprecatedUsage)
    ).create()

    fun parseAdvancedQueryParameters(json: String, customGson: Gson): HealthAdvancedQueryParameters =
        customGson.fromJson(json, HealthAdvancedQueryParameters::class.java)

    fun parseBackgroundJobParameters(json: String): BackgroundJobParameters =
        gson.fromJson(json, BackgroundJobParameters::class.java)

    fun parseUpdateBackgroundJobParameters(json: String): UpdateBackgroundJobParameters =
        gson.fromJson(json, UpdateBackgroundJobParameters::class.java)

    fun isActivityVariable(variable: String?): Boolean =
        Constants.ACTIVITY_VARIABLES.contains(variable)

    fun canScheduleExactAlarms(): Boolean =
        android.os.Build.VERSION.SDK_INT < 31 || alarmManager.canScheduleExactAlarms()

    fun healthRecordFor(variable: String): HealthRecord = HealthRecord.valueOf(variable)
}
