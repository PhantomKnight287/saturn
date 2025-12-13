import { ProjectsRPCContract } from "@saturn/contracts";
import { Effect, Layer } from "effect";
import { BetterAuth } from "src/services/better-auth.js";
import { ProjectsService } from "./service.js";

export const ProjectsLive = ProjectsRPCContract.toLayer(
  Effect.gen(function* () {
    const projectsService = yield* ProjectsService;
    return {
      CreateProject: (input, { headers }) =>
        projectsService.CreateProject(input, headers)(),
    };
  })
)
.pipe(Layer.provide(ProjectsService.Default), Layer.provide(BetterAuth.Default));
