# Order Insights Buyer E2E Coverage

Run: `npx playwright test tests/Order_Insights/order-insights.spec.ts` from `e2e/`  
Most recent full run: **21 passed, 1 timed out** (N-09 exceeded its 30-second timeout after its order update and notification evidence was captured). An earlier full run passed all 22 tests and verified N-09.  
Evidence: [`e2e/test-results/Order_Insights/screenshots/`](../../../e2e/test-results/Order_Insights/screenshots/). Desktop screenshots use a 1920×1032 viewport to match the laptop view; B-03 stays at a 375×667 mobile viewport. API evidence screenshots expand vertically to show the full response.

The Buyer PCL checked into this repository contains **21 scenarios** (9 N, 4 A, 4 B, 4 I), not 24. This report maps all 21 PCL entries. In the earlier passing run, all 22 Playwright tests passed, including N-09 using the seeded buyer–merchant shared order. That test advanced the seed order through one available merchant fulfillment transition and verified the resulting buyer notification and read state. The most recent run recaptured the evidence but timed out in N-09 after the API and UI evidence had been captured.

| PCL | E2E test | Evidence files | Result |
|---|---|---|---|
| N-01 Buyer views own order history | `N-01: buyer sees their order history` | `N-01_1_order_history_loaded.png`, `N-01_buyer_order_history.png` | Passed |
| N-02 Buyer opens an order detail | `N-02: buyer opens an order detail from history` | `N-02_1_order_available_in_history.png`, `N-02_buyer_order_detail.png` | Passed |
| N-03 Filters, sorting, and page size | `N-03: buyer filters, sorts, and changes page size` | `N-03_1_default_order_list.png`, `N-03_2_delivered_filter.png`, `N-03_3_date_sort_ascending.png`, `N-03_4_page_size_100.png` | Passed |
| N-04 Reset filters and export | `N-04: buyer resets filters and exports matching orders` | `N-04_1_filtered_before_reset.png`, `N-04_2_filters_reset.png`, `N-04_3_export_confirmation.png`, `N-04_4_export_completed.png` | Passed |
| N-05 Print/download invoice | `N-05: buyer downloads an invoice from order detail` | `N-05_1_order_detail_before_invoice.png`, `N-05_2_invoice_view.png` | Passed |
| N-06 Return to order list | `N-06: buyer returns from detail to the order list` | `N-06_1_detail_before_return.png`, `N-06_back_to_orders.png` | Passed |
| N-07 English, Japanese, and Myanmar | `N-07: buyer order history and detail are translated in English, Japanese, and Myanmar` | `N-07_english_order_history.png`, `N-07_english_order_detail.png`, `N-07_japanese_order_history.png`, `N-07_japanese_order_detail.png`, `N-07_myanmar_order_history.png`, `N-07_myanmar_order_detail.png` | Passed |
| N-08 Language persists across routes and reload | `N-08: buyer language preference persists between order list and detail` | `N-08_1_language_menu_open.png`, `N-08_1_japanese_language_selected.png`, `N-08_2_japanese_preference_on_detail.png`, `N-08_3_japanese_preference_after_reload.png` | Passed |
| N-09 Open order status notification | `N-09: buyer opens an order status notification and it is marked read` | `N-09_1_merchant_advances_order_api.png`, `N-09_1_unread_order_notification_api.png`, `N-09_2_unread_order_notification.png`, `N-09_3_notification_order_detail.png`, `N-09_4_notification_marked_read_api.png` | Passed; shared seeded order advanced through merchant API, buyer opened the resulting notification, and API confirmed it was marked read |
| A-01 Cross-buyer detail access is concealed | `A-01: buyer cannot open an order outside their scope` | `A-01_1_out_of_scope_not_found.png`, `A-01_out_of_scope_order_not_found.png` | Passed |
| A-02 Unauthenticated access denied | `A-02: unauthenticated visitor is denied buyer orders and API data` | `A-02_1_unauthenticated_redirect.png`, `A-02_2_unauthenticated_orders_api_evidence.png`, `A-02_3_unauthenticated_login_page.png` | Passed |
| A-03 Reversed date range rejected | `A-03: reversed order date range is rejected` | `A-03_1_reversed_dates_block_search.png`, `A-03_2_reversed_date_api_evidence.png` | Passed |
| A-04 List/detail request failure and retry | `A-04: buyer order list shows a retryable error on request failure`; `A-04: buyer order detail shows a retryable error on request failure` | `A-04_1_order_list_error.png`, `A-04_2_order_list_retried.png`, `A-04_3_order_detail_error.png`, `A-04_4_order_detail_retried.png` | Passed |
| B-01 Empty state | `B-01: buyer sees an empty state when no orders match` | `B-01_1_empty_search_results.png`, `B-01_2_empty_state_action.png` | Passed |
| B-02 Minimum and maximum page sizes | `B-02: buyer can select the first and last supported page sizes` | `B-02_1_minimum_page_size.png`, `B-02_2_maximum_page_size.png` | Passed |
| B-03 Narrow viewport | `B-03: buyer can reach order list and detail controls on a narrow viewport` | `B-03_1_mobile_order_list.png`, `B-03_2_mobile_order_detail.png` | Passed |
| B-04 KPI default/filtered behavior | `B-04: buyer KPI tiles respond when a status filter is applied` | `B-04_1_default_kpis.png`, `B-04_2_filtered_kpis.png` | Passed |
| I-01 Buyer list response and projection | `I-01: buyer orders API returns scoped rows, metadata, and summary` | `I-01_1_orders_screen_before_contract_check.png`, `I-01_2_orders_api_evidence.png` | Passed; asserts non-empty `shopName`, buyer projection, and IDs are absent from admin-wide scope |
| I-02 Own order detail projection | `I-02: buyer detail API returns their own order projection` | `I-02_1_order_history_before_detail_contract.png`, `I-02_2_order_detail_api_evidence.png` | Passed; asserts items, totals, shop projection, and no customer fields |
| I-03 Missing and out-of-scope detail return 404 | `I-03: missing buyer order detail returns 404` | `I-03_1_missing_order_api_evidence.png`, `I-03_1_missing_order_returns_404.png`, `I-03_2_foreign_order_api_evidence.png` | Passed |
| I-04 Buyer cannot select merchant/shop scope | `I-04: buyer cannot request an admin-selected merchant scope` | `I-04_1_orders_screen_before_scope_check.png`, `I-04_merchantId_api_evidence.png`, `I-04_shopId_api_evidence.png` | Passed; both filters return 403 |

## Remaining gap

No unverified PCL scenarios remain in this run. N-09 uses a real shared seeded order and advances it by one valid merchant transition on each successful run, so later executions observe the order's next status. The test does not create synthetic order or notification records.
