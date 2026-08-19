# Admin Module

## Ownership
- Developer Tag: `[PET]` / `[PPH]`
- Primary Responsibility: Platform administration, system stats, & admin controls

## Endpoints

### Dashboard
- `GET /admin/dashboard-stats` - Get summary KPI counts for admin dashboard

### User Management
- `GET /admin/users` - List all users with filtering (role, status) and pagination
- `PATCH /admin/users/:userId/status` - Toggle user active/inactive status

### Review Moderation
- `GET /admin/reviews` - List all reviews with filtering (approval status) and pagination
- `PATCH /admin/reviews/:id/approve` - Approve a pending review
- `DELETE /admin/reviews/:id` - Delete a review

### Review Reports
- `GET /admin/review-reports` - List review reports with status filtering
- `PATCH /admin/review-reports/:id/resolve` - Resolve or reject a review report

### Content Moderation
- `PATCH /admin/products/:id/deactivate` - Deactivate a product (soft delete)
- `GET /admin/products/flagged` - List deactivated/flagged products

### Merchant Management
- `GET /admin/merchants` - List merchants with status filtering and pagination
- `PATCH /admin/merchants/:id/approve` - Approve a merchant license
- `PATCH /admin/merchants/:id/reject` - Reject a merchant with reason

### Advertisement Management
- `GET /admin/ads` - List advertisements with status filtering and pagination
- `PATCH /admin/ads/:id/approve` - Approve an advertisement
- `PATCH /admin/ads/:id/reject` - Reject an advertisement with reason
- `GET /admin/ad-fee-settings` - Get ad fee configuration
- `PATCH /admin/ad-fee-settings/:id` - Update ad fee daily rate

### Commission Management
- `GET /admin/commission/settings` - Get commission rate settings
- `PATCH /admin/commission/settings` - Update commission rate
- `GET /admin/commission/payouts` - List payouts with status filtering
- `POST /admin/commission/payouts/:id/process` - Process a pending payout

### Revenue & Analytics
- `GET /admin/revenue/overview` - Get revenue KPIs and overview data
- `GET /admin/revenue/targets` - Get active revenue targets
- `POST /admin/revenue/targets` - Set or update revenue target

### Reports
- `GET /admin/reports/user-growth` - User growth analytics
- `GET /admin/reports/sales` - Sales performance reports
- `GET /admin/reports/categories` - Category performance metrics
- `GET /admin/reports/merchants` - Merchant performance rankings

### Audit Logs
- `GET /admin/audit-logs` - List audit logs with filtering and pagination
