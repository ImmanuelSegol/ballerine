import { AuthGuard } from '@nestjs/passport';
import { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/env';

export class LocalAuthGuard extends AuthGuard('local') {
  async canActivate(context: ExecutionContext) {
    const result = await super.canActivate(context);
    const request = context.switchToHttp().getRequest<Request>();
    await super.logIn(request);
    if (env.TELEMETRY_ENABLED && env.TELEMETRY_SUPABASE_URL && env.TELEMETRY_SUPABASE_API_KEY) {
      try {
        const SupabaseClient = createClient(
          env.TELEMETRY_SUPABASE_URL,
          env.TELEMETRY_SUPABASE_API_KEY,
          {
            db: { schema: 'public' },
          },
        );
        const fullUrl = `${request.protocol}://${request.get('Host')}${request.originalUrl}`;
        const { data: result, error } = await SupabaseClient.from('logins').insert([
          { url: fullUrl },
        ]);
        if (error) {
          console.error('Error inserting data:', error.message);
          return false;
        }
      } catch (err) {
        console.error('Unexpected error:', err);
      }
    }
    return result as boolean;
  }
}
