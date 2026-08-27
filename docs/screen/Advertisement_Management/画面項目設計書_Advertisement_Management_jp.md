# 画面項目設計書 — 広告管理（Advertisement Management）

**ドキュメントID:** SKM-SIS-SCR-AD-001
**対象画面:** 広告管理
**サブシステム:** 広告 ― ショップ広告管理
**機能ID:** FN-AD-001
**バージョン:** 1.1
**作成日:** 2026-08-25
**最終更新日:** 2026-08-25
**作成者:** シニアシステムエンジニア
**レビューステータス:** 承認済み
**分類:** 社内 ― エンジニアリング部門

---

## 1. ドキュメント管理

### 1.1 ドキュメント改訂履歴

| バージョン | 日付 | 作成者 | 変更内容の説明 |
| :--- | :--- | :--- | :--- |
| 1.0 | 2026-08-25 | シニアシステムエンジニア | 初版リリース。マーチャント広告管理（`/merchant/advertisements`）と管理者広告モデレーション（`/admin/ads`）画面の画面項目仕様。パッケージカタログ、コンテンツアップロードダイアログ、支払いダイアログ、編集ダイアログ、管理者料金設定パネルを含む。 |
| 1.1 | 2026-08-25 | シニアシステムエンジニア | DATABASE_SPEC v2.5 および機能設計書 v2.6 に整合。DB層参照からアプリケーションレベルの状態（`draft`、`content_uploaded`）を削除。更新：承認ステータスのフィルタオプション（§4.6）、バッジ色（§4.7）、ボタン表示条件（§4.7）、バックエンド実行ロジック（§5.1〜5.4）、APIレスポンス例（§8.1〜8.2）、DBデフォルト（§7.2）、テストチェックリスト（§12.4〜12.5）。 |

### 1.2 関連ドキュメント

| No. | ドキュメントID | ドキュメント名 | ファイルパス | 備考 |
| :-- | :--- | :--- | :--- | :--- |
| 1 | SKM-REQ-001 | 要件定義書 | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | §4.4 広告（マーチャント）、§5.3 広告管理（管理者）、§7.6 ビジネスルール。 |
| 2 | SKM-DBS-001 | データベース設計書 | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | `advertisements`（§3.13）、`ad_fee_settings`（§3.14）、`ad_payments`（§3.15）、`ad_fee_history`（§3.16）、`shops` テーブル。 |
| 3 | SKM-DEV-001 | 開発ルール | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` | 命名規則、RBAC、REST規約（§8.1：部分更新時のPATCH）、監査保持（§6.4）、広告ルール（§12.7）。 |
| 4 | SKM-FDS-AD-001 | 機能設計書 ― 広告管理 | `docs/screen/Advertisement_Management/機能設計書_Advertisement_Management.md` | ユースケース、状態遷移、検証ルール、エラー処理、画面仕様（§5）、操作（§6）。 |

---

## 2. 画面概要・目的

### 2.1 目的
広告管理画面により、マーチャントは管理者が作成した広告パッケージの閲覧、パッケージの選択、広告コンテンツのアップロード、広告料金の支払い、自社広告の管理（閲覧、編集、切り替え、削除、却下の再提出）ができます。管理者広告モデレーション画面により、管理者はマーチャントが提出した広告の審査・承認・却下と、パッケージカタログの管理（作成、料金更新、無効化）ができます。

### 2.2 対象ユーザーと権限

| 属性 | 値 |
| :--- | :--- |
| **主要アクター** | 認証済みマーチャント（CRUDは `license_status = 'approved'`、読み取り専用は `'pending'`/`'rejected'`）、認証済み管理者 |
| **必要な認証** | JWT ベアラートークン（マーチャント/管理者）。公開（ストアフロントのアクティブ広告表示） |
| **データ範囲** | マーチャント：自社ショップの広告のみ。管理者：全広告と全パッケージ料金設定。購入者：アクティブ承認済み広告（公開）。 |
| **アクセス制御** | マーチャントエンドポイントは `merchant` ロール＋変更時のショップ承認が必要。管理者エンドポイントは `admin` ロールが必要。公開エンドポイント（`GET /ads/active`）は認証不要。 |

### 2.3 主要機能・基本設計方針
1. **パッケージカタログ閲覧** ― マーチャントは管理者作成パッケージ（掲載場所 × 料金プラン × 料金 × 期間）を閲覧。
2. **パッケージ選択** ― パッケージを選択して下書き広告を作成。
3. **コンテンツアップロード** ― 広告コンテンツ（タイトル、内容、画像、告知メッセージ）をアップロードし、スケジュールを設定。
4. **料金支払い** ― 広告料金を支払い。広告は管理者承認キューに入る。
5. **広告管理** ― 自社広告の閲覧、コンテンツ編集、掲載/非掲載切り替え、論理削除。
6. **再提出** ― 支払い後に却下された広告を編集・再提出。
7. **管理者モデレーション** ― 理由付きで広告を承認または却下。却下時に自動返金。
8. **管理者パッケージ管理** ― パッケージの作成、料金更新、無効化。レート変更は監査。
9. **フォーム検証** ― React Hook Form + Zod によるリアルタイムフィードバック付きクライアント側検証。
10. **エラー処理** ― インラインおよびフォームレベルエラーをエラーコード付きで表示。
11. **国際化** ― EN、JA、MY の完全な i18n サポート。
12. **レスポンシブデザイン** ― モバイルファーストのダッシュボードレイアウトとダイアログモーダル。

---

## 3. 画面レイアウト構成

### 3.1 全体画面構成

#### マーチャント広告管理ページ レイアウト（`/merchant/advertisements`）
```text
┌─────────────────────────────────────────────────────────┐
│                    BROWSER VIEWPORT                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │  [A] SIDEBAR NAVIGATION                             ││
│  │  Merchant Portal / Advertisements (active)           ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │  [B] PAGE HEADER                                    ││
│  │  [B1] Title: "広告"                                 ││
│  │  [B2] Subtitle: "広告パッケージを選択し..."          ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │  [C] PENDING MERCHANT BANNER (条件付き)             ││
│  │  Info: "ショップの承認が完了していません..."          ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │  [D] STATISTICS CARDS ROW                           ││
│  │  [D1] Active Ads Count  [D2] Pending Count          ││
│  │  [D3] Expired Count                                  ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │  [E] PACKAGE CATALOG SECTION                        ││
│  │  [E1] Section Title: "利用可能なパッケージ"          ││
│  │  [E2] Package Cards Grid                            ││
│  │      ┌─────────────────────────────────────────┐    ││
│  │      │ Package Card                            │    ││
│  │      │  [E2a] Placement Name                   │    ││
│  │      │  [E2b] Tier Badge (Basic/Std/Premium)   │    ││
│  │      │  [E2c] Daily Rate: ¥X.XX/day            │    ││
│  │      │  [E2d] Duration: X days                 │    ││
│  │      │  [E2e] Max Ads: X                       │    ││
│  │      │  [E2f] Total Fee: ¥XX.XX                │    ││
│  │      │  [E2g] Select Button                     │    ││
│  │      └─────────────────────────────────────────┘    ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │  [F] TOOLBAR                                        ││
│  │  [F1] Status Filter (Select)                        ││
│  │  [F2] Approval Status Filter (Select)               ││
│  │  [F3] Search Input                                  ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │  [G] ADVERTISEMENT LIST                             ││
│  │  ┌─────────────────────────────────────────────┐    ││
│  │  │ Ad Card                                    │    ││
│  │  │  [G1] Thumbnail Image                      │    ││
│  │  │  [G2] Title                                │    ││
│  │  │  [G3] Approval Status Badge                │    ││
│  │  │  [G4] Payment Status Badge                 │    ││
│  │  │  [G5] Content Preview (truncated)          │    ││
│  │  │  [G6] Announcement Message (truncated)     │    ││
│  │  │  [G7] Schedule Display                     │    ││
│  │  │  [G8] Rejection Reason (条件付き)           │    ││
│  │  │  [G9] Pay Fee Button (条件付き)             │    ││
│  │  │  [G10] Resubmit Button (条件付き)           │    ││
│  │  │  [G11] Edit Button (条件付き)               │    ││
│  │  │  [G12] Delete Button (条件付き)             │    ││
│  │  │  [G13] Toggle Active Switch (条件付き)      │    ││
│  │  └─────────────────────────────────────────────┘    ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │  [H] PAGINATION                                     ││
│  │  [H1] Page Info  [H2] Prev  [H3] Next              ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### パッケージ選択確認ダイアログ レイアウト
```text
┌─────────────────────────────────────────────────────────┐
│                   DIALOG OVERLAY                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │  [I] PACKAGE SELECTION CONFIRMATION DIALOG          ││
│  │                                                     ││
│  │  [I1] Dialog Title: "広告パッケージを選択"          ││
│  │                                                     ││
│  │  [I2] Package Info (read-only):                     ││
│  │       Placement / Tier / Rate / Duration / Fee      ││
│  │                                                     ││
│  │  ┌──────────────────────────────────────────────┐  ││
│  │  │  [I3] Confirm Select Button    [I4] Cancel   │  ││
│  │  └──────────────────────────────────────────────┘  ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
└─────────────────────────────────────────────────────────┘
```
#### 広告コンテンツアップロードダイアログ レイアウト
```text
┌─────────────────────────────────────────────────────────┐
│                   DIALOG OVERLAY                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │  [J] UPLOAD AD CONTENT DIALOG                       ││
│  │                                                     ││
│  │  [J1] Dialog Title: "広告コンテンツをアップロード"   ││
│  │  [J2] Close Button (X icon)                         ││
│  │                                                     ││
│  │  [J3] Placement Display (read-only)                 ││
│  │  [J4] Tier Display (read-only)                      ││
│  │                                                     ││
│  │  [J5] Title Input                                   ││
│  │  [J6] Content Textarea                              ││
│  │  [J7] Image Upload (drag & drop + file picker)      ││
│  │  [J8] Link URL Input                                ││
│  │  [J9] Announcement Message Textarea                 ││
│  │  [J10] Start Date Picker                            ││
│  │  [J11] End Date Display (read-only, auto-calculated)││
│  │  [J12] Fee Summary (read-only)                      ││
│  │                                                     ││
│  │  ┌──────────────────────────────────────────────┐  ││
│  │  │  [J13] Cancel    [J14] Save & Continue       │  ││
│  │  └──────────────────────────────────────────────┘  ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### 支払い確認ダイアログ レイアウト
```text
┌─────────────────────────────────────────────────────────┐
│                   DIALOG OVERLAY                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │  [K] PAYMENT CONFIRMATION DIALOG                    ││
│  │                                                     ││
│  │  [K1] Dialog Title: "広告料金を支払う"              ││
│  │                                                     ││
│  │  [K2] Fee Summary Text                              ││
│  │       "Advertising Fee: ¥3,850 · 7 days × ¥550/day" ││
│  │                                                     ││
│  │  [K3] Payment Reference Input (optional, hidden)    ││
│  │                                                     ││
│  │  ┌──────────────────────────────────────────────┐  ││
│  │  │  [K4] Cancel    [K5] Pay & Submit             │  ││
│  │  └──────────────────────────────────────────────┘  ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### 広告コンテンツ編集ダイアログ レイアウト
```text
┌─────────────────────────────────────────────────────────┐
│                   DIALOG OVERLAY                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │  [L] EDIT AD CONTENT DIALOG                         ││
│  │                                                     ││
│  │  [L1] Dialog Title: "広告コンテンツを編集"           ││
│  │                                                     ││
│  │  [L2] Title Input                                   ││
│  │  [L3] Content Textarea                              ││
│  │  [L4] Image Upload (with current preview)           ││
│  │  [L5] Link URL Input                                ││
│  │  [L6] Announcement Message Textarea                 ││
│  │                                                     ││
│  │  ┌──────────────────────────────────────────────┐  ││
│  │  │  [L7] Cancel    [L8] Save                     │  ││
│  │  │         [L9] Save & Pay (rejected only)       │  ││
│  │  └──────────────────────────────────────────────┘  ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
└─────────────────────────────────────────────────────────┘
```
#### 管理者広告モデレーションページ レイアウト（`/admin/ads`）
```text
┌─────────────────────────────────────────────────────────┐
│                    BROWSER VIEWPORT                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │  [A] SIDEBAR NAVIGATION                             ││
│  │  Admin Portal / Ad Management (active)               ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │  [M] PAGE HEADER                                    ││
│  │  [M1] Title: "広告モデレーション"                   ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │  [N] PENDING APPROVAL QUEUE                         ││
│  │  [N1] Weekly Limit Indicator: "X of 5 active"       ││
│  │  [N2] Pending Ad Cards                              ││
│  │      ┌─────────────────────────────────────────┐    ││
│  │      │ Pending Ad Card                         │    ││
│  │      │  [N2a] Thumbnail                        │    ││
│  │      │  [N2b] Title                            │    ││
│  │      │  [N2c] Content Preview                  │    ││
│  │      │  [N2d] Announcement Message             │    ││
│  │      │  [N2e] Schedule                         │    ││
│  │      │  [N2f] Shop Name                        │    ││
│  │      │  [N2g] Fee / Payment Info               │    ││
│  │      │  [N2h] Approve Button                   │    ││
│  │      │  [N2i] Reject Button                    │    ││
│  │      │  [N2j] Rejection Reason Textarea (cond.)│    ││
│  │      └─────────────────────────────────────────┘    ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │  [O] FEE SETTINGS / PACKAGE MANAGEMENT SECTION      ││
│  │  [O1] Section Title: "広告パッケージ"               ││
│  │  [O2] New Package Button                            ││
│  │  [O3] Fee Settings Table                            ││
│  │      ┌─────────────────────────────────────────┐    ││
│  │      │ Fee Settings Table                      │    ││
│  │      │  Columns: Placement | Tier | Daily Rate │    ││
│  │      │  | Duration | Max Ads | Active | Actions│    ││
│  │      │  [O3a] Edit Rate Button per row          │    ││
│  │      │  [O3b] Deactivate Button per row         │    ││
│  │      │  [O3c] Fee History Button per row        │    ││
│  │      └─────────────────────────────────────────┘    ││
│  │  [O4] All Ads Table                                ││
│  │      ┌─────────────────────────────────────────┐    ││
│  │      │ All Ads Table                           │    ││
│  │      │  Columns: Title | Shop | Status |       │    ││
│  │      │  Approval | Payment | Schedule | Actions │    ││
│  │      └─────────────────────────────────────────┘    ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### 管理者パッケージ作成ダイアログ レイアウト
```text
┌─────────────────────────────────────────────────────────┐
│                   DIALOG OVERLAY                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │  [P] CREATE PACKAGE DIALOG                          ││
│  │                                                     ││
│  │  [P1] Dialog Title: "広告パッケージを作成"           ││
│  │                                                     ││
│  │  [P2] Placement Select                              ││
│  │  [P3] Tier Select                                   ││
│  │  [P4] Daily Rate Input                              ││
│  │  [P5] Duration Days Input                           ││
│  │  [P6] Max Ads Input                                 ││
│  │                                                     ││
│  │  ┌──────────────────────────────────────────────┐  ││
│  │  │  [P7] Cancel    [P8] Create Package          │  ││
│  │  └──────────────────────────────────────────────┘  ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 3.2 レスポンシブ対応

