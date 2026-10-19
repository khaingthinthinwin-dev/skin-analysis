# 画面項目設計書（Screen Items Specification）— 管理者広告管理

**ドキュメントID:** SKM-SIS-ADM-001  
**対象画面:** 管理者広告管理（Admin Ad Management）  
**サブシステム:** 広告管理 — 管理者による審査、手数料管理、分析、エクスポート  
**機能ID:** FN-ADM-001  
**バージョン:** 2.0  
**作成日:** 2026-08-26  
**最終更新日:** 2026-10-15  
**作成者:** Software Architect  
**レビュー状態:** Released（承認済み）  
**分類:** Internal — Engineering Division

---

## 1. ドキュメント管理

### 1.1 改訂履歴

| 版 | 日付 | 作成者 | 変更内容 |
| :--- | :--- | :--- | :--- |
| 1.0 | 2026-08-26 | Software Architect | 管理者広告管理画面の初版作成。 |
| 1.1 | 2026-08-27 | Software Architect | 業務フロー整合性を反映。パッケージ/料金設定の関係を明確化、料金計算ルールを追加、審査モーダルを補強。 |
| 1.2 | 2026-08-28 | Software Architect | 管理者ルート、審査API、料金設定API、レポート用エクスポートAPI、広告DB列名を最新仕様に整合。 |
| 2.0 | 2026-10-15 | Software Architect | **実装コードに合わせて全篇書き直し。** 配置場所enum、i18nキー、コンポーネント構造、テーブル列、モーダルレイアウト、フィルターコントロール、ページネーション、バッジスタイル、レスポンシブブレークポイントを反映済みコードに更新。 |

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

広告システムは収益の中核機能であり、広告パッケージは Fee Setting により定義される。各 Fee Setting は掲載場所、ティア、日額料金、期間、最大広告数で構成され、加盟店は利用可能なパッケージを選択する。システムは料金を以下の計算ルールで算出する: **料金合計 = 日額料金 × 期間日数**。支払い完了後、広告は PENDING 審査状態となる。広告の承認・却下は管理者のみが実行可能である。承認済み広告はスケジュールに従って掲載対象となり、却下された広告は非表示になり、支払い済み額は全額返金される。

### 2.2 対象ユーザーと権限

| 属性 | 内容 |
| :--- | :--- |
| **主な利用者** | プラットフォーム管理者（管理者） |
| **必要認証** | `admin` 権限を持つ JWT Bearer Token |
| **データ範囲** | すべての広告、すべての料金設定、すべての支払データ、プラットフォーム全体の収益情報 |
| **アクセス制御** | 保護ルート — `JwtAuthGuard` + `RolesGuard` (`admin`) |

### 2.3 主な機能と設計方針
1. 広告審査と承認 — 保留中の加盟店広告を確認し、個別に承認または却下し、承認者情報（approved_by, approved_at）を保持する。
2. 一括承認/却下 — チェックボックスで複数の保留中広告を選択し、単一の一括処理で承認または却下する。最大50件まで。
3. パッケージと手数料管理 — 掲載場所とティアごとに手数料設定を作成・編集・有効化/無効化し、変更履歴を日時、変更前後、理由とともに記録する。最大12パッケージ（4掲載場所 × 3ティア）。
4. 手数料計算表示 — 広告選択時と審査モーダルで、計算された合計料金（日額 × 期間日数）を表示する。
5. 料金固定ルール — 加盟店がパッケージを購入して料金が確定した後は、その支払額が固定され、後続の料金設定変更で変動しない。
6. 料金変更履歴 — 価格変更の全履歴を監査証跡として記録する。当月の履歴は削除保護。
7. 収益内訳分析 — 配置場所とティア別に収益を分解し、円グラフ・折れ線グラフ・サマリーメトリクスを表示する。
8. エクスポート — 広告パフォーマンス、店舗提出履歴、手数料履歴を CSV 形式で直接ダウンロードする。
9. リアルタイムフィードバック — すべての審査アクションに対してトースト通知を表示する。
10. 確認ダイアログ — 却下、一括却下、Fee 設定無効化、履歴削除などの破壊的操作には必ず確認ダイアログを表示する。
11. ページネーションとフィルタリング — サーバーサイドページネーションと複数条件の絞り込み。デフォルトページサイズ10、選択肢 10/20/50/100。
12. 国際化 — EN、JA、MY の i18n を完全に対応する。
13. 通知ディープリンク — 広告一覧は `?highlightAdId=` URLパラメーターにより、特定の広告行を紫色の枠線でハイライトし、「新着」バッジを3秒間表示。

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
管理者が複数広告を選択（PENDING のみ、最大50件）
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
│  │   タイトル: "広告管理"                           │   │
│  │   サブタイトル: "出品者の広告を確認し、         │   │
│  │                   広告料金を管理します"         │   │
│  │   [Pending Count Badge] [プランを管理]          │   │
│  │   [収益分析] [エクスポート]                      │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [B] FILTER BAR                      │   │
│  │   [店舗を検索...] [ステータス ▼] [掲載枠 ▼]     │   │
│  │   [プラン ▼] [日付範囲 From/To] [リセット]      │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [C] BULK ACTION BAR                │   │
│  │   (選択時のみ表示)                               │   │
│  │   {n}件の広告を選択中 | [クリア]                  │   │
│  │   [すべて承認] [すべて却下]                      │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [D] ADS TABLE                       │   │
│  │   ☐ | 店舗 | タイトル | 掲載枠 | プラン           │   │
│  │   ステータス | 支払い | 料金 | 申請日 | 掲載期間  │   │
│  │   [審査/閲覧 アイコン] (sticky right)           │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [E] PAGINATION                      │   │
│  │   表示件数: [10▼]  8ページ中1ページ目を表示       │   │
│  │   [< 前へ] [1] [2] [3] ... [8] [次へ >]         │   │
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
│              │   "広告を審査"              │            │
│              │   または "広告を表示"        │            │
│              │   "{shopName}の広告"        │            │
│              ├─────────────────────────────┤            │
│              │                             │            │
│              │   [B] SHOP INFO             │            │
│              │   店舗 | 掲載枠 | プラン     │            │
│              │   (3カラムグリッド)          │            │
│              │                             │            │
│              │   [C] AD PREVIEW            │            │
│              │   タイトル + ステータスバッジ│            │
│              │   バナー画像 (最大320px)     │            │
│              │   お知らせ | 内容 | SKU      │            │
│              │   開始日 | 終了日            │            │
│              │   掲載期間: {n}日            │            │
│              │                             │            │
│              │   [D] FEE & PAYMENT INFO    │            │
│              │   1日あたりの料金 | 期間      │            │
│              │   ─────────────────         │            │
│              │   合計料金 | 支払済み料金    │            │
│              │   支払い状況バッジ           │            │
│              │   支払日: {date}             │            │
│              │   料金固定のお知らせ         │            │
│              │                             │            │
│              │   [E] REJECTION REASON      │            │
│              │   (却下済み広告に表示)       │            │
│              │                             │            │
│              │   [F] REJECTION INPUT       │            │
│              │   (却下ボタン押下後に表示)   │            │
│              │   Textarea + 文字数カウント  │            │
│              │                             │            │
│              │   [G] ACTION BUTTONS        │            │
│              │   [キャンセル] [却下]        │            │
│              │   または [キャンセル] [戻る]  │            │
│              │           [却下を確定]       │            │
│              │   または [閉じる] (閲覧専用) │            │
│              └─────────────────────────────┘            │
└─────────────────────────────────────────────────────────┘
```

#### 一括却下確認モーダルレイアウト
```text
┌─────────────────────────────────────────────────────────┐
│                    MODAL OVERLAY                        │
│              ┌─────────────────────────────┐            │
│              │   ⚠ (赤丸アイコン)          │            │
│              │   "広告を一括却下"          │            │
│              │   "{n}件の広告を却下します。"│            │
│              ├─────────────────────────────┤            │
│              │   返金のお知らせ             │            │
│              │                             │            │
│              │   却下理由 *                │            │
│              │   Textarea + 文字数カウント  │            │
│              │                             │            │
│              │   [キャンセル] [却下を確定]  │            │
│              └─────────────────────────────┘            │
└─────────────────────────────────────────────────────────┘
```

#### 一括承認確認モーダルレイアウト
```text
┌─────────────────────────────────────────────────────────┐
│                    MODAL OVERLAY                        │
│              ┌─────────────────────────────┐            │
│              │   ⚠ (緑丸アイコン)            │            │
│              │   "広告を一括承認"          │            │
│              │   "{n}件の広告を承認します。"│            │
│              ├─────────────────────────────┤            │
│              │   [キャンセル] [承認を確定]  │            │
│              └─────────────────────────────┘            │
└─────────────────────────────────────────────────────────┘
```

#### 広告プラン・料金管理レイアウト (`/admin/ads/packages`)
```text
┌─────────────────────────────────────────────────────────┐
│                    BROWSER VIEWPORT                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [A] PAGE HEADER                     │   │
│  │   タイトル: "広告プラン・料金管理"               │   │
│  │   サブタイトル: "掲載枠とプランごとに広告料金を  │   │
│  │                   設定します"                    │   │
│  │   [← 広告一覧に戻る] [変更履歴を表示]            │   │
│  │                     [+ 料金設定を作成]           │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [B] FEE SETTINGS TABLE              │   │
│  │   掲載枠 | プラン | 日額料金 | 期間              │   │
│  │   合計料金 | 広告上限数 | ステータス | 操作        │   │
│  │   [編集] [無効化/再有効化] (sticky right)        │   │
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
│  │   タイトル: "料金変更履歴"                       │   │
│  │   サブタイトル: "料金設定の変更履歴"             │   │
│  │   [← プラン一覧に戻る]                           │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [B] FILTER BAR                      │   │
│  │   [月 ▼] [掲載枠 ▼] [プラン ▼]                  │   │
│  │   {n}件選択中 | [クリア] [🗑 削除]              │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │   当月保護のお知らせ                             │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [C] HISTORY TABLE                   │   │
│  │   ☐ | 日付 | 掲載枠 | プラン | 変更前料金        │   │
│  │   変更後料金 | 変更者 | 理由 | [🗑]              │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [D] PAGINATION                      │   │
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
│  │   タイトル: "収益分析"                           │   │
│  │   サブタイトル: "承認済み広告の収益概要"         │   │
│  │   [← 広告一覧に戻る]                              │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [B] FILTER CONTROLS                 │   │
│  │   [日付範囲 From/To] [掲載枠 ▼] [プラン ▼]      │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [C] SUMMARY METRICS (5 cards)      │   │
│  │   収益合計 | 承認済み広告数 | 収益合計           │   │
│  │   広告あたり平均収益 | 返金合計                  │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [D] CHARTS                          │   │
│  │   ┌─────────────────┐ ┌─────────────────┐        │   │
│  │   │ 掲載枠別収益    │ │ プラン別収益    │        │   │
│  │   │ [円グラフ]      │ │ [円グラフ]      │        │   │
│  │   └─────────────────┘ └─────────────────┘        │   │
│  │   ┌─────────────────────────────────────┐        │   │
│  │   │ 収益推移 [折れ線グラフ]              │        │   │
│  │   └─────────────────────────────────────┘        │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [E] DATA TABLES                     │   │
│  │   ┌─────────────────┐ ┌─────────────────┐        │   │
│  │   │ 掲載枠別の広告  │ │ プラン別の広告  │        │   │
│  │   └─────────────────┘ └─────────────────┘        │   │
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
│  │   タイトル: "レポートのエクスポート"             │   │
│  │   サブタイトル: "広告と料金履歴のCSVレポートを  │   │
│  │                   作成します"                    │   │
│  │   [← 広告一覧に戻る]                              │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [B] REPORT TYPE SELECTION           │   │
│  │   ┌──────────┐ ┌──────────┐ ┌──────────┐        │   │
│  │   │ Ad       │ │ 提出履歴 │ │ 料金     │        │   │
│  │   │ パフォーマンス│ │          │ │ 履歴     │        │   │
│  │   └──────────┘ └──────────┘ └──────────┘        │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [C] EXPORT CONFIGURATION            │   │
│  │   [日付範囲] [掲載枠 ▼] [プラン ▼]              │   │
│  │   [ステータス ▼] [店舗を検索...] [形式: CSV]     │   │
│  │   ヘルパーテキスト                               │   │
│  │   [レポートを作成]                                │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 3.2 レスポンシブレイアウトのブレークポイント

