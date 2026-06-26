import { Role } from '../../common/enums/role.enum';

export interface JwtPayload {
  sub: number;
  email: string;
  role: Role;
  customerId: number | null;
  jti: string;
  iat?: number;
  exp?: number;
}
