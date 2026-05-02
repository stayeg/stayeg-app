const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, PageNumber, WidthType,
  ShadingType, BorderStyle, SectionType, PageBreak
} = require("docx");
const fs = require("fs");

// ── Palette: DM-1 Deep Cyan (Tech / AI / Digital) ──
const P = {
  primary: "0A1628",
  body: "1A2B40",
  secondary: "6878A0",
  accent: "5B8DB8",
  surface: "F4F8FC",
  cover: {
    titleColor: "FFFFFF",
    subtitleColor: "B0B8C0",
    metaColor: "90989F",
    footerColor: "687078",
  },
  table: {
    headerBg: "1B6B7A",
    headerText: "FFFFFF",
    accentLine: "1B6B7A",
    innerLine: "C8DDE2",
    surface: "EDF3F5",
  },
  bg: "162235",
};

// Severity colors
const SEV = {
  CRITICAL: "C0392B",
  HIGH: "D4875A",
  MEDIUM: "D4A030",
  LOW: "27AE60",
};

const c = (hex) => hex.replace("#", "");

// ── Helpers ──
function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({
    heading: level,
    spacing: {
      before: level === HeadingLevel.HEADING_1 ? 360 : 240,
      after: 120,
    },
    children: [
      new TextRun({
        text,
        bold: true,
        color: c(P.primary),
        font: { ascii: "Times New Roman", eastAsia: "SimHei" },
        size: level === HeadingLevel.HEADING_1 ? 32 : level === HeadingLevel.HEADING_2 ? 28 : 26,
      }),
    ],
  });
}

function body(text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: 312, after: 80 },
    children: [
      new TextRun({
        text,
        size: 22,
        color: c(P.body),
        font: { ascii: "Times New Roman", eastAsia: "Microsoft YaHei" },
      }),
    ],
  });
}

function bodyBold(text) {
  return new Paragraph({
    spacing: { line: 312, after: 80 },
    children: [
      new TextRun({
        text,
        size: 22,
        bold: true,
        color: c(P.primary),
        font: { ascii: "Times New Roman", eastAsia: "SimHei" },
      }),
    ],
  });
}

function severityBadge(severity) {
  return new TextRun({
    text: ` [${severity}] `,
    bold: true,
    size: 22,
    color: SEV[severity] || "666666",
    font: { ascii: "Times New Roman", eastAsia: "SimHei" },
  });
}

function finding(id, severity, title, file, description, impact, recommendation) {
  const children = [
    new TextRun({
      text: `${id}: ${title}`,
      bold: true,
      size: 22,
      color: c(P.primary),
      font: { ascii: "Times New Roman", eastAsia: "SimHei" },
    }),
    severityBadge(severity),
  ];
  const paras = [
    new Paragraph({ spacing: { before: 200, after: 60, line: 312 }, children }),
  ];
  if (file) {
    paras.push(
      new Paragraph({
        spacing: { line: 312, after: 40 },
        children: [
          new TextRun({ text: "File: ", bold: true, size: 20, color: c(P.secondary), font: { ascii: "Times New Roman" } }),
          new TextRun({ text: file, size: 20, color: c(P.accent), font: { ascii: "Courier New" } }),
        ],
      })
    );
  }
  if (description) {
    paras.push(
      new Paragraph({
        spacing: { line: 312, after: 40 },
        children: [
          new TextRun({ text: "Issue: ", bold: true, size: 20, color: c(P.secondary), font: { ascii: "Times New Roman" } }),
          new TextRun({ text: description, size: 20, color: c(P.body), font: { ascii: "Times New Roman" } }),
        ],
      })
    );
  }
  if (impact) {
    paras.push(
      new Paragraph({
        spacing: { line: 312, after: 40 },
        children: [
          new TextRun({ text: "Impact: ", bold: true, size: 20, color: c(P.secondary), font: { ascii: "Times New Roman" } }),
          new TextRun({ text: impact, size: 20, color: c(P.body), font: { ascii: "Times New Roman" } }),
        ],
      })
    );
  }
  if (recommendation) {
    paras.push(
      new Paragraph({
        spacing: { line: 312, after: 120 },
        children: [
          new TextRun({ text: "Fix: ", bold: true, size: 20, color: c(P.secondary), font: { ascii: "Times New Roman" } }),
          new TextRun({ text: recommendation, size: 20, color: "27AE60", font: { ascii: "Times New Roman" } }),
        ],
      })
    );
  }
  return paras;
}

// ── Table helpers ──
const tBorders = {
  top: { style: BorderStyle.SINGLE, size: 2, color: c(P.table.accentLine) },
  bottom: { style: BorderStyle.SINGLE, size: 2, color: c(P.table.accentLine) },
  left: { style: BorderStyle.NONE },
  right: { style: BorderStyle.NONE },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: c(P.table.innerLine) },
  insideVertical: { style: BorderStyle.NONE },
};

function headerCell(text, width) {
  return new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.CLEAR, fill: c(P.table.headerBg) },
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    children: [
      new Paragraph({
        children: [
          new TextRun({ text, bold: true, size: 20, color: c(P.table.headerText), font: { ascii: "Times New Roman" } }),
        ],
      }),
    ],
  });
}

function dataCell(text, width, idx) {
  return new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.CLEAR, fill: idx % 2 === 0 ? c(P.table.surface) : "FFFFFF" },
    margins: { top: 50, bottom: 50, left: 120, right: 120 },
    children: [
      new Paragraph({
        children: [
          new TextRun({ text, size: 19, color: c(P.body), font: { ascii: "Times New Roman" } }),
        ],
      }),
    ],
  });
}

