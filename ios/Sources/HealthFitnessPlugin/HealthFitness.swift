import Foundation
import IONHealthFitnessLib

/**
 * Business logic - delegates directly to the shared `ion-ios-healthfitness`
 * native library, exactly like the Cordova plugin's OSHealthFitnessPlugin.swift
 * does. No Capacitor imports here.
 *
 * NOTE: fully-qualify `IONHealthFitnessLib.HealthFitnessPlugin` when referring
 * to the library's own type - it shares a bare name with this Capacitor
 * bridge's class, and both modules are imported into the bridge file.
 */
@objc public class HealthFitness: NSObject {
    let plugin = IONHealthFitnessLib.HealthFitnessPlugin()
}
