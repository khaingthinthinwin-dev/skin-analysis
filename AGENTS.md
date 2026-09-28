# AGENTS.md

## Scope (group project)
No file is off-limits. Read, edit, or create files anywhere in the repo
for any screen (e.g. Matching & Recommendation, Order Insights, Search,
Cart, Admin, Merchant). For screens owned by other team members, prefer
minimal, surgical edits and describe what you changed.

## Source of truth
Before implementing anything, read the relevant file(s) in:
docs/screen/Order_Insights/Detailed Design/
Do not invent fields, statuses, or endpoints not described there.

## Stack conventions
- React 19 + TypeScript, shadcn/ui components from @/components/ui, Tailwind CSS 4
- TanStack Query for data hooks, Zod for schemas
- Order Insights is READ-ONLY — no status-change buttons/actions (BR-OI-007)