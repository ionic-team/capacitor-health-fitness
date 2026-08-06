# Android Setup Notes

This plugin ships a `capacitor:sync:after` hook (`hooks/capacitorCopyHealthFitnessConfigs.js`)
that runs on every `npx cap sync`/`npx cap update` and edits the consuming
app's generated `android/app/src/main/AndroidManifest.xml` to declare the
Health Connect permissions the app actually needs. Health Connect permissions
cannot be requested at runtime the way Capacitor's `plugins.<Name>` config
values are read - they must exist in the manifest at build time - hence the
sync-time hook instead of `getConfig()`.

## Declaring permissions

Create `android/healthfitness.config.json` in the consuming app (next to
`android/app/`):

```json
{
  "permissions": {
    "HEART_RATE": "Read",
    "STEPS": "ReadWrite",
    "WEIGHT": "Write",
    "HEIGHT": "Read",
    "CALORIES_BURNED": "Read",
    "SLEEP": "Read",
    "BLOOD_PRESSURE": "Read",
    "BLOOD_GLUCOSE": "Read",
    "BODY_FAT_PERCENTAGE": "Read",
    "BASAL_METABOLIC_RATE": "Read",
    "WALKING_SPEED": "Read",
    "DISTANCE": "Read",
    "OXYGEN_SATURATION": "Read",
    "BODY_TEMPERATURE": "Read"
  },
  "groupPermissions": {
    "ALL_VARIABLES": "ReadWrite",
    "FITNESS_VARIABLES": "Read",
    "HEALTH_VARIABLES": "Read",
    "PROFILE_VARIABLES": "Read"
  }
}
```

Each value is one of `Read`, `Write`, or `ReadWrite`. Both files are optional
per key - only declare what the app actually uses. If neither
`healthfitness.config.json` nor any key in it is present, the hook falls back
to declaring **every** Health Connect permission (matching the plugin's
previous, non-configurable behavior) so a consuming app that skips
configuration still works, at the cost of declaring more permissions than it
needs.

## Background jobs and read-history permissions

Two more permission groups are on by default and can be opted out of via
top-level flags in `android/healthfitness.config.json`, matching the Cordova
plugin's `DisableBackgroundJobs` / `DisableReadHealthDataHistory` preferences:

```json
{
  "disableBackgroundJobs": false,
  "disableReadHealthDataHistory": false
}
```

- `disableBackgroundJobs: true` skips `READ_HEALTH_DATA_IN_BACKGROUND`,
  `POST_NOTIFICATIONS`, `ACTIVITY_RECOGNITION` (both the platform and Google
  Play Services variants), `FOREGROUND_SERVICE`,
  `FOREGROUND_SERVICE_HEALTH`, `HIGH_SAMPLING_RATE_SENSORS`, and
  `SCHEDULE_EXACT_ALARM` - i.e. everything `setBackgroundJob` needs.
- `disableReadHealthDataHistory: true` skips `READ_HEALTH_DATA_HISTORY` (lets
  the app read data older than 30 days before the first Health Connect grant).

## Background notification content

`setBackgroundJob`'s foreground notification title/description are read from
the consuming app's `res/values/strings.xml` (`background_notification_title`
/ `background_notification_description`) - and read unconditionally at plugin
load time (app startup), not just when a background job is actually set, so
a missing value crashes the app immediately rather than only when the feature
is used. The hook creates both with sensible defaults if missing, overridable
via `android/healthfitness.config.json`, matching the Cordova plugin's
`BackgroundNotificationTitle` / `BackgroundNotificationDescription`
preferences:

```json
{
  "backgroundNotificationTitle": "Health & Fitness",
  "backgroundNotificationDescription": "Monitoring your health and fitness data in the background."
}
```

## Privacy policy URL

Health Connect requires a privacy policy URL for apps requesting these
permissions - `requestHealthPermissions()` rejects without one, and Health
Connect opens the URL directly in a browser from its own permissions screen,
so it must be a real, publicly-reachable `https://` link, not a bundled local
file. The simplest way to set it is directly in
`android/healthfitness.config.json`:

```json
{
  "privacyPolicyUrl": "https://example.com/privacy-policy"
}
```

If `privacyPolicyUrl` isn't set, the hook falls back to deriving one from
`capacitor.config.json`'s `server.url` + a fixed `HealthConnect_PrivacyPolicy.txt`
filename - only useful for apps that already serve their web content from a
remote server and host that file there (`www/HealthConnect_PrivacyPolicy.txt`,
copied to `android/app/src/main/assets/public/` by `cap sync`). Most Capacitor
apps bundle their web assets locally and have no `server.url`, so this
fallback will never resolve for them - use `privacyPolicyUrl` directly
instead.

Either way, if `strings.xml` already has a non-empty `privacy_policy_url`
(e.g. set by a separate build step), the hook leaves it untouched.
