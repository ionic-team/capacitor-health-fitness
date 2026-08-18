import Foundation
import Capacitor
import IONHealthFitnessLib

/**
 * Thin Capacitor bridge - argument extraction and result formatting only.
 * All business logic lives in HealthFitness.swift, which delegates to the
 * shared ion-ios-healthfitness native library (same as the Cordova plugin).
 *
 * NOTE: iOS intentionally implements only 9 of the 11 methods in the shared
 * API spec (disconnectFromHealthConnect, openHealthConnect are Android-only)
 * - this mirrors the Cordova plugin's actual current behavior exactly.
 */
@objc(HealthFitnessPlugin)
public class HealthFitnessPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "HealthFitnessPlugin"
    public let jsName = "HealthFitness"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestHealthPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getData", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getWorkoutData", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "writeData", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getLastRecord", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setBackgroundJob", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "deleteBackgroundJob", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "listBackgroundJobs", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "updateBackgroundJob", returnType: CAPPluginReturnPromise),
    ]

    private let implementation = HealthFitness()

    // Named requestHealthPermissions rather than the framework's own
    // requestPermissions() - this plugin uses a single custom combined
    // init+request call with pre-serialized JSON descriptors and resolves
    // void, unlike Capacitor's declarative permissions-alias contract
    // (Promise<PermissionStatus>), so it deliberately does not override
    // CAPPlugin's base method.
    @objc func requestHealthPermissions(_ call: CAPPluginCall) {
        let customPermissions = call.getString("customPermissions") ?? ""
        let allVariables = call.getString("allVariables") ?? ""
        let fitnessVariables = call.getString("fitnessVariables") ?? ""
        let healthVariables = call.getString("healthVariables") ?? ""
        let profileVariables = call.getString("profileVariables") ?? ""
        let workoutVariables = call.getString("workoutVariables") ?? ""
        let variable = VariableStruct(
            allVariables: allVariables,
            fitnessVariables: fitnessVariables,
            healthVariables: healthVariables,
            profileVariables: profileVariables,
            workoutVariables: workoutVariables
        )

        implementation.plugin.requestPermissions(customPermissions: customPermissions, variable: variable) { authorized, error in
            if !authorized {
                self.sendError(call, error, fallback: "Permission request failed.")
            } else {
                call.resolve()
            }
        }
    }

    // Builds the same structured {code, message} error shape the Android
    // bridge's sendError produces, instead of a bare message string.
    private func sendError(_ call: CAPPluginCall, _ error: Error?, fallback: String = "An error occurred.") {
        let message = error?.localizedDescription ?? fallback
        let codeString = (error as NSError?).map { "OS-PLUG-HLFT-" + String(format: "%04d", $0.code) }
        call.reject(message, codeString, error, [
            "code": codeString ?? "",
            "message": message,
        ])
    }

    private func sendError(_ call: CAPPluginCall, _ error: HealthKitErrors) {
        sendError(call, error as Error)
    }

    @objc func writeData(_ call: CAPPluginCall) {
        guard let variable = call.getString("variable") else {
            return sendError(call, .badParameterType)
        }
        guard let value = call.getDouble("value") else {
            return sendError(call, .badParameterType)
        }

        implementation.plugin.writeData(variable: variable, value: value) { success, error in
            if error != nil {
                self.sendError(call, error, fallback: "Failed to write data.")
            } else if success {
                call.resolve()
            }
        }
    }

    @objc func updateBackgroundJob(_ call: CAPPluginCall) {
        let queryParameters = call.getString("parameters") ?? ""
        guard let parameters = parseUpdateParameters(parameters: queryParameters) else {
            return sendError(call, .badParameterType)
        }

        implementation.plugin.updateBackgroundJob(
            id: parameters.id,
            notificationFrequency: (parameters.notificationFrequency, parameters.notificationFrequencyGrouping),
            condition: parameters.condition,
            value: parameters.value,
            notificationText: (parameters.notificationHeader, parameters.notificationBody),
            isActive: parameters.isActive
        ) { success, error in
            if !success {
                self.sendError(call, error, fallback: "Failed to update background job.")
            } else {
                call.resolve()
            }
        }
    }

    // Matches the Cordova plugin exactly: callers send Id/IsActive as
    // strings here (unlike setBackgroundJob's payload), so this can't go
    // through BackgroundJobParameters' synthesized Codable decode() - it
    // needs the same manual JSON parsing the Cordova bridge uses.
    private func parseUpdateParameters(parameters: String) -> BackgroundJobParameters? {
        guard let data = parameters.data(using: .utf8),
              let jsonData = try? JSONSerialization.jsonObject(with: data, options: .allowFragments) as? [String: Any] else {
            return nil
        }

        let id = Int64(jsonData["Id"] as? String ?? "")
        let notificationFrequency = jsonData["NotificationFrequency"] as? String
        let notificationFrequencyGrouping = jsonData["NotificationFrequencyGrouping"] as? Int
        let condition = jsonData["Condition"] as? String
        let value = jsonData["Value"] as? Double
        let notificationHeader = jsonData["NotificationHeader"] as? String
        let notificationBody = jsonData["NotificationBody"] as? String
        var isActive: Bool?
        let activeString = jsonData["IsActive"] as? String ?? ""
        if activeString != "" {
            isActive = activeString.lowercased() == "true"
        }

        return BackgroundJobParameters(
            id: id,
            variable: nil,
            timeUnit: nil,
            timeUnitGrouping: nil,
            notificationFrequency: notificationFrequency,
            notificationFrequencyGrouping: notificationFrequencyGrouping,
            jobFrequency: nil,
            condition: condition,
            value: value,
            notificationHeader: notificationHeader,
            notificationBody: notificationBody,
            isActive: isActive
        )
    }

    @objc func getLastRecord(_ call: CAPPluginCall) {
        let variable = call.getString("variable") ?? ""

        implementation.plugin.advancedQuery(
            variable: variable,
            date: (Date.distantPast, Date()),
            timeUnit: "",
            operationType: "MOST_RECENT",
            mostRecent: true,
            onlyFilledBlocks: true,
            resultType: .rawDataType,
            timeUnitLength: 1
        ) { success, result, error in
            if success {
                call.resolve(["results": result ?? ""])
            } else {
                self.sendError(call, error, fallback: "Failed to get last record.")
            }
        }
    }

    @objc func deleteBackgroundJob(_ call: CAPPluginCall) {
        let id = call.getString("id") ?? ""

        implementation.plugin.deleteBackgroundJobs(id: id) { error in
            if let error = error {
                self.sendError(call, error, fallback: "Failed to delete background job.")
            } else {
                call.resolve()
            }
        }
    }

    @objc func listBackgroundJobs(_ call: CAPPluginCall) {
        let result = implementation.plugin.listBackgroundJobs()
        call.resolve(["jobs": result])
    }

    @objc func setBackgroundJob(_ call: CAPPluginCall) {
        let queryParameters = call.getString("parameters") ?? ""
        guard let params = queryParameters.decode() as BackgroundJobParameters? else {
            return sendError(call, .badParameterType)
        }

        let variable = params.variable ?? ""
        let timeUnit = params.timeUnit ?? ""
        let timeUnitGrouping = params.timeUnitGrouping ?? 0
        let notificationFrequency = params.notificationFrequency ?? ""
        let notificationFrequencyGrouping = params.notificationFrequencyGrouping ?? 0
        let jobFrequency = params.jobFrequency ?? ""
        let condition = params.condition ?? ""
        let value = params.value ?? 0
        let notificationHeader = params.notificationHeader ?? ""
        let notificationBody = params.notificationBody ?? ""

        implementation.plugin.setBackgroundJob(
            variable: variable,
            timeUnit: (timeUnit, timeUnitGrouping),
            notificationFrequency: (notificationFrequency, notificationFrequencyGrouping),
            jobFrequency: jobFrequency,
            condition: condition,
            value: value,
            notificationText: (notificationHeader, notificationBody)
        ) { success, result, error in
            if success {
                call.resolve(["id": result ?? ""])
            } else {
                self.sendError(call, error, fallback: "Failed to set background job.")
            }
        }
    }

    @objc func getData(_ call: CAPPluginCall) {
        let queryParameters = call.getString("parameters") ?? ""
        guard let params = queryParameters.decode() as AdvancedQueryParameters? else {
            return sendError(call, .badParameterType)
        }

        let variable = params.variable ?? ""
        let startDate = params.startDate ?? ""
        let endDate = params.endDate ?? ""
        let timeUnit = params.timeUnit ?? ""
        let operationType = params.operationType ?? ""
        let timeUnitLength = params.timeUnitLength ?? 1
        let onlyFilledBlocks = params.advancedQueryReturnType == AdvancedQueryReturnTypeEnum.removeEmptyDataBlocks.rawValue
        let resultType = AdvancedQueryResultType.get(with: params.advancedQueryResultType ?? "")

        implementation.plugin.advancedQuery(
            variable: variable,
            date: (Date(startDate), Date(endDate)),
            timeUnit: timeUnit,
            operationType: operationType,
            mostRecent: false,
            onlyFilledBlocks: onlyFilledBlocks,
            resultType: resultType,
            timeUnitLength: timeUnitLength
        ) { success, result, error in
            if success {
                call.resolve(["results": result ?? ""])
            } else {
                self.sendError(call, error, fallback: "Failed to get data.")
            }
        }
    }

    @objc func getWorkoutData(_ call: CAPPluginCall) {
        let queryParameters = call.getString("parameters") ?? ""
        guard let params = queryParameters.decode() as WorkoutAdvancedQueryParameters? else {
            return sendError(call, .badParameterType)
        }
        let startDate = Date(params.startDate ?? "")
        let endDate = Date(params.endDate ?? "")

        implementation.plugin.workoutAdvancedQuery(
            workoutTypeVariableDictionary: params.workoutTypeVariableDictionary,
            date: (startDate, endDate)
        ) { success, result, error in
            if success {
                call.resolve(["results": result ?? ""])
            } else {
                self.sendError(call, error, fallback: "Failed to get workout data.")
            }
        }
    }
}
