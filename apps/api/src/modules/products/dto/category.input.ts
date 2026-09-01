import { Field, InputType, Int } from "@nestjs/graphql";
import { IsBoolean, IsInt, IsOptional, IsString } from "class-validator";

@InputType()
export class CreateCategoryInput {
  @Field(() => String)
  @IsString()
  name!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  code?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  color?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  parentId?: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

@InputType()
export class UpdateCategoryInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  name?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  code?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  color?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  parentId?: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
