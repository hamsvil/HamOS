import { AbstractPlatformAdapter } from './abstract-adapter';
import { Platform } from '../../../types/socialWorker';

export class RedditAdapter extends AbstractPlatformAdapter {
  platform: Platform = 'reddit';
}
