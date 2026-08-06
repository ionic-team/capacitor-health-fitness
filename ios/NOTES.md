# iOS Setup Notes

The consuming app's `Info.plist` must declare the following (the plugin cannot
set these on the host app itself). These match the Cordova plugin's
`plugin.xml` `<config-file target="*-Info.plist">` entries exactly:

```xml
<key>NSHealthShareUsageDescription</key>
<string>App needs to share health data</string>
<key>NSHealthUpdateUsageDescription</key>
<string>App needs to use health data</string>
<key>UIBackgroundModes</key>
<array>
  <string>fetch</string>
  <string>processing</string>
</array>
<key>BGTaskSchedulerPermittedIdentifiers</key>
<array>
  <string>com.outsystems.health.default</string>
</array>
```

The app target also needs the **HealthKit** capability enabled, with the
following entitlements set to `true` (both Debug and Release):

- `com.apple.developer.healthkit`
- `com.apple.developer.healthkit.background-delivery`
- `com.apple.developer.healthkit.recalibrate-estimates`

and an empty array for `com.apple.developer.healthkit.access`.
