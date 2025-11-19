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

export interface ProfileResponse {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  bio?: string | null;
  location?: string | null;
  website?: string | null;
  interests?: string[];
  social?: { twitter?: string; github?: string; linkedin?: string };
  createdAt?: Date | string;
  updatedAt?: Date | string;
  followers?: UserRef[];
  following?: UserRef[];
  visibility?: {
    name?: boolean;
    bio?: boolean;
    location?: boolean;
    website?: boolean;
    interests?: boolean;
    social?: boolean;
  };
}

export interface UserRef {
  id: string;
  username: string;
}

export interface PublicProfileResponse {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  bio?: string | null;
  location?: string | null;
  website?: string | null;
  interests?: string[];
  social?: { twitter?: string; github?: string; linkedin?: string };
  followers?: UserRef[];
  following?: UserRef[];
  createdAt?: Date | string;
}
