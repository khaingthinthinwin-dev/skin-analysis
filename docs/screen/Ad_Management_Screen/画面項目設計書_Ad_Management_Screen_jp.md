# 画面項目設計書（Screen Items Specification）— 管理者広告管理

**ドキュメントID:** SKM-SIS-ADM-001  
**対象画面:** 管理者広告管理（Admin Ad Management）  
**サブシステム:** 広告管理 — 管理者による審査、手数料管理、分析、エクスポート  
**機能ID:** FN-ADM-001  
**バージョン:** 1.2  
**作成日:** 2026-08-26  
**最終更新日:** 2026-08-28  
**作成者:** Software Architect  
**レビュー状態:** Released（承認済み）  
**分類:** Internal — Engineering Division

---

## 1. ドキュメント管理

### 1.1 改訂履歴

| 版 | 日付 | 作成者 | 変更内容 |
| :--- | :--- | :--- | :--- |
| 1.0 | 2026-08-26 | Software Architect | 管理者広告管理画面の初版作成。広告一覧、審査モーダル、一括承認/却下モーダル、パッケージ・料金管理、料金変更履歴、収益分析、レポート出力を定義。 |
| 1.1 | 2026-08-27 | Software Architect | 業務フロー整合性を反映。パッケージ/料金設定の関係を明確化、料金計算ルール（合計料金 = 日額 × 日数）を追加、支払挙動表示を明確化、審査モーダルで料金・期間・返金情報を補強、却下確認UI改善、料金固定ルールの明記、スケジュールと最大広告数表示の整理、ビジネスルール要約と確認必須項目の追加。 |
| 1.2 | 2026-08-28 | Software Architect | 管理者ルート、審査API、料金設定API、レポート用エクスポートAPI、広告DB列名、収益集計条件を最新の機能仕様およびDB仕様に合わせて整合。 |

### 1.2 関連資料

| No. | 文書ID | 文書名 | ファイルパス | 備考 |
| :-- | :--- | :--- | :--- | :--- |
| 1 | SKM-REQ-001 | Requirements Definition (v2.10) | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | 業務ルール、広告表示ルール、収益化ルール |
| 2 | SKM-DBS-001 | Database Design Specification (v2.5) | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | `advertisements`、`ad_payments`、`ad_fee_settings`、`ad_fee_history` 等の構造と制約 |
| 3 | SKM-DEV-001 | Development Rules (v2.1) | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` | セキュリティ、デザイントークン、エラー応答 |
| 4 | SKM-FDS-ADM-001 | Functional Specification — Admin Ad Management (v1.2) | `docs/screen/Ad_Management_Screen/機能設計書_Ad_Management_Screen.md` | ユースケース、状態遷移、検証ルール、エラー処理 |

---

## 2. 画面概要・目的

### 2.1 目的
管理者広告管理画面では、プラットフォーム管理者が広告のライフサイクル全体を管理できるようにする。広告の審査・承認/却下（個別または一括）、広告パッケージの価格設定と手数料設定、手数料変更履歴の確認、掲載場所やティア別の収益分析、レポートの出力を行う。

広告システムは収益の中核機能であり、広告パッケージは Fee Setting により定義される。各 Fee Setting は掲載場所、ティア、日額料金、期間、最大広告数で構成され、加盟店は利用可能なパッケージを選択する。システムは料金を以下の計算ルールで算出する: 料金合計 = 日額料金 × 期間日数。支払い完了後、広告は PENDING 審査状態となる。広告の承認・却下は管理者のみが実行可能である。承認済み広告はスケジュールに従って掲載対象となり、却下された広告は非表示になり、支払い済み額は全額返金される。

### 2.2 対象ユーザーと権限

| 属性 | 内容 |
| :--- | :--- |
| **主な利用者** | プラットフォーム管理者（管理者） |
| **必要認証** | `admin` 権限を持つ JWT Bearer Token |
| **データ範囲** | すべての広告、すべての料金設定、すべての支払データ、プラットフォーム全体の収益情報 |
| **アクセス制御** | 保護ルート — `JwtAuthGuard` + `RolesGuard` (`admin`) |

### 2.3 主な機能と設計方針
1. 広告審査と承認 — 保留中の加盟店広告を確認し、個別に承認または却下し、承認者情報（approved_by, approved_at）を保持する。
2. 一括承認/却下 — チェックボックスで複数の保留中広告を選択し、単一の一括処理で承認または却下する。大量却下時は共通理由と自動返金を実施する。
3. パッケージと手数料管理 — 掲載場所とティアごとに手数料設定を作成・編集・有効化/無効化し、変更履歴を日時、変更前後、理由とともに記録する。
4. 手数料計算表示 — 広告選択時と審査モーダルで、計算された合計料金（日額 × 期間日数）を加盟店と管理者に表示する。
5. 料金固定ルール — 加盟店がパッケージを購入して料金が確定した後は、その支払額が固定され、後続の料金設定変更で変動しない。
6. 料金変更履歴 — 価格変更の全履歴を監査証跡として記録する。
7. 収益内訳分析 — 配置場所とティア別に収益を分解し、期間指定でチャートとサマリーメトリクスを表示する。
8. エクスポート — 広告パフォーマンス、店舗提出履歴、手数料履歴を CSV 形式で出力する。
9. リアルタイムフィードバック — すべての審査アクションに対してトースト通知を表示する。
10. 確認ダイアログ — 却下、一括却下、Fee 設定無効化などの破壊的操作には必ず確認ダイアログを表示する。
11. ページネーションとフィルタリング — サーバーサイドページネーションと複数条件の絞り込みを行う。
12. 国際化 — EN、JA、MY の i18n を完全に対応する。

### 2.4 広告審査フロー（管理者審査）

**Merchant → Admin の業務フロー:**

```text
管理者がパッケージ / Fee Setting を定義
(Placement, Tier, Daily Rate, Duration, Max Ads)
         ↓
パッケージが加盟店選択対象になる
         ↓
加盟店がパッケージを選択
         ↓
システムが合計料金を計算
  合計料金 = 日額料金 × 期間日数
         ↓
加盟店が支払いを完了
         ↓
┌────────────────────────┐
│ 支払い成功?           │
└────────┬───────────────┘
    YES  │  NO → 支払い失敗状態（未送信）
         ↓
加盟店が広告を提出
         ↓
┌────────────────────────┐
│ Ad Created             │
│ (status = PENDING)     │
│ サイトには表示されない │
└────────────────────────┘
         ↓
┌────────────────────────┐
│ 管理者が Pending     │
│ キューで確認           │
└────────────────────────┘
         ↓
    ┌────┴────┐
    │         │
    ↓         ↓
┌───────┐ ┌───────┐
│APPROVE│ │REJECT │
└───────┘ └───────┘
    │         │
    ↓         ↓
┌────────┐ ┌────────────────┐
│VISIBLE │ │ HIDDEN         │
│TO ALL  │ │ + 100% REFUND  │
│(per    │ │ (paid amount   │
│schedule)│ │  refunded)    │
└────────┘ └────────────────┘
```

**一括操作フロー:**
```text
管理者が複数広告を選択（PENDING のみ）
         ↓
    ┌────┴────┐
    │         │
    ↓         ↓
┌──────────┐ ┌──────────┐
│BULK      │ │BULK      │
│APPROVE   │ │REJECT    │
└──────────┘ └──────────┘
    │              │
    ↓              ↓
┌────────┐  ┌──────────────┐
│ALL     │  │ALL           │
│APPROVED│  │REJECTED      │
│+ NOTIFY│  │+ 100% REFUNDS│
└────────┘  └──────────────┘
```

---

## 3. 画面レイアウト構成

### 3.1 全体画面構成

#### 広告一覧レイアウト (`/admin/ads`)
```text
┌─────────────────────────────────────────────────────────┐
│                    BROWSER VIEWPORT                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [A] PAGE HEADER                     │   │
│  │    タイトル: "Advertisement Management"         │   │
│  │   Pending Count Badge | パッケージ管理ボタン     │   │
│  │   収益分析ボタン | エクスポートボタン            │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [B] FILTER BAR                      │   │
│  │   Status ▼ | Placement ▼ | Tier ▼               │   │
│  │   Search Shop... | Date Range                    │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [C] ADS TABLE                       │   │
│  │   ☐ | 店舗 | タイトル | 配置場所 | ティア          │   │
│  │   ステータスバッジ | 決済バッジ | 料金 | 提出日   │   │
│  │   スケジュール | 操作 [Review] [View]             │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [D] BULK ACTION BAR                  │   │
│  │   {n} ads selected | [一括承認] [一括却下]       │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [E] PAGINATION                      │   │
│  │   < 1 2 3 ... 8 >    Showing 1-20 of 150        │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### 広告審査モーダルレイアウト（単一広告）
```text
┌─────────────────────────────────────────────────────────┐
│                    MODAL OVERLAY                        │
│              ┌─────────────────────────────┐            │
│              │   [A] MODAL HEADER          │            │
│              │   "Review Advertisement"    │            │
│              │                    [X Close]│            │
│              ├─────────────────────────────┤            │
│              │                             │            │
│              │   [B] SHOP INFO             │            │
│              │   Shop Name | Placement     │            │
│              │   Tier                      │            │
│              │                             │            │
│              │   [C] AD PREVIEW            │            │
│              │   Banner Image              │            │
│              │   Message | Link URL        │            │
│              │   Content | Schedule        │            │
│              │   (Start Date ~ End Date)   │            │
│              │   Duration: {n} days        │            │
│              │                             │            │
│              │   [D] FEE & PAYMENT INFO    │            │
│              │   Daily Rate | Duration     │            │
│              │   ─────────────────         │            │
│              │   Total Fee (calculated)    │            │
│              │   Fee Paid | Payment Status │            │
│              │   (Fee locked at purchase)  │            │
│              │                             │            │
│              │   [E] REJECTION REASON      │            │
│              │   Textarea (conditional)    │            │
│              │   Refund Info (conditional) │            │
│              │                             │            │
│              │   [F] ACTION BUTTONS        │            │
│              │   [Approve] [Reject]        │            │
│              │   [Cancel]                  │            │
│              └─────────────────────────────┘            │
└─────────────────────────────────────────────────────────┘
```

