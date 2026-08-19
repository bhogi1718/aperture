# Aperture — Frontend Design Brief (for Stitch)

Five screens across two flows: a public applicant flow (no login) and an
auth-gated reviewer flow. All copy/fields below map directly to the live
backend API in `backend/src/routes/`.

## Flow 1 — Applicant (public, no login)

### Screen 1: Landing / Apply
Purpose: entry point explaining what Aperture does, single CTA into the form.
- Product name "Aperture" + one-line pitch: "Credit decisions for people
  banks can't see yet — built from your real payment behavior, not just a
  bureau file."
- Short 3-icon row: "Alternative data" / "Explainable score" / "Fast decision"
- Single primary button: "Check my eligibility" → Screen 2

### Screen 2: Application Form
Purpose: collect applicant inputs, single scrollable form (not multi-step
wizard — keep friction low for the demo).

**Section A — About you**
- Age (number input, 18–110)
- Number of dependents (number input, 0+, optional — blank is valid)

**Section B — Credit & financial history**
- Monthly income (currency input, optional — blank is valid, helper text:
  "Leave blank if your income varies month to month")
- Number of open credit lines or loans (number input, 0+)
- Number of real estate loans (number input, 0+)
- Credit utilization — "What % of your available credit are you currently
  using?" (slider or %, 0–100+, maps to RevolvingUtilizationOfUnsecuredLines
  as a decimal)
- Total monthly debt payments (currency input, used to derive DebtRatio
  alongside income)
- Missed payments in the last 2 years — three stacked number inputs:
  - "30–59 days late"
  - "60–89 days late"
  - "90+ days late"
  (helper text: "It's okay if this is zero — most applicants have none")

**Section C — Alternative data** (visually distinct section, this is
Aperture's differentiator — give it its own card/background treatment).
Phrased to generalize across any NTC/thin-file applicant — gig worker,
small business owner, freelancer, student — rather than assuming one
occupation type.
- Utility payment streak — "How many consecutive months have you paid
  utility bills (electricity, water, etc.) on time?" (0–36, slider)
- Mobile recharge regularity — "How consistent is your mobile recharge
  timing?" (0–100 slider, labeled "Irregular" → "Very regular")
- Income-generating activity — "Any countable measure of activity in the
  last 30 days — platform trips, freelance jobs, shop transactions,
  tutoring sessions, whatever applies to your work." (number input, 0+)
- Platform or client rating, if applicable — "From a gig app, marketplace,
  or client feedback. Leave at the default if this doesn't apply to you."
  (1.0–5.0, star selector or slider)

**Section D — Tell us about your income** (optional free text)
- Textarea, placeholder: "e.g. I run a small tailoring shop, or I do
  freelance design work, or I'm a student with a part-time tutoring
  income." (helper text: "This helps us compare you to similar applicants.
  Please don't include personal details like religion, marital status, or
  caste — we don't use these in our decision and will remove them
  automatically.")

- Primary button: "Get my decision" → Screen 3
- Form validation: inline errors, age/income/etc. bounds enforced client-side

### Screen 3: Results
Purpose: the core "wow" screen — score, explanation, transparency, cohort.

**Top: Decision banner** (large, color-coded by tier)
- Risk tier as the headline: "Approve" (green) / "Manual Review" (amber) /
  "Reject" (red)
- Estimated default probability as a smaller secondary stat (e.g. "9.6%
  estimated risk")

**Section: Why this decision** (plain-English explanation)
- The LLM-generated explanation paragraph (3–4 sentences)
- Below it, a small horizontal bar chart: "Top factors" — up to 5 features,
  each as a labeled bar, colored by whether it raised or lowered risk
  (red bar = raised risk, green = lowered risk), bar length = magnitude
  of SHAP value

**Section: Applicants like you** (cohort comparison)
- Card row/list, up to 5 similar past applicants, each showing: risk tier
  badge + a similarity indicator (e.g. "92% similar") — no PII, just tier
  and rough similarity
- Empty state: "You're the first applicant in this comparison group" (for
  when cohort is empty — this genuinely happens per our backend logic)

**Section: What could change this?** (stretch feature — counterfactual)
- Interactive: a dropdown of "improvable" factors (utility_payment_streak,
  recharge_regularity_score, gig_rating) + a slider for the new value +
  a "Recalculate" button
- Shows: "If your utility payment streak improved from 8 to 30 months,
  your decision would move from Manual Review to Approve" (only show the
  tier-change sentence if tier actually changes; otherwise show the
  smaller probability shift)
- This section can be visually deprioritized (collapsed/secondary) since
  it's the first thing cut if the team runs short on time

- Secondary button/link: "Apply again" → back to Screen 2

## Flow 2 — Reviewer (auth-gated)

### Screen 4: Reviewer Login
Purpose: simple gate, not a consumer-facing screen — can be plainer/more
utilitarian in tone than the applicant flow.
- Username + password fields
- Primary button: "Sign in"
- Error state: "Invalid credentials" (inline, no detail beyond that)

### Screen 5: Reviewer Dashboard
Purpose: underwriter's view of past applications — the "regulator-friendly,
auditable" story made visible.

**List view (default)**
- Table or card list, columns: Applicant ID (short/truncated UUID),
  Submitted date, Risk tier (badge), Estimated default probability
- Sortable/filterable by risk tier (Approve / Manual Review / Reject) and
  date — filters are a nice-to-have, not required for MVP
- Clicking a row opens Detail view (Screen 5b, or a right-side panel/modal)
- Empty state: "No applications yet"

**Detail view** (reuses the Results screen's layout/components — same
decision banner, explanation, feature chart, cohort — plus:)
- Full submitted feature values (the raw inputs), shown as a compact table
- Audit metadata: when scored, which LLM provider produced the explanation
  (mock/bedrock), whether guardrail redactions were made on the narrative
- No edit/override actions needed for this prototype — read-only view

---

## Design direction notes for Stitch
- Product: **Aperture** — a credit intelligence / fintech underwriting tool
- Persona: New-to-Credit (NTC) and thin-file applicants in India — people
  with UPI/mobile-first transaction history but no formal bureau file.
  This spans gig workers, small business owners, freelancers, students, and
  first-time earners; no single archetype should be assumed. The applicant
  flow should feel approachable, mobile-friendly, non-intimidating, NOT
  like a bank loan form. Plain language, generous spacing, reassuring tone.
- The reviewer dashboard can feel more like a standard SaaS admin/data tool
  — denser, table-driven, utilitarian.
- Color-code risk tiers consistently everywhere they appear: Approve =
  green, Manual Review = amber/yellow, Reject = red (but avoid looking
  alarming — this is a "review needed" not "you failed" system).
- This is a hackathon prototype for a Synchrony (SYF) fintech hackathon on
  "Next-Gen Credit Intelligence" — clean, credible, modern fintech aesthetic
  (think Stripe/Mercury-adjacent, not flashy).
