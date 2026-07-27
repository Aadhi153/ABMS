import { SetMetadata } from "@nestjs/common";
import type { Role } from "@abms/shared";

export const ROLES_KEY = "roles";

/** Restricts a resolver to the given roles. Admin always passes (enforced in RolesGuard). */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
