import { Next } from "@mcrovero/effect-nextjs";
import { Layer } from "effect";

const AppLive = Layer.empty;
export const BasePage = Next.make("BasePage", AppLive);
