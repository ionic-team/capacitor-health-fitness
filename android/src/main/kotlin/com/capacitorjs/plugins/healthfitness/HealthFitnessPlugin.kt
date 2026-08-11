package com.capacitorjs.plugins.healthfitness

import android.Manifest
import android.content.Intent
import android.os.Build.VERSION.SDK_INT
import android.provider.Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.common.GoogleApiAvailability
import com.outsystems.plugins.healthfitness.data.Constants.EXTRA_CONTAINS_READ_DATA_BACKGROUND
import com.outsystems.plugins.healthfitness.data.Constants.EXTRA_RESULT_PERMISSION_DENIED
import com.outsystems.plugins.healthfitness.data.Constants.EXTRA_RESULT_PERMISSION_GRANTED
import com.outsystems.plugins.healthfitness.data.Constants.EXTRA_RESULT_PERMISSION_KEY_GLOBAL
import com.outsystems.plugins.healthfitness.data.Constants.REQUEST_PERMISSION_ACTIVITY_KEY_HEALTH
import com.outsystems.plugins.healthfitness.data.HealthFitnessError
import com.outsystems.plugins.healthfitness.store.HealthStoreException
import org.json.JSONException

/**
 * Thin Capacitor bridge - argument extraction and result formatting only.
 * All business logic lives in HealthFitness.kt, which delegates to the shared
 * ion-android-healthfitness native library (same as the Cordova plugin).
 */
// requestCodes must list every code passed to Activity.startActivityForResult()
// directly (bypassing Capacitor's own startActivityForResult() wrapper) -
// Bridge.getPluginWithRequestCode() only routes handleOnActivityResult() back to
// this plugin for codes declared here; otherwise the result is silently dropped
// ("Unable to find a Capacitor plugin to handle requestCode").
// REQUEST_PERMISSION_ACTIVITY_KEY_HEALTH is used by the shared
// ion-android-healthfitness library itself, for both the main
// requestHealthPermissions() flow and requestReadDataBackgroundPermission().
//
// The background-job permissions (POST_NOTIFICATIONS/ACTIVITY_RECOGNITION) go
// through the "backgroundJob" alias below instead of a raw requestCode: unlike
// handleOnActivityResult(), Bridge.onRequestPermissionsResult() only ever
// forwards to a plugin's (deprecated) handleRequestPermissionsResult() when the
// plugin uses the legacy @NativePlugin annotation - never for @CapacitorPlugin,
// no matter what requestCodes are declared. requestPermissionForAlias() +
// @PermissionCallback is the only mechanism that reaches a @CapacitorPlugin.
@CapacitorPlugin(
    name = "HealthFitness",
    permissions = [
        Permission(
            alias = HealthFitnessPlugin.BACKGROUND_JOB_PERMISSION_ALIAS,
            strings = [Manifest.permission.POST_NOTIFICATIONS, Manifest.permission.ACTIVITY_RECOGNITION]
        )
    ],
    requestCodes = [REQUEST_PERMISSION_ACTIVITY_KEY_HEALTH]
)
class HealthFitnessPlugin : Plugin() {

    private lateinit var implementation: HealthFitness
    private lateinit var foregroundNotificationTitle: String
    private lateinit var foregroundNotificationDescription: String

    private var savedCallbackId: String? = null

    private fun retainCall(call: PluginCall) {
        bridge.saveCall(call)
        savedCallbackId = call.callbackId
    }

    private fun takeSavedCall(): PluginCall? {
        val callbackId = savedCallbackId ?: return null
        savedCallbackId = null
        val call = bridge.getSavedCall(callbackId)
        if (call != null) {
            bridge.releaseCall(call)
        }
        return call
    }

    override fun load() {
        implementation = HealthFitness(context)
        foregroundNotificationTitle = implementation.getForegroundNotificationTitle(context)
        foregroundNotificationDescription = implementation.getForegroundNotificationDescription(context)
    }

