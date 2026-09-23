# Merchant Order Fulfillment

Backend module for the merchant's **order-fulfillment** surfaces: viewing one own-shop
order's full detail, reading its tracking timeline, and advancing its status
**one step at a time**.

> **Scope:** order _detail_ (read) + _status transition_ (write). The order _list_
> and the sales/revenue _summaries_ stay in the read-only Order Insights module.
> This module is merchant-only; `admin` / `buyer` do not route here.

Base path: `/api/v1/merchant/orders` (global `api/v1` prefix + `@Controller('merchant/orders')`).

All endpoints are guarded with `JwtAuthGuard` + `RolesGuard` and require the
`merchant` role. The merchant's `merchants.id` is always resolved server-side from
the JWT (`merchants.user_id`); if the row is missing or `license_status !== 'approved'`
the API returns `403 Forbidden - Your merchant account is not approved`.

## Endpoints

| Method  | Path                            | Description                                                                              |
| ------- | ------------------------------- | ---------------------------------------------------------------------------------------- |
| `GET`   | `/merchant/orders/:id`          | Own-shop order detail (items, totals, customer block, `availableTransitions`)            |
| `GET`   | `/merchant/orders/:id/tracking` | Status timeline from `order_status_history` joined to `order_statuses`, `created_at ASC` |
| `PATCH` | `/merchant/orders/:id/status`   | Advance the order status one step (`body: { status: string }`)                           |

Responses are returned directly; the global `TransformInterceptor` wraps them into
`{ data: ... }` like every other endpoint.

### `GET /merchant/orders/:id`

```jsonc
{
  "id": "…", "orderNumber": "ORD-…", "createdAt": "…",
  "status": "confirmed", "statusName": "Confirmed",
  "items": [{ "id": "…", "productName": "…", "productImage": "…",
              "quantity": 2, "unitPrice": "25.00", "totalPrice": "50.00" }],
  "discountAmount": "5.00", "totalAmount": "95.00",
  "paymentMethod": "cod", "paymentStatus": "pending",
  "shippingAddress": { … }, "notes": "…",
  "customer": { "name": "…", "email": "…", "phone": "…" },
  "availableTransitions": ["packed"]
}
```

- Item `unitPrice` / `totalPrice` are the values **stored on `order_items`** at
  checkout — never recomputed from the product's current price.
- The `customer` block (name/email/phone) is merchant-only, projected from the
  buyer's `users` row.
- `availableTransitions` is the single next `statusCode` this merchant may set
  right now; `['confirmed']` for a `placed` order (reviewed below) and `[]` when
  the current status is `delivered` (terminal).

### `GET /merchant/orders/:id/tracking`

```jsonc
{
  "timeline": [
    {
      "status": "placed",
      "statusName": "Placed",
      "note": "Order placed",
      "changedBy": null,
      "createdAt": "…",
    },
  ],
}
```

Timeline items mirror the buyer's order-detail timeline item shape so the frontend
can reuse the same `TrackingTimeline` / `DeliveryProgress` rendering.

### `PATCH /merchant/orders/:id/status`

Input DTO: `{ "status": "packed" }` (`@IsString`, `@IsNotEmpty`).

## Status transition rule

Forward-only, **one step at a time**, from the state machine in `order_statuses`
(`display_order`):

```
placed → confirmed → packed → shipped → out_for_delivery → delivered
```

Checks run in this order:

| #   | Condition                                               | Result                                                |
| --- | ------------------------------------------------------- | ----------------------------------------------------- |
| 1   | current status `is_terminal_state` (delivered)          | `422 This order has already been delivered`           |
| 2   | requested `statusCode` not in `order_statuses`          | `400 Invalid status`                                  |
| 3   | requested status is `placed`                            | `422 Orders can only move forward one step at a time` |
| 4   | requested `display_order` ≠ current `display_order + 1` | `422 Orders can only move forward one step at a time` |

- `placed` is set **only at checkout**, so it can never be a target of this
  endpoint (check 3). However, **`placed` → `confirmed` is a merchant action
  here** — the merchant confirms a placed order with the "Confirm" button on the
  Order Detail page (TR-OI-01); it follows the normal `display_order + 1` rule
  like any other step.
- No skips, no backward moves, no re-setting the same status.
- **`paymentStatus` is deliberately out of scope** — status transitions are
  independent of payment state (cash-on-delivery orders can be packed/shipped
  while `paymentStatus` is still `pending`).
- Ownership: on a missing order or a `merchant_id` mismatch the API returns
  `404 Order not found` (never `403`, order IDs cannot be enumerated) and writes a
  fire-and-forget `CROSS_SCOPE_ACCESS_DENIED` audit row.
- On success the whole update (`orders.status_code` + one `order_status_history`
  row with `changed_by = userId`, note `Status updated by merchant`) runs inside a
  single `prisma.$transaction`, and the response mirrors `GET /merchant/orders/:id`
  so the frontend can replace its cached detail with the mutation result.

## Audit log

Fire-and-forget writes (never block the response); failures are `Logger.warn`-ed:

| Action                      | When                                                     |
| --------------------------- | -------------------------------------------------------- |
| `CROSS_SCOPE_ACCESS_DENIED` | View/track/update on another merchant's order (then 404) |
| `ORDER_DETAIL_VIEWED`       | Successful `GET /merchant/orders/:id`                    |
| `ORDER_TRACKING_VIEWED`     | Successful `GET /merchant/orders/:id/tracking`           |
| `ORDER_STATUS_UPDATED`      | Successful status transition (`newValue: { from, to }`)  |

## Rate limiting

`PATCH /merchant/orders/:id/status` — **20 requests / user / 60 seconds** via
`redis.checkRateLimit('rate:order-fulfillment:status:{userId}', 20, 60)`; on
exceed a `429 Too many requests. Please wait 60 seconds` is returned. Redis
unavailable = request allowed. The GET endpoints are not additionally rate-limited
here (the global `RateLimitInterceptor` still applies).

## Known gaps

- `OrderFulfillmentModule` is **not registered** in `backend/src/app.module.ts`.
  Required change (reported, not applied):
  - import `OrderFulfillmentModule` from
    `'./modules/merchant/order-fulfillment/order-fulfillment.module'`
  - add `OrderFulfillmentModule` to the `imports: [...]` array.
- Merchant only (`@Roles('merchant')`); no admin/buyer routes in this controller.
- `orderNumber` mirrors the buyer endpoint's fabricated `ORD-{id[0:8].toUpperCase()}`
  format rather than the DB column `orders.order_number`.
- `orderStatusHistory.changedBy` is `null` for rows written by checkout
  (`placeOrder` writes history without `changedBy`), so the timeline's `changedBy`
  can be null for the initial `placed` step.
- No stale `orders.paymentStatus` coupling by design (see transition rule above).