| ブレークポイント | 最小幅 | レイアウト動作 |
| :--- | :--- | :--- |
| Mobile (default) | 0px | 積み重ねレイアウト、全幅フィルター、テーブル横スクロール |
| `sm:` | 640px | フィルターバーラップ、ページネーション左右分割、モーダル最大幅適用 |
| `md:` | 768px | Fee設定: 期間列表示; Fee履歴: 変更前料金列表示 |
| `lg:` | 1024px | 分析/エクスポート: 2カラムチャート/テーブルグリッド; Fee履歴: 変更者列表示; Fee設定: 広告上限数列表示 |
| `xl:` | 1280px | 広告一覧: 掲載枠列表示; Fee履歴: 理由列表示 |

---

## 4. 画面項目定義

### 4.1 [A] ページヘッダー — 広告一覧

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 1 | `lblAdsTitle` | ページタイトル | Static Label (`<h1>`) | String | — | 表示。テキスト: "広告管理" | — | i18n key: `admin.ads.list.title` | `text-2xl font-bold tracking-tight sm:text-3xl` |
| 2 | `lblAdsSubtitle` | ページサブタイトル | Static Label (`<p>`) | String | — | 表示。テキスト: "出品者の広告を確認し、広告料金を管理します" | — | i18n key: `admin.ads.list.subtitle` | `text-muted-foreground` |
| 3 | `badgePendingCount` | 承認待ち件数バッジ | Badge | Integer | — | 読み込み時に取得。テキスト: "審査待ちの広告 {n}件" | — | `COUNT(advertisements WHERE approval_status = 'pending')` | 黄系バッジ (`bg-amber-100 text-amber-800`)。i18n key: `admin.ads.list.pendingCount` |
| 4 | `btnManagePackages` | プラン管理ボタン | Button (`outline`, `size="sm"`) | — | — | 表示。テキスト: "プランを管理" with LayoutGrid icon | — | — | `/admin/ads/packages` に遷移。i18n key: `admin.ads.list.managePackages` |
| 5 | `btnRevenueAnalytics` | 収益分析ボタン | Button (`outline`, `size="sm"`) | — | — | 表示。テキスト: "収益分析" with BarChart3 icon | — | — | `/admin/ads/analytics` に遷移。i18n key: `admin.ads.list.revenueAnalytics` |
| 6 | `btnExport` | エクスポートボタン | Button (`outline`, `size="sm"`) | — | — | 表示。テキスト: "エクスポート" with Download icon | — | — | `/admin/ads/export` に遷移。i18n key: `common.actions.export` |

### 4.2 [B] フィルターバー — 広告一覧

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 7 | `txtShopSearch` | 店舗検索入力 | Input (`text`) with Search icon | String | No | 空欄。プレースホルダー: "店舗を検索..." | デバウンス300ms | — | i18n key: `admin.ads.list.filters.searchShop`。`h-9 w-full pl-8 sm:w-40` |
| 8 | `selStatusFilter` | ステータスフィルタ | Select | Enum | No | 初期値: "すべてのステータス" | オプション: すべてのステータス, 保留中, 承認済み, 却下済み | — | i18n key: `admin.ads.list.filters.allStatuses`。`h-9 w-full sm:w-32` |
| 9 | `selPlacementFilter` | 掲載枠フィルタ | Select | Enum | No | 初期値: "すべての掲載枠" | オプション: すべての掲載枠, 検索ページバナー, おすすめページバナー, 購入手続きページバナー, 商品詳細ページバナー | — | i18n key: `admin.ads.list.filters.allPlacements`。`h-9 w-full sm:w-40` |
| 10 | `selTierFilter` | プラン選択フィルタ | Select | Enum | No | 初期値: "すべてのプラン" | オプション: すべてのプラン, ベーシック, スタンダード, プレミアム | — | i18n key: `admin.ads.list.filters.allTiers`。`h-9 w-full sm:w-32` |
| 11 | `dateRangeFilter` | 日付範囲フィルタ | DateRangePicker (From/To date inputs) | Date Range | No | 空欄 | 有効な日付範囲; From > To は自動修正 | — | i18n keys: `admin.ads.dateRange.from`, `admin.ads.dateRange.to`。ラベル非表示 (`hideLabels`) |
| 12 | `btnRefreshFilters` | フィルターリセットボタン | Button (`outline`, `size="sm"`) | — | — | 表示。テキスト: "すべてのフィルターをリセット" with RefreshCw icon | — | — | 全フィルターをデフォルトに戻す。i18n key: `admin.ads.list.filters.reset` |

### 4.3 [C] 広告テーブル

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 13 | `chkSelectAllAds` | 全選択チェックボックス | Checkbox | Boolean | No | 未選択。保留中広告がある場合のみ表示 | — | — | 保留中すべての行チェックボックスを切り替え。保留中広告がない場合は無効。i18n key: `admin.ads.list.selectAll` |
| 14 | `chkSelectAd` | 広告選択チェックボックス | Checkbox | Boolean | No | 行ごとに未選択。保留中以外は無効 | — | — | 一括操作バーの有効/無効を制御。i18n key: `admin.ads.list.selectAdvertisement` |
| 15 | `lblShopName` | 店舗名 | Static Label | String | — | DBから取得 | — | `shops.name` | `font-semibold text-foreground`。最大幅110px、truncate |
| 16 | `lblAdTitle` | 広告タイトル | Static Label | String | — | DBから取得 | — | `advertisements.title` | `text-foreground`。最大幅120px、truncate。ハイライト時「新着」バッジ表示 |
| 17 | `lblPlacement` | 掲載枠 | Static Label | String | — | DBから取得 | — | `advertisements.placement` | `admin.ads.placement.{placement}` でローカライズ。`xl:` 未満で非表示。最大幅120px、truncate |
| 18 | `badgeTier` | プラン | TierBadge | Enum | — | DBから取得 | — | `advertisements.tier` | Basic=gray, Standard=blue, Premium=purple。i18n key: `admin.ads.tier.{tier}` |
| 19 | `badgeAdStatus` | 広告ステータスバッジ | StatusBadge | Enum | — | 保留中=黄, 承認済み=緑, 却下済み=赤 | — | `advertisements.approval_status` | i18n key: `admin.ads.status.{status}` |
| 20 | `badgePaymentStatus` | 支払いステータスバッジ | PaymentBadge | Enum | — | 完了=緑, 保留中=黄, 返金済み=灰 | — | `advertisements.payment_status` | i18n key: `admin.ads.status.{status}` |
| 21 | `lblFee` | 料金 | Static Label | Decimal | — | `formatPrice()` でフォーマット、または "—" | — | `advertisements.payment_amount` | `text-right font-semibold tabular-nums` |
| 22 | `lblSubmittedAt` | 申請日 | Static Label | Date | — | `formatIsoDate()` で YYYY-MM-DD 形式 | — | `advertisements.created_at` | `tabular-nums whitespace-nowrap` |
| 23 | `lblSchedule` | 掲載期間 | Static Label | String | — | "Sep 1 ~ Sep 14" via `formatScheduleRange()` | — | `advertisements.starts_at`, `advertisements.expires_at` | 月+日形式（年なし） |
| 24 | `btnReviewAd` | 審査ボタン | Button (`outline`, `size="sm"`) with Pencil icon | — | — | 保留中広告にのみ表示 | — | — | 審査モーダル（編集可能）を開く。i18n key: `admin.ads.list.reviewAdvertisement` |
| 25 | `btnViewAd` | 閲覧ボタン | Button (`outline`, `size="sm"`) with Eye icon | — | — | 保留中以外の広告に表示 | — | — | 審査モーダル（閲覧専用）を開く。i18n key: `admin.ads.list.viewAdvertisement` |
| 26 | `rowHighlight` | 行ハイライト | CSS decoration | — | — | 紫色のインセットoutline | — | — | `?highlightAdId=` URLパラメーターで発動。スクロール+「新着」バッジ3秒表示 |

