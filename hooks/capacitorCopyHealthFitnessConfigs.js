const path = require("path");
const fs = require("fs");
const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');
const babel = require('@babel/core');

const projectRoot = process.env.CAPACITOR_ROOT_DIR;
const platform = process.env.CAPACITOR_PLATFORM_NAME;

if (!platform || !projectRoot) {
    throw new Error("OUTSYSTEMS_PLUGIN_ERROR: Missing required environment variables.");
}

const fileNamePrivacyPolicy = "HealthConnect_PrivacyPolicy.txt";

// Health permission constants
const READ = "Read";
const WRITE = "Write";
const READWRITE = "ReadWrite";

// Individual permissions mapping
const permissions = {
    HeartRate: {
        configKey: "HEART_RATE",
        readPermission: "android.permission.health.READ_HEART_RATE",
        writePermission: "android.permission.health.WRITE_HEART_RATE",
        configValue: undefined,
        wasSet: false
    },
    Steps: {
        configKey: "STEPS",
        readPermission: "android.permission.health.READ_STEPS",
        writePermission: "android.permission.health.WRITE_STEPS",
        configValue: undefined,
        wasSet: false
    },
    Weight: {
        configKey: "WEIGHT",
        readPermission: "android.permission.health.READ_WEIGHT",
        writePermission: "android.permission.health.WRITE_WEIGHT",
        configValue: undefined,
        wasSet: false
    },
    Height: {
        configKey: "HEIGHT",
        readPermission: "android.permission.health.READ_HEIGHT",
        writePermission: "android.permission.health.WRITE_HEIGHT",
        configValue: undefined,
        wasSet: false
    },
    CaloriesBurned: {
        configKey: "CALORIES_BURNED",
        readPermission: "android.permission.health.READ_TOTAL_CALORIES_BURNED",
        writePermission: "android.permission.health.WRITE_TOTAL_CALORIES_BURNED",
        configValue: undefined,
        wasSet: false
    },
    Sleep: {
        configKey: "SLEEP",
        readPermission: "android.permission.health.READ_SLEEP",
        writePermission: "android.permission.health.WRITE_SLEEP",
        configValue: undefined,
        wasSet: false
    },
    BloodPressure: {
        configKey: "BLOOD_PRESSURE",
        readPermission: "android.permission.health.READ_BLOOD_PRESSURE",
        writePermission: "android.permission.health.WRITE_BLOOD_PRESSURE",
        configValue: undefined,
        wasSet: false
    },
    BloodGlucose: {
        configKey: "BLOOD_GLUCOSE",
        readPermission: "android.permission.health.READ_BLOOD_GLUCOSE",
        writePermission: "android.permission.health.WRITE_BLOOD_GLUCOSE",
        configValue: undefined,
        wasSet: false
    },
    BodyFatPercentage: {
        configKey: "BODY_FAT_PERCENTAGE",
        readPermission: "android.permission.health.READ_BODY_FAT",
        writePermission: "android.permission.health.WRITE_BODY_FAT",
        configValue: undefined,
        wasSet: false
    },
    BasalMetabolicRate: {
        configKey: "BASAL_METABOLIC_RATE",
        readPermission: "android.permission.health.READ_BASAL_METABOLIC_RATE",
        writePermission: "android.permission.health.WRITE_BASAL_METABOLIC_RATE",
        configValue: undefined,
        wasSet: false
    },
    WalkingSpeed: {
        configKey: "WALKING_SPEED",
        readPermission: "android.permission.health.READ_SPEED",
        writePermission: "android.permission.health.WRITE_SPEED",
        configValue: undefined,
        wasSet: false
    },
    Distance: {
        configKey: "DISTANCE",
        readPermission: "android.permission.health.READ_DISTANCE",
        writePermission: "android.permission.health.WRITE_DISTANCE",
        configValue: undefined,
        wasSet: false
    },
    OxygenSaturation: {
        configKey: "OXYGEN_SATURATION",
        readPermission: "android.permission.health.READ_OXYGEN_SATURATION",
        writePermission: "android.permission.health.WRITE_OXYGEN_SATURATION",
        configValue: undefined,
        wasSet: false
    },
    BodyTemperature: {
        configKey: "BODY_TEMPERATURE",
        readPermission: "android.permission.health.READ_BODY_TEMPERATURE",
        writePermission: "android.permission.health.WRITE_BODY_TEMPERATURE",
        configValue: undefined,
        wasSet: false
    }
};

