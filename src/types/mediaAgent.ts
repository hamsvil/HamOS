export interface MediaPost {
  id: string;
  content: string;
  platform: string;
  schedule: string;
  status: 'pending' | 'posted' | 'failed';
  createdAt: string;
}

export interface Trend {
  topic: string;
  velocity: 'low' | 'medium' | 'high';
}
