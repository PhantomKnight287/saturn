import { Schema } from "effect";

export class ProjectWithSameNameAlreadyExistsError extends Schema.TaggedError<ProjectWithSameNameAlreadyExistsError>()(
  "@saturn/projects/ProjectWithSameNameAlreadyExistsError",
  {},
) {
  override readonly _tag =
    "@saturn/projects/ProjectWithSameNameAlreadyExistsError";
}