| ブレークポイント | 最小幅 | レイアウト動作 |
| :--- | :--- | :--- |
| モバイル（デフォルト） | 0px | 単一列の広告カード、ダイアログはフルスクリーンシートに、パッケージカードは積み重ね |
| タブレット（`md:`） | 768px | 広告カードは2列グリッド、サイドバーは折りたたみ、ダイアログは中央寄せ |
| デスクトップ（`lg:`） | 1024px | サイドバー付きの完全なダッシュボードレイアウト、サムネイル付き広告カード、3列パッケージグリッド |
| ワイド（`xl:`） | 1280px | より広いパッケージグリッド（4列）、拡張されたテーブル列 |

---

## 4. 画面項目定義

### 4.1 セクション[A]：サイドバーナビゲーション

| No. | 項目ID | 項目名（論理） | コンポーネント種別 | データ型・最大長 | 必須 | 初期状態・デフォルト値 | 入力制約・形式 | データソース / DBマッピング | 備考・ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 1 | `navSidebar` | サイドバーナビゲーション | Sidebar（`MerchantLayout` / `AdminLayout`） | — | はい | ロールに応じて描画。マーチャントは「広告」、管理者は「広告管理」がハイライト | — | ロールベースナビゲーション設定（`navConfig.ts`） | 標準サイドバーコンポーネントを使用。アクティブ項目: `bg-purple-100/60 text-primary`。開発ルール §9.7 参照。 |

### 4.2 セクション[B]：ページヘッダー

| No. | 項目ID | 項目名（論理） | コンポーネント種別 | データ型・最大長 | 必須 | 初期状態・デフォルト値 | 入力制約・形式 | データソース / DBマッピング | 備考・ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 2 | `lblAdTitle` | ページタイトル | 静的ラベル（`<h1>`） | String | はい | テキスト: "広告" | — | ハードコードされたUIテキスト | Tailwind: `text-3xl font-bold tracking-tight`。i18n: `merchant.ads.title`。 |
| 3 | `lblAdSubtitle` | ページサブタイトル | 静的ラベル（`<p>`） | String | いいえ | テキスト: "広告パッケージを選択し、コンテンツをアップロードして、広告を管理します。" | — | ハードコードされたUIテキスト | Tailwind: `text-muted-foreground`。i18n: `merchant.ads.subtitle`。 |

### 4.3 セクション[C]：出品者承認待ちバナー

| No. | 項目ID | 項目名（論理） | コンポーネント種別 | データ型・最大長 | 必須 | 初期状態・デフォルト値 | 入力制約・形式 | データソース / DBマッピング | 備考・ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 4 | `bannerPendingMerchant` | 出品者承認待ち情報 | Alert（`info`） | String | 条件付き | デフォルトは非表示。`license_status` が `'pending'` または `'rejected'` のときに表示 | — | `merchants.license_status` | テキスト: "ショップの承認が完了していません。パッケージの閲覧と広告の表示はできますが、ショップの承認が完了するまでパッケージを選択できません。" Tailwind: `border-blue-500/50 text-blue-700`。i18n: `merchant.ads.pendingBanner`。 |

### 4.4 セクション[D]：統計カード

| No. | 項目ID | 項目名（論理） | コンポーネント種別 | データ型・最大長 | 必須 | 初期状態・デフォルト値 | 入力制約・形式 | データソース / DBマッピング | 備考・ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 5 | `statActiveAds` | 掲載中広告の統計 | Card | Integer | はい | ローディングスケルトン。APIレスポンスからデータを投入 | — | 計算: `approval_status = 'approved'` かつ `payment_status = 'completed'` かつ `is_active = true` かつスケジュール内の広告数 | i18n: `merchant.ads.statActive`。Tailwind: `bg-secondary/50`。 |
| 6 | `statPendingApproval` | 承認待ちの統計 | Card | Integer | はい | ローディングスケルトン。APIレスポンスからデータを投入 | — | 計算: `approval_status = 'pending'` かつ `payment_status = 'completed'` の広告数 | i18n: `merchant.ads.statPending`。Tailwind: `bg-amber-100/50`。 |
| 7 | `statExpiredAds` | 期限切れの統計 | Card | Integer | はい | ローディングスケルトン。APIレスポンスからデータを投入 | — | 計算: `expires_at < now()` の広告数 | i18n: `merchant.ads.statExpired`。Tailwind: `bg-muted/50`。 |

### 4.5 セクション[E]：広告パッケージカタログ

| No. | 項目ID | 項目名（論理） | コンポーネント種別 | データ型・最大長 | 必須 | 初期状態・デフォルト値 | 入力制約・形式 | データソース / DBマッピング | 備考・ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 8 | `lblCatalogTitle` | パッケージカタログタイトル | 静的ラベル（`<h2>`） | String | はい | テキスト: "利用可能なパッケージ" | — | ハードコードされたUIテキスト | i18n: `merchant.ads.catalog`。Tailwind: `text-xl font-semibold`。 |
| 9 | `cardPackage` | パッケージカード | Card | Object | はい | `GET /ads/packages` からのアクティブパッケージのグリッド | — | `ad_fee_settings`（アクティブのみ） | 各カードは掲載場所、料金プラン、日額、期間、最大枠数、計算済み合計料金を表示。 |
| 10 | `lblPlacement` | 掲載場所名 | 静的ラベル（`<span>`） | String | はい | パッケージのテキスト: "ホームページスライダー"、"商品サイドバー" など | — | `ad_fee_settings.placement` | i18n を掲載場所enumからマッピング。 |
| 11 | `badgeTier` | 料金プランバッジ | Badge | Enum | はい | "ベーシック"、"スタンダード"、"プレミアム" | — | `ad_fee_settings.tier` | 色: basic = `bg-gray-100 text-gray-800`、standard = `bg-blue-100 text-blue-800`、premium = `bg-purple-100 text-purple-800`。i18n: `merchant.ads.tier.{tier}`。 |
| 12 | `lblDailyRate` | 日額 | 静的ラベル（`<span>`） | Decimal | はい | 形式: "¥X.XX/day" | — | `ad_fee_settings.daily_rate` | i18n: `merchant.ads.dailyRate`。 |
| 13 | `lblDuration` | 表示日数 | 静的ラベル（`<span>`） | Integer | はい | 形式: "X日" | — | `ad_fee_settings.duration_days` | i18n: `merchant.ads.duration`。 |
| 14 | `lblMaxAds` | 最大枠数 | 静的ラベル（`<span>`） | Integer | はい | 形式: "最大 X 枠" | — | `ad_fee_settings.max_ads` | i18n: `merchant.ads.maxAds`。 |
| 15 | `lblTotalFee` | 合計料金 | 静的ラベル（`<span>`） | Decimal | はい | 形式: "合計: ¥XX.XX" | — | 計算: `日額 × 表示日数` | i18n: `merchant.ads.totalFee`。Tailwind: `text-primary font-bold`。 |
| 16 | `btnSelectPackage` | 選択ボタン | Button（`primary`） | — | はい | 表示。テキスト: "選択" | — | — | `license_status` が `'pending'` または `'rejected'` のとき無効。パッケージ選択確認ダイアログ（§4.13）を開く。i18n: `merchant.ads.select`。Tailwind: `bg-primary text-primary-foreground`。 |

### 4.6 セクション[F]：ツールバー

| No. | 項目ID | 項目名（論理） | コンポーネント種別 | データ型・最大長 | 必須 | 初期状態・デフォルト値 | 入力制約・形式 | データソース / DBマッピング | 備考・ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 17 | `selStatusFilter` | ステータスフィルタ | Select | Enum | いいえ | デフォルト: "すべて" | オプション: すべて、掲載中、期限切れ、非掲載 | — | 表示ステータスで広告一覧をフィルタ。i18n: `merchant.ads.filterStatus`。 |
| 18 | `selApprovalFilter` | 承認ステータスフィルタ | Select | Enum | いいえ | デフォルト: "すべて" | オプション: すべて、承認待ち、承認済み、却下 | — | `approval_status` で広告一覧をフィルタ。i18n: `merchant.ads.filterApproval`。 |
| 19 | `txtAdSearch` | 検索入力 | Input（`text`） | String(100) | いいえ | 空。プレースホルダー: "広告を検索..." | MaxLength: 100 | — | タイトルで自社広告内を検索。i18n: `merchant.ads.search`。 |

### 4.7 セクション[G]：広告カード

