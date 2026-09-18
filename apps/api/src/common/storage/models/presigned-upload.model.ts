import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class PresignedUploadModel {
  @Field(() => String)
  uploadUrl!: string;

  @Field(() => String)
  publicUrl!: string;
}

@ObjectType()
export class PresignedPrivateUploadModel {
  @Field(() => String)
  uploadUrl!: string;

  @Field(() => String)
  objectKey!: string;
}
