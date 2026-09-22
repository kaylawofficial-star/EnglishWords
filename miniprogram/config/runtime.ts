import { DEMO_TEXTBOOK_ID } from '../../shared/fixtures/demo-content';

export type AppEnvironment = 'local' | 'pilot' | 'production';
export type ContentMode = 'local' | 'cloud';

export interface RuntimeConfig {
  environment: AppEnvironment;
  contentMode: ContentMode;
  textbookId: string;
  cloudEnvironmentId: string;
}

export const runtimeConfig: RuntimeConfig = {
  environment: 'local',
  contentMode: 'local',
  textbookId: DEMO_TEXTBOOK_ID,
  cloudEnvironmentId: '',
};
