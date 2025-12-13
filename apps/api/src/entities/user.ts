import { Context, Schema } from "effect";

export class User extends Schema.Class<User>("User")({
  id: Schema.NonEmptyString,
}) {}

export class CurrentUser extends Context.Tag("CurrentUser")<
  CurrentUser,
  User
>() {}
