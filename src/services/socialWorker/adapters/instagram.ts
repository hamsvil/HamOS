import { AbstractPlatformAdapter } from './abstract-adapter';
import { Platform } from '../../../types/socialWorker';

export class InstagramAdapter extends AbstractPlatformAdapter {
  platform: Platform = 'instagram';
}
