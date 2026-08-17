import { WebPlugin } from '@capacitor/core';

import type {
  AdvancedQueryOptions,
  AdvancedQueryResult,
  DeleteBackgroundJobOptions,
  GetLastRecordOptions,
  HealthFitnessPlugin,
  ListBackgroundJobsResult,
  RequestHealthPermissionsOptions,
  SetBackgroundJobOptions,
  UpdateBackgroundJobOptions,
  WorkoutAdvancedQueryOptions,
  WorkoutAdvancedQueryResult,
  WriteDataOptions,
} from './definitions';

// HealthKit and Health Connect have no web equivalent, so every method here
// throws unimplemented() rather than providing a partial/mocked implementation.
export class HealthFitnessWeb extends WebPlugin implements HealthFitnessPlugin {
  async requestHealthPermissions(_options: RequestHealthPermissionsOptions): Promise<void> {
    throw this.unimplemented('Not implemented on web.');
  }

  async getData(_options: AdvancedQueryOptions): Promise<AdvancedQueryResult> {
    throw this.unimplemented('Not implemented on web.');
  }

  async getWorkoutData(_options: WorkoutAdvancedQueryOptions): Promise<WorkoutAdvancedQueryResult> {
    throw this.unimplemented('Not implemented on web.');
  }

  async writeData(_options: WriteDataOptions): Promise<void> {
    throw this.unimplemented('Not implemented on web.');
  }

  async getLastRecord(_options: GetLastRecordOptions): Promise<AdvancedQueryResult> {
    throw this.unimplemented('Not implemented on web.');
  }

  async setBackgroundJob(_options: SetBackgroundJobOptions): Promise<void> {
    throw this.unimplemented('Not implemented on web.');
  }

  async deleteBackgroundJob(_options: DeleteBackgroundJobOptions): Promise<void> {
    throw this.unimplemented('Not implemented on web.');
  }

  async listBackgroundJobs(): Promise<ListBackgroundJobsResult> {
    throw this.unimplemented('Not implemented on web.');
  }

  async updateBackgroundJob(_options: UpdateBackgroundJobOptions): Promise<void> {
    throw this.unimplemented('Not implemented on web.');
  }

  async disconnectFromHealthConnect(): Promise<void> {
    throw this.unimplemented('Not implemented on web.');
  }

  async openHealthConnect(): Promise<void> {
    throw this.unimplemented('Not implemented on web.');
  }
}
