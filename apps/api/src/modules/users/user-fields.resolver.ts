import { Parent, ResolveField, Resolver } from "@nestjs/graphql";
import type { User } from "@abms/database";
import { UserModel } from "./models/user.model";

/**
 * Deliberately unguarded and separate from UsersResolver (which is
 * @Roles(ADMIN)-gated at the class level) — this only formats a field on a
 * User object the caller already had permission to receive from whichever
 * query/mutation produced it (me, login, updateMyProfile, users, ...).
 */
@Resolver(() => UserModel)
export class UserFieldsResolver {
  @ResolveField(() => String, { nullable: true })
  notificationCategoryPrefs(@Parent() user: User): string | null {
    const value = (user as User & { notificationCategoryPrefs?: unknown }).notificationCategoryPrefs;
    return value ? JSON.stringify(value) : null;
  }
}
