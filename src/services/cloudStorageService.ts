/* eslint-disable no-useless-assignment */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export class CloudStorageService {
  private static instance: CloudStorageService;
  private client: SupabaseClient | null = null;

  private constructor() {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (url && key) {
      this.client = createClient(url, key);
    }
  }

  public static getInstance(): CloudStorageService {
    if (!CloudStorageService.instance) {
      CloudStorageService.instance = new CloudStorageService();
    }
    return CloudStorageService.instance;
  }

  public isConfigured(): boolean {
    return this.client !== null;
  }

  public async saveProject(project: { id: string, name: string, data: any, chatHistory: any }) {
    if (!this.client) throw new Error('Supabase not configured');
    
    const { data, error } = await this.client
      .from('projects')
      .upsert({
        id: project.id,
        name: project.name,
        data: project.data,
        chat_history: project.chatHistory,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
    return data;
  }

  public async getProjects() {
    if (!this.client) throw new Error('Supabase not configured');

    const { data, error } = await this.client
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  public async deleteProject(id: string) {
    if (!this.client) throw new Error('Supabase not configured');

    const { error } = await this.client
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}

export const cloudStorage = CloudStorageService.getInstance();
