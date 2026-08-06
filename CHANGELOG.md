# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.1]

- iOS: `updateBackgroundJob` now rejects with `HealthKitErrors.backgroundJobNotFound`
  when the given id doesn't match an existing background job, instead of
  silently resolving as if it had succeeded. This is a deliberate divergence
  from the original pre-migration `OSHealthFitnessLib-iOS` (which had the same
  silent no-op), made to match Android's `updateBackgroundJob`, which already
  throws `HealthFitnessError.BACKGROUND_JOB_DOES_NOT_EXIST_ERROR` for the same
  case - Android was the correct behavior here, not the outlier.
- Initial release of the Capacitor Health & Fitness plugin, generated from the
  same API spec as `cordova-outsystems-health-fitness`, delegating to the
  shared `ion-android-healthfitness` and `ion-ios-healthfitness` native
  libraries.
- `requestPermissions` is named `requestHealthPermissions` on this plugin
  instead - it does not follow Capacitor's standard
  `requestPermissions()`/`Promise<PermissionStatus>` contract (it takes
  pre-serialized JSON permission descriptors and resolves void), so it
  intentionally does not override the framework's own reserved method name.
- `updateData` and `enableBackgroundJob` were dropped from the API surface -
  neither was implemented on Android or iOS in the underlying native
  libraries, matching the same removal in `cordova-outsystems-health-fitness`.
- `getWorkoutData` is iOS-only; `disconnectFromHealthConnect` and
  `openHealthConnect` are Android-only. These are genuine platform gaps in the
  underlying native libraries, not bugs - each method is simply not declared
  on the platform that doesn't support it, so calling it there rejects with
  Capacitor's own client-side `"UNIMPLEMENTED"` exception rather than a
  plugin-specific error.
- Fixed several gaps found while auditing this plugin against the Cordova
  plugin's actual behavior, so both now behave identically on well-formed
  *and* malformed input:
  - Android: added the Google Play Services availability gate to all methods
    (previously only `requestHealthPermissions` had it).
  - Android: `@CapacitorPlugin` now declares `requestCodes =
    [REQUEST_PERMISSION_ACTIVITY_KEY_HEALTH]` - the request code the shared
    `ion-android-healthfitness` library uses internally for
    `Activity.startActivityForResult()` in both `requestHealthPermissions()`
    and `requestReadDataBackgroundPermission()`. Without it,
    `Bridge.getPluginWithRequestCode()` can't find this plugin for that code,
    so the result never reaches `handleOnActivityResult()` and the call
    silently hangs after the permission prompt - masked on
    `requestHealthPermissions()` because Health Connect grants the permission
    at the OS level regardless of whether the app receives the result.
  - Android: `setBackgroundJob`'s `ACTIVITY_RECOGNITION`/`POST_NOTIFICATIONS`
    request (needed for activity-recognition-backed variables - `STEPS`,
    `HEART_RATE`, `CALORIES_BURNED`, `BLOOD_PRESSURE`,
    `BASAL_METABOLIC_RATE`, `WALKING_SPEED`, `DISTANCE`) now goes through
    Capacitor's `requestPermissionForAlias()` + `@PermissionCallback` instead
    of a raw `ActivityCompat.requestPermissions()` call with a manually
    tracked request code. The raw approach can never work on a
    `@CapacitorPlugin`-annotated class: unlike `onActivityResult()`,
    `Bridge.onRequestPermissionsResult()` only forwards to a plugin's
    (deprecated) `handleRequestPermissionsResult()` when that plugin uses the
    legacy `@NativePlugin` annotation - never for `@CapacitorPlugin`, no
    matter what `requestCodes` are declared - so `setBackgroundJob` hung
    silently after that permission prompt for every affected variable.
  - Android: `listBackgroundJobs` now resolves under the key `jobs` (matching
    `ListBackgroundJobsResult.jobs` and the iOS bridge's
    `call.resolve(["jobs": result])`), instead of the generic `sendSuccess()`
    helper's hardcoded `results` key - every other `sendSuccess()` caller
    happens to have a `results`-shaped return type, but this one doesn't, so
    `result.jobs` was always `undefined` on Android only.
  - Android: the exact-alarm permission continuation (after `setBackgroundJob`
    opens the system settings screen) now runs from `handleOnResume()` instead
    of `handleOnActivityResult()`, which never fires for the plain
    `startActivity()` call used to open that screen.
  - Android: `writeData` now rejects when `value` is missing, instead of
    silently writing `0.0`.
  - Android: `setBackgroundJob`/`updateBackgroundJob` now explicitly reject
    with `HealthFitnessError.PARSING_PARAMETERS_ERROR` on malformed
    `parameters` JSON, matching `getData`.
  - Android: `disableBackgroundJobs`/`disableReadHealthDataHistory` config
    flags added (`android/healthfitness.config.json`), matching the Cordova
    plugin's `DisableBackgroundJobs`/`DisableReadHealthDataHistory`
    preferences - these two permission groups are no longer unconditionally
    static in the plugin's manifest.
  - iOS: every rejection now carries the same structured `{code, message}`
    shape Android already used, instead of a bare message string.
  - Android: the `capacitor:sync:after` hook now also writes
    `background_notification_title` / `background_notification_description`
    to the consuming app's `strings.xml` (missed when the hook was first
    ported - the plugin reads these unconditionally at load time, so their
    absence crashed the app on startup, not just when `setBackgroundJob` was
    used).
  - Android: the hook now always ensures `privacy_policy_url` exists (as an
    empty placeholder when no real URL can be derived), instead of only
    creating it when a privacy-policy file is present. `getPrivacyPolicyUrl()`
    reads it unconditionally on every `requestHealthPermissions()` call, and
    its absence crashed with `Resources.NotFoundException`.
  - Android: added a direct `privacyPolicyUrl` key to
    `android/healthfitness.config.json` - the only option that works for a
    typical Capacitor app, since Health Connect opens the URL in a real
    browser and most apps bundle their web assets locally with no live
    `server.url`. The previous `capacitor.config.json` `server.url` +
    `HealthConnect_PrivacyPolicy.txt`-file derivation is now a fallback for
    apps that already serve their web content remotely.
