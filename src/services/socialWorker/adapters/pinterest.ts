import { AbstractPlatformAdapter } from './abstract-adapter';
import { Platform } from '../../../types/socialWorker';

export class PinterestAdapter extends AbstractPlatformAdapter {
  platform: Platform = 'pinterest';
}
