# Stitch prompt — paste this in

> Historical record: this is the exact prompt originally sent to Stitch to
> generate the current screens. Its "gig platform" field names/copy were
> later broadened to general NTC/thin-file language in the actual app —
> see `docs/frontend-brief.md` for the current field descriptions. Kept
> here unedited since it's a record of what was actually sent, not a
> living spec.

Design a web app called **Aperture**, a fintech credit-underwriting tool for
a hackathon. It has 5 screens across two flows. Clean, modern, credible
fintech aesthetic (Stripe/Mercury-style) — not flashy or playful.

**Flow 1 — Applicant (public, mobile-friendly, approachable, plain language,
NOT like a bank loan form since many users are first-time credit applicants):**

1. **Landing page** — Aperture logo/name, one-line pitch ("Credit decisions
   for people banks can't see yet — built from your real payment behavior,
   not just a bureau file"), 3 short feature highlights (Alternative data,
   Explainable score, Fast decision), single CTA button "Check my
   eligibility."

2. **Application form** — a single scrollable form (not a multi-step
   wizard), organized into 4 clearly separated sections:
   - "About you": age, number of dependents (optional)
   - "Credit & financial history": monthly income (optional, helper text
     "leave blank if income varies"), number of open credit lines/loans,
     number of real estate loans, credit utilization % (slider), total
     monthly debt payments, three missed-payment counters (30-59 days late,
     60-89 days late, 90+ days late)
   - "Alternative data" (give this section a visually distinct
     card/background — it's the product's key differentiator): utility
     payment streak in months (0-36 slider), mobile recharge regularity
     (0-100 slider labeled "Irregular" to "Very regular"), gig platform
     trips in last 30 days (number), gig platform rating (1.0-5.0 star
     selector)
   - "Tell us about your work" (optional textarea) with placeholder text
     about gig work, and a privacy note that personal details like
     religion/marital status aren't used and get auto-removed
   - Primary button "Get my decision"

3. **Results page** — the key screen:
   - Large color-coded decision banner at top: "Approve" (green) /
     "Manual Review" (amber) / "Reject" (red), with a smaller "estimated
     risk: 9.6%" subtext
   - "Why this decision" section: a 3-4 sentence plain-English paragraph,
     below it a horizontal bar chart of the top 5 contributing factors,
     bars colored red (raised risk) or green (lowered risk), length by
     magnitude
   - "Applicants like you" section: a row of up to 5 small cards showing
     similar past applicants by risk tier badge and similarity percentage,
     with an empty state "You're the first applicant in this comparison
     group"
   - "What could change this?" section (visually secondary/collapsible): a
     dropdown to pick an improvable factor, a slider for a new value, a
     "Recalculate" button, and a result sentence like "If your utility
     payment streak improved from 8 to 30 months, your decision would move
     from Manual Review to Approve"
   - Secondary link "Apply again"

**Flow 2 — Reviewer (auth-gated, denser/more utilitarian SaaS-admin feel):**

4. **Reviewer login** — simple centered card, username + password fields,
   "Sign in" button, inline error state for invalid credentials.

5. **Reviewer dashboard** — a table/list of past applications with columns:
   Applicant ID (truncated), submitted date, risk tier badge, estimated
   default probability. Filterable by risk tier and date. Clicking a row
   opens a detail view that reuses the Results page layout (decision
   banner, explanation, factor chart, cohort) plus a compact table of the
   raw submitted feature values and audit metadata (when scored, which AI
   provider generated the explanation, whether any privacy redactions were
   made). Empty state: "No applications yet."

Use a consistent color system for risk tiers everywhere (green/amber/red)
but keep the tone reassuring, not alarming — this is a "needs review" system,
not a rejection system. Use generous spacing and large touch targets on the
applicant-facing screens for a mobile-first, non-intimidating feel.