// Group permissions mapping
const groupPermissions = {
    AllVariables: {
        configKey: "ALL_VARIABLES",
        configValue: undefined,
        wasSet: false,
        groupVariables: []
    },
    FitnessVariables: {
        configKey: "FITNESS_VARIABLES",
        configValue: undefined,
        wasSet: false,
        groupVariables: ["Steps", "CaloriesBurned", "WalkingSpeed", "Distance"]
    },
    HealthVariables: {
        configKey: "HEALTH_VARIABLES",
        configValue: undefined,
        wasSet: false,
        groupVariables: ["HeartRate", "Sleep", "BloodPressure", "BloodGlucose", "OxygenSaturation", "BodyTemperature"]
    },
    ProfileVariables: {
        configKey: "PROFILE_VARIABLES",
        configValue: undefined,
        wasSet: false,
        groupVariables: ["Weight", "Height", "BodyFatPercentage", "BasalMetabolicRate"]
    }
};

function getAppDir() {
    return path.join(projectRoot, "android");
}

function getCapacitorConfig() {
    try {
        // Try to read capacitor.config.ts first, then capacitor.config.js, then capacitor.config.json
        const tsConfigPath = path.join(projectRoot, "capacitor.config.ts");
        const jsConfigPath = path.join(projectRoot, "capacitor.config.js");
        const jsonConfigPath = path.join(projectRoot, "capacitor.config.json");

        if (fs.existsSync(tsConfigPath)) {
            return parseConfigFile(tsConfigPath);
        } else if (fs.existsSync(jsConfigPath)) {
            return parseConfigFile(jsConfigPath);
        } else if (fs.existsSync(jsonConfigPath)) {
            const configContent = fs.readFileSync(jsonConfigPath, "utf8");
            return JSON.parse(configContent);
        }

        console.log("HealthFitness: No Capacitor config file found");
        return null;
    } catch (err) {
        console.log("HealthFitness: Could not read Capacitor config:", err.message);
        return null;
    }
}

function getHealthFitnessConfig() {
    try {
        const configPath = path.join(projectRoot, "android", "healthfitness.config.json");

        if (fs.existsSync(configPath)) {
            const configContent = fs.readFileSync(configPath, "utf8");
            return JSON.parse(configContent);
        }

        console.log("HealthFitness: No healthfitness.config.json file found");
        return null;
    } catch (err) {
        console.log("HealthFitness: Could not read healthfitness config:", err.message);
        return null;
    }
}

function parseConfigFile(configPath) {
    try {
        const configContent = fs.readFileSync(configPath, "utf8");

        const result = babel.transformSync(configContent, {
            presets: [
                ['@babel/preset-typescript', { allowNamespaces: true }],
                ['@babel/preset-env', { targets: { node: 'current' } }]
            ],
            filename: configPath
        });

        const moduleContext = {
            exports: {},
            module: { exports: {} }
        };

        const func = new Function('exports', 'module', 'require', result.code);
        func(moduleContext.exports, moduleContext.module, require);
        return moduleContext.exports.default || moduleContext.module.exports.default || moduleContext.module.exports || moduleContext.exports;
    } catch (err) {
        console.log("HealthFitness: Failed to parse config file:", err.message);
        return null;
    }
}

function getConfigValue(config, key) {
    if (!config || !config.permissions) {
        return undefined;
    }
    return config.permissions[key];
}

function getGroupConfigValue(config, key) {
    if (!config || !config.groupPermissions) {
        return undefined;
    }
    return config.groupPermissions[key];
}

function policyFileExists(platformPath) {
    const directoryPath = path.join(platformPath, 'assets/public');
    const searchStrings = fileNamePrivacyPolicy.split('.');

    try {
        if (!fs.existsSync(directoryPath)) {
            return false;
        }
        const files = fs.readdirSync(directoryPath);
        const matchingFiles = files.filter(fileName =>
            fileName.startsWith(searchStrings[0]) && fileName.endsWith(searchStrings[1])
        );
        return matchingFiles.length > 0;
    } catch (error) {
        console.error("HealthFitness: Error checking policy file existence:", error);
        return false;
    }
}

function addHealthConnectPermissions(config) {
    const parser = new DOMParser();

    // Get individual permission values from config
    for(const key in permissions){
        permissions[key].configValue = getConfigValue(config, permissions[key].configKey);
    }

    // Get group permission values from config
    for(const key in groupPermissions){
        groupPermissions[key].configValue = getGroupConfigValue(config, groupPermissions[key].configKey);
    }

    // Read AndroidManifest.xml
    const manifestFilePath = path.join(getAppDir(), 'app/src/main/AndroidManifest.xml');
    if (!fs.existsSync(manifestFilePath)) {
        console.log('HealthFitness: AndroidManifest.xml not found, skipping permission setup');
        return;
    }

    const manifestXmlString = fs.readFileSync(manifestFilePath, 'utf-8');
    const manifestXmlDoc = parser.parseFromString(manifestXmlString, 'text/xml');

    // Process individual permissions
    for(const key in permissions){
        let p = permissions[key];
        if (p.configValue == READWRITE || p.configValue == READ) {
            p.wasSet = true;
            addEntryToManifest(manifestXmlDoc, p.readPermission);
        }
        if (p.configValue == READWRITE || p.configValue == WRITE) {
            p.wasSet = true;
            addEntryToManifest(manifestXmlDoc, p.writePermission);
        }
    }

    // Process group permissions
    for(const key in groupPermissions){
        let p = groupPermissions[key];
        if (p.configValue == READWRITE || p.configValue == READ) {
            p.wasSet = true;
            p.groupVariables.forEach( v => {
                if (!permissions[v].wasSet) {
                    addEntryToManifest(manifestXmlDoc, permissions[v].readPermission);
                }
            });
        }
        if (p.configValue == READWRITE || p.configValue == WRITE) {
            p.wasSet = true;
            p.groupVariables.forEach( v => {
                if (!permissions[v].wasSet) {
                    addEntryToManifest(manifestXmlDoc, permissions[v].writePermission);
                }
            });
        }
    }

    // Process AllVariables
    if (groupPermissions.AllVariables.configValue == READWRITE || groupPermissions.AllVariables.configValue == READ) {
        processAllVariables(manifestXmlDoc, READ, Object.values(groupPermissions));
    }
    if (groupPermissions.AllVariables.configValue == READWRITE || groupPermissions.AllVariables.configValue == WRITE) {
        processAllVariables(manifestXmlDoc, WRITE, Object.values(groupPermissions));
    }

    // Check if any permissions were set
    let numberOfPermissions = Object.values(permissions).filter(p => p.configValue && p.configValue !== "").length +
                             Object.values(groupPermissions).filter(p => p.configValue && p.configValue !== "").length;

    // If no permissions set, add all by default
    if (numberOfPermissions == 0) {
        Object.values(permissions).forEach( p => {
            addEntryToManifest(manifestXmlDoc, p.readPermission);
            addEntryToManifest(manifestXmlDoc, p.writePermission);
        });
    }

    // Write updated files
    const serializer = new XMLSerializer();

    // Update AndroidManifest.xml
    const updatedManifestXmlString = serializer.serializeToString(manifestXmlDoc);
    fs.writeFileSync(manifestFilePath, updatedManifestXmlString, 'utf-8');

    console.log('HealthFitness: Health permissions configured successfully');
}

function processAllVariables(manifestXmlDoc, permissionOperation, groupPermissionsValues) {
    groupPermissionsValues.forEach(p => {
        p.groupVariables.forEach( v => {
            if (!p.wasSet && !permissions[v].wasSet) {
                addEntryToManifest(manifestXmlDoc, permissionOperation == READ ? permissions[v].readPermission : permissions[v].writePermission);
            }
        });
    });
}

function addEntryToManifest(manifestXmlDoc, permission) {
    // Check if permission already exists
    const existingPermissions = manifestXmlDoc.getElementsByTagName('uses-permission');
    for (let i = 0; i < existingPermissions.length; i++) {
        if (existingPermissions[i].getAttribute('android:name') === permission) {
            return; // Permission already exists
        }
    }

    const indent = manifestXmlDoc.createTextNode('    ');
    manifestXmlDoc.documentElement.appendChild(indent);

    const newPermission = manifestXmlDoc.createElement('uses-permission');
    newPermission.setAttribute('android:name', permission);
    manifestXmlDoc.documentElement.appendChild(newPermission);

    const newline = manifestXmlDoc.createTextNode('\n');
    manifestXmlDoc.documentElement.appendChild(newline);
}

function writePrivacyPolicyUrl(url) {
    const stringsPath = path.join(getAppDir(), 'app/src/main/res/values/strings.xml');
    if (!fs.existsSync(stringsPath)) {
        console.log('HealthFitness: strings.xml not found, skipping privacy policy URL setup');
        return;
    }

    try {
        const parser = new DOMParser();
        const stringsFile = fs.readFileSync(stringsPath, 'utf-8');
        const stringsDoc = parser.parseFromString(stringsFile, 'text/xml');

        const resourcesElement = stringsDoc.getElementsByTagName('resources')[0];
        if (!resourcesElement) {
            console.log('HealthFitness: No <resources> element found in strings.xml, skipping privacy policy URL setup');
            return;
        }

        const privacyPolicyElement = findOrCreateStringElement(stringsDoc, resourcesElement, 'privacy_policy_url', '');

        // Only update privacy policy URL if it's empty (meaning it was already set by some other tooling, or set to empty)
        if (!privacyPolicyElement.textContent || privacyPolicyElement.textContent.trim() === '') {
            privacyPolicyElement.textContent = url;

            const serializer = new XMLSerializer();
            let updatedXmlString = serializer.serializeToString(stringsDoc);
            updatedXmlString = updatedXmlString.replace(/<\/resources>$/, '\n</resources>\n');

            fs.writeFileSync(stringsPath, updatedXmlString, 'utf-8');

            console.log(`HealthFitness: Privacy policy URL set to: ${url}`);
        } else {
            console.log('HealthFitness: Privacy policy URL already set externally, skipping.');
        }
    } catch (xmlError) {
        console.error('HealthFitness: Error updating strings.xml:', xmlError.message);
    }
}

// Derives the privacy policy URL from capacitor.config.json's server.url +
// the fixed HealthConnect_PrivacyPolicy.txt filename - a fallback for apps
// that already serve their web content from a remote server and host that
// file there (matches the Cordova plugin's androidCopyPrivacyUrlEnv.js, which
// builds the same URL from config.xml's hostname/DefaultApplicationURL
// preferences). Most Capacitor apps bundle their web assets locally and have
// no server.url at all, so this can never resolve for them - they should set
// "privacyPolicyUrl" directly instead (see configureAndroid()).
function setPrivacyPolicyUrl(capacitorConfig) {
    const applicationNameUrl = capacitorConfig && capacitorConfig.server && capacitorConfig.server.url;
    if (!applicationNameUrl) {
        console.log('HealthFitness: Could not determine application URL for privacy policy construction.');
        return;
    }
    writePrivacyPolicyUrl(`${applicationNameUrl}${fileNamePrivacyPolicy}`);
}