#### 一括却下確認モーダルレイアウト
```text
┌─────────────────────────────────────────────────────────┐
│                    MODAL OVERLAY                        │
│              ┌─────────────────────────────┐            │
│              │   [A] MODAL HEADER          │            │
│              │   "Bulk Reject Ads"         │            │
│              │                    [X Close]│            │
│              ├─────────────────────────────┤            │
│              │                             │            │
│              │   [B] WARNING MESSAGE       │            │
│              │   "You are about to reject  │            │
│              │    {n} advertisements."     │            │
│              │                             │            │
│              │   "The advertisements will  │            │
│              │    not be displayed."       │            │
│              │                             │            │
│              │   "Paid amounts will be     │            │
│              │    refunded in full (100%)  │            │
│              │    according to the refund  │            │
│              │    rule."                   │            │
│              │                             │            │
│              │   [C] REJECTION REASON      │            │
│              │   Textarea (required)       │            │
│              │                             │            │
│              │   [D] ACTION BUTTONS        │            │
│              │   [Cancel] [Confirm Reject] │            │
│              └─────────────────────────────┘            │
└─────────────────────────────────────────────────────────┘
```

#### 一括承認確認モーダルレイアウト
```text
┌─────────────────────────────────────────────────────────┐
│                    MODAL OVERLAY                        │
│              ┌─────────────────────────────┐            │
│              │   [A] MODAL HEADER          │            │
│              │   "Bulk Approve Ads"        │            │
│              │                    [X Close]│            │
│              ├─────────────────────────────┤            │
│              │                             │            │
│              │   [B] CONFIRMATION MESSAGE  │            │
│              │   "You are about to approve │            │
│              │    {n} advertisements."     │            │
│              │                             │            │
│              │   [C] ACTION BUTTONS        │            │
│              │   [Cancel] [Confirm Approve]│            │
│              └─────────────────────────────┘            │
└─────────────────────────────────────────────────────────┘
```

#### パッケージ＆Fee管理レイアウト (`/admin/ads/packages`)
```text
┌─────────────────────────────────────────────────────────┐
│                    BROWSER VIEWPORT                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [A] PAGE HEADER                     │   │
│  │   タイトル: "Package & Fee Management"         │   │
│  │   [← Back to Ads] [View History]                 │   │
│  │                           [+ Create Fee Setting] │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [B] FEE SETTINGS TABLE              │   │
│  │   Placement | Tier | Daily Rate | Duration       │   │
│  │   Total Fee | Max Ads | Status | Actions         │   │
│  │   [Edit] [Deactivate]                           │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### 料金変更履歴レイアウト (`/admin/ads/fee-history`)
```text
┌─────────────────────────────────────────────────────────┐
│                    BROWSER VIEWPORT                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [A] PAGE HEADER                     │   │
│  │   タイトル: "Fee Change History"               │   │
│  │   [← Back to Packages]                           │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [B] FILTER BAR                      │   │
│  │   Placement ▼ | Tier ▼                           │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [C] HISTORY TABLE                   │   │
│  │   Date | Placement | Tier | Old Rate | New Rate  │   │
│  │   Changed By | Reason                            │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [D] PAGINATION                      │   │
│  │   < 1 2 3 ... 5 >    Showing 1-20 of 80         │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### 収益分析レイアウト (`/admin/ads/analytics`)
```text
┌─────────────────────────────────────────────────────────┐
│                    BROWSER VIEWPORT                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [A] PAGE HEADER                     │   │
│  │   タイトル: "Revenue Analytics"                │   │
│  │   [← Back to Ads]                                │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [B] FILTER CONTROLS                 │   │
│  │   Date Range | Placement ▼ | Tier ▼              │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [C] SUMMARY METRICS                 │   │
│  │   Total Revenue | Approved Ads | Fees Collected  │   │
│  │   Avg Revenue Per Ad | Total Refunds             │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [D] CHARTS                          │   │
│  │   Revenue by Placement [Bar] | Revenue by Tier   │   │
│  │   [Bar] | Revenue Trend [Line]                   │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [E] DATA TABLES                     │   │
│  │   Ads by Placement | Ads by Tier                 │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### エクスポートレポートレイアウト (`/admin/ads/export`)
```text
┌─────────────────────────────────────────────────────────┐
│                    BROWSER VIEWPORT                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [A] PAGE HEADER                     │   │
│  │   タイトル: "Export Reports"                   │   │
│  │   [← Back to Ads]                                │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [B] REPORT TYPE SELECTION           │   │
│  │   [Ad Performance] [Submission History]          │   │
│  │   [Fee History]                                  │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [C] EXPORT CONFIGURATION            │   │
│  │   Date Range | Placement ▼ | Tier ▼ | Status ▼   │   │
│  │   Shop Search... | Format: (●) CSV               │   │
│  │   [Generate Report] | Estimated {n} rows         │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [D] RECENT EXPORTS TABLE            │   │
│  │   Type | Format | Date Range | Status | Download │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 3.2 レスポンシブレイアウトのブレークポイント

| ブレークポイント | 最小幅 | レイアウト動作 |
| :--- | :--- | :--- |
| Mobile (default) | 0px | 下部ナビゲーション + 積み重ねカード（管理者モバイルは主対象ではない） |
| Tablet (`md:`) | 768px | 折りたたみ式サイドバー + レスポンシブテーブル |
| Desktop (`lg:`) | 1024px | フルサイドバー + テーブルレイアウト + モーダルオーバーレイ |
| Wide (`xl:`) | 1280px | フルサイドバー + 拡張テーブルレイアウト |

---

## 4. 画面項目定義

### 4.1 [A] ページヘッダー — 広告一覧

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 1 | `lblAdsTitle` | ページタイトル | Static Label (`<h1>`) | String | — | 表示済み。テキスト: "Advertisement Management" | — | i18n key: `admin.ads.title` | Tailwind: `text-2xl font-bold` |
| 2 | `badgePendingCount` | 承認待ち件数バッジ | Badge | Integer | — | 読み込み時に取得 | — | `COUNT(advertisements WHERE status = 'pending')` | 黄系バッジ。承認待ち広告数を表示 |
| 3 | `btnManagePackages` | パッケージ管理ボタン | Button (`outline`) | — | — | 表示。テキスト: "Manage Packages" | — | — | `/admin/ads/packages` に遷移 |
| 4 | `btnRevenueAnalytics` | 収益分析ボタン | Button (`outline`) | — | — | 表示。テキスト: "Revenue Analytics" | — | — | `/admin/ads/analytics` に遷移 |
| 5 | `btnExport` | エクスポートボタン | Button (`outline`) | — | — | 表示。テキスト: "Export" | — | — | `/admin/ads/export` に遷移 |

### 4.2 [B] フィルターバー — 広告一覧

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 6 | `selStatusFilter` | ステータスフィルタ | Select | Enum | No | 初期値: "All" | オプション: All, Pending, Approved, Rejected | — | i18n key: `admin.ads.filterByStatus`。変更時にクエリパラメータを更新 |
| 7 | `selPlacementFilter` | 配置場所フィルタ | Select | Enum | No | 初期値: "All" | オプション: All, Homepage Banner, Product Sidebar, Category Banner, Search Top | — | i18n key: `admin.ads.filterByPlacement` |
| 8 | `selTierFilter` | ティアフィルタ | Select | Enum | No | 初期値: "All" | オプション: All, Basic, Standard, Premium | — | i18n key: `admin.ads.filterByTier` |
| 9 | `txtShopSearch` | 店舗検索入力 | Input (`text`) | String(255) | No | 空欄。プレースホルダー: "Search shop..." | MaxLength: 255 | — | i18n key: `admin.ads.searchShop`。デバウンス 300ms |
| 10 | `dateRangeFilter` | 日付範囲フィルタ | Date Range Picker | Date Range | No | 空欄 | 有効な日付範囲 | — | i18n key: `admin.ads.filterByDate`。提出日で絞り込み |

### 4.3 [C] 広告テーブル

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 11 | `chkSelectAllAds` | 全選択チェックボックス | Checkbox | Boolean | No | 未選択 | — | — | 行の全チェックボックスを切り替え |
| 12 | `chkSelectAd` | 広告選択チェックボックス | Checkbox | Boolean | No | 行ごとに未選択 | — | — | 一括操作ボタンの有効/無効を制御 |
| 13 | `lblShopName` | 店舗名 | Static Label | String | — | DBから取得 | — | `shops.name` | `font-medium text-sm` |
| 14 | `lblAdTitle` | 広告タイトル | Static Label | String | — | DBから取得 | — | `advertisements.title` | `text-sm` |
| 15 | `lblPlacement` | 配置場所 | Static Label | String | — | DBから取得 | — | `ad_fee_settings.placement` | ローカライズ済み名 |
| 16 | `lblTier` | ティア | Badge | Enum | — | DBから取得 | — | `ad_fee_settings.tier` | 標準のバッジ色 |
| 17 | `badgeAdStatus` | 広告ステータスバッジ | Badge | Enum | — | 承認済み: 緑 / 却下済み: 赤 / 保留中: 黄 | — | `advertisements.approval_status` | 標準ステータス色。PENDING のみ承認/却下可能 |
| 18 | `badgePaymentStatus` | 決済ステータスバッジ | Badge | Enum | — | 完了: 緑 / 保留: 黄 / 返金済み: 灰 | — | `advertisements.payment_status` | 標準ステータス色 |
| 19 | `lblSubmittedAt` | 提出日 | Static Label | DateTime | — | ISO 8601 形式 | — | `advertisements.created_at` | i18n によるローカライズ日付 |
| 20 | `lblFee` | 料金 | Static Label | Decimal | — | 通貨フォーマット | — | `advertisements.payment_amount` | ローカライズ通貨表示 |
| 21 | `btnReviewAd` | 確認ボタン | Button (`outline`) | — | — | 表示。テキスト: "Review" | — | — | 審査モーダルを開く。PENDING のみ |
| 22 | `btnViewAd` | 閲覧ボタン | Button (`outline`) | — | — | 表示。テキスト: "View" | — | — | 読み取り専用の審査モーダルを開く |
| 23 | `lblAdListSchedule` | スケジュール（一覧） | Static Label | String | — | "2026-09-01 ~ 2026-09-07" | — | `advertisements.starts_at`, `advertisements.expires_at` | ローカライズ日付レンジ。表示期間 = 終了日 - 開始日 + 1日 |

