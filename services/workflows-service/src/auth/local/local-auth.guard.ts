import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ExecutionContext } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  constructor(private readonly supabaseService: SupabaseService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const result = (await super.canActivate(context)) as boolean;
    const request = context.switchToHttp().getRequest();

    // Use the injected service
    if (result && request.user) {
      const fullUrl = request.protocol + '://' + request.get('host') + request.originalUrl;
      await this.supabaseService.logSignIn(fullUrl);
    }

    // Ensure the session is logged in (if using sessions)
    await super.logIn(request);

    return result;
  }
}