### 4.4 [D] 一括操作バー

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 27 | `lblSelectedCount` | 選択数テキスト | Static Label | String | — | "{n}件の広告を選択中" | — | — | i18n key: `admin.ads.bulk.selectedCount`。`text-sm font-medium` |
| 28 | `lblMaxSelection` | 最大選択数警告 | Static Label (alert) | String | — | "一括操作では広告を最大50件まで選択できます。" | — | — | 選択数 > 50 時に表示。`text-destructive`。i18n key: `admin.ads.bulk.maxSelection` |
| 29 | `btnClearSelection` | クリアボタン | Button (`ghost`, `size="sm"`) | — | No | 表示。テキスト: "クリア" | — | — | 全選択を解除。i18n key: `common.filters.clear` |
| 30 | `btnBulkApprove` | すべて承認ボタン | Button (`size="sm"`) | — | No | 選択数 > 50 で無効 | — | — | 一括承認モーダルを開く。i18n key: `admin.ads.bulk.approveAll` |
| 31 | `btnBulkReject` | すべて却下ボタン | Button (`destructive`, `size="sm"`) | — | No | 選択数 > 50 で無効 | — | — | 一括却下モーダルを開く。i18n key: `admin.ads.bulk.rejectAll` |

### 4.5 [E] ページネーション — 広告一覧

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 32 | `pagAds` | 広告ページネーション | Pagination | — | — | Page 1, デフォルト limit 10 | — | API response `meta.total`, `meta.totalPages` | ページサイズ: 10, 20, 50, 100。"Showing page {page} of {totalPages}"。Prev/Next テキストボタン+ページ番号チップ |

### 4.6 審査モーダルヘッダー

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 33 | `lblReviewAdTitle` | モーダルタイトル | DialogTitle | String | — | "広告を審査"（編集時）または "広告を表示"（閲覧時） | — | i18n key: `admin.ads.reviewModal.reviewTitle` / `admin.ads.reviewModal.viewTitle` | `sm:max-w-2xl` |
| 34 | `lblReviewAdDescription` | モーダル説明 | DialogDescription | String | — | "{shopName}の広告" または "広告の詳細を読み込み中..." | — | i18n key: `admin.ads.reviewModal.advertisementBy` / `admin.ads.reviewModal.loadingDetails` | — |

### 4.7 審査モーダル内店舗情報

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 35 | `lblReviewShopName` | 店舗名 | Static Label | String | — | DBから取得 | — | `shops.name` | `font-medium` |
| 36 | `lblReviewPlacement` | 掲載枠 | Static Label | String | — | ローカライズ済み掲載枠名 | — | `advertisements.placement` | `font-medium` |
| 37 | `badgeReviewTier` | プラン | TierBadge | Enum | — | DBから取得 | — | `advertisements.tier` | 標準ティアバッジ色 |

### 4.8 審査モーダル内広告プレビュー

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 38 | `lblAdTitle` | 広告タイトル | Static Label | String | — | DBから取得 | — | `advertisements.title` | `text-sm font-medium` |
| 39 | `badgeAdStatus` | ステータスバッジ | StatusBadge | Enum | — | DBから取得 | — | `advertisements.approval_status` | 標準ステータスバッジ色 |
| 40 | `imgAdBanner` | 広告バナー画像 | Image | URL | — | 広告バナー画像 or "バナー画像がありません" | — | `advertisements.image_url` | `max-h-[320px] w-full object-contain` |
| 41 | `lblAdAnnouncement` | お知らせ | Static Label | String | — | DBから取得（条件付き） | — | `advertisements.announcement_message` | `text-sm font-medium` |
| 42 | `lblAdContent` | 内容 | Static Label (`<p>`) | Text | — | DBから取得（条件付き） | — | `advertisements.content` | `text-sm text-muted-foreground` |
| 43 | `lblAdSku` | SKU | Static Label | String | — | DBから取得（条件付き） | — | `advertisements.sku` | `text-sm text-primary` |
| 44 | `lblStartDate` | 開始日 | Static Label | Date | — | `formatDate()` でフォーマット | — | `advertisements.starts_at` | `MMM d, yyyy` 形式 |
| 45 | `lblEndDate` | 終了日 | Static Label | Date | — | `formatDate()` でフォーマット | — | `advertisements.expires_at` | `MMM d, yyyy` 形式 |
| 46 | `lblAdDuration` | 掲載期間 | Static Label | String | — | "{n}日" | — | `advertisements.starts_at` と `expires_at` から計算 | i18n key: `admin.ads.reviewModal.durationDays` |

### 4.9 審査モーダル内料金と支払い情報

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 47 | `lblDailyRateDisplay` | 1日あたりの料金 | Static Label | Decimal | — | `formatPrice()` でフォーマット | — | `ad_fee_settings.daily_rate`（購入時に固定） | 料金固定ルール |
| 48 | `lblDurationDisplay` | 期間 | Static Label | String | — | "{n}日" | — | `ad_fee_settings.duration_days`（購入時に固定） | 料金固定ルール |
| 49 | `lblTotalFeeDisplay` | 合計料金 | Static Label | Decimal | — | `formatPrice()` でフォーマット | — | 計算: `daily_rate × duration_days`（購入時固定） | **料金計算表示ルール。** 料金固定ルール |
| 50 | `lblFeePaid` | 支払済み料金 | Static Label | Decimal | — | `formatPrice()` でフォーマット | — | `ad_payments.amount` | 料金固定ルール |
| 51 | `badgePaymentStatusDetail` | 支払い状況 | PaymentBadge | Enum | — | 完了=緑, 保留中=黄, 返金済み=灰 | — | `ad_payments.payment_status` | — |
| 52 | `lblPaidOn` | 支払日 | Static Label | String | — | "{date}に支払い済み"（条件付き） | — | `ad_payments.paid_at` | `text-xs text-muted-foreground` |
| 53 | `lblFeeLockedNotice` | 料金固定のお知らせ | Static Label | String | — | "購入時の料金が適用されます。以降の料金設定変更はこの広告に影響しません。" | — | — | i18n key: `admin.ads.reviewModal.feeLockedNotice` |

### 4.10 却下理由表示

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 54 | `lblRejectionReason` | 却下理由 | Static Label | Text | — | status ≠ pending かつ rejectionReason が存在する場合に表示 | — | `advertisements.rejection_reason` | 赤枠ボックス (`border-red-200 bg-red-50/50`) |

### 4.11 却下理由入力

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 55 | `txtRejectionReason` | 却下理由テキストエリア | Textarea | String(1000) | Conditional | 空欄。プレースホルダー: "広告を却下する理由を入力してください..." | MaxLength: 1000。却下時必須 | — | `rows={4}`。文字数カウント表示。i18n key: `admin.ads.reviewModal.rejectionPlaceholder` |
| 56 | `lblRejectionRequired` | 却下理由必須エラー | Static Label (alert) | String | — | "却下理由を入力してください。" | — | — | Textarea 空欄時に表示。`text-destructive`。i18n key: `admin.ads.reviewModal.rejectionRequired` |

### 4.12 レビューモーダルのアクションボタン

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 57 | `btnCancelReview` | キャンセルボタン | Button (`outline`) | — | — | 表示。テキスト: "キャンセル" | — | — | i18n key: `common.cancel`。処理中に無効 |
| 58 | `btnApproveAd` | 承認ボタン | Button (`default`) | — | — | 表示。テキスト: "承認" / "承認中..." | — | — | i18n key: `admin.ads.reviewModal.approve` / `admin.ads.reviewModal.approving`。PENDING のみ |
| 59 | `btnRejectAd` | 却下ボタン | Button (`destructive`) | — | — | 表示。テキスト: "却下" | — | — | i18n key: `admin.ads.reviewModal.reject`。却下理由入力を表示。PENDING のみ |
| 60 | `btnBackFromReject` | 戻るボタン | Button (`ghost`) | — | — | 却下モード時に表示。テキスト: "戻る" | — | — | i18n key: `common.back`。承認/却下選択に戻る |
| 61 | `btnConfirmReject` | 却下を確定ボタン | Button (`destructive`) | — | — | 却下モード時に表示。テキスト: "却下を確定" / "却下中..." | — | — | i18n key: `admin.ads.reviewModal.confirmReject` / `admin.ads.reviewModal.rejecting`。理由空欄時無効 |
| 62 | `btnCloseReview` | 閉じるボタン | Button (`outline`) | — | — | 閲覧専用または非保留中に表示。テキスト: "閉じる" | — | — | i18n key: `common.close` |

