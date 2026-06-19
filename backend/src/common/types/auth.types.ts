import { RoleName } from '@prisma/client';

/**
 * Payload được encode trong JWT token
 */
export interface JwtPayload {
  sub: number; // user id
  username: string;
  email: string;
  role: RoleName;
  type: 'access' | 'refresh';
}

/**
 * User data sau khi được extract từ JWT
 * Được attach vào request. user
 */
export interface CurrentUserData {
  id: number;
  username: string;
  email: string;
  role: RoleName;
}

/**
 * Response khi login/register thành công
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

/**
 * Response đầy đủ sau khi auth
 */
export interface AuthResponse {
  user: {
    id: number;
    username: string;
    email: string;
    role: RoleName;
  };
  tokens: AuthTokens;
}