### 4.4 [D] 一括操作バー

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 24 | `lblSelectedCount` | 選択数テキスト | Static Label | String | — | "{n} ads selected" | — | — | i18n key: `admin.ads.selectedCount` |
| 25 | `btnBulkApprove` | 一括承認ボタン | Button (`default`) | — | No | 無効（選択なし） | — | — | チェックボックス選択時に有効。一括承認モーダルを開く |
| 26 | `btnBulkReject` | 一括却下ボタン | Button (`destructive`) | — | No | 無効（選択なし） | — | — | チェックボックス選択時に有効。一括却下モーダルを開く |
| 27 | `btnClearSelection` | 選択解除ボタン | Button (`text`) | — | No | 表示。テキスト: "Clear" | — | — | すべての選択を解除 |

### 4.5 [E] ページネーション — 広告一覧

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 28 | `pagAds` | 広告ページネーション | Pagination | — | — | Page 1, API から総ページ数取得 | — | API response `meta.totalPages` | 1ページあたり 20 / 50 / 100 を選択可能 |

### 4.6 審査モーダルヘッダー

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 29 | `lblReviewAdTitle` | モーダルタイトル | Static Label (`<h2>`) | String | — | テキスト: "Review Advertisement" | — | i18n key: `admin.ads.reviewAd` | `text-lg font-semibold` |
| 30 | `btnCloseReviewModal` | モーダル閉じるボタン | Icon Button | — | — | 表示。X アイコン | — | — | モーダル閉じる。Esc でも閉じる |

### 4.7 審査モーダル内店舗情報

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 31 | `lblReviewShopName` | 店舗名 | Static Label | String | — | DBから取得 | — | `shops.name` | `font-semibold` |
| 32 | `lblReviewPlacementTier` | 配置場所とティア | Static Label | String | — | "Homepage Banner — Standard" | — | `advertisements.placement`, `advertisements.tier` | `text-sm text-muted-foreground` |

### 4.8 審査モーダル内広告プレビュー

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 33 | `imgAdBanner` | 広告バナー画像 | Image | URL | — | 広告バナー画像 | — | `advertisements.image_url` | `w-full rounded` |
| 34 | `lblAdMessage` | 告知メッセージ | Static Label | String | — | DBから取得 | — | `advertisements.announcement_message` | `font-medium` |
| 35 | `lblAdLinkUrl` | リンクURL | Static Label (Link) | String | — | DBから取得 または "—" | — | `advertisements.link_url` | クリック可能なリンク |
| 36 | `lblAdContent` | 内容説明 | Static Label (`<p>`) | Text | — | DBから取得 または "—" | — | `advertisements.content` | `text-sm whitespace-pre-wrap` |
| 37 | `lblAdSchedule` | スケジュール | Static Label | String | — | "2026-09-01 ~ 2026-09-07" | — | `advertisements.starts_at`, `advertisements.expires_at` | ローカライズ日付レンジ。表示方法 = 終了日 - 開始日 + 1日 |
| 38 | `lblAdDuration` | 期間 | Static Label | String | — | "{n} days" | — | `advertisements.starts_at` と `expires_at` から計算 | 表示のみ。起算日数は事業確認必須 |

### 4.9 審査モーダル内料金と決済情報

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 39 | `lblDailyRateDisplay` | 日額料金 | Static Label | Decimal | — | 通貨フォーマット | — | `ad_fee_settings.daily_rate`（購入時に固定） | 料金固定ルール: 購入時点の料金表示 |
| 40 | `lblDurationDisplay` | 期間 | Static Label | String | — | "{n} days" | — | `ad_fee_settings.duration_days`（購入時に固定） | 料金固定ルール |
| 41 | `lblTotalFeeDisplay` | 合計料金 | Static Label (`<strong>`) | Decimal | — | "Daily Rate × Duration = Total Fee" | — | 計算: `daily_rate × duration_days`（購入時固定） | 料金計算表示ルール |
| 42 | `lblFeePaid` | 支払料金 | Static Label | Decimal | — | 通貨フォーマット | — | `ad_payments.amount` | 実際に加盟店が支払った金額 |
| 43 | `badgePaymentStatusDetail` | 決済ステータス | Badge | Enum | — | 緑（Completed）、黄（Pending）、灰（Refunded） | — | `ad_payments.payment_status` | 標準バッジ色 |
| 44 | `lblRefundInfo` | 返金情報 | Static Label | String | — | 表示条件: status = REJECTED。"Refund: {amount} (100% of paid amount)" | — | 計算: `ad_payments.amount` | 管理者による却下後に表示 |

### 4.10 却下理由・返金情報

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 45 | `lblRejectionReason` | 却下理由ラベル | Static Label (`<label>`) | String | — | 却下操作時のみ表示。テキスト: "Rejection Reason" | — | i18n key: `admin.ads.rejectionReason` | 却下時は必須 |
| 46 | `txtRejectionReason` | 却下理由テキストエリア | Textarea | String(1000) | Conditional | 空欄。プレースホルダー: "Enter reason..." | MaxLength: 1000。却下時必須 | — | `min-h-[80px]`。文字数表示あり |
| 47 | `alertRejectWarning` | 却下確認アラート | Alert | — | — | 却下操作時に表示。「この広告は却下され表示されません。支払額は返金規定に従い全額（100%）返金されます。」 | — | i18n key: `admin.ads.rejectWarning` | 黄系アラート。理由入力の上に表示 |

### 4.11 レビューモーダルのアクションボタン

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 48 | `btnApproveAd` | 承認ボタン | Button (`submit`, `default`) | — | — | 表示。テキスト: "Approve" | — | — | i18n key: `admin.ads.approve`。PENDING のみ有効 |
| 49 | `btnRejectAd` | 却下ボタン | Button (`destructive`) | — | — | 表示。テキスト: "Reject" | — | — | i18n key: `admin.ads.reject`。理由入力表示。PENDING のみ有効 |
| 50 | `btnCancelReview` | キャンセルボタン | Button (`outline`) | — | — | 表示。テキスト: "Cancel" | — | — | i18n key: `admin.ads.cancel`。モーダルを閉じる |

### 4.12 一括却下モーダルヘッダー

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 51 | `lblBulkRejectTitle` | モーダルタイトル | Static Label (`<h2>`) | String | — | テキスト: "Bulk Reject Advertisements" | — | i18n key: `admin.ads.bulkRejectTitle` | `text-lg font-semibold` |
| 52 | `btnCloseBulkRejectModal` | 閉じるボタン | Icon Button | — | — | 表示。X アイコン | — | — | モーダル閉じる。Esc でも閉じる |

### 4.13 警告メッセージ

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 53 | `lblBulkRejectCount` | 選択数 | Static Label | String | — | "You are about to reject {n} advertisements." | — | i18n key: `admin.ads.bulkRejectCount` | 動的な件数 |
| 54 | `alertBulkRejectWarning` | 警告アラート | Alert | — | — | "The advertisements will not be displayed. Paid amounts will be refunded in full (100%) according to the refund rule." | — | i18n key: `admin.ads.bulkRejectWarning` | 黄系アラート |

### 4.14 一括却下理由入力

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 55 | `txtBulkRejectReason` | 却下理由テキストエリア | Textarea | String(1000) | Yes | 空欄。プレースホルダー: "Enter reason..." | MaxLength: 1000。必須 | — | `min-h-[80px]`。文字数表示あり |

### 4.15 一括却下アクションボタン

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 56 | `btnConfirmBulkReject` | 確認却下ボタン | Button (`submit`, `destructive`) | — | — | 表示。テキスト: "Confirm Reject" | — | — | i18n key: `admin.ads.confirmBulkReject`。理由必須 |
| 57 | `btnCancelBulkReject` | キャンセルボタン | Button (`outline`) | — | — | 表示。テキスト: "Cancel" | — | — | i18n key: `admin.ads.cancel`。モーダルを閉じる |

### 4.16 一括承認モーダルヘッダー

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 58 | `lblBulkApproveTitle` | モーダルタイトル | Static Label (`<h2>`) | String | — | テキスト: "Bulk Approve Advertisements" | — | i18n key: `admin.ads.bulkApproveTitle` | `text-lg font-semibold` |
| 59 | `btnCloseBulkApproveModal` | 閉じるボタン | Icon Button | — | — | 表示。X アイコン | — | — | モーダル閉じる。Esc でも閉じる |

### 4.17 確認メッセージ

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 60 | `lblBulkApproveCount` | 選択数 | Static Label | String | — | "You are about to approve {n} advertisements." | — | i18n key: `admin.ads.bulkApproveCount` | 動的な件数 |

### 4.18 一括承認アクションボタン

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 61 | `btnConfirmBulkApprove` | 確認承認ボタン | Button (`submit`, `default`) | — | — | 表示。テキスト: "Confirm Approve" | — | — | i18n key: `admin.ads.confirmBulkApprove` |
| 62 | `btnCancelBulkApprove` | キャンセルボタン | Button (`outline`) | — | — | 表示。テキスト: "Cancel" | — | — | i18n key: `admin.ads.cancel`。モーダルを閉じる |

### 4.19 パッケージ＆Fee管理ページヘッダー

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 63 | `lblPackagesTitle` | ページタイトル | Static Label (`<h1>`) | String | — | 表示。テキスト: "Package & Fee Management" | — | i18n key: `admin.ads.packages` | `text-2xl font-bold` |
| 64 | `btnBackToAdsFromPackages` | 広告一覧へ戻るボタン | Button (`text`) | — | — | 表示。テキスト: "← Back to Ads" | — | — | `/admin/ads` に遷移 |
| 65 | `btnViewFeeHistory` | 履歴表示ボタン | Button (`outline`) | — | — | 表示。テキスト: "View History" | — | — | `/admin/ads/fee-history` に遷移 |
| 66 | `btnCreateFeeSetting` | Fee設定作成ボタン | Button (`primary`) | — | — | 表示。テキスト: "+ Create Fee Setting" | — | — | Fee作成モーダルを開く |