    // Named requestHealthPermissions rather than the framework's own
    // requestPermissions() - this plugin uses a single custom combined
    // init+request call with pre-serialized JSON descriptors and resolves
    // void, unlike Capacitor's declarative permissions-alias contract
    // (Promise<PermissionStatus>), so it deliberately does not override the
    // base method.
    @PluginMethod
    fun requestHealthPermissions(call: PluginCall) {
        if (!areGooglePlayServicesAvailable(call)) return

        try {
            val customPermissions = implementation.parseCustomPermissions(call.getString("customPermissions") ?: "")
            val allVariables = implementation.parseGroupPermission(call.getString("allVariables") ?: "")
            val fitnessVariables = implementation.parseGroupPermission(call.getString("fitnessVariables") ?: "")
            val healthVariables = implementation.parseGroupPermission(call.getString("healthVariables") ?: "")
            val profileVariables = implementation.parseGroupPermission(call.getString("profileVariables") ?: "")
            // NOTE: workoutVariables is intentionally not read - the Cordova
            // plugin never parses this argument on Android either.

            retainCall(call)
            implementation.healthConnectViewModel.initAndRequestPermissions(
                activity,
                customPermissions,
                allVariables,
                fitnessVariables,
                healthVariables,
                profileVariables,
                privacyPolicyUrl = implementation.getPrivacyPolicyUrl(activity),
                { /* activity result is delivered via handleOnActivityResult below */ },
                { sendError(call, it) }
            )
        } catch (hse: HealthStoreException) {
            sendError(call, hse.error)
        } catch (e: JSONException) {
            sendError(call, HealthFitnessError.PARSING_PARAMETERS_ERROR)
        } catch (e: Exception) {
            sendError(call, HealthFitnessError.REQUEST_PERMISSIONS_GENERAL_ERROR)
        }
    }

    @PluginMethod
    fun getData(call: PluginCall) {
        if (!areGooglePlayServicesAvailable(call)) return

        var deprecationWarning = false
        val onDeprecatedUsage: () -> Unit = { deprecationWarning = true }
        val customGson = implementation.advancedQueryGson(onDeprecatedUsage)
        val parameters = try {
            implementation.parseAdvancedQueryParameters(call.getString("parameters") ?: "", customGson)
        } catch (e: Exception) {
            return sendError(call, HealthFitnessError.PARSING_PARAMETERS_ERROR)
        }

        implementation.healthConnectViewModel.advancedQuery(
            parameters,
            context,
            { response ->
                if (!deprecationWarning) {
                    sendSuccess(call, response)
                } else {
                    sendSuccessWithWarning(call, response, OSHealthFitnessWarning.DEPRECATED_TIME_UNIT)
                }
            },
            { error -> sendError(call, error) }
        )
    }

    // getWorkoutData is iOS-only - deliberately not declared here (rather
    // than declared with a stub rejection) so Capacitor's own client-side
    // check reports it as unimplemented on Android, matching how
    // disconnectFromHealthConnect/openHealthConnect (Android-only) are
    // handled on iOS.

    @PluginMethod
    fun writeData(call: PluginCall) {
        if (!areGooglePlayServicesAvailable(call)) return

        try {
            val variable = call.getString("variable") ?: ""
            val healthRecord = implementation.healthRecordFor(variable)
            val value = call.getDouble("value") ?: throw IllegalArgumentException("Missing 'value'.")

            implementation.healthConnectViewModel.writeData(
                healthRecord,
                value,
                activity.packageName,
                { call.resolve() },
                { sendError(call, it) }
            )
        } catch (e: Exception) {
            sendError(call, HealthFitnessError.VARIABLE_NOT_AVAILABLE_ERROR)
        }
    }

    @PluginMethod
    fun getLastRecord(call: PluginCall) {
        if (!areGooglePlayServicesAvailable(call)) return

        try {
            implementation.healthConnectViewModel.getLastRecord(
                implementation.healthRecordFor(call.getString("variable") ?: ""),
                { sendSuccess(call, it) },
                { sendError(call, it) }
            )
        } catch (e: Exception) {
            sendError(call, HealthFitnessError.VARIABLE_NOT_AVAILABLE_ERROR)
        }
    }

