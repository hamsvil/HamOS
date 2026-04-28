import { AbstractPlatformAdapter } from './abstract-adapter';
import { Platform } from '../../../types/socialWorker';

export class ThreadsAdapter extends AbstractPlatformAdapter {
  platform: Platform = 'threads';
}