### 4.20 Fee設定テーブル

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 67 | `lblFeePlacement` | 配置場所 | Static Label | String | — | DBから取得 | — | `ad_fee_settings.placement` | `font-medium text-sm` |
| 68 | `badgeFeeTier` | ティア | Badge | Enum | — | DBから取得 | — | `ad_fee_settings.tier` | 標準バッジ色 |
| 69 | `lblDailyRate` | 日額料金 | Static Label | Decimal | — | 通貨フォーマット | — | `ad_fee_settings.daily_rate` | 通貨ローカライズ |
| 70 | `lblDuration` | 期間 | Static Label | Integer | — | "{n} days" | — | `ad_fee_settings.duration_days` | — |
| 71 | `lblTotalFee` | 合計料金 | Static Label | Decimal | — | 通貨フォーマット | — | 計算: `daily_rate × duration_days` | 料金計算表示ルール |
| 72 | `lblMaxAds` | 最大広告数 | Static Label | Integer | — | DBから取得 | — | `ad_fee_settings.max_ads` | ビジネス確認が必要 |
| 73 | `badgeFeeStatus` | ステータスバッジ | Badge | Enum | — | 緑 (Active), 灰 (Inactive) | — | `ad_fee_settings.is_active` | 標準ステータス色 |
| 74 | `btnEditFee` | 編集ボタン | Button (`outline`) | — | — | 表示。テキスト: "Edit" | — | — | Fee編集モーダルを開く。アクティブ設定のみ |
| 75 | `btnDeactivateFee` | 無効化ボタン | Button (`destructive`) | — | — | 表示。テキスト: "Deactivate" | — | — | 無効化確認モーダルを開く。アクティブ設定のみ |

### 4.21 Fee編集モーダルヘッダー

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 76 | `lblEditFeeTitle` | モーダルタイトル | Static Label (`<h2>`) | String | — | テキスト: "Edit Fee Setting" | — | i18n key: `admin.ads.editFee` | `text-lg font-semibold` |
| 77 | `btnCloseEditFeeModal` | 閉じるボタン | Icon Button | — | — | 表示。X アイコン | — | — | モーダル閉じる。Esc でも閉じる |

### 4.22 Fee編集フォーム

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 78 | `numEditDailyRate` | 日額料金入力 | Input (`number`) | Decimal | Yes | 現在値を表示 | `@IsNumber()`, `@Min(0.01)` | `ad_fee_settings.daily_rate` | — |
| 79 | `numEditDuration` | 期間入力 | Input (`number`) | Integer | Yes | 現在値を表示 | `@IsInt()`, `@Min(1)` | `ad_fee_settings.duration_days` | — |
| 80 | `lblEditTotalFeePreview` | 合計料金プレビュー | Static Label | Decimal | — | 計算: Daily Rate × Duration | — | 入力値から計算 | 料金計算ルール。日額または期間変更時にリアルタイム更新 |
| 81 | `numEditMaxAds` | 最大広告数入力 | Input (`number`) | Integer | Yes | 現在値を表示 | `@IsInt()`, `@Min(1)` | `ad_fee_settings.max_ads` | Max Ads は業務確認が必要 |
| 82 | `dateEditEffectiveFrom` | 適用開始日 | Date Picker | Date | Yes | 空欄 | `@IsDate()`, 必須 | — | — |
| 83 | `txtEditChangeReason` | 変更理由 | Textarea | String(1000) | Yes | 空欄。プレースホルダー: "Enter reason..." | MaxLength: 1000。必須 | — | `min-h-[80px]` |

### 4.23 Fee編集アクションボタン

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 84 | `btnSaveFee` | 保存ボタン | Button (`submit`, `default`) | — | — | 表示。テキスト: "Save" | — | — | i18n key: `admin.ads.save`。すべての入力が妥当である必要 |
| 85 | `btnCancelEditFee` | キャンセルボタン | Button (`outline`) | — | — | 表示。テキスト: "Cancel" | — | — | i18n key: `admin.ads.cancel`。モーダルを閉じる |

### 4.24 Fee作成モーダルヘッダー

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 86 | `lblCreateFeeTitle` | モーダルタイトル | Static Label (`<h2>`) | String | — | テキスト: "Create Fee Setting" | — | i18n key: `admin.ads.createFee` | `text-lg font-semibold` |
| 87 | `btnCloseCreateFeeModal` | 閉じるボタン | Icon Button | — | — | 表示。X アイコン | — | — | モーダル閉じる。Esc でも閉じる |

### 4.25 Fee作成フォーム

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 88 | `selCreatePlacement` | 配置場所選択 | Select | Enum | Yes | 初期値: 最初のオプション | オプション: Homepage Banner, Product Sidebar, Category Banner, Search Top | — | i18n key: `admin.ads.placement`。一意性チェック: placement+tier の既存アクティブ設定がある場合はエラー |
| 89 | `selCreateTier` | ティア選択 | Select | Enum | Yes | 初期値: 最初のオプション | オプション: Basic, Standard, Premium | — | i18n key: `admin.ads.tier` |
| 90 | `numCreateDailyRate` | 日額料金入力 | Input (`number`) | Decimal | Yes | 空欄 | `@IsNumber()`, `@Min(0.01)` | — | — |
| 91 | `numCreateDuration` | 期間入力 | Input (`number`) | Integer | Yes | 空欄 | `@IsInt()`, `@Min(1)` | — | — |
| 92 | `lblCreateTotalFeePreview` | 合計料金プレビュー | Static Label | Decimal | — | 計算: Daily Rate × Duration | — | 入力値から計算 | 料金計算表示ルール。日額または期間の変更でリアルタイム更新 |
| 93 | `numCreateMaxAds` | 最大広告数入力 | Input (`number`) | Integer | Yes | 空欄 | `@IsInt()`, `@Min(1)` | — | Max Ads は業務確認が必要 |
| 94 | `dateCreateEffectiveFrom` | 適用開始日 | Date Picker | Date | Yes | 空欄 | `@IsDate()`, 必須 | — | — |
| 95 | `txtCreateChangeReason` | 変更理由 | Textarea | String(1000) | Yes | 空欄。プレースホルダー: "Enter reason..." | MaxLength: 1000。必須 | — | `min-h-[80px]` |

### 4.26 Fee作成アクションボタン

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 96 | `btnCreateFee` | 作成ボタン | Button (`submit`, `default`) | — | — | 表示。テキスト: "Create" | — | — | i18n key: `admin.ads.create`。すべての入力が妥当である必要 |
| 97 | `btnCancelCreateFee` | キャンセルボタン | Button (`outline`) | — | — | 表示。テキスト: "Cancel" | — | — | i18n key: `admin.ads.cancel`。モーダルを閉じる |

### 4.27 Fee無効化確認モーダルヘッダー

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 98 | `lblDeactivateFeeTitle` | モーダルタイトル | Static Label (`<h2>`) | String | — | テキスト: "Deactivate Fee Setting" | — | i18n key: `admin.ads.deactivateFeeTitle` | `text-lg font-semibold` |
| 99 | `btnCloseDeactivateFeeModal` | 閉じるボタン | Icon Button | — | — | 表示。X アイコン | — | — | モーダル閉じる。Esc でも閉じる |

### 4.28 Fee無効化警告

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 100 | `alertDeactivateFeeWarning` | 警告アラート | Alert | — | — | "This fee setting will be deactivated. Existing ads that have already purchased this package are unaffected — their paid amount is locked." | — | i18n key: `admin.ads.deactivateFeeWarning` | 黄系アラート。料金固定ルールを明示 |

### 4.29 Fee無効化アクションボタン

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 101 | `btnConfirmDeactivateFee` | 確認無効化ボタン | Button (`submit`, `destructive`) | — | — | 表示。テキスト: "Deactivate" | — | — | i18n key: `admin.ads.confirmDeactivate` |
| 102 | `btnCancelDeactivateFee` | キャンセルボタン | Button (`outline`) | — | — | 表示。テキスト: "Cancel" | — | — | i18n key: `admin.ads.cancel`。モーダル閉じる |

### 4.30 Fee変更履歴ページヘッダー

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 103 | `lblFeeHistoryTitle` | ページタイトル | Static Label (`<h1>`) | String | — | 表示。テキスト: "Fee Change History" | — | i18n key: `admin.ads.feeHistory` | `text-2xl font-bold` |
| 104 | `btnBackToPackages` | パッケージ管理へ戻るボタン | Button (`text`) | — | — | 表示。テキスト: "← Back to Packages" | — | — | `/admin/ads/packages` に遷移 |

### 4.31 Fee履歴フィルターバー

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 105 | `selHistoryPlacementFilter` | 配置場所フィルタ | Select | Enum | No | 初期値: "All" | オプション: All, Homepage Banner, Product Sidebar, Category Banner, Search Top | — | i18n key: `admin.ads.filterByPlacement` |
| 106 | `selHistoryTierFilter` | ティアフィルタ | Select | Enum | No | 初期値: "All" | オプション: All, Basic, Standard, Premium | — | i18n key: `admin.ads.filterByTier` |

### 4.32 履歴テーブル

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 107 | `lblHistoryDate` | 日付 | Static Label | DateTime | — | ISO 8601 形式 | — | `ad_fee_history.created_at` | ローカライズ日付 |
| 108 | `lblHistoryPlacement` | 配置場所 | Static Label | String | — | DBから取得 | — | `ad_fee_history.placement` | — |
| 109 | `badgeHistoryTier` | ティア | Badge | Enum | — | DBから取得 | — | `ad_fee_history.tier` | 標準バッジ色 |
| 110 | `lblOldRate` | 旧料金 | Static Label | Decimal | — | 通貨フォーマット | — | `ad_fee_history.old_daily_rate` | ローカライズ通貨 |
| 111 | `lblNewRate` | 新料金 | Static Label | Decimal | — | 通貨フォーマット | — | `ad_fee_history.new_daily_rate` | ローカライズ通貨 |
| 112 | `lblChangedBy` | 変更者 | Static Label | String | — | DBから取得 | — | `users.name`（`ad_fee_history.changed_by` を経由） | 管理者名 |
| 113 | `lblReason` | 理由 | Static Label | Text | — | DBから取得 または "—" | — | `ad_fee_history.reason` | `text-sm` |

### 4.33 Fee履歴ページネーション

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 114 | `pagFeeHistory` | Fee履歴ページネーション | Pagination | — | — | Page 1, API から総ページ数 | — | API response `meta.totalPages` | ページサイズ: 20, 50, 100 |

### 4.34 収益分析ページヘッダー

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 115 | `lblAnalyticsTitle` | ページタイトル | Static Label (`<h1>`) | String | — | 表示。テキスト: "Revenue Analytics" | — | i18n key: `admin.ads.revenueAnalytics` | `text-2xl font-bold` |
| 116 | `btnBackToAdsFromAnalytics` | 広告一覧へ戻る | Button (`text`) | — | — | 表示。テキスト: "← Back to Ads" | — | — | `/admin/ads` に遷移 |

