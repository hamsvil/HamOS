import { hamEventBus } from './core/event_bus';
import { initAIWorker } from './engine/ai_worker';

export async function initHamSynapse() {
  // console.log('[HamSynapse] Initializing...');
  // Initialize workers or event listeners here
  initAIWorker();
}
