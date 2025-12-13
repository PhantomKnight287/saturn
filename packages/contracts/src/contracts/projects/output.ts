import { Schema } from "effect";

export class ProjectEntity extends Schema.Class<ProjectEntity>("ProjectEntity")(
  {
    name: Schema.String,
    description: Schema.NullishOr(Schema.String),
    id: Schema.String,
    createdAt: Schema.Date,
    updatedAt: Schema.Date,
    organizationId: Schema.NullishOr(Schema.String),
  },
) {}