### 4.35 収益分析フィルター

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 117 | `dateRangeAnalytics` | 日付範囲ピッカー | Date Range Picker | Date Range | Yes | 初期値: 過去30日 | 有効な日付範囲、最大365日 | — | i18n key: `admin.ads.dateRange` |
| 118 | `selAnalyticsPlacement` | 配置場所フィルタ | Multi-Select | Array[Enum] | No | 空欄（全件） | オプション: Homepage Banner, Product Sidebar, Category Banner, Search Top | — | i18n key: `admin.ads.filterByPlacement` |
| 119 | `selAnalyticsTier` | ティアフィルタ | Multi-Select | Array[Enum] | No | 空欄（全件） | オプション: Basic, Standard, Premium | — | i18n key: `admin.ads.filterByTier` |

### 4.36 サマリーメトリクス

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 120 | `statTotalRevenue` | 総収益カード | Stats Card | Decimal | — | 読み込み時に取得 | — | `SUM(ad_payments.amount)` where `ad_payments.payment_status = 'completed'`, 広告 `approval_status = 'approved'`, 対象日付範囲内 | 集計条件固定: 決済完了 + 承認済み広告 + 指定範囲 |
| 121 | `statTotalAdsApproved` | 承認済み広告数カード | Stats Card | Integer | — | 読み込み時に取得 | — | 同条件で承認済み広告数を集計 | — |
| 122 | `statTotalFeesCollected` | 回収手数料合計カード | Stats Card | Decimal | — | 読み込み時に取得 | — | `SUM(ad_payments.amount)` for completed payments linked to approved ads in selected date range | 通貨ローカライズ |
| 123 | `statAvgRevenuePerAd` | 広告あたり平均収益カード | Stats Card | Decimal | — | 読み込み時に取得 | — | `totalRevenue / totalAds` using same conditions | 通貨ローカライズ |
| 124 | `statTotalRefunds` | 返金合計カード | Stats Card | Decimal | — | 読み込み時に取得 | — | `SUM(refunded amounts)` | ローカライズ通貨 |

### 4.37 チャート

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 125 | `chartRevenueByPlacement` | 配置場所別収益チャート | Bar Chart | Array | — | 読み込み時に取得 | — | `GROUP BY ad_fee_settings.placement` after applying completed-payment, approved-ad, and selected-date-range conditions | 配置場所ごとの収益内訳 |
| 126 | `chartRevenueByTier` | ティア別収益チャート | Bar Chart | Array | — | 読み込み時に取得 | — | same conditions | ティアごとの収益内訳 |
| 127 | `chartRevenueTrend` | 収益トレンドチャート | Line Chart | Array | — | 読み込み時に取得 | — | `GROUP BY payment date` after same conditions | 日次/週次で収益を表示 |

### 4.38 データテーブル — 分析

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 128 | `tblAdsByPlacement` | 配置場所別広告テーブル | Data Table | Array | — | 読み込み時に取得 | — | `GROUP BY ad_fee_settings.placement` based on same conditions | 列: Placement, Ad Count, Total Revenue, Avg CTR |
| 129 | `tblAdsByTier` | ティア別広告テーブル | Data Table | Array | — | 読み込み時に取得 | — | `GROUP BY ad_fee_settings.tier` based on same conditions | 列: Tier, Ad Count, Total Revenue, Avg CTR |

### 4.39 エクスポートレポートページヘッダー

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 130 | `lblExportTitle` | ページタイトル | Static Label (`<h1>`) | String | — | 表示。テキスト: "Export Reports" | — | i18n key: `admin.ads.exportReports` | `text-2xl font-bold` |
| 131 | `btnBackToAdsFromExport` | 広告一覧へ戻る | Button (`text`) | — | — | 表示。テキスト: "← Back to Ads" | — | — | `/admin/ads` に遷移 |

### 4.40 レポート種別選択

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 132 | `cardAdPerformance` | 広告パフォーマンスカード | Card (selectable) | — | — | 選択可能 | — | — | "Ad Performance Report — Impressions, clicks, CTR, revenue per ad" |
| 133 | `cardSubmissionHistory` | 提出履歴カード | Card (selectable) | — | — | 選択可能 | — | — | "Shop Submission History — All ad submissions, statuses, outcomes" |
| 134 | `cardFeeHistory` | Fee履歴カード | Card (selectable) | — | — | 選択可能 | — | — | "Fee History Log — All fee setting changes with timestamps and reasons" |

### 4.41 エクスポート設定

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 135 | `dateRangeExport` | 日付範囲ピッカー | Date Range Picker | Date Range | Yes | 空欄 | 有効な範囲、最大365日 | — | i18n key: `admin.ads.dateRange` |
| 136 | `selExportPlacement` | 配置場所フィルタ | Multi-Select | Array[Enum] | No | 空欄（全件） | オプション: Homepage Banner, Product Sidebar, Category Banner, Search Top | — | i18n key: `admin.ads.filterByPlacement` |
| 137 | `selExportTier` | ティアフィルタ | Multi-Select | Array[Enum] | No | 空欄（全件） | オプション: Basic, Standard, Premium | — | i18n key: `admin.ads.filterByTier` |
| 138 | `selExportStatus` | ステータスフィルタ | Multi-Select | Array[Enum] | No | 空欄（全件） | オプション: Pending, Approved, Rejected | — | i18n key: `admin.ads.filterByStatus`。広告パフォーマンスと提出履歴用 |
| 139 | `txtExportShopFilter` | 店舗フィルタ | Input (`text`) | String(255) | No | 空欄。プレースホルダー: "Filter by shop..." | MaxLength: 255 | — | i18n key: `admin.ads.filterByShop`。提出履歴用 |
| 140 | `radExportFormat` | 形式選択 | Radio Group | Enum | Yes | 初期値: CSV | オプション: CSV | — | i18n key: `admin.ads.exportFormat`。CSV のみ対応 |
| 141 | `btnGenerateExport` | レポート生成ボタン | Button (`primary`) | — | — | 表示。テキスト: "Generate Report" | — | — | i18n key: `admin.ads.generateExport`。日付範囲必須 |
| 142 | `lblEstimatedRows` | 見積行数テキスト | Static Label | String | — | "Estimated {n} rows" | — | — | フィルタ適用後に表示 |

### 4.42 最近のエクスポートテーブル

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 143 | `lblExportType` | レポート種別 | Static Label | String | — | DBから取得 | — | `export_jobs.report_type` | — |
| 144 | `lblExportFormat` | 形式 | Static Label | String | — | "CSV" | — | — | — |
| 145 | `lblExportDateRange` | 日付範囲 | Static Label | String | — | DBから取得 | — | `export_jobs.date_from`, `export_jobs.date_to` | — |
| 146 | `badgeExportStatus` | ステータスバッジ | Badge | Enum | — | 黄 (Processing), 緑 (Ready), 赤 (Failed), 灰 (Expired) | — | `export_jobs.status` | 標準ステータス色 |
| 147 | `btnDownloadExport` | ダウンロードボタン | Button (`outline`) | — | — | status = "ready" の場合に表示 | — | — | ファイルダウンロードを実行 |

---

## 5. 各項目の挙動とイベント仕様

### 5.1 広告一覧画面の挙動

| 項目ID | 発火イベント | 処理ロジック | 例外処理 |
| :--- | :--- | :--- | :--- |
| `btnManagePackages` | Click | `/admin/ads/packages` に遷移 | ナビゲーション失敗時にトースト表示 |
| `btnRevenueAnalytics` | Click | `/admin/ads/analytics` に遷移 | ナビゲーション失敗時にトースト表示 |
| `btnExport` | Click | `/admin/ads/export` に遷移 | ナビゲーション失敗時にトースト表示 |
| `selStatusFilter` | Change | クエリパラメータを更新し、新しいフィルタで広告一覧を再取得 | API失敗時にトースト表示 |
| `selPlacementFilter` | Change | クエリパラメータを更新し、新しいフィルタで再取得 | API失敗時にトースト表示 |
| `selTierFilter` | Change | クエリパラメータを更新し、再取得 | API失敗時にトースト表示 |
| `txtShopSearch` | Input (300ms debounce) | クエリパラメータを更新し、検索語で再取得 | API失敗時にトースト表示 |
| `dateRangeFilter` | Change | クエリパラメータ更新、日付範囲で再取得 | API失敗時にトースト表示 |
| `chkSelectAllAds` | Change | すべての行チェックボックスを切り替え。一括操作バーの件数更新 | — |
| `chkSelectAd` | Change | 行チェックボックスを切り替え。一括操作バーの件数更新、ボタン有効/無効制御 | — |
| `btnReviewAd` | Click | 広告IDで詳細取得し、審査モーダルを開く | 広告未発見時にトースト表示 |
| `btnViewAd` | Click | 広告IDで詳細取得し、閲覧専用の審査モーダルを開く | 広告未発見時にトースト表示 |
| `btnBulkApprove` | Click | 選択数 > 0 を確認し、一括承認モーダルを開く | 選択がない場合は警告トースト |
| `btnBulkReject` | Click | 選択数 > 0 を確認し、一括却下モーダルを開く | 選択がない場合は警告トースト |
| `btnClearSelection` | Click | すべてのチェックボックスを解除し、一括操作バーリセット | — |
| `pagAds` | Page change | ページクエリ更新し、広告一覧再取得 | API失敗時にトースト表示 |

### 5.2 審査モーダルの挙動

| 項目ID | 発火イベント | 処理ロジック | 例外処理 |
| :--- | :--- | :--- | :--- |
| `btnCloseReviewModal` | Click / Escape | モーダルを閉じ、フォーム状態を初期化 | — |
| `btnApproveAd` | Click | 広告が PENDING か検証し、`POST /api/v1/admin/ads/:id/approve` を呼ぶ。モーダル閉じ、一覧更新、成功トースト表示 | 広告が PENDING でない場合はエラー。API失敗時はトースト |
| `btnRejectAd` | Click | 却下確認アラート表示、理由入力表示、理由必須確認後 `POST /api/v1/admin/ads/:id/reject` を実行、モーダル閉じ、一覧更新、成功トースト表示 | 理由なしならバリデーションエラー、API失敗時はトースト |
| `btnCancelReview` | Click | モーダルを閉じ、フォーム状態を初期化 | — |
| `txtRejectionReason` | Input | 却下理由状態を更新し、文字数カウントを表示 | — |

