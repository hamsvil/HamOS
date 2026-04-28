 
import { z } from 'zod';

export const BrowserEntrySchema = z.object({
  url: z.string(),
  title: z.string(),
  timestamp: z.number(),
});

export const BrowserDataSchema = z.array(BrowserEntrySchema);
