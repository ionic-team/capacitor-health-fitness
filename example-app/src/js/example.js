import { HealthFitness } from '@capacitor/health-fitness';

function show(label, data) {
  document.getElementById('out').textContent = label + '\n' + JSON.stringify(data, null, 2);
}

// Real background job IDs are server-generated UUIDs (BackgroundJob.id in
// ion-android-healthfitness/ion-ios-healthfitness) - setBackgroundJob()'s own
// promise resolves void (matches the Cordova plugin's identical behavior, not
// a bug), so the only way to learn a job's real id is to look it up via
// listBackgroundJobs() afterward. The (variable, condition, value) triple is
// unique per job (enforced by a DB constraint), so it's a safe match key.
let lastBackgroundJobId = null;

function pickJobId(jobsJson) {
  try {
    // BackgroundJobsResponse wraps the list under "results" on both
    // platforms (Kotlin @SerializedName("results")/Swift results:) - not a
    // bare array.
    const parsed = JSON.parse(jobsJson);
    const jobs = Array.isArray(parsed) ? parsed : parsed.results ?? [];
    const match = jobs.find((j) => j.variable === 'STEPS' && j.condition === 'HIGHER' && j.value === 100) ?? jobs[0];
    return match ? match.id : null;
  } catch (e) {
    return null;
  }
}

// Computed at call time (not hardcoded) so queries actually cover recent data
// instead of a fixed past date range that goes stale. No milliseconds -
// ion-ios-healthfitness's Date(_ dateString:) parses with the fixed format
// "yyyy-MM-dd'T'HH:mm:ssZ" (no fractional seconds) and force-unwraps the
// result, so toISOString()'s default ".SSSZ" suffix crashes it.
function isoDaysFromNow(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('.')[0] + 'Z';
}

function bind(id, method, optionsOrFactory) {
  document.getElementById(id).addEventListener('click', async () => {
    document.getElementById('out').textContent = method + '() …';
    try {
      const options = typeof optionsOrFactory === 'function' ? optionsOrFactory() : optionsOrFactory;
      const result = await HealthFitness[method](options);
      show('✅ ' + method, result ?? {});

      if (method === 'listBackgroundJobs' && result?.jobs) {
        lastBackgroundJobId = pickJobId(result.jobs) ?? lastBackgroundJobId;
      } else if (method === 'setBackgroundJob') {
        const { jobs } = await HealthFitness.listBackgroundJobs();
        lastBackgroundJobId = pickJobId(jobs) ?? lastBackgroundJobId;
      }
    } catch (e) {
      show('❌ ' + method, { message: e.message, code: e.code });
    }
  });
}

bind('requestHealthPermissions', 'requestHealthPermissions', {
  customPermissions: '[]',
  allVariables: JSON.stringify({ IsActive: true, AccessType: 'READWRITE' }),
  fitnessVariables: JSON.stringify({ IsActive: false, AccessType: 'READWRITE' }),
  healthVariables: JSON.stringify({ IsActive: false, AccessType: 'READWRITE' }),
  profileVariables: JSON.stringify({ IsActive: false, AccessType: 'READWRITE' }),
  workoutVariables: '{}',
});

bind('getData', 'getData', () => ({
  parameters: JSON.stringify({
    Variable: 'STEPS',
    StartDate: isoDaysFromNow(-7),
    EndDate: isoDaysFromNow(1),
    TimeUnit: 'DAY',
    OperationType: 'SUM',
    TimeUnitLength: 1,
    AdvancedQueryReturnType: 'ALL_DATA',
    AdvancedQueryResultType: 'RAW_DATA',
  }),
}));

bind('getWorkoutData', 'getWorkoutData', () => ({
  parameters: JSON.stringify({
    WorkoutTypeVariables: [],
    StartDate: isoDaysFromNow(-7),
    EndDate: isoDaysFromNow(1),
  }),
}));

bind('writeData', 'writeData', { variable: 'WEIGHT', value: 75 });

bind('getLastRecord', 'getLastRecord', { variable: 'STEPS' });

bind('setBackgroundJob', 'setBackgroundJob', {
  parameters: JSON.stringify({
    Variable: 'STEPS',
    TimeUnit: 'DAY',
    TimeUnitGrouping: 1,
    NotificationFrequency: 'DAY',
    NotificationFrequencyGrouping: 1,
    JobFrequency: 'DAY',
    Condition: 'HIGHER',
    Value: 100,
    NotificationHeader: 'Test',
    NotificationBody: 'Test body',
  }),
});

bind('deleteBackgroundJob', 'deleteBackgroundJob', () => ({ id: lastBackgroundJobId ?? '1' }));

bind('listBackgroundJobs', 'listBackgroundJobs');

bind('updateBackgroundJob', 'updateBackgroundJob', () => ({
  parameters: JSON.stringify({
    Id: lastBackgroundJobId ?? '1',
    NotificationFrequency: 'DAY',
    NotificationFrequencyGrouping: 1,
    Condition: 'HIGHER',
    Value: 100,
    NotificationHeader: 'Test updated',
    NotificationBody: 'Test body',
    IsActive: 'true',
  }),
}));

bind('disconnectFromHealthConnect', 'disconnectFromHealthConnect');

bind('openHealthConnect', 'openHealthConnect');