### 5.3 一括却下モーダルの挙動

| 項目ID | 発火イベント | 処理ロジック | 例外処理 |
| :--- | :--- | :--- | :--- |
| `btnCloseBulkRejectModal` | Click / Escape | モーダルを閉じ、フォーム状態を初期化 | — |
| `btnConfirmBulkReject` | Click | 理由が空でないことを確認し、`POST /api/v1/admin/ads/bulk/reject` に IDs と理由を送信、モーダル閉じ、一覧更新、成功トースト、選択解除 | 理由未入力ならバリデーションエラー、API失敗時はトースト |
| `btnCancelBulkReject` | Click | モーダルを閉じ、フォーム状態を初期化 | — |
| `txtBulkRejectReason` | Input | 却下理由の状態を更新し、文字数カウントを表示 | — |

### 5.4 一括承認モーダルの挙動

| 項目ID | 発火イベント | 処理ロジック | 例外処理 |
| :--- | :--- | :--- | :--- |
| `btnCloseBulkApproveModal` | Click / Escape | モーダル閉じる | — |
| `btnConfirmBulkApprove` | Click | `POST /api/v1/admin/ads/bulk/approve` に IDs を送信、モーダル閉じ、一覧更新、成功トースト、選択解除 | API失敗時にトースト |
| `btnCancelBulkApprove` | Click | モーダル閉じる | — |

### 5.5 パッケージとFee管理の挙動

| 項目ID | 発火イベント | 処理ロジック | 例外処理 |
| :--- | :--- | :--- | :--- |
| `btnBackToAdsFromPackages` | Click | `/admin/ads` に遷移 | ナビゲーション失敗時はトースト |
| `btnViewFeeHistory` | Click | `/admin/ads/fee-history` に遷移 | ナビゲーション失敗時はトースト |
| `btnCreateFeeSetting` | Click | Fee作成モーダルを開く | — |
| `btnEditFee` | Click | Fee設定詳細取得し、編集モーダルを開く | 設定未発見時にトースト |
| `btnDeactivateFee` | Click | 無効化確認モーダルを開く | — |
| `btnSaveFee` | Click | 必須項目を検証し、`PUT /api/v1/admin/ad-fees/:id` を要求。モーダル閉じ、Fee一覧更新、成功トースト表示 | バリデーション失敗はインライン表示、API失敗時はトースト |
| `btnCreateFee` | Click | 必須項目検証、重複チェック（placement+tier）後 `POST /api/v1/admin/ad-fees`、モーダル閉じ、Fee一覧更新、成功トースト | 重複時やAPI失敗時にトースト |
| `btnConfirmDeactivateFee` | Click | `PATCH /api/v1/admin/ad-fees/:id/deactivate` を呼ぶ。モーダル閉じ、Fee一覧更新、成功トースト | API失敗時にトースト |
| `btnCancelEditFee` / `btnCancelCreateFee` / `btnCancelDeactivateFee` | Click | モーダルを閉じ、フォーム状態を初期化 | — |

### 5.6 Fee変更履歴の挙動

| 項目ID | 発火イベント | 処理ロジック | 例外処理 |
| :--- | :--- | :--- | :--- |
| `btnBackToPackages` | Click | `/admin/ads/packages` に遷移 | ナビゲーション失敗時にトースト |
| `selHistoryPlacementFilter` | Change | クエリパラメータ更新し履歴再取得 | API失敗時にトースト |
| `selHistoryTierFilter` | Change | クエリパラメータ更新し履歴再取得 | API失敗時にトースト |
| `pagFeeHistory` | Page change | ページ更新し履歴再取得 | API失敗時にトースト |

### 5.7 収益分析の挙動

| 項目ID | 発火イベント | 処理ロジック | 例外処理 |
| :--- | :--- | :--- | :--- |
| `btnBackToAdsFromAnalytics` | Click | `/admin/ads` に遷移 | ナビゲーション失敗時にトースト |
| `dateRangeAnalytics` | Change | 新しい日付範囲で分析データを再取得 | API失敗時にトースト |
| `selAnalyticsPlacement` | Change | 配置場所フィルタを反映し、分析データ再取得 | API失敗時にトースト |
| `selAnalyticsTier` | Change | ティアフィルタを反映し、分析データ再取得 | API失敗時にトースト |

### 5.8 エクスポートレポートの挙動

| 項目ID | 発火イベント | 処理ロジック | 例外処理 |
| :--- | :--- | :--- | :--- |
| `btnBackToAdsFromExport` | Click | `/admin/ads` に遷移 | ナビゲーション失敗時にトースト |
| `cardAdPerformance` | Click | レポート種別を選択し状態更新 | — |
| `cardSubmissionHistory` | Click | レポート種別を選択し状態更新 | — |
| `cardFeeHistory` | Click | レポート種別を選択し状態更新 | — |
| `btnGenerateExport` | Click | レポート種別と日付範囲を検証し、該当エンドポイントを呼ぶ。`POST /api/v1/admin/ads/export/ad-performance`、`/submission-history`、または `/fee-history`。推定行数と成功トーストを表示 | 必須未入力時はバリデーション、API失敗時にトースト |
| `btnDownloadExport` | Click | Blob URL からファイルダウンロードを実行 | 期限切れまたは見つからない場合はトースト |

---

## 6. バリデーションとエラー処理マッピング

### 6.1 広告審査バリデーション

| フィールド | ルール | エラーメッセージ（EN） | エラーメッセージ（JA） |
| :--- | :--- | :--- | :--- |
| `rejection_reason` | 却下時は必須 | "Rejection reason is required" | "却下理由は必須です" |
| `rejection_reason` | MaxLength: 1000 | "Rejection reason must not exceed 1000 characters" | "却下理由は1000文字以内で入力してください" |

### 6.2 一括却下バリデーション

| フィールド | ルール | エラーメッセージ（EN） | エラーメッセージ（JA） |
| :--- | :--- | :--- | :--- |
| `rejection_reason` | 必須 | "Rejection reason is required" | "却下理由は必須です" |
| `rejection_reason` | MaxLength: 1000 | "Rejection reason must not exceed 1000 characters" | "却下理由は1000文字以内で入力してください" |
| `ad_ids` | Min length: 1 | "Select at least one advertisement" | "少なくとも1つの広告を選択してください" |

### 6.3 Fee設定バリデーション

| フィールド | ルール | エラーメッセージ（EN） | エラーメッセージ（JA） |
| :--- | :--- | :--- | :--- |
| `placement` | 必須、有効なenum | "Placement is required" / "Invalid placement" | "配置場所は必須です" / "無効な配置場所です" |
| `tier` | 必須、有効なenum | "Tier is required" / "Invalid tier" | "ティアは必須です" / "無効なティアです" |
| `daily_rate` | 必須、`@Min(0.01)` | "Daily rate must be greater than 0" | "日額料金は0より大きい必要があります" |
| `duration_days` | 必須、`@Min(1)` | "Duration must be at least 1 day" | "期間は最低1日である必要があります" |
| `max_ads` | 必須、`@Min(1)` | "Max ads must be at least 1" | "最大広告数は最低1である必要があります" |
| `effective_from` | 必須、有効な日付 | "Effective date is required" | "適用開始日は必須です" |
| `change_reason` | 必須、MaxLength: 1000 | "Change reason is required" | "変更理由は必須です" |
| 重複 | placement+tier の既存アクティブ設定禁止 | "A fee setting already exists for this placement and tier" | "この配置場所とティアのfee設定は既に存在します" |

### 6.4 エクスポートバリデーション

| フィールド | ルール | エラーメッセージ（EN） | エラーメッセージ（JA） |
| :--- | :--- | :--- | :--- |
| `reportType` | 必須、有効なenum | "Report type is required" / "Invalid report type" | "レポート種別は必須です" / "無効なレポート種別です" |
| `dateFrom` | 必須、有効な日付 | "Start date is required" | "開始日は必須です" |
| `dateTo` | 必須、`>= dateFrom`、最大365日 | "End date is required" / "End date must be after start date" / "Date range cannot exceed 365 days" | "終了日は必須です" / "終了日は開始日より後である必要があります" / "日付範囲は365日を超えることはできません" |
| `format` | 必須、有効なenum | "Export format is required" / "Invalid format" | "エクスポート形式は必須です" / "無効な形式です" |

### 6.5 標準エラー応答形式

```json
{
  "statusCode": 400,
  "message": ["error detail"],
  "error": "Bad Request",
  "timestamp": "2026-08-26T12:00:00.000Z",
  "path": "/api/v1/admin/ads/abc123/approve"
}
```

---

## 7. データベース項目マッピング

### 7.1 Advertisements テーブル

| UI要素 | DB列 | 型 | 備考 |
| :--- | :--- | :--- | :--- |
| `lblShopName` | `shops.name` | VARCHAR(255) | `shop_id` で JOIN |
| `lblAdTitle` | `advertisements.title` | VARCHAR(255) | — |
| `lblPlacement` | `ad_fee_settings.placement` | VARCHAR(50) | Enum: `homepage_banner`, `product_sidebar`, `category_banner`, `search_top` |
| `lblTier` | `ad_fee_settings.tier` | VARCHAR(20) | Enum: `basic`, `standard`, `premium` |
| `badgeAdStatus` | `advertisements.approval_status` | VARCHAR(20) | Enum: `pending`, `approved`, `rejected` |
| `badgePaymentStatus` | `advertisements.payment_status` | VARCHAR(20) | Enum: `pending`, `completed`, `refunded` |
| `lblSubmittedAt` | `advertisements.created_at` | TIMESTAMP | — |
| `lblFee` | `advertisements.payment_amount` | DECIMAL(10,2) | — |
| `imgAdBanner` | `advertisements.image_url` | TEXT | — |
| `lblAdMessage` | `advertisements.announcement_message` | VARCHAR(500) | — |
| `lblAdLinkUrl` | `advertisements.link_url` | TEXT | — |
| `lblAdContent` | `advertisements.content` | TEXT | — |
| `lblAdSchedule` | `advertisements.starts_at`, `advertisements.expires_at` | TIMESTAMPTZ | — |
| `txtRejectionReason` | `advertisements.rejection_reason` | TEXT | — |

### 7.2 Ad Payments テーブル

