# Screen Items Specification (画面項目設計書) — Commission & Revenue

**Document ID:** SKM-SIS-COMM-001  
**Target Screen:** Admin Commission / Revenue Dashboard (手数料・収益管理)  
**Subsystem:** Commission Management & Revenue Tracking  
**Function ID:** FN-COMM-001  
**Version:** 5.1  
**Created:** 2026-08-10  
**Last Updated:** 2026-10-15  
**Author:** Senior System Engineer  
**Review Status:** Released (Aligned with REQUIREMENT_SPEC v2.11, DATABASE_SPEC v2.5, Functional Spec v8.1)  
**Classification:** Internal — Engineering Division

---

## 1. Document Control (ドキュメント管理)

### 1.1 Document Revision History

| Version | Date | Author | Description of Changes |
| :--- | :--- | :--- | :--- |
| 1.0 | 2026-08-10 | Senior System Engineer | Initial release. Admin Commission / Revenue 画面の項目定義書。SKM-FDS-COMM-001（機能設計書）に準拠。 |
| 2.0 | 2026-08-11 | Senior System Engineer | 収益目標進捗（ゲージバー）とAI収益予測（点線）のセクション・挙動・バリデーションエラー・DB/APIマッピング・i18nキー・テストを追加。機能設計書 v3.0 に準拠。 |
| 2.1 | 2026-08-17 | System Engineer | DBフィールドマッピングを DATABASE_SPEC v2.0 に準拠（UUID PK、Decimal型）。 |
| 2.2 | 2026-08-17 | Senior System Engineer | バージョン参照を REQUIREMENT_SPEC v1.7 / DATABASE_SPEC v2.2 / DEVELOPMENT_RULES v2.1 / 機能設計書 v5.0 に更新。広告料金収益セクションを追加。 |
| 2.3 | 2026-08-17 | Senior System Engineer | 広告支払いステータスパネル・広告料金サマリーカード・広告料金トレンド系列・広告料金APIレスポンスを追加。 |
| 2.4 | 2026-08-18 | Senior System Engineer | DBカラムマッピングを DATABASE_SPEC v2.2 に修正。ペイアウトDBカラム（commission_amount、idempotency_key）を追加。 |
| 2.5 | 2026-08-18 | Senior System Engineer | コミッション範囲と財務レポートのマッピングを REQUIREMENT_SPEC v1.10 / DATABASE_SPEC v2.2 に調整。 |
| 3.0 | 2026-08-22 | Senior System Engineer | 機能設計書 v6.0 / DATABASE_SPEC v2.4 に準拠：ペイアウト計算から広告料金控除を削除（純ペイアウト = total − commission）、rateバリデーションを strict > 0 に、監査保持期間を2年/1年に。 |
| 3.1 | 2026-08-22 | Senior System Engineer | セクション3.1のレイアウト図とセクション4の項目定義を再構成。各レイアウトが独立したラベル（[A]～）を使用。 |
| 4.0 | 2026-08-22 | Senior System Engineer | Commission Page と Revenue Page をタブ付き単一ページ（`/admin/commission-revenue`）に統合。全レイアウト図・項目定義・挙動トリガー・ルート参照を更新。 |
| 4.1 | 2026-08-24 | Senior System Engineer | 支払いステータス列挙型を機能設計書 v7.1 / DATABASE_SPEC v2.4 に準拠。 |
| 4.2 | 2026-08-24 | Senior System Engineer | 支払いステータスパネルから「失敗」「返金」バッジを削除。グリッド間隔を調整（注文：1行2列、広告：1行3列）。 |
| 5.0 | 2026-08-25 | Senior System Engineer | エクスポート機能を追加：Commissionタブ・収益タブ・ペイアウトテーブルのボタン、レイアウト5（エクスポートモーダル）、エクスポート挙動・バリデーション・エラーコード・DBマッピング・APIレスポンス・マッピング・i18nキー・テスト。機能設計書 v8.0 に準拠。 |
| 5.1 | 2026-10-15 | Senior System Engineer | 実装に準拠（2026-10-15）：存在しないページフッター（言語/テーマトグルは管理レイアウトに存在）とエクスポートの見積もり行数/履歴UIを削除。ペイアウトパネルをペイアウトステータス（pending/processing/completed）に修正。ペイアウトフィルタ（status/merchant/period/search）、複数選択チェックボックス、View/Deleteアクション、groupByトグルをレイアウトに追加。VAL-COMM-*/VAL-EXP-*/COMM_*/EXP_* コードをグローバルエンベループのエラーコードに置換。DBマッピングを修正（`payouts` に `ad_fee_amount`/`failure_reason` 列は存在しない）。i18nリファレンスを実際の `admin.commission.*` キーセット（既知のギャップ付き）に書き直し。APIレスポンス例を修正（ペイアウト処理の `adFeeAmount: "0.00"`、監査ペイロード形状）。 |

### 1.2 Related Documents

| No. | Document ID | Document Name | File Path | Version | Remarks |
| :-- | :--- | :--- | :--- | :--- | :--- |
| 1 | SKM-REQ-001 | Requirements Definition | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | 2.11 | Business workflow logic, user roles, merchant states, and rules. |
| 2 | SKM-DBS-001 | Database Design Specification | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | 2.5 | Table structures with UUID PKs, Decimal types, FK relationships, and constraints. |
| 3 | SKM-DEV-001 | Development Rules | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` | 2.1 | Naming conventions, security rules, design tokens, error responses, and RBAC. |
| 4 | SKM-FDS-COMM-001 | Functional Specification — Commission & Revenue | `docs/screen/Commission_Revenue/機能設計書_Commission_&_Revenue.md` | 8.1 | Use cases, state transitions, validation rules, business rules, and error handling. |

---

## 2. Screen Overview & Purpose (画面概要・目的)

### 2.1 Purpose (目的)
Commission / Revenue 画面は、Cosmetics Finder プラットフォームの管理者向け財務管理画面です。プラットフォーム手数料率の設定、出品者別の手数料レポートの閲覧、広告料金収益を含む収益KPIとトレンドの監視、ペイアウトおよび広告支払いステータスの確認、出品者ペイアウト（レビュー/処理/削除）の管理を行えます。さらに、月次/四半期の収益目標を設定しゲージバーで進捗を確認し、AIによる収益予測をトレンドチャート上に点線として表示し、財務レポート（手数料・収益・ペイアウト）をCSV/Excelでエクスポートできます。

### 2.2 Target Users & Roles (対象ユーザーと権限)

| Attribute | Value |
| :--- | :--- |
| **Primary Actor** | Platform Administrator (Admin) |
| **Required Authentication** | JWT access token |
| **Data Scope** | Commission settings, reports, revenue KPIs, revenue targets, forecast data, ad fee revenue, ad payment status, payout records |
| **Access Control** | Protected route — `admin` / `super_admin` ロール（`roles={['admin', 'super_admin']}`） |

### 2.3 Core Functions & Basic Design Principles (主要機能・基本設計方針)
1. **Commission Rate Configuration** — 新規取引に適用されるプラットフォーム手数料率を設定・永続化する。
2. **Commission Report Generation** — フィルタリング、グループ化（merchant/day/order）、ページネーションを備えた出品者別手数料レポート。
3. **Revenue Dashboard KPI** — 広告料金収益を含む収益KPIとトレンド可視化。
4. **Payout Status Breakdown** — ペイアウトステータス（pending/processing/completed。ペイアウトリスト由来）と広告支払いステータス（pending/completed/refunded）を集計。
5. **Merchant Payout Management** — ペイアウトレビュー（pending → processing）、処理（→ completed）、削除（完了済み・3ヶ月以上経過）を冪等性付きで管理。
6. **Revenue Target Progress** — 月次/四半期の収益目標を設定しゲージバーで進捗を表示。
7. **AI Revenue Forecast** — 過去データから収益と広告料金を予測（7件以上の populated バケットに対する線形回帰）し、点線としてトレンドに沿って描画。
8. **Export Functionality** — 日付範囲を指定して手数料レポート・収益データ・ペイアウト履歴をCSV/Excelでエクスポート。
9. **Error Handling** — API結果のトースト通知、フィールドバリデーションのインラインテキスト、ペイアウト削除失敗時のAlertDialog。
10. **Internationalization** — `admin.commission.*` キーによるEN/JA/MYのi18n対応（インライン付き）。
11. **Responsive Design** — レスポンシブなKPIグリッド、テーブル、チャートレイアウト。

---

## 3. Screen Layout (画面レイアウト構成)

### 3.1 Overall Page Structure (全体画面構成)

単一ページ（`frontend/src/pages/admin/CommissionRevenue.tsx`）に Commission と Revenue の2タブ。以下の各レイアウトは独立したラベル（[A]～）を使用。エクスポートモーダル（レイアウト5）は両タブで共用。ページはスタンドアロンのコンテナ（`max-w-[1400px]`）であり、言語/テーマトグルを持つフッターは描画しない（これらは管理レイアウトのヘッダーに存在する）。

---

#### Layout 1: Commission & Revenue Page (`/admin/commission-revenue`)

```text
┌─────────────────────────────────────────────────────────┐
│                    BROWSER VIEWPORT                     │
├─────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────┐  │
│  │   [A] PAGE HEADER                                 │  │
│  │   "Commission & Revenue"                          │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │   [C] TAB GROUP                                   │  │
│  │   [ Tab 1: Commission ] [ Tab 2: Revenue ]        │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │   [TAB 1 CONTENT — COMMISSION]                    │  │
│  │   [D] COMMISSION RATE CARD (CommissionTable)      │  │
│  │       Current Rate %  +  [Edit Rate]              │  │
│  │   [E] REPORT FILTER PANEL (ReportFilterPanel)     │  │
│  │       [By Merchant|By Day|By Order]               │  │
│  │       [E1] From  [E2] To  [E3] Apply  [E4] Reset  │  │
│  │   [F] REPORT TABLE CARD                           │  │
│  │       title + [Export] button                     │  │
│  │       CommissionReportsTable (sticky header)      │  │
│  │       PaginationControls (10/20/50/100)           │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │   [TAB 2 CONTENT — REVENUE] (RevenueTab)          │  │
│  │   [O1] [Export Revenue] (top-right)               │  │
│  │   [G] KPI CARDS (RevenueKPICards, 6)              │  │
│  │   [H] TREND CHART CARD (RevenueTrendChart)        │  │
│  │       legend + inline SVG + [RangeToggle]         │  │
│  │   [I] REVENUE TARGET CARD (RevenueTargetCard)     │  │
│  │       [Monthly|Quarterly] target/actual/progress  │  │
│  │       bar + [Edit Target|Set Target]              │  │
│  │   [J][K][L] STATUS GRID (md:2 / lg:3)             │  │
│  │       PaymentStatusPanel (payout statuses)        │  │
│  │       AdPaymentStatusPanel                       │  │
│  │       AdFeeSummaryCard                            │  │
│  │   [M] PAYOUT SECTION                              │  │
│  │       "Merchant Payouts" + [Export Payout]        │  │
│  │       filters: Status|Merchant|Period|Search      │  │
│  │       [Reset] [Delete selected (red)]             │  │
│  │       PayoutTable (checkboxes, sticky header)     │  │
│  │       PaginationControls                          │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │   [S] EXPORT DIALOG (ExportDialog, shared)        │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