### 4.13 一括却下モーダルヘッダー

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 63 | `lblBulkRejectTitle` | モーダルタイトル | DialogTitle | String | — | "広告を一括却下" | — | i18n key: `admin.ads.bulkReject.title` | AlertTriangle アイコン (赤丸 `bg-destructive/10`) |
| 64 | `lblBulkRejectDescription` | モーダル説明 | DialogDescription | String | — | "{n}件の広告を却下します。" | — | i18n key: `admin.ads.bulkReject.description` | — |

### 4.14 一括却下警告・理由

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 65 | `lblBulkRejectRefundNotice` | 返金のお知らせ | Static Label (alert) | String | — | "広告は表示されず、返金ルールに基づき支払済み金額の全額（100%）が返金されます。" | — | i18n key: `admin.ads.bulkReject.refundNotice` | `text-sm text-destructive` |
| 66 | `txtBulkRejectReason` | 却下理由テキストエリア | Textarea | String(1000) | Yes | 空欄。プレースホルダー: "広告を却下する理由を入力してください..." | MaxLength: 1000。必須 | — | `rows={4}`。文字数カウント表示。i18n key: `admin.ads.bulkReject.reasonPlaceholder` |
| 67 | `lblBulkRejectReasonRequired` | 理由必須エラー | Static Label (alert) | String | — | "却下理由を入力してください。" | — | — | Textarea 空欄時に表示。i18n key: `admin.ads.bulkReject.reasonRequired` |

### 4.15 一括却下アクションボタン

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 68 | `btnCancelBulkReject` | キャンセルボタン | Button (`outline`) | — | — | 表示。テキスト: "キャンセル" | — | — | i18n key: `common.cancel` |
| 69 | `btnConfirmBulkReject` | 却下を確定ボタン | Button (`destructive`) | — | — | 表示。テキスト: "却下を確定" / "却下中..." | — | — | i18n key: `admin.ads.bulkReject.confirm` / `admin.ads.bulkReject.rejecting`。理由空欄時無効 |

### 4.16 一括承認モーダルヘッダー

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 70 | `lblBulkApproveTitle` | モーダルタイトル | DialogTitle | String | — | "広告を一括承認" | — | i18n key: `admin.ads.bulkApprove.title` | AlertTriangle アイコン (緑丸 `bg-green-100`) |
| 71 | `lblBulkApproveDescription` | モーダル説明 | DialogDescription | String | — | "{n}件の広告を承認します。" | — | i18n key: `admin.ads.bulkApprove.description` | — |

### 4.17 一括承認アクションボタン

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 72 | `btnCancelBulkApprove` | キャンセルボタン | Button (`outline`) | — | — | 表示。テキスト: "キャンセル" | — | — | i18n key: `common.cancel` |
| 73 | `btnConfirmBulkApprove` | 承認を確定ボタン | Button (`default`) | — | — | 表示。テキスト: "承認を確定" / "承認中..." | — | — | i18n key: `admin.ads.bulkApprove.confirm` / `admin.ads.bulkApprove.approving` |

### 4.18 広告プラン・料金管理ページヘッダー

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 74 | `lblPackagesTitle` | ページタイトル | Static Label (`<h1>`) | String | — | 表示。テキスト: "広告プラン・料金管理" | — | i18n key: `admin.ads.packages.title` | `text-2xl font-bold tracking-tight sm:text-3xl` |
| 75 | `lblPackagesSubtitle` | ページサブタイトル | Static Label (`<p>`) | String | — | 表示。テキスト: "掲載枠とプランごとに広告料金を設定します" | — | i18n key: `admin.ads.packages.subtitle` | `text-muted-foreground` |
| 76 | `btnBackToAdsFromPackages` | 広告一覧へ戻るボタン | Button (`outline`, `size="sm"`) | — | — | 表示。テキスト: "広告一覧に戻る" with ArrowLeft icon | — | — | `/admin/ads` に遷移。i18n key: `admin.ads.packages.backToAds` |
| 77 | `btnViewFeeHistory` | 変更履歴を表示ボタン | Button (`outline`, `size="sm"`) | — | — | 表示。テキスト: "変更履歴を表示" with History icon | — | — | `/admin/ads/fee-history` に遷移。i18n key: `admin.ads.packages.viewHistory` |
| 78 | `btnCreateFeeSetting` | 料金設定を作成ボタン | Button (`size="sm"`) | — | — | 表示。テキスト: "料金設定を作成" with Plus icon。全12パッケージ作成時に無効 | — | — | Fee作成モーダルを開く。ツールチップ: "12種類すべての掲載枠・プランを作成済みです"。i18n key: `admin.ads.packages.createFeeSetting` |

### 4.19 Fee設定テーブル

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 79 | `lblFeePlacement` | 掲載枠 | Static Label | String | — | ローカライズ済み掲載枠名 | — | `ad_fee_settings.placement` | `font-medium text-foreground`。最大幅140px、truncate |
| 80 | `badgeFeeTier` | プラン | TierBadge | Enum | — | DBから取得 | — | `ad_fee_settings.tier` | Basic=gray, Standard=blue, Premium=purple |
| 81 | `lblDailyRate` | 日額料金 | Static Label | Decimal | — | `formatPrice()` でフォーマット | — | `ad_fee_settings.daily_rate` | `text-right font-semibold tabular-nums` |
| 82 | `lblDuration` | 期間 | Static Label | Integer | — | "{n}日" | — | `ad_fee_settings.duration_days` | `md:` 未満で非表示。`tabular-nums` |
| 83 | `lblTotalFee` | 合計料金 | Static Label | Decimal | — | `formatPrice()` でフォーマット | — | 計算: `daily_rate × duration_days` | **料金計算表示ルール。** `text-right font-semibold tabular-nums` |
| 84 | `lblMaxAds` | 広告上限数 | Static Label | Integer | — | DBから取得 | — | `ad_fee_settings.max_ads` | `lg:` 未満で非表示。`tabular-nums` |
| 85 | `badgeFeeStatus` | ステータスバッジ | FeeStatusBadge | Enum | — | 有効=緑, 無効=灰 | — | `ad_fee_settings.is_active` | i18n key: `admin.ads.status.active` / `admin.ads.status.inactive` |
| 86 | `btnEditFee` | 編集ボタン | Button (`outline`, `size="sm"`) with Pencil icon | — | — | 表示 | — | — | Fee編集モーダルを開く |
| 87 | `btnDeactivateFee` | 無効化ボタン | Button (`ghost`, `size="sm"`, destructive styling) with Ban icon | — | — | 有効設定に表示 | — | — | 無効化確認モーダルを開く |
| 88 | `btnReactivateFee` | 再有効化ボタン | Button (`outline`, `size="sm"`) with RotateCcw icon | — | — | 無効設定に表示 | — | — | 再有効化確認モーダルを開く |

### 4.20 Fee作成モーダル

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 89 | `lblCreateFeeTitle` | モーダルタイトル | DialogTitle | String | — | "料金設定を作成" | — | i18n key: `admin.ads.fee.create.title` | `sm:max-w-3xl` |
| 90 | `lblCreateFeeDescription` | モーダル説明 | DialogDescription | String | — | "掲載枠とプランの組み合わせに新しい広告料金を設定します。" | — | i18n key: `admin.ads.fee.create.description` | — |
| 91 | `selCreatePlacement` | 掲載枠選択 | Select | Enum | Yes | 空欄。プレースホルダー: "掲載枠を選択" | オプション: 検索ページバナー, おすすめページバナー, 購入手続きページバナー, 商品詳細ページバナー。既存組み合わせは無効 | — | i18n key: `admin.ads.fee.create.placementLabel` |
| 92 | `selCreateTier` | プラン選択 | Select | Enum | Yes | 空欄。プレースホルダー: "プランを選択" | オプション: ベーシック, スタンダード, プレミアム。既存組み合わせは無効 | — | i18n key: `admin.ads.fee.create.tierLabel` |
| 93 | `numCreateDailyRate` | 日額料金入力 | Input (`number`) | Decimal | Yes | 空欄。プレースホルダー: "0.00" | `step="0.01" min="0.01"`。0より大きい必要 | — | i18n key: `admin.ads.fee.dailyRateLabel` |
| 94 | `numCreateDuration` | 期間入力 | Input (`number`) | Integer | Yes | 空欄。プレースホルダー: "7" | `step="1" min="1"`。整数 ≥ 1 | — | i18n key: `admin.ads.fee.durationLabel` |
| 95 | `numCreateMaxAds` | 広告上限数入力 | Input (`number`) | Integer | Yes | 空欄。プレースホルダー: "5" | `step="1" min="1"`。整数 ≥ 1 | — | i18n key: `admin.ads.fee.maxAdsLabel` |
| 96 | `lblCreateTotalFeePreview` | 合計料金プレビュー | Static Label | Decimal | — | 計算: 日額料金 × 期間 | — | 入力値から計算 | **料金計算表示ルール。** リアルタイム更新。i18n key: `admin.ads.fee.totalFeeLabel` |
| 97 | `dateCreateEffectiveFrom` | 適用開始日 | Input (`date`) | Date | Yes | デフォルト: 今日 | 有効な日付が必要 | — | i18n key: `admin.ads.fee.effectiveFromLabel` |
| 98 | `btnCreateFee` | 作成ボタン | Button (`submit`, `default`) | — | — | 表示。テキスト: "料金設定を作成" / "作成中..." | — | — | i18n key: `admin.ads.fee.create.submit` / `admin.ads.fee.create.creating`。既存組み合わせ時無効 |
| 99 | `btnCancelCreateFee` | キャンセルボタン | Button (`outline`) | — | — | 表示。テキスト: "キャンセル" | — | — | i18n key: `common.cancel` |