| UI要素 | DB列 | 型 | 備考 |
| :--- | :--- | :--- | :--- |
| `lblFeePaid` | `ad_payments.amount` | DECIMAL(10,2) | — |
| `badgePaymentStatusDetail` | `ad_payments.payment_status` | VARCHAR(20) | Enum: `pending`, `completed`, `refunded` |

### 7.3 Ad Fee Settings テーブル

| UI要素 | DB列 | 型 | 備考 |
| :--- | :--- | :--- | :--- |
| `lblFeePlacement` | `ad_fee_settings.placement` | VARCHAR(50) | Enum: `homepage_banner`, `product_sidebar`, `category_banner`, `search_top` |
| `badgeFeeTier` | `ad_fee_settings.tier` | VARCHAR(20) | Enum: `basic`, `standard`, `premium` |
| `lblDailyRate` | `ad_fee_settings.daily_rate` | DECIMAL(10,2) | — |
| `lblDuration` | `ad_fee_settings.duration_days` | INTEGER | — |
| `lblMaxAds` | `ad_fee_settings.max_ads` | INTEGER | — |
| `badgeFeeStatus` | `ad_fee_settings.is_active` | BOOLEAN | — |

### 7.4 Ad Fee History テーブル

| UI要素 | DB列 | 型 | 備考 |
| :--- | :--- | :--- | :--- |
| `lblHistoryDate` | `ad_fee_history.created_at` | TIMESTAMP | — |
| `lblHistoryPlacement` | `ad_fee_history.placement` | VARCHAR(50) | — |
| `badgeHistoryTier` | `ad_fee_history.tier` | VARCHAR(20) | — |
| `lblOldRate` | `ad_fee_history.old_daily_rate` | DECIMAL(10,2) | — |
| `lblNewRate` | `ad_fee_history.new_daily_rate` | DECIMAL(10,2) | — |
| `lblChangedBy` | `ad_fee_history.changed_by` | UUID | FK → `users.id` |
| `lblReason` | `ad_fee_history.change_reason` | TEXT | — |

---

## 8. APIレスポンスマッピング

### 8.1 広告一覧成功レスポンス

