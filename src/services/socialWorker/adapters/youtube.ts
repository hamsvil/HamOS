import { AbstractPlatformAdapter } from './abstract-adapter';
import { Platform } from '../../../types/socialWorker';

export class YoutubeAdapter extends AbstractPlatformAdapter {
  platform: Platform = 'youtube';
}
