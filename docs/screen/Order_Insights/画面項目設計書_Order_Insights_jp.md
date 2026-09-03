# 画面項目設計書（Screen Items Specification）— Order Insights

**文書ID:** SKM-SIS-OI-001  
**対象画面:** 購入者 注文履歴（Buyer Order History）、購入者 注文詳細（Buyer Order Detail）、購入者 注文追跡（Buyer Order Tracking）、販売者 注文インサイト（Merchant Order Insights — 売上／収益サマリー＋注文リスト）、販売者 注文詳細（Merchant Order Detail）、管理者 注文インサイト（Admin Order Insights — 全注文＋注文詳細）  
**サブシステム:** Order Insights  
**機能ID:** FN-OI-001（購入者 注文インサイト）、FN-OI-002（販売者 注文インサイト）、FN-OI-003（管理者 注文インサイト）  
**バージョン:** 1.2
**作成日:** 2026-08-26  
**最終更新日:** 2026-08-26  
**作成者:** シニアシステムエンジニア  
**レビュー状態:** ドラフト（社内レビュー用）  
**分類:** 社内 — エンジニアリング部門

---

## 1. ドキュメント管理（Document Control）

### 1.1 文書改訂履歴（Document Revision History）

| バージョン | 日付 | 作成者 | 変更内容 |
| :--- | :--- | :--- | :--- |
| 1.0 | 2026-08-26 | シニアシステムエンジニア | 初版公開。Order Insights サブシステムの画面項目仕様。SKM-FDS-OI-001（機能設計書）v2.0 の §5 画面仕様および §7 入出力仕様に整合。 |
| 1.1 | 2026-08-26 | シニアシステムエンジニア | **社内テンプレート `画面項目設計書_Commission_&_Revenue.md` に完全一致するよう再構成。** 各画面にローカルな `[A]`／`[B]`／`[C]` セクション記号（レイアウトごとに再採番）を使用した ASCII ボックス図のレイアウトを追加。全項目テーブルを同じ 10 カラム形式に変換し、EL-OI-xx を「マッピング先（EL-OI）」の相互参照カラムとして維持。§5 項目の挙動、§6 バリデーション／エラーメッセージマッピング（FDS §8／§9 から）、§7 データベースフィールドマッピング（FDS §15.2 から）、§8 API レスポンスマッピング（FDS §7 から）、§9 i18n キー、§10 共有コンポーネント、§11 特別な UI 仕様、§12 テストチェックリストを追加。画面 5（販売者 注文詳細）を新規 `Design_Photos/merchant-order-detail.png` デザインと照合。 |
| 1.2 | 2026-08-27 | シニアシステムエンジニア | レイアウト 7「管理者 注文詳細」を `/admin/orders/:id` に追加。ローカル項目 ID、無制限の注文明細テーブル、ショップ／販売者情報、合計、顧客情報、共有の Track Order ナビゲーションを含む。読み取り専用の動作、テスト、`Design_Photos/admin-order-detail.png` との照合を追加。 |

### 1.2 関連ドキュメント（Related Documents）

| No. | 文書ID | 文書名 | ファイルパス | 備考 |
| :-- | :--- | :--- | :--- | :--- |
| 1 | SKM-REQ-001 | 要件定義書 | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | 業務ワークフロー、ユーザーロール、注文管理ルール（§3.3、§4.5、§5.6、§6.4）。 |
| 2 | SKM-DBS-001 | データベース設計書 | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | UUID 主キー、Decimal 型、JSONB `shipping_address`、外部キー関係、制約を含むテーブル構造。 |
| 3 | SKM-DEV-001 | 開発ルール | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` | 命名規則、セキュリティルール、RBAC、エラーレスポンス、デザイントークン。 |
| 4 | SKM-FDS-OI-001 | 機能設計書 — Order Insights | `docs/screen/Order_Insights/機能設計書_Order_Insights.md` | ユースケース、業務ルール（BR-OI-xxx）、画面仕様（§5）、操作（§6）、入出力 DTO（§7）、バリデーション（§8）、エラー（§9）、トレーサビリティ（§15）。 |
| 5 | — | デザイン参照 — Order Insights | `docs/screen/Order_Insights/Design_Photos/` | 視覚レイアウト照合に使用する Figma スクリーンショット（§11.1）。 |

---
## 2. 画面概要・目的（Screen Overview & Purpose）

### 2.1 目的（Purpose）
Order Insights サブシステムは、各ロールに自らに属する注文のビューを提供します。また、販売者に対してのみ、これらの注文から導出される売上および収益のサマリーも提供します。本ドキュメントは、3 つのロールすべてにわたる注文履歴、注文詳細、注文追跡の唯一の仕様です。本サブシステムは**完全に読み取り専用**（FDS §1.1）です。注文ステータスの進行は Order Fulfillment モジュールが所有しており、以下の画面はいずれも注文データを変更しません。

| 画面（レイアウト） | ルート | 機能ID | 主要アクター |
| :--- | :--- | :--- | :--- |
| レイアウト 1 — 購入者 注文履歴 | `/orders` | FN-OI-001 | 購入者 |
| レイアウト 2 — 購入者 注文詳細 | `/orders/:id` | FN-OI-001 | 購入者 |
| レイアウト 3 — 注文追跡 | `/orders/:id/tracking` | FN-OI-001 | 購入者、販売者、管理者（ロール別スコープ） |
| レイアウト 4 — 販売者 注文インサイト | `/merchant/orders` | FN-OI-002 | 販売者、管理者 |
| レイアウト 5 — 販売者 注文詳細 | `/merchant/orders/:id` | FN-OI-002 | 販売者 |
| レイアウト 6 — 管理者 全注文 | `/admin/orders` | FN-OI-003 | 管理者 |
| レイアウト 7 — 管理者 注文詳細 | `/admin/orders/:id` | FN-OI-003 | 管理者 |

### 2.2 対象ユーザーと権限（Target Users & Roles）

| 属性 | 値 |
| :--- | :--- |
| **主要アクター** | 購入者（Buyer）、販売者（Merchant）、管理者（Admin） |
| **要求認証** | JWT アクセストークン（購入者／販売者／管理者ロール） |
| **データスコープ** | 呼び出し元が所有する注文 — 購入者 → 自身の注文、販売者 → 自ショップの注文、管理者 → 全プラットフォーム注文（BR-OI-001） |
| **アクセス制御** | BR-OI-001 に基づく所有スコープ制御。販売者は `license_status = 'approved'` が必須（BR-OI-006、違反時は 403 を返却）。販売者／管理者専用データは他ロールに対し 403 で拒否。`:id` の所有権は BR-OI-008 に従う |

### 2.3 主要機能・基本設計方針（Core Functions & Basic Design Principles）
1. **ロール別スコープの注文履歴** — 各ロールは自らのスコープに属する注文のみを参照する（BR-OI-001）。顧客名は販売者／管理者のみに投影される（BR-OI-015）。
2. **注文詳細** — 明細、合計、支払ステータス、配送先住所、メモ。顧客情報ブロックは販売者／管理者のみ（BR-OI-015/033）。
3. **注文追跡タイムライン** — `order_statuses` から `display_order` 順に取得される 6 ステップのステッパー（BR-OI-013）。履歴不明時のフォールバックは BR-OI-014 に従う。
4. **販売者 売上サマリー** — 本日／今月／完了 の注文数タイル（BR-OI-018）。
5. **販売者 収益サマリー** — 売上／コミッション／収益／平均注文額（AOV）を**一つの分割不可グループとして一緒に**返却（BR-OI-026）。AOV は総売上ではなく純収益に基づく（BR-OI-025）。コミッション率スナップショットのスキーマ間隙は BR-OI-023／BR-OI-032 に従って管理。
6. **複合フィルター** — ステータス、日付範囲、（管理者のみ）ショップ／販売者フィルターは、クライアント側ではなく SQL で AND 結合される（BR-OI-016）。
7. **読み取り専用境界** — ステータス遷移や注文データの書き込みを行う画面は存在しない。「ステータス変更」（EL-OI-57）は Order Fulfillment へのナビゲーションのみ。
8. **PII 最小化** — 顧客の連絡先／配送情報はフルフィルメントのニーズに限定（BR-OI-033）。
9. **国際化** — 全ラベルは EN／JA／MY で解決される i18n キー（FDS §13.6）。

---
## 3. 画面レイアウト構成（Screen Layout）

### 3.1 全体画面構成（Overall Page Structure）

以下の各画面は、**レイアウトごとにリセットされるローカルなセクション記号 `[A]`、`[B]`、`[C]`...** を使用した ASCII ボックス図で説明されます。ボックス内の要素 ID はローカルな UI 識別子であり、FDS の要素 ID（`EL-OI-xx`）は §4 の項目テーブル内で相互参照として保持されます — ここでは主要な項目 ID として再利用されません。

---

#### レイアウト 1: 購入者 注文履歴（`/orders`）

```text
┌──────────────────────────────────────────────────────────────┐
│                     BROWSER VIEWPORT                          │
├──────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [A] PAGE HEADER                                       │  │
│  │  h5 "My Orders" (lblPageTitle)                         │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [B] FILTER BAR                                        │  │
│  │  [B1] Status Filter (selFilterStatus)                  │  │
│  │  [B2] Date Range Picker (drpFilterDateRange)           │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [C] ORDER LIST TABLE (tblOrderList)                   │  │
│  │  Order # / Date / Items / Total / Payment / Status     │  │
│  │   • [C1] Status Badge (badgeOrderStatus) [row-level]   │  │
│  │   • [C2] Track Link (lnkTrack) [row-level]             │  │
│  │  [C3] Pagination (pgOrderList)                         │  │
│  └────────────────────────────────────────────────────────┘  │
│  [D] EMPTY STATE (emptyOrderList) — shown only when 0 rows  │
└──────────────────────────────────────────────────────────────┘
```

---

#### レイアウト 2: 購入者 注文詳細（`/orders/:id`）

```text
┌──────────────────────────────────────────────────────────────┐
│                     BROWSER VIEWPORT                          │
├──────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [A] ORDER HEADER (cardOrderHeader)                    │  │
│  │  Order #  •  Date  •  Shop Name  •  [A1] Status Badge  │  │
│  │  (badgeStatus)                                         │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [B] ORDER ITEMS TABLE (tblOrderItems)                 │  │
│  │  Product / Qty / Unit Price / Line Total               │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [C] TOTALS PANEL (cardTotals)                         │  │
│  │  Subtotal  /  Discount (+coupon)  /  Total             │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [D] PAYMENT STATUS (cardPayment)                      │  │
│  │  Payment Method  •  [D1] Payment Badge (badgePayment)  │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [E] SHIPPING ADDRESS (cardShippingAddress)            │  │
│  └────────────────────────────────────────────────────────┘  │
│  [F] ORDER NOTES (txtOrderNotes) — hidden when null       │
│  [G] TRACK ORDER (btnTrackOrder)                          │
└──────────────────────────────────────────────────────────────┘
```

---

#### レイアウト 3: 注文追跡（`/orders/:id/tracking`）— 購入者／販売者／管理者

```text
┌──────────────────────────────────────────────────────────────┐
│                     BROWSER VIEWPORT                          │
├──────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [A] ORDER REFERENCE (txtOrderReference)               │  │
│  │  Order #  •  Order Date                                │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [B] STATUS TIMELINE (stpTrackingTimeline)             │  │
│  │  Placed ─ Confirmed ─ Packed ─ Shipped ─               │  │
│  │  ─ Out for Delivery ─ Delivered                        │  │
│  │   • [B1] Step Timestamp (txtStepTimestamp) [r]         │  │
│  │   • [B2] Current Status Marker (mkrCurrentStep)        │  │
│  └────────────────────────────────────────────────────────┘  │
│  [C] DELIVERED BANNER (bannerDelivered) — shown when       │
│  status = 'delivered' (terminal)                           │
│  [D] NO-HISTORY NOTE (txtNoHistory) — historyAvailable=false│
│  [E] BACK TO DETAIL (lnkBackToDetail)                      │
└──────────────────────────────────────────────────────────────┘
```

---

#### レイアウト 4: 販売者 注文インサイト（`/merchant/orders`）

```text
┌──────────────────────────────────────────────────────────────┐
│                     BROWSER VIEWPORT                          │
├──────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [A] PAGE HEADER                                       │  │
│  │  h5 "Order Insights" (lblPageTitle)                    │  │
│  │  [A1] Scope Note (txtScopeNote)                        │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [B] SALES SUMMARY (grpSalesSummary)                   │  │
│  │  [B1] Today (tileTodayOrders)   [B2] This Month        │  │
│  │  (tileThisMonthOrders)  [B3] Completed (tileCompleted) │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [C] REVENUE SUMMARY (grpRevenueSummary)               │  │
│  │  [C1] Sales (statSales)  [C2] Commission               │  │
│  │  (statCommission)  [C3] Revenue (statRevenue)          │  │
│  │  [C4] AOV (statAov)  [C5] Order Count (txtOrderCount)  │  │
│  │  [C6] Rate Footnote (txtRateFootnote)                  │  │
│  │  [C7] Period Selector (tglPeriod)                      │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [D] OWN-SHOP ORDER LIST (tblMerchantOrderList)        │  │
│  │  [D1] Status Filter (selFilterStatus)  [D2] Date Range │  │
│  │  (drpFilterDateRange)                                  │  │
│  │  Order #/Date/Customer/Items/Total/Payment/Status      │  │
│  │  • [D3] Row Actions (lnkRowActions) [row-level]        │  │
│  │  [D4] Pagination (pgMerchantOrderList)                 │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

#### レイアウト 5: 販売者 注文詳細（`/merchant/orders/:id`）

```text
┌──────────────────────────────────────────────────────────────┐
│                     BROWSER VIEWPORT                          │
├──────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [A] ORDER HEADER (cardOrderHeader)                    │  │
│  │  Order #  •  Date  •  [A1] Status Badge (badgeStatus)  │  │
│  │  [A2] Payment Status (badgePayment)                    │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [B] OWN-SHOP ITEMS TABLE (tblMerchantOrderItems)      │  │
│  │  Product / Qty / Unit Price / Line Total               │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [C] TOTALS PANEL (cardTotals)                         │  │
│  │  Subtotal  /  Discount (+coupon)  /  Total             │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [D] CUSTOMER INFORMATION (cardCustomerInfo)           │  │
│  │  Buyer Name / Email / Phone / Shipping Address         │  │
│  └────────────────────────────────────────────────────────┘  │
│  [E] ORDER NOTES (txtOrderNotes) — hidden when null       │
│  [F] TRACK ORDER (btnTrackOrder)                          │
│  [G] CHANGE STATUS (lnkChangeStatus) — nav to Fulfillment │
└──────────────────────────────────────────────────────────────┘
```

---

#### レイアウト 6: 管理者 全注文（`/admin/orders`）

```text
┌──────────────────────────────────────────────────────────────┐
│                     BROWSER VIEWPORT                          │
├──────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [A] PAGE HEADER                                       │  │
│  │  h5 "All Orders" (lblPageTitle)                        │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [B] FILTER BAR                                        │  │
│  │  [B1] Shop/Merchant (selFilterShop)  [B2] Status       │  │
│  │  (selFilterStatus)  [B3] Date Range (drpFilterDateRange)│  │
│  │  [B4] Active Filter Chips (grpActiveFilters)           │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [C] RESULT COUNT (txtResultCount)                     │  │
│  │  "42 orders match the current filters"                 │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [D] ORDER LIST TABLE (tblAdminOrderList)              │  │
│  │  Order #/Date/Shop-Merchant/Buyer/Items/Total/Payment/Status│
│  │  • [D1] Row Actions (lnkRowActions) [row-level]        │  │
│  │  [D2] Pagination (pgAdminOrderList)                    │  │
│  └────────────────────────────────────────────────────────┘  │
│  [E] EMPTY STATE (emptyAdminOrderList) — 0 rows match      │
└──────────────────────────────────────────────────────────────┘
```

---

#### レイアウト 7: 管理者 注文詳細（`/admin/orders/:id`）

```text
┌──────────────────────────────────────────────────────────────┐
│                     BROWSER VIEWPORT                          │
├──────────────────────────────────────────────────────────────┤
│  ← All Orders                 /admin/orders/:id                │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [A] ORDER HEADER (cardAdminOrderHeader)               │  │
│  │  Order #  •  Placed date/time  •  Status  •  Payment   │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [B] SHOP / MERCHANT (cardAdminShopInfo)               │  │
│  │  Shop Name  •  Merchant ID                             │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [C] ITEMS TABLE (tblAdminOrderItems)                  │  │
│  │  Product / Qty / Unit Price / Line Total               │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [D] TOTALS PANEL (cardAdminTotals)                    │  │
│  │  Subtotal  /  Discount (+coupon)  /  Total             │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [E] CUSTOMER INFORMATION (cardAdminCustomerInfo)      │  │
│  │  Name / Email / Phone / Shipping Address               │  │
│  └────────────────────────────────────────────────────────┘  │
│  [F] TRACK ORDER (btnAdminTrackOrder)                       │  │
└──────────────────────────────────────────────────────────────┘
```

---
### 3.2 レスポンシブ対応（Responsive Layout Breakpoints）

| ブレークポイント | 最小幅 | レイアウト挙動 |
| :--- | :--- | :--- |
| モバイル（既定） | 0px | フィルターバーは縦積み、テーブルは横スクロール、サマリータイル／統計グループは 1 カラムに積み上げ、タイムラインは全幅表示。 |
| タブレット（`md:`） | 768px | 統計タイルは 2 カラム、フィルターバーは折返し、テーブルは全幅＋横スクロール。 |
| デスクトップ（`lg:`） | 1024px | 注文リストの行は全カラムを表示、ページネーションは右寄せ、収益サマリーは 4 統計の行として描画。 |
| ワイド（`xl:`） | 1280px | テーブルは全幅で間隔を拡大、管理者フィルターバーは単一行。 |

---

## 4. 画面項目定義（Item Definitions）

以下各レイアウトは、§3.1 のボックス図に対応する独自のローカルセクション記号 `[A]`、`[B]`、`[C]`... を使用します。**全項目テーブルは同じ 10 カラムを使用します。** FDS の要素 ID（`EL-OI-xx`）は専用の相互参照カラムに保持され、主要な項目 ID としては使用されません。

**必須**カラムの凡例: `必須（Yes）`／`不要（No）`／`条件付き（Cond.）`／`—`（UI のみのコンテナまたはハードコードされたラベル）— 値は特に断りのない限り FDS §5 に従います。

### 4.1 レイアウト 1: 購入者 注文履歴（`/orders`）

#### セクション [A]: ページヘッダー（Page Header）

| No. | 項目ID | 項目名（論理） | コンポーネント種別 | データ型・最大長 | 必須 | 初期状態／既定値 | 入力制約／形式 | データソース／DB マッピング | 備考／業務ルール | マッピング先（EL-OI） |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `lblPageTitle` | ページタイトル | 見出し（h5） | 文字列 | 必須 | 表示。テキスト: "My Orders" | — | ハードコードされた UI テキスト | i18n キー: `buyer.orders.title`。 | EL-OI-01 |

#### セクション [B]: フィルターバー（Filter Bar）

| No. | 項目ID | 項目名（論理） | コンポーネント種別 | データ型・最大長 | 必須 | 初期状態／既定値 | 入力制約／形式 | データソース／DB マッピング | 備考／業務ルール | マッピング先（EL-OI） |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `selFilterStatus` | ステータス絞り込み | セレクト | 文字列 | 不要 | 既定 "All" | オプション: All / placed / confirmed / packed / shipped / out_for_delivery / delivered | `order_statuses.status_code` | i18n キー: `orders.filter.status`。値はシードされた `order_statuses` コード（BR-OI-011）。 | EL-OI-02 |
| 2 | `drpFilterDateRange` | 日付範囲絞り込み | 日付範囲ピッカー | 日付 × 2 | 不要 | 空（全期間） | ISO 日付、`to ≥ from` | `orders.created_at` | i18n キー: `orders.filter.dateRange`。注文日で絞り込み。 | EL-OI-03 |

#### セクション [C]: 注文リストテーブル（Order List Table）

| No. | 項目ID | 項目名（論理） | コンポーネント種別 | データ型・最大長 | 必須 | 初期状態／既定値 | 入力制約／形式 | データソース／DB マッピング | 備考／業務ルール | マッピング先（EL-OI） |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `tblOrderList` | 注文リストテーブル | テーブル | — | 必須 | ローディングスケルトン、20 行／ページ、`createdAt DESC` | カラム: 注文番号、日付、明細、合計、支払、ステータス | §7.4 order-history-row DTO（§8.1 参照） | i18n キー: `orders.table`。サーバーサイドページネーション／ソート（§8.1 バリデーション）。 | EL-OI-04 |
| 2 | `badgeOrderStatus` | ステータスバッジ | バッジ | VARCHAR(50) | 必須 | 行ごとに 1 件 | ステータスコードごとに 1 色 | `order_statuses.status_name` | BR-OI-031 に基づき色分け。i18n ラベル。行レベル。 | EL-OI-05 |
| 3 | `lnkTrack` | 追跡リンク | リンク／ボタン（ゴースト） | — | 必須 | 行ごとに 1 件 | `/orders/:id/tracking` へ遷移 | — | i18n キー: `orders.track`。行レベル。 | EL-OI-06 |
| 4 | `pgOrderList` | ページネーション | コントロール | — | 必須 | N ページ中の 1 ページ、20 件／ページ | 前へ／次へ、"Page 1 of 3 · 42 orders" | `meta`（page/limit/total） | i18n キー: `common.pageInfo`。`page ≥ 1`、`limit` は 1–100（§8.1）。 | EL-OI-07 |

#### セクション [D]: 空状態（Empty State）

| No. | 項目ID | 項目名（論理） | コンポーネント種別 | データ型・最大長 | 必須 | 初期状態／既定値 | 入力制約／形式 | データソース／DB マッピング | 備考／業務ルール | マッピング先（EL-OI） |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `emptyOrderList` | 空状態 | イラスト＋テキスト | — | 必須 | 既定では非表示。0 行の場合に表示 | テキスト: "You haven't placed any orders yet." ＋ Browse Products CTA | — | i18n キー: `orders.empty`。BR-OI-030 — 空はエラーではない。 | EL-OI-08 |

> **注記（フラグ済み）:** 購入者履歴の行 DTO（§7.4）は、購入者ロールに対して `customerName`／`shopName` カラムを公開しません — 購入者テーブルではこれらを描画してはならない。

---
### 4.2 レイアウト 2: 購入者 注文詳細（`/orders/:id`）

#### セクション [A]: 注文ヘッダー（Order Header）

| No. | 項目ID | 項目名（論理） | コンポーネント種別 | データ型・最大長 | 必須 | 初期状態／既定値 | 入力制約／形式 | データソース／DB マッピング | 備考／業務ルール | マッピング先（EL-OI） |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `cardOrderHeader` | 注文ヘッダー | カード | — | 必須 | 表示 | 注文番号、日付、現在のステータスバッジ | `orders.id`、`orders.created_at`、`orders.status` | i18n キー: `orders.detail.header`。 | EL-OI-10 |
| 2 | `badgeStatus` | ステータスバッジ | バッジ | VARCHAR(50) | 必須 | ヘッダー内に表示 | ステータスコードごとに 1 色 | `order_statuses.status_name` | BR-OI-031 に基づき色分け。i18n ラベル。 | EL-OI-10（ヘッダーの一部） |
| 3 | `txtShopName` | ショップ名 | テキスト | 文字列 | 必須 | 表示 | 名前のみ。販売者 ID は描画しない | `shop.name`（`orders.merchant_id` 経由の `merchants.shop_name`） | FDS §7.5 に基づき購入者に表示。`shop.merchantId` は管理者のみのまま。この出力フィールドには EL-OI ID が定義されていない。 | —（FDS §7.5 のフィールド） |

#### セクション [B]: 注文明細テーブル（Order Items Table）

| No. | 項目ID | 項目名（論理） | コンポーネント種別 | データ型・最大長 | 必須 | 初期状態／既定値 | 入力制約／形式 | データソース／DB マッピング | 備考／業務ルール | マッピング先（EL-OI） |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `tblOrderItems` | 注文明細テーブル | テーブル | UUID / INTEGER / DECIMAL(10,2) | 必須 | ローディングスケルトン | カラム: 商品、数量、単価、行合計 | `order_items` ＋ `products.name`（§7.5 `items[]`） | i18n キー: `orders.detail.items`。価格は注文作成時に固定（BR-OI-017）。 | EL-OI-11 |

#### セクション [C]: 合計パネル（Totals Panel）

| No. | 項目ID | 項目名（論理） | コンポーネント種別 | データ型・最大長 | 必須 | 初期状態／既定値 | 入力制約／形式 | データソース／DB マッピング | 備考／業務ルール | マッピング先（EL-OI） |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `cardTotals` | 合計パネル | カード | DECIMAL(10,2) / VARCHAR(50) | 必須 | — | 行: 小計、割引（クーポンあり）、**合計** | 小計（導出）、`orders.discount_amount`、`orders.coupon_code`、`orders.total_amount` | i18n キー: `orders.detail.totals`。**送料の行はなし** — §7.5 は `discountAmount`／`couponCode`／`totalAmount` のみを公開。 | EL-OI-12 |

#### セクション [D]: 支払ステータス（Payment Status）

| No. | 項目ID | 項目名（論理） | コンポーネント種別 | データ型・最大長 | 必須 | 初期状態／既定値 | 入力制約／形式 | データソース／DB マッピング | 備考／業務ルール | マッピング先（EL-OI） |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `cardPayment` | 支払ステータス | カード | VARCHAR(50) / VARCHAR(20) | 必須 | — | 支払方法＋ステータスバッジ | `orders.payment_method`、`orders.payment_status` | i18n キー: `orders.detail.payment`。ステータス ∈ {pending, completed}（`chk_orders_payment_status`）。 | EL-OI-13 |

#### セクション [E]: 配送先住所（Shipping Address）

| No. | 項目ID | 項目名（論理） | コンポーネント種別 | データ型・最大長 | 必須 | 初期状態／既定値 | 入力制約／形式 | データソース／DB マッピング | 備考／業務ルール | マッピング先（EL-OI） |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `cardShippingAddress` | 配送先住所 | カード | JSONB | 必須 | — | 整形済み住所ブロック | `orders.shipping_address`（JSONB） | i18n キー: `orders.detail.shipping`。 | EL-OI-14 |

#### セクション [F]: 注文メモ（Order Notes）

| No. | 項目ID | 項目名（論理） | コンポーネント種別 | データ型・最大長 | 必須 | 初期状態／既定値 | 入力制約／形式 | データソース／DB マッピング | 備考／業務ルール | マッピング先（EL-OI） |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `txtOrderNotes` | 注文メモ | テキスト | TEXT | 不要 | null の場合は非表示 | — | `orders.notes` | i18n キー: `orders.detail.notes`。 | EL-OI-15 |

#### セクション [G]: 注文追跡ボタン（Track Order）

| No. | 項目ID | 項目名（論理） | コンポーネント種別 | データ型・最大長 | 必須 | 初期状態／既定値 | 入力制約／形式 | データソース／DB マッピング | 備考／業務ルール | マッピング先（EL-OI） |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `btnTrackOrder` | 注文追跡ボタン | ボタン（プライマリ） | — | 必須 | 表示 | `/orders/:id/tracking` へ遷移 | — | i18n キー: `orders.track`。 | EL-OI-16 |

> **注記（フラグ済み）:** §7.5 の order-detail DTO はさらに `customer.*`（販売者／管理者のみ、BR-OI-015/033）と `shop.name`／`shop.merchantId` を保持します。購入者 注文詳細は `shop.name` のみを描画し、`shop.merchantId` は管理者のみのままです。顧客フィールドはレイアウト 5／7 で描画され、購入者の詳細では描画されません。

---
### 4.3 レイアウト 3: 注文追跡 — `/orders/:id/tracking`（購入者／販売者／管理者）

#### セクション [A]: 注文参照（Order Reference）

| No. | 項目ID | 項目名（論理） | コンポーネント種別 | データ型・最大長 | 必須 | 初期状態／既定値 | 入力制約／形式 | データソース／DB マッピング | 備考／業務ルール | マッピング先（EL-OI） |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `txtOrderReference` | 注文参照 | テキスト | — | 必須 | 表示 | 注文番号＋注文日 | `orders.id`、`orders.created_at` | i18n キー: `orders.tracking.ref`。 | EL-OI-20 |

#### セクション [B]: ステータスタイムライン（Status Timeline）

| No. | 項目ID | 項目名（論理） | コンポーネント種別 | データ型・最大長 | 必須 | 初期状態／既定値 | 入力制約／形式 | データソース／DB マッピング | 備考／業務ルール | マッピング先（EL-OI） |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `stpTrackingTimeline` | ステータスタイムライン | ステッパー（縦型） | — | 必須 | 展開表示、現在のステップをビュー内にスクロール | `display_order` 順の 6 ステップ | `order_statuses`（placed→…→delivered） | i18n キー: `orders.tracking.timeline`。ステップは BR-OI-013 による。 | EL-OI-21 |
| 2 | `txtStepTimestamp` | ステップタイムスタンプ | テキスト | — | 必須 | 到達済みステップごとに 1 件 | 到達済み → ISO タイムスタンプ、未到達 → 空白 | `order_status_history.created_at` | タイムライン内の行レベル。 | EL-OI-22 |
| 3 | `mkrCurrentStep` | 現在ステータス強調 | マーカー | — | 必須 | タイムラインごとに 1 件 | `done` / `current` / `upcoming`（§3.3） | `orders.status` とステップから導出 | `STEP_CURRENT` はラグジュアリーパープル `#7C3AED` のマーカーを取得。 | EL-OI-23 |

#### セクション [C]: 配送完了確認（Delivered Banner）

| No. | 項目ID | 項目名（論理） | コンポーネント種別 | データ型・最大長 | 必須 | 初期状態／既定値 | 入力制約／形式 | データソース／DB マッピング | 備考／業務ルール | マッピング先（EL-OI） |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `bannerDelivered` | 配送完了確認 | バナー | — | 不要 | 非表示。`status = 'delivered'` の場合に表示 | 終端状態バナー | `orders.status` | i18n キー: `orders.tracking.delivered`。終端状態（`is_terminal_state`）。 | EL-OI-24 |

#### セクション [D]: 履歴不明注記（No-History Note）

| No. | 項目ID | 項目名（論理） | コンポーネント種別 | データ型・最大長 | 必須 | 初期状態／既定値 | 入力制約／形式 | データソース／DB マッピング | 備考／業務ルール | マッピング先（EL-OI） |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `txtNoHistory` | 履歴不明注記 | テキスト | — | 不要 | 非表示。`historyAvailable = false` の場合に表示 | — | 導出（`order_status_history` 行 > 0） | i18n キー: `orders.tracking.noHistory`。BR-OI-014 による。 | EL-OI-25 |

#### セクション [E]: 注文詳細へ戻る（Back to Detail）

| No. | 項目ID | 項目名（論理） | コンポーネント種別 | データ型・最大長 | 必須 | 初期状態／既定値 | 入力制約／形式 | データソース／DB マッピング | 備考／業務ルール | マッピング先（EL-OI） |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `lnkBackToDetail` | 注文詳細へ戻る | リンク | — | 必須 | 表示 | ロールに応じた詳細ルートへ遷移 | — | i18n キー: `common.back`。 | EL-OI-26 |

---
### 4.4 レイアウト 4: 販売者 注文インサイト（`/merchant/orders`）

**アクセスゲート:** `license_status = 'approved'`（BR-OI-006、違反時は 403）の販売者 ＋ 管理者。全サマリーエンドポイントは読み取り専用であり、書き込みは行わない。

#### セクション [A]: ページヘッダー（Page Header）

| No. | 項目ID | 項目名（論理） | コンポーネント種別 | データ型・最大長 | 必須 | 初期状態／既定値 | 入力制約／形式 | データソース／DB マッピング | 備考／業務ルール | マッピング先（EL-OI） |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `lblPageTitle` | ページタイトル | 見出し（h5） | 文字列 | 必須 | テキスト: "Order Insights" | — | ハードコードされた UI テキスト | i18n キー: `merchant.orders.title`。機能仕様上の欠落: §5.4 はページタイトル要素を定義していない。FDS 管理者へのバックフィル依頼としてフラグ済み。 | —（FDS §5.4 の欠落） |
| 2 | `txtScopeNote` | スコープ注記 | テキスト（小） | — | 必須 | "Showing orders for your shop only."（§6.4） | — | — | i18n キー: `merchant.orders.scopeNote`。 | EL-OI-47 |

#### セクション [B]: 注文数タイル（Sales Summary）

| No. | 項目ID | 項目名（論理） | コンポーネント種別 | データ型・最大長 | 必須 | 初期状態／既定値 | 入力制約／形式 | データソース／DB マッピング | 備考／業務ルール | マッピング先（EL-OI） |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `tileTodayOrders` | 本日の注文タイル | 統計タイル | INTEGER | 必須 | ローディングスケルトン | 整数カウント | `created_at` が本日の `COUNT(orders)` | i18n キー: `merchant.orders.today`。 | EL-OI-30 |
| 2 | `tileThisMonthOrders` | 今月の注文タイル | 統計タイル | INTEGER | 必須 | ローディングスケルトン | 整数カウント | `created_at` が今月内の `COUNT(orders)` | i18n キー: `merchant.orders.thisMonth`。 | EL-OI-31 |
| 3 | `tileCompletedOrders` | 完了注文タイル | 統計タイル | INTEGER | 必須 | ローディングスケルトン | 整数カウント | `status='delivered'` の `COUNT(orders)` | i18n キー: `merchant.orders.completed`。終端状態（BR-OI-018）。 | EL-OI-32 |

> **注記（フラグ済み）:** EL-OI-33 は FDS §5.4.1 で定義されていません — 番号は 30–32 → 34 と続きます。ここでは間隙として再現しており、この要素を勝手に発明しないでください。

#### セクション [C]: 収益サマリー（Revenue Summary）

> **BR-OI-026:** 4 つの数値（売上／コミッション／収益／平均注文額）は API によって一緒に返却され、一つの分割不可グループ（`grpRevenueSummary`）として描画される必要があります。EL-OI-37 のみを単独で描画することは禁止されています。

| No. | 項目ID | 項目名（論理） | コンポーネント種別 | データ型・最大長 | 必須 | 初期状態／既定値 | 入力制約／形式 | データソース／DB マッピング | 備考／業務ルール | マッピング先（EL-OI） |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `grpRevenueSummary` | 収益サマリーグループ | カード（単一コンポーネント） | — | 必須 | ローディングスケルトン | 4 統計のコンテナ | `revenueSummary` DTO（§7.8） | i18n キー: `merchant.revenue.title`。分割不可（BR-OI-026）。 | EL-OI-34 |
| 2 | `statSales` | 売上 | 統計（通貨） | DECIMAL(10,2) | 必須 | 通貨形式 | 例: `$1,000.00` | `SUM(orders.total_amount)` | i18n キー: `merchant.revenue.sales`。顧客が支払った総額（BR-OI-021）。 | EL-OI-35 |
| 3 | `statCommission` | コミッション | 統計（通貨） | DECIMAL(10,2) | 必須 | 通貨形式 | 例: `$120.00` | `SUM(order.total_amount × rate)`、rate は BR-OI-022/023/028 による | i18n キー: `merchant.revenue.commission`。 | EL-OI-36 |
| 4 | `statRevenue` | 収益 | 統計（通貨、強調） | DECIMAL(10,2) | 必須 | 通貨、強調 | 例: `$880.00` | `sales − commission` | i18n キー: `merchant.revenue.net`。純受取額（BR-OI-024）。**単独では決して表示しない**（BR-OI-026）。 | EL-OI-37 |
| 5 | `statAov` | 平均注文額（AOV） | 統計（通貨） | DECIMAL(10,2) | 必須 | 通貨形式 | 例: `$88.00` | `revenue ÷ orderCount` — **総売上ではなく純収益**（BR-OI-025） | i18n キー: `merchant.revenue.aov`。 | EL-OI-38 |
| 6 | `txtOrderCount` | 注文数キャプション | テキスト | INTEGER | 必須 | "Based on N orders" | 整数 | 同じオーダーセットの `COUNT(orders)`（BR-OI-027） | i18n キー: `merchant.revenue.orderCount`。AOV の分母。 | EL-OI-39 |
| 7 | `txtRateFootnote` | コミッション率脚注 | テキスト（小） | UI 導出テキスト | 必須 | 率とソース注記を表示 | 率 ％ ＋ ソース | `commissionRate`、`commissionRateSource`、`commissionRateLocked` | i18n キー: `merchant.revenue.rateNote`。スキーマ間隙は BR-OI-023 に従い管理。ロック解除時は `—` を描画（BR-OI-032）。 | EL-OI-40 |
| 8 | `tglPeriod` | 期間セレクタ | ボタングループ | 文字列（enum） | 必須 | 既定: 今月 | today / this_month / last_month / custom | `period` クエリパラメータ | i18n キー: `merchant.revenue.period`。`custom` には `from`／`to` が必要（§8.1）。 | EL-OI-41 |

---
#### セクション [D]: 自ショップ注文リスト（Own-shop Order List）

| No. | 項目ID | 項目名（論理） | コンポーネント種別 | データ型・最大長 | 必須 | 初期状態／既定値 | 入力制約／形式 | データソース／DB マッピング | 備考／業務ルール | マッピング先（EL-OI） |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `tblMerchantOrderList` | 注文リストテーブル | テーブル | — | 必須 | ローディングスケルトン、20 行／ページ、`createdAt DESC` | カラム: 注文番号、日付、**顧客**、明細、合計、支払、ステータス | 自 `merchant_id` にスコープされた `orders`。§7.4 行 DTO ＋ `customerName` | i18n キー: `merchant.orders.table`。`customerName` は `orders.buyer_id` 経由の `users.name`（BR-OI-015）。 | EL-OI-42 |
| 2 | `selFilterStatus` | ステータス絞り込み | セレクト | 文字列 | 不要 | 既定 "All" | placed…delivered の enum | `order_statuses.status_code` | i18n キー: `orders.filter.status`。 | EL-OI-43 |
| 3 | `drpFilterDateRange` | 日付範囲絞り込み | 日付範囲ピッカー | 日付 × 2 | 不要 | 空（全期間） | ISO 日付、`to ≥ from` | `orders.created_at` | i18n キー: `orders.filter.dateRange`。 | EL-OI-44 |
| 4 | `lnkRowActions` | 行アクション | リンクグループ | — | 必須 | 行ごとに 1 件 | View Detail / Track | — | i18n キー: `common.view` / `orders.track`。行レベル。 | EL-OI-45 |
| 5 | `pgMerchantOrderList` | ページネーション | コントロール | — | 必須 | N ページ中の 1 ページ、20 件／ページ | 前へ／次へ | `meta` | i18n キー: `common.pageInfo`。 | EL-OI-46 |

---
### 4.5 レイアウト 5: 販売者 注文詳細（`/merchant/orders/:id`）

**目的:** 販売者の自ショップ注文の 1 件について、明細と顧客情報を参照する（§4.5／§5.5）。明細は `order_items.merchant_id` = 自ショップに制限される。ビューは読み取り専用。

#### セクション [A]: 注文ヘッダー（Order Header）

| No. | 項目ID | 項目名（論理） | コンポーネント種別 | データ型・最大長 | 必須 | 初期状態／既定値 | 入力制約／形式 | データソース／DB マッピング | 備考／業務ルール | マッピング先（EL-OI） |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `cardOrderHeader` | 注文ヘッダー | カード | — | 必須 | 表示 | 注文番号、日付、ステータスバッジ、支払ステータス | `orders.id`、`orders.created_at`、`orders.status`、`orders.payment_status` | i18n キー: `orders.detail.header`。 | EL-OI-50 |
| 2 | `badgeStatus` | ステータスバッジ | バッジ | VARCHAR(50) | 必須 | 表示、**読み取り専用** | ステータスごとに 1 色 | `order_statuses.status_name` | ステータス変更は Order Fulfillment 画面のみ。 | EL-OI-56 |

#### セクション [B]: 自ショップ注文明細テーブル（Own-shop Items Table）

| No. | 項目ID | 項目名（論理） | コンポーネント種別 | データ型・最大長 | 必須 | 初期状態／既定値 | 入力制約／形式 | データソース／DB マッピング | 備考／業務ルール | マッピング先（EL-OI） |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `tblMerchantOrderItems` | 注文明細テーブル | テーブル | UUID / INTEGER / DECIMAL(10,2) | 必須 | ローディングスケルトン | カラム: 商品、数量、単価、行合計 | `merchant_id` = 自ショップの `order_items`。`products.name` | i18n キー: `orders.detail.items`。価格は固定（BR-OI-017）。 | EL-OI-51 |

#### セクション [C]: 合計パネル（Totals Panel）

| No. | 項目ID | 項目名（論理） | コンポーネント種別 | データ型・最大長 | 必須 | 初期状態／既定値 | 入力制約／形式 | データソース／DB マッピング | 備考／業務ルール | マッピング先（EL-OI） |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `cardTotals` | 合計パネル | カード | DECIMAL(10,2) / VARCHAR(50) | 必須 | — | 行: 小計、割引（クーポンコードがある場合は併記）、合計 | 小計（自 `order_items` から導出）、`orders.discount_amount`、`orders.coupon_code`、`orders.total_amount` | i18n キー: `orders.detail.totals`。割引額は表示され、クーポンコードは存在する場合に表示される。送料の行はなし。 | EL-OI-52 |

---
#### セクション [D]: 顧客情報（Customer Information）

| No. | 項目ID | 項目名（論理） | コンポーネント種別 | データ型・最大長 | 必須 | 初期状態／既定値 | 入力制約／形式 | データソース／DB マッピング | 備考／業務ルール | マッピング先（EL-OI） |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `cardCustomerInfo` | 顧客情報 | カード | 文字列 | 必須 | — | 購入者名、連絡先、配送先住所 | `customer.name`、`customer.email`、`customer.phone`（`orders.buyer_id` → `users` 経由）＋ `orders.shipping_address` | i18n キー: `merchant.orders.customer`。販売者／管理者のみ（BR-OI-015/033）。 | EL-OI-53 |

#### セクション [E]: 注文メモ（Order Notes）

| No. | 項目ID | 項目名（論理） | コンポーネント種別 | データ型・最大長 | 必須 | 初期状態／既定値 | 入力制約／形式 | データソース／DB マッピング | 備考／業務ルール | マッピング先（EL-OI） |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `txtOrderNotes` | 注文メモ | テキスト | TEXT | 不要 | null の場合は非表示 | — | `orders.notes` | i18n キー: `orders.detail.notes`。顧客メモ。 | EL-OI-54 |

#### セクション [F]: 注文追跡ボタン（Track Order）

| No. | 項目ID | 項目名（論理） | コンポーネント種別 | データ型・最大長 | 必須 | 初期状態／既定値 | 入力制約／形式 | データソース／DB マッピング | 備考／業務ルール | マッピング先（EL-OI） |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `btnTrackOrder` | 注文追跡ボタン | ボタン | — | 必須 | 表示 | `/orders/:id/tracking` へ遷移 | — | i18n キー: `orders.track`。共有のレイアウト 3 追跡ルートを使用。 | EL-OI-55 |

#### セクション [G]: ステータス変更アクション（Change Status）

| No. | 項目ID | 項目名（論理） | コンポーネント種別 | データ型・最大長 | 必須 | 初期状態／既定値 | 入力制約／形式 | データソース／DB マッピング | 備考／業務ルール | マッピング先（EL-OI） |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `lnkChangeStatus` | ステータス変更アクション | リンク／ボタン | — | 不要 | 表示 | **Order Fulfillment へのナビゲーションのみ** | — | i18n キー: `orders.changeStatus`。ここではステータス更新 API や状態遷移は行わない（FDS §1.1）。 | EL-OI-57 |

> **注記（フラグ済み）:** §7.5 は顧客情報を `customer.name`、`customer.email`、`customer.phone`（＋配送先住所）として定義します。アサートされるのはこれらの PII フィールドのみであり、§7.5／BR-OI-033 を超えた追加の顧客フィールドを推測しないでください。

---
### 4.6 レイアウト 6: 管理者 全注文（`/admin/orders`）

**目的:** ショップ／販売者、ステータス、日付フィルター付きで全プラットフォーム注文を参照する（§5.6）。対象は注文の**可視化のみ**であり、プラットフォーム収益、コミッション設定、ペイアウト、目標は収益・コミッションサブシステム（要件定義書 §5.7）に属し、スコープ外です。

#### セクション [A]: ページヘッダー（Page Header）

| No. | 項目ID | 項目名（論理） | コンポーネント種別 | データ型・最大長 | 必須 | 初期状態／既定値 | 入力制約／形式 | データソース／DB マッピング | 備考／業務ルール | マッピング先（EL-OI） |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `lblPageTitle` | ページタイトル | 見出し（h5） | 文字列 | 必須 | テキスト: "All Orders" | — | ハードコードされた UI テキスト | i18n キー: `admin.orders.title`。 | EL-OI-60 |

#### セクション [B]: フィルターバー（Filter Bar）

| No. | 項目ID | 項目名（論理） | コンポーネント種別 | データ型・最大長 | 必須 | 初期状態／既定値 | 入力制約／形式 | データソース／DB マッピング | 備考／業務ルール | マッピング先（EL-OI） |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `selFilterShop` | ショップ／販売者絞り込み | 検索可能セレクト | UUID | 不要 | 既定: なし（全て） | ショップまたは販売者で絞り込み | `merchantId` / `shopId`（管理者のみ） | i18n キー: `admin.orders.filter.shop`。管理者以外 → 403（BR-OI-001/016）。 | EL-OI-61 |
| 2 | `selFilterStatus` | ステータス絞り込み | セレクト | 文字列 | 不要 | 既定 "All" | placed…delivered の enum | `order_statuses.status_code` | i18n キー: `admin.orders.filter.status`。 | EL-OI-62 |
| 3 | `drpFilterDateRange` | 日付範囲絞り込み | 日付範囲ピッカー | 日付 × 2 | 不要 | 空（全期間） | ISO 日付、`to ≥ from` | `orders.created_at` | i18n キー: `orders.filter.dateRange`。 | EL-OI-63 |
| 4 | `grpActiveFilters` | 適用絞り込みチップ | チップグループ | — | 不要 | 適用済みフィルターを表示 | チップごとに個別クリア | — | i18n キー: `common.filters`。 | EL-OI-64 |

#### セクション [C]: 結果件数（Result Count）

| No. | 項目ID | 項目名（論理） | コンポーネント種別 | データ型・最大長 | 必須 | 初期状態／既定値 | 入力制約／形式 | データソース／DB マッピング | 備考／業務ルール | マッピング先（EL-OI） |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `txtResultCount` | 結果件数 | テキスト | — | 必須 | "42 orders match the current filters" | `meta.total` から導出 | `meta`（total） | i18n キー: `common.resultCount`。 | EL-OI-66 |

#### セクション [D]: 注文リストテーブル（Order List Table）

| No. | 項目ID | 項目名（論理） | コンポーネント種別 | データ型・最大長 | 必須 | 初期状態／既定値 | 入力制約／形式 | データソース／DB マッピング | 備考／業務ルール | マッピング先（EL-OI） |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `tblAdminOrderList` | 注文リストテーブル | テーブル | — | 必須 | ローディングスケルトン、20 行／ページ、`createdAt DESC` | カラム: 注文番号、日付、ショップ／販売者、購入者、明細、合計、支払、ステータス | `customerName` ＋ `shopName`（`merchants.shop_name`）を含む §7.4 行 DTO | i18n キー: `admin.orders.table`。 | EL-OI-65 |
| 2 | `lnkRowActions` | 行アクション | リンクグループ | — | 必須 | 行ごとに 1 件 | View Detail / Track（任意の注文） | — | i18n キー: `common.view` / `orders.track`。行レベル。 | EL-OI-67 |
| 3 | `pgAdminOrderList` | ページネーション | コントロール | — | 必須 | N ページ中の 1 ページ、20 件／ページ | 前へ／次へ | `meta` | i18n キー: `common.pageInfo`。 | EL-OI-68 |

#### セクション [E]: 空状態（Empty State）

| No. | 項目ID | 項目名（論理） | コンポーネント種別 | データ型・最大長 | 必須 | 初期状態／既定値 | 入力制約／形式 | データソース／DB マッピング | 備考／業務ルール | マッピング先（EL-OI） |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `emptyAdminOrderList` | 空状態 | イラスト＋テキスト | — | 必須 | 非表示。一致する行が 0 件の場合に表示 | "No orders match the current filters." ＋ Clear Filters CTA | — | i18n キー: `admin.orders.empty`。BR-OI-030。 | EL-OI-69 |

---
### 4.7 レイアウト 7: 管理者 注文詳細（`/admin/orders/:id`）

**目的:** 管理者が任意のプラットフォーム注文、そのショップ／販売者情報、無制限の注文明細、合計、顧客情報を調査できるようにする。この画面は BR-OI-007 に基づき読み取り専用であり、ステータス変更アクションやその他の状態を変更するコントロールを含みません。

#### セクション [A]: 注文ヘッダー（Order Header）

| No. | 項目ID | 項目名（論理） | コンポーネント種別 | データ型・最大長 | 必須 | 初期状態／既定値 | 入力制約／形式 | データソース／DB マッピング | 備考／業務ルール | マッピング先（EL-OI） |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `cardAdminOrderHeader` | 注文ヘッダー | カード | — | 必須 | 表示 | 注文番号、注文日時、ステータスバッジ、支払ステータスバッジ | `orders.id`、`orders.created_at`、`orders.status`、`orders.payment_status` | i18n キー: `orders.detail.header`。BR-OI-007 に基づき読み取り専用。 | —（ローカル UI ID） |

#### セクション [B]: ショップ／販売者（Shop / Merchant）

| No. | 項目ID | 項目名（論理） | コンポーネント種別 | データ型・最大長 | 必須 | 初期状態／既定値 | 入力制約／形式 | データソース／DB マッピング | 備考／業務ルール | マッピング先（EL-OI） |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `cardAdminShopInfo` | ショップ／販売者情報 | カード | 文字列 / UUID | 必須 | 表示 | ショップ名と販売者 ID | `shop.name` / `shop.merchantId`（`orders.merchant_id` 経由の `merchants.shop_name` / `merchants.id`） | i18n キー: `admin.orders.detail.shopInfo`。BR-OI-015/033 に基づき管理者のみ。 | —（ローカル UI ID） |

#### セクション [C]: 全注文明細テーブル（Unrestricted Items Table）

| No. | 項目ID | 項目名（論理） | コンポーネント種別 | データ型・最大長 | 必須 | 初期状態／既定値 | 入力制約／形式 | データソース／DB マッピング | 備考／業務ルール | マッピング先（EL-OI） |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `tblAdminOrderItems` | 注文明細テーブル | テーブル | UUID / INTEGER / DECIMAL(10,2) | 必須 | ローディングスケルトン | カラム: 商品、数量、単価、行合計 | `merchant_id` フィルターなしの `order_items`。`products.name` | i18n キー: `orders.detail.items`。注文内の全明細が表示される。価格は固定（BR-OI-017）。管理者向けは §6.2 ステップ 4 により無制限。 | —（ローカル UI ID） |

#### セクション [D]: 合計パネル（Totals Panel）

| No. | 項目ID | 項目名（論理） | コンポーネント種別 | データ型・最大長 | 必須 | 初期状態／既定値 | 入力制約／形式 | データソース／DB マッピング | 備考／業務ルール | マッピング先（EL-OI） |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `cardAdminTotals` | 合計パネル | カード | DECIMAL(10,2) / VARCHAR(50) | 必須 | — | 行: 小計、割引（クーポンコードがある場合は併記）、合計 | 導出小計、`orders.discount_amount`、`orders.coupon_code`、`orders.total_amount` | i18n キー: `orders.detail.totals`。BR-OI-007 に基づき読み取り専用。 | —（ローカル UI ID） |

#### セクション [E]: 顧客情報（Customer Information）

| No. | 項目ID | 項目名（論理） | コンポーネント種別 | データ型・最大長 | 必須 | 初期状態／既定値 | 入力制約／形式 | データソース／DB マッピング | 備考／業務ルール | マッピング先（EL-OI） |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `cardAdminCustomerInfo` | 顧客情報 | カード | 文字列 | 必須 | — | 名前、メール、電話、配送先住所 | `orders.buyer_id` → `users` 経由の `customer.name`、`customer.email`、`customer.phone`。`orders.shipping_address` | i18n キー: `merchant.orders.customer`。BR-OI-015/033 に基づき管理者のみ。PII はフルフィルメントのニーズに限定。 | —（ローカル UI ID） |

#### セクション [F]: 注文追跡ボタン（Track Order）

| No. | 項目ID | 項目名（論理） | コンポーネント種別 | データ型・最大長 | 必須 | 初期状態／既定値 | 入力制約／形式 | データソース／DB マッピング | 備考／業務ルール | マッピング先（EL-OI） |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `btnAdminTrackOrder` | 注文追跡ボタン | ボタン | — | 必須 | 表示 | `/orders/:id/tracking` へ遷移 | — | i18n キー: `orders.track`。共有のレイアウト 3 追跡ルートを使用。BR-OI-007 に基づき読み取り専用のナビゲーションのみ。 | —（ローカル UI ID） |

> **注記（FDS 管理者向けにフラグ済み）:** FDS §5 は管理者 注文詳細の要素 ID を定義していません。レイアウト 7 の全項目 ID はローカル UI ID であり、EL-OI 番号は発明されていません。FDS は将来の改訂でこの画面の要素定義をバックフィルする必要があります。

---
## 5. 各項目における挙動・イベント仕様（Item Behaviors & Event Specifications）

FDS §6「機能操作仕様」から導出。全画面は読み取り専用であり、以下の挙動はいずれも注文データを変更しません。

### 5.1 注文履歴のロード（ページマウント／フィルター変更／ページ変更）— レイアウト 1、4 [D]、6
- **トリガー:** `/orders`（購入者）、`/merchant/orders`（販売者）、`/admin/orders`（管理者）へ遷移。またはフィルター／ページを変更。
- **RBAC バリデーション:** JWT ロールチェック。所有スコープ制御（BR-OI-001）。販売者ライセンスゲート `license_status = 'approved'`（違反時は `403`、BR-OI-006）。管理者専用の `merchantId`／`shopId` は他ロールに対し `403` で拒否。
- **処理ロジック:**
  1. JWT を検証し、ロールを読み取る。
  2. 所有スコープを適用 — 購入者 → `orders.buyer_id = currentUser.id`。販売者 → `merchants.user_id` から `merchants.id` を解決し、`orders.merchant_id = <id>`。管理者 → 所有フィルターなし。
  3. 任意の `status`、`from`／`to`、および（管理者のみ）`merchantId`／`shopId` フィルターを SQL で適用（BR-OI-016）。
  4. ソート（既定 `createdAt DESC`）とページネーション（BR-OI-009/010）。
  5. ロールに応じた DTO を投影（`customerName` は販売者／管理者のみ、BR-OI-015）。
  6. テーブルを描画し、`ORDER_LIST_VIEWED` 監査イベントを書き込む。
- **API エンドポイント:** `GET /api/v1/orders?status=&from=&to=&page=1&limit=20&sort=createdAt&order=desc`（管理者: `&merchantId=&shopId=`）。
- **例外処理:**
  - `400 BAD_REQUEST`: フィルター／ページ／ソートの不正 — 該当コントロールのインラインエラー＋上部バナー。
  - `401 UNAUTHORIZED`: ログインへリダイレクト。
  - `403 FORBIDDEN`: ライセンス未承認／非管理者フィルター — FDS §12.1（承認待ち／権限なし）に従いリダイレクト。
  - `429 TOO_MANY_REQUESTS`: リトライ時間の秒数を示すバナー。
  - `500 INTERNAL_SERVER_ERROR`: リトライ付きの破壊的アラート。

### 5.2 注文詳細のロード（行クリック／View）— レイアウト 2、5、7
- **トリガー:** 注文行または「View」アクションをクリック。
- **処理ロジック:**
  1. JWT と `:id`（UUID）を検証。
  2. `order_items`（名前／画像のために `products` を結合）を含む注文をロード。
  3. BR-OI-008 に従い所有権を検証 — 不一致 → `404`（存在しない場合と区別不能）。4. 販売者: `order_items` を `merchant_id` = 自ショップに制限。管理者: `order_items` を無制限のままにする。
  5. 合計（`total_amount`、`discount_amount`、`coupon_code`）と `payment_status` を投影。
  6. 販売者／管理者のみ顧客情報ブロックを添付（BR-OI-015/033）。
  7. 詳細を描画し、`ORDER_DETAIL_VIEWED` 監査イベントを書き込む。
- **API エンドポイント:** `GET /api/v1/orders/:id`。
- **例外処理:** `404 NOT_FOUND` →「注文に戻る」アクション付きの not-found パネル。`401` → ログインへリダイレクト。`500` → リトライ付きアラート。

### 5.3 注文追跡のロード（Track クリック）— レイアウト 3
- **トリガー:** リスト行または詳細画面から「Track」をクリック。
- **処理ロジック:**
  1. JWT と `:id` を検証。
  2. `order_statuses` の全ステップを `display_order` 順にロード（BR-OI-013）。
  3. 到達済みステップのタイムスタンプのために `order_status_history` を左結合。
  4. 各ステップを `orders.status` に対して `done`／`current`／`upcoming` とマーク（§3.3）。
  5. 履歴行がない場合 → `historyAvailable: false` の単一の現在ステップ（BR-OI-014）。
  6. ステッパーを描画し、`ORDER_TRACKING_VIEWED` 監査イベントを書き込む。
- **API エンドポイント:** `GET /api/v1/orders/:id/tracking`。
- **例外処理:** `404` not-found パネル。`500` リトライ付きアラート。配送完了バナーは `status='delivered'`（終端）の場合のみ表示。

### 5.4 販売者 売上サマリーのロード — レイアウト 4 [B]
- **トリガー:** `/merchant/orders` のロード。手動更新。
- **処理ロジック:** ロールとライセンスゲートを検証 → `todayCount`（本日作成）、`thisMonthCount`（今月）、`completedCount`（`status='delivered'`）のために販売者にスコープされた `COUNT(orders)`。キャッシュをシード（TTL `OI_SUMMARY_CACHE_TTL_SECONDS`）。`MERCHANT_SUMMARY_VIEWED`（売上）を書き込む。
- **API エンドポイント:** `GET /api/v1/order-insights/merchant/sales-summary`。
- **例外処理:** `403` ライセンスゲート。`500` リトライ付きアラート。

### 5.5 販売者 収益サマリーのロード／期間変更 — レイアウト 4 [C]
- **トリガー:** `/merchant/orders` のロード。期間セレクタ（`tglPeriod`）の変更。手動更新。
- **処理ロジック:**
  1. ロールとライセンスゲートを検証し、期間ウィンドウ（UTC）を解決。
  2. スコープ内注文に対する 1 つの集約で、`orderCount`、`sales`（BR-OI-021）、`commission`（BR-OI-022、rate は BR-OI-023、注文ごとに丸め BR-OI-028）、`revenue = sales − commission`（BR-OI-024）、`aov = revenue ÷ orderCount`（純額 — BR-OI-025）を計算。
  3. `commissionRate`、`commissionRateSource`、`commissionRateLocked` を添付。
  4. **4 つの数値をすべて一緒に返却**（BR-OI-026）。レート脚注付きでグループを描画。
- **API エンドポイント:** `GET /api/v1/order-insights/merchant/revenue-summary?period=this_month`（または `period=custom` の場合は `from`／`to`）。
- **例外処理:**
  - `422 UNPROCESSABLE_ENTITY`: `period=custom` の `from`／`to` が欠落／不正 — インラインエラー。
  - `403` ライセンスゲート。`500` リトライ付きアラート。
  - 未対応メトリクス（ロック解除レート）はエラーではなく `—`／脚注を描画（BR-OI-032）。

### 5.6 管理者 注文リストのフィルター変更 — レイアウト 6
- **トリガー:** ショップ／販売者、ステータス、または日付範囲を選択。フィルターチップをクリア。
- **処理ロジック:** フィルターを SQL で AND 結合（BR-OI-016）。ページ 1 にリセットし、`merchantId`／`shopId` を付けて `GET /api/v1/orders` を再取得。`txtResultCount` とフィルターチップを更新。`ORDER_LIST_VIEWED` を書き込む。
- **例外処理:** `400` 不正な組み合わせ → インライン。`403`（管理者では発生しないはず）→ 権限なしリダイレクト。`500` リトライ付きアラート。

### 5.7 空／ローディング／エラー表示の挙動
- **ローディング:** テーブル、タイル、タイムライン用のスケルトンシマー。
- **空データ:** `0`／`—` プレースホルダーとイラスト付き空状態（BR-OI-030）— 決してエラーではない。
- **スコープ外アクセス:** `404`（BR-OI-008）は標準の not-found パネルを描画 — 他者の注文を決して開示しない。
- **未対応メトリクス:** ロック解除されたコミッション率は `—` ＋ 脚注を描画（BR-OI-032）。
- **トースト通知:** 一時的な API エラーとリトライ結果。

---
## 6. バリデーション及びエラーメッセージマッピング（Validation & Error Message Mapping）

FDS §8「入力バリデーションルール」および §9「エラー処理仕様」から導出。

### 6.1 クライアント側（＆サーバー）バリデーションエラー

| エラーコード | 対象フィールド／項目ID | 条件／評価ロジック | UI/UX 表示スタイル | 既定エラーメッセージ（EN） | 既定エラーメッセージ（JA） |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-OI-001** | `selFilterStatus` | `status` が有効な `order_statuses.status_code` ではない | セレクトのインラインエラー＋上部バナー | "Invalid order status" | "注文ステータスが不正です" |
| **VAL-OI-002** | `drpFilterDateRange` | `from`／`to` が有効な ISO 日付ではない、または `to < from` | 日付範囲ピッカーのインラインエラー | "Invalid date range" | "日付範囲が不正です" |
| **VAL-OI-003** | `pgOrderList` / `pgMerchantOrderList` / `pgAdminOrderList` | `page` が 1 以上の整数ではない | インラインエラー＋バナー | "Invalid page number" | "ページ番号が不正です" |
| **VAL-OI-004** | ページネーション（limit） | `limit` が 1–100 の整数ではない | インラインエラー＋バナー | "Invalid limit" | "件数指定が不正です" |
| **VAL-OI-005** | ソート（カラムヘッダー） | `sort`／`order` が許可されたフィールド／方向ではない | バナー | "Invalid sort option" | "並び替えの指定が不正です" |
| **VAL-OI-006** | `tglPeriod` | `period` が `today/this_month/last_month/custom` に含まれない | 期間セレクタのインラインエラー | "Invalid period" | "期間の指定が不正です" |
| **VAL-OI-007** | `tglPeriod` ＋ `drpFilterDateRange` | 有効な `from`／`to` のない `period=custom` | 日付ピッカーのインラインエラー | "Select a start and end date" | "開始日と終了日を選択してください" |
| **VAL-OI-008** | `selFilterShop` | 管理者以外が `merchantId`／`shopId` を指定（BR-OI-001） | 上部バナー＋ブロック | "You don't have permission to filter by merchant" | "この絞り込みを行う権限がありません" |
| **VAL-OI-009** | ルートパラメータ `:id` | `:id` が有効な UUID ではない | not-found パネル | "Invalid order reference" | "注文の指定が不正です" |
| **VAL-OI-010** | ルートパラメータ `:id` | `:id` が呼び出し元のスコープ外（BR-OI-008） | not-found パネル（意図的に区別不能） | "Order not found" | "注文が見つかりません" |

### 6.2 API エラー処理

| HTTP ステータス | エラーコード | シナリオ | ユーザー向け挙動 |
| :--- | :--- | :--- | :--- |
| `400` | `BAD_REQUEST` | 不正な status／date／period／pagination／sort パラメータ | フィールドレベルのインラインエラー＋上部バナー |
| `401` | `UNAUTHORIZED` | JWT が欠落または不正 | ログインへリダイレクト |
| `403` | `FORBIDDEN` | 購入者が販売者サマリーを要求（BR-OI-005）。`license_status ≠ 'approved'` の販売者（BR-OI-006）。非管理者が `merchantId`／`shopId` を指定 | "You don't have permission to view this data" / "Your merchant account is not approved" |
| `404` | `NOT_FOUND` | 注文が存在しない、または呼び出し元のスコープ外（BR-OI-008 — 意図的に区別不能） | "Order not found" ＋ 注文に戻るアクション |
| `422` | `UNPROCESSABLE_ENTITY` | 有効な `from`／`to` の組み合わせのない `period=custom` | "Select a start and end date" |
| `429` | `TOO_MANY_REQUESTS` | レート制限を超過 | "Too many requests. Please wait {seconds} seconds" |
| `500` | `INTERNAL_SERVER_ERROR` | 集約／DB 障害 | "Something went wrong. Please try again" |

---
## 7. データベースフィールドマッピング（Database Fields Mapping）

FDS §15.2「データベース設計トレーサビリティ」および DATABASE_SPEC v2.x のカラム定義から導出。**すべて読み取りのみ — 書き込みなし。**

### 7.1 注文履歴リスト → データベース

| 画面項目 | データベースカラム | テーブル | データ型 |
| :--- | :--- | :--- | :--- |
| 注文番号（行） | `id` | `orders` | UUID |
| 日付 | `created_at` | `orders` | TIMESTAMPTZ |
| ステータス（バッジ） | `status` → `status_name` | `orders` → `order_statuses` | VARCHAR(30) → VARCHAR(50) |
| 明細数 | `COUNT(order_items)` | `order_items`（集約） | INTEGER |
| 合計 | `total_amount` | `orders` | DECIMAL(10,2) |
| 支払ステータス | `payment_status` | `orders` | VARCHAR(20)（pending/completed） |
| 顧客名 | `users.name`（`orders.buyer_id` 経由） | `users` | VARCHAR — 販売者／管理者のみ（BR-OI-015） |
| ショップ名（管理者） | `merchants.shop_name`（`orders.merchant_id` 経由） | `merchants` | VARCHAR — 管理者のみ |

### 7.2 注文詳細 → データベース

| 画面／UI フィールド | データベースカラム | テーブル | データ型 |
| :--- | :--- | :--- | :--- |
| 商品名 | `products.name`（`order_items.product_id` 経由） | `products` | VARCHAR |
| 数量 | `quantity` | `order_items` | INTEGER |
| 単価 | `unit_price` | `order_items` | DECIMAL(10,2)（固定 — BR-OI-017） |
| 行合計 | `total_price` | `order_items` | DECIMAL(10,2) |
| 割引 | `discount_amount` | `orders` | DECIMAL(10,2) |
| クーポン | `coupon_code` | `orders` | VARCHAR(50) |
| 合計 | `total_amount` | `orders` | DECIMAL(10,2) |
| 支払方法／ステータス | `payment_method` / `payment_status` | `orders` | VARCHAR(50) / VARCHAR(20) |
| 配送先住所 | `shipping_address` | `orders` | JSONB |
| メモ | `notes` | `orders` | TEXT |

### 7.3 注文追跡 → データベース

| UI 要素 | データベースカラム | テーブル | データ型 |
| :--- | :--- | :--- | :--- |
| ステップ順／ラベル | `display_order`、`status_name` | `order_statuses` | INTEGER / VARCHAR(50) |
| 到達タイムスタンプ | `created_at` | `order_status_history` | TIMESTAMPTZ |
| 終端フラグ | `is_terminal_state` | `order_statuses` | BOOLEAN |

### 7.4 売上サマリー → データベース

| KPI | データベースカラム／計算式 | テーブル | データ型 |
| :--- | :--- | :--- | :--- |
| 本日の注文 | `created_at` が本日の `COUNT(orders)` | `orders`（販売者にスコープ） | INTEGER |
| 今月の注文 | `created_at` が今月内の `COUNT(orders)` | `orders`（スコープ） | INTEGER |
| 完了注文 | `status='delivered'` の `COUNT(orders)` | `orders`（スコープ） | INTEGER |

### 7.5 収益サマリー → データベース

| KPI | データベースカラム／計算式 | テーブル | データ型 |
| :--- | :--- | :--- | :--- |
| 売上 | `SUM(orders.total_amount)` | `orders`（スコープ、期間内） | DECIMAL(10,2) |
| コミッション | `SUM(order.total_amount × rate)` — rate は BR-OI-022/023 による | `orders` ＋ `commission_settings` | DECIMAL(10,2) |
| 収益 | `sales − commission` | 導出 | DECIMAL(10,2) |
| 平均注文額（AOV） | `revenue ÷ orderCount`（純額 — BR-OI-025） | 導出 | DECIMAL(10,2) |
| 注文数 | `COUNT(orders)`（同じセット — BR-OI-027） | `orders` | INTEGER |
| 率／ソース／ロック | `commission_rate`（スキーマ間隙あり）、`commission_settings` | `commission_settings`、`orders`（保留カラム） | BR-OI-023 参照 |

### 7.6 管理者フィルター → データベース

| フィルター | データベースカラム | テーブル | データ型 |
| :--- | :--- | :--- | :--- |
| ショップ／販売者 | `merchants.id` / `shops.id`（`merchantId`/`shopId`） | `merchants` / `shops` | UUID — 管理者のみ |
| ステータス | `orders.status` | `orders` | VARCHAR(30) |
| 日付範囲 | `orders.created_at` | `orders` | TIMESTAMPTZ |

---
## 8. API レスポンスマッピング（API Response Mapping）

FDS §7「出力仕様」から導出。リストレスポンスは `page`、`limit`、`total` を含む `meta` ブロックを保持します。

### 8.1 注文リスト成功レスポンス — `GET /api/v1/orders`

```json
{
  "orders": [
    {
      "id": "9f1c1a52-6f0e-4f6d-9a1e-2b5d3c7e8a10",
      "createdAt": "2026-08-21T09:30:00.000Z",
      "status": "shipped",
      "itemCount": 2,
      "totalAmount": "120.00",
      "paymentStatus": "completed",
      "customerName": "Aye Aye",
      "shopName": "Lotus Glow Shop"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 42 }
}
```

> `customerName` は販売者／管理者の行に存在し、`shopName` は管理者のみに存在します（BR-OI-015）。購入者の行はどちらも省略します。

### 8.2 注文詳細成功レスポンス — `GET /api/v1/orders/:id`

```json
{
  "orderDetail": {
    "id": "9f1c1a52-6f0e-4f6d-9a1e-2b5d3c7e8a10",
    "createdAt": "2026-08-21T09:30:00.000Z",
    "status": "shipped",
    "items": [
      { "productName": "Vitamin C Serum", "quantity": 1, "unitPrice": "45.00", "totalPrice": "45.00" }
    ],
    "discountAmount": "5.00",
    "couponCode": "GLOW10",
    "totalAmount": "120.00",
    "paymentMethod": "credit_card",
    "paymentStatus": "completed",
    "shippingAddress": { "line1": "1 Main St", "city": "Yangon", "postalCode": "11111" },
    "notes": null,
    "customer": { "name": "Aye Aye", "email": "aye@example.com", "phone": "+959..." },
    "shop": { "name": "Lotus Glow Shop", "merchantId": "7c2d..." }
  }
}
```

> `customer` ブロックは販売者／管理者のみです（BR-OI-015/033）。`shop` ブロックは管理者のみです（購入者はショップ名を参照）。販売者詳細の合計パネルは、同じ §7.5 の order-detail フィールドを使用して `discountAmount` と `couponCode` を描画します。

### 8.3 注文追跡成功レスポンス — `GET /api/v1/orders/:id/tracking`

```json
{
  "tracking": {
    "orderId": "9f1c1a52-6f0e-4f6d-9a1e-2b5d3c7e8a10",
    "currentStatus": "shipped",
    "historyAvailable": true,
    "steps": [
      { "statusCode": "placed", "statusName": "Placed", "displayOrder": 1, "state": "done", "reachedAt": "2026-08-21T09:30:00.000Z", "isTerminal": false },
      { "statusCode": "shipped", "statusName": "Shipped", "displayOrder": 4, "state": "current", "reachedAt": "2026-08-22T08:00:00.000Z", "isTerminal": false }
    ]
  }
}
```

### 8.4 売上サマリー成功レスポンス — `GET /api/v1/order-insights/merchant/sales-summary`

```json
{
  "salesSummary": { "todayCount": 3, "thisMonthCount": 28, "completedCount": 112 }
}
```

### 8.5 収益サマリー成功レスポンス — `GET /api/v1/order-insights/merchant/revenue-summary`

```json
{
  "revenueSummary": {
    "sales": "1000.00",
    "commission": "120.00",
    "revenue": "880.00",
    "aov": "88.00",
    "orderCount": 10,
    "commissionRate": 12.00,
    "commissionRateSource": "current_settings",
    "commissionRateLocked": false,
    "period": { "code": "this_month", "from": "2026-08-01", "to": "2026-08-31" }
  }
}
```

### 8.6 エラーレスポンス例 — `404 NOT_FOUND`

```json
{
  "statusCode": 404,
  "message": ["Order not found"],
  "error": "Not Found",
  "timestamp": "2026-08-21T12:00:00.000Z",
  "path": "/api/v1/orders/9f1c1a52-6f0e-4f6d-9a1e-2b5d3c7e8a10"
}
```

### 8.7 エラーレスポンス例 — `403 FORBIDDEN`

```json
{
  "statusCode": 403,
  "message": ["Your merchant account is not approved"],
  "error": "Forbidden",
  "timestamp": "2026-08-21T12:00:00.000Z",
  "path": "/api/v1/order-insights/merchant/revenue-summary"
}
```

---
## 9. i18n キーリファレンス（i18n Keys Reference）

以下すべてのキーは EN／JA／MY で解決されます（FDS §13.6）。注文ステータス名と 4 つの収益サマリーラベルは i18n 駆動です。

### 9.1 英語（en）— Order Insights

| キー | 値 |
| :--- | :--- |
| `buyer.orders.title` | "My Orders" |
| `orders.filter.status` | "Status" |
| `orders.filter.dateRange` | "Date Range" |
| `orders.table` | "Orders" |
| `orders.track` | "Track" |
| `orders.empty` | "You haven't placed any orders yet." |
| `orders.detail.header` | "Order Details" |
| `orders.detail.items` | "Items" |
| `orders.detail.totals` | "Order Summary" |
| `orders.detail.payment` | "Payment" |
| `orders.detail.shipping` | "Shipping Address" |
| `orders.detail.notes` | "Order Notes" |
| `orders.tracking.ref` | "Order Reference" |
| `orders.tracking.timeline` | "Order Status" |
| `orders.tracking.delivered` | "Your order has been delivered." |
| `orders.tracking.noHistory` | "Tracking history is unavailable for this order." |
| `orders.changeStatus` | "Change Status" |
| `merchant.orders.title` | "Order Insights" |
| `merchant.orders.scopeNote` | "Showing orders for your shop only." |
| `merchant.orders.today` | "Today" |
| `merchant.orders.thisMonth` | "This Month" |
| `merchant.orders.completed` | "Completed" |
| `merchant.orders.table` | "Shop Orders" |
| `merchant.orders.customer` | "Customer" |
| `merchant.revenue.title` | "Revenue Summary" |
| `merchant.revenue.sales` | "Sales" |
| `merchant.revenue.commission` | "Commission" |
| `merchant.revenue.net` | "Revenue" |
| `merchant.revenue.aov` | "Avg. Order Value" |
| `merchant.revenue.orderCount` | "Based on N orders" |
| `merchant.revenue.rateNote` | "Commission rate applied at order creation" |
| `merchant.revenue.period` | "Period" |
| `admin.orders.title` | "All Orders" |
| `admin.orders.detail.shopInfo` | "Shop / Merchant" |
| `admin.orders.filter.shop` | "Shop / Merchant" |
| `admin.orders.filter.status` | "Status" |
| `admin.orders.table` | "Orders" |
| `admin.orders.empty` | "No orders match the current filters." |
| `common.view` | "View" |
| `common.back` | "Back to Order" |
| `common.pageInfo` | "Page 1 of 3 · 42 orders" |
| `common.resultCount` | "42 orders match the current filters" |
| `common.filters` | "Filters" |

### 9.2 日本語（ja）— Order Insights

| キー | 値 |
| :--- | :--- |
| `buyer.orders.title` | "マイ注文" |
| `orders.filter.status` | "ステータス" |
| `orders.filter.dateRange` | "日付範囲" |
| `orders.track` | "追跡" |
| `orders.empty` | "ご注文はまだありません。" |
| `orders.detail.header` | "注文詳細" |
| `orders.detail.totals` | "注文サマリー" |
| `orders.tracking.timeline` | "注文ステータス" |
| `orders.tracking.delivered` | "商品はお届け済みです。" |
| `orders.tracking.noHistory` | "この注文の追跡履歴は利用できません。" |
| `merchant.orders.title` | "注文インサイト" |
| `merchant.orders.scopeNote` | "自ショップの注文のみ表示しています。" |
| `merchant.orders.today` | "本日" |
| `merchant.orders.thisMonth` | "今月" |
| `merchant.orders.completed` | "完了" |
| `merchant.orders.customer` | "顧客" |
| `merchant.revenue.title` | "収益サマリー" |
| `merchant.revenue.sales` | "売上" |
| `merchant.revenue.commission` | "コミッション" |
| `merchant.revenue.net` | "収益" |
| `merchant.revenue.aov` | "平均注文額" |
| `merchant.revenue.orderCount` | "N件の注文に基づく" |
| `merchant.revenue.rateNote` | "注文作成時のコミッション率を適用" |
| `merchant.revenue.period` | "期間" |
| `admin.orders.title` | "全注文" |
| `admin.orders.detail.shopInfo` | "ショップ / 販売者" |
| `admin.orders.filter.shop` | "ショップ / 出品者" |
| `admin.orders.empty` | "条件に一致する注文がありません。" |
| `common.view` | "詳細" |
| `common.back` | "注文に戻る" |
| `common.resultCount` | "42件の注文が条件に一致します" |

### 9.3 ミャンマー語（my）— Order Insights

| キー | 値 |
| :--- | :--- |
| `buyer.orders.title` | "ကျွန်ုပ်၏ မှာယူမှုများ" |
| `orders.filter.status` | "အခြေအနေ" |
| `orders.filter.dateRange` | "ရက်အပိုင်းအြား" |
| `orders.track` | "ခြေရာခံ" |
| `orders.empty` | "မှာယူမှု မရှိသေးပါ။" |
| `orders.detail.header` | "မှာယူမှုအသေးစိတ်" |
| `orders.tracking.timeline` | "မှာယူမှုအခြေအနေ" |
| `orders.tracking.delivered` | "သင့်ပစ္စည်း ပို့ဆောင်ပြီးပါပြီ။" |
| `merchant.orders.title` | "မှာယူမှု ခွဲခြမ်းစိတ်ဖြာချက်" |
| `merchant.orders.today` | "ယနေ့" |
| `merchant.orders.thisMonth` | "ဤလ" |
| `merchant.orders.completed` | "ပြီးစီး" |
| `merchant.revenue.title` | "ဝင်ငွေ အကျဉ်းချုပ်" |
| `merchant.revenue.sales` | "ရောင်းအား" |
| `merchant.revenue.commission"` | "ကော်မရှင်" |
| `merchant.revenue.net` | "ဝင်ငွေ" |
| `merchant.revenue.aov` | "ပျမ်းမျှမှာယူမှုတန်ဖိုး" |
| `merchant.revenue.period` | "ကာလ" |
| `admin.orders.title` | "မှာယူမှုအားလုံး" |
| `admin.orders.detail.shopInfo` | "ဆိုင် / ရောင်းချသူ" |
| `admin.orders.empty` | "စစ်ထုတ်မှုနှင့် ကိုက်ညီသော မှာယူမှုမရှိပါ။" |
| `common.view` | "ကြည့်ရှုရန်" |
| `common.back` | "မှာယူမှုသို့ ပြန်သွားရန်" |

---
## 10. 共有コンポーネント（Shared Components）

| コンポーネント | 使用箇所 | 備考 |
| :--- | :--- | :--- |
| `StatusBadge` | レイアウト 1、2、4 [D]、5、6、7 | BR-OI-031 に基づく色分け。`order_statuses.status_name` からの i18n ラベル。 |
| `PaymentBadge` | レイアウト 2、5、7 | `pending`／`completed`（アンバー／グリーン）。 |
| `DataTable` | レイアウト 1、2、4 [D]、5、6 | スケルトンローディング。サーバーサイドページネーション／ソート。`meta` 処理。 |
| `VerticalStepper` | レイアウト 3 | 6 ステップを描画。`done`／`current`／`upcoming`。最上位マーカー `#7C3AED`。 |
| `EmptyState` | レイアウト 1、6 | イラスト付き空状態＋CTA（BR-OI-030）。 |
| `AlertBanner` | 全レイアウト | エラー用の破壊的／情報バナー（FDS §9）。 |
| `Skeleton` | 全レイアウト | ローディング中のシマープレースホルダー。 |
| `Toast` | 全レイアウト | 一時的な API エラー／リトライ通知。 |

---
## 11. 特記事項・UI仕様（Special UI Notes & Styling Constraints）

### 11.1 デザイン参照の照合（Design Reference Cross-Check）

`docs/screen/Order_Insights/Design_Photos/` 内の各 Figma スクリーンショットを FDS §5／§7 と照合しました。レイアウトへのスクリーンショットの対応付け:

| スクリーンショット | 対応するレイアウト | 照合結果 |
| :--- | :--- | :--- |
| `buyer order insight .png` | レイアウト 1 購入者 注文履歴 | OK — 要素が EL-OI-01..08 と一致。 |
| `buyer order insight order detail.png` | レイアウト 2 購入者 注文詳細 | OK — 合計は小計／割引／合計を表示（§7.5 `discountAmount`／`couponCode`／`totalAmount` により仕様裏付け）。 |
| `buyer order tracking.png` | レイアウト 3 注文追跡 | OK — 要素が EL-OI-20..26 と一致。 |
| `order insight merchant.png` | レイアウト 4 販売者 注文インサイト | OK — 売上タイル、収益サマリーグループ、自ショップリストが EL-OI-30..47 と一致。 |
| `admin-order-insights.png` | レイアウト 6 管理者 全注文 | OK — 要素が EL-OI-60..69 と一致。 |
| `merchant-order-detail.png` | レイアウト 5 販売者 注文詳細 | **フラグ済み** — 下記の注記を参照。 |
| `admin-order-detail.png` | レイアウト 7 管理者 注文詳細 | OK — ショップ／販売者情報、無制限の明細、合計、顧客情報、Track Order が参照と一致。 |

**フラグ済み項目（事実として断定するのではなく、注記として文書化）:**
- **販売者 注文詳細 — 割引:** `merchant-order-detail.png` のデザインモックは、合計パネルに**割引**行を表示します。これは FDS §5.5 および §7.5 と一致します。合計パネル（EL-OI-52）は**小計、割引、合計**を描画し、クーポンコードは存在する場合に表示されます。§7.2 の DB マッピングは、購入者と販売者両方の詳細の合計に `discount_amount` と `coupon_code` を適用します。
- **「送料」行は `orderDetail` には存在しません**（§7.5 は `discountAmount`／`couponCode`／`totalAmount` のみを公開）— どの合計パネルにも送料行を追加しないでください。
- **販売者 注文詳細** のレイアウトは、それ以外は共有された §7.5 詳細 DTO（顧客ブロック、メモ、追跡、ステータス変更ナビゲーション）と整合しており、`order_items` を販売者の自ショップに制限します。
- **レイアウト 5 の顧客 PII** は `customer.name`／`customer.email`／`customer.phone` ＋ 配送先住所に限定されます（BR-OI-033）。
- **コミッション率スナップショット**（`orders.commission_rate`）は未解決のスキーマ間隙です（BR-OI-023）— それが存在するまで `—`／脚注を描画します（BR-OI-032）。

### 11.2 スタイリング・アクセシビリティ制約

| 項目 | 仕様 |
| :--- | :--- |
| `mkrCurrentStep` アクセント | `STEP_CURRENT`（EL-OI-23）はラグジュアリーパープル `#7C3AED`。 |
| ステータスバッジの色 | `order_statuses.status_code` に従って色分け（BR-OI-031）。i18n ラベル。 |
| 動作削減（reduced motion） | エントリー／ステップアニメーションは `prefers-reduced-motion: reduce` 下でスキップ。 |
| 空とエラー | 空データ → `—`／`0` ＋ イラスト付き空状態（BR-OI-030）。決してエラースタイルにしない。 |
| アクセシビリティ | アラート／トーストに `role="status"`。ステッパー項目は順序付け。テーブルヘッダーはカラムと関連付け。 |
| 読み取り専用の強調 | どの画面にもインライン編集コントロールはなし。「ステータス変更」はナビゲーションのみ。 |

---
## 12. テストチェックリスト（Testing Checklist）

### 12.1 購入者 注文履歴テスト（レイアウト 1）

- [ ] "My Orders" 見出しと注文リストテーブル付きでページがロードされる
- [ ] API レスポンスが到着するまでスケルトンローディング状態が表示される
- [ ] ステータスフィルターが既定 "All" で、単一ステータス（6 ステータスの各々）に絞り込まれる
- [ ] 日付範囲フィルターが `from ≤ to` を検証する（VAL-OI-002）
- [ ] テーブルが注文番号、日付、明細、合計、支払、ステータスのカラムを表示する
- [ ] ステータスバッジがステータスごとに正しい色と i18n ラベルを表示する（BR-OI-031）
- [ ] 追跡リンクが選択行の注文追跡へ遷移する
- [ ] ページネーションが "Page 1 of N · total" を表示し、前へ／次へが機能する（20 行／ページ）
- [ ] 0 注文の場合、イラスト＋CTA 付きの空状態が表示される（BR-OI-030）
- [ ] 購入者の行には**顧客カラムが含まれない**（BR-OI-015）
- [ ] 未認証アクセス（JWT なし）はログインへリダイレクトされる（401）
- [ ] サーバーエラーはリトライ付きの破壊的アラートを表示する（500）

### 12.2 購入者 注文詳細テスト（レイアウト 2）

- [ ] 注文ヘッダーが注文番号、日付、現在のステータスバッジを表示する
- [ ] 購入者 注文詳細はショップ名のみを表示し、`shop.merchantId` は描画されない
- [ ] 明細テーブルが商品／数量／単価／行合計を表示し、価格は固定されている（BR-OI-017）
- [ ] 合計パネルが小計、割引（＋クーポン）、合計を表示し、**送料の行はなし**
- [ ] `discountAmount = 0` かつ `couponCode` がない場合、割引行は非表示
- [ ] 支払ステータスが方法＋pending/completed バッジを表示する
- [ ] 配送先住所が JSONB ブロックから描画される
- [ ] `notes` が null の場合、注文メモは非表示
- [ ] Track Order ボタンが追跡へ遷移する
- [ ] スコープ外の `:id` は 404 を返す（意図的に区別不能、BR-OI-008）
- [ ] NotFound は "Order not found" ＋ 注文に戻るアクションを返す

### 12.3 注文追跡テスト（レイアウト 3）

- [ ] 注文参照が注文番号＋日付を表示する
- [ ] タイムラインが `display_order` 順の全 6 ステップを描画する（placed→…→delivered）
- [ ] 到達済みステップはタイムスタンプを表示し、未到達ステップは空白
- [ ] 現在のステップが `#7C3AED` マーカーでマークされる（done/current/upcoming）
- [ ] 配送完了バナーは `status='delivered'`（終端）の場合のみ表示
- [ ] 履歴不明注記は `historyAvailable = false` の場合に表示（BR-OI-014）
- [ ] 戻るリンクがロールに応じた詳細画面へ遷移する
- [ ] スコープ外アクセスは標準の not-found パネルを描画する（BR-OI-008）

---
### 12.4 販売者 注文インサイトテスト（レイアウト 4）

- [ ] 注文数タイル、収益サマリーグループ、自ショップ注文リスト付きでページがロードされる
- [ ] 売上タイルが本日／今月／完了のカウントを表示し、ローディング中はスケルトン
- [ ] 収益サマリーが売上／コミッション／収益／平均注文額を**一つのグループとして**描画する（BR-OI-026）
- [ ] 収益が強調され、売上 − コミッションと等しい（BR-OI-024）
- [ ] 平均注文額が収益 ÷ 注文数と等しい（純額、総売上ではない — BR-OI-025）
- [ ] 注文数キャプションが "Based on N orders" を表示する（BR-OI-027）
- [ ] レート脚注がソース付きで描画され、`commissionRateLocked=false` のときは `—` を描画（BR-OI-032）
- [ ] 期間セレクタが既定で今月、本日／先月への切替で再取得（VAL-OI-006）
- [ ] `from`／`to` のない `period=custom` はエラーを表示（VAL-OI-007）
- [ ] 自ショップ注文リストが顧客カラム（販売者ビュー、BR-OI-015）と正しいスコープを表示する
- [ ] 行アクション（View / Track）が正しく遷移する
- [ ] スコープ注記 "Showing orders for your shop only." が表示される（EL-OI-47）
- [ ] `license_status='approved'` でない販売者は 403 でブロックされる（BR-OI-006）
- [ ] 管理者はライセンスゲートなしで販売者ダッシュボードを表示できる

### 12.5 販売者 注文詳細テスト（レイアウト 5）

- [ ] 注文ヘッダーが注文番号、日付、ステータスバッジ、支払ステータスを表示する
- [ ] 明細テーブルが**販売者の自ショップの行のみ**を表示する（`order_items.merchant_id` = 自ショップ）
- [ ] 合計パネルが**小計、割引、合計**を表示し、クーポンコードは存在する場合に表示（EL-OI-52）
- [ ] 顧客情報が名前、メール、電話、配送先住所のみを表示する（BR-OI-033）
- [ ] 注文メモは null の場合に非表示
- [ ] Track Order が `/orders/:id/tracking`（共有レイアウト 3 ルート）へ遷移する
- [ ] Change Status リンクは**Order Fulfillment へのナビゲーションのみ**であり、ここではステータス変更 API を呼ばない
- [ ] ステータスバッジは読み取り専用（EL-OI-56）
- [ ] 他ショップの注文は 404 を返す（BR-OI-008）

---
### 12.6 管理者 全注文テスト（レイアウト 6）

- [ ] "All Orders" 見出し、フィルターバー、結果件数、全プラットフォーム注文リスト付きでページがロードされる
- [ ] ショップ／販売者フィルターが検索可能で、選択するとリストを絞り込む（管理者のみ）
- [ ] ステータスフィルターと日付範囲フィルターがショップフィルターと AND 結合される（BR-OI-016）
- [ ] フィルター適用後に適用絞り込みチップが表示され、チップをクリアすると再取得される
- [ ] 注文リストがショップ／販売者と購入者のカラムを表示する（双方とも §7.4 DTO から）
- [ ] 結果件数がフィルター後の合計（`meta.total`）に一致して更新される
- [ ] 行アクション（View / Track）が任意のプラットフォーム注文で機能する
- [ ] ページネーションが 20 行／ページで機能する
- [ ] 空状態 "No orders match the current filters." ＋ Clear Filters CTA が 0 行で表示
- [ ] 非管理者が `merchantId`／`shopId` を使用しようとすると 403 でブロックされる（BR-OI-001）
- [ ] 管理者フィルターパラメータは購入者／販売者の呼び出し元に対して `403` として拒否される

### 12.7 管理者 注文詳細テスト（レイアウト 7）

- [ ] 注文ヘッダーが注文番号、注文日時、ステータスバッジ、支払ステータスバッジを表示する
- [ ] ショップ／販売者カードが `shop.name` と `shop.merchantId` を管理者のみに表示する（BR-OI-015/033）
- [ ] 明細テーブルが `merchant_id` フィルターなしの全注文行を表示する（§6.2 ステップ 4）
- [ ] 合計パネルが小計、割引、合計を表示し、クーポンコードは存在する場合に表示
- [ ] 顧客情報が名前、メール、電話、配送先住所のみを表示する（BR-OI-015/033）
- [ ] Track Order が `/orders/:id/tracking`（共有レイアウト 3 ルート）へ遷移する
- [ ] ステータス変更アクションやその他の状態を変更するコントロールは描画されない（BR-OI-007）
- [ ] 不正または欠落した注文は標準の 404 パネルを返す

---
### 12.8 全画面共通テスト（Global Tests）

- [ ] 全画面がデータ到着までスケルトンを表示する
- [ ] 空状態は `0`／`—` とイラストを描画し、決してエラースタイルにしない（BR-OI-030）
- [ ] スコープ外アクセスは常に標準の not-found パネルを描画する（BR-OI-008）
- [ ] 言語切替で全ラベルとステータス名が EN／JA／MY 間で切り替わる（FDS §13.6）
- [ ] ロケール対応の通貨／日付フォーマットが選択言語に従う
- [ ] 販売者の収益数値は決して単独で描画されない（BR-OI-026）
- [ ] レスポンシブレイアウトがモバイル／タブレット／デスクトップ／ワイドのブレークポイントで機能する（§3.2）
- [ ] 注文データを変更したり、ステータス遷移を行ったりする画面は存在しない（読み取り専用）
- [ ] 監査イベントが書き込まれる: `ORDER_LIST_VIEWED`、`ORDER_DETAIL_VIEWED`、`ORDER_TRACKING_VIEWED`、`MERCHANT_SUMMARY_VIEWED`、`CROSS_SCOPE_ACCESS_DENIED`
- [ ] レート制限（429）が "Too many requests. Please wait {seconds} seconds" を表示する

---

*画面項目設計書（Order Insights）ここまで — End of Screen Items Specification (Order Insights)*