// Matches the Cordova plugin's DisableBackgroundJobs preference: these 8
// permissions are added by default and can be opted out of, so (unlike the
// per-variable permissions above) they can't just live in the plugin's own
// static AndroidManifest.xml - Android manifest merging has no conditional
// mechanism for a plugin's own declarations.
function addBackgroundJobPermissionsToManifest(config) {
    if (getBooleanConfigValue(config, 'disableBackgroundJobs') === true) {
        console.log('HealthFitness: Background job permissions disabled via config, skipping.');
        return;
    }

    const manifestFilePath = path.join(getAppDir(), 'app/src/main/AndroidManifest.xml');
    if (!fs.existsSync(manifestFilePath)) {
        console.log('HealthFitness: AndroidManifest.xml not found, skipping background job permission setup');
        return;
    }

    const parser = new DOMParser();
    const manifestXmlString = fs.readFileSync(manifestFilePath, 'utf-8');
    const manifestXmlDoc = parser.parseFromString(manifestXmlString, 'text/xml');

    addEntryToManifest(manifestXmlDoc, 'android.permission.health.READ_HEALTH_DATA_IN_BACKGROUND');
    addEntryToManifest(manifestXmlDoc, 'android.permission.POST_NOTIFICATIONS');
    addEntryToManifest(manifestXmlDoc, 'android.permission.ACTIVITY_RECOGNITION');
    addEntryToManifest(manifestXmlDoc, 'com.google.android.gms.permission.ACTIVITY_RECOGNITION');
    addEntryToManifest(manifestXmlDoc, 'android.permission.FOREGROUND_SERVICE');
    addEntryToManifest(manifestXmlDoc, 'android.permission.FOREGROUND_SERVICE_HEALTH');
    addEntryToManifest(manifestXmlDoc, 'android.permission.HIGH_SAMPLING_RATE_SENSORS');
    addEntryToManifest(manifestXmlDoc, 'android.permission.SCHEDULE_EXACT_ALARM');

    const serializer = new XMLSerializer();
    fs.writeFileSync(manifestFilePath, serializer.serializeToString(manifestXmlDoc), 'utf-8');
    console.log('HealthFitness: Background job permissions configured successfully');
}

// Matches the Cordova plugin's DisableReadHealthDataHistory preference.
function addReadHealthDataHistoryPermissionToManifest(config) {
    if (getBooleanConfigValue(config, 'disableReadHealthDataHistory') === true) {
        console.log('HealthFitness: Read-health-data-history permission disabled via config, skipping.');
        return;
    }

    const manifestFilePath = path.join(getAppDir(), 'app/src/main/AndroidManifest.xml');
    if (!fs.existsSync(manifestFilePath)) {
        console.log('HealthFitness: AndroidManifest.xml not found, skipping read-history permission setup');
        return;
    }

    const parser = new DOMParser();
    const manifestXmlString = fs.readFileSync(manifestFilePath, 'utf-8');
    const manifestXmlDoc = parser.parseFromString(manifestXmlString, 'text/xml');

    addEntryToManifest(manifestXmlDoc, 'android.permission.health.READ_HEALTH_DATA_HISTORY');

    const serializer = new XMLSerializer();
    fs.writeFileSync(manifestFilePath, serializer.serializeToString(manifestXmlDoc), 'utf-8');
    console.log('HealthFitness: Read-health-data-history permission configured successfully');
}

function getBooleanConfigValue(config, key) {
    if (!config) {
        return undefined;
    }
    return config[key];
}

function findOrCreateStringElement(stringsDoc, resourcesElement, name, defaultValue) {
    const stringElements = stringsDoc.getElementsByTagName('string');

    for (let i = 0; i < stringElements.length; i++) {
        if (stringElements[i].getAttribute('name') === name) {
            return stringElements[i];
        }
    }

    const newStringElement = stringsDoc.createElement('string');
    newStringElement.setAttribute('name', name);
    newStringElement.textContent = defaultValue;

    const indent = stringsDoc.createTextNode('    ');
    resourcesElement.appendChild(indent);
    resourcesElement.appendChild(newStringElement);

    console.log(`HealthFitness: Created missing string element: ${name}`);
    return newStringElement;
}