### 4.21 Fee編集モーダル

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 100 | `lblEditFeeTitle` | モーダルタイトル | DialogTitle | String | — | "料金設定を編集" | — | i18n key: `admin.ads.fee.edit.title` | `sm:max-w-lg` |
| 101 | `lblEditFeeDescription` | モーダル説明 | DialogDescription | String | — | "{掲載枠} - {プラン}" | — | i18n keys: `admin.ads.placement.{placement}`, `admin.ads.tier.{tier}` | — |
| 102 | `lblEditCurrentFee` | 現在の料金情報 | Static Label | String | — | 掲載枠名 + プラン badge + "現在の合計料金: {amount}" | — | — | i18n key: `admin.ads.fee.edit.currentTotalFee` |
| 103 | `numEditDailyRate` | 日額料金入力 | Input (`number`) | Decimal | Yes | 現在値を表示 | `step="0.01" min="0.01"`。0より大きい必要 | `ad_fee_settings.daily_rate` | i18n key: `admin.ads.fee.dailyRateLabel` |
| 104 | `numEditDuration` | 期間入力 | Input (`number`) | Integer | Yes | 現在値を表示 | `step="1" min="1"`。整数 ≥ 1 | `ad_fee_settings.duration_days` | i18n key: `admin.ads.fee.durationLabel` |
| 105 | `numEditMaxAds` | 広告上限数入力 | Input (`number`) | Integer | Yes | 現在値を表示 | `step="1" min="1"`。整数 ≥ 1 | `ad_fee_settings.max_ads` | i18n key: `admin.ads.fee.maxAdsLabel` |
| 106 | `lblEditTotalFeePreview` | 合計料金プレビュー | Static Label | Decimal | — | 計算: 日額料金 × 期間 | — | 入力値から計算 | **料金計算表示ルール。** リアルタイム更新 |
| 107 | `dateEditEffectiveFrom` | 適用開始日 | Input (`date`) | Date | Yes | デフォルト: 今日 | 有効な日付が必要 | — | i18n key: `admin.ads.fee.effectiveFromLabel` |
| 108 | `txtEditChangeReason` | 変更理由 | Textarea | String(1000) | Yes | 空欄。プレースホルダー: "料金設定を変更する理由を入力してください" | MaxLength: 1000。必須 | — | i18n key: `admin.ads.fee.edit.changeReasonPlaceholder`。`rows={3}` |
| 109 | `btnSaveFee` | 保存ボタン | Button (`submit`, `default`) | — | — | 表示。テキスト: "変更を保存" / "保存中..." | — | — | i18n key: `admin.ads.fee.edit.submit` / `admin.ads.fee.edit.saving` |
| 110 | `btnCancelEditFee` | キャンセルボタン | Button (`outline`) | — | — | 表示。テキスト: "キャンセル" | — | — | i18n key: `common.cancel` |

### 4.22 Fee無効化モーダル

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 111 | `lblDeactivateFeeTitle` | モーダルタイトル | DialogTitle | String | — | "料金設定を無効化" | — | i18n key: `admin.ads.fee.deactivate.title` | AlertTriangle アイコン (赤丸)。`sm:max-w-md` |
| 112 | `lblDeactivateFeeDescription` | モーダル説明 | DialogDescription | String | — | "{掲載枠} - {プラン}" | — | — | — |
| 113 | `lblDeactivateFeeInfo` | 料金情報 | Static Label | String | — | 掲載枠名 + プラン badge | — | — | — |
| 114 | `lblDeactivateFeeNotice` | のお知らせ | Static Label | String | — | "この変更は既存の広告に影響しません（料金固定ルール）。無効中はこの掲載枠とプランを新たに購入できません。" | — | i18n key: `admin.ads.fee.deactivate.notice` | 料金固定ルール |
| 115 | `txtDeactivateChangeReason` | 変更理由 | Textarea | String(1000) | Yes | 空欄。プレースホルダー: "料金設定を無効にする理由を入力してください" | MaxLength: 1000。必須 | — | i18n key: `admin.ads.fee.deactivate.changeReasonPlaceholder`。`rows={4}` |
| 116 | `btnConfirmDeactivateFee` | 無効化を確定ボタン | Button (`destructive`) | — | — | 表示。テキスト: "無効化を確定" / "無効化中..." | — | — | i18n key: `admin.ads.fee.deactivate.confirm` / `admin.ads.fee.deactivate.deactivating` |
| 117 | `btnCancelDeactivateFee` | キャンセルボタン | Button (`outline`) | — | — | 表示。テキスト: "キャンセル" | — | — | i18n key: `common.cancel` |

### 4.23 Fee再有効化モーダル

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 118 | `lblReactivateFeeTitle` | モーダルタイトル | DialogTitle | String | — | "料金設定を再有効化" | — | i18n key: `admin.ads.fee.reactivate.title` | RotateCcw アイコン (緑丸)。`sm:max-w-md` |
| 119 | `lblReactivateFeeDescription` | モーダル説明 | DialogDescription | String | — | "{掲載枠} - {プラン}" | — | — | — |
| 120 | `lblReactivateFeeInfo` | 料金情報 | Static Label | String | — | 掲載枠名 + プラン badge | — | — | — |
| 121 | `lblReactivateFeeNotice` | のお知らせ | Static Label | String | — | "現在の料金と設定で、このプランを再び出品者が利用できるようにします。" | — | i18n key: `admin.ads.fee.reactivate.notice` | — |
| 122 | `txtReactivateChangeReason` | 変更理由 | Textarea | String(1000) | No | 空欄。プレースホルダー: "料金設定を再有効化する理由を入力してください" | MaxLength: 1000。任意 | — | i18n key: `admin.ads.fee.reactivate.changeReasonPlaceholder`。`rows={4}` |
| 123 | `btnConfirmReactivateFee` | 再有効化を確定ボタン | Button (`default`) | — | — | 表示。テキスト: "再有効化を確定" / "再有効化中..." | — | — | i18n key: `admin.ads.fee.reactivate.confirm` / `admin.ads.fee.reactivate.reactivating` |
| 124 | `btnCancelReactivateFee` | キャンセルボタン | Button (`outline`) | — | — | 表示。テキスト: "キャンセル" | — | — | i18n key: `common.cancel` |

### 4.24 料金変更履歴ページヘッダー

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 125 | `lblFeeHistoryTitle` | ページタイトル | Static Label (`<h1>`) | String | — | 表示。テキスト: "料金変更履歴" | — | i18n key: `admin.ads.feeHistory.title` | `text-2xl font-bold tracking-tight sm:text-3xl` |
| 126 | `lblFeeHistorySubtitle` | ページサブタイトル | Static Label (`<p>`) | String | — | 表示。テキスト: "料金設定の変更履歴" | — | i18n key: `admin.ads.feeHistory.subtitle` | `text-muted-foreground` |
| 127 | `btnBackToPackages` | プラン一覧へ戻るボタン | Button (`outline`, `size="sm"`) | — | — | 表示。テキスト: "プラン一覧に戻る" with ArrowLeft icon | — | — | `/admin/ads/packages` に遷移。i18n key: `admin.ads.feeHistory.backToPackages` |

### 4.25 Fee履歴フィルターバー

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 128 | `selHistoryMonthFilter` | 月フィルタ | Select | String (YYYY-MM) | No | 初期値: "すべての月" | オプション: すべての月 + 直近12ヶ月 | — | i18n key: `admin.ads.feeHistory.allMonths`。`h-9 w-full sm:w-44` |
| 129 | `selHistoryPlacementFilter` | 掲載枠フィルタ | Select | Enum | No | 初期値: "すべての掲載枠" | オプション: すべての掲載枠, 検索ページバナー, おすすめページバナー, 購入手続きページバナー, 商品詳細ページバナー | — | i18n key: `admin.ads.feeHistory.allPlacements`。`h-9 w-full sm:w-44` |
| 130 | `selHistoryTierFilter` | プラン選択フィルタ | Select | Enum | No | 初期値: "すべてのプラン" | オプション: すべてのプラン, ベーシック, スタンダード, プレミアム | — | i18n key: `admin.ads.feeHistory.allTiers`。`h-9 w-full sm:w-36` |
| 131 | `lblHistorySelectedCount` | 選択数テキスト | Static Label | String | — | "{n}件を選択中" | — | — | レコード選択時に表示。i18n key: `admin.ads.feeHistory.selectedCount` |
| 132 | `lblHistoryMaxBulk` | 最大一括操作警告 | Static Label (alert) | String | — | "一括操作では最大50件まで選択できます" | — | — | 選択数 > 50 時に表示。i18n key: `admin.ads.feeHistory.maxBulkSelection` |
| 133 | `btnClearHistorySelection` | クリアボタン | Button (`ghost`, `size="sm"`) | — | No | 表示。テキスト: "クリア" | — | — | i18n key: `common.filters.clear` |
| 134 | `btnDeleteSelectedHistory` | 選択削除ボタン | Button (`destructive`, `size="sm"`) with Trash2 icon | — | No | 0件選択時または50件超過時無効 | — | — | 履歴削除モーダルを開く。i18n key: `admin.ads.feeHistory.deleteSelectedLabel` |
| 135 | `lblCurrentMonthProtected` | 当月保護のお知らせ | Static Label | String | — | "当月の料金変更履歴は保護されているため削除できません。削除するには前月以前の履歴を選択してください。" | — | i18n key: `admin.ads.feeHistory.currentMonthProtected` | `text-sm text-muted-foreground` |

### 4.26 履歴テーブル

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 136 | `chkSelectAllHistory` | 全選択チェックボックス | Checkbox | Boolean | No | 未選択。削除可能な行のみ | — | — | i18n key: `admin.ads.feeHistory.selectAllLabel` |
| 137 | `chkSelectHistoryRow` | 行選択チェックボックス | Checkbox | Boolean | No | 行ごとに未選択。当月は無効 | — | — | i18n key: `admin.ads.feeHistory.selectRowLabel` |
| 138 | `lblHistoryDate` | 日付 | Static Label | DateTime | — | `formatDate()` でフォーマット | — | `ad_fee_history.created_at` | `whitespace-nowrap tabular-nums` |
| 139 | `lblHistoryPlacement` | 掲載枠 | Static Label | String | — | ローカライズ済み掲載枠名 | — | `ad_fee_history.placement` | `font-medium text-foreground`。最大幅120px、truncate |
| 140 | `badgeHistoryTier` | プラン | TierBadge | Enum | — | DBから取得 | — | `ad_fee_history.tier` | 標準ティアバッジ色 |
| 141 | `lblOldRate` | 変更前料金 | Static Label | Decimal | — | `formatPrice()` でフォーマット、または "—" | — | `ad_fee_history.old_daily_rate` | `md:` 未満で非表示。`tabular-nums` |
| 142 | `lblNewRate` | 変更後料金 | Static Label | Decimal | — | `formatPrice()` でフォーマット | — | `ad_fee_history.new_daily_rate` | `text-right font-semibold tabular-nums` |
| 143 | `lblChangedBy` | 変更者 | Static Label | String | — | DBから取得 | — | `ad_fee_history.changedByName` | `lg:` 未満で非表示。`whitespace-nowrap` |
| 144 | `lblReason` | 理由 | Static Label | Text | — | DBから取得、または "—" | — | `ad_fee_history.change_reason` | `xl:` 未満で非表示。最大幅240px、truncate |
| 145 | `btnDeleteHistoryRow` | 行削除ボタン | Button (`ghost`, `size="sm"`) with Trash2 icon | — | — | 当月または削除処理中に無効 | — | — | 履歴削除モーダル（単一）を開く。i18n key: `admin.ads.feeHistory.deleteRecordLabel` |

### 4.27 履歴削除モーダル

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 146 | `lblDeleteHistoryTitle` | モーダルタイトル | DialogTitle | String | — | "料金変更履歴を削除" | — | i18n key: `admin.ads.fee.deleteHistory.title` | AlertTriangle アイコン (赤丸)。`sm:max-w-md` |
| 147 | `lblDeleteHistoryDescription` | モーダル説明 | DialogDescription | String | — | 単数: "この料金変更履歴を完全に削除します。" / 複数: "料金変更履歴{n}件を完全に削除します。" | — | i18n key: `admin.ads.fee.deleteHistory.descriptionOne` / `descriptionCount` | — |
| 148 | `lblDeleteHistoryWarning` | 警告 | Static Label | String | — | "この操作は取り消せません。当月に作成された履歴は保護され、削除要求は常に拒否されます。" | — | i18n key: `admin.ads.fee.deleteHistory.warning` | — |
| 149 | `btnConfirmDeleteHistory` | 削除を確定ボタン | Button (`destructive`) | — | — | 表示。テキスト: "削除を確定" / "削除中..." | — | — | i18n key: `admin.ads.fee.deleteHistory.confirm` / `admin.ads.fee.deleteHistory.deleting` |
| 150 | `btnCancelDeleteHistory` | キャンセルボタン | Button (`outline`) | — | — | 表示。テキスト: "キャンセル" | — | — | i18n key: `common.cancel` |

### 4.28 Fee履歴ページネーション

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 151 | `pagFeeHistory` | Fee履歴ページネーション | Pagination | — | — | Page 1, デフォルト limit 10 | — | API response `meta.total`, `meta.totalPages` | ページサイズ: 10, 20, 50, 100 |

### 4.29 収益分析ページヘッダー

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 152 | `lblAnalyticsTitle` | ページタイトル | Static Label (`<h1>`) | String | — | 表示。テキスト: "収益分析" | — | i18n key: `admin.ads.analytics.title` | `text-2xl font-bold tracking-tight sm:text-3xl` |
| 153 | `lblAnalyticsSubtitle` | ページサブタイトル | Static Label (`<p>`) | String | — | 表示。テキスト: "承認済み広告の収益概要" | — | i18n key: `admin.ads.analytics.subtitle` | `text-muted-foreground` |
| 154 | `btnBackToAdsFromAnalytics` | 広告一覧へ戻るボタン | Button (`outline`, `size="sm"`) | — | — | 表示。テキスト: "広告一覧に戻る" with ArrowLeft icon | — | — | `/admin/ads` に遷移。i18n key: `admin.ads.analytics.backToAds` |

### 4.30 収益分析フィルター

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 155 | `dateRangeAnalytics` | 日付範囲ピッカー | DateRangePicker | Date Range | Yes | デフォルト: 過去30日 | 有効な日付範囲 | — | i18n key: `admin.ads.analytics.dateRange` |
| 156 | `selAnalyticsPlacement` | 掲載枠フィルタ | MultiSelect | Array[Enum] | No | 空欄（すべて） | オプション: 検索ページバナー, おすすめページバナー, 購入手続きページバナー, 商品詳細ページバナー | — | i18n key: `admin.ads.analytics.placementsLabel` |
| 157 | `selAnalyticsTier` | プラン選択フィルタ | MultiSelect | Array[Enum] | No | 空欄（すべて） | オプション: ベーシック, スタンダード, プレミアム | — | i18n key: `admin.ads.analytics.tiersLabel` |

### 4.31 サマリーメトリクス

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 158 | `statTotalRevenue` | 収益合計カード | Card | Decimal | — | 読み込み時に取得 | — | `SUM(ad_payments.amount)` where `payment_status = 'completed'`, `approval_status = 'approved'`, 日付範囲内 | `formatPrice()` |
| 159 | `statTotalAdsApproved` | 承認済み広告数カード | Card | Integer | — | 読み込み時に取得 | — | 完了済み支払い+承認済み広告+日付範囲内での件数 | — |
| 160 | `statTotalFeesCollected` | 収益合計カード | Card | Decimal | — | 読み込み時に取得 | — | `SUM(ad_payments.amount)` for completed payments linked to approved ads in date range | `formatPrice()` |
| 161 | `statAvgRevenuePerAd` | 広告あたり平均収益カード | Card | Decimal | — | 読み込み時に取得 | — | `totalRevenue / totalAds` | `formatPrice()` |
| 162 | `statTotalRefunds` | 返金合計カード | Card | Decimal | — | 読み込み時に取得 | — | `SUM(refunded amounts)` | `formatPrice()` |

### 4.32 チャート

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 163 | `chartRevenueByPlacement` | 掲載枠別収益チャート | SVG Pie Chart with legend | Array | — | 読み込み時に取得 | — | `GROUP BY ad_fee_settings.placement` | 8色パレット。セグメント別にパーセント+収益を表示。`lg:grid-cols-2` |
| 164 | `chartRevenueByTier` | プラン別収益チャート | SVG Pie Chart with legend | Array | — | 読み込み時に取得 | — | `GROUP BY ad_fee_settings.tier` | 8色パレット。`lg:grid-cols-2` |
| 165 | `chartRevenueTrend` | 収益推移チャート | SVG Line Chart (Catmull-Rom curve) | Array | — | 読み込み時に取得 | — | `GROUP BY payment date` | 青グラデーション塗りつぶス。ホバーツールチップ（日付+収益）。約6個のX軸ラベル |

### 4.33 データテーブル — 分析

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 166 | `tblAdsByPlacement` | 掲載枠別広告テーブル | Table | Array | — | 読み込み時に取得 | — | `GROUP BY ad_fee_settings.placement` | 列: 掲載枠 / プラン, 広告数, 収益合計, 平均CTR。`lg:grid-cols-2` |
| 167 | `tblAdsByTier` | プラン別広告テーブル | Table | Array | — | 読み込み時に取得 | — | `GROUP BY ad_fee_settings.tier` | 列: 掲載枠 / プラン, 広告数, 収益合計, 平均CTR。`lg:grid-cols-2` |

### 4.34 エクスポートレポートページヘッダー

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 168 | `lblExportTitle` | ページタイトル | Static Label (`<h1>`) | String | — | 表示。テキスト: "レポートのエクスポート" | — | i18n key: `admin.ads.export.title` | `text-2xl font-bold tracking-tight sm:text-3xl` |
| 169 | `lblExportSubtitle` | ページサブタイトル | Static Label (`<p>`) | String | — | 表示。テキスト: "広告と料金履歴のCSVレポートを作成します" | — | i18n key: `admin.ads.export.subtitle` | `text-muted-foreground` |
| 170 | `btnBackToAdsFromExport` | 広告一覧へ戻るボタン | Button (`outline`, `size="sm"`) | — | — | 表示。テキスト: "広告一覧に戻る" with ArrowLeft icon | — | — | `/admin/ads` に遷移。i18n key: `admin.ads.export.backToAds` |

