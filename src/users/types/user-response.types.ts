export interface UserResponse {
  username: string;
  email: string;
}
export interface CreateUserResponse {
  message: string;
  user: UserResponse;
}
export interface LoginResponse {
  message: string;
  access_token: string;
}

export interface AuthCheckResponse {
  authenticated: boolean;
  userId: string;
  username: string;
}
export interface JwtPayload {
  username: string;
  sub: string;
}
export interface ValidatedUser {
  userId: string;
  username: string;
  email: string;
}
