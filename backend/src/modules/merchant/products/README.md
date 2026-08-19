# Merchants Module

## Ownership
- Developer Tag: `[PET]`
- Primary Responsibility: Merchant license verification & admin approval workflow

## Endpoints
- `GET /merchants` - List merchants (filtered by status)
- `GET /merchants/:id` - Get merchant detail
- `PATCH /merchants/:id/approve` - Approve merchant license
- `PATCH /merchants/:id/reject` - Reject merchant license with reason
