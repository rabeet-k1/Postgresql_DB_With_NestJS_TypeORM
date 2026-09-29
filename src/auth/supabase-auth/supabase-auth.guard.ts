import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify } from 'jose';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;
  constructor(private readonly configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL is not configured');
    }
    this.jwks = createRemoteJWKSet(
      new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`),
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No Token Provided!');
    }
    const token = authHeader.substring(7);
    try {
      const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: `${supabaseUrl}/auth/v1`,
        audience: 'authenticated',
      });
      request.user = payload;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid Token');
    }
  }
}