    @PluginMethod
    fun setBackgroundJob(call: PluginCall) {
        if (!areGooglePlayServicesAvailable(call)) return

        val parameters = try {
            implementation.parseBackgroundJobParameters(call.getString("parameters") ?: "{}")
        } catch (e: Exception) {
            return sendError(call, HealthFitnessError.PARSING_PARAMETERS_ERROR)
        }
        implementation.backgroundParameters = parameters

        if (!implementation.isActivityVariable(parameters.variable) && SDK_INT >= 31 && !implementation.canScheduleExactAlarms()) {
            implementation.requestingExactAlarmPermission = true
            retainCall(call)
            context.startActivity(Intent(ACTION_REQUEST_SCHEDULE_EXACT_ALARM))
        } else {
            requestBackgroundJobPermissions(call)
        }
    }

    private fun requestBackgroundJobPermissions(call: PluginCall) {
        // POST_NOTIFICATIONS/ACTIVITY_RECOGNITION are requested unconditionally
        // regardless of SDK_INT - requesting a permission string that predates
        // the running OS version is a no-op that reports granted, so no
        // SDK-gated branching (or the empty-array hang that comes with it) is
        // needed here.
        requestPermissionForAlias(BACKGROUND_JOB_PERMISSION_ALIAS, call, "backgroundJobPermissionsCallback")
    }

    @PermissionCallback
    private fun backgroundJobPermissionsCallback(call: PluginCall) {
        if (getPermissionState(BACKGROUND_JOB_PERMISSION_ALIAS) != PermissionState.GRANTED) {
            sendError(call, HealthFitnessError.BACKGROUND_JOB_PERMISSIONS_DENIED_ERROR)
            return
        }
        requestReadDataBackgroundPermission(call)
    }

    private fun requestReadDataBackgroundPermission(call: PluginCall) {
        if (SDK_INT >= 35) {
            retainCall(call)
            implementation.healthConnectViewModel.requestReadDataBackgroundPermission(activity)
        } else {
            setBackgroundJobWithParameters(call)
        }
    }

    private fun setBackgroundJobWithParameters(call: PluginCall) {
        val parameters = implementation.backgroundParameters ?: return sendError(call, HealthFitnessError.REQUEST_PERMISSIONS_GENERAL_ERROR)
        implementation.healthConnectViewModel.setBackgroundJob(
            parameters,
            foregroundNotificationTitle,
            foregroundNotificationDescription,
            context,
            { call.resolve() },
            { sendError(call, it) }
        )
    }

    @PluginMethod
    fun deleteBackgroundJob(call: PluginCall) {
        if (!areGooglePlayServicesAvailable(call)) return

        val jobId = call.getString("id") ?: ""
        implementation.healthConnectViewModel.deleteBackgroundJob(
            jobId,
            context,
            { call.resolve() },
            { sendError(call, it) }
        )
    }

    @PluginMethod
    fun listBackgroundJobs(call: PluginCall) {
        if (!areGooglePlayServicesAvailable(call)) return

        implementation.healthConnectViewModel.listBackgroundJobs(
            // Resolves under "jobs" (matching ListBackgroundJobsResult.jobs and
            // the iOS bridge's call.resolve(["jobs": result])) rather than the
            // generic sendSuccess()'s "results" key, which every other caller
            // of sendSuccess() happens to match but this one doesn't.
            { call.resolve(JSObject().apply { put("jobs", implementation.gson.toJson(it)) }) },
            { sendError(call, it) }
        )
    }

    @PluginMethod
    fun updateBackgroundJob(call: PluginCall) {
        if (!areGooglePlayServicesAvailable(call)) return

        val parameters = try {
            implementation.parseUpdateBackgroundJobParameters(call.getString("parameters") ?: "{}")
        } catch (e: Exception) {
            return sendError(call, HealthFitnessError.PARSING_PARAMETERS_ERROR)
        }
        implementation.healthConnectViewModel.updateBackgroundJob(
            parameters,
            { call.resolve() },
            { sendError(call, it) }
        )
    }

    @PluginMethod
    fun disconnectFromHealthConnect(call: PluginCall) {
        if (!areGooglePlayServicesAvailable(call)) return

        implementation.healthConnectViewModel.disconnectFromHealthConnect(
            activity,
            { call.resolve() },
            { sendError(call, it) }
        )
    }

