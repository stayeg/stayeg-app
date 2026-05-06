---
Task ID: sentry-setup
Agent: Main Agent
Task: Set up Sentry error monitoring and configure Supabase Auth settings

Work Log:
- Reviewed existing Sentry setup (partial - SDK installed, server config existed but client was never initialized)
- Created 3 Sentry Next.js config files at project root (v10+ approach):
  - sentry.client.config.ts (client-side with Replay, performance sampling)
  - sentry.server.config.ts (server-side with breadcrumb support)
  - sentry.edge.config.ts (edge runtime support)
- Updated instrumentation.ts for edge runtime Sentry initialization
- Updated next.config.ts — removed broken withSentryConfig wrapper (was causing server crashes), kept plain config
- Initialized Sentry client-side in Providers component (was defined but never called)
- Updated error.tsx to report errors to Sentry via captureException
- Updated global-error.tsx to report critical errors to Sentry
- Created /api/health endpoint for monitoring
- Added captureException to 6 critical API route groups:
  - /api/auth (GET, POST, PUT)
  - /api/auth/verify-otp
  - /api/bookings (GET, POST, PATCH)
  - /api/payments/create-order
  - /api/payments/verify
  - /api/payments/webhook
  - /api/pgs (GET, POST, PUT)
  - /api/complaints (GET, POST, PUT)
- Created api-handler.ts utility with withApiHandler wrapper for future use
- Provided Supabase Dashboard Auth configuration instructions

Stage Summary:
- Sentry SDK fully configured and integrated
- All critical API routes now report 5xx errors to Sentry
- Health check endpoint available at /api/health
- NEXT_PUBLIC_SENTRY_DSN still empty in .env — user needs to create Sentry account and add DSN
- Supabase Auth settings need manual Dashboard configuration
