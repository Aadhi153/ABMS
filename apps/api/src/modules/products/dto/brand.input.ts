import { Field, InputType } from "@nestjs/graphql";
import { IsOptional, IsString } from "class-validator";

@InputType()
export class CreateBrandInput {
  @Field(() => String)
  @IsString()
  name!: string;
}

@InputType()
export class UpdateBrandInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  name?: string;
}