// ── Cover Page (R1 Pure Paragraph Left on dark bg) ──
const NB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const allNoBorders = {
  top: NB, bottom: NB, left: NB, right: NB,
  insideHorizontal: NB, insideVertical: NB,
};

function buildCover() {
  return [
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: allNoBorders,
      rows: [
        new TableRow({
          height: { value: 16838, rule: "exact" },
          children: [
            new TableCell({
              width: { size: 100, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.CLEAR, fill: c(P.bg) },
              borders: allNoBorders,
              verticalAlign: "top",
              children: [
                new Paragraph({ spacing: { before: 4000 }, children: [] }),
                new Paragraph({
                  spacing: { before: 200, after: 100, line: 828, lineRule: "atLeast" },
                  children: [
                    new TextRun({
                      text: "StayEg",
                      bold: true,
                      size: 72,
                      color: c(P.cover.titleColor),
                      font: { ascii: "Times New Roman", eastAsia: "SimHei" },
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 100, after: 200, line: 620, lineRule: "atLeast" },
                  children: [
                    new TextRun({
                      text: "CTO Production Readiness Review",
                      size: 44,
                      color: c(P.cover.subtitleColor),
                      font: { ascii: "Times New Roman" },
                    }),
                  ],
                }),
                new Paragraph({
                  indent: { left: 0, right: 6000 },
                  spacing: { before: 20 },
                  border: { top: { style: BorderStyle.SINGLE, size: 6, color: c(P.accent), space: 12 } },
                  children: [],
                }),
                new Paragraph({
                  spacing: { before: 200, after: 80 },
                  children: [
                    new TextRun({
                      text: "PG/Rental Accommodation Management Platform",
                      size: 24,
                      color: c(P.cover.metaColor),
                      font: { ascii: "Times New Roman" },
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { after: 80 },
                  children: [
                    new TextRun({
                      text: "Next.js 16 + Supabase + Tailwind CSS",
                      size: 22,
                      color: c(P.cover.metaColor),
                      font: { ascii: "Times New Roman" },
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 2000 },
                  children: [
                    new TextRun({
                      text: "Review Date: May 3, 2026",
                      size: 20,
                      color: c(P.cover.footerColor),
                      font: { ascii: "Times New Roman" },
                    }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "Classification: Confidential",
                      size: 20,
                      color: c(P.cover.footerColor),
                      font: { ascii: "Times New Roman" },
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  ];
}

// ── Executive Summary Section ──
function buildExecutiveSummary() {
  return [
    heading("1. Executive Summary"),
    body("This report presents the findings of a comprehensive CTO-level production readiness review of the StayEg application, a PG/rental accommodation management platform built with Next.js 16, Supabase, and Tailwind CSS. The review covered security and authentication, code architecture, API routes and data flow, frontend and UX, and database design."),
    body("The overall assessment is that StayEg is NOT READY for production deployment in its current state. The application contains 6 critical security vulnerabilities that must be resolved before any public-facing deployment, alongside 14 high-severity issues that pose significant risk to data integrity, user privacy, and business operations. While the UI is polished and the feature set is comprehensive, the underlying architecture has fundamental gaps in authentication, authorization, and data protection that create unacceptable risk."),
    body("The most impactful issues are: (1) hardcoded admin secrets in client-side code that are shipped to every user's browser, (2) OTP verification that is completely bypassed in simulated mode allowing anyone to log in as any user, (3) Row Level Security policies that are fully permissive, granting unrestricted access to all data, (4) a single-page application architecture that negates all Next.js SSR/SSG benefits, destroying SEO and deep-linking, and (5) password hashes exposed in API responses alongside passwords transmitted as URL query parameters."),

    heading("1.1 Verdict"),
    new Paragraph({
      spacing: { before: 120, after: 200, line: 312 },
      children: [
        new TextRun({ text: "Overall Production Readiness: ", bold: true, size: 24, color: c(P.primary), font: { ascii: "Times New Roman" } }),
        new TextRun({ text: "NOT READY", bold: true, size: 28, color: SEV.CRITICAL, font: { ascii: "Times New Roman" } }),
      ],
    }),

    heading("1.2 Scorecard"),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: tBorders,
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            headerCell("Category", 35),
            headerCell("Score", 15),
            headerCell("Status", 50),
          ],
        }),
        ...[
          ["Authentication", "2/10", "Critical - OTP bypass, legacy header auth, JWT fallback, hardcoded secrets"],
          ["Authorization", "4/10", "High - Role checks exist but missing owner-scoping, spoofable IDs"],
          ["Data Protection", "2/10", "Critical - RLS wide open, password hash exposed, .env committed"],
          ["API Security", "4/10", "High - Most routes have auth, but gaps in vendors, reviews, setup routes"],
          ["Code Architecture", "3/10", "Critical - SPA anti-pattern, duplicate project, no SSR, dead code layer"],
          ["Frontend & UX", "5/10", "Medium - Good UI polish but no routing, no form validation library, no a11y"],
          ["Database Design", "5/10", "Medium - Functional but CSV columns, TEXT PKs, missing constraints"],
        ].map((row, idx) =>
          new TableRow({
            children: [
              dataCell(row[0], 35, idx),
              dataCell(row[1], 15, idx),
              dataCell(row[2], 50, idx),
            ],
          })
        ),
      ],
    }),

    heading("1.3 Issue Summary"),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: tBorders,
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            headerCell("Severity", 25),
            headerCell("Count", 15),
            headerCell("Description", 60),
          ],
        }),
        ...[
          ["CRITICAL", "6", "Must fix before any production deployment - security bypasses, data leaks"],
          ["HIGH", "14", "Should fix immediately - auth gaps, race conditions, architecture issues"],
          ["MEDIUM", "12", "Recommended improvements - CSRF, validation, performance"],
          ["LOW", "5", "Nice to have - logging, naming, minor optimizations"],
        ].map((row, idx) =>
          new TableRow({
            children: [
              dataCell(row[0], 25, idx),
              dataCell(row[1], 15, idx),
              dataCell(row[2], 60, idx),
            ],
          })
        ),
      ],
    }),
  ];
}

// ── Security Findings ──
function buildSecuritySection() {
  return [
    heading("2. Security & Authentication"),
    body("The security review identified multiple critical vulnerabilities that would allow unauthorized access to user accounts, admin functions, and sensitive data. The most severe issues involve hardcoded credentials in client-side code, a completely bypassed OTP verification system, and permissive Row Level Security policies that grant unrestricted data access to any Supabase client."),

    ...finding(
      "C-1", "CRITICAL", "Hardcoded Admin Secret in Client-Side Code",
      "src/components/stayease/admin/owner-approval.tsx:19, src/components/stayease/setup/database-setup-v2.tsx:277",
      "The ADMIN_SECRET is hardcoded as the string 'stayeg-v1.2-secure-2025' in client-side React components. This is shipped to every user's browser in the JavaScript bundle.",
      "Anyone who opens DevTools or views the bundle can extract the admin secret and call all admin-protected endpoints (/api/admin/approve-owner, /api/seed, etc.) with full privileges including approving/rejecting owners, seeding the database, and running migrations.",
      "Move admin operations to server actions or a separate admin-only route that doesn't expose the secret. Use a session-based approach where the server validates the admin JWT role rather than a shared secret header."
    ),

    ...finding(
      "C-2", "CRITICAL", "OTP Verification Completely Bypassed in Simulated Mode",
      "src/app/api/auth/verify-otp/route.ts:89-103",
      "When MSG91_AUTH_KEY is not set (current state), the OTP verification endpoint skips all OTP validation. It finds the user by phone number and immediately issues a JWT token, regardless of what OTP was submitted. The comment says 'Simulated mode: accept any 6-digit OTP.'",
      "Anyone who knows a user's phone number can log in as that user by submitting any 6-digit OTP. This completely bypasses authentication.",
      "Always validate the stored otp_code and otp_expires_at from the database, even in simulated mode. In simulated mode, log the OTP to console for testing but still enforce the correct code."
    ),

    ...finding(
      "C-3", "CRITICAL", "Row Level Security Policies Are Fully Permissive",
      "src/app/api/setup-complete/route.ts:296-308",
      "The initial database setup creates RLS policies with USING (true) WITH CHECK (true) for every table. While a security hardening migration exists, there is no guarantee it has been applied.",
      "Any authenticated Supabase user can read, insert, update, or delete any row in any table through the Supabase client, bypassing all API route authorization logic.",
      "Run the security migration immediately. Remove the USING (true) policies from the initial setup. Make the security migration a prerequisite that fails the health check if not applied."
    ),

    ...finding(
      "C-4", "CRITICAL", "JWT Verification Falls Back to Unverified Client-Side Decode",
      "src/lib/jwt.ts:120-125",
      "If the jsonwebtoken module fails to load, verifyToken silently falls back to verifyTokenClient, which only base64-decodes the payload without verifying the cryptographic signature.",
      "An attacker can forge any JWT token by base64-encoding a payload like {userId: 'admin-id', role: 'ADMIN'} and it would be accepted as valid.",
      "Remove the fallback. If jsonwebtoken cannot be loaded, verifyToken should throw an error or return null, never fall back to unverified decoding."
    ),

    ...finding(
      "C-5", "CRITICAL", "Legacy x-user-email Header Auth Still Active",
      "src/app/api/tenants/[id]/route.ts:6-25",
      "The tenants/[id] route uses a custom getOwnerSession() function that authenticates by reading the x-user-email header from the request, then looking up the user by email. This bypasses the JWT authentication system entirely.",
      "Any client can set the x-user-email header to any email address and impersonate any owner, gaining full tenant CRUD access including reading personal data, changing bed assignments, and deleting tenants.",
      "Replace getOwnerSession() with requireSessionWithRole(request, ['OWNER']) from @/lib/api-auth. Remove the x-user-email header from api-client.ts."
    ),

    ...finding(
      "C-6", "CRITICAL", "password_hash Returned in Login Response",
      "src/app/api/auth/route.ts:33,69-72",
      "The login query selects password_hash from the database, and the entire user object including password_hash is returned in the JSON response.",
      "The bcrypt hash is exposed to every authenticated user on login. While bcrypt is resistant to direct reversal, exposing hashes enables offline brute-force attacks against user passwords.",
      "Exclude password_hash from the SELECT query and response. After verification, construct a clean user object without the hash."
    ),

    ...finding(
      "H-1", "HIGH", "Password Transmitted as Query Parameter",
      "src/app/api/auth/route.ts:27",
      "The login endpoint accepts the password as a URL query parameter (GET /api/auth?email=...&password=...).",
      "Query parameters are logged in web server access logs, browser history, CDN logs, and referrer headers. Passwords should NEVER be in URLs.",
      "Change login to a POST request with the password in the request body."
    ),

    ...finding(
      "H-2", "HIGH", "No Owner-Scoping on PG Create/Update",
      "src/app/api/pgs/route.ts:86-121, 123-160",
      "The PG POST endpoint accepts ownerId from the request body without verifying that the requesting user is the same as the specified ownerId. Any OWNER can create PGs under any other owner's ID. Similarly, PG PUT allows any OWNER to update any PG regardless of ownership.",
      "An owner can create PGs attributed to other owners or modify other owners' PGs, leading to data integrity issues and potential fraud.",
      "In POST, use authResult.user.id as the owner_id instead of accepting it from the body. In PUT, verify the authenticated user owns the PG being updated (or is ADMIN)."
    ),

    ...finding(
      "H-3", "HIGH", "Razorpay Payment Verification Always Passes in Simulated Mode",
      "src/lib/razorpay.ts:71-76",
      "Without Razorpay configured, payment verification always returns true. The /api/payments/verify endpoint also allows creating COMPLETED payments when signature is missing.",
      "Anyone can claim they made a payment without actually paying, and the system will record it as COMPLETED.",
      "Never auto-verify payments. If Razorpay isn't configured, payments should stay PENDING until manually verified."
    ),

    ...finding(
      "H-4", "HIGH", "Room/Bed/Worker Routes Lack Owner-Resource Binding",
      "src/app/api/rooms/route.ts, beds/route.ts, workers/route.ts",
      "All these routes verify the user is OWNER/ADMIN, but never check that the PG/room/bed belongs to the requesting owner. Any owner can manage any other owner's rooms, beds, and workers.",
      "Cross-tenant data access allows one property owner to view and modify another owner's property data, room configurations, and worker assignments.",
      "Add owner-resource binding checks: verify that the PG being modified belongs to the authenticated owner before allowing any operations."
    ),

    ...finding(
      "H-5", "HIGH", "Unauthenticated SQL Execution in Reviews Migrate",
      "src/app/api/reviews/migrate/route.ts:5",
      "The POST endpoint has no auth check at all. It calls supabaseAdmin.rpc('exec_sql', { sql }) with hardcoded SQL.",
      "If exec_sql RPC exists, anyone can execute arbitrary SQL via this endpoint. Even without it, unauthenticated DDL operations are a serious risk.",
      "Add authentication and admin-only authorization to this endpoint. Consider removing it entirely in production."
    ),

    ...finding(
      "H-6", "HIGH", "Owners Can Self-Approve PGs",
      "src/app/api/pgs/route.ts:144-145",
      "PG update allows setting status and isVerified fields. Any OWNER can self-approve their PGs and mark them verified, completely bypassing the admin approval workflow.",
      "The entire owner approval and PG verification workflow is useless if owners can simply update their own status and verification flags.",
      "Remove status/isVerified/is_approved from the allowed update fields for non-admin users. These should only be settable by ADMIN role."
    ),

    ...finding(
      "M-1", "MEDIUM", "JWT Tokens Stored in localStorage (XSS-Accessible)",
      "src/lib/api-client.ts, src/store/use-app-store.ts",
      "JWT tokens are stored in localStorage, which is accessible to any JavaScript running on the page, including XSS payloads.",
      "XSS attacks can steal authentication tokens, leading to account takeover.",
      "Use httpOnly cookies for token storage, or at minimum implement a short token lifetime with refresh token rotation."
    ),

    ...finding(
      "M-2", "MEDIUM", "No CSRF Protection on State-Changing Operations",
      "Multiple files",
      "All POST/PUT/PATCH/DELETE endpoints accept requests from any origin. There are no CSRF tokens or SameSite cookie enforcement.",
      "Cross-site request forgery attacks could trick authenticated users into performing unwanted actions.",
      "Implement CSRF tokens for form submissions or ensure SameSite=Strict on cookies. Validate the Origin header on state-changing requests."
    ),

    ...finding(
      "M-3", "MEDIUM", "No Token Revocation Mechanism",
      "Multiple files",
      "JWT tokens are valid for 7 days (JWT_EXPIRES_IN=7d). There is no blacklist or revocation mechanism. If a user's account is compromised or they log out, the old token remains valid.",
      "Compromised tokens remain active for up to 7 days, providing a large window for attackers.",
      "Implement a token revocation list or reduce token lifetime significantly (15-30 min) with refresh token rotation."
    ),

    ...finding(
      "M-4", "MEDIUM", "In-Memory Rate Limiting Is Ineffective",
      "src/middleware.ts:14-39",
      "Rate limiting uses an in-memory Map. In serverless/edge deployments, each instance has its own Map, making rate limits per-instance rather than global.",
      "Rate limiting is effectively bypassed in production deployments with multiple instances.",
      "Use Redis or an external rate-limiting service (e.g., Upstash) for production."
    ),

    ...finding(
      "M-5", "MEDIUM", "Missing Content-Security-Policy Header",
      "src/middleware.ts",
      "No Content-Security-Policy header is set. This is a critical defense against XSS attacks.",
      "Without CSP, the application has no browser-level protection against injected scripts.",
      "Add a CSP header restricting script sources, style sources, and frame ancestors."
    ),

    ...finding(
      "M-6", "MEDIUM", "Weak Password Policy",
      "src/app/api/auth/route.ts:136",
      "Minimum password length is only 6 characters with no requirements for complexity (uppercase, numbers, symbols).",
      "Weak passwords are easily compromised through brute force or dictionary attacks.",
      "Enforce minimum 8 characters with at least one uppercase, one number, and one special character."
    ),
  ];
}

// ── Architecture Findings ──
function buildArchitectureSection() {
  return [
    heading("3. Code Quality & Architecture"),
    body("The architecture review identified several critical anti-patterns in the codebase. The most impactful is the single-page application architecture that negates all of Next.js's server-side rendering and static generation benefits. Combined with a duplicate project directory, unused dependencies, and a monolithic Zustand store, the application's architecture requires significant restructuring before it can be considered production-ready."),

    ...finding(
      "C-7", "CRITICAL", "SPA-In-A-NextJS-App Anti-Pattern",
      "src/app/page.tsx (365 lines)",
      "The entire application is a single-page app rendered from one page.tsx. Navigation uses Zustand's currentView state instead of Next.js file-based routing. All 30+ views are loaded via dynamic imports with ssr: false.",
      "Zero benefit from Next.js SSR/SSG. No URL-based navigation (users cannot bookmark/share deep links). No browser back/forward button support. SEO is destroyed since only one URL exists. Code splitting is suboptimal.",
      "Migrate to Next.js file-based routing. Create routes like /login, /signup, /pgs, /pgs/[id], /owner/dashboard, etc. Use next/navigation for routing. This unlocks deep linking, SSR, per-page SEO, browser history, and proper code splitting."
    ),

    ...finding(
      "H-7", "HIGH", "Full Duplicate Project Directory",
      "/home/z/my-project/stayeg-app/ mirroring /home/z/my-project/src/",
      "A complete mirror of the source code exists in stayeg-app/ with 11,740 TypeScript files duplicating the main src/ directory.",
      "Confusion about which code is canonical, deployment risk of shipping stale code, doubled storage, potential for divergent bugs.",
      "Remove the stayeg-app/ duplicate directory entirely. Ensure .gitignore prevents future duplication."
    ),

    ...finding(
      "H-8", "HIGH", "God Components (1400+ Lines Each)",
      "src/components/stayease/tenant/tenant-profile.tsx (1,621 lines), booking-modal.tsx (1,430 lines), tenant-support.tsx (1,371 lines), payment-section.tsx (1,227 lines)",
      "Multiple component files exceed 1,200 lines, mixing presentation, business logic, and state management in a single file.",
      "These components are difficult to test, maintain, and reuse. Any change to one aspect risks breaking unrelated functionality.",
      "Decompose each god component into smaller, focused components following the single responsibility principle. Extract shared logic into custom hooks."
    ),

    ...finding(
      "H-9", "HIGH", "Zustand God Store with 76+ State Properties",
      "src/store/use-app-store.ts",
      "A single Zustand store manages 76+ state properties including auth state, navigation, selected items, all domain data, search filters, and UI state.",
      "Every component that reads any state from this store re-renders when unrelated state changes. This is a performance bottleneck that worsens as the app grows.",
      "Split the store into domain-specific slices (authStore, navigationStore, pgStore, bookingStore, etc.) using Zustand's slice pattern."
    ),

    ...finding(
      "H-10", "HIGH", "No Input Validation with Zod (Despite Being Installed)",
      "All API routes in src/app/api/",
      "Despite Zod being a dependency, no API route uses Zod schemas for input validation. All request bodies are parsed with request.json() and validated with ad-hoc if (!field) checks.",
      "Invalid/malformed data can reach the database (negative prices, invalid dates, XSS strings). No consistent validation boundary exists.",
      "Implement Zod validation schemas for all API route inputs. Create a validation middleware that can be applied consistently."
    ),

    ...finding(
      "H-11", "HIGH", "Race Conditions in Booking Operations",
      "src/app/api/bookings/route.ts:109-126, src/app/api/tenants/route.ts:148-165",
      "Booking creation and bed status update are separate, non-transactional operations: (1) Check bed availability (read), (2) Create booking (insert), (3) Update bed status (update). No database-level locking or transaction wrapping.",
      "Under concurrent requests, two users could book the same bed. Double-booking would result in data inconsistency and customer dissatisfaction.",
      "Wrap booking operations in database transactions using Supabase RPC or PostgreSQL advisory locks."
    ),

    ...finding(
      "H-12", "HIGH", "Unused Data Abstraction Layer (Dead Code)",
      "src/lib/supabase-db.ts (847 lines), src/lib/db.ts",
      "A well-structured data access layer with typed queries exists but zero API routes import from these modules. All 31 API routes directly use supabaseAdmin.from(...). The entire data layer is dead code.",
      "No centralized query logic, duplicated patterns across routes, and the dead code adds maintenance burden and confusion.",
      "Either adopt the data layer consistently across all routes, or remove it to reduce confusion. If adopting, refactor routes one by one."
    ),

    ...finding(
      "H-13", "HIGH", "TypeScript noImplicitAny Disabled",
      "tsconfig.json:13",
      "The noImplicitAny option is set to false, disabling TypeScript's protection against implicit any types. Additionally, typescript: { ignoreBuildErrors: true } is set in next.config.ts.",
      "Many values silently become any, defeating TypeScript's purpose. Build errors won't catch type issues that could cause runtime bugs.",
      "Enable noImplicitAny and remove ignoreBuildErrors. Fix the resulting type errors incrementally."
    ),

    ...finding(
      "M-7", "MEDIUM", "Comma-Separated Strings Instead of Arrays/JSONB",
      "STAYEG-PRODUCTION-SETUP.sql:90-91 (amenities TEXT, images TEXT)",
      "Amenities and images are stored as comma-separated strings in the database, requiring parsing with split(',') in 12+ locations across the codebase.",
      "Cannot query by individual amenity efficiently, no referential integrity, LIKE queries are fragile (e.g., %wifi% matches nowifi), and the same parsing logic is duplicated everywhere.",
      "Convert amenities and images columns to PostgreSQL arrays (TEXT[]) or JSONB. Create a shared utility function for the transition period."
    ),

    ...finding(
      "M-8", "MEDIUM", "Mixed camelCase/snake_case Conventions",
      "src/lib/types.ts vs database columns",
      "Frontend types use camelCase (ownerId, bedNumber) while database columns use snake_case (owner_id, bed_number). API responses are inconsistent - some routes return snake_case from DB, some convert to camelCase.",
      "Frontend must handle both conventions, leading to type assertion hell and potential bugs from field name mismatches.",
      "Standardize on one convention at the API boundary. Either convert all DB responses to camelCase in the API layer, or use snake_case consistently throughout."
    ),
  ];
}

// ── Frontend Findings ──
function buildFrontendSection() {
  return [
    heading("4. Frontend & UX"),
    body("The frontend review found that while the UI is visually polished with a good design system, smooth animations, and mobile-first responsive approach, the underlying architecture fundamentally undermines the user experience. The SPA approach eliminates deep linking, browser history, and SEO. Form handling lacks proper validation libraries, and accessibility is minimal."),

    ...finding(
      "C-8", "CRITICAL", "No Next.js Link Components Used - Zero URL-Based Navigation",
      "src/app/page.tsx (entire file), all components",
      "All navigation is via setCurrentView() which updates Zustand state. There are zero Next.js Link components used anywhere. The application has only one URL (/). Middle-click/ctrl-click doesn't open in new tab. No prefetching of route data.",
      "Users cannot share URLs to specific PGs, booking pages, or owner dashboards. Browser back/forward doesn't work properly. All views share the same URL, making analytics, A/B testing, and user flow tracking impossible.",
      "Migrate to Next.js file-based routing as described in C-7. This is the single highest-ROI change for the application."
    ),

    ...finding(
      "H-14", "HIGH", "Zero React Suspense Boundaries",
      "All components",
      "Grep for Suspense across the entire src/ directory returns zero results. No fallback UI during React lazy loading or data fetching at the component level.",
      "Without Suspense boundaries, any slow data fetch blocks the entire UI. There's no progressive loading or graceful degradation at the component level.",
      "Add Suspense boundaries around data-fetching components and route segments. Use React.lazy with Suspense for code-split components."
    ),

    ...finding(
      "H-15", "HIGH", "No Schema-Based Form Validation (react-hook-form + Zod Not Used)",
      "All form components (login-page.tsx, signup-page.tsx, booking-modal.tsx, pg-management.tsx)",
      "Despite react-hook-form and Zod being in package.json, no form uses them. All forms use manual useState for all fields with validation via toast messages. Validation errors are shown only as auto-dismissing toasts with no inline error display.",
      "Users can't see what's wrong while fixing the form. No consistent validation boundary. Complex forms are difficult to maintain with manual validation logic.",
      "Replace manual useState + toast validation with react-hook-form + Zod. Add inline error messages below fields."
    ),

    ...finding(
      "H-16", "HIGH", "Minimal Accessibility (ARIA, Keyboard Navigation)",
      "All components",
      "Grep for aria- or role= across components returns hits in only 11 files with just 1-2 instances each. Navigation buttons lack aria-label. No keyboard shortcut support. No skip-to-content link. Image carousel buttons lack aria-label.",
      "The application is largely inaccessible to users with disabilities, which may violate accessibility regulations (ADA, WCAG 2.1 AA).",
      "Add ARIA labels to all interactive elements. Implement keyboard navigation for views. Add skip-to-content link. Test with screen readers."
    ),

    ...finding(
      "M-9", "MEDIUM", "Sitemap Lists Nonexistent Route Segments",
      "src/app/sitemap.ts:16-44",
      "Sitemap lists URLs like stayeg.com/pricing, stayeg.com/about, stayeg.com/terms, stayeg.com/privacy but none of these routes exist as Next.js pages. Also, sitemap uses stayeg.com while layout.tsx uses stayeg.in - inconsistent domain.",
      "Search engines will encounter 404 errors for all listed URLs, potentially hurting the site's crawl budget and ranking.",
      "Remove non-existent URLs from sitemap. Fix domain inconsistency to use stayeg.in consistently."
    ),

    ...finding(
      "M-10", "MEDIUM", "ThemeProvider Is a No-Op Passthrough",
      "src/components/layout/theme-provider.tsx, theme-toggle.tsx",
      "ThemeProvider returns <>{children}</> and ThemeToggle returns null. next-themes is installed but the provider is gutted. However, the CSS still has bg-section-dark utility using hardcoded dark colors.",
      "Users who prefer dark mode get a jarring light-only experience. The hardcoded dark section stands out awkwardly.",
      "Either properly implement dark mode or remove the dark section CSS and next-themes dependency entirely."
    ),

    ...finding(
      "M-11", "MEDIUM", "Raw img Tags Instead of Next.js Image",
      "Multiple components (signup-page.tsx:573, hero.tsx:675, admin-dashboard.tsx:332, booking-modal.tsx:711,741)",
      "Several components use raw <img> tags instead of Next.js <Image> component. Raw tags lack automatic optimization, lazy loading, and responsive sizing.",
      "Missing image optimization leads to slower page loads. No explicit width/height causes layout shift (CLS) during load.",
      "Replace all raw <img> tags with Next.js <Image> component for automatic optimization, lazy loading, and CLS prevention."
    ),

    ...finding(
      "M-12", "MEDIUM", "Heavy Unused Dependencies Bloating Bundle",
      "package.json",
      "Several heavy packages are installed but never imported: @mdxeditor/editor (~200KB+), react-syntax-highlighter (~40KB+), next-intl (~15KB), next-auth (~25KB), @dnd-kit/core + plugins (~20KB). Also prisma and better-sqlite3 are installed but unused.",
      "Unused dependencies add to install time, disk usage, bundle size, and potential security vulnerabilities.",
      "Remove all unused dependencies: @mdxeditor/editor, react-syntax-highlighter, next-intl, next-auth, @dnd-kit/*, prisma, better-sqlite3."
    ),
  ];
}

// ── Database Findings ──
function buildDatabaseSection() {
  return [
    heading("5. Database Design"),
    body("The database design is functional but has several issues that impact data integrity, query performance, and security. The most notable problems are comma-separated string columns instead of proper arrays, TEXT primary keys instead of UUID, and missing database-level constraints for critical business rules like preventing double-booking."),

    ...finding(
      "H-17", "HIGH", "TEXT Primary Keys Instead of UUID",
      "STAYEG-PRODUCTION-SETUP.sql:53 (id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text)",
      "Primary keys use TEXT type instead of native PostgreSQL UUID type. Seed data uses human-readable IDs (owner-1, pg-1) which leak business logic into keys.",
      "Loses PostgreSQL's native UUID optimization and validation. Human-readable IDs expose internal patterns and make merging data across environments difficult.",
      "Change primary key columns to UUID type. Generate UUIDs server-side. Remove human-readable seed IDs or use them only as slug/lookup fields."
    ),

    ...finding(
      "H-18", "HIGH", "Missing Database Constraints",
      "STAYEG-PRODUCTION-SETUP.sql",
      "No CHECK constraint ensuring check_in_date < check_out_date. No constraint preventing double-booking at the database level. payments.booking_id allows SET NULL on delete, creating orphaned payment records. No updated_at trigger on notifications and coupon_usages tables.",
      "Application-level validation can be bypassed, leading to data integrity violations. Orphaned payment records complicate auditing and financial reporting.",
      "Add CHECK constraints for date validity and business rules. Add a unique partial index on bookings(bed_id) WHERE status = 'ACTIVE' to prevent double-booking at the DB level. Change payments.booking_id to RESTRICT on delete."
    ),

    ...finding(
      "M-13", "MEDIUM", "Missing Performance Indexes",
      "STAYEG-PRODUCTION-SETUP.sql",
      "No composite index on bookings(bed_id, status) for the frequent active booking on bed query. No index on payments(booking_id) despite JOIN queries. No GIN index on pgs(amenities) for the LIKE queries.",
      "Frequent queries perform full table scans, degrading performance as data grows. The bookings availability check is particularly critical as it runs on every booking attempt.",
      "Add composite index on bookings(bed_id, status). Add index on payments(booking_id). Consider GIN index on amenities if using PostgreSQL arrays after the CSV-to-array migration."
    ),
  ];
}

// ── Priority Action Plan ──
function buildActionPlan() {
  return [
    heading("6. Priority Action Plan"),
    body("The following action plan ranks fixes by impact and urgency. Critical items must be addressed before any production deployment. High items should be resolved within the first sprint. Medium and Low items can be addressed iteratively."),

    heading("6.1 Immediate Actions (Before Production)", HeadingLevel.HEADING_2),
    body("These 6 critical fixes must be completed before the application is exposed to any real users:"),

    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: tBorders,
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            headerCell("Priority", 8),
            headerCell("ID", 8),
            headerCell("Action", 50),
            headerCell("Effort", 12),
            headerCell("Impact", 22),
          ],
        }),
        ...[
          ["1", "C-6", "Remove password_hash from login SELECT and API response", "1 hour", "Stops credential leak immediately"],
          ["2", "C-2", "Fix OTP verification to check stored OTP + expiry even in simulated mode", "2 hours", "Prevents authentication bypass"],
          ["3", "C-1", "Remove hardcoded admin secrets from client-side code", "2 hours", "Prevents admin function abuse"],
          ["4", "C-4", "Remove JWT fallback to non-cryptographic client-side verification", "1 hour", "Prevents token forgery"],
          ["5", "C-5", "Replace x-user-email auth with JWT in tenants/[id] route", "2 hours", "Prevents owner impersonation"],
          ["6", "C-3", "Apply proper RLS policies and run security migration", "4 hours", "Prevents unrestricted data access"],
        ].map((row, idx) =>
          new TableRow({
            children: [
              dataCell(row[0], 8, idx),
              dataCell(row[1], 8, idx),
              dataCell(row[2], 50, idx),
              dataCell(row[3], 12, idx),
              dataCell(row[4], 22, idx),
            ],
          })
        ),
      ],
    }),

    heading("6.2 First Sprint (Week 1-2)", HeadingLevel.HEADING_2),
    body("After critical fixes, these high-priority items should be addressed in the first sprint:"),

    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: tBorders,
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            headerCell("Priority", 8),
            headerCell("ID", 8),
            headerCell("Action", 50),
            headerCell("Effort", 12),
            headerCell("Impact", 22),
          ],
        }),
        ...[
          ["7", "H-1", "Move login to POST with password in request body", "2 hours", "Stops password logging exposure"],
          ["8", "H-6", "Remove status/verification from PG update for non-admin", "1 hour", "Enforces approval workflow"],
          ["9", "H-2", "Add owner-scoping to PG create/update (use auth user ID)", "3 hours", "Prevents cross-owner modification"],
          ["10", "H-4", "Add owner-resource binding to rooms/beds/workers", "4 hours", "Prevents cross-owner data access"],
          ["11", "H-3", "Disable auto-verify for Razorpay in simulated mode", "2 hours", "Prevents fake payment recording"],
          ["12", "H-5", "Add auth to reviews/migrate and fix helpful vote endpoint", "2 hours", "Prevents unauthorized SQL execution"],
          ["13", "H-11", "Wrap booking operations in database transactions", "4 hours", "Prevents double-booking race condition"],
          ["14", "H-10", "Add Zod validation to all API routes", "8 hours", "Consistent input validation boundary"],
        ].map((row, idx) =>
          new TableRow({
            children: [
              dataCell(row[0], 8, idx),
              dataCell(row[1], 8, idx),
              dataCell(row[2], 50, idx),
              dataCell(row[3], 12, idx),
              dataCell(row[4], 22, idx),
            ],
          })
        ),
      ],
    }),

    heading("6.3 Architecture Sprint (Week 3-4)", HeadingLevel.HEADING_2),
    body("The following architectural changes are essential for long-term maintainability and should be planned as a dedicated sprint. The migration from SPA to proper Next.js routing is the single highest-ROI change:"),

    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: tBorders,
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            headerCell("Priority", 8),
            headerCell("ID", 8),
            headerCell("Action", 50),
            headerCell("Effort", 12),
            headerCell("Impact", 22),
          ],
        }),
        ...[
          ["15", "C-7", "Migrate from SPA to Next.js file-based routing", "40 hours", "Unlocks SSR, SEO, deep linking, browser history"],
          ["16", "C-8", "Add Next.js Link components and proper navigation", "8 hours", "Enables URL sharing, prefetching, accessibility"],
          ["17", "H-7", "Remove duplicate stayeg-app/ directory", "1 hour", "Eliminates confusion and stale code risk"],
          ["18", "H-9", "Split Zustand god store into domain slices", "8 hours", "Fixes performance bottleneck from unnecessary re-renders"],
          ["19", "H-13", "Enable TypeScript strict mode and fix type errors", "16 hours", "Catches runtime bugs at compile time"],
          ["20", "H-8", "Decompose god components into smaller focused units", "16 hours", "Improves maintainability and testability"],
        ].map((row, idx) =>
          new TableRow({
            children: [
              dataCell(row[0], 8, idx),
              dataCell(row[1], 8, idx),
              dataCell(row[2], 50, idx),
              dataCell(row[3], 12, idx),
              dataCell(row[4], 22, idx),
            ],
          })
        ),
      ],
    }),

    heading("6.4 Ongoing Improvements (Week 5+)", HeadingLevel.HEADING_2),
    body("Medium and low priority items can be addressed iteratively as part of regular development cycles. Key areas include: implementing CSRF protection and Content-Security-Policy headers, adding token revocation or short-lived tokens with refresh rotation, migrating CSV columns to PostgreSQL arrays, adding proper accessibility (ARIA labels, skip navigation, keyboard support), implementing proper dark mode, and removing unused npm dependencies to reduce bundle size and attack surface."),
  ];
}