    @PluginMethod
    fun openHealthConnect(call: PluginCall) {
        if (!areGooglePlayServicesAvailable(call)) return

        implementation.healthConnectViewModel.openHealthConnect(
            context,
            { call.resolve() },
            { sendError(call, it) }
        )
    }

    // The exact-alarm settings screen is launched with a plain startActivity()
    // (not startActivityForResult()), so returning from it fires handleOnResume(),
    // not handleOnActivityResult() - matching the Cordova bridge, which checks
    // requestingExactAlarmPermission in onResume() rather than onActivityResult()
    // for the same reason.
    override fun handleOnResume() {
        super.handleOnResume()
        if (!implementation.requestingExactAlarmPermission) return
        implementation.requestingExactAlarmPermission = false

        val call = takeSavedCall() ?: return
        if (SDK_INT >= 31 && !implementation.canScheduleExactAlarms()) {
            sendError(call, HealthFitnessError.BACKGROUND_JOB_EXACT_ALARM_PERMISSION_DENIED_ERROR)
            return
        }
        requestBackgroundJobPermissions(call)
    }

    override fun handleOnActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.handleOnActivityResult(requestCode, resultCode, data)
        val call = takeSavedCall() ?: return

        data?.let {
            if (it.getBooleanExtra(EXTRA_CONTAINS_READ_DATA_BACKGROUND, false)) {
                val granted = it.getIntExtra(
                    EXTRA_RESULT_PERMISSION_KEY_GLOBAL,
                    EXTRA_RESULT_PERMISSION_DENIED
                ) == EXTRA_RESULT_PERMISSION_GRANTED
                if (granted) {
                    setBackgroundJobWithParameters(call)
                } else {
                    sendError(call, HealthFitnessError.BACKGROUND_JOB_READ_DATA_PERMISSION_DENIED)
                }
                return
            }
        }

        implementation.healthConnectViewModel.handleActivityResult(
            requestCode, resultCode, data,
            { call.resolve() },
            { error -> sendError(call, error) }
        )
    }

    private fun areGooglePlayServicesAvailable(call: PluginCall): Boolean {
        val googleApiAvailability = GoogleApiAvailability.getInstance()
        val status = googleApiAvailability.isGooglePlayServicesAvailable(activity)

        if (status != ConnectionResult.SUCCESS) {
            val result = if (googleApiAvailability.isUserResolvableError(status)) {
                googleApiAvailability.getErrorDialog(activity, status, 1)?.show()
                Pair(
                    formatErrorCode(HealthFitnessError.GOOGLE_SERVICES_RESOLVABLE_ERROR.code),
                    HealthFitnessError.GOOGLE_SERVICES_RESOLVABLE_ERROR.message
                )
            } else {
                Pair(
                    formatErrorCode(HealthFitnessError.GOOGLE_SERVICES_ERROR.code),
                    HealthFitnessError.GOOGLE_SERVICES_ERROR.message
                )
            }
            sendSuccess(call, result)
            return false
        }
        return true
    }

    private fun sendSuccess(call: PluginCall, result: Any? = null) {
        if (result == null) {
            call.resolve()
            return
        }
        val resultJson = implementation.gson.toJson(result)
        call.resolve(JSObject().apply { put("results", resultJson) })
    }

    private fun sendSuccessWithWarning(call: PluginCall, result: Any?, warning: OSHealthFitnessWarning) {
        val warningObject = JSObject().apply {
            put("code", warning.code)
            put("message", warning.message)
        }
        call.resolve(JSObject().apply {
            put("results", implementation.gson.toJson(result))
            put("warning", warningObject)
        })
    }

    private fun sendError(call: PluginCall, error: HealthFitnessError) {
        val code = formatErrorCode(error.code)
        val errorObject = JSObject().apply {
            put("code", code)
            put("message", error.message)
        }
        call.reject(error.message, code, null, errorObject)
    }

    private fun formatErrorCode(code: Int): String {
        val stringCode = Integer.toString(code)
        return ERROR_FORMAT_PREFIX + "0000$stringCode".substring(stringCode.length)
    }

    companion object {
        const val BACKGROUND_JOB_PERMISSION_ALIAS = "backgroundJob"
        private const val ERROR_FORMAT_PREFIX = "OS-PLUG-HLFT-"
    }
}