// The Capacitor bridge (HealthFitnessPlugin.load()) reads these two string
// resources unconditionally at plugin-load time (app startup), not just when
// setBackgroundJob() is called - if they're missing, Resources.getString()
// throws and the app crashes on launch. Defaults match the Cordova plugin's
// androidCopyPreferencesPermissions.js copyNotificationContent() and
// BackgroundNotificationTitle/BackgroundNotificationDescription preferences,
// but unlike that hook (which owns a dedicated os_healthfitness_strings.xml
// it fully regenerates every run), this one writes into the app's shared
// strings.xml - so it only fills in a value when one isn't already set,
// matching setPrivacyPolicyUrl()'s convention for this same shared file.
function copyNotificationContent(config) {
    const stringsPath = path.join(getAppDir(), 'app/src/main/res/values/strings.xml');
    if (!fs.existsSync(stringsPath)) {
        console.log('HealthFitness: strings.xml not found, skipping notification content setup');
        return;
    }

    const notificationTitle = (config && config.backgroundNotificationTitle) || 'Measuring your health and fitness data.';
    const notificationDescription = (config && config.backgroundNotificationDescription) || 'The app is running in the background.';

    const parser = new DOMParser();
    const stringsFile = fs.readFileSync(stringsPath, 'utf-8');
    const stringsDoc = parser.parseFromString(stringsFile, 'text/xml');
    const resourcesElement = stringsDoc.getElementsByTagName('resources')[0];
    if (!resourcesElement) {
        console.log('HealthFitness: No <resources> element found in strings.xml, skipping notification content setup');
        return;
    }

    const titleElement = findOrCreateStringElement(stringsDoc, resourcesElement, 'background_notification_title', notificationTitle);
    const descriptionElement = findOrCreateStringElement(stringsDoc, resourcesElement, 'background_notification_description', notificationDescription);

    if (!titleElement.textContent || titleElement.textContent.trim() === '') {
        titleElement.textContent = notificationTitle;
    }
    if (!descriptionElement.textContent || descriptionElement.textContent.trim() === '') {
        descriptionElement.textContent = notificationDescription;
    }

    const serializer = new XMLSerializer();
    fs.writeFileSync(stringsPath, serializer.serializeToString(stringsDoc), 'utf-8');
    console.log('HealthFitness: Background notification content configured successfully');
}

function configureAndroid() {
    const capacitorConfig = getCapacitorConfig();
    const config = getHealthFitnessConfig();
    const appDir = getAppDir();
    const platformPath = path.join(appDir, 'app/src/main');
    const assetsPath = path.join(platformPath, `assets/public/${fileNamePrivacyPolicy}`);

    // Configure health permissions
    addHealthConnectPermissions(config);
    addBackgroundJobPermissionsToManifest(config);
    addReadHealthDataHistoryPermissionToManifest(config);
    copyNotificationContent(config);

    // HealthFitness.getPrivacyPolicyUrl() reads this resource unconditionally
    // on every requestHealthPermissions() call and throws
    // Resources.NotFoundException if it doesn't exist at all - so it must
    // always exist (even as an empty placeholder), regardless of whether a
    // real URL is derivable below. Matches the Cordova plugin's hook, which
    // always writes a placeholder value for the same reason.
    ensurePrivacyPolicyUrlStringExists();

    // Prefer a directly-configured URL - the only option that works for a
    // typical Capacitor app (bundled local assets, no live server.url). Fall
    // back to deriving one from capacitor.config.json's server.url for apps
    // that already serve their web content remotely (see setPrivacyPolicyUrl()).
    const directPrivacyPolicyUrl = config && config.privacyPolicyUrl;
    if (directPrivacyPolicyUrl) {
        writePrivacyPolicyUrl(directPrivacyPolicyUrl);
    } else if (fs.existsSync(assetsPath) || policyFileExists(platformPath)) {
        setPrivacyPolicyUrl(capacitorConfig);
    } else {
        console.log('HealthFitness: Privacy Policy URL not set - declare "privacyPolicyUrl" in android/healthfitness.config.json, or set capacitor.config.json\'s server.url and ship a HealthConnect_PrivacyPolicy.txt file.');
    }
}

function ensurePrivacyPolicyUrlStringExists() {
    const stringsPath = path.join(getAppDir(), 'app/src/main/res/values/strings.xml');
    if (!fs.existsSync(stringsPath)) {
        console.log('HealthFitness: strings.xml not found, skipping privacy policy URL placeholder setup');
        return;
    }

    const parser = new DOMParser();
    const stringsFile = fs.readFileSync(stringsPath, 'utf-8');
    const stringsDoc = parser.parseFromString(stringsFile, 'text/xml');
    const resourcesElement = stringsDoc.getElementsByTagName('resources')[0];
    if (!resourcesElement) {
        console.log('HealthFitness: No <resources> element found in strings.xml, skipping privacy policy URL placeholder setup');
        return;
    }

    findOrCreateStringElement(stringsDoc, resourcesElement, 'privacy_policy_url', '');

    const serializer = new XMLSerializer();
    fs.writeFileSync(stringsPath, serializer.serializeToString(stringsDoc), 'utf-8');
}

if (platform === "android") {
    configureAndroid();
}
