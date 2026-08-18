export interface RequestHealthPermissionsOptions {
  /**
   * JSON-encoded string: an array of individual variable permission
   * descriptors, e.g. `[{"Variable":"STEPS","AccessType":"READ"}]`. Use this
   * to request permission for specific variables not covered by (or instead
   * of) the broader groups below. `AccessType` is `READ`, `WRITE`, or
   * `READWRITE`.
   */
  customPermissions: string;
  /**
   * JSON-encoded string: `{"IsActive": boolean, "AccessType": "READ" | "WRITE" | "READWRITE"}`.
   * When `IsActive` is `true`, requests the given access to every
   * health/fitness variable the plugin supports.
   */
  allVariables: string;
  /**
   * JSON-encoded string: `{"IsActive": boolean, "AccessType": "READ" | "WRITE" | "READWRITE"}`.
   * Covers the "fitness" variable group: `STEPS`, `CALORIES_BURNED`,
   * `DISTANCE`, `WALKING_SPEED`.
   */
  fitnessVariables: string;
  /**
   * JSON-encoded string: `{"IsActive": boolean, "AccessType": "READ" | "WRITE" | "READWRITE"}`.
   * Covers the "health" variable group: `HEART_RATE`, `SLEEP`,
   * `BLOOD_PRESSURE`, `BLOOD_GLUCOSE`, `OXYGEN_SATURATION`,
   * `BODY_TEMPERATURE` (iOS also includes dietary water and dietary energy
   * consumed, which have no Android equivalent).
   */
  healthVariables: string;
  /**
   * JSON-encoded string: `{"IsActive": boolean, "AccessType": "READ" | "WRITE" | "READWRITE"}`.
   * Covers the "profile" variable group: `WEIGHT`, `HEIGHT`,
   * `BODY_FAT_PERCENTAGE`, `BASAL_METABOLIC_RATE`.
   */
  profileVariables: string;
  /**
   * JSON-encoded string: `{"IsActive": boolean, "AccessType": "READ" | "WRITE" | "READWRITE"}`.
   * Requests permission for HealthKit's workout type, needed for
   * `getWorkoutData()`.
   *
   * iOS only - not supported on Android (`getWorkoutData()` is iOS only;
   * this field is never read there).
   */
  workoutVariables: string;
}

export interface AdvancedQueryOptions {
  /**
   * JSON-encoded string containing the full query parameters object
   * (variable, startDate, endDate, timeUnit, operationType, timeUnitLength,
   * advancedQueryReturnType, advancedQueryResultType) - a single serialized
   * blob, not individual fields.
   */
  parameters: string;
}

export interface AdvancedQueryResult {
  /** JSON-encoded string containing the raw result blocks. */
  results?: string;
  /** JSON-encoded string containing chart-ready accelerator data points. */
  resultDataPoints?: string;
  /**
   * Present only on Android, and only when `getData()`'s `TimeUnit` parameter
   * is `MILLISECONDS` or `SECONDS` - both are deprecated on Health Connect,
   * so the query silently runs with `TimeUnit: 'MINUTE'` instead. `code` is
   * `OS-PLUG-HLFT-0405`.
   */
  warning?: { code: string; message: string };
}

export interface WorkoutAdvancedQueryOptions {
  /**
   * JSON-encoded string containing the full workout query parameters object
   * (workoutTypeVariables, startDate, endDate) - a single serialized blob.
   */
  parameters: string;
}

export interface WorkoutAdvancedQueryResult {
  /** JSON-encoded string containing the raw result blocks. */
  results: string;
}

export interface WriteDataOptions {
  /**
   * The health/fitness variable to write to.
   *
   * Android only accepts "profile" variables - `WEIGHT`, `HEIGHT`,
   * `BODY_FAT_PERCENTAGE`, `BASAL_METABOLIC_RATE` - any other variable
   * rejects with a "not a profile variable" error. iOS accepts most
   * variables (anything HealthKit represents as a quantity, which includes
   * the profile variables plus most fitness/health ones), except
   * category-based ones like `SLEEP`.
   */
  variable: string;
  /** The value to write, in the variable's native unit (e.g. kg for `WEIGHT`). */
  value: number;
}

export interface GetLastRecordOptions {
  /** The health/fitness variable to read, e.g. `STEPS`. */
  variable: string;
}

export interface SetBackgroundJobOptions {
  /**
   * JSON-encoded string containing the full background job parameters object
   * (variable, timeUnit, timeUnitGrouping, notificationFrequency,
   * notificationFrequencyGrouping, jobFrequency, condition, value,
   * notificationHeader, notificationBody) - a single serialized blob.
   */
  parameters: string;
}

export interface DeleteBackgroundJobOptions {
  /** The background job's id, from `listBackgroundJobs()`. */
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
   * notificationHeader, notificationBody, isActive) - a single serialized
   * blob.
   */
  parameters: string;
}

export interface HealthFitnessPlugin {
  /**
   * Requests the given HealthKit / Health Connect permissions.
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
   * query. Not implemented on Android, so calling it there rejects with
   * Capacitor's standard `UNIMPLEMENTED` error.
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
  setBackgroundJob(options: SetBackgroundJobOptions): Promise<void>;

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
   * Revokes all Health Connect permissions previously granted to the app.
   *
   * Android only - HealthKit has no equivalent API for an app to revoke its
   * own access.
   *
   * @since 1.0.0
   */
  disconnectFromHealthConnect(): Promise<void>;

  /**
   * Opens the Health Connect app. Rejects if Health Connect is not installed.
   *
   * Android only - HealthKit has no equivalent standalone app to open.
   *
   * @since 1.0.0
   */
  openHealthConnect(): Promise<void>;
}
