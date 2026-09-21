# AGENTS.md

## Scope restriction (group project — read carefully)
I only own the Order Insights module. NEVER read, edit, or create files
outside these paths without asking me first:
frontend/src/pages/order-insights/BuyerOrdersPage.tsx
frontend/src/features/order-insights/**

If a task seems to require touching anything else, STOP and ask me instead
of doing it.

## Source of truth
Before implementing anything, read the relevant file(s) in:
docs/screen/Order_Insights/Detailed Design/
Do not invent fields, statuses, or endpoints not described there.

## Stack conventions
- React 19 + TypeScript, shadcn/ui components from @/components/ui, Tailwind CSS 4
- TanStack Query for data hooks, Zod for schemas
- Order Insights is READ-ONLY — no status-change buttons/actions (BR-OI-007)