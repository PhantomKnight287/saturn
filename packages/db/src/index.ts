import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

// biome-ignore lint/style/noNonNullAssertion: environment variable is guaranteed to be set
export const db = drizzle(process.env.DATABASE_URL!, { schema });
