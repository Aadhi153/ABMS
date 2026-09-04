import { BadRequestException, UseGuards } from "@nestjs/common";
import { Args, Int, Mutation, Resolver } from "@nestjs/graphql";
import * as crypto from "node:crypto";
import type { User } from "@abms/database";
import { Role } from "@abms/shared";
import { SessionAuthGuard } from "../guards/session-auth.guard";
import { RolesGuard } from "../guards/roles.guard";
import { Roles } from "../decorators/roles.decorator";
import { CurrentUser } from "../decorators/current-user.decorator";
import { StorageService } from "./storage.service";
import { PresignedUploadModel } from "./models/presigned-upload.model";

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function assertImageUpload(contentType: string, fileSizeBytes: number): string {
  const ext = ALLOWED_IMAGE_TYPES[contentType];
  if (!ext) {
    throw new BadRequestException("Only PNG, JPEG, or WEBP images are allowed");
  }
  if (fileSizeBytes <= 0 || fileSizeBytes > MAX_IMAGE_BYTES) {
    throw new BadRequestException("Image must be under 5MB");
  }
  return ext;
}

@Resolver()
@UseGuards(SessionAuthGuard, RolesGuard)
export class StorageResolver {
  constructor(private readonly storage: StorageService) {}

  @Mutation(() => PresignedUploadModel)
  async requestAvatarUploadUrl(
    @Args("contentType") contentType: string,
    @Args("fileSizeBytes", { type: () => Int }) fileSizeBytes: number,
    @CurrentUser() actor: User,
  ) {
    const ext = assertImageUpload(contentType, fileSizeBytes);
    const key = `avatars/${actor.id}/${crypto.randomUUID()}.${ext}`;
    return {
      uploadUrl: await this.storage.presignedPutUrl(key),
      publicUrl: this.storage.publicUrl(key),
    };
  }

  @Mutation(() => PresignedUploadModel)
  @Roles(Role.ADMIN)
  async requestOrgLogoUploadUrl(
    @Args("contentType") contentType: string,
    @Args("fileSizeBytes", { type: () => Int }) fileSizeBytes: number,
    @CurrentUser() actor: User,
  ) {
    const ext = assertImageUpload(contentType, fileSizeBytes);
    const key = `logos/${actor.organizationId}/${crypto.randomUUID()}.${ext}`;
    return {
      uploadUrl: await this.storage.presignedPutUrl(key),
      publicUrl: this.storage.publicUrl(key),
    };
  }
}
