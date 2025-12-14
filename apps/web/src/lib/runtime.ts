import { Next } from "@mcrovero/effect-nextjs";
import { Effect, Layer } from "effect";
import { ProtocolLive } from "./api";
import { StatefulContext } from "./stateful-runtime";

const AppLive = Layer.empty;

const allLayers = Layer.mergeAll(Layer.effectContext(StatefulContext));

export const BasePage = Next.make("BasePage", AppLive);
export const BaseAction = Next.make("BaseAction", allLayers);
