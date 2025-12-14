import { Schema } from "effect";

export class CreateProjectInput extends Schema.Class<CreateProjectInput>(
  "CreateProjectInput",
)({
  name: Schema.String,
  description: Schema.String.pipe(Schema.optional),
  organizationId: Schema.String,
}) {}

export class ListProjectsInput extends Schema.Class<ListProjectsInput>(
  "ListProjectInput",
)({
  organizationId: Schema.String,
}) {}
