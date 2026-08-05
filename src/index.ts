import { registerPlugin } from '@capacitor/core';

import type { HealthFitnessPlugin } from './definitions';

const HealthFitness = registerPlugin<HealthFitnessPlugin>('HealthFitness', {
  web: () => import('./web').then((m) => new m.HealthFitnessWeb()),
});

export * from './definitions';
export { HealthFitness };