### 4.35 レポート種別選択

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 171 | `cardAdPerformance` | 広告パフォーマンスカード | Card (selectable) | — | — | デフォルト選択。ラベル: "Ad Performance"。説明: "Approved ads with payments and stats" | — | — | BarChart3 icon。`sm:grid-cols-3` |
| 172 | `cardSubmissionHistory` | 提出履歴カード | Card (selectable) | — | — | 選択可能。ラベル: "Submission History"。説明: "All advertisement submissions" | — | — | History icon |
| 173 | `cardFeeHistory` | 料金履歴カード | Card (selectable) | — | — | 選択可能。ラベル: "Fee History"。説明: "Fee setting change records" | — | — | FileDown icon |

### 4.36 エクスポート設定

| No. | 項目ID | 論理項目名 | コンポーネント種別 | 型/最大長 | 必須 | 初期値 | 入力制約 | データソース/DBマッピング | 備考/ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 174 | `dateRangeExport` | 日付範囲ピッカー | DateRangePicker | Date Range | Yes | デフォルト: 過去30日 | 有効な日付範囲; end < start でエラー表示 | — | i18n key: `admin.ads.export.dateRange` |
| 175 | `selExportPlacement` | 掲載枠フィルタ | MultiSelect | Array[Enum] | No | 空欄（すべて） | オプション: 検索ページバナー, おすすめページバナー, 購入手続きページバナー, 商品詳細ページバナー | — | i18n key: `admin.ads.export.placementsLabel` |
| 176 | `selExportTier` | プラン選択フィルタ | MultiSelect | Array[Enum] | No | 空欄（すべて） | オプション: ベーシック, スタンダード, プレミアム | — | i18n key: `admin.ads.export.tiersLabel` |
| 177 | `selExportStatus` | ステータスフィルタ | MultiSelect | Array[Enum] | No | 空欄（すべて） | オプション: 保留中, 承認済み, 却下済み | — | i18n key: `admin.ads.export.statusesLabel` |
| 178 | `txtExportShopFilter` | 店舗フィルタ | Input (`text`) | String | No | 空欄。プレースホルダー: "店舗を検索..." | — | — | i18n key: `admin.ads.export.searchShopPlaceholder`。`h-9 w-full sm:w-48` |
| 179 | `selExportFormat` | 形式選択 | Select | Enum | Yes | デフォルト: CSV（無効） | オプション: CSV のみ | — | i18n key: `admin.ads.export.format`。`h-9 w-full sm:w-28` |
| 180 | `lblExportHelperText` | ヘルパーテキスト | Static Label | String | — | "CSVレポートを作成してダウンロードします。フィルターは任意です。空欄の場合はすべてが対象になります。" | — | i18n key: `admin.ads.export.helperText` | `text-xs text-muted-foreground` |
| 181 | `lblExportInvalidRange` | 無効範囲エラー | Static Label (alert) | String | — | "終了日は開始日より後の日付にしてください。" | — | — | 日付範囲無効時に表示。i18n key: `admin.ads.export.invalidRange` |
| 182 | `btnGenerateExport` | レポート作成ボタン | Button (`default`) with Download icon | — | — | 表示。テキスト: "レポートを作成" / "作成中..." | — | — | i18n key: `admin.ads.export.generateReport` / `admin.ads.export.generating`。無効範囲または生成中に無効 |

---

## 5. 各項目の挙動とイベント仕様

### 5.1 広告一覧画面の挙動

| 項目ID | 発火イベント | 処理ロジック | 例外処理 |
| :--- | :--- | :--- | :--- |
| `btnManagePackages` | Click | `/admin/ads/packages` に遷移 | — |
| `btnRevenueAnalytics` | Click | `/admin/ads/analytics` に遷移 | — |
| `btnExport` | Click | `/admin/ads/export` に遷移 | — |
| `selStatusFilter` | Change | フィルター状態更新、1ページ目にリセット、再取得 | — |
| `selPlacementFilter` | Change | フィルター状態更新、1ページ目にリセット、再取得 | — |
| `selTierFilter` | Change | フィルター状態更新、1ページ目にリセット、再取得 | — |
| `txtShopSearch` | Input (デバウンス300ms) | トリムした店舗名でフィルター状態更新、再取得 | — |
| `dateRangeFilter` | Change | 日付範囲でフィルター状態更新、再取得 | — |
| `btnRefreshFilters` | Click | 全フィルターをデフォルト（空）にリセット、店舗入力クリア | — |
| `chkSelectAllAds` | Change | 保留中の全行チェックボックスを切り替え。一括操作バーの件数更新 | — |
| `chkSelectAd` | Change | 行チェックボックスを切り替え。一括操作バーの件数更新 | — |
| `btnReviewAd` | Click | 広告IDで詳細取得し、審査モーダル（編集可能）を開く | — |
| `btnViewAd` | Click | 広告IDで詳細取得し、審査モーダル（閲覧専用）を開く | — |
| `btnBulkApprove` | Click | 一括承認モーダルを開く | — |
| `btnBulkReject` | Click | 一括却下モーダルを開く | — |
| `btnClearSelection` | Click | 全チェックボックスを解除。一括操作バーを非表示 | — |
| `pagAds` | Page change | ページ状態を更新、再取得 | — |
| `pagAds` | Limit change | limit状態を更新、1ページ目にリセット、再取得 | — |
| URL `?highlightAdId=` | ページロード | 紫色のoutlineで行ハイライト、スクロール、「新着」バッジを3秒間表示 | — |

### 5.2 審査モーダルの挙動

| 項目ID | 発火イベント | 処理ロジック | 例外処理 |
| :--- | :--- | :--- | :--- |
| `btnCancelReview` / `btnCloseReview` | Click / Escape | モーダルを閉じる | — |
| `btnApproveAd` | Click | 承認mutationを呼ぶ。成功時にモーダルを閉じ、成功トースト表示 | 失敗時にエラートースト表示 |
| `btnRejectAd` | Click | 却下理由入力セクションを表示（textarea + 戻る + 却下を確定ボタン） | — |
| `btnBackFromReject` | Click | 却下理由入力セクションを非表示。承認/却下選択に戻る | — |
| `btnConfirmReject` | Click | 理由が空でないことを検証。却下mutationを呼ぶ。成功時にモーダルを閉じ、成功トースト表示 | 失敗時にエラートースト表示。理由空欄時ボタン無効 |
| `txtRejectionReason` | Input | 却下理由の状態を更新し、文字数カウントを表示 | — |

### 5.3 一括却下モーダルの挙動

| 項目ID | 発火イベント | 処理ロジック | 例外処理 |
| :--- | :--- | :--- | :--- |
| `btnCancelBulkReject` / Close | Click / Escape | モーダルを閉じる | — |
| `btnConfirmBulkReject` | Click | 理由が空でないことを検証。一括却下mutationを呼ぶ。成功時にモーダルを閉じ、成功トースト表示。選択解除 | 失敗時にエラートースト表示。理由空欄時ボタン無効 |
| `txtBulkRejectReason` | Input | 却下理由の状態を更新し、文字数カウントを表示 | — |

### 5.4 一括承認モーダルの挙動

| 項目ID | 発火イベント | 処理ロジック | 例外処理 |
| :--- | :--- | :--- | :--- |
| `btnCancelBulkApprove` / Close | Click / Escape | モーダルを閉じる | — |
| `btnConfirmBulkApprove` | Click | 一括承認mutationを呼ぶ。成功時にモーダルを閉じ、成功トースト表示。選択解除 | 失敗時にエラートースト表示 |

### 5.5 広告プラン・料金管理の挙動

| 項目ID | 発火イベント | 処理ロジック | 例外処理 |
| :--- | :--- | :--- | :--- |
| `btnBackToAdsFromPackages` | Click | `/admin/ads` に遷移 | — |
| `btnViewFeeHistory` | Click | `/admin/ads/fee-history` に遷移 | — |
| `btnCreateFeeSetting` | Click | Fee作成モーダルを開く | — |
| `btnEditFee` | Click | Fee編集モーダルを開く（データ事前入力済み） | — |
| `btnDeactivateFee` | Click | Fee無効化モーダルを開く | — |
| `btnReactivateFee` | Click | Fee再有効化モーダルを開く | — |
| `btnCreateFee` | Click | 全項目検証。一意性チェック（掲載枠+プラン）。作成mutationを呼ぶ。成功時にモーダルを閉じ、成功トースト表示 | バリデーションエラーはインライン表示。失敗時にエラートースト表示 |
| `btnSaveFee` | Click | 全項目検証。更新mutationを呼ぶ。成功時にモーダルを閉じ、成功トースト表示 | バリデーションエラーはインライン表示。失敗時にエラートースト表示 |
| `btnConfirmDeactivateFee` | Click | 理由を検証。無効化mutationを呼ぶ。成功時にモーダルを閉じ、成功トースト表示 | 失敗時にエラートースト表示 |
| `btnConfirmReactivateFee` | Click | 再有効化mutationを呼ぶ。成功時にモーダルを閉じ、成功トースト表示 | 失敗時にエラートースト表示 |

### 5.6 料金変更履歴の挙動

| 項目ID | 発火イベント | 処理ロジック | 例外処理 |
| :--- | :--- | :--- | :--- |
| `btnBackToPackages` | Click | `/admin/ads/packages` に遷移 | — |
| `selHistoryMonthFilter` | Change | 月フィルター更新、1ページ目にリセット、選択解除、再取得 | — |
| `selHistoryPlacementFilter` | Change | 掲載枠フィルター更新、1ページ目にリセット、選択解除、再取得 | — |
| `selHistoryTierFilter` | Change | プラン選択フィルター更新、1ページ目にリセット、選択解除、再取得 | — |
| `chkSelectAllHistory` | Change | 削除可能な全行チェックボックスを切り替え | — |
| `chkSelectHistoryRow` | Change | 行チェックボックスを切り替え | — |
| `btnDeleteSelectedHistory` | Click | 選択されたIDで履歴削除モーダルを開く | — |
| `btnDeleteHistoryRow` | Click | 単一行IDで履歴削除モーダルを開く | — |
| `btnConfirmDeleteHistory` | Click | 削除mutationを呼ぶ。成功時にモーダルを閉じ、成功トースト表示。選択解除 | 失敗時にエラートースト表示 |
| `btnClearHistorySelection` | Click | 全チェックボックスを解除 | — |
| `pagFeeHistory` | Page change | ページ状態を更新、選択解除、再取得 | — |