#### Layout 2: Edit Rate Dialog (Modal、CommissionTable 内)

```text
┌─────────────────────────────────────────────┐
│              [A] EDIT RATE DIALOG           │
│  ┌─────────────────────────────────────┐    │
│  │   [B] Rate Input + "%"              │    │
│  │   [C] Inline Field Error (cond.)    │    │
│  └─────────────────────────────────────┘    │
│  [D] Cancel Button   [E] Save Button        │
└─────────────────────────────────────────────┘
```

#### Layout 3: Payout Confirmation Dialog (Modal)

```text
┌─────────────────────────────────────────────┐
│              [A] CONFIRMATION DIALOG        │
│   "Process payout for {merchant}?"          │
│  [B] Total Amount / Commission Fee /        │
│      Net Payout (+ completed/pending        │
│      breakdown when > 1 underlying order)   │
│  [C] Cancel Button   [D] Confirm Button     │
│  (Cancel reviews the payout when pending)  │
└─────────────────────────────────────────────┘
```

#### Layout 4: Edit Target Dialog (Modal、RevenueTargetCard 内)

```text
┌─────────────────────────────────────────────┐
│              [A] EDIT TARGET DIALOG         │
│  ┌─────────────────────────────────────┐    │
│  │   [B] Target Amount Input           │    │
│  │   [C] Inline Field Error (cond.)    │    │
│  └─────────────────────────────────────┘    │
│  ┌─────────────────────────────────────┐    │
│  │   [D] Target Period Toggle          │    │
│  │   (Monthly / Quarterly buttons)     │    │
│  └─────────────────────────────────────┘    │
│  [E] Cancel Button   [F] Save Button        │
└─────────────────────────────────────────────┘
```

#### Layout 5: Export Modal (エクスポートモーダル、共用)

```text
┌─────────────────────────────────────────────┐
│              [A] EXPORT MODAL               │
│  [B] Modal Title "Export Report"            │
│  [C] Report Type Display (read-only)        │
│  [D] Group By Display (commission, read-only)│
│  [E] Merchant Select (payout only, cond.)   │
│  [F] Start/End Date Inputs                  │
│  [G] Format Toggle Buttons (CSV / Excel)    │
│  [H] Inline Error (cond.)                   │
│  [I] Generate Button   [J] Cancel Button    │
└─────────────────────────────────────────────┘
```

### 3.2 Responsive Layout Breakpoints (レスポンシブ対応)

| Breakpoint | Min Width | Layout Behavior |
| :--- | :--- | :--- |
| Mobile (default) | 0px | KPIカードは1列、テーブルは横スクロール。ペイアウトフィルタは縦積み。 |
| Tablet (`md:`) | 640px | KPIグリッド2列、ステータスパネルグリッド2列、ペイアウトフィルタは折り返し。 |
| Desktop (`lg:`) | 1024px | ステータスパネルグリッド3列、全幅テーブル。 |
| Wide (`xl:`) | 1280px | KPIグリッド3列（`xl:grid-cols-3`）。 |

---

## 4. Item Definitions (画面項目定義)

以下の各レイアウトは独立したラベル（[A]～）を使用。

---

### 4.1 Layout 1: Commission & Revenue Page

#### Section [A]: Page Header (ページヘッダー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 1 | `lblPageTitle` | Page Title | Text (`h1`) | String | — | 表示。テキスト: "Commission & Revenue" | — | ハードコードUIテキスト | i18nキー: `admin.commission.title`。このページに管理者ユーザーメニューはない（管理レイアウトのヘッダーに存在）。 |

#### Section [C]: Tab Group (タブグループ)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 2 | `tabGroup` | Tab Group | Tabs (shadcn) | Enum | Yes | デフォルト: タブ1（Commission） | オプション: `commission`, `revenue` | — | 非アクティブなタブの内容はアンマウントされる（収益データはマウント時に取得）。i18nキー: `admin.commission.tabs.*`。 |

#### Section [D]: Commission Rate Card (手数料率カード) — タブ1

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 3 | `lblCurrentRate` | Current Rate Label | Static Label | String | — | テキスト: "Commission Rate" | — | ハードコードUIテキスト | i18nキー: `admin.commission.rate.title`。 |
| 4 | `txtCurrentRate` | Current Rate Value | Text | String | Mandatory | 未設定時 `—` を表示。 | 形式: `Number(rate)%`（末尾のゼロ除去、例 "12%"）。 | `GET /admin/commission` → `commission_settings.commission_rate` | 文字列から描画し精度を保持。 |
| 5 | `btnEditRate` | Edit Rate Button | Button (`outline`) | — | Mandatory | 表示。テキスト: "Edit Rate" | — | — | 編集ダイアログ（レイアウト2）を開く。i18nキー: `admin.commission.rate.edit`。 |

#### Section [E]: Report Filter Panel (レポートフィルターパネル) — タブ1

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 6 | `tglGroupBy` | Group By Toggle | Toggle Buttons | Enum | No | デフォルト: `merchant` | オプション: `merchant`（By Merchant）、`day`（By Day）、`order`（By Order） | クエリパラメータ `groupBy` | ボタン変更は現在の日付ですぐに適用。i18nキー: `admin.commission.groupBy.byMerchant/byDay/byOrder`。 |
| 7 | `txtFromDate` | From Date Picker | Input (`date`) | DATE | No | 空（全期間）。 | 有効な日付。`from <= to`。 | クエリパラメータ `from` | レポートクエリに適用（`createdAt >= from`）。 |
| 8 | `txtToDate` | To Date Picker | Input (`date`) | DATE | No | 空（全期間）。 | 有効な日付。`to >= from`。 | クエリパラメータ `to` | 終了日 <= 23:59:59.999Z まで含む。 |
| 9 | `btnApplyFilter` | Apply Button | Button (`primary`) | — | No | 表示。テキスト: "Apply" | — | — | フィルタ済みレポートを取得。ページは1にリセット。i18nキー: `admin.commission.filters.apply`。 |
| 10 | `btnResetFilter` | Reset Button | Button (`outline`) | — | No | 表示。テキスト: "Reset" | — | — | 日付をクリアし groupBy を `merchant` にリセット、ページ1。i18nキー: `admin.commission.filters.reset`。 |
| 11 | `errDateRange` | Date Range Error | Text (conditional) | String | Conditional | 非表示。両方の日付が設定され `from > to` のとき表示。 | — | — | i18nキー: `admin.commission.filters.invalidDateRange`。 |

#### Section [F]: Commission Report Table (手数料レポートテーブル) — タブ1

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 12 | `tblReport` | Commission Report Table | Table | — | Mandatory | 取得中は `opacity-50`（ポインターイベント無効）。 | 列はgroupByに応じて変化: day は `Date` 追加、order は `Order Number` + `Date` 追加し `Orders` を省略。 | `GET /admin/commission/reports` | スティッキーヘッダー、ホバーハイライト、空状態テキスト。列ソートなし。 |
| 13 | `tblReportMerchant` | Merchant Column | Column | String | — | — | — | `merchants.shop_name` | 出品者名。注文が複数の手数料期間にまたがる場合は同一出品者が複数行に現れる。 |
| 14 | `tblReportRate` | Commission Rate Column | Column | String | — | — | `formatRate`（例 "12%"） | グループ化された注文の有効レート | 各注文作成時点の有効レート（rate-history 参照）。 |
| 15 | `tblReportOrders` | Orders Column | Column | Integer | — | — | — | 完了注文のカウント | `order` グループ化では省略。 |
| 16 | `tblReportRevenue` | Revenue Column | Column | Decimal(12,2) | — | — | `formatCurrency(...) Ks` | 完了注文の `orders.total_amount` 合計 | 完了注文のみ。 |
| 17 | `tblReportCommission` | Commission Column | Column | Decimal(12,2) | — | — | `formatCurrency(...) Ks`（primary色） | アプリケーションレベルの集計 | 完了注文総額 × 注文作成時点のレート。過去の取引には現在の設定を適用しない。 |
| 18 | `pgReport` | Pagination | PaginationControls | — | No | 最初のページ。 | デフォルトページサイズ10（10/20/50/100）。 | クエリパラメータ `page`、`limit` | 共有 `@/components/PaginationControls`。 |
| 19 | `btnExportCommission` | Export Commission Button | Button (`secondary`) | — | No | レポート行がなければ無効。テキスト: "Export" | — | — | レポートタイプ "Commission" でエクスポートモーダルを開く。日付 + groupBy をプリフィル。i18nキー: `admin.commission.actions.export`。 |

#### Section [G]: KPI Cards (収益KPIカード) — タブ2

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 20 | `lblTotalRevenue` | Total Revenue Card | Card | String | Mandatory | 取得中はパルススケルトン。 | `formatCurrency(...) Ks` | 完了注文の `orders.total_amount` 合計 | i18nキー: `admin.commission.kpi.totalRevenue`（フォールバック: "Total Revenue"）。期間サフィックスラベルを付記（§9の既知のギャップ参照）。 |
| 21 | `lblTotalCommission` | Total Commission Card | Card | String | Mandatory | スケルトン。 | `Ks` | 完了注文のコミッション集計 | i18nキー: `admin.commission.kpi.totalCommission`。 |
| 22 | `lblAdFeeRevenue` | Ad Fee Revenue Card | Card | String | Mandatory | スケルトン。 | `Ks` | 完了済み `ad_payments.amount` 合計 | i18nキー: `admin.commission.kpi.adFeeRevenue`。 |
| 23 | `lblTotalIncome` | Total Income Card | Card | String | Mandatory | スケルトン。 | `Ks` | コミッション + 広告料金収益 | 説明テキスト付き。i18nキー: `admin.commission.kpi.totalIncome`。 |
| 24 | `lblAvgOrderValue` | Avg Order Value Card | Card | String | Mandatory | スケルトン。 | `Ks` | 完了注文総額 / 完了注文数 | i18nキー: `admin.commission.kpi.avgOrderValue`。 |
| 25 | `lblNetRevenue` | Net Revenue Card | Card | String | Mandatory | スケルトン。 | `Ks` | `totalRevenue − totalCommission` | 返金は控除しない。i18nキー: `admin.commission.kpi.netRevenue`。 |

