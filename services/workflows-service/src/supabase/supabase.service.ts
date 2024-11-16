import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ISupabaseService } from './types';

@Injectable()
export class SupabaseService implements ISupabaseService {
  private readonly supabaseClient: SupabaseClient;
  private readonly logger = new Logger(SupabaseService.name);

  constructor(private readonly configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseApiKey = this.configService.get<string>('TELEMETRY_SUPABASE_API_KEY');

    if (!supabaseUrl || !supabaseApiKey) {
      throw new Error('Supabase URL or API key is missing in configuration');
    }

    this.supabaseClient = createClient(supabaseUrl, supabaseApiKey);
    this.logger.log('Supabase client initialized.');
  }

  async logSignIn(url: string): Promise<void> {
    const { data, error } = await this.supabaseClient.from('logins').insert([{ url }]);

    if (error) {
      this.logger.error(`Failed to log sign-in: ${error.message}`);
    } else {
      this.logger.log(`Sign-in logged successfully: ${data}`);
    }
  }

  async logInfraData(infradata: JSON): Promise<void> {
    const { data, error } = await this.supabaseClient.from('infra').insert([infradata]);

    if (error) {
      this.logger.error(`Failed to log : ${error.message}`);
    } else {
      this.logger.log(`Sign-in logged successfully: ${data}`);
    }
  }  
  
}