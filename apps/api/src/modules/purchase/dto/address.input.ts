import { Field, InputType } from "@nestjs/graphql";
import { IsOptional, IsString } from "class-validator";

@InputType()
export class AddressSnapshotInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  line1?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  line2?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  city?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  state?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  country?: string;
}