```json
{
  "data": [
    {
      "id": "clxAd001",
      "shopId": "clxShop001",
      "shopName": "Glow Skincare",
      "title": "Summer Sale Banner",
      "placement": "homepage_banner",
      "tier": "standard",
      "approvalStatus": "pending",
      "paymentStatus": "completed",
      "paymentAmount": 35.00,
      "imageUrl": "https://cdn.example.com/ads/banner1.jpg",
      "announcementMessage": "Summer Sale 50% Off",
      "linkUrl": "https://example.com/sale",
      "content": "Description text...",
      "startsAt": "2026-09-01T00:00:00.000Z",
      "expiresAt": "2026-09-07T23:59:59.999Z",
      "rejectionReason": null,
      "approvedBy": null,
      "approvedAt": null,
      "createdAt": "2026-08-25T10:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### 8.2 広告承認成功レスポンス

```json
{
  "data": {
    "id": "clxAd001",
    "approvalStatus": "approved",
    "approvedBy": "clxAdmin001",
    "approvedAt": "2026-08-26T12:00:00.000Z",
    "updatedAt": "2026-08-26T12:00:00.000Z"
  }
}
```

### 8.3 広告却下成功レスポンス

```json
{
  "data": {
    "id": "clxAd001",
    "approvalStatus": "rejected",
    "rejectionReason": "Violates advertising policy",
    "updatedAt": "2026-08-26T12:00:00.000Z"
  }
}
```

### 8.4 一括承認成功レスポンス

```json
{
  "data": {
    "approved": 5,
    "failed": 0,
    "results": [
      { "id": "clxAd001", "approvalStatus": "approved" },
      { "id": "clxAd002", "approvalStatus": "approved" }
    ]
  }
}
```

### 8.5 一括却下成功レスポンス

```json
{
  "data": {
    "rejected": 5,
    "failed": 0,
    "refundsProcessed": 5,
    "results": [
      { "id": "clxAd001", "approvalStatus": "rejected", "refundStatus": "processed" },
      { "id": "clxAd002", "approvalStatus": "rejected", "refundStatus": "processed" }
    ]
  }
}
```

### 8.6 Fee設定成功レスポンス

```json
{
  "data": [
    {
      "id": "clxFee001",
      "placement": "homepage_banner",
      "tier": "standard",
      "dailyRate": 5.00,
      "durationDays": 7,
      "maxAds": 1,
      "isActive": true,
      "createdAt": "2026-08-20T10:00:00.000Z"
    }
  ]
}
```

### 8.7 収益分析成功レスポンス

```json
{
  "data": {
    "summary": {
      "totalRevenue": 12500.00,
      "totalAdsApproved": 45,
      "totalFeesCollected": 8200.00,
      "avgRevenuePerAd": 277.78,
      "totalRefunds": 1200.00
    },
    "byPlacement": [
      {
        "placement": "homepage_banner",
        "placementName": "Homepage Banner",
        "adCount": 20,
        "revenue": 5500.00,
        "avgCtr": 3.2
      }
    ],
    "byTier": [
      {
        "tier": "premium",
        "tierName": "Premium",
        "adCount": 10,
        "revenue": 4500.00,
        "avgCtr": 4.1
      }
    ],
    "trend": [
      {
        "date": "2026-08-25",
        "revenue": 450.00,
        "adCount": 5
      }
    ]
  }
}
```

### 8.8 Fee変更履歴成功レスポンス

```json
{
  "data": [
    {
      "id": "clxFeeHist001",
      "placement": "homepage_banner",
      "tier": "standard",
      "oldDailyRate": 4.00,
      "newDailyRate": 5.00,
      "changedBy": "clxAdmin001",
      "changedByName": "Admin User",
      "reason": "Annual rate adjustment",
      "createdAt": "2026-08-25T10:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 80,
    "totalPages": 4
  }
}
```

### 8.9 エクスポートジョブ成功レスポンス

```json
{
  "data": {
    "id": "clxExport001",
    "reportType": "ad_performance",
    "format": "csv",
    "status": "processing",
    "estimatedRows": 150,
    "createdAt": "2026-08-26T12:00:00.000Z"
  }
}
```

---

## 9. i18nキー一覧（重要）

### 9.1 管理者広告管理（ja）

| Key | Value |
| :--- | :--- |
| `admin.ads.title` | "広告管理" |
| `admin.ads.managePackages` | "パッケージ管理" |
| `admin.ads.revenueAnalytics` | "収益分析" |
| `admin.ads.export` | "エクスポート" |
| `admin.ads.filterByStatus` | "ステータス" |
| `admin.ads.filterByPlacement` | "配置場所" |
| `admin.ads.filterByTier` | "ティア" |
| `admin.ads.searchShop` | "店舗を検索..." |
| `admin.ads.filterByDate` | "日付範囲" |
| `admin.ads.selectedCount` | "{n} 件の広告を選択中" |
| `admin.ads.reviewAd` | "広告を確認" |
| `admin.ads.rejectionReason` | "却下理由" |
| `admin.ads.approve` | "承認" |
| `admin.ads.reject` | "却下" |
| `admin.ads.cancel` | "キャンセル" |
| `admin.ads.bulkRejectTitle` | "広告を一括却下" |
| `admin.ads.bulkApproveTitle` | "広告を一括承認" |
| `admin.ads.packages` | "パッケージ＆Fee管理" |
| `admin.ads.feeHistory` | "Fee変更履歴" |
| `admin.ads.revenueAnalytics` | "収益分析" |
| `admin.ads.exportReports` | "エクスポートレポート" |
| `admin.ads.totalFee` | "合計料金" |
| `admin.ads.feeCalculation` | "日額料金 × 期間 = 合計料金" |
| `admin.ads.rejectWarning` | "この広告は却下され、表示されません。支払額は全額（100%）返金されます。" |
| `admin.ads.refundInfo` | "返金額: {amount}（支払額の100%）" |

---

## 10. 共有コンポーネント

### 10.1 DashboardLayout Component

| 項目 | 内容 |
| :--- | :--- |
| **Location** | `frontend/src/components/layout/DashboardLayout.tsx` |
| **Purpose** | サイドバー付き管理画面共通レイアウト |

### 10.2 DataTable Component

| 項目 | 内容 |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/table.tsx` |
| **Variants** | `default`, `striped` |
| **Usage** | 広告一覧、Fee設定一覧、Fee履歴一覧、エクスポート一覧 |

### 10.3 Badge Component

| 項目 | 内容 |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/badge.tsx` |
| **Variants** | `default`, `secondary`, `destructive`, `outline` |
| **Usage** | 承認/却下/保留ステータス、支払いステータス、ティア表示 |

### 10.4 Dialog Component

| 項目 | 内容 |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/dialog.tsx` |
| **Usage** | 広告審査モーダル、一括承認/却下モーダル、Fee編集/作成/無効化確認モーダル |

### 10.5 Select Component

| 項目 | 内容 |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/select.tsx` |
| **Usage** | ステータスや配置場所、ティアなど選択系入力 |

### 10.6 Pagination Component

| 項目 | 内容 |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/pagination.tsx` |
| **Usage** | ページネーション表示 |

### 10.7 Textarea Component

| 項目 | 内容 |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/textarea.tsx` |
| **Usage** | 却下理由、変更理由の入力 |

### 10.8 DatePicker Component

| 項目 | 内容 |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/date-picker.tsx` |
| **Usage** | 日付範囲フィルター、適用開始日 |

### 10.9 Card Component

| 項目 | 内容 |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/card.tsx` |
| **Usage** | レポート種別カード、分析カード |

---

## 11. 特記事項・UI仕様

- **デザインシステム:** 高級コスメ系テーマ — Primary `#7C3AED`（紫）、Accent `#EC4899`（ピンク）、Secondary `#F3E8FF`（ラベンダー）。
- **ステータスバッジ色:** 承認済み `bg-green-100 text-green-800`、却下済み `bg-red-100 text-red-800`、保留中 `bg-amber-100 text-amber-800`。
- **決済バッジ色:** 完了 `bg-green-100 text-green-800`、保留 `bg-amber-100 text-amber-800`、返金済み `bg-gray-100 text-gray-800`。
- **Feeステータスバッジ色:** 有効 `bg-green-100 text-green-800`、無効 `bg-gray-100 text-gray-800`。
- **レスポンシブ設計:** デスクトップではフルサイドバー、タブレットでは折りたたみ式、モバイルではカード積み重ね。
- **アクセシビリティ:** すべてのコントロールはキーボード操作可能。ARIAラベル必須。エラーは `role="alert"` により通知。
- **パフォーマンス:** 初期ロード時はスケルトンローダーを表示し、非同期処理中はボタンにスピナーを表示し、モーダルは遅延ロードを行う。
- **セキュリティ:** すべての入力は XSS 対策としてサニタイズする。管理者エンドポイントはバージョン別 RBAC で保護する。
- **確認ダイアログ:** 却下、一括却下、Fee 無効化などの破壊的操作には必須。`AlertDialog` コンポーネントを使用する。

---

## 12. 本画面で反映されるビジネスルール

1. 広告パッケージの価格は Fee Setting で定義される（配置場所、ティア、日額料金、期間、最大広告数）。
2. **合計料金 = 日額料金 × 期間日数** が表示される。
3. 加盟店と管理者の両方に、パッケージ選択時と審査モーダルで料金が明確に表示される。
4. 支払い完了と提出後、広告は PENDING 審査状態になる。
5. **PENDING の広告だけが承認・却下可能**。
6. 管理者承認で、指定スケジュール (`starts_at` ~ `expires_at`) に従って表示可能になる。
7. 管理者却下には理由が必須（必須、1000文字以内）。
8. 却下された広告は表示されない。
9. **表示前に管理者が却下した場合、支払済み額は 100% 返金される。**
10. **後続の Fee Setting 更新は、既に購入済みの広告料金には影響しない（Fee Locking Rule）。**
11. Fee Setting の変更は、それ以後に作成される新規広告にだけ適用される。
12. Fee Setting 無効化は、すでにその設定を使って購入済みの広告には影響しない。

---

## 13. 実装前に要確認の事項

以下の項目は、実装前にビジネス確認が必要であり、現時点では未確定として扱う。

| No. | 項目 | 内容 | 状態 |
| :-- | :--- | :--- | :--- |
| 1 | パッケージとFee設定の関係 | 本ドキュメントでは Fee Setting を広告パッケージ定義と扱っている。別途 Package エンティティが必要なら要確認。 | 仮定: Fee Setting = Package |
| 2 | 割引/税/手数料 | 割引、税、サービス手数料の定義がない。 | 未実装 |
| 3 | 支払い保留時の振る舞い | 支払い中の状態（提出前）でのUI動作が未定義。支払い完了・提出されるまでは管理者審査キューに表示しない。 | 未実装 |
| 4 | 最大広告数の定義 | Max Ads が「最大アクティブ広告数」「配置場所単位の最大数」「期間単位の最大数」のどれか未定義。 | 要確認 |
| 5 | 日数計算 | 表示期間が開始日・終了日を含むか（例: 9/1〜9/7 = 7日）を確定する必要がある。 | 要確認 |
| 6 | タイムゾーン | 開始日・終了日・スケジュール表示のタイムゾーン規則が未定義。 | 要確認 |
| 7 | 加盟店取消/返金ルール | 加盟店自身の取消や返金規則が未定義。 | 未実装 |
| 8 | 支払い失敗状態 | 支払い失敗時のUI動作（下書き保存、破棄、特別状態表示等）が未定義。 | 要確認 |

---

## 14. テストチェックリスト

### 14.1 広告一覧ダッシュボードテスト

- [ ] タイトル "Advertisement Management" が表示される
- [ ] 承認待ち件数バッジが正しく表示される
- [ ] パッケージ管理ボタンが Fee設定画面へ遷移する
- [ ] 収益分析ボタンが分析画面へ遷移する
- [ ] エクスポートボタンがエクスポート画面へ遷移する
- [ ] ステータスでフィルタが正しく効く（All, Pending, Approved, Rejected）
- [ ] 配置場所でフィルタが正しく効く
- [ ] ティアでフィルタが正しく効く
- [ ] 店舗名検索が正しく効く
- [ ] 日付範囲フィルタが正しく効く
- [ ] ページネーションが機能する（20 / 50 / 100）
- [ ] 全選択チェックボックスが全行を切り替える
- [ ] 一括操作ボタンが選択時に有効化される
- [ ] 選択がないと一括操作ボタンが無効化される
- [ ] 選択解除ボタンが動作する
- [ ] ステータスバッジが正しいライフサイクル状態を表示する
- [ ] 料金列が正しい金額を表示する

### 14.2 広告審査モーダルテスト

- [ ] モーダルが正しい広告データで開く
- [ ] 店舗情報が正しく表示される（名称、配置場所、ティア）
- [ ] 広告プレビューがバナー、メッセージ、リンクURL、本文を表示する
- [ ] スケジュールが開始日〜終了日で正しく表示される
- [ ] 料金欄が Daily Rate, Duration, Total Fee を表示する
- [ ] 支払料金が実際の支払額を表示する
- [ ] 決済状態バッジが正しい状態を表示する
- [ ] 料金固定ルールが満たされる（購入時のレートを表示）
- [ ] 承認ボタンが正しく送信される（PENDING のみ）
- [ ] 却下ボタンが却下確認アラートを表示する
- [ ] 却下確認が「表示されない + 100%返金」を説明する
- [ ] 理由付きで却下が成功する
- [ ] 理由なしで却下するとバリデーションエラーが出る
- [ ] 却下後に返金情報が表示される
- [ ] キャンセルボタンでモーダルが閉じる
- [ ] Esc キーでモーダルが閉じる
- [ ] X ボタンでモーダルが閉じる

### 14.3 一括承認モーダルテスト

- [ ] 正しい件数でモーダルが開く
- [ ] 確認メッセージが正しい数を表示する
- [ ] 承認確認ボタンが正常に送信される
- [ ] キャンセルボタンが閉じる
- [ ] Esc キーで閉じる

### 14.4 一括却下モーダルテスト

- [ ] 正しい件数でモーダルが開く
- [ ] 警告メッセージが「非表示 + 100%返金」を表示する
- [ ] 返金情報が正しく表示される
- [ ] 理由未入力で却下ボタンが無効化される
- [ ] 理由ありで送信に成功する
- [ ] 理由なしでバリデーションエラーが出る
- [ ] キャンセルボタンで閉じる
- [ ] Esc キーで閉じる

### 14.5 パッケージ & Fee管理テスト

- [ ] 画面タイトルが正しい
- [ ] Fee設定表が正しく表示される
- [ ] 合計料金が `日額料金 × 期間` で算出される
- [ ] ステータスバッジが正しく表示される
- [ ] Fee設定作成ボタンで作成モーダルが開く
- [ ] 編集ボタンで事前入力済みの編集モーダルが開く
- [ ] 無効化ボタンが確認モーダルを開く
- [ ] 無効化警告が既存広告の料金固定を説明する
- [ ] 正しいデータで作成が成功する
- [ ] 重複 placement+tier でエラーが出る
- [ ] 正しいデータで編集が成功する
- [ ] 無効化が成功する
- [ ] 広告一覧へ戻る遷移が正しい
- [ ] 履歴表示へ遷移が正しい

### 14.6 Fee変更履歴テスト

- [ ] タイトルが正しく表示される
- [ ] 履歴テーブルが正しく表示される
- [ ] 配置場所でフィルタが効く
- [ ] ティアでフィルタが効く
- [ ] ページネーションが正しく動く
- [ ] パッケージ管理に戻る遷移が正しい

### 14.7 収益分析テスト

- [ ] タイトルが正しく表示される
- [ ] 日付範囲フィルタが正しく効く
- [ ] 配置場所フィルタが正しく効く
- [ ] ティアフィルタが正しく効く
- [ ] サマリーメトリクスが正しく表示される
- [ ] 返金合計カードが返金額を表示する
- [ ] 配置場所別収益チャートが描画される
- [ ] ティア別収益チャートが描画される
- [ ] 収益トレンドチャートが描画される
- [ ] データテーブルが正しく表示される
- [ ] 広告一覧へ戻る遷移が正しい

### 14.8 エクスポートレポートテスト

- [ ] タイトルが正しく表示される
- [ ] レポート種別カードが選択できる
- [ ] Ad Performance カードが選択される
- [ ] Submission History カードが選択される
- [ ] Fee History カードが選択される
- [ ] 日付範囲フィルタが正しく効く
- [ ] 配置場所フィルタが正しく効く
- [ ] ティアフィルタが正しく効く
- [ ] ステータスフィルタが正しく効く
- [ ] 店舗検索が正しく効く
- [ ] 形式選択で CSV のみ表示される
- [ ] レポート生成ボタンが必須項目を検証する
- [ ] フィルタ適用後に見積行数が表示される
- [ ] 最近のエクスポートテーブルが正しく表示される
- [ ] status が ready のとき Download が動作する
- [ ] 広告一覧へ戻る遷移が正しい

### 14.9 エラーハンドリングテスト

- [ ] 403 Forbidden で "You do not have permission" を表示する
- [ ] 404 Not Found で "Advertisement not found" を表示する
- [ ] 409 Conflict で "Already approved/rejected" を表示する
- [ ] 500 Server Error で一般エラーメッセージを表示する
- [ ] ネットワークエラーで接続エラーを表示する
- [ ] バリデーションエラーがフィールドに対してインライン表示される

### 14.10 i18nテスト

- [ ] 英語で正しく表示される
- [ ] 日本語で正しく表示される
- [ ] ミャンマー語で正しく表示される
- [ ] 言語切替でラベルが切り替わる
- [ ] エラーメッセージが選択言語で表示される
- [ ] 新規文字列（rejectWarning, totalFee, refundInfo）が正しく表示される

### 14.11 レスポンシブデザインテスト

- [ ] Desktop: フルサイドバー + テーブル
- [ ] Tablet: 折りたたみ式サイドバー + レスポンシブテーブル
- [ ] Mobile: スタックカード配置（管理者モバイルは主対象ではない）
- [ ] モーダルがすべてのブレークポイントで表示可能

### 14.12 アクセシビリティテスト

- [ ] すべてのコントロールがキーボード操作可能
- [ ] すべての操作要素に ARIA ラベルがある
- [ ] エラーが `role="alert"` で通知される
- [ ] カラーコントラストが WCAG 2.1 AA を満たす
- [ ] すべての操作要素にフォーカスインジケータがある

---

*画面項目設計書（Admin Ad Management） 終了*
