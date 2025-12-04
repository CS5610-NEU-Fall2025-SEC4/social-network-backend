import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '../users/types/user-roles.enum';
import { ValidatedUser } from '../users/types/user-response.types';

export class PermissionChecker {
  static canModifyResource(
    resourceAuthor: string,
    currentUser: ValidatedUser,
  ): boolean {
    return (
      resourceAuthor === currentUser.username ||
      currentUser.role === UserRole.ADMIN
    );
  }

  static ensureCanModify(
    resourceAuthor: string,
    currentUser: ValidatedUser,
    resourceName = 'resource',
  ): void {
    if (!this.canModifyResource(resourceAuthor, currentUser)) {
      throw new ForbiddenException(
        `You can only modify your own ${resourceName}`,
      );
    }
  }

  static isAdmin(user: ValidatedUser): boolean {
    return user.role === UserRole.ADMIN;
  }
}
