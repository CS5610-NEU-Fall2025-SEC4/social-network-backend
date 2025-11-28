import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../users/types/user-roles.enum';

export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);
