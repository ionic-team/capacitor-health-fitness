export interface RequestHealthPermissionsOptions {
  /**
   * JSON-encoded string (array of custom permission descriptors), matching the
   * existing Cordova plugin's wire format exactly.
   */
  customPermissions: string;
  /** JSON-encoded string (group permission descriptor). */
  allVariables: string;
  /** JSON-encoded string (group permission descriptor). */
  fitnessVariables: string;
  /** JSON-encoded string (group permission descriptor). */
  healthVariables: string;
  /** JSON-encoded string (group permission descriptor). */
  profileVariables: string;
  /**
   * JSON-encoded string (group permission descriptor).
   *
   * NOTE: not actually read on either platform in the current implementation
   * (Android never parses this argument; iOS reads an out-of-bounds index).
   * Preserved as-is for wire-format parity with the Cordova plugin.
   */
  workoutVariables: string;
}

export interface AdvancedQueryOptions {
  /**
   * JSON-encoded string containing the full query parameters object
   * (variable, startDate, endDate, timeUnit, operationType, timeUnitLength,
   * advancedQueryReturnType, advancedQueryResultType). Matches the existing
   * Cordova plugin's wire format exactly - a single serialized blob, not
   * individual fields.
   */
  parameters: string;
}

export interface AdvancedQueryResult {
  /** JSON-encoded string containing the raw result blocks. */
  results?: string;
  /** JSON-encoded string containing chart-ready accelerator data points. */
  resultDataPoints?: string;
  /** Present only when the query hit a deprecated-parameter path (e.g. TimeUnit). */
  warning?: { code: number; message: string };
}

export interface WorkoutAdvancedQueryOptions {
  /**
   * JSON-encoded string containing the full workout query parameters object
   * (workoutTypeVariables, startDate, endDate). Matches the existing Cordova
   * plugin's wire format exactly - a single serialized blob.
   */
  parameters: string;
}

export interface WorkoutAdvancedQueryResult {
  results: string;
}

export interface WriteDataOptions {
  variable: string;
  value: number;
}

export interface GetLastRecordOptions {
  variable: string;
}

export interface SetBackgroundJobOptions {
  /**
   * JSON-encoded string containing the full background job parameters object
   * (variable, timeUnit, timeUnitGrouping, notificationFrequency,
   * notificationFrequencyGrouping, jobFrequency, condition, value,
   * notificationHeader, notificationBody). Matches the existing Cordova
   * plugin's wire format exactly - a single serialized blob.
   */
  parameters: string;
}

export interface BackgroundJobResult {
  id: string;
}

export interface DeleteBackgroundJobOptions {
  id: string;
}

export interface ListBackgroundJobsResult {
  /** JSON-encoded string containing the list of background jobs. */
  jobs: string;
}

export interface UpdateBackgroundJobOptions {
  /**
   * JSON-encoded string containing the full update parameters object (id,
   * notificationFrequency, notificationFrequencyGrouping, condition, value,
   * notificationHeader, notificationBody, isActive). Matches the existing
   * Cordova plugin's wire format exactly - a single serialized blob.
   */
  parameters: string;
}

export interface HealthFitnessPlugin {
  /**
   * Requests the given HealthKit / Health Connect permissions.
   *
   * Named distinctly from Capacitor's own `requestPermissions()` convention
   * (which expects a `Promise<PermissionStatus>` from a declarative
   * `@CapacitorPlugin(permissions = [...])` alias list) - this method takes
   * pre-serialized JSON descriptors and resolves void, matching the existing
   * Cordova wire format instead.
   *
   * @since 1.0.0
   */
  requestHealthPermissions(options: RequestHealthPermissionsOptions): Promise<void>;

  /**
   * Performs an advanced query for a health/fitness variable over a date range.
   *
   * @since 1.0.0
   */
  getData(options: AdvancedQueryOptions): Promise<AdvancedQueryResult>;

  /**
   * Performs an advanced query for workout data over a date range.
   *
   * iOS only - the underlying native Android library has no workout-specific
   * query. Always rejects with `HealthFitnessError.OPERATION_NOT_ALLOWED`
   * (code 102) on Android.
   *
   * @since 1.0.0
   */
  getWorkoutData(options: WorkoutAdvancedQueryOptions): Promise<WorkoutAdvancedQueryResult>;

  /**
   * Writes a value to a health/fitness variable.
   *
   * @since 1.0.0
   */
  writeData(options: WriteDataOptions): Promise<void>;

  /**
   * Retrieves the last recorded value for a variable.
   *
   * @since 1.0.0
   */
  getLastRecord(options: GetLastRecordOptions): Promise<AdvancedQueryResult>;

  /**
   * Creates a background job that monitors a variable and notifies on a condition.
   *
   * @since 1.0.0
   */
  setBackgroundJob(options: SetBackgroundJobOptions): Promise<BackgroundJobResult>;

  /**
   * Deletes a background job by id.
   *
   * @since 1.0.0
   */
  deleteBackgroundJob(options: DeleteBackgroundJobOptions): Promise<void>;

  /**
   * Lists all existing background jobs.
   *
   * @since 1.0.0
   */
  listBackgroundJobs(): Promise<ListBackgroundJobsResult>;

  /**
   * Updates an existing background job's parameters.
   *
   * @since 1.0.0
   */
  updateBackgroundJob(options: UpdateBackgroundJobOptions): Promise<void>;

  /**
   * Android only (see the class-level note on the current iOS/Android parity gap).
   *
   * @since 1.0.0
   */
  disconnectFromHealthConnect(): Promise<void>;

  /**
   * Android only (see the class-level note on the current iOS/Android parity gap).
   *
   * @since 1.0.0
   */
  openHealthConnect(): Promise<void>;
}
