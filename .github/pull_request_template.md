## ⚠️ Base branch check

> [!IMPORTANT]
> This PR **must target `staging`**, not `main`. Double-check the base branch in the PR header before submitting.

## Summary

<!-- What does this PR do, in 1–3 sentences? Focus on the "why". -->

## Linked issues

<!-- Closes #123, Relates to #456 -->

## Changes

<!-- Bullet list of notable changes -->
-
-

## Screenshots / recordings

<!-- For UI changes. Delete this section if N/A. -->

## How to test

<!-- Step-by-step so a reviewer can verify locally. Include any seed data or env vars needed. -->
1.
2.

## Checklist

- [ ] Base branch is `staging` (not `main`)
- [ ] Tests added or updated (or explicitly N/A with reason)
- [ ] `bun typecheck` passes locally
- [ ] `bun check` passes locally
- [ ] Drizzle migrations included if schema changed
- [ ] No secrets, API keys, or `.env` values committed
- [ ] Breaking changes called out below (or N/A)

## Breaking changes / migration notes

<!-- Anything reviewers or other devs need to know before merging. Delete if N/A. -->
