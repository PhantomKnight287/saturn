import { Schema } from "effect";

export const CreateDatabaseRequest = Schema.Struct({
  name: Schema.String.annotations({
    description: "The name of the database to create",
  }),
  organizationId: Schema.String.annotations({
    description: "The ID of the organization to create the database for",
  }),
});

export class CreateDatabaseResponse extends Schema.Class<CreateDatabaseResponse>(
  "CreateDatabaseResponse"
)({
  id: Schema.String,
  name: Schema.String,
  organizationId: Schema.String,
}) {}