| No. | 項目ID | 項目名（論理） | コンポーネント種別 | データ型・最大長 | 必須 | 初期状態・デフォルト値 | 入力制約・形式 | データソース / DBマッピング | 備考・ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 20 | `imgAdThumbnail` | 広告サムネイル | Image | URL | いいえ | `image_url` 未アップロード時はプレースホルダー画像 | — | `advertisements.image_url` | アスペクト比: 16:9。Tailwind: `rounded-lg object-cover`。 |
| 21 | `lblAdTitle` | 広告タイトル | 静的ラベル（`<h3>`） | String(200) | はい | `title` フィールドのテキスト | 表示最大長: 200 | `advertisements.title` | Tailwind: `font-semibold text-base`。 |
| 22 | `badgeApprovalStatus` | 承認ステータスバッジ | Badge | Enum | はい | 承認ステータステキストにマッピング | — | `advertisements.approval_status` | 色: pending = `bg-amber-100 text-amber-800`、approved = `bg-green-100 text-green-800`、rejected = `bg-red-100 text-red-800`。i18n: `merchant.ads.status.{status}`。 |
| 23 | `badgePaymentStatus` | 支払いステータスバッジ | Badge | Enum | はい | 支払いステータステキストにマッピング | — | `advertisements.payment_status` | 色: pending = `bg-amber-100 text-amber-800`、completed = `bg-green-100 text-green-800`、refunded = `bg-gray-100 text-gray-800`。i18n: `merchant.ads.payment.{status}`。 |
| 24 | `lblAdContent` | 広告コンテンツプレビュー | 静的ラベル（`<p>`） | String | いいえ | 100文字に切り詰め。全文はホバーツールチップ | — | `advertisements.content` | Tailwind: `text-muted-foreground text-sm line-clamp-2`。 |
| 25 | `lblAnnouncement` | 告知メッセージ | 静的ラベル（`<p>`） | String(500) | はい | 60文字に切り詰め。全文はツールチップ | — | `advertisements.announcement_message` | Tailwind: `text-sm font-medium`。 |
| 26 | `lblSchedule` | スケジュール表示 | 静的ラベル（`<span>`） | String | いいえ | 形式: "2026/08/24 → 2026/08/31" | — | `advertisements.starts_at` + `advertisements.expires_at` | スケジュールが設定されている場合のみ表示。i18n: `merchant.ads.schedule`。 |
| 27 | `lblRejectionReason` | 却下理由 | Alert（`warning`） | String(2000) | 条件付き | `approval_status = 'rejected'` でない限り非表示 | — | `advertisements.rejection_reason` | Tailwind: `border-amber-500/50 text-amber-700 bg-amber-50`。i18n: `merchant.ads.rejectionReason`。 |
| 28 | `btnPayFee` | 料金支払いボタン | Button（`primary`） | — | 条件付き | 広告にコンテンツがある（`content IS NOT NULL AND image_url IS NOT NULL`）かつ `payment_status = 'pending'` のときに表示 | — | — | 支払い確認ダイアログ（§4.16）を開く。i18n: `merchant.ads.payFee`。Tailwind: `bg-primary`。 |
| 29 | `btnResubmit` | 再提出ボタン | Button（`primary`） | — | 条件付き | `approval_status = 'rejected'` のときに表示 | — | — | 再提出モードの広告コンテンツ編集ダイアログ（§4.17）を開く（「保存して支払い」ボタン表示）。i18n: `merchant.ads.resubmit`。Tailwind: `bg-primary`。 |
| 30 | `btnEditAd` | 編集ボタン | Button（`outline`） | — | 条件付き | 広告にコンテンツがある（`content IS NOT NULL AND image_url IS NOT NULL`）かつ `payment_status = 'pending'`（コンテンツアップロード済み）のとき、または `approval_status = 'rejected'` のときに表示 | — | — | 広告コンテンツ編集ダイアログ（§4.17）を開く。i18n: `merchant.ads.edit`。Tailwind: `border-border`。 |
| 31 | `btnDeleteAd` | 削除ボタン | Button（`destructive`） | — | 条件付き | 広告にコンテンツがある（`content IS NOT NULL AND image_url IS NOT NULL`）かつ `payment_status = 'pending'`（コンテンツアップロード済み）のとき、または `is_active = false`（非掲載）のときに表示 | — | — | 論理削除前に確認ダイアログ。i18n: `merchant.ads.delete`。Tailwind: `text-destructive`。 |
| 32 | `swtToggleActive` | 掲載切り替えスイッチ | Switch | Boolean | 条件付き | `approval_status = 'approved'` かつ `payment_status = 'completed'` のときに表示 | — | `advertisements.is_active` | `is_active` を切り替え。i18n: `merchant.ads.toggleActive`。 |

### 4.8 セクション[H]：ページネーション

| No. | 項目ID | 項目名（論理） | コンポーネント種別 | データ型・最大長 | 必須 | 初期状態・デフォルト値 | 入力制約・形式 | データソース / DBマッピング | 備考・ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 33 | `lblPageInfo` | ページ情報 | 静的ラベル（`<span>`） | String | はい | 形式: "3ページ中 1ページ目 · 12件" | — | `meta.total`、`meta.page`、`meta.totalPages` | i18n: `common.pageInfo`。 |
| 34 | `btnPrevPage` | 前のページ | Button（`outline`） | — | はい | 最初のページでは無効 | — | — | i18n: `common.prev`。 |
| 35 | `btnNextPage` | 次のページ | Button（`primary`） | — | はい | 最後のページでは無効 | — | — | i18n: `common.next`。 |

### 4.9 セクション[I]：パッケージ選択確認ダイアログ

| No. | 項目ID | 項目名（論理） | コンポーネント種別 | データ型・最大長 | 必須 | 初期状態・デフォルト値 | 入力制約・形式 | データソース / DBマッピング | 備考・ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 36 | `lblSelectDialogTitle` | ダイアログタイトル | 静的ラベル（`<h2>`） | String | はい | テキスト: "広告パッケージを選択" | — | ハードコードされたUIテキスト | i18n: `merchant.ads.selectTitle`。Tailwind: `text-lg font-semibold`。 |
| 37 | `lblPackageInfo` | パッケージ情報 | 静的ラベル（`<div>`） | Object | はい | 読み取り専用表示: 掲載場所、料金プラン、日額、期間、合計料金 | — | 選択した `ad_fee_settings` レコード | 記述リストのキー・バリュー形式で表示。 |
| 38 | `btnConfirmSelect` | 選択を確認ボタン | Button（`primary`） | — | はい | テキスト: "選択を確認" | — | — | `POST /ads/packages/:feeSettingId/select` を呼び出す。成功すると下書き広告を作成し、コンテンツアップロードダイアログを開く。ローディング: スピナー＋"選択中..."。i18n: `merchant.ads.confirmSelect`。 |
| 39 | `btnCancelSelect` | キャンセルボタン | Button（`outline`） | — | はい | テキスト: "キャンセル" | — | — | ダイアログを閉じる。i18n: `common.cancel`。 |

### 4.10 セクション[J]：広告コンテンツアップロードダイアログ

| No. | 項目ID | 項目名（論理） | コンポーネント種別 | データ型・最大長 | 必須 | 初期状態・デフォルト値 | 入力制約・形式 | データソース / DBマッピング | 備考・ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 40 | `lblUploadDialogTitle` | ダイアログタイトル | 静的ラベル（`<h2>`） | String | はい | テキスト: "広告コンテンツをアップロード" | — | ハードコードされたUIテキスト | i18n: `merchant.ads.uploadTitle`。Tailwind: `text-lg font-semibold`。 |
| 41 | `btnCloseUploadDialog` | 閉じるボタン | アイコンボタン（`X`） | — | はい | Xアイコン | — | — | ダイアログを閉じる。i18n: `common.close`。 |
| 42 | `lblPlacementDisplay` | 掲載場所表示 | 静的ラベル（`<span>`） | String | はい | 読み取り専用: 選択したパッケージの掲載場所 | — | `ad_fee_settings.placement` | i18n: `merchant.ads.placement`。Tailwind: `text-muted-foreground`。 |
| 43 | `lblTierDisplay` | 料金プラン表示 | 静的ラベル（`<span>`） | String | はい | 読み取り専用: 選択したパッケージの料金プラン | — | `ad_fee_settings.tier` | i18n: `merchant.ads.tier`。 |
| 44 | `txtAdTitle` | タイトル入力 | Input（`text`） | String(200) | 必須 | 空。プレースホルダー: "広告タイトルを入力" | MaxLength: 200。MinLength: 1。 | `advertisements.title` | i18n: `merchant.ads.titlePlaceholder`。 |
| 45 | `txtAdContent` | コンテンツ入力 | Textarea | String(5000) | いいえ | 空。プレースホルダー: "広告内容を入力" | MaxLength: 5000。 | `advertisements.content` | i18n: `merchant.ads.contentPlaceholder`。 |
| 46 | `uplAdImage` | 画像アップロード | ファイルアップロード（ドラッグ＆ドロップ） | File（バイナリ） | いいえ | 空。ドラッグ＆ドロップゾーン＋ファイルピッカーボタン | 許可MIME: `image/jpeg`、`image/png`、`image/webp`。最大サイズ: 5MB。 | `advertisements.image_url` | アップロード後にプレビュー表示。i18n: `merchant.ads.image`。 |
| 47 | `txtLinkUrl` | リンクURL入力 | Input（`url`） | String(2048) | いいえ | 空。プレースホルダー: "https://example.com" | 形式: 有効なURL。MaxLength: 2048。 | `advertisements.link_url` | i18n: `merchant.ads.linkUrlPlaceholder`。 |
| 48 | `txtAnnouncement` | 告知メッセージ入力 | Textarea | String(500) | 必須 | 空。プレースホルダー: "バナー告知メッセージを入力" | MaxLength: 500。MinLength: 1。 | `advertisements.announcement_message` | i18n: `merchant.ads.announcementPlaceholder`。 |
| 49 | `dateStart` | 開始日入力 | 日付ピッカー | DATE | 必須 | デフォルト: 今日 | 今日以上でなければならない。 | `advertisements.starts_at` | i18n: `merchant.ads.startDate`。 |
| 50 | `lblEndDate` | 終了日表示 | 静的ラベル（`<span>`） | String | はい | 読み取り専用: `starts_at + パッケージ duration_days` として自動計算 | — | 計算: `starts_at + duration_days` | 形式: "2026/08/31"。i18n: `merchant.ads.endDate`。Tailwind: `text-muted-foreground`。 |
| 51 | `lblFeeSummary` | 料金サマリー | 静的ラベル（`<div>`） | String | はい | 読み取り専用: "広告料金: ¥3,850 · 7日 × ¥550/日" | — | `ad_fee_settings.daily_rate × duration_days` | i18n: `merchant.ads.fee`。Tailwind: `font-semibold text-primary`。 |
| 52 | `btnCancelUpload` | キャンセルボタン | Button（`outline`） | — | はい | テキスト: "キャンセル" | — | — | 保存せずにダイアログを閉じる。i18n: `common.cancel`。 |
| 53 | `btnSaveAndContinue` | 保存して次へボタン | Button（`primary`） | — | はい | テキスト: "保存して次へ" | — | — | `PATCH /ads/:id/content` を呼び出す。成功すると広告は `CONTENT_UPLOADED` 状態に遷移。広告カードの料金支払いボタンが利用可能になる。ローディング: スピナー＋"保存中..."。i18n: `merchant.ads.saveContinue`。 |

### 4.11 セクション[K]：支払い確認ダイアログ

| No. | 項目ID | 項目名（論理） | コンポーネント種別 | データ型・最大長 | 必須 | 初期状態・デフォルト値 | 入力制約・形式 | データソース / DBマッピング | 備考・ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 54 | `lblPayDialogTitle` | ダイアログタイトル | 静的ラベル（`<h2>`） | String | はい | テキスト: "広告料金を支払う" | — | ハードコードされたUIテキスト | i18n: `merchant.ads.payTitle`。Tailwind: `text-lg font-semibold`。 |
| 55 | `lblFeeDetail` | 料金サマリー | 静的ラベル（`<div>`） | String | はい | 形式: "広告料金: ¥3,850 · 7日 × ¥550/日" | — | `advertisements.payment_amount`、`ad_fee_settings` | i18n: `merchant.ads.fee`。Tailwind: `text-sm`。 |
| 56 | `txtPaymentRef` | 支払い参照入力 | Input（`text`） | String(100) | いいえ | 空（非表示、ゲートウェイスタブ） | MaxLength: 100。 | `advertisements.payment_reference` | i18n: `merchant.ads.paymentRef`。本番では非表示。開発モードでのみ表示。 |
| 57 | `btnPaySubmit` | 支払い＆送信ボタン | Button（`primary`） | — | はい | テキスト: "支払い＆送信" | — | — | `POST /ads/:id/pay` を呼び出す。成功すると `payment_status = completed`、`approval_status = pending`。広告は管理者承認キューに入る。ローディング: スピナー＋"支払い処理中..."。i18n: `merchant.ads.paySubmit`。 |
| 58 | `btnCancelPay` | キャンセルボタン | Button（`outline`） | — | はい | テキスト: "キャンセル" | — | — | ダイアログを閉じる。i18n: `common.cancel`。 |