// ── Build Document ──
const doc = new Document({
  styles: {
    default: {
      document: {
        run: {
          font: { ascii: "Times New Roman", eastAsia: "Microsoft YaHei" },
          size: 22,
          color: c(P.body),
        },
        paragraph: {
          spacing: { line: 312 },
        },
      },
      heading1: {
        run: {
          font: { ascii: "Times New Roman", eastAsia: "SimHei" },
          size: 32,
          bold: true,
          color: c(P.primary),
        },
      },
      heading2: {
        run: {
          font: { ascii: "Times New Roman", eastAsia: "SimHei" },
          size: 28,
          bold: true,
          color: c(P.primary),
        },
      },
    },
  },
  sections: [
    // Section 1: Cover
    {
      properties: {
        page: {
          margin: { top: 0, bottom: 0, left: 0, right: 0 },
        },
      },
      children: buildCover(),
    },
    // Section 2: Body
    {
      properties: {
        page: {
          margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
          pageNumbers: { start: 1, formatType: "decimal" },
        },
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  children: ["StayEg CTO Review ", PageNumber.CURRENT],
                  size: 18,
                  color: c(P.secondary),
                  font: { ascii: "Times New Roman" },
                }),
              ],
            }),
          ],
        }),
      },
      children: [
        ...buildExecutiveSummary(),
        ...buildSecuritySection(),
        ...buildArchitectureSection(),
        ...buildFrontendSection(),
        ...buildDatabaseSection(),
        ...buildActionPlan(),
      ],
    },
  ],
});

// ── Generate ──
const outputPath = "/home/z/my-project/download/StayEg-CTO-Production-Readiness-Review.docx";
Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(outputPath, buf);
  console.log("Report generated:", outputPath);
  console.log("Size:", (buf.length / 1024).toFixed(1), "KB");
});
