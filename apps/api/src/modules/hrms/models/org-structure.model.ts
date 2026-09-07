import { Field, Float, Int, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class DepartmentModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  code?: string | null;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => Boolean)
  active!: boolean;

  @Field(() => Int)
  employeeCount!: number;
}

@ObjectType()
export class DesignationModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  code?: string | null;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => Boolean)
  active!: boolean;

  @Field(() => Int)
  employeeCount!: number;
}

@ObjectType()
export class GradeModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  code?: string | null;

  @Field(() => Int, { nullable: true })
  level?: number | null;

  @Field(() => Float, { nullable: true })
  minSalary?: number | null;

  @Field(() => Float, { nullable: true })
  maxSalary?: number | null;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => Boolean)
  active!: boolean;

  @Field(() => Int)
  employeeCount!: number;
}
