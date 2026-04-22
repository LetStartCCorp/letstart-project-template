# AI Coding Agent Instructions

## CRITICAL: Protected Files — DO NOT modify or delete

The following files power the LetStart setup wizard and must NOT be removed,
overwritten, or renamed by any coding agent:

- `src/middleware.ts` — Must keep the `withLetStartSetup()` wrapper intact.
  You may add your app middleware logic inside the `appMiddleware` function,
  but do NOT remove the `withLetStartSetup` import or wrapper.
- `middleware.ts` (root) — Same as above, root-level fallback.
- `src/app/setup/page.tsx` — The setup wizard page.
- `src/app/api/letstart-setup/route.ts` — The setup API handler.
- `.npmrc` — GitHub Packages registry config.
- `.env.local` — Contains project bootstrap config.

## Middleware Rules

When you need to add middleware (e.g., Clerk auth, rate limiting):

1. Import your middleware inside the `appMiddleware` function in `src/middleware.ts`
2. DO NOT replace the `withLetStartSetup` wrapper
3. The pattern is:

```ts
import { withLetStartSetup } from "@letstartccorp/setup/middleware";
import { clerkMiddleware } from "@clerk/nextjs/server";

const appMiddleware = clerkMiddleware(async (auth, req) => {
  // your logic here
});

export default withLetStartSetup(appMiddleware);
```

## General Rules

- Keep `@letstartccorp/setup` in package.json dependencies
- Do not remove the `.npmrc` file
- The setup wizard must always be accessible at `/setup` before first configuration