#### Section [H]: Trend Chart & Range Toggle (トレンドチャート・期間切替) — タブ2

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 26 | `chtTrend` | Trend Chart | Inline SVG（チャートライブラリなし） | — | Mandatory | データがない場合は空状態テキスト。 | 600×300 viewBox、幅レスポンシブ。 | `GET /admin/revenue/trends` | 系列: Revenue (#3b82f6)、Commission (#8b5cf6)、Ad Fee (#f59e0b)。 |
| 27 | `serForecast` | Forecast Series | SVG polyline（破線） | — | No | 予測ポイントが存在する場合のみ描画。 | 破線のグレー（#94a3b8）、ドットマーカー、最後の実績点からの接続線。 | `GET /admin/revenue/forecast` | 収益のみのOLS外挿。コミッション = 収益 × 現在の手数料率。非確定の推定値。 |
| 28 | `lblForecastLegend` | Forecast Legend | Legend Item | String | No | 予測ポイントが存在するとき表示。テキスト: "AI Forecast" | — | ハードコードUIテキスト | i18nキー: `admin.commission.trend.aiForecast`。 |
| 29 | `txtForecastNote` | Forecast Note | SVG text（チャート下部） | String | No | 予測が `note` を返したとき表示。 | — | 予測レスポンスの `note` | "Not enough historical data to generate a forecast"（populated バケット7件未満。HTTP 200、エラーではない）。 |
| 30 | `tglRange` | Range Toggle | Toggle Buttons | Enum | No | デフォルト: `30d` | オプション: `7d`、`30d`、`90d`、`1y` | クエリパラメータ `range` | 変更時にトレンド + 予測を再取得。i18nキー: `admin.commission.range.*`（フォールバック: "7d"/"30d"/"90d"/"1y"）。 |

#### Section [I]: Revenue Target Progress Card (収益目標進捗カード) — タブ2

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 31 | `lblTargetProgress` | Target Progress Card | Card | — | No | 取得中はスケルトン。 | — | `GET /admin/revenue/target` | 期間トグル、目標金額、プログレスバー、編集ボタンを含む。 |
| 32 | `tglTargetPeriod` | Target Period Toggle | Toggle Buttons | Enum | No | デフォルト: `monthly` | オプション: `monthly`、`quarterly` | クエリパラメータ `period` | 変更時に目標を再取得。i18nキー: `admin.commission.period.monthly/quarterly`（フォールバック: "Monthly"/"Quarterly"）。 |
| 33 | `lblTargetAmount` | Target Amount Display | Text | String | No | 目標未設定時は非表示。 | `formatCurrency(...) Ks` | `revenue_targets.target_amount` | i18nキー: `admin.commission.target.amount`。 |
| 34 | `lblActualRevenue` | Actual Revenue Display | Text | String | No | 目標がないとき "0.00"。 | `formatCurrency(...) Ks` | 期間開始時点からの完了注文売上集計 | i18nキー: `admin.commission.target.actualRevenue`。 |
| 35 | `gaugeTargetProgress` | Gauge Bar | Div（role=`progressbar`） | Integer | No | 目標設定まで 0% 表示。 | クライアント側で0–100%にクランプ、エメラルド填充。 | バックエンドの `progressPercent`（クランプなし） | 超過値はバーをクランプしたまま >100% の数値を表示。i18nキー: `admin.commission.target.progressLabel`。 |
| 36 | `lblProgressPercentage` | Progress Percentage | Text | String | No | バー横に整数パーセント。 | 例 "64%" | バックエンド計算 | `clamped.toFixed(0)%`。 |
| 37 | `btnEditTarget` | Edit Target Button | Button (`secondary`) | — | No | テキスト: "Edit Target" / 目標がないとき "Set Target" | — | — | 編集ダイアログ（レイアウト4）を開く。i18nキー: `admin.commission.target.edit` / `admin.commission.target.set`。 |

#### Section [J]: Payout Status Panel (ペイアウトステータスパネル) — タブ2

**ペイアウト**ステータス件数（Completed / Processing / Pending）を、ペイアウトリストレスポンスの `statusCounts`（現在のページではなくフィルタリングされた全件）から表示。パネルタイトルは "Payout Status"。各統計は大きな件数の下に色付きステータスピルを描画。取得中はパルススケルトン。このパネルは `payments/status` エンドポイントのデータは使用しない。

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 38 | `pnlPayoutStatus` | Payout Status Panel | Card + Stat group | — | No | 取得中はスケルトン。 | 3列グリッド（`grid-cols-3`） | `payoutsQuery.data.statusCounts` | i18nキー: `admin.commission.payoutStatus`。 |
| 39 | `statPayoutCompleted` | Completed Stat | Stat（件数 + Badge） | Integer | — | 件数 + "Completed" ピル | `bg-green-100 text-green-800` | `statusCounts.completed` | i18nキー: `admin.commission.status.completed`。 |
| 40 | `statPayoutProcessing` | Processing Stat | Stat（件数 + Badge） | Integer | — | 件数 + "Processing" ピル | `bg-purple-100 text-purple-800` | `statusCounts.processing` | i18nキー: `admin.commission.status.processing`。 |
| 41 | `statPayoutPending` | Pending Stat | Stat（件数 + Badge） | Integer | — | 件数 + "Pending" ピル | `bg-amber-100 text-amber-800` | `statusCounts.pending` | i18nキー: `admin.commission.status.pending`。 |

#### Section [K]: Ad Payment Status Panel (広告決済ステータスパネル) — タブ2

広告料金支払いステータス（Completed / Pending / Refunded）を広告料金エンドポイントから表示。3統計を1行3列グリッドで配置。

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 42 | `pnlAdPaymentStatus` | Ad Payment Status Panel | Card + Stat group | — | No | 取得中はスケルトン。 | 3列グリッド | `GET /admin/revenue/ad-fee` → `adFeePaymentStatus` | i18nキー: `admin.commission.adPaymentStatus`。 |
| 43 | `statAdPayCompleted` | Ad Completed Stat | Stat（件数 + Badge） | Integer | — | 件数 + "Completed" ピル | `bg-green-100 text-green-800` | `adFeePaymentStatus.completed` | i18nキー: `admin.commission.status.completed`。 |
| 44 | `statAdPayPending` | Ad Pending Stat | Stat（件数 + Badge） | Integer | — | 件数 + "Pending" ピル | `bg-amber-100 text-amber-800` | `adFeePaymentStatus.pending` | i18nキー: `admin.commission.status.pending`。 |
| 45 | `statAdPayRefunded` | Ad Refunded Stat | Stat（件数 + Badge） | Integer | — | 件数 + "Refunded" ピル | `bg-gray-100 text-gray-800`（neutral） | `adFeePaymentStatus.refunded` | i18nキー: `admin.commission.status.refunded`。 |

#### Section [L]: Ad Fee Summary Card (広告料金サマリーカード) — タブ2

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 46 | `lblAdFeeSummary` | Ad Fee Summary Card | Card | — | No | 取得中はスケルトン。 | 3列グリッド | `GET /admin/revenue/ad-fee` → `adFeeKpis` | アクティブ広告、回収総額、保留中件数を表示。i18nキー: `admin.commission.adFees.title`。 |
| 47 | `lblActiveAds` | Active Ads | Text | Integer | — | 件数（通貨なし） | — | `adFeeKpis.activeAds` | i18nキー: `admin.commission.adFees.activeAds`。 |
| 48 | `lblTotalCollected` | Total Collected | Text | String | — | 例 `$0.00` | **既知の問題:** 他の場所では `Ks` であるにもかかわらず、ハードコードされた `$ プレフィックス。 | `adFeeKpis.totalAdFees` | i18nキー: `admin.commission.adFees.totalCollected`。 |
| 49 | `lblAdPending` | Pending Payments | Text | Integer | — | 件数（通貨なし） | — | `adFeeKpis.pendingPayments` | i18nキー: `admin.commission.status.pending`。 |

#### Section [M]: Payout Section (出金セクション) — タブ2

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 50 | `lblPayoutTitle` | Section Title | Text (`h3`) | String | — | "Merchant Payouts" | — | ハードコードUIテキスト | i18nキー: `admin.commission.payouts.title`。 |
| 51 | `btnExportPayout` | Export Payout Button | Button (`secondary`) | — | No | 表示。テキスト: "Export Payout" | — | — | レポートタイプ "Payout" でエクスポートモーダルを開く。出品者リスト + 日付範囲をプリフィル。i18nキー: `admin.commission.export.payout`。 |
| 52 | `selPayoutStatus` | Status Filter | Select | Enum | No | デフォルト: All | オプション: `pending`、`processing`、`completed` | クエリパラメータ `status` | i18nキー: `admin.commission.status.*`、`common.filters.all`。 |
| 53 | `selPayoutMerchant` | Merchant Filter | Select | UUID | No | デフォルト: All | オプションは `GET /admin/revenue/payouts/merchants` から | クエリパラメータ `merchantId` | i18nキー: `admin.commission.payout.merchant`。 |
| 54 | `selPayoutPeriod` | Period Filter | Select | String | No | デフォルト: All periods | オプション: サーバーの `periods`（なければ6ヶ月のフォールバック、`MMM yyyy` ラベル） | クエリパラメータ `period`（`YYYY-MM`） | i18nキー: `admin.commission.payout.allPeriods`。 |
| 55 | `txtPayoutSearch` | Search Input | Input + Icon Button | String | No | 空。 | 自由テキスト。Enter/クリックで適用 | クエリパラメータ `search` | 出品者名/メール（部分一致）または期間パターン（`YYYY`、`YYYY-MM`、月名）に一致。i18nキー: `admin.commission.payout.searchPlaceholder`。 |
| 56 | `btnPayoutReset` | Reset Filters Button | Button (`outline`) | — | No | 表示。テキスト: "Reset" | — | — | 全フィルタをリセット + ページ1。i18nキー: `admin.commission.filters.reset`。 |
| 57 | `btnDeletePayouts` | Delete Selected Button | Button（赤スタイル） | — | No | 選択なしまたは処理中は無効。アイコン + `sr-only` ラベル | — | — | 削除確認ダイアログを開く。i18nキー: `admin.commission.payout.deleteSelected`。 |
| 58 | `tblPayout` | Payout Table | Table (shadcn) | — | Mandatory | がない場合は空状態テキスト。 | スティッキーヘッダー、ホバーハイライト、`overflow-x-auto` | `GET /admin/revenue/payouts` | 列は以下。 |
| 59 | `chkPayout` | Row Checkbox | Checkbox | Boolean | — | 未チェック。 | 行ごとのチェックボックス + ページ全体を選択するヘッダーのチェックボックス | — | 削除の複数選択を駆動。 |
| 60 | `tblPayoutMerchant` | Merchant Column | Column | String | — | — | — | `merchants.shop_name`（`payouts.merchant_id` 経由） | — |
| 61 | `tblPayoutPeriod` | Period Column | Column | String | — | — | `MMM yyyy`（en-USロケール） | `payouts.period`（導出された `YYYY-MM`） | — |
| 62 | `tblPayoutTotalOrders` | Total Orders Column | Column（pill） | Integer | — | — | `completedCount + pendingCount` | ペイアウト項目の集計 | 小さな primary 色ピルで描画。 |
| 63 | `tblPayoutTotal` | Total Amount Column | Column | String | — | — | `formatCurrency(...) Ks` | `payouts.total_amount` | — |
| 64 | `tblPayoutCommission` | Commission Column | Column | String | — | — | `-formatCurrency(...) Ks`（destructive色） | `payouts.commission_amount` | — |
| 65 | `tblPayoutNet` | Net Payout Column | Column | String | — | — | `formatCurrency(...) Ks`（semibold） | `totalAmount − commissionAmount` | 広告料金は控除しない（`adFeeAmount` は常に "0.00"）。 |
| 66 | `tblPayoutStatus` | Status Column | Column（Badge） | Enum | — | — | `pending` / `processing` / `completed`（`failed` はレガシーのみ） | `payouts.status` | バッジ色は §11 のデザイントークン参照。 |
| 67 | `tblPayoutCompletedDate` | Completed Date Column | Column | String | — | 完了していないとき `—` | `MMM d, yyyy`（en-US） | `payouts.processed_at` | — |
| 68 | `btnViewPayout` | View Details Button | Button（icon、sky） | — | No | 表示。Eye アイコン + aria-label | — | — | ペイアウト詳細ダイアログを開く。保留中の場合はレビューを実行。i18nキー: `admin.commission.payout.viewDetails`。 |
| 69 | `btnProcessPayout` | Process Button | Button（icon、green） | — | No | `completed` のとき無効。Dollar アイコン + aria-label | — | — | 確認ダイアログ（レイアウト3）を開く。i18nキー: `admin.commission.payout.process`。 |
| 70 | `pgPayout` | Pagination | PaginationControls | — | No | 最初のページ。 | デフォルトページサイズ10（10/20/50/100）。 | クエリパラメータ `page`、`limit` | 共有コンポーネント。 |

#### Section [O]: Export Revenue Button (収益エクスポートボタン) — タブ2

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 71 | `btnExportRevenue` | Export Revenue Button | Button (`secondary`) | — | No | 表示、収益タブの右上。テキスト: "Export Revenue" | — | — | レポートタイプ "Revenue" でエクスポートモーダルを開く。i18nキー: `admin.commission.export.revenue`。 |

---

### 4.2 Layout 2: Edit Rate Dialog

#### Section [A]: Dialog Container + Title

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 72 | `dlgEditRate` | Edit Rate Dialog | Dialog (Modal) | — | — | デフォルトでは閉じる。 | — | — | `btnEditRate` でオープン。`sm:max-w-sm`。 |
| 73 | `lblRateTitle` | Dialog Title | Static Label | String | — | テキスト: "Edit Commission Rate" | — | ハードコードUIテキスト | i18nキー: `admin.commission.rate.dialogTitle`。 |

#### Section [B]: Rate Input

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 74 | `txtRateInput` | Rate Input | Input (`number`) | String | Mandatory | 現在の手数料率をプリフィル（フォールバック "10.00"）。 | `min=0`、`max=100`、`step=0.1`、サフィックス "%"。Save を有効にするには下書きが解析可能で > 0 である必要がある。 | `commission_settings.commission_rate` | 文字列として送信（`String(rate)`）。i18nキー: `admin.commission.rate.inputLabel`。 |

#### Section [C]: Inline Field Error

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 75 | `errRateInput` | Inline Field Error | Text (conditional) | String | Conditional | 非表示。下書きがNaNまたは ≤ 0 のとき表示。 | — | — | 手動バリデーションメッセージ: "Commission rate must be between 0 and 100"。i18nキー: `admin.commission.rate.validation`。バックエンドが ≤ 100 を強制（違反時400）。 |

#### Section [D]: Cancel Button

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 76 | `btnRateCancel` | Cancel Button | Button (`outline`) | — | No | 表示。テキスト: "Cancel" | — | — | 保存せずダイアログを閉じる。下書きをリセット。i18nキー: `common.cancel`。 |

#### Section [E]: Save Button

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 77 | `btnRateSave` | Save Button | Button (`primary`) | — | Mandatory | 下書きが有効になるまで無効。テキスト: "Save" | — | — | `PATCH /admin/commission` を送信。成功 → トースト、失敗 → 破壊的トースト。i18nキー: `common.save`。 |

---

### 4.3 Layout 3: Payout Confirmation Dialog

#### Section [A]: Dialog Container + Title

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 78 | `dlgPayoutConfirm` | Confirmation Dialog | Dialog (Modal) | — | — | デフォルトでは閉じる。 | — | — | `btnProcessPayout` でオープン。`sm:max-w-md`。 |
| 79 | `lblPayoutConfirmTitle` | Confirmation Title | Static Label | String | — | テキスト: "Process payout for {merchant}?" | — | 行データ | i18nキー: `admin.commission.payout.confirmTitle`。 |
| 80 | `lblPayoutConfirmDesc` | Confirmation Description | Static Label | String | — | 純額 = total − commission、広告料金は除外すること言及。 | — | — | i18nキー: `admin.commission.payout.confirmDescription`。 |

#### Section [B]: Amount Summary

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 81 | `txtPayoutTotal` | Total Amount | Static Label | String | — | `formatCurrency(...) Ks` | — | `payouts.total_amount` | i18nキー: `admin.commission.payout.totalAmount`。 |
| 82 | `txtPayoutCommission` | Commission Fee | Static Label | String | — | `-formatCurrency(...) Ks` | — | `payouts.commission_amount` | i18nキー: `admin.commission.payout.commissionFee`。 |
| 83 | `txtPayoutNet` | Net Payout | Static Label | String | — | `formatCurrency(...) Ks`（bold） | — | `totalAmount − commissionAmount` | i18nキー: `admin.commission.payout.netPayout`。 |
| 84 | `lblPayoutBreakdown` | Breakdown Rows | Static Labels | String | No | 基になる注文が1件超の場合のみ表示。 | 完了（緑）/ 保留中（アンバー）の行に件数 + 金額。 | `completedCount/Total/Commission`、`pendingCount/Total/Commission` | i18nキー: `admin.commission.payout.breakdown`、`payout.completedOrders_one/_other`、`payout.pendingOrders_one/_other`。 |

#### Section [C]: Cancel Button

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 85 | `btnPayoutCancel` | Cancel Button | Button (`outline`) | — | No | 表示。テキスト: "Cancel" | — | — | ダイアログを閉じる。**ペイアウトが保留中のとき `POST /admin/revenue/payouts/:id/review` を実行**（pending → processing）。i18nキー: `common.cancel`。 |

#### Section [D]: Confirm Button

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 86 | `btnPayoutConfirm` | Confirm Button | Button (`primary`) | — | Mandatory | 処理中は無効。テキスト: "Confirm" / "Processing..." | — | — | すべての基になるペイアウトIDを `Promise.allSettled` で処理。i18nキー: `common.confirm`、`admin.commission.payout.processing`。 |

---

### 4.4 Layout 4: Edit Target Dialog

#### Section [A]: Dialog Container + Title

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 87 | `dlgEditTarget` | Edit Target Dialog | Dialog (Modal) | — | — | デフォルトでは閉じる。 | — | — | `btnEditTarget` でオープン。`sm:max-w-md`。 |
| 88 | `lblTargetTitle` | Dialog Title | Static Label | String | — | "Edit Revenue Target" / "Set Revenue Target" | — | — | i18nキー: `admin.commission.target.editTitle` / `admin.commission.target.setTitle`。 |

#### Section [B]: Target Amount Input

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 89 | `txtTargetAmount` | Target Amount Input | Input (`number`) | String | Mandatory | 現在の目標金額をプリフィル（ある場合）。 | `min=0`、`step=0.01`、プレースホルダー "0.00"。手動バリデーション: `/^\d+(\.\d{1,2})?$/` かつ値 > 0。 | `revenue_targets.target_amount` | i18nキー: `admin.commission.target.amount`、`admin.commission.target.amountPlaceholder`。 |

#### Section [C]: Inline Field Error

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 90 | `errTargetAmount` | Inline Field Error | Text (conditional) | String | Conditional | 非表示。バリデーション失敗時に表示。 | — | — | "Target amount must be a positive number with up to 2 decimal places."。i18nキー: `admin.commission.target.validation`。 |

#### Section [D]: Target Period Toggle

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 91 | `tglTargetPeriod` | Target Period Toggle | Toggle Buttons | Enum | Mandatory | デフォルト: 現在のカードの期間または `monthly` | オプション: `monthly`、`quarterly` | `revenue_targets.period` | 親に通知すると期間が切り替わり目標を再取得。i18nキー: `admin.commission.period.monthly/quarterly`。 |

#### Section [E]: Cancel Button

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 92 | `btnTargetCancel` | Cancel Target Button | Button (`outline`) | — | No | 表示。保存中は無効。テキスト: "Cancel" | — | — | i18nキー: `common.cancel`。 |

#### Section [F]: Save Button

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 93 | `btnTargetSave` | Save Target Button | Button (`primary`) | — | Mandatory | 保存中は無効。テキスト: "Save Target" / "Saving..." | — | — | `PUT /admin/revenue/targets` を送信。i18nキー: `admin.commission.target.save`、`admin.commission.target.saving`。 |

---

### 4.5 Layout 5: Export Modal

#### Section [A]: Modal Container + Title

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 94 | `dlgExport` | Export Modal | Dialog (Modal) | — | — | デフォルトでは閉じる。 | — | — | 3つのエクスポートボタンでオープン。レポートタイプごとにキーリマウント。`sm:max-w-md`。 |
| 95 | `lblExportTitle` | Modal Title | Heading | String | — | テキスト: "Export Report" | — | ハードコードUIテキスト | i18nキー: `admin.commission.export.title`。 |
| 96 | `lblExportDesc` | Modal Description | Text | String | — | レポートタイプに言及。 | — | — | i18nキー: `admin.commission.export.description`。 |

#### Section [C]: Report Type Display

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 97 | `lblExportReportType` | Report Type Display | Text | String | Mandatory | オープナーに応じた "Commission" / "Revenue" / "Payout" | — | トリガーボタンから設定 | 読み取り専用。i18nキー: `admin.commission.reportTypes.*`（フォールバック: 生のタイプ値）。 |
| 98 | `lblExportGroupBy` | Group By Display | Text | String | No | Commission のみ。現在のグループ化（merchant/day/order） | — | `initialValues.groupBy` | 読み取り専用。i18nキー: `admin.commission.groupBy.*`。 |
| 99 | `selExportMerchant` | Merchant Select | Select | UUID | No | Payout のみ、出品者リストが存在する場合。デフォルト: All Merchants | オプションは `GET /admin/revenue/payouts/merchants` から | `initialValues`/ペイアウトフィルタ | i18nキー: `admin.commission.export.allMerchants`、`admin.commission.payout.merchant`。 |

#### Section [F]: Date Inputs

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 100 | `txtExportStart` | Start Date Input | Input (`date`) | DATE | Mandatory | 該当する場合、レポートフィルタ（commission）または期間範囲（payout）からプリフィル。 | `dateFrom <= dateTo`、範囲 ≤ 365日 | — | i18nキー: `admin.commission.export.startDate`。 |
| 101 | `txtExportEnd` | End Date Input | Input (`date`) | DATE | Mandatory | 同じプリフィル動作。 | 同上 | — | i18nキー: `admin.commission.export.endDate`。 |

#### Section [G]: Format Toggle

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 102 | `tglExportFormat` | Format Toggle | Toggle Buttons（`aria-pressed`） | Enum | Mandatory | デフォルト: `csv` | オプション: `csv`（CSV）、`xlsx`（Excel） | — | PDFなし。ラベルはハードコード。 |

#### Section [H]: Inline Error

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 103 | `errExport` | Export Validation Error | Text (conditional) | String | Conditional | 非表示。バリデーション失敗時に表示。 | — | — | メッセージ: 必須 / 順序 / 365日上限（§6.1.1参照）。 |

#### Section [I]: Generate Button

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 104 | `btnExportGenerate` | Generate Button | Button (`primary`) | — | Mandatory | 生成中は無効。テキスト: "Generate" / "Generating..." | — | — | 検証後、ファイルをダウンロード（blob → サニタイズされたファイル名）。i18nキー: `admin.commission.export.generate`、`admin.commission.export.generating`。 |

#### Section [J]: Cancel Button

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 105 | `btnExportCancel` | Cancel Button | Button (`outline`) | — | No | 生成中は無効。テキスト: "Cancel" | — | — | i18nキー: `common.cancel`。 |

---

## 5. Item Behaviors & Event Specifications (各項目における挙動・イベント仕様)

### 5.1 Commission Tab Load (page mount)
- **Trigger:** `/admin/commission-revenue` ルートのマウント。
- **RBAC Validation:** ルート保護が `admin`/`super_admin` ロールを検証。非管理者はリダイレクト（403 `RES_004`）。
- **Processing Logic:**
  1. 手数料設定とレポート行を並行して取得（`GET /api/v1/admin/commission`、`GET /api/v1/admin/commission/reports`）。
  2. 手数料カード（`txtCurrentRate`）とレポートテーブル（`tblReport`）を描画。
  3. 失敗時、クエリはエラーを公開。ミューテーションはトーストを表示。
- **Exception Handling:**
  - `403 RES_004`: ロール検証失敗。`/unauthorized` へリダイレクト。
  - `500 SYS_001`: サーバーエラー。トースト。

### 5.2 Commission Rate Edit (`btnEditRate` onClick → `btnRateSave` onClick)
- **Trigger:** 手数料カードの "Edit Rate" をクリックし、ダイアログの "Save" をクリック。
- **Processing Logic:**
  1. 編集ダイアログ（`dlgEditRate`）を開き、現在の手数料率で `txtRateInput` をプリフィル。
  2. **Client-Side Pre-Check:** 下書きは数値として解析可能で > 0（バックエンドが ≤ 100 を強制）。
  3. **Backend Dispatch:** `PATCH /api/v1/admin/commission` に `{ rate: "10.5" }`（精度を保持する文字列）。
  4. **Post-Execution UI:** 成功時、ダイアログを閉じ、settings + reports クエリを無効化し、成功トースト（"Commission rate updated"）を表示。`COMMISSION_RATE_UPDATED` を記録。
- **Exception Handling:**
  - `400 VAL_001`: DTOバリデーション失敗。破壊的トースト。
  - `400` サービスメッセージ: 手数料率 ≤ 0 または > 100。サーバーメッセージ付きの破壊的トースト。

### 5.3 Report Filter (`btnApplyFilter` onClick)
- **Trigger:** レポートフィルタパネルの "Apply" をクリック。
- **Processing Logic:**
  1. **Client-Side Pre-Check:** 両方の日付が設定されている場合、`from <= to`。
  2. **Backend Dispatch:** `GET /api/v1/admin/commission/reports` に `from`、`to`、`page`、`limit`、`groupBy`。
  3. **Post-Execution UI:** フィルタ済み行を表示しページを1にリセット。groupBy ボタンは即座に適用。
- **Exception Handling:**
  - `400`: フィルタパネルにインラインエラー。
  - `500`（`SYS_001`）: トースト。

### 5.4 Report Filter Reset (`btnResetFilter` onClick)
- **Trigger:** "Reset" をクリック。
- **Processing Logic:**
  1. `txtFromDate` と `txtToDate` をクリア。groupBy を `merchant` にリセット。
  2. デフォルトクエリ（日付範囲なし）でレポートを再取得。
  3. ページを1にリセット。
- **Exception Handling:** 該当なし。

### 5.5 Revenue Tab Load (Tab 2 selected)
- **Trigger:** Revenue タブのマウント（非アクティブなタブの内容はアンマウント）。
- **Processing Logic:**
  1. KPI、トレンド、目標、予測、支払いステータス、ペイアウト、広告料金のデータを並列で取得（`GET /api/v1/admin/revenue/kpis`、`/trends`、`/target`、`/forecast`、`/payments/status`、`/payouts`、`/ad-fee`）。
  2. KPIカード（6）、トレンドチャート、目標ゲージバー、ペイアウトステータスパネル、広告支払いステータスパネル、広告料金サマリーカード、ペイアウトテーブルを設定。
  3. 失敗時、既知のデータを保持。ミューテーションはトーストを表示。
- **Exception Handling:**
  - `403 RES_004`: ロール検証失敗。`/unauthorized` へリダイレクト。
  - `500 SYS_001`: サーバーエラー。トースト。

### 5.6 Ad Fee Revenue Load (Revenue tab mount)
- **Trigger:** Revenue タブ選択時。
- **Processing Logic:**
  1. 広告料金KPIデータ、広告料金トレンド系列（共有期間）、広告料金支払いステータス内訳を取得（`GET /api/v1/admin/revenue/ad-fee`）。
  2. 広告料金KPIカード（`lblAdFeeRevenue`）、合計収入カード（`lblTotalIncome`）、チャート上の広告料金トレンド系列、広告支払いステータスパネル、広告料金サマリーカードを設定。
  3. 失敗時、広告料金カードを0で描画。エラー時にトースト。

### 5.7 Trend Range Change (`tglRange` onChange)
- **Trigger:** 期間トグルで `7d` / `30d` / `90d` / `1y` を選択。
- **Processing Logic:**
  1. 選択した期間のトレンド系列を取得（`GET /api/v1/admin/revenue/trends?range=`）。
  2. 選択した期間の予測系列を取得（`GET /api/v1/admin/revenue/forecast?range=`）。
  3. **Post-Execution UI:** チャート、予測の点線、軸ラベルを更新。
  4. 失敗時、前のチャート状態を維持しエラートーストを表示。

### 5.8 Payout Processing (`btnProcessPayout` onClick → `btnPayoutConfirm` onClick)
- **Trigger:** 完了していないペイアウトの "Process" をクリックし、ダイアログの "Confirm" をクリック。
- **Processing Logic:**
  1. 確認ダイアログ（`dlgPayoutConfirm`）を開き、出品者、金額、内訳を表示。
  2. **Client-Side Pre-Check:** 行が `completed` でない（それ以外はボタン無効）。
  3. **Backend Dispatch:** すべての基になるペイアウトIDについて `POST /api/v1/admin/revenue/payouts/:id/process`（`Promise.allSettled`）。
  4. **Post-Execution UI:** 成功時、ダイアログを閉じ、ペイアウト + KPIs を無効化し、成功トースト（一括処理時の部分失敗/全失敗バリアント付き）を表示。ペイアウトごとに `PAYOUT_PROCESSED` を記録。
- **Exception Handling:**
  - `404 RES_001`: トースト + 一覧更新。
  - `409 RES_003`: 破壊的トースト "Payout already processed"。
  - `500 SYS_001`: トースト。

### 5.9 Payout Review (View details / dialog cancel)
- **Trigger:** **保留中**のペイアウトの詳細表示を開く、または処理ダイアログをキャンセル。
- **Processing Logic:** `POST /api/v1/admin/revenue/payouts/:id/review` → ステータスが `processing` に。ペイアウトクエリを無効化。すでに `processing`/`completed` の場合、API は HTTP 200 で変更なしのステータスを返す（エラーなし、監査なし）。

### 5.10 Payout Deletion (`btnDeletePayouts` onClick → confirm)
- **Trigger:** ペイアウト行のチェックボックスを選択し、赤い "Delete selected" をクリックし、ダイアログで確認。
- **Processing Logic:**
  1. 確認ダイアログは完了済みかつ3ヶ月以上経過したペイアウトのみ削除可能であることを説明。
  2. **Backend Dispatch:** `DELETE /api/v1/admin/revenue/payouts` に基になる `payoutIds` の和集合。
  3. **Post-Execution UI:** 成功 → トースト "Payouts deleted"、選択をクリア。ペイアウトごとに `PAYOUT_DELETED` 監査。失敗 → サーバーメッセージを表示する AlertDialog。
- **Exception Handling:**
  - `404 RES_001`（`Payout not found: <ids>`）: AlertDialog。
  - `409 RES_003`（`These payouts cannot be deleted: ...`）: タイトル "Payout cannot be deleted" の AlertDialog。

### 5.11 Revenue Target Load (Revenue tab mount / `tglTargetPeriod` onChange)
- **Trigger:** Revenue タブ選択時、または期間トグル変更時。
- **Processing Logic:**
  1. アクティブな収益目標と当期の実績収益を取得（`GET /api/v1/admin/revenue/target?period=`）。
  2. 進捗率 = （実績収益 / 目標金額）× 100（バックエンドはクランプなしで返却）。
  3. `lblTargetAmount`、`lblActualRevenue`、`gaugeTargetProgress`、`lblProgressPercentage` を描画。ゲージは0–100%にクランプ。
  4. 失敗時、ゲージを0%で描画。

### 5.12 Revenue Target Save (`btnEditTarget` onClick → `btnTargetSave` onClick)
- **Trigger:** 目標カードの "Edit Target"/"Set Target" をクリックし、ダイアログの "Save" をクリック。
- **Processing Logic:**
  1. 編集ダイアログ（`dlgEditTarget`）を開き、現在の値で `txtTargetAmount` と期間トグルをプリフィル（ある場合）。
  2. **Client-Side Pre-Check:** 金額は `/^\d+(\.\d{1,2})?$/` に一致し > 0。
  3. **Backend Dispatch:** `PUT /api/v1/admin/revenue/targets` に `{ targetAmount, targetPeriod }`（同じ期間のアクティブ目標を上書き）。
  4. **Post-Execution UI:** 成功時、ダイアログを閉じ、target + KPIs を無効化し、成功トーストを表示。`TARGET_UPDATED` を記録。
- **Exception Handling:**
  - `400`（金額 ≤ 0）: ダイアログにインラインエラー。
  - `500 SYS_001`: トースト。

### 5.13 Revenue Forecast Load (Revenue tab mount / `tglRange` onChange)
- **Trigger:** Revenue タブ選択時、または期間変更時。
- **Processing Logic:**
  1. 選択した期間の予測系列を取得（`GET /api/v1/admin/revenue/forecast`）。
  2. populated バケットが7件以上の場合、トレンド線に続く点線として `serForecast` を描画し "AI Forecast" 凡例を表示。
  3. 7件未満の場合、API は HTTP 200 で `{ forecastPoints: [], note }` を返す。点線は非表示にし、チャート下部にノートを描画。
- **Exception Handling:**
  - `500 SYS_001`: トースト。

### 5.14 Export Button Click — Open Export Modal (`btnExportCommission` / `btnExportRevenue` / `btnExportPayout` onClick)
- **Trigger:** いずれかのエクスポートボタンをクリック。
- **Processing Logic:**
  1. エクスポートモーダル（`dlgExport`）を開く。
  2. オープナーに応じて `lblExportReportType` を設定: "Commission"（日付 + groupBy をレポートフィルタからプリフィル）、"Revenue"、"Payout"（出品者リスト + 利用可能な期間から導出した日付範囲をプリフィル）。
  3. モーダルはレポートタイプごとにキーリマウント。

### 5.15 Export Generation (`btnExportGenerate` onClick)
- **Trigger:** 日付と形式を選択したままエクスポートモーダルの "Generate" をクリック。
- **Processing Logic:**
  1. **Client-Side Pre-Check:** 両方の日付必須、`dateFrom <= dateTo`、範囲 ≤ 365日。
  2. **Backend Dispatch:** `POST /api/v1/admin/commission/export`、`POST /api/v1/admin/revenue/export`、`POST /api/v1/admin/revenue/payouts/export` のいずれかに `{ dateFrom, dateTo, format, groupBy?, merchantId? }`。
  3. レスポンスは blob。ファイル名は `Content-Disposition` から取得（同じ形式でローカル構築のフォールバックあり）、ダウンロード前にサニタイズ。
  4. `EXPORT_GENERATED` イベントを audit_logs に記録（BR-EXP-003）。
- **Post-Execution UI:** 成功時、モーダルを閉じ成功トースト（"Export generated"）を表示。
- **Exception Handling:**
  - `400`: ダイアログにインラインエラーテキスト（必須 / 順序 / 365日上限）。
  - `500 SYS_001`: 破壊的トースト "Export failed"。

### 5.16 Export Close
- **Trigger:** キャンセルボタン、バックドロップ、またはダウンロード成功後にモーダルを閉じる。
- **Processing Logic:** ダイアログを閉じる。次回オープン時に状態はリセット（キーリマウント）。

### 5.17 Language & Theme Toggles
- **Note:** これらのコントロールは**管理レイアウトのヘッダー/サイドバー**に存在し、このページにはない。EN → JA → MY（`localStorage` に永続化）および light → dark → system を循環し、`admin.commission.*` キーを含む全ての翻訳ラベルを再描画する。

---

## 6. Validation & Error Message Mapping (バリデーション及びエラーメッセージマッピング)

**Note:** 全ての Commission / Revenue エンドポイントは **管理者のみ**。非管理者には `403 Forbidden`（`errorCode: RES_004`）を返す。バックエンドは `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('admin')` で強制。フロントエンドのルート保護は `roles={['admin', 'super_admin']}`。

### 6.1 Field Validation (frontend、手動)

| Target Field | Condition / Evaluation Logic | UI/UX Display | Message Text (EN) | Message Text (JA) |
| :--- | :--- | :--- | :--- | :--- |
| `txtRateInput` | 下書きがNaNまたは ≤ 0 | フィールド下にインラインテキスト、Save無効 | "Commission rate must be between 0 and 100" | "手数料率は0から100の間である必要があります" |
| `txtFromDate` / `txtToDate` | 両方が設定され `from > to` | パネル下にインラインテキスト | "From date must be earlier than or equal to To date." | "開始日は終了日以前である必要があります。" |
| `txtTargetAmount` | 空、`/^\d+(\.\d{1,2})?$/` に不一致、または ≤ 0 | フィールド下にインラインテキスト、Saveブロック | "Target amount must be a positive number with up to 2 decimal places." | "目標金額は小数第2位までの正の数値である必要があります。" |
| `txtExportStart` / `txtExportEnd` | いずれか空 | ダイアログにインラインエラー | "Please select a start and end date." | "開始日と終了日を選択してください。" |
| `txtExportStart` / `txtExportEnd` | `dateFrom > dateTo` | ダイアログにインラインエラー | "End date must be after start date." | "終了日は開始日以降である必要があります。" |
| `txtExportStart` / `txtExportEnd` | 範囲 > 365日 | ダイアログにインラインエラー | "Date range cannot exceed 365 days." | "日付範囲は365日を超えることはできません。" |

### 6.1.1 Export Validation Messages

| Target Field | Condition | Message Text (EN) | Message Text (JA) |
| :--- | :--- | :--- | :--- |
| `txtExportStart` / `txtExportEnd` | `dateFrom` または `dateTo` が空 | "Please select a start and end date." | "開始日と終了日を選択してください。" |
| `txtExportStart` / `txtExportEnd` | `dateTo` が `dateFrom` より前 | "End date must be after start date." | "終了日は開始日以降である必要があります。" |
| `txtExportStart` / `txtExportEnd` | 日付範囲が365日を超える | "Date range cannot exceed 365 days." | "日付範囲は365日を超えることはできません。" |
| `tglExportFormat` | `csv`/`xlsx` 以外（DTO） | "Invalid export format. Use CSV or Excel." | "無効なエクスポート形式です。CSVまたはExcelを使用してください。" |

### 6.2 API Error Handling (global envelope)

全てのエラーはグローバルな `AllExceptionsFilter` から `{statusCode, error, errorCode, message (string|string[]), timestamp, path, details?}` を返す。

| Error Code | Target | Condition | UI/UX Display | Message Text (EN) | Message Text (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `VAL_001` | form fields | DTOバリデーション失敗（400） | 該当箇所にインライン、それ以外はトースト | サーバーメッセージ | サーバーからのメッセージ |
| `AUTH_001` | — | トークン欠落/無効（401） | ログインへリダイレクト | "Unauthorized" | "認証が必要です" |
| `RES_004` | — | 管理者以外のロール（403） | `/unauthorized` へリダイレクト | "Forbidden" | "アクセス権限がありません" |
| `RES_001` | payout actions | ペイアウト未検出（404） | エラートースト + 一覧更新 | "Payout not found" | "出金が見つかりません" |
| `RES_003` | payout process | 処理済み（409） | 破壊的トースト | "Payout has already been processed" | "この出金は既に処理されています" |
| `RES_003` | payout delete | 削除不可（409） | サーバーメッセージ付き AlertDialog | "Payout cannot be deleted" | "出金を削除できません" |
| `RATE_001` | — | レート制限（429。グローバルリミッターは実質rejectしない） | トースト | "Too many requests" | "リクエストが多すぎます" |
| `SYS_001` | — | サーバーエラー（500） | 破壊的トースト | "Something went wrong. Please try again" | "問題が発生しました。もう一度お試しください" |
| `NET_ERR` | — | ネットワーク障害 | エラートースト | "Network error. Please check your connection" | "ネットワークエラー。接続を確認してください" |

---

## 7. Database Fields Mapping (データベースフィールドマッピング)

### 7.1 Commission Rate → Database

| Form Field | API Field | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- | :--- |
| `txtRateInput` | `rate` | `commission_rate` | `commission_settings` | Decimal(5,2)（デフォルト 12.00） |
| — （履歴） | — | `commission_rate`、`effective_from`、`created_by` | `commission_rate_history` | Decimal(5,2)、TIMESTAMPTZ、UUID FK |

### 7.2 Commission Report → Database

| Table Column | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- |
| Merchant | `merchant_id` | `orders` → `merchants` | UUID FK |
| Revenue | `total_amount` | `orders` where `payment_status = 'completed'` | Decimal(12,2) |
| Commission | Application-level aggregation | — | 完了注文総額 × 注文作成時点の有効レート（rate-history 参照）。永続化された注文ごとのコミッション金額は存在しない。 |

### 7.3 Revenue Dashboard → Database

| KPI | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- |
| Total Revenue | `total_amount` | `orders` where `payment_status = 'completed'` | Decimal(12,2) |
| Total Commission | Application-level aggregation | — | 完了注文総額 × 注文作成時点のコミッション率 |
| Avg Order Value | `total_amount` | `orders` where `payment_status = 'completed'` | Decimal(12,2) |
| Net Revenue | Calculated | — | `totalRevenue − totalCommission`（返金は控除しない） |
| Ad Fee Revenue | `amount` | `ad_payments`（with `payment_status = 'completed'`） | Decimal(10,2) |
| Total Income | Calculated | — | `total commission + ad fee revenue` |

### 7.4 Payout → Database

| Form Field | API Field | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- | :--- |
| Payout Merchant | `merchantId` | `merchant_id` | `payouts` | UUID FK（references `merchants.id`） |
| Total Amount | `totalAmount` | `total_amount` | `payouts` | Decimal(12,2) |
| Commission Amount | `commissionAmount` | `commission_amount` | `payouts` | Decimal(12,2) |
| Net Payout | `netAmount` | `net_payout`（列は存在する。レスポンスは live 計算） | `payouts` | `total_amount − commission_amount` |
| Ad Fee Amount | `adFeeAmount` | — （列なし。常に `"0.00"`） | — | Constant |
| Payout Status | `status` | `status` | `payouts` | VARCHAR(20)（`'pending'`、`'processing'`、`'completed'`） |
| Idempotency Key | `idempotencyKey` | `idempotency_key` | `payouts` | VARCHAR(255)（unique。`payout-<id>`） |
| Processed By | `processedBy` | `processed_by` | `payouts` | UUID FK（references `users.id`、nullable） |
| Processed At | `processedAt` | `processed_at` | `payouts` | TIMESTAMPTZ（nullable） |
| Completed Date | — | `period_start`、`period_end` | `payouts` | TIMESTAMP(3)。`period` は `YYYY-MM` として導出 |

### 7.5 Revenue Target → Database

| Form Field | API Field | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- | :--- |
| `txtTargetAmount` | `targetAmount` | `target_amount` | `revenue_targets` | Decimal(12,2) |
| `tglTargetPeriod` | `targetPeriod` | `period` | `revenue_targets` | VARCHAR(20)（`'monthly'`、`'quarterly'`）。期間ごとにアクティブ1件 |

### 7.6 Ad Fee Revenue → Database

| KPI | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- |
| Total Ad Fees | `amount` | `ad_payments`（with `payment_status = 'completed'`） | Decimal(10,2) |
| Active Ads | COUNT | `advertisements`（active + approved + 未期限切れ） | Integer |
| Pending Payments | COUNT | `ad_payments`（with `payment_status = 'pending'`） | Integer |
| Completed Payments | COUNT | `ad_payments`（with `payment_status = 'completed'`） | Integer |

### 7.7 Export → Audit Logs

エクスポートイベントは `audit_logs` に `action = 'EXPORT_GENERATED'` で保存。ペイロード（`reportType`、`format`、`dateFrom`、`dateTo`、`rowCount`）は `newValue` JSON カラムに格納される。専用カラム（`report_type`/`format`/`date_from`/`date_to`）は存在しない。保持期間：1年。

---

## 8. API Response Mapping (APIレスポンスマッピング)

### 8.1 Commission Rate Fetch Success Response

```json
{
  "data": {
    "rate": "12"
  }
}
```

### 8.2 Commission Rate Update Success Response

```json
{
  "data": {
    "rate": "10.5"
  }
}
```

### 8.3 Commission Rate Update Error Response

```json
{
  "statusCode": 400,
  "error": "BAD_REQUEST",
  "errorCode": "VAL_001",
  "message": ["commissionRate must be a number with up to 2 decimal places"],
  "timestamp": "2026-08-10T12:00:00.000Z",
  "path": "/api/v1/admin/commission",
  "details": { "validationErrors": [] }
}
```

### 8.4 Revenue Dashboard Success Response

```json
{
  "data": {
    "kpis": {
      "totalRevenue": "125000",
      "totalCommission": "12500",
      "avgOrderValue": "8200",
      "netRevenue": "112500",
      "adFeeRevenue": "35000",
      "totalIncome": "47500"
    },
    "trendPoints": [
      { "date": "2026-08-09", "revenue": "4200", "commission": "420", "adFee": "1200", "totalIncome": "1620" }
    ],
    "statusCounts": {
      "completed": 12,
      "processing": 3,
      "pending": 8
    }
  }
}
```

### 8.5 Payout Process Success Response

```json
{
  "data": {
    "payoutId": "clx1234567890",
    "merchantId": "clx0987654321",
    "totalAmount": "8000",
    "commissionAmount": "800",
    "adFeeAmount": "0.00",
    "netAmount": "7200",
    "status": "completed",
    "processedAt": "2026-08-10T12:00:00.000Z",
    "idempotencyKey": "payout-clx1234567890"
  }
}
```

### 8.6 Payout Process Error Response (Idempotency Conflict)

```json
{
  "statusCode": 409,
  "error": "CONFLICT",
  "errorCode": "RES_003",
  "message": "Payout has already been processed",
  "timestamp": "2026-08-10T12:00:00.000Z",
  "path": "/api/v1/admin/revenue/payouts/clx1234567890/process"
}
```

### 8.7 Revenue Target Fetch Success Response

```json
{
  "data": {
    "target": {
      "targetAmount": "100000",
      "period": "monthly",
      "actualRevenue": "64350",
      "progressPercent": "64.35"
    }
  }
}
```

### 8.8 Revenue Target Fetch — No Target

```json
{
  "data": {
    "target": null
  }
}
```

### 8.9 Revenue Target Save Success Response

```json
{
  "data": {
    "targetAmount": "150000",
    "targetPeriod": "monthly",
    "actualRevenue": "64350",
    "progressPercent": "42.9"
  }
}
```

### 8.10 Revenue Forecast Success Response

```json
{
  "data": {
    "forecastPoints": [
      { "date": "2026-08-10", "forecastRevenue": "4400", "forecastCommission": "440", "forecastAdFee": "1300" }
    ]
  }
}
```

### 8.11 Revenue Forecast Empty Response (Insufficient Data)

```json
{
  "data": {
    "forecastPoints": [],
    "note": "Not enough historical data to generate a forecast"
  }
}
```

### 8.12 Revenue Target Save Error Response

```json
{
  "statusCode": 400,
  "error": "BAD_REQUEST",
  "errorCode": "VAL_001",
  "message": "Target amount must be greater than 0",
  "timestamp": "2026-08-11T12:00:00.000Z",
  "path": "/api/v1/admin/revenue/targets"
}
```

### 8.13 Admin Authorization Error Response (All Endpoints)

```json
{
  "statusCode": 403,
  "error": "FORBIDDEN",
  "errorCode": "RES_004",
  "message": "Forbidden",
  "timestamp": "2026-08-10T12:00:00.000Z",
  "path": "/api/v1/admin/commission"
}
```

**Note:** 全ての Commission / Revenue エンドポイントは管理者のみ。バックエンドは `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('admin')` で強制。フロントエンドのルートは `admin` と `super_admin` を許可。非管理者（buyer、merchant）はこのエラーを受け取る。

### 8.14 Export — Success Response

```json
{
  "statusCode": 200,
  "headers": {
    "Content-Type": "text/csv | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": "attachment; filename=\"commission report(by merchant) report 20260801-20260831(20260831).csv\""
  }
}
```

> ペイアウトエクスポートのファイル名に形式サフィックスはない: `payout report(for all)20260801-20260831(20260831)`。CSVはUTF-8 BOM付きで書き込まれる。XLSXは `Report` という単一シート。10,000行を超えるレスポンスは警告行を追加して切り詰められる。

### 8.15 Ad Fee Revenue Success Response

```json
{
  "data": {
    "adFeeKpis": {
      "totalAdFees": "35000",
      "activeAds": 12,
      "pendingPayments": 3,
      "completedPayments": 45
    },
    "adFeeTrendPoints": [
      { "date": "2026-08-09", "adFee": "1200" }
    ],
    "adFeePaymentStatus": {
      "completed": 45,
      "pending": 3,
      "refunded": 1
    }
  }
}
```

### 8.16 Ad Fee Revenue Empty Response

```json
{
  "data": {
    "adFeeKpis": {
      "totalAdFees": "0",
      "activeAds": 0,
      "pendingPayments": 0,
      "completedPayments": 0
    },
    "adFeeTrendPoints": [],
    "adFeePaymentStatus": {
      "completed": 0,
      "pending": 0,
      "refunded": 0
    }
  }
}
```

---

## 9. i18n Keys Reference (i18nキーリファレンス)

全てのキーは `frontend/public/locales/{en,ja,my}/translation.json` の `admin.commission` 名前空間に存在（139キー、ロケール間で同期）。コンポーネントは `t(key, 'Fallback')` を呼ぶ。キーが存在しない場合、i18next はインラインのフォールバックを返す（フォールバック指定がない場合は生のキー）。

### 9.1 実際に使用される主なキー（EN値）

| Key | Value |
| :--- | :--- |
| `admin.commission.title` | "Commission & Revenue" |
| `admin.commission.tabs.commission` / `.revenue` | "Commission" / "Revenue" |
| `admin.commission.rate.title` / `.edit` / `.validation` | "Commission Rate" / "Edit Rate" / "Commission rate must be between 0 and 100" |
| `admin.commission.groupBy.byMerchant` / `.byDay` / `.byOrder` | "By Merchant" / "By Day" / "By Order" |
| `admin.commission.filters.apply` / `.reset` / `.invalidDateRange` | "Apply" / "Reset" / 範囲エラーテキスト |
| `admin.commission.table.*` | レポート/ペイアウトテーブルのヘッダー（merchant、orders、revenue、commission、status、date、action…） |
| `admin.commission.kpi.*` | KPIカードラベル（totalRevenue、totalCommission、adFeeRevenue、totalIncome、avgOrderValue、netRevenue） |
| `admin.commission.trend.*` | チャートタイトル、凡例（revenue、commission、adFee、aiForecast）、空状態、説明 |
| `admin.commission.range.*` | 期間トグルラベル（7d/30d/90d/1y）— **不存在。コードのフォールバック使用** |
| `admin.commission.target.*` | 目標カードラベル + バリデーション |
| `admin.commission.payout.*` | ペイアウトテーブル/ダイアログ/フィルトラベル |
| `admin.commission.payoutStatus` | "Payout Status" |
| `admin.commission.status.*` | ステータスピルラベル（pending/processing/completed/failed/refunded） |
| `admin.commission.adPaymentStatus` / `adFees.*` | 広告パネルラベル |
| `admin.commission.export.*` | エクスポートダイアログラベル + バリデーションメッセージ |
| `admin.commission.toast.*` | トーストメッセージ（rateUpdated、targetUpdated、payoutProcessed、payoutPartial、payoutAlreadyProcessed、payoutCannotDelete、payoutDeleteFailed、payoutsDeleted_one/_other、export 成功/失敗） |
| `common.*` | 共有ラベル（cancel、save、confirm、close、ok、filters.all、filters.search） |

### 9.2 既知の i18n ギャップ

| Key | Status |
| :--- | :--- |
| `admin.commission.period.{weekly,monthly,quarterly,yearly}` | **不存在** — KPIカードはここでフォールバックを渡さないため、生のキーが描画される（目に見えるバグ） |
| `admin.commission.range.*` | 不存在 — トグルは `7d`/`30d`/`90d`/`1y` にフォールバック（許容範囲） |
| `admin.commission.reportTypes.*` | 不存在 — ダイアログは生の `commission`/`revenue`/`payout` を表示 |
| `admin.commission.kpi.*`（ラベル） | 不存在 — カードは英語リテラルにフォールバック |
| `payout.completedOrders` / `pendingOrders`（完全一致） | ただし `_one`/`_other` 複数形が存在し、i18next の複数形解決で使用される |
| `toast.payoutsDeleted`（完全一致） | `_one`/`_other` 複数形が存在する |

---

## 10. Shared Components (共有コンポーネント)

### 10.1 Admin Layout

| Property | Value |
| :--- | :--- |
| **Note** | このページは `DashboardLayout` を内部で使用せず、スタンドアロンのコンテナを描画。言語/テーマトグルと管理者ユーザーメニューは、ルートをホストする管理レイアウトから提供される。 |

### 10.2 Toast Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/toast.tsx` |
| **Variants** | `default`, `destructive` |
| **Usage** | このページの全てのAPI成功/失敗通知（アラートバナーはなし） |

### 10.3 Dialog Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/dialog.tsx` |
| **Usage** | 手数料編集ダイアログ、ペイアウト確認ダイアログ、ペイアウト詳細ダイアログ、目標編集ダイアログ、エクスポートモーダル、削除確認 |

### 10.4 AlertDialog Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/alert-dialog.tsx` |
| **Usage** | ペイアウト削除エラー表示 |

### 10.5 Card Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/card.tsx` |
| **Usage** | 手数料カード、KPIカード、目標カード、ステータスパネル、広告料金サマリー |

### 10.6 Badge Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/badge.tsx`（`badges.tsx` レジストリ経由） |
| **Usage** | ペイアウトステータスバッジ、支払いステータスピル |

### 10.7 Table Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/table.tsx`（ペイアウトテーブル）、レポートテーブルは手書きの `<table>` |
| **Usage** | ペイアウトテーブル、手数料レポートテーブル |

### 10.8 Date Input Component

| Property | Value |
| :--- | :--- |
| **Location** | ネイティブの `<input type="date">`（レポートフィルタ、エクスポートダイアログ、編集ダイアログ） |
| **Usage** | このページの全ての日付入力 |

### 10.9 Progress Bar

| Property | Value |
| :--- | :--- |
| **Location** | 手書きの div + `role="progressbar"`（shadcn の Progress コンポーネントは不使用） |
| **Usage** | 収益目標ゲージ |

---

## 11. Special UI Notes & Styling Constraints (特記事項・UI仕様)

- **Design System:** Luxury Cosmetics Theme — Primary `#7C3AED` (Purple), Accent `#EC4899` (Pink), Secondary `#F3E8FF` (Lavender).
- **Currency Precision:** 全ての金額は精度を保持するため文字列として送受信・描画。フロントエンドの `formatCurrency` は en-US ロケールで丸めてグループ化（例 `12,000 Ks`）、`formatRate` は末尾のゼロを除去（`10%`、`10.5%`）。
- **Responsive Viewport Design:** KPIグリッドはモバイルでスタック、テーブルは横スクロール、ペイアウトフィルタは小画面で縦積み。
- **Loading States:** カード/パネルはパルススケルトン、テーブルは取得中 `opacity-50`、アイコンボタンはミューテーション中に無効化。
- **Accessibility:** 全てのコントロールはキーボード操作可能。ARA ラベル必須。ペイアウト行は行ごとの `aria-label`、チェックボックスはラベル付き、ゲージは `role="progressbar"`。
- **RBAC Implementation:** バックエンドは全エンドポイントで `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('admin')` を強制。フロントエンドのルートは `roles={['admin', 'super_admin']}`。未授權アクセスは `403` + `errorCode: RES_004`。
- **Design Tokens:** ステータスバッジは中央の `badges.tsx` レジストリを使用 — success: `bg-green-100 text-green-800`、pending: `bg-amber-100 text-amber-800`、processing: `bg-purple-100 text-purple-800`、neutral/refunded: `bg-gray-100 text-gray-800`、danger: `bg-red-100 text-red-800`。
- **Naming Conventions:** DB は snake_case、API/JSON は camelCase。主キー・外部キーに UUID。
- **Audit Trail:** 手数料率の更新、目標の更新、ペイアウトのレビュー/処理/削除、エクスポートは管理者ID付きで記録。保持期間：2年（管理者アクション）/ 1年（エクスポート）。
- **Revenue Target Gauge:** 100%超過はゲージ表示ではクランプされるが、数値ラベルは実際の値を表示。期間ごとにアクティブ目標は1件、保存で上書き。
- **AI Forecast:** 非確定の推定値 — 書き戻しや集計に使用しない。データが不十分な場合はノート付きで非表示。
- **Ad Fee Revenue:** 個別KPIカード、合計収入に含む、チャート上の個別ライン、支払いステータス（completed/pending/refunded）を専用パネルに集計。`AdFeeSummaryCard` の Total Collected はハードコードされた `$` プレフィックスを描画（既知の問題。他の場所では `Ks`）。
- **Payout Statuses:** ペイアウトパネルはペイアウトリスト由来のペイアウトステータス（pending/processing/completed）を表示 — 注文支払いステータスではない。`failed` はレガシーのバッジ定義とフロントエンドの union 型にのみ存在する。
- **Export Functionality:** エクスポートボタンは Commission タブ、Revenue タブ（右上）、Payout セクション。CSV/Excel のみ。日付範囲必須、365日上限。ダウンロードは即時（blob → サニタイズされたファイル名）。エクスポート履歴UIはなし。
- **Charts:** トレンドチャートは手書きのインラインSVG（600×300）で、カードヘッダーに `RangeToggle` を配置。チャートライブラリは不使用。

---

## 12. Testing Checklist (テストチェックリスト)

### 12.1 Commission Tab Tests

- [ ] ページが手数料カードとレポートテーブルを読み込む
- [ ] パルススケルトンの読み込み状態がAPIレスポンスまで表示される
- [ ] 現在の手数料率がパーセント形式で表示される
- [ ] Edit Rate ボタンが編集ダイアログを開く
- [ ] ダイアログが現在の手数料率をプリフィルする
- [ ] 無効な手数料率（NaN または ≤ 0）がインラインエラーを表示し Save をブロックする
- [ ] 有効な手数料率の更新が成功トーストを表示し表示を更新する
- [ ] Cancel ボタンが保存せずダイアログを閉じる
- [ ] Group By ボタン（Merchant/Day/Order）がテーブル列を変更する
- [ ] レポートフィルタの日付バリデーションが機能する（`from <= to`）
- [ ] Apply ボタンがフィルタ済みレポートを再取得する
- [ ] Reset ボタンがフィルタをクリアしデフォルトレポートを再読み込みする
- [ ] ページネーションが機能する（ページ + ページサイズ）
- [ ] Export ボタンがあるとタイプ "Commission" のモーダルが開く

### 12.2 Revenue Tab Tests

- [ ] ページが6つのKPIカード、トレンドチャート（予測付き）、目標カード、ペイアウトステータスパネル、広告支払いパネル、広告料金サマリー、ペイアウトテーブルを読み込む
- [ ] 6つのKPIカード全てが `Ks` 形式で正しい値を表示する
- [ ] Net Revenue カードが収益 − コミッションを表示する（収入 − 返金ではない）
- [ ] トレンドチャートが収益、コミッション、広告料金の系列を描画する
- [ ] 期間トグルが `30d` をデフォルトにする
- [ ] 期間変更がトレンド + 予測を再取得する
- [ ] ペイアウトステータスパネルが Completed/Processing/Pending の件数を表示する（ペイアウトステータス）
- [ ] 広告支払いパネルが Completed/Pending/Refunded を表示する
- [ ] ペイアウトフィルタ（status/merchant/period/search）が機能し、Reset でクリアされる
- [ ] ペイアウト検索がEnterで適用され、出品者名/メールまたは期間に一致する
- [ ] ペイアウトテーブルが出品者、期間、合計注文数ピル、合計、コミッション（赤）、純額、ステータスバッジ、完了日を表示する
- [ ] Process ボタンが完了行で無効、View ボタンが詳細ダイアログを開く
- [ ] 保留中ペイアウトの詳細表示がレビューを実行する（ステータスが processing になる）
- [ ] 確認ダイアログが金額 + 内訳を表示。Confirm が処理、Cancel が保留中にレビューを実行する
- [ ] 複数選択 + Delete selected: 対象行が削除、対象外は AlertDialog を表示する
- [ ] 目標カードが期間トグル、目標金額、実績収益、ゲージバー、進捗%を表示する
- [ ] 目標期間が `monthly` をデフォルトにし、目標設定までゲージが 0% を表示する
- [ ] Edit Target ダイアログが金額（正規表現 + > 0）をインラインエラーで検証する
- [ ] 有効な目標保存が成功トーストを表示しゲージを更新する
- [ ] 同じ期間の目標保存が前のものを上書きする
- [ ] AI予測の点線がデータ十分時に描画され、不十分時にノート付きで非表示になる
- [ ] 広告料金KPIカードが正しい値を表示し、広告料金トレンド系列がチャートに描画される
- [ ] 合計収入カードがコミッション + 広告料金の合計を表示する

### 12.3 Export Tests

- [ ] Export Commission ボタンが日付 + groupBy をプリフィルしたタイプ "Commission" のモーダルを開く
- [ ] Export Revenue ボタンがタイプ "Revenue" のモーダルを開く
- [ ] Export Payout ボタンが出品者セレクト + 期間由来日付をプリフィルしたタイプ "Payout" のモーダルを開く
- [ ] 空の日付範囲がインラインエラーを表示する
- [ ] `dateTo` が `dateFrom` より前の場合にインラインエラーを表示する
- [ ] 日付範囲が365日を超える場合にインラインエラーを表示する
- [ ] 形式がCSVをデフォルトにし、Excelトグルが機能する
- [ ] Generate がファイルをダウンロードする（blob → Content-Disposition からのサニタイズ済みファイル名）
- [ ] 成功トーストが表示され、モーダルが閉じる
- [ ] エクスポートアクションが audit_logs に記録される（`EXPORT_GENERATED`）

### 12.4 Global Tests

- [ ] 言語トグル（管理レイアウト）が全てのラベルを切り替える（EN/JA/MY）
- [ ] テーマトグル（管理レイアウト）が light/dark/system を循環する
- [ ] レスポンシブレイアウトがモバイル、タブレット、デスクトップで機能する
- [ ] ダイアログとトグルグループのキーボードナビゲーションが機能する
- [ ] 全ての i18n キーが正しく描画される（または文書化されたフォールバック）

---

*End of Screen Items Specification (Commission & Revenue)*
