import { Field, Float, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class KpiTemplateTargetModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  kpiTemplateId!: string;

  @Field(() => Float)
  weightagePct!: number;

  @Field(() => String)
  targetName!: string;

  @Field(() => String)
  targetValueDefinition!: string;

  @Field(() => String)
  incentiveName!: string;
}

@ObjectType()
export class KpiTemplateModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  title!: string;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => String, { nullable: true })
  department?: string | null;

  @Field(() => String, { nullable: true })
  designation?: string | null;

  @Field(() => Boolean)
  active!: boolean;

  @Field(() => [KpiTemplateTargetModel])
  targets!: KpiTemplateTargetModel[];

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}