### 5.7 収益分析の挙動

| 項目ID | 発火イベント | 処理ロジック | 例外処理 |
| :--- | :--- | :--- | :--- |
| `btnBackToAdsFromAnalytics` | Click | `/admin/ads` に遷移 | — |
| `dateRangeAnalytics` | Change | 日付範囲状態を更新、分析データを再取得 | — |
| `selAnalyticsPlacement` | Change | 掲載枠フィルター状態を更新、分析データを再取得 | — |
| `selAnalyticsTier` | Change | プラン選択フィルター状態を更新、分析データを再取得 | — |
| `chartRevenueTrend` | Hover | ホバーしたポイントの日付と収益をツールチップで表示 | — |

### 5.8 エクスポートレポートの挙動

| 項目ID | 発火イベント | 処理ロジック | 例外処理 |
| :--- | :--- | :--- | :--- |
| `btnBackToAdsFromExport` | Click | `/admin/ads` に遷移 | — |
| `cardAdPerformance` | Click | レポート種別を `ad_performance` に設定 | — |
| `cardSubmissionHistory` | Click | レポート種別を `submission_history` に設定 | — |
| `cardFeeHistory` | Click | レポート種別を `fee_history` に設定 | — |
| `btnGenerateExport` | Click | 日付範囲を検証。レポート種別別のエクスポートmutationを呼ぶ。成功時に成功トースト表示 | 失敗時にエラートースト表示。無効範囲時ボタン無効 |

---

## 6. バリデーションとエラー処理マッピング

### 6.1 広告審査バリデーション

| フィールド | ルール | エラーメッセージ（EN） | エラーメッセージ（JA） |
| :--- | :--- | :--- | :--- |
| `rejection_reason` | 却下時は必須 | "Rejection reason is required." | "却下理由を入力してください。" |
| `rejection_reason` | MaxLength: 1000 | (maxLength で強制) | — |

### 6.2 一括却下バリデーション

| フィールド | ルール | エラーメッセージ（EN） | エラーメッセージ（JA） |
| :--- | :--- | :--- | :--- |
| `rejection_reason` | 必須 | "Rejection reason is required." | "却下理由を入力してください。" |
| `rejection_reason` | MaxLength: 1000 | (maxLength で強制) | — |
| `ad_ids` | 最小1件 | (0件選択時ボタン無効) | — |
| `ad_ids` | 最大50件 | "Maximum 50 ads per bulk operation." | "一括操作では広告を最大50件まで選択できます。" |

### 6.3 Fee設定バリデーション

| フィールド | ルール | エラーメッセージ（EN） | エラーメッセージ（JA） |
| :--- | :--- | :--- | :--- |
| `placement` | 必須、有効なenum | "Placement is required" | "掲載枠を選択してください" |
| `tier` | 必須、有効なenum | "Tier is required" | "プランを選択してください" |
| `daily_rate` | 必須、> 0 | "Daily rate must be greater than 0" | "日額料金は0より大きい値にしてください" |
| `duration_days` | 必須、整数 ≥ 1 | "Duration must be at least 1 day" | "期間は1日以上にしてください" |
| `max_ads` | 必須、整数 ≥ 1 | "Max ads must be at least 1" | "広告上限数は1以上にしてください" |
| `effective_from` | 必須、有効な日付 | "Effective date is required" | "適用開始日を入力してください" |
| `change_reason` | 必須（編集/無効化時）、MaxLength: 1000 | "Change reason is required" / "Change reason must not exceed 1000 characters" | "変更理由を入力してください" / "変更理由は1000文字以内で入力してください" |
| 重複 | placement+tier の既存設定禁止 | "A fee setting already exists for this placement and tier." | "この掲載枠とプランの料金設定はすでに存在します。" |

### 6.4 エクスポートバリデーション

| フィールド | ルール | エラーメッセージ（EN） | エラーメッセージ（JA） |
| :--- | :--- | :--- | :--- |
| `dateFrom` | 必須 | (ボタン無効) | — |
| `dateTo` | 必須 | (ボタン無効) | — |
| `dateRange` | End ≥ Start | "End date must be after start date." | "終了日は開始日より後の日付にしてください。" |
| `format` | 固定: CSV | — | — |

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
| `lblPlacement` | `advertisements.placement` | VARCHAR(50) | Enum: `search_page_banner`, `recommendation_page_banner`, `checkout_page_banner`, `productDetail_page_banner` |
| `lblTier` | `advertisements.tier` | VARCHAR(20) | Enum: `basic`, `standard`, `premium` |
| `badgeAdStatus` | `advertisements.approval_status` | VARCHAR(20) | Enum: `pending`, `approved`, `rejected` |
| `badgePaymentStatus` | `advertisements.payment_status` | VARCHAR(20) | Enum: `pending`, `completed`, `refunded` |
| `lblSubmittedAt` | `advertisements.created_at` | TIMESTAMP | — |
| `lblFee` | `advertisements.payment_amount` | DECIMAL(10,2) | — |
| `imgAdBanner` | `advertisements.image_url` | TEXT | — |
| `lblAdAnnouncement` | `advertisements.announcement_message` | VARCHAR(500) | — |
| `lblAdContent` | `advertisements.content` | TEXT | — |
| `lblAdSku` | `advertisements.sku` | VARCHAR(100) | — |
| `lblAdSchedule` | `advertisements.starts_at`, `advertisements.expires_at` | TIMESTAMPTZ | — |
| `txtRejectionReason` | `advertisements.rejection_reason` | TEXT | — |

### 7.2 Ad Payments テーブル

| UI要素 | DB列 | 型 | 備考 |
| :--- | :--- | :--- | :--- |
| `lblFeePaid` | `ad_payments.amount` | DECIMAL(10,2) | — |
| `badgePaymentStatusDetail` | `ad_payments.payment_status` | VARCHAR(20) | Enum: `pending`, `completed`, `refunded` |
| `lblPaidOn` | `ad_payments.paid_at` | TIMESTAMP | — |

### 7.3 Ad Fee Settings テーブル

| UI要素 | DB列 | 型 | 備考 |
| :--- | :--- | :--- | :--- |
| `lblFeePlacement` | `ad_fee_settings.placement` | VARCHAR(50) | Enum: `search_page_banner`, `recommendation_page_banner`, `checkout_page_banner`, `productDetail_page_banner` |
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

## 8. 配置場所・ティア列挙値

### 8.1 配置場所 (Placements)

| Enum Value | 表示ラベル (EN) | 表示ラベル (JA) |
| :--- | :--- | :--- |
| `search_page_banner` | Search Page Banner | 検索ページバナー |
| `recommendation_page_banner` | Recommendation Page Banner | おすすめページバナー |
| `checkout_page_banner` | Checkout Page Banner | 購入手続きページバナー |
| `productDetail_page_banner` | Product Detail Page Banner | 商品詳細ページバナー |

### 8.2 ティア (Tiers)

| Enum Value | 表示ラベル (EN) | 表示ラベル (JA) |
| :--- | :--- | :--- |
| `basic` | Basic | ベーシック |
| `standard` | Standard | スタンダード |
| `premium` | Premium | プレミアム |

### 8.3 承認ステータス (Approval Statuses)

| Enum Value | 表示ラベル (EN) | 表示ラベル (JA) |
| :--- | :--- | :--- |
| `pending` | Pending | 保留中 |
| `approved` | Approved | 承認済み |
| `rejected` | Rejected | 却下済み |

### 8.4 支払いステータス (Payment Statuses)

| Enum Value | 表示ラベル (EN) | 表示ラベル (JA) |
| :--- | :--- | :--- |
| `completed` | Completed | 完了 |
| `pending` | Pending | 保留中 |
| `refunded` | Refunded | 返金済み |

---

## 9. ビジネスルール要約

1. 広告パッケージの価格は Fee Setting で定義される（掲載場所、ティア、日額料金、期間、広告上限数）。最大12パッケージ（4掲載場所 × 3ティア）。
2. **合計料金 = 日額料金 × 期間日数** がパッケージ選択時と審査モーダルで表示される。
3. 加盟店と管理者の双方に、パッケージ選択時と審査モーダルで料金が明確に表示される。
4. 支払い完了と提出後、広告は PENDING 審査状態になる。
5. **PENDING の広告だけが承認・却下可能。**
6. 管理者承認で、指定スケジュール (`starts_at` ~ `expires_at`) に従って表示可能になる。
7. 管理者却下には理由が必須（必須、1000文字以内）。
8. 却下された広告は表示されない。
9. **却下された広告は支払済み額の100%が返金される。**
10. **料金固定ルール:** 後続の Fee Setting 更新は、既に購入済みの広告料金には影響しない。
11. Fee Setting の変更は、それ以降に作成される新規広告にだけ適用される。
12. Fee Setting 無効化は、すでにその設定を使って購入済みの広告には影響しない。
13. 料金変更履歴の当月レコードは保護され、削除不可。
14. 一括操作は最大50件まで。
15. ページネーションのデフォルトページサイズは10。選択肢: 10, 20, 50, 100。