### 4.12 セクション[L]：広告コンテンツ編集ダイアログ

| No. | 項目ID | 項目名（論理） | コンポーネント種別 | データ型・最大長 | 必須 | 初期状態・デフォルト値 | 入力制約・形式 | データソース / DBマッピング | 備考・ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 59 | `lblEditDialogTitle` | ダイアログタイトル | 静的ラベル（`<h2>`） | String | はい | テキスト: "広告コンテンツを編集" | — | ハードコードされたUIテキスト | i18n: `merchant.ads.editTitle`。Tailwind: `text-lg font-semibold`。 |
| 60 | `txtEditTitle` | タイトル入力 | Input（`text`） | String(200) | 必須 | 現在の `title` で事前入力 | MaxLength: 200。MinLength: 1。 | `advertisements.title` | i18n: `merchant.ads.titlePlaceholder`。 |
| 61 | `txtEditContent` | コンテンツ入力 | Textarea | String(5000) | いいえ | 現在の `content` で事前入力 | MaxLength: 5000。 | `advertisements.content` | i18n: `merchant.ads.contentPlaceholder`。 |
| 62 | `uplEditImage` | 画像アップロード | ファイルアップロード（ドラッグ＆ドロップ） | File（バイナリ） | いいえ | 既存の画像プレビューがある場合は表示 | 許可MIME: `image/jpeg`、`image/png`、`image/webp`。最大サイズ: 5MB。 | `advertisements.image_url` | i18n: `merchant.ads.image`。 |
| 63 | `txtEditLinkUrl` | リンクURL入力 | Input（`url`） | String(2048) | いいえ | 現在の `link_url` で事前入力 | 形式: 有効なURL。MaxLength: 2048。 | `advertisements.link_url` | i18n: `merchant.ads.linkUrlPlaceholder`。 |
| 64 | `txtEditAnnouncement` | 告知メッセージ入力 | Textarea | String(500) | 必須 | 現在の `announcement_message` で事前入力 | MaxLength: 500。MinLength: 1。 | `advertisements.announcement_message` | i18n: `merchant.ads.announcementPlaceholder`。 |
| 65 | `btnEditCancel` | キャンセルボタン | Button（`outline`） | — | はい | テキスト: "キャンセル" | — | — | ダイアログを閉じる。i18n: `common.cancel`。 |
| 66 | `btnEditSave` | 保存ボタン | Button（`primary`） | — | 条件付き | 広告が `DRAFT` または `CONTENT_UPLOADED` 状態のときに表示。テキスト: "保存" | — | — | `PATCH /ads/:id` を呼び出す。i18n: `merchant.ads.save`。 |
| 67 | `btnEditSaveAndPay` | 保存して支払いボタン | Button（`primary`） | — | 条件付き | 広告が `REJECTED` 状態のときに表示。テキスト: "保存して支払い" | — | — | `PATCH /ads/:id` を呼び出し、支払い確認ダイアログを開く。i18n: `merchant.ads.savePay`。 |

### 4.13 セクション[M]：管理者ページヘッダー

| No. | 項目ID | 項目名（論理） | コンポーネント種別 | データ型・最大長 | 必須 | 初期状態・デフォルト値 | 入力制約・形式 | データソース / DBマッピング | 備考・ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 68 | `lblAdminAdTitle` | ページタイトル | 静的ラベル（`<h1>`） | String | はい | テキスト: "広告モデレーション" | — | ハードコードされたUIテキスト | i18n: `admin.ads.title`。Tailwind: `text-3xl font-bold tracking-tight`。 |

### 4.14 セクション[N]：承認待ちキュー

| No. | 項目ID | 項目名（論理） | コンポーネント種別 | データ型・最大長 | 必須 | 初期状態・デフォルト値 | 入力制約・形式 | データソース / DBマッピング | 備考・ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 69 | `lblWeeklyLimit` | 週間上限インジケーター | 静的ラベル（`<span>`） | String | はい | 形式: "今週の掲載中: X / 5 件" | — | 計算: 現在のISO週の承認済み広告数 | i18n: `admin.ads.weeklyLimit`。Tailwind: `text-sm text-muted-foreground`。 |
| 70 | `cardPendingAd` | 承認待ち広告カード | Card | Object | はい | `approval_status = 'pending'` かつ `payment_status = 'completed'` の広告一覧 | — | `advertisements` + `shops` | 古い順にソート。 |
| 71 | `imgPendingThumbnail` | 承認待ち広告サムネイル | Image | URL | いいえ | 画像がない場合はプレースホルダー | — | `advertisements.image_url` | Tailwind: `rounded-lg object-cover`。 |
| 72 | `lblPendingTitle` | 承認待ち広告タイトル | 静的ラベル（`<h3>`） | String | はい | `title` のテキスト | — | `advertisements.title` | Tailwind: `font-semibold`。 |
| 73 | `lblPendingContent` | 承認待ち広告コンテンツ | 静的ラベル（`<p>`） | String | いいえ | 200文字に切り詰め | — | `advertisements.content` | Tailwind: `text-muted-foreground text-sm line-clamp-3`。 |
| 74 | `lblPendingAnnouncement` | 承認待ち告知 | 静的ラベル（`<p>`） | String(500) | はい | バナー告知メッセージ | — | `advertisements.announcement_message` | Tailwind: `text-sm font-medium`。 |
| 75 | `lblPendingSchedule` | 承認待ちスケジュール | 静的ラベル（`<span>`） | String | はい | 形式: "2026/08/24 → 2026/08/31" | — | `advertisements.starts_at` + `advertisements.expires_at` | i18n: `merchant.ads.schedule`。 |
| 76 | `lblPendingShop` | 承認待ちショップ名 | 静的ラベル（`<span>`） | String | はい | マーチャントのショップ名 | — | `shops.name` | i18n: `admin.ads.shopName`。 |
| 77 | `lblPendingFee` | 承認待ち料金情報 | 静的ラベル（`<span>`） | String | はい | 形式: "料金: ¥3,850 · 支払済" | — | `advertisements.payment_amount` | i18n: `admin.ads.feeInfo`。 |
| 78 | `btnApproveAd` | 承認ボタン | Button（`success`） | — | はい | テキスト: "承認" | — | — | `PATCH /admin/ads/:id/approve` を呼び出す。週間上限（最大5件）を検証。ローディング: スピナー＋"承認中..."。i18n: `admin.ads.approve`。Tailwind: `bg-green-600 hover:bg-green-700`。 |
| 79 | `btnRejectAd` | 却下ボタン | Button（`destructive`） | — | はい | テキスト: "却下" | — | — | `txtRejectReason` テキストエリアを表示。理由付きで `PATCH /admin/ads/:id/reject` を呼び出す。却下時に自動返金。ローディング: スピナー＋"却下中..."。i18n: `admin.ads.reject`。Tailwind: `bg-destructive`。 |
| 80 | `txtRejectReason` | 却下理由入力 | Textarea | String(2000) | 条件付き | 却下ボタンがクリックされたときに表示。空。プレースホルダー: "却下理由を入力" | MaxLength: 2000。却下時は必須。 | — | i18n: `admin.ads.rejectReason`。Tailwind: `border-destructive/50`。 |

### 4.15 セクション[O]：料金設定・パッケージ管理

| No. | 項目ID | 項目名（論理） | コンポーネント種別 | データ型・最大長 | 必須 | 初期状態・デフォルト値 | 入力制約・形式 | データソース / DBマッピング | 備考・ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 81 | `lblFeeSettingsTitle` | 料金設定タイトル | 静的ラベル（`<h2>`） | String | はい | テキスト: "広告パッケージ" | — | ハードコードされたUIテキスト | i18n: `admin.ads.feeSettings`。Tailwind: `text-xl font-semibold`。 |
| 82 | `btnNewPackage` | 新規パッケージボタン | Button（`primary`） | — | はい | テキスト: "新規パッケージ" | — | — | パッケージ作成ダイアログ（§4.18）を開く。i18n: `admin.ads.newPackage`。Tailwind: `bg-primary`。 |
| 83 | `tblFeeSettings` | 料金設定テーブル | Table | Object[] | はい | `GET /admin/ad-fee-settings` から全パッケージ、掲載場所・料金プラン順 | — | `ad_fee_settings` | 列: 掲載場所、料金プラン、日額、期間、最大枠数、アクティブ、アクション。 |
| 84 | `btnEditRate` | 料金編集ボタン | Button（`outline`） | — | はい（行ごと） | 日額のインライン編集モード | — | `ad_fee_settings.daily_rate` | `PATCH /admin/ad-fee-settings/:id` を呼び出す。i18n: `admin.ads.saveRate`。 |
| 85 | `numDailyRate` | 日額入力 | Input（`number`） | Decimal(10,2) | 条件付き | 行でインライン編集可能 | Min: 0。Max: 10000。 | `ad_fee_settings.daily_rate` | i18n: `admin.ads.dailyRate`。Tailwind: `w-24`。 |
| 86 | `btnFeeHistory` | 料金履歴ボタン | Button（`outline`） | — | はい（行ごと） | テキスト: "履歴" | — | — | `ad_fee_history` レコードを表示する料金履歴ダイアログを開く。i18n: `admin.ads.feeHistory`。 |
| 87 | `btnDeactivatePackage` | パッケージ無効化ボタン | Button（`destructive`） | — | 条件付き（行ごと） | `is_active = true` のときに表示 | — | `ad_fee_settings.is_active` | 無効化前に確認ダイアログ。`DELETE /admin/ad-fee-settings/:id` を呼び出す。i18n: `admin.ads.deactivate`。Tailwind: `text-destructive`。 |
| 88 | `tblAllAds` | 全広告テーブル | Table | Object[] | はい | フィルタ可能な承認/支払いステータス付きの全プラットフォーム広告 | — | `advertisements` + `shops` | 列: タイトル、ショップ、承認ステータス、支払いステータス、スケジュール、アクション。 |

### 4.16 セクション[P]：パッケージ作成ダイアログ

| No. | 項目ID | 項目名（論理） | コンポーネント種別 | データ型・最大長 | 必須 | 初期状態・デフォルト値 | 入力制約・形式 | データソース / DBマッピング | 備考・ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 89 | `lblCreatePkgTitle` | ダイアログタイトル | 静的ラベル（`<h2>`） | String | はい | テキスト: "広告パッケージを作成" | — | ハードコードされたUIテキスト | i18n: `admin.ads.createPkgTitle`。Tailwind: `text-lg font-semibold`。 |
| 90 | `selPlacement` | 掲載場所セレクト | Select | Enum | 必須 | デフォルト: 最初のオプション | オプション: `homepage_slider`、`product_sidebar`、`category_banner`、`search_top` | `ad_fee_settings.placement` | i18n: `admin.ads.placement`。料金プランとの組み合わせで一意でなければならない。 |
| 91 | `selTier` | 料金プランセレクト | Select | Enum | 必須 | デフォルト: 最初のオプション | オプション: `basic`、`standard`、`premium` | `ad_fee_settings.tier` | i18n: `admin.ads.tier`。 |
| 92 | `numCreateDailyRate` | 日額入力 | Input（`number`） | Decimal(10,2) | 必須 | 空。プレースホルダー: "0.00" | Min: 0。Max: 10000。 | `ad_fee_settings.daily_rate` | i18n: `admin.ads.dailyRate`。 |
| 93 | `numDurationDays` | 表示日数入力 | Input（`number`） | Integer | 必須 | 空。プレースホルダー: "7" | Min: 7。Max: 30。 | `ad_fee_settings.duration_days` | i18n: `admin.ads.durationDays`。 |
| 94 | `numMaxAds` | 最大枠数入力 | Input（`number`） | Integer | 必須 | 空。プレースホルダー: "1" | Min: 1。 | `ad_fee_settings.max_ads` | i18n: `admin.ads.maxAds`。 |
| 95 | `btnCancelCreatePkg` | キャンセルボタン | Button（`outline`） | — | はい | テキスト: "キャンセル" | — | — | ダイアログを閉じる。i18n: `common.cancel`。 |
| 96 | `btnCreatePkg` | パッケージ作成ボタン | Button（`primary`） | — | はい | テキスト: "パッケージを作成" | — | — | `POST /admin/ad-fee-settings` を呼び出す。成功時に201 Created。ローディング: スピナー＋"作成中..."。i18n: `admin.ads.createPkg`。 |

---

## 5. 各項目における挙動・イベント仕様

### 5.1 パッケージ選択ボタンのクリック（`btnSelectPackage` onClick）
- **トリガー:** マーチャントがパッケージカードの「選択」をクリック。
- **処理ロジック:**
  1. **事前チェック:** マーチャントの `license_status` が `'approved'` であることを確認。でなければ情報バナーを表示し、選択をブロック。
  2. **確認ダイアログを開く:** 選択したパッケージの詳細を含むパッケージ選択確認ダイアログ（§4.9）を表示。
  3. **選択の確認:** `btnConfirmSelect` クリックで `POST /ads/packages/:feeSettingId/select` を呼び出す。
  4. **バックエンド実行:** パッケージがアクティブであることを検証、ショップの承認を確認、`approval_status = pending`、`payment_status = pending`、`is_active = true` で広告レコードを作成。
  5. **実行後UI:** 確認ダイアログを閉じる。新しく作成した下書き広告用にコンテンツアップロードダイアログ（§4.10）を開く。成功トーストを表示。広告一覧を更新。
- **例外処理:**
  - `403 SHOP_NOT_APPROVED`: バナーに「ショップの承認が完了していません」を表示。
  - `404 NOT_FOUND`: ダイアログエラーに「選択された広告パッケージは利用できません」を表示。
  - `400 AD_PACKAGE_INVALID`: ダイアログエラーに「選択された広告パッケージは利用できません」を表示。

### 5.2 コンテンツアップロードフォームの送信（`btnSaveAndContinue` onClick）
- **トリガー:** マーチャントがコンテンツアップロードダイアログで「保存して次へ」をクリック。
- **処理ロジック:**
  1. **クライアント側事前チェック:** 厳格な検証 ― `title` が空でない（最大200）、`announcementMessage` が空でない（最大500）、`startsAt` ≥ 今日。画像が提供された場合は検証（MIMEタイプ、サイズ）。
  2. **バックエンド送信:** `{ title, content, image, linkUrl, announcementMessage, startsAt }` で `PATCH /api/v1/ads/:id/content`。
  3. **バックエンド実行:** コンテンツフィールドを検証。画像があれば検証。`expires_at = starts_at + duration_days` を導出。`approval_status` は `'pending'` のまま（変更なし）。
  4. **実行後UI:** ダイアログを閉じる。広告カードの料金支払いボタン（`btnPayFee`）が利用可能になる。成功トーストを表示。広告一覧を更新。
- **例外処理:**
  - `400 BAD_REQUEST`: フィールドレベルのインラインエラーを表示（タイトル欠落、不正画像など）。
  - `413 PAYLOAD_TOO_LARGE`: インラインに「画像は5MB以内で入力してください」を表示。
  - `415 UNSUPPORTED_MEDIA_TYPE`: インラインに「画像はJPG、PNG、WebPで入力してください」を表示。

### 5.3 料金支払いボタンのクリック（`btnPayFee` onClick）
- **トリガー:** マーチャントが広告カードの「料金を支払う」をクリック。
- **処理ロジック:**
  1. **支払いダイアログを開く:** 料金サマリーを含む支払い確認ダイアログ（§4.11）を表示。
  2. **支払いの確認:** `btnPaySubmit` クリックで `POST /ads/:id/pay` を呼び出す。
  3. **バックエンド実行:** 広告にコンテンツがアップロードされている（`content IS NOT NULL AND image_url IS NOT NULL`）かつ `payment_status = 'pending'` であることを検証。支払いを処理（スタブ）。`ad_payments` に記録。`payment_status = completed` を設定。`approval_status` は `'pending'` のまま（変更なし）。`week_number` を導出。
  4. **実行後UI:** ダイアログを閉じる。広告ステータスが PENDING_APPROVAL に更新。料金支払いボタン非表示。成功トーストを表示。広告一覧を更新。
- **例外処理:**
  - `422 UNPROCESSABLE_ENTITY`: ダイアログエラーに「支払いに失敗しました。もう一度お試しください。」を表示。
  - `500 INTERNAL_SERVER_ERROR`: ダイアログエラーに「問題が発生しました。もう一度お試しください」を表示。

### 5.4 コンテンツ編集フォームの送信（`btnEditSave` / `btnEditSaveAndPay` onClick）
- **トリガー:** マーチャントが編集ダイアログで「保存」または「保存して支払い」をクリック。
- **処理ロジック:**
  1. **クライアント側事前チェック:** 厳格な検証 ― コンテンツアップロードと同じ。
  2. **バックエンド送信:** `{ title, content, image, linkUrl, announcementMessage }` で `PATCH /api/v1/ads/:id`。
  3. **バックエンド実行:** 広告が編集を許可していることを検証：コンテンツアップロード済み（`content IS NOT NULL AND image_url IS NOT NULL`）かつ `payment_status = 'pending'`、または `approval_status = 'rejected'`。コンテンツフィールドを更新。
  4. **実行後UI（保存）:** ダイアログを閉じる。成功トーストを表示。広告一覧を更新。
  5. **実行後UI（保存して支払い）:** ダイアログを閉じる。再提出の支払いのため支払い確認ダイアログを開く。
- **例外処理:**
  - `400 BAD_REQUEST`: フィールドレベルのインラインエラーを表示。
  - `403 FORBIDDEN`: 「この広告を管理する権限がありません」を表示。

### 5.5 削除ボタンのクリック（`btnDeleteAd` onClick）
- **トリガー:** マーチャントが広告カードの「削除」をクリック。
- **処理ロジック:**
  1. **確認ダイアログ:** 「この広告を削除してもよろしいですか？」を表示。
  2. **バックエンド送信:** `DELETE /api/v1/ads/:id`。
  3. **バックエンド実行:** `is_active = false` を設定（論理削除）。レコードは履歴のために保持。
  4. **実行後UI:** 広告がアクティブ一覧から削除。成功トーストを表示。広告一覧を更新。
- **例外処理:**
  - `403 FORBIDDEN`: 「この広告を管理する権限がありません」を表示。
  - `404 NOT_FOUND`: 「広告が見つかりません」を表示。一覧を更新。

### 5.6 掲載切り替えスイッチ（`swtToggleActive` onChange）
- **トリガー:** マーチャントが承認済み広告の掲載スイッチを切り替え。
- **処理ロジック:**
  1. **バックエンド送信:** `{ isActive: newValue }` で `PATCH /api/v1/ads/:id/toggle`。
  2. **バックエンド実行:** `approval_status = approved` かつ `payment_status = completed` を確認。`is_active` を更新。
  3. **実行後UI:** スイッチ状態を更新。ストアフロントの広告表示がそれに応じて変化。成功トーストを表示。
- **例外処理:**
  - `403 FORBIDDEN`: 「この広告を管理する権限がありません」を表示。

### 5.7 管理者の承認クリック（`btnApproveAd` onClick）
- **トリガー:** 管理者が承認待ち広告の「承認」をクリック。
- **処理ロジック:**
  1. **バックエンド送信:** `PATCH /api/v1/admin/ads/:id/approve`。
  2. **バックエンド実行:** 週間上限（現在の週の承認済みアクティブ広告最大5件）を検証。`approval_status = approved`、`approved_by`、`approved_at` を設定。
  3. **実行後UI:** 広告が承認待ちキューから削除。成功トーストを表示。承認待ちキューを更新。週間上限インジケーターを更新。
- **例外処理:**
  - `409 WEEKLY_LIMIT_REACHED`: アラートバナーに「今週の広告枠上限(5件)に達しました」を表示。

### 5.8 管理者の却下クリック（`btnRejectAd` onClick）
- **トリガー:** 管理者が（`txtRejectReason` に理由を入力後）「却下」をクリック。
- **処理ロジック:**
  1. **検証:** `txtRejectReason` が空でないこと。
  2. **バックエンド送信:** `{ reason }` で `PATCH /api/v1/admin/ads/:id/reject`。
  3. **バックエンド実行:** `approval_status = rejected`、`rejection_reason` を設定。自動返金を発動（`ad_payments`：`payment_status = refunded`、`refund_amount`、`refunded_at`）。
  4. **実行後UI:** 広告が承認待ちキューから削除。成功トーストを表示。承認待ちキューを更新。
- **例外処理:**
  - `400 BAD_REQUEST`: 理由が空の場合「却下理由は必須です」を表示。

### 5.9 管理者のパッケージ作成（`btnCreatePkg` onClick）
- **トリガー:** 管理者がパッケージ作成ダイアログで「パッケージを作成」をクリック。
- **処理ロジック:**
  1. **クライアント側事前チェック:** 全フィールドを検証 ― `placement` 選択済み、`tier` 選択済み、`dailyRate` ≥ 0、`durationDays` 7〜30、`maxAds` ≥ 1。
  2. **バックエンド送信:** `{ placement, tier, daily_rate, duration_days, max_ads }` で `POST /api/v1/admin/ad-fee-settings`。
  3. **バックエンド実行:** （`placement`、`tier`）の一意な組み合わせを検証。`ad_fee_settings` に挿入。
  4. **実行後UI:** ダイアログを閉じる。料金設定テーブルを更新。成功トーストを表示。パッケージは即座にマーチャントカタログに表示。
- **例外処理:**
  - `409 CONFLICT`: ダイアログエラーに「この掲載場所と料金プランの組み合わせは既に存在します」を表示。

### 5.10 管理者の日額更新（`btnEditRate` onClick）
- **トリガー:** 管理者が日額をインライン編集後に「料金を保存」をクリック。
- **処理ロジック:**
  1. **バックエンド送信:** `{ daily_rate }` で `PATCH /api/v1/admin/ad-fee-settings/:id`。
  2. **バックエンド実行:** `daily_rate` を更新。`ad_fee_history` に監査レコードを挿入。
  3. **実行後UI:** テーブル行を更新。成功トーストを表示。パッケージカタログキャッシュを無効化。
- **例外処理:**
  - `400 BAD_REQUEST`: レート < 0 の場合「不正な料金値です」を表示。

### 5.11 管理者のパッケージ無効化（`btnDeactivatePackage` onClick）
- **トリガー:** 管理者がパッケージ行の「無効化」をクリック。
- **処理ロジック:**
  1. **確認ダイアログ:** 「これによりパッケージがマーチャントカタログから削除されます。既に購入された広告には影響しません。」を表示。
  2. **バックエンド送信:** `DELETE /api/v1/admin/ad-fee-settings/:id`。
  3. **バックエンド実行:** パッケージに `is_active = false` を設定。
  4. **実行後UI:** パッケージ行が更新（非アクティブ状態）。成功トーストを表示。パッケージはマーチャントカタログに表示されない。
- **例外処理:**
  - `404 NOT_FOUND`: 「パッケージが見つかりません」を表示。テーブルを更新。

### 5.12 ステータス／承認フィルタの変更（`selStatusFilter` / `selApprovalFilter` onChange）
- **トリガー:** 管理者またはマーチャントが異なるフィルタ値を選択。
- **処理ロジック:**
  1. クエリパラメータを更新。
  2. 新しいフィルタで広告一覧を再取得。
  3. ページネーションをページ1にリセット。
- **例外処理:** 該当なし。

### 5.13 検索入力（`txtAdSearch` onChange、300msデバウンス）
- **トリガー:** マーチャントが検索入力に入力。
- **処理ロジック:**
  1. 最後のキー入力から300msデバウンス。
  2. 検索クエリで広告一覧を再取得。
  3. ページネーションをページ1にリセット。
- **例外処理:** 該当なし。

### 5.14 ナビゲーションリンク
- **トリガー:** ユーザーがサイドバーのナビゲーション項目をクリック。
- **処理ロジック:**
  1. React Routerで対象ルートへ移動。
  2. 移動時にページ状態をリセット。
- **例外処理:** 該当なし。

---

## 6. バリデーション及びエラーメッセージマッピング

### 6.1 パッケージ選択の検証エラー

| エラーコード | 対象フィールド | 条件・評価ロジック | UI/UX表示スタイル | デフォルトエラーメッセージ（EN） | デフォルトエラーメッセージ（JA） |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-AD-001** | `btnSelectPackage` | ショップ未承認（`license_status` が `'pending'` または `'rejected'`） | ページ上部の情報バナー | "Your shop is pending approval. You cannot select an advertising package until your shop is approved." | "ショップの承認が完了していないため、広告パッケージを選択できません" |
| **VAL-AD-002** | `cardPackage` | 選択したパッケージが非アクティブまたは見つからない | ダイアログエラーアラート | "Selected advertising package is unavailable" | "選択された広告パッケージは利用できません" |
| **AD_PACKAGE_INVALID** | `btnConfirmSelect` | `feeSettingId` がアクティブな `ad_fee_settings` レコードに解決されない | ダイアログエラーアラート | "Selected advertising package is unavailable" | "選択された広告パッケージは利用できません" |

### 6.2 コンテンツアップロードの検証エラー

| エラーコード | 対象フィールド | 条件・評価ロジック | UI/UX表示スタイル | デフォルトエラーメッセージ（EN） | デフォルトエラーメッセージ（JA） |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-AD-010** | `txtAdTitle` | タイトルが空 | 赤い枠。フィールド下にテキスト。 | "Title is required" | "タイトルは必須です" |
| **VAL-AD-011** | `txtAdTitle` | タイトルが200文字を超過 | 赤い枠。フィールド下にテキスト。 | "Title must not exceed 200 characters" | "タイトルは200文字以内で入力してください" |
| **VAL-AD-012** | `txtAdContent` | コンテンツが5000文字を超過 | 赤い枠。フィールド下にテキスト。 | "Content must not exceed 5000 characters" | "内容は5000文字以内で入力してください" |
| **VAL-AD-013** | `uplAdImage` | 画像のMIMEタイプがJPG/PNG/WebPでない | アップロードゾーンのインラインエラー | "Image must be JPG, PNG, or WebP format" | "画像はJPG、PNG、WebPで入力してください" |
| **VAL-AD-014** | `uplAdImage` | 画像が5MBを超過 | アップロードゾーンのインラインエラー | "Image file must not exceed 5MB" | "画像は5MB以内で入力してください" |
| **VAL-AD-015** | `txtLinkUrl` | リンクURLの形式が無効 | 赤い枠。フィールド下にテキスト。 | "Invalid URL format" | "URLの形式が不正です" |
| **VAL-AD-016** | `txtLinkUrl` | リンクURLが2048文字を超過 | 赤い枠。フィールド下にテキスト。 | "Link URL must not exceed 2048 characters" | "リンクURLは2048文字以内で入力してください" |
| **VAL-AD-017** | `txtAnnouncement` | 告知メッセージが空 | 赤い枠。フィールド下にテキスト。 | "Announcement message is required" | "告知メッセージは必須です" |
| **VAL-AD-018** | `txtAnnouncement` | 告知メッセージが500文字を超過 | 赤い枠。フィールド下にテキスト。 | "Announcement message must not exceed 500 characters" | "告知メッセージは500文字以内で入力してください" |
| **VAL-AD-019** | `dateStart` | 開始日が空 | 赤い枠。フィールド下にテキスト。 | "Start date is required" | "開始日は必須です" |
| **VAL-AD-020** | `dateStart` | 開始日が過去 | 赤い枠。フィールド下にテキスト。 | "Start date must be today or later" | "開始日は今日以降で入力してください" |

### 6.3 支払いの検証エラー

| エラーコード | 対象フィールド | 条件・評価ロジック | UI/UX表示スタイル | デフォルトエラーメッセージ（EN） | デフォルトエラーメッセージ（JA） |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **AD_SCHEDULE_INVALID** | `btnPaySubmit` | 導出された `expires_at` をパッケージ期間から計算できない | ダイアログエラーアラート | "Advertisement schedule is invalid" | "広告期間が不正です" |
| **PAYMENT_FAILED** | `btnPaySubmit` | 支払い処理が失敗 | ダイアログエラーアラート | "Payment failed. Please try again." | "支払いに失敗しました。もう一度お試しください。" |

### 6.4 管理者の承認・却下の検証エラー

| エラーコード | 対象フィールド | 条件・評価ロジック | UI/UX表示スタイル | デフォルトエラーメッセージ（EN） | デフォルトエラーメッセージ（JA） |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **WEEKLY_LIMIT_REACHED** | `btnApproveAd` | 週間広告上限（5件/週）に達した | キューの上部のアラートバナー | "Weekly advertisement limit reached (max 5)" | "今週の広告枠上限(5件)に達しました" |
| **VAL-AD-030** | `txtRejectReason` | 却下時に却下理由が空 | 赤い枠。フィールド下にテキスト。 | "Rejection reason is required" | "却下理由は必須です" |
| **VAL-AD-031** | `txtRejectReason` | 却下理由が2000文字を超過 | 赤い枠。フィールド下にテキスト。 | "Rejection reason must not exceed 2000 characters" | "却下理由は2000文字以内で入力してください" |

### 6.5 管理者パッケージ管理の検証エラー

| エラーコード | 対象フィールド | 条件・評価ロジック | UI/UX表示スタイル | デフォルトエラーメッセージ（EN） | デフォルトエラーメッセージ（JA） |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-AD-040** | `selPlacement` | 掲載場所が未選択 | 赤い枠。フィールド下にテキスト。 | "Placement is required" | "掲載場所は必須です" |
| **VAL-AD-041** | `selTier` | 料金プランが未選択 | 赤い枠。フィールド下にテキスト。 | "Tier is required" | "料金プランは必須です" |
| **VAL-AD-042** | `numCreateDailyRate` | 日額が空または < 0 | 赤い枠。フィールド下にテキスト。 | "Daily rate must be 0 or greater" | "日額は0以上で入力してください" |
| **VAL-AD-043** | `numDurationDays` | 期間 < 7 または > 30 | 赤い枠。フィールド下にテキスト。 | "Duration must be between 7 and 30 days" | "表示日数は7〜30日で入力してください" |
| **VAL-AD-044** | `numMaxAds` | 最大枠数 < 1 | 赤い枠。フィールド下にテキスト。 | "Max ads must be at least 1" | "最大枠数は1以上で入力してください" |
| **VAL-AD-045** | `selPlacement` + `selTier` | （掲載場所、料金プラン）の組み合わせが重複 | ダイアログエラーアラート | "A package with this placement and tier already exists" | "この掲載場所と料金プランの組み合わせは既に存在します" |

### 6.6 汎用APIエラー処理

| エラーコード | 対象フィールド | 条件・評価ロジック | UI/UX表示スタイル | デフォルトエラーメッセージ（EN） | デフォルトエラーメッセージ（JA） |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **UNAUTHORIZED** | `alertError` | JWTの欠落または無効 | `/login` へリダイレクト | "Please log in to continue" | "続行するにはログインしてください" |
| **FORBIDDEN** | `alertError` | 広告所有者でないまたは管理者でない | アラートバナー | "You don't have permission to manage this ad" | "この広告を管理する権限がありません" |
| **NOT_FOUND** | `alertError` | 広告が見つからない | 更新オプション付きアラートバナー | "Advertisement not found" | "広告が見つかりません" |
| **TOO_MANY_REQUESTS** | `alertError` | レート制限を超過 | アラートバナー | "Too many requests. Please wait {seconds} seconds" | "リクエストが多すぎます。{seconds}秒お待ちください" |
| **INTERNAL_SERVER_ERROR** | `alertError` | サーバーエラー | アラートバナー | "Something went wrong. Please try again" | "問題が発生しました。もう一度お試しください" |
| **NET_ERR** | `alertError` | ネットワークエラー | アラートバナー | "Network error. Please check your connection" | "ネットワークエラー。接続を確認してください" |

### 6.7 検証の適用層

1. **フロントエンド（クライアント）**：React Hook Form + Zodスキーマ検証を全フォーム（パッケージ選択、コンテンツアップロード、支払い、編集、管理者パッケージ管理）に適用。
2. **バックエンド（サーバー）**：全エンドポイントで NestJS ValidationPipe + class-validator DTO。パッケージ解決、ショップ承認、コンテンツ検証、支払い、承認/週間上限ルール、サーバー側の `expires_at` 導出のためのサービスレベルのチェック。
3. **データベース（PostgreSQL）**：最終ガードとしての CHECK 制約 `chk_advertisements_dates`、`chk_advertisements_approval_status`、`chk_advertisements_payment_status`。

---

## 7. データベースフィールドマッピング

### 7.1 コンテンツアップロードフォーム → データベース

| フォームフィールド | APIフィールド | DBカラム | テーブル | データ型 |
| :--- | :--- | :--- | :--- | :--- |
| `txtAdTitle` | `title` | `title` | `advertisements` | VARCHAR(255) NOT NULL |
| `txtAdContent` | `content` | `content` | `advertisements` | TEXT（nullable） |
| `uplAdImage` | `image` | `image_url` | `advertisements` | TEXT（nullable） |
| `txtLinkUrl` | `linkUrl` | `link_url` | `advertisements` | TEXT（nullable） |
| `txtAnnouncement` | `announcementMessage` | `announcement_message` | `advertisements` | VARCHAR(500) NOT NULL |
| `dateStart` | `startsAt` | `starts_at` | `advertisements` | TIMESTAMPTZ NOT NULL |
| （システム導出） | — | `expires_at` | `advertisements` | TIMESTAMPTZ NOT NULL |
| （システム導出） | — | `week_number` | `advertisements` | INTEGER NOT NULL |

### 7.2 パッケージ選択 → データベース

| APIフィールド | DBカラム | テーブル | データ型 |
| :--- | :--- | :--- | :--- |
| `feeSettingId`（パスパラメータ） | `ad_fee_settings.id` へのFK参照 | `advertisements` | UUID |
| （システム作成） | `shop_id` | `advertisements` | UUID NOT NULL（FK → `shops.id`） |
| （システム作成） | `approval_status` | `advertisements` | VARCHAR(20) DEFAULT 'pending' |
| （システム作成） | `payment_status` | `advertisements` | VARCHAR(20) DEFAULT 'pending' |
| （システム作成） | `is_active` | `advertisements` | BOOLEAN DEFAULT TRUE |

### 7.3 支払い → データベース

| APIフィールド | DBカラム | テーブル | データ型 |
| :--- | :--- | :--- | :--- |
| `paymentReference` | `payment_reference` | `advertisements` | VARCHAR(255)（nullable） |
| （システム作成） | `payment_amount` | `advertisements` | DECIMAL(10,2)（nullable） |
| （システム作成） | `payment_status` = 'completed' | `advertisements` | VARCHAR(20) |
| （システム作成） | `approval_status` = 'pending' | `advertisements` | VARCHAR(20) |
| （台帳） | `amount`、`payment_method`、`payment_status`、`transaction_id`、`paid_at` | `ad_payments` | 種々 |

### 7.4 管理者承認 → データベース

| アクション | DBカラム | テーブル | データ型 |
| :--- | :--- | :--- | :--- |
| 承認 | `approval_status` = 'approved' | `advertisements` | VARCHAR(20) |
| 承認 | `approved_by` | `advertisements` | UUID（nullable、FK → `users.id`） |
| 承認 | `approved_at` | `advertisements` | TIMESTAMPTZ（nullable） |
| 却下 | `approval_status` = 'rejected' | `advertisements` | VARCHAR(20) |
| 却下 | `rejection_reason` | `advertisements` | TEXT（nullable） |
| 却下 | `approved_by`、`approved_at` | `advertisements` | UUID、TIMESTAMPTZ |
| 却下（返金） | `payment_status` = 'refunded'、`refund_amount`、`refund_reason`、`refunded_at` | `ad_payments` | 種々 |

### 7.5 管理者パッケージ管理 → データベース

| アクション | DBカラム | テーブル | データ型 |
| :--- | :--- | :--- | :--- |
| 作成 | `placement`、`tier`、`daily_rate`、`duration_days`、`max_ads`、`is_active` | `ad_fee_settings` | 種々 |
| 料金更新 | `daily_rate`、`updated_at` | `ad_fee_settings` | DECIMAL(10,2)、TIMESTAMPTZ |
| 料金監査 | `ad_fee_setting_id`、`old_daily_rate`、`new_daily_rate`、`changed_by`、`effective_from` | `ad_fee_history` | 種々 |
| 無効化 | `is_active` = false | `ad_fee_settings` | BOOLEAN |

---

## 8. APIレスポンスマッピング

### 8.1 パッケージ選択の成功レスポンス

```json
{
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "shopId": "f4c5a1b2-3d6e-4f70-8a9b-1c2d3e4f5a6b",
    "title": "",
    "content": null,
    "announcementMessage": "",
    "imageUrl": null,
    "linkUrl": null,
    "isActive": true,
    "approvalStatus": "pending",
    "paymentStatus": "pending",
    "paymentAmount": null,
    "paymentReference": null,
    "approvedBy": null,
    "approvedAt": null,
    "rejectionReason": null,
    "weekNumber": null,
    "startsAt": null,
    "expiresAt": null,
    "createdAt": "2026-08-25T12:00:00.000Z"
  }
}
```

### 8.2 コンテンツアップロードの成功レスポンス

```json
{
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "shopId": "f4c5a1b2-3d6e-4f70-8a9b-1c2d3e4f5a6b",
    "title": "Summer Skincare Sale",
    "content": "Get 20% off all serums this summer!",
    "announcementMessage": "Summer Sale - 20% Off Serums",
    "imageUrl": "/uploads/ads/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
    "linkUrl": "https://example.com/summer-sale",
    "isActive": true,
    "approvalStatus": "pending",
    "paymentStatus": "pending",
    "paymentAmount": null,
    "paymentReference": null,
    "approvedBy": null,
    "approvedAt": null,
    "rejectionReason": null,
    "weekNumber": null,
    "startsAt": "2026-08-25T00:00:00.000Z",
    "expiresAt": "2026-09-01T00:00:00.000Z",
    "createdAt": "2026-08-25T12:00:00.000Z"
  }
}
```

### 8.3 支払いの成功レスポンス

```json
{
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "shopId": "f4c5a1b2-3d6e-4f70-8a9b-1c2d3e4f5a6b",
    "title": "Summer Skincare Sale",
    "content": "Get 20% off all serums this summer!",
    "announcementMessage": "Summer Sale - 20% Off Serums",
    "imageUrl": "/uploads/ads/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
    "linkUrl": "https://example.com/summer-sale",
    "isActive": true,
    "approvalStatus": "pending",
    "paymentStatus": "completed",
    "paymentAmount": "35.00",
    "paymentReference": "TXN-2026-001",
    "approvedBy": null,
    "approvedAt": null,
    "rejectionReason": null,
    "weekNumber": 35,
    "startsAt": "2026-08-25T00:00:00.000Z",
    "expiresAt": "2026-09-01T00:00:00.000Z",
    "createdAt": "2026-08-25T12:00:00.000Z"
  }
}
```

### 8.4 管理者承認の成功レスポンス

```json
{
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "approvalStatus": "approved",
    "approvedBy": "admin-uuid-here",
    "approvedAt": "2026-08-25T14:00:00.000Z",
    "paymentStatus": "completed"
  }
}
```

### 8.5 管理者却下の成功レスポンス

```json
{
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "approvalStatus": "rejected",
    "rejectionReason": "Image quality is too low for platform display",
    "approvedBy": "admin-uuid-here",
    "approvedAt": "2026-08-25T14:00:00.000Z",
    "paymentStatus": "refunded"
  }
}
```

### 8.6 パッケージカタログのレスポンス

```json
{
  "data": [
    {
      "id": "uuid",
      "placement": "homepage_slider",
      "tier": "basic",
      "dailyRate": "3.00",
      "durationDays": 7,
      "maxAds": 1,
      "totalFee": "21.00"
    },
    {
      "id": "uuid",
      "placement": "homepage_slider",
      "tier": "standard",
      "dailyRate": "5.00",
      "durationDays": 7,
      "maxAds": 1,
      "totalFee": "35.00"
    }
  ]
}
```

### 8.7 料金設定のレスポンス（管理者）

```json
{
  "data": [
    {
      "id": "uuid",
      "placement": "homepage_slider",
      "tier": "basic",
      "dailyRate": "3.00",
      "durationDays": 7,
      "maxAds": 1,
      "isActive": true,
      "createdAt": "2026-08-03T00:00:00.000Z",
      "updatedAt": "2026-08-25T00:00:00.000Z"
    }
  ]
}
```

### 8.8 ページネーション付き広告一覧のレスポンス

```json
{
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "shopId": "f4c5a1b2-3d6e-4f70-8a9b-1c2d3e4f5a6b",
      "title": "Summer Skincare Sale",
      "approvalStatus": "approved",
      "paymentStatus": "completed",
      "isActive": true,
      "createdAt": "2026-08-25T12:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 12,
    "totalPages": 1
  }
}
```

---

## 9. i18nキーリファレンス

以下の表は、広告管理画面で使用される i18n キーと、英語（EN）および日本語（JA）の値一式を示します。ローカライズターゲットのうち、日本語（JA）の値を優先表記しています（EN値は元文書と同じです）。

### 9.1 日本語（ja）― マーチャント広告管理

| キー | 値 |
| :--- | :--- |
| `merchant.ads.title` | "広告管理" |
| `merchant.ads.subtitle` | "広告パッケージを選択し、コンテンツをアップロードして、広告を管理します。" |
| `merchant.ads.pendingBanner` | "ショップの承認が完了していないため、広告パッケージを選択できません。パッケージの閲覧と広告の表示は可能です。" |
| `merchant.ads.statActive` | "掲載中" |
| `merchant.ads.statPending` | "承認待ち" |
| `merchant.ads.statExpired` | "期限切れ" |
| `merchant.ads.catalog` | "利用可能なパッケージ" |
| `merchant.ads.select` | "選択" |
| `merchant.ads.tier.basic` | "ベーシック" |
| `merchant.ads.tier.standard` | "スタンダード" |
| `merchant.ads.tier.premium` | "プレミアム" |
| `merchant.ads.dailyRate` | "日額" |
| `merchant.ads.duration` | "表示日数" |
| `merchant.ads.maxAds` | "最大枠数" |
| `merchant.ads.totalFee` | "合計料金" |
| `merchant.ads.filterStatus` | "ステータス" |
| `merchant.ads.filterApproval` | "承認状態" |
| `merchant.ads.search` | "広告を検索..." |
| `merchant.ads.status.draft` | "下書き" |
| `merchant.ads.status.content_uploaded` | "コンテンツアップロード済み" |
| `merchant.ads.status.pending` | "承認待ち" |
| `merchant.ads.status.approved` | "承認済み" |
| `merchant.ads.status.rejected` | "却下" |
| `merchant.ads.payment.pending` | "支払い待ち" |
| `merchant.ads.payment.completed` | "支払い済み" |
| `merchant.ads.payment.refunded` | "返金済み" |
| `merchant.ads.schedule` | "スケジュール" |
| `merchant.ads.rejectionReason` | "却下理由" |
| `merchant.ads.payFee` | "料金を支払う" |
| `merchant.ads.resubmit` | "再提出" |
| `merchant.ads.edit` | "編集" |
| `merchant.ads.delete` | "削除" |
| `merchant.ads.toggleActive` | "掲載切替" |
| `merchant.ads.selectTitle` | "広告パッケージを選択" |
| `merchant.ads.confirmSelect` | "選択を確認" |
| `merchant.ads.uploadTitle` | "広告コンテンツをアップロード" |
| `merchant.ads.placement` | "掲載場所" |
| `merchant.ads.tier` | "料金プラン" |
| `merchant.ads.titlePlaceholder` | "広告タイトルを入力" |
| `merchant.ads.contentPlaceholder` | "広告内容を入力" |
| `merchant.ads.image` | "広告画像" |
| `merchant.ads.linkUrlPlaceholder` | "https://example.com" |
| `merchant.ads.announcementPlaceholder` | "バナー告知メッセージを入力" |
| `merchant.ads.startDate` | "開始日" |
| `merchant.ads.endDate` | "終了日" |
| `merchant.ads.fee` | "料金概要" |
| `merchant.ads.saveContinue` | "保存して次へ" |
| `merchant.ads.payTitle` | "広告料金を支払う" |
| `merchant.ads.paymentRef` | "支払い参照" |
| `merchant.ads.paySubmit` | "支払い＆送信" |
| `merchant.ads.editTitle` | "広告コンテンツを編集" |
| `merchant.ads.save` | "保存" |
| `merchant.ads.savePay` | "保存して支払い" |
| `merchant.ads.export` | "CSV出力" |
| `common.cancel` | "キャンセル" |
| `common.close` | "閉じる" |
| `common.prev` | "前へ" |
| `common.next` | "次へ" |
| `common.pageInfo` | "ページ {page} / {totalPages} · {total} 件" |

### 9.2 日本語（ja）― 管理者広告管理

| キー | 値 |
| :--- | :--- |
| `admin.ads.title` | "広告モデレーション" |
| `admin.ads.weeklyLimit` | "今週の掲載中: {count} / 5 件" |
| `admin.ads.pendingQueue` | "承認待ちキュー" |
| `admin.ads.shopName` | "ショップ" |
| `admin.ads.feeInfo` | "料金情報" |
| `admin.ads.approve` | "承認" |
| `admin.ads.reject` | "却下" |
| `admin.ads.rejectReason` | "却下理由" |
| `admin.ads.all` | "全広告" |
| `admin.ads.feeSettings` | "広告パッケージ" |
| `admin.ads.newPackage` | "新規パッケージ" |
| `admin.ads.createPkgTitle` | "広告パッケージを作成" |
| `admin.ads.placement` | "掲載場所" |
| `admin.ads.tier` | "料金プラン" |
| `admin.ads.dailyRate` | "日額" |
| `admin.ads.durationDays` | "表示日数" |
| `admin.ads.maxAds` | "最大枠数" |
| `admin.ads.saveRate` | "料金を保存" |
| `admin.ads.feeHistory` | "履歴" |
| `admin.ads.deactivate` | "無効化" |
| `admin.ads.createPkg` | "パッケージを作成" |

> 英語（EN）の i18n キー値については、元文書（画面項目設計書）の §9.1 / §9.2 を参照してください。

---

## 10. 共有コンポーネント

### 10.1 MerchantLayout コンポーネント

| プロパティ | 値 |
| :--- | :--- |
| **場所** | `frontend/src/layouts/MerchantLayout.tsx` |
| **目的** | サイドバーナビゲーション付きマーチャントページの共有レイアウトラッパー |

### 10.2 AdminLayout コンポーネント

| プロパティ | 値 |
| :--- | :--- |
| **場所** | `frontend/src/layouts/AdminLayout.tsx` |
| **目的** | サイドバーナビゲーション付き管理者ページの共有レイアウトラッパー |

### 10.3 Alert コンポーネント

| プロパティ | 値 |
| :--- | :--- |
| **場所** | `frontend/src/components/ui/alert.tsx` |
| **バリアント** | `default`、`destructive`、`success`、`info` |
| **使用法** | ページとダイアログ上部のエラー/成功/情報バナー |

### 10.4 Badge コンポーネント

| プロパティ | 値 |
| :--- | :--- |
| **場所** | `frontend/src/components/ui/badge.tsx` |
| **バリアント** | `default`、`secondary`、`destructive`、`outline` |
| **使用法** | 広告カードの承認/支払いステータスバッジ |

### 10.5 Dialog コンポーネント

| プロパティ | 値 |
| :--- | :--- |
| **場所** | `frontend/src/components/ui/dialog.tsx` |
| **目的** | パッケージ選択、コンテンツアップロード、支払い、編集、管理者パッケージ作成のモーダルダイアログ |

### 10.6 Switch コンポーネント

| プロパティ | 値 |
| :--- | :--- |
| **場所** | `frontend/src/components/ui/switch.tsx` |
| **使用法** | 承認済み広告カードの掲載/非掲載の切り替え |

### 10.7 Table コンポーネント

| プロパティ | 値 |
| :--- | :--- |
| **場所** | `frontend/src/components/ui/table.tsx` |
| **使用法** | 管理者料金設定テーブル、全広告テーブル |

### 10.8 Select コンポーネント

| プロパティ | 値 |
| :--- | :--- |
| **場所** | `frontend/src/components/ui/select.tsx` |
| **使用法** | ステータスフィルタ、管理者パッケージ作成の掲載場所/料金プランセレクト |

### 10.9 DatePicker コンポーネント

| プロパティ | 値 |
| :--- | :--- |
| **場所** | `frontend/src/components/ui/date-picker.tsx` |
| **使用法** | コンテンツアップロードダイアログの開始日選択 |

---

## 11. 特記事項・UI仕様

- **デザインシステム:** ラグジュアリーコスメティックテーマ ― プライマリ `#7C3AED`（パープル）、アクセント `#EC4899`（ピンク）、セカンダリ `#F3E8FF`（ラベンダー）。開発ルール §9.2 参照。
- **レスポンシブビューポート設計:** デスクトップは完全なダッシュボードレイアウト（サイドバー＋コンテンツ）、モバイルは単一列。モバイルではダイアログがフルスクリーンシートになる。
- **アクセシビリティ:** すべてのコントロールはキーボード操作可能であること。全インタラクティブ要素にARIAラベル必須。エラーメッセージは `role="alert"` でアナウンスされること。ダイアログが開いている間はフォーカストラップ。ESCキーでダイアログを閉じる。
- **パフォーマンス:** パッケージカタログと広告一覧は初期読込中にスケルトンローダーを使用。ボタンは非同期処理中にスピナーを表示。アクティブ広告APIの目標は ≤ 100ms（キャッシュヒット）、≤ 500ms（キャッシュミス）。
- **セキュリティ:** すべてのユーザー入力はXSS防止のためサニタイズ。フォームフィールドにAutoComplete属性を正しく設定。ファイルアップロードはクライアントとサーバーの両方で検証（MIMEタイプ、サイズ）。
- **デザイントークン:** ステータスバッジは標準色マッピングを使用 ― success: `bg-green-100 text-green-800`、error: `bg-red-100 text-red-800`、warning: `bg-amber-100 text-amber-800`、info: `bg-blue-100 text-blue-800`。
- **画像処理:** 広告画像はAPIエンドポイントまたは署名付きURLで配信。生のファイルシステムパスを直接公開しない。UUIDベースのファイル名（`{uuid}.{ext}`）。
- **キャッシュ:** アクティブ広告はRedis（`cache:ads:active`）に5分TTLでキャッシュ。パッケージカタログはキャッシュ（`cache:ads:packages`）10分TTL。あらゆる変更でキャッシュを無効化。

---

## 12. テストチェックリスト

### 12.1 パッケージカタログのテスト

- [ ] `GET /ads/packages` からアクティブパッケージが読み込まれる
- [ ] パッケージカードが掲載場所、料金プラン、料金、期間、最大枠数、合計料金を表示
- [ ] 料金プランバッジが正しい色を表示（basic/standard/premium）
- [ ] 保留中マーチャントでは選択ボタンが無効
- [ ] 保留中マーチャントに情報バナーが表示
- [ ] 承認済みマーチャントで選択ボタンが有効
- [ ] パッケージ選択確認ダイアログが正しいパッケージ詳細を表示
- [ ] 選択の確認が下書き広告を作成（201レスポンス）
- [ ] キャンセルが変更なしでダイアログを閉じる
- [ ] 管理者の料金更新でパッケージカタログキャッシュが無効化

### 12.2 コンテンツアップロードのテスト

- [ ] タイトルの必須検証（空 → エラー）
- [ ] タイトルの最大長（200文字）が強制
- [ ] コンテンツは任意（空にできる）
- [ ] コンテンツの最大長（5000文字）が強制
- [ ] 画像アップロードがJPG/PNG/WebPを受け付ける
- [ ] 画像アップロードが非画像ファイルをエラー（VAL-AD-013）で拒否
- [ ] 画像アップロードが5MB超のファイルをエラー（VAL-AD-014）で拒否
- [ ] アップロード後に画像プレビューが表示
- [ ] リンクURLは任意（空にできる）
- [ ] リンクURLの形式検証が機能
- [ ] 告知メッセージの必須検証（空 → エラー）
- [ ] 告知メッセージの最大長（500文字）が強制
- [ ] 開始日ピッカーのデフォルトが今日
- [ ] 開始日が過去日を拒否
- [ ] 終了日が自動計算され読み取り専用で表示
- [ ] 料金サマリーが正しく表示
- [ ] 「保存して次へ」がコンテンツを作成（PATCH /ads/:id/content）
- [ ] 成功時に広告が CONTENT_UPLOADED 状態に遷移
- [ ] コンテンツアップロード後に料金支払いボタンが利用可能になる
- [ ] キャンセルが保存せずにダイアログを閉じる
- [ ] 送信中にローディング状態が表示

### 12.3 支払いのテスト

- [ ] 支払い確認ダイアログが料金サマリーを表示
- [ ] 支払い＆送信が支払いを処理（POST /ads/:id/pay）
- [ ] 成功時に広告が PENDING_APPROVAL 状態に遷移
- [ ] 支払いステータスバッジが「支払い済み」に更新
- [ ] 広告が管理者承認キューに表示
- [ ] 支払い失敗がダイアログにエラーを表示
- [ ] キャンセルが処理せずにダイアログを閉じる
- [ ] 支払い処理中にローディング状態が表示

### 12.4 広告管理のテスト

- [ ] 広告一覧がページネーション付き（1ページ20件）で読み込まれる
- [ ] ステータスフィルタが機能（すべて/掲載中/期限切れ/非掲載）
- [ ] 承認ステータスフィルタが機能（すべて/承認待ち/承認済み/却下）
- [ ] 自社広告内の検索が機能
- [ ] 広告カードがサムネイル、タイトル、バッジ、コンテンツプレビュー、スケジュールを表示
- [ ] 却下された広告に却下理由が表示
- [ ] 編集ボタンが content_uploaded（content IS NOT NULL、payment_status = pending）または却下広告に表示
- [ ] 削除ボタンが content_uploaded（content IS NOT NULL、payment_status = pending）または非掲載（is_active = false）広告に表示
- [ ] 掲載切り替えスイッチが承認済み/支払済み広告に表示
- [ ] 論理削除前に削除確認ダイアログが表示
- [ ] 掲載切り替えスイッチが `is_active` を即時更新
- [ ] ページネーション（前へ/次へ）が機能
- [ ] ページ情報が正しく表示

### 12.5 コンテンツ編集のテスト

- [ ] 編集ダイアログが現在のコンテンツ値を事前入力
- [ ] 画像アップロードが現在の画像プレビューを表示
- [ ] 保存ボタンが content_uploaded（content IS NOT NULL、payment_status = pending）広告に表示
- [ ] 保存して支払いボタンが却下広告に表示
- [ ] 保存が状態を変えずにコンテンツを更新
- [ ] 保存して支払いがコンテンツを更新して支払いダイアログを開く
- [ ] すべての検証ルールがコンテンツアップロードと同じ
- [ ] キャンセルが変更なしでダイアログを閉じる

### 12.6 再提出のテスト

- [ ] 再提出ボタンが却下広告に表示
- [ ] 再提出をクリックすると再提出モードの編集ダイアログが開く
- [ ] 編集後に保存して支払いボタンが利用可能
- [ ] 再提出のために新たな料金が支払い処理される
- [ ] 再提出の支払い後に広告が PENDING_APPROVAL に戻る

### 12.7 管理者モデレーションのテスト

- [ ] 承認待ちキューが保留中広告を読み込む
- [ ] 保留中カードが完全な広告プレビューを表示
- [ ] 週間上限インジケーターが正しい件数を表示
- [ ] 承認ボタンが承認を処理（PATCH /admin/ads/:id/approve）
- [ ] 承認が週間上限（最大5件）を検証
- [ ] 週間上限超過でエラーを表示（WEEKLY_LIMIT_REACHED）
- [ ] 却下ボタンが理由テキストエリアを表示
- [ ] 理由なしの却下で検証エラーを表示（VAL-AD-030）
- [ ] 理由付きの却下が却下を処理（PATCH /admin/ads/:id/reject）
- [ ] 却下時に自動返金がトリガー
- [ ] 承認/却下後に広告が保留中キューから削除
- [ ] 全広告テーブルがフィルタ可能な列で読み込まれる

### 12.8 管理者パッケージ管理のテスト

- [ ] 料金設定テーブルが全パッケージを読み込む
- [ ] 新規パッケージボタンが作成ダイアログを開く
- [ ] 作成ダイアログが全フィールドを検証
- [ ] パッケージ作成が POST /admin/ad-fee-settings で永続化
- [ ] 重複した（掲載場所、料金プラン）がエラーで拒否
- [ ] 表示日数が検証（7〜30）
- [ ] 最大枠数が検証（≥ 1）
- [ ] 日額のインライン編集が機能
- [ ] 料金保存が PATCH /admin/ad-fee-settings/:id で永続化
- [ ] レート変更が ad_fee_history に記録
- [ ] 無効化ボタンが確認ダイアログを表示
- [ ] 無効化が `is_active = false` を設定
- [ ] 無効化されたパッケージがマーチャントカタログから削除
- [ ] 料金履歴ダイアログが監査証跡を表示
- [ ] すべての操作中にローディング状態が表示

### 12.9 エラー処理のテスト

- [ ] 401 Unauthorized が `/login` へリダイレクト
- [ ] 403 Forbidden が権限エラーを表示
- [ ] 404 Not Found が該当なしエラーを表示
- [ ] 409 Conflict が適切な競合エラーを表示
- [ ] 413 Payload Too Large がファイルサイズエラーを表示
- [ ] 415 Unsupported Media Type が形式エラーを表示
- [ ] 429 Too Many Requests がレート制限エラーを表示
- [ ] 500 Internal Server Error が汎用エラーを表示
- [ ] ネットワークエラーが接続エラーを表示

### 12.10 i18nのテスト

- [ ] すべての英語ラベルが正しく描画
- [ ] すべての日本語ラベルが正しく描画（ロケール切替時）
- [ ] 言語切り替えがすべての広告管理ラベルを切り替え
- [ ] エラーメッセージが正しい言語で表示
- [ ] ステータスバッジが正しい言語で表示

### 12.11 レスポンシブデザインのテスト

- [ ] デスクトップレイアウト：サイドバー＋コンテンツ、3〜4列のパッケージグリッド
- [ ] タブレットレイアウト：折りたたまれたサイドバー、2列のパッケージグリッド
- [ ] モバイルレイアウト：単一列カード、フルスクリーンダイアログ
- [ ] すべてのテーブルがモバイルで水平スクロール可能
- [ ] すべてのフォームがモバイルで使用可能（タッチターゲット ≥ 44px）
- [ ] キーボードナビゲーションが全体で機能

---

*画面項目設計書（広告管理）終わり*
