import { AbstractPlatformAdapter } from './abstract-adapter';
import { Platform } from '../../../types/socialWorker';

export class TiktokAdapter extends AbstractPlatformAdapter {
  platform: Platform = 'tiktok';
}
