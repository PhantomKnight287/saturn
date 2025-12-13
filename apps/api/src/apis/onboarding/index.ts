import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "@effect/platform";

export const OnboardingAPI = HttpApi.make("OnboardingAPI").add(
    HttpApiGroup.make("onboarding").add(
        HttpApiEndpoint.post("post")`/api/onboarding`
        
    )
)