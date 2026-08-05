export interface HealthFitnessPlugin {
  echo(options: { value: string }): Promise<{ value: string }>;
}
