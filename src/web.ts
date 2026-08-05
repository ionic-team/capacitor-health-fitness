import { WebPlugin } from '@capacitor/core';

import type { HealthFitnessPlugin } from './definitions';

export class HealthFitnessWeb extends WebPlugin implements HealthFitnessPlugin {
  async echo(options: { value: string }): Promise<{ value: string }> {
    console.log('ECHO', options);
    return options;
  }
}
