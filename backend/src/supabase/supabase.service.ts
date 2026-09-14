import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl =
      this.configService.get<string>('SUPABASE_URL') ||
      process.env.SUPABASE_URL ||
      'https://bvrjyzfeijxhfnxpmwgib.supabase.co';

    const supabaseKey =
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') ||
      this.configService.get<string>('SUPABASE_ANON_KEY') ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2cmp5emVpanhoZm54cG13Z2liIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2NTUzNDAsImV4cCI6MjEwMjIzMTM0MH0.iv2zBp-u8nwD7qLjXLC2nqIA_9iDIdeX3wdvHU-36wM';

    if (!supabaseUrl || !supabaseKey) {
      this.logger.error('Supabase URL and Key must be provided in environment variables.');
      throw new Error('Missing Supabase configuration');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }
}
