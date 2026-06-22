import type { Request } from 'express';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

export type AuthRequest = Request & { user: JwtPayload };
