# 画面項目設計書 — 商品詳細ページ

**文書ID:** SKM-SIS-SCR-002
**対象画面:** 商品詳細（商品詳細ページ）
**サブシステム:** 商品カタログ — 商品詳細、レビュー、お気に入り＆カート追加
**機能ID:** FN-PROD-001
**バージョン:** 1.10
**作成日:** 2026-08-10
**最終更新日:** 2026-08-24
**作成者:** シニアシステムエンジニア
**レビュー状況:** ドラフト（審査中）
**分類:** 社内 — 技術部門

---

## 1. 文書管理（ドキュメント管理）

### 1.1 文書改訂履歴

| バージョン | 日付 | 作成者 | 変更内容 |
| :--- | :--- | :--- | :--- |
| 1.0 | 2026-08-10 | シニアシステムエンジニア | 初版リリース。標準的な画面項目形式に整合した商品詳細ページの画面項目仕様。項目ID、コンポーネント種別、データソース、イベント仕様、バリデーションエラーコード、レスポンシブブレークポイント、アクセシビリティ要件を含む包括的な項目定義。 |
| 1.1 | 2026-08-11 | シニアシステムエンジニア | `SKM-DBS-001`および`SKM-DEV-001`と照合。SKU長（`VARCHAR(100)`）、レビューレーティング型（`INTEGER`）、配列カラム型（`TEXT[]`）、`discount_type`の保存（`VARCHAR(20)` + CHECK）、ページネーションと認可の文言、文書ID参照（`SKM-FDS-PROD-001`）を修正し、ミャンマー語（my）のi18n参照を追加。 |
| 1.2 | 2026-08-11 | シニアシステムエンジニア | サインアップ/ログイン画面項目仕様（`SKM-SIS-SCR-001`）と形式を整合。必須列の値を`必須`/`条件付き`/`—`に正規化し、i18nキーセクションを言語ごと・機能領域ごとに再構成し、セクション区切りを修正。 |
| 1.3 | 2026-08-17 | シニアシステムエンジニア | 現在のデータベース、要件、開発ルール、商品詳細機能仕様と突合。UUID識別子、購入者のみの変更認可、レビューページネーション上限、販売者/ショップマッピング、プロモーション項目の型、未解決のカート永続化モデル。 |
| 1.4 | 2026-08-17 | シニアシステムエンジニア | `SKM-DBS-001` v2.2、`SKM-REQ-001` v1.7、`SKM-DEV-001` v2.1と整合。新しい`carts`および`cart_items`テーブルでカート永続化モデルを解決。ショップ承認ワークフローを明確化。カートライフサイクルルール（B-CART-008~014）を追加。販売者/ショップ/商品の関連チェーンを検証。カート/お気に入り/レビューの変更に対する購入者のみのロールゲーティングを確認。 |
| 1.5 | 2026-08-18 | シニアシステムエンジニア | `SKM-REQ-001` v1.10と整合。相互参照バージョンを更新し、レビュー管理用に`review_reports`テーブル参照を追加。レビュー報告のテストケースとi18nキーを追加し、全項目のフィールドマッピングを最新のデータベース仕様と照合。 |
| 1.6 | 2026-08-18 | シニアシステムエンジニア | 最終検証パス。すべての項目定義、データベースフィールドマッピング、エラーコード、i18nキー、APIレスポンス構造がSKM-REQ-001 v1.10、SKM-DBS-001 v2.2、SKM-DEV-001 v2.1、SKM-FDS-PROD-001 v5.1と整合していることを確認。すべてのレビュー報告要件（SYS-REV-001~008）を検証し、適切に実装。チーム所有権ルールに基づきカートおよびお気に入りセクションを除外。 |
| 1.7 | 2026-08-18 | シニアシステムエンジニア | すべてのカート＆お気に入りセクション（4.4、5.4、5.5、6.3、6.6、7.3）に明確なチーム所有権の免責事項を追加。2.3節にカートチームおよびお気に入りチームが所有する項目を特定するためのアイコン付き注記を追加。カートおよびお気に入り機能に関する「参照のみ」のマーク付きセクションを持つ包括的なリファレンス文書として維持。 |
| 1.8 | 2026-08-21 | シニアシステムエンジニア | `SKM-FDS-PROD-001` v6.0、`SKM-DBS-001` v2.4、`SKM-REQ-001` v2.10と整合。相互参照バージョンを更新し、プロモーション割引型バリデーション用に`discount_types`ルックアップテーブル参照を追加（ルールBR-PROD-018）。レビューリストのページネーションを機能仕様と整合（`limit`最大50、デフォルト10）。商品詳細APIレスポンスマッピングに`licenseStatus`および`isFeatured`フィールドを追加。重複セクション番号（§10.8 → §10.9）を修正。 |
| 1.9 | 2026-08-21 | シニアシステムエンジニア | `SKM-REQ-001` v2.10 §5.3/§5.7（「商品詳細サイドバー」配置）および`SKM-FDS-PROD-001` v7.0に基づきサイドバー広告表示を追加。セクション[J]項目定義（項目36–41）、ロード/ローテーション動作（§5.11）、データベースマッピング（§7.5）、APIレスポンス例（§8.8）、i18nキー（§9.19~9.21）、共有コンポーネント（§10.10）、テストチェックリスト（§12.8）を追加。レイアウト（§3.1）とコア機能（§2.3）を更新。オープン項目をフラグ：`advertisements`テーブルに`placement`/`tier`列が存在しない（SKM-DEV-001 §13）。 |
| 1.10 | 2026-08-24 | シニアシステムエンジニア | サインアップ/ログイン画面項目仕様（`SKM-SIS-SCR-001`）と整合するため、パンくずリストセクションを削除。セクション（パンくずリスト）の項目定義、デスクトップ/モバイルレイアウト（§3.1）のパンくずブロック、`bcBreadcrumb`ナビゲーション動作（§5.10）およびデータベースマッピング（§7.1）、`product.breadcrumb.*` i18nキー（§9.1/9.7/9.13）、パンくずナビゲーションテストケース（§12.1）を削除。§4の小節見出しを連番で再採番。相互参照の安定性のため、残りのセクション文字（結果）と項目番号は維持。 |

### 1.2 関連文書

| No. | 文書ID | 文書名 | ファイルパス | 備考 |
| :-- | :--- | :--- | :--- | :--- |
| 1 | SKM-REQ-001 | 要件定義書（v2.10） | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | ビジネスワークフロー、必須フィールド、ルール（ルール4.2.x、4.4.x）。 |
| 2 | SKM-DBS-001 | データベース設計書（v2.4） | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | テーブル構造（`products`、`reviews`、`wishlist`、`promotions`、`order_items`、`merchants`、`shops`、`carts`、`cart_items`、`review_reports`、`discount_types`、`advertisements`、`ad_fee_settings`、`ad_payments`）、UUID主キー、制約、販売者/ショップ関係。 |
| 3 | SKM-DEV-001 | 開発ルール（v2.1） | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` | セキュリティルール（購入者のみのショッピング）、デザイントークン、エラーレスポンス、ショップ承認ワークフロー（§12.2.1）。 |
| 4 | SKM-FDS-PROD-001 | 機能設計書 — 商品詳細（v7.0） | `docs/screen/ProductDetail/機能設計書_ProductDetail.md` | ユースケース、状態遷移、バリデーションルール、エラー処理。 |

---

## 2. 画面概要・目的（画面概要・目的）

### 2.1 目的（目的）
商品詳細ページは、購入者ジャーニーにおける主要なコンバージョンポイントです。単一商品の完全な情報 — 画像ギャラリー、価格、肌タイプ適合性、成分、販売者/ショップ情報、レビュー、関連商品、有効プロモーション — を表示し、商品をカートに追加してお気に入りを管理するためのアクションを提供します。

### 2.2 対象ユーザーと権限（対象ユーザーと権限）

| 属性 | 値 |
| :--- | :--- |
| **主要アクター** | 購入者（認証済みおよび未認証の訪問者） |
| **認証要件** | なし（商品表示、レビュー表示）。JWT Bearer Token（レビュー投稿、お気に入りトグル、カート追加） |
| **データ範囲** | 単一商品レコード（公開）。自身のレビュー、自身のお気に入りメンバーシップ、自身のカート（認証済み） |
| **アクセス制御** | 読み取りエンドポイントは公開。レビュー、お気に入り、カート追加の変更には認証済み`購入者`ロールが必要（JwtAuthGuard + RolesGuard）。 |

### 2.3 主要機能・基本設計方針（主要機能・基本設計方針）

> ℹ️ **チーム所有権の注記** — 項目6および7（カートに追加＆お気に入り管理）は各チームが管理します。本セクションは商品詳細の文脈と統合ポイントを文書化します。

1. **商品詳細表示** — 名前、説明、価格、比較価格、SKU、在庫、タグ、成分、カテゴリー、販売者、ショップを表示。
2. **画像ギャラリー** — サムネイルナビゲーション付き複数画像。`images[0]`がメイン/カバー画像（ルール4.2.3）。
3. **レビュー** — レーティング付き承認済みレビューのページネーション表示。レビューの作成（購入済みユーザーのみ）。
4. **肌タイプ適合性** — マッチした肌タイプを示すバッジグループ。
5. **関連商品** — カテゴリー、肌タイプ、タグに基づく「類似商品」セクション。
6. **カートに追加** ⚠️ — 挿入時のアトミックな在庫検証付き数量ステッパー。[**カートチーム**]
7. **お気に入り管理** ⚠️ — 楽観的UI更新によるお気に入りへの追加（削除は専用のお気に入り画面/モジュールで処理）。[**お気に入りチーム**]
8. **有効プロモーション表示** — 割引詳細、有効期間、残数（`max_uses - used_count`）付きの販売者の有効プロモーション。
9. **サイドバー広告表示** — `product_sidebar`配置（REQ §5.3）向けのスポンサード広告。承認済み、支払済み、アクティブな広告のみ。ローテーションあたり最大5件、5秒ごとに自動ローテーション。優先順位は Premium（プレミアム）> Standard（スタンダード）> Basic（ベーシック）。広告の購入/承認はAdsモジュールで処理。
10. **エラー処理** — フィールドレベルのインラインエラー、フォームレベルのバナー、トースト通知。
11. **国際化** — EN、JA、MYの完全なi18nサポート。
12. **レスポンシブデザイン** — デスクトップは2カラムレイアウト、モバイルはスティッキーCTAバー付きのスタックレイアウト。

---

## 3. 画面レイアウト（画面レイアウト構成）

### 3.1 全体画面構成（全体画面構成）

#### デスクトップレイアウト（≥ 1024px）
```text
┌─────────────────────────────────────────────────────────────────────┐
│                         BROWSER VIEWPORT                             │
├─────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────┐   ┌───────────────────────────────┐     │
│  │  [B] PRODUCT GALLERY   │   │  [C] PRODUCT INFO             │     │
│  │                        │   │                               │     │
│  │  [B1] Main Image       │   │  [C1] Product Name            │     │
│  │  [B2] Thumbnails       │   │  [C2] Rating Summary          │     │
│  │                        │   │  [C3] Price                   │     │
│  │                        │   │  [C4] Compare-at Price        │     │
│  │                        │   │  [C5] Stock Status            │     │
│  │                        │   │  [C6] SKU                     │     │
│  │                        │   │  [C7] Skin Type Compatibility │     │
│  │                        │   │                               │     │
│  │                        │   │  [D] PURCHASE ACTIONS         │     │
│  │                        │   │   [D1] Quantity Stepper       │     │
│  │                        │   │   [D2] Add to Cart Button     │     │
│  │                        │   │   [D3] Add to Wishlist Button │     │
│  │                        │   │                               │     │
│  │                        │   │  [E] SOLD BY                  │     │
│  │                        │   │       Merchant + Shop link    │     │
│  │                        │   │                               │     │
│  │                        │   │  [I] ACTIVE PROMOTION (cond.) │     │
│  │                        │   │                               │     │
│  │                        │   │  [J] SIDEBAR ADS (cond.)      │     │
│  │                        │   │       Sponsored slider        │     │
│  │                        │   │                               │     │
│  └────────────────────────┘   └───────────────────────────────┘     │
│                                                                     │
│  [F] PRODUCT TABS                                                    │
│   [Description] [Ingredients] [Reviews (32)]                        │
│                                                                     │
│  [G] REVIEW FORM / REVIEW LIST (cond., inside Reviews tab)          │
│                                                                     │
│  [H] RELATED PRODUCTS — "Similar Products"                          │
│   ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                       │
│   │  Card  │ │  Card  │ │  Card  │ │  Card  │                       │
│   └────────┘ └────────┘ └────────┘ └────────┘                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### モバイルレイアウト（< 768px）
```text
┌─────────────────────────────────────┐
│         BROWSER VIEWPORT            │
├─────────────────────────────────────┤
│ [B1] Main Image (full-width)        │
│ [B2] Thumbnails (horizontal)        │
│                                     │
│ [C] PRODUCT INFO (stacked)          │
│  [C1] Product Name                  │
│  [C2] Rating Summary                │
│  [C3] Price / [C4] Compare-at       │
│  [C5] Stock Status                  │
│  [C7] Skin Type Compatibility       │
│                                     │
│ [E] SOLD BY                         │
│ [I] ACTIVE PROMOTION (cond.)        │
│ [J] SIDEBAR ADS (cond.)             │
│                                     │
│ [F] PRODUCT TABS                    │
│ [G] REVIEW FORM / REVIEW LIST       │
│ [H] RELATED PRODUCTS (horizontal)   │
│ ────────────────────────────────────│
│ [D] STICKY CTA BAR (fixed bottom)   │
│  [D1][D2]  [D3]                     │
│                                     │
└─────────────────────────────────────┘
```

### 3.2 レスポンシブ対応（レスポンシブ対応）

| ブレークポイント | 最小幅 | レイアウト動作 |
| :--- | :--- | :--- |
| モバイル（デフォルト） | 0px | 全幅スタックレイアウト、下部に固定「カートに追加」バー |
| タブレット（`md:`） | 768px | スタックされたギャラリー+情報、固定CTAバー |
| デスクトップ（`lg:`） | 1024px | 2カラム：左にギャラリー、右に情報、下部にタブ |
| ワイド（`xl:`） | 1280px | 拡張スペーシング付き2カラム、最大幅コンテナ |

---

## 4. 画面項目定義（画面項目定義）

### 4.1 セクション[B]: 商品画像ギャラリー（商品画像ギャラリー）

| No. | 項目ID | 項目名（論理名） | コンポーネント種別 | データ型＆最大長 | 必須 | 初期状態 / デフォルト値 | 入力制約 / 形式 | データソース / DBマッピング | 備考 / ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 2 | `imgMainImage` | メイン画像 | 画像（`<img>`） | URL（文字列） | 必須 | スケルトンローダー。ロード後は`images[0]`を表示 | 有効な画像URL | `products.images[0]` | プライマリ/カバー画像（ルール4.2.3）。遅延ロード。Tailwind: `aspect-square object-cover rounded-xl`。 |
| 3 | `lstThumbnails` | サムネイルリスト | 画像リスト | URL[]（文字列[]） | — | 画像が1枚のみの場合は非表示 | — | `products.images` | サムネイルのクリックで`imgMainImage`を交換。アクティブなサムネイルは境界線で強調表示。 |

### 4.2 セクション[C]: 商品情報（商品情報）

| No. | 項目ID | 項目名（論理名） | コンポーネント種別 | データ型＆最大長 | 必須 | 初期状態 / デフォルト値 | 入力制約 / 形式 | データソース / DBマッピング | 備考 / ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 4 | `lblProductName` | 商品名 | 静的ラベル（`<h1>`） | String(255) | 必須 | スケルトンローダー | — | `products.name` | Tailwind: `text-2xl font-bold`（デスクトップ）、`text-xl`（モバイル）。 |
| 5 | `wgtRatingSummary` | レーティングサマリー | レーティングウィジェット | Decimal / Integer | 必須 | スケルトンローダー | `★ 4.5（32件のレビュー）` | `products.avg_rating`、`products.review_count` | avgRatingは小数1桁に整形。クリックでレビュータブへスクロール。`role="img"` + aria-labelでアクセス可能。 |
| 6 | `lblPrice` | 価格 | 静的ラベル | 小数文字列 | 必須 | スケルトンローダー | 形式: 通貨 `25.00` | `products.price` | Tailwind: `text-2xl font-semibold text-primary`。 |
| 7 | `lblCompareAtPrice` | 比較価格 | 静的ラベル（取り消し線） | 小数文字列 | — | nullの場合は非表示 | 形式: 通貨 `32.00`;取り消し線 | `products.compare_at_price` | 割引バッジ `%オフ` は`(1 - price / compareAtPrice) * 100`で計算。ルールBR-PROD-003。 |
| 8 | `badgeStockStatus` | 在庫ステータス | バッジ / テキスト | 文字列 | 必須 | スケルトンローダー | 状態: `IN_STOCK`、`LOW_STOCK`、`OUT_OF_STOCK` | `products.stock_quantity`、`products.low_stock_threshold` | `stock_quantity <= low_stock_threshold`の場合「在庫あり（45）」/「在庫切れ」/残りわずか警告（ルール4.2.2、BR-PROD-012）。 |
| 9 | `lblSKU` | SKU | 静的ラベル | String(100) | — | nullの場合は非表示 | — | `products.sku` | 表示形式: 「SKU: SKU-0001」。 |
| 10 | `grpSkinType` | 肌タイプ適合性 | バッジグループ | String[] | 必須 | スケルトンローダー | 選択肢: dry、oily、combination、sensitive、normal | `products.skin_types` | 例: [乾燥肌] [敏感肌] [普通肌]。Tailwind: `bg-lavender text-primary rounded-full`。 |

### 4.3 セクション[D]: 購入アクション（購入アクション）

> ⚠️ **他チーム所有** — 項目11-13（数量ステッパー、カートに追加、お気に入り）はそれぞれカートチームおよびお気に入りチームが管理します。本セクションは商品詳細の文脈のための参照のみとして提供されます。

| No. | 項目ID | 項目名（論理名） | コンポーネント種別 | データ型＆最大長 | 必須 | 初期状態 / デフォルト値 | 入力制約 / 形式 | データソース / DBマッピング | 備考 / ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 11 | `stepperQuantity` | 数量ステッパー | 数値ステッパー | INT | — | デフォルト: 1 | 最小: 1。最大: `stock_quantity`。 | — | `[ - ] 1 [ + ]`。`-`は1で無効。`+`は`stock_quantity`で無効。 |
| 12 | `btnAddToCart` | カートに追加ボタン | ボタン（`submit`、`primary`） | — | 必須 | 商品がロードされるまで無効 | — | — | `stock_quantity <= 0`または選択数量>在庫の場合は無効。ロード中: スピナー+「追加中...」。ルールBR-PROD-004、BR-PROD-010。 |
| 13 | `btnWishlist` | お気に入りに追加ボタン | アイコンボタン | — | — | 未選択（♡）。ステータスのロード中はスケルトン | — | — | ♡ / ♥トグル。楽観的UI更新付き。追加のみ。削除はお気に入り画面/モジュールで処理。未認証ユーザーには無効（ログインゲーティング）。 |

### 4.4 セクション[E]: 出品者情報（出品者情報）

| No. | 項目ID | 項目名（論理名） | コンポーネント種別 | データ型＆最大長 | 必須 | 初期状態 / デフォルト値 | 入力制約 / 形式 | データソース / DBマッピング | 備考 / ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 14 | `lblSoldBy` | 出品者ラベル | 静的ラベル | 文字列 | — | テキスト: 「出品者」 | — | ハードコードされたUIテキスト | Tailwind: `text-sm text-muted-foreground`。 |
| 15 | `lnkShop` | ショップ名リンク | リンク（`<Link>`） | String(255) | — | ショップの店舗名 | — | `products.merchant_id` → `merchants.id` → `merchants.user_id` → `shops.user_id`;`shops.name`、`shops.slug`、`shops.logo_url`、`shops.is_approved`をロード | 「ショップへ行く →」で`/shops/:shopSlug`へ遷移。`shops.logo_url`が利用可能な場合はショップロゴを表示。ショップは商品詳細に表示されるには`is_approved = true`である必要がある（ルールMRCH-005、SKM-DEV-001 §12.2.1）。 |

### 4.5 セクション[F]: 商品タブ（商品タブ）

| No. | 項目ID | 項目名（論理名） | コンポーネント種別 | データ型＆最大長 | 必須 | 初期状態 / デフォルト値 | 入力制約 / 形式 | データソース / DBマッピング | 備考 / ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 16 | `tabsProduct` | 商品タブ | タブ | — | — | アクティブタブ: 説明 | 選択肢: 説明、成分、レビュー（件数） | `products.description`、`products.ingredients`、`products.review_count` | キーボードサポート付きのタブナビゲーション。レビュータブに`review_count`のバッジを表示。 |
| 17 | `lblDescription` | 説明コンテンツ | 静的ラベル | TEXT | — | 説明タブ内に表示 | — | `products.description` | 長文。書式を保持。自動エスケープ（ルールBR-PROD-017）。 |
| 18 | `lstIngredients` | 成分リスト | 箇条書きリスト | String[] | — | 成分タブ内に表示 | — | `products.ingredients` | 成分名の箇条書きリスト。 |

### 4.6 セクション[G]: レビューフォーム＆レビュー一覧（レビューフォーム・レビュー一覧）

| No. | 項目ID | 項目名（論理名） | コンポーネント種別 | データ型＆最大長 | 必須 | 初期状態 / デフォルト値 | 入力制約 / 形式 | データソース / DBマッピング | 備考 / ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 19 | `lblReviewSection` | レビューセクションタイトル | 静的ラベル（`<h2>`） | 文字列 | — | テキスト: 「レビュー」 | — | ハードコードされたUIテキスト | — |
| 20 | `rdoRating` | レーティングスター | スターセレクタ | INTEGER | 必須 | 未選択（0スター） | 整数1–5 | `reviews.rating` | 5つのスターからなるアクセス可能なラジオグループ。ホバープレビュー。 |
| 21 | `txtReviewTitle` | レビュータイトル入力 | 入力（`text`） | String(255) | — | 空。プレースホルダー: 「タイトル」 | 最大長: 255 | `reviews.title` | 任意フィールド。 |
| 22 | `txaReviewBody` | レビュー本文テキストエリア | テキストエリア | TEXT（5000） | — | 空。プレースホルダー: 「ご感想を共有してください...」 | 最大長: 5000 | `reviews.body` | 任意フィールド。文字数カウンター。 |
| 23 | `uplReviewImages` | レビュー画像アップロード | ファイルアップロード | File[]（JSON配列） | — | 空 | 最大5枚。JPG/PNG/WebPを受け入れる | `reviews.images` | 任意。削除ボタン付きのサムネイルプレビュー。 |
| 24 | `btnSubmitReview` | レビュー送信ボタン | ボタン（`submit`、`primary`） | — | 条件付き | 購入者として認証された場合のみ表示 | — | — | ロード中: スピナー+「送信中...」。検証済み購入でない場合は無効（サーバー側で適用）。 |
| 25 | `lblLoginPrompt` | ログインプロンプト | 静的ラベル+リンク | 文字列 | 条件付き | テキスト: 「レビューを書くにはサインインしてください」 | — | ハードコードされたUIテキスト | 未認証のときに表示。リンクは`/login`へ遷移。 |
| 26 | `lstReviews` | レビュー一覧 | カードリスト | Review DTO[] | — | スケルトンローダー。レビューがない場合は空の状態 | ページネーション: page ≥ 1、limit 1–50（デフォルト10） | `reviews` + `users` | `created_at DESC`で並び替え。各カード: レーティング、タイトル、本文、画像、検証済みバッジ、ユーザー名/アバター、日付。 |
| 27 | `btnLoadMoreReviews` | さらに読み込む / ページネーション | ボタン / ページネーション | — | 条件付き | `totalPages > 1`のときに表示 | — | `meta` | 次のページをロード。ページ情報`meta.page / meta.totalPages`を表示。 |

#### 4.6.1 レビュー報告（レビュー報告）

| No. | 項目ID | 項目名（論理名） | コンポーネント種別 | データ型＆最大長 | 必須 | 初期状態 / デフォルト値 | 入力制約 / 形式 | データソース / DBマッピング | 備考 / ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 27a | `btnReportReview` | レビュー報告ボタン | アイコンボタン | — | — | 非表示。各レビューカードのホバー/タップ時に表示 | — | `review_reports` | 購入者はレビューを報告してモデレーションを依頼できます。報告理由: spam、inappropriate、fake、other。モーダル/フォームをトリガー。購入者ごとにレビューあたり1回の報告。ルールSYS-REV-001~008。 |
| 27b | `dlgReportReview` | レビュー報告ダイアログ | ダイアログ / モーダル | — | 条件付き | トリガーされるまで非表示 | — | `review_reports` | 理由セレクタ（ラジオグループ）と任意の説明テキストエリアを含む。`POST /api/v1/reviews/:reviewId/report`に送信。 |
| 27c | `rdoReportReason` | 報告理由 | ラジオグループ | 文字列 | 必須 | 未選択 | 選択肢: spam、inappropriate、fake、other | `review_reports.reason` | 必須フィールド。 |
| 27d | `txaReportDescription` | 報告の説明 | テキストエリア | TEXT（1000） | — | 空。プレースホルダー: 「追加の詳細を提供してください...」 | 最大長: 1000 | `review_reports.description` | 任意フィールド。 |

### 4.7 セクション[H]: 関連商品（関連商品）

| No. | 項目ID | 項目名（論理名） | コンポーネント種別 | データ型＆最大長 | 必須 | 初期状態 / デフォルト値 | 入力制約 / 形式 | データソース / DBマッピング | 備考 / ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 28 | `lblRelatedTitle` | 関連商品タイトル | 静的ラベル（`<h2>`） | 文字列 | — | テキスト: 「類似商品」 | — | ハードコードされたUIテキスト | — |
| 29 | `gridRelated` | 関連商品グリッド | カードグリッド / カルーセル | ProductCard DTO[] | — | スケルトンローダー | 最大8件 | `products`（類似クエリ） | カードは`/products/:slug`へ遷移。遅延ロード。カテゴリー、肌タイプ、タグに基づく。 |

### 4.8 セクション[I]: アクティブプロモーション（アクティブプロモーション）

| No. | 項目ID | 項目名（論理名） | コンポーネント種別 | データ型＆最大長 | 必須 | 初期状態 / デフォルト値 | 入力制約 / 形式 | データソース / DBマッピング | 備考 / ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 30 | `cardActivePromotion` | アクティブプロモーションカード | バナー / カード | Promotion DTO | 条件付き | 販売者に有効なプロモーションがない場合は非表示 | — | `promotions` | アクティブ、期間内、残高 > 0のプロモーションのみ表示（ルールBR-PROD-018）。 |
| 31 | `lblPromoCode` | クーポンコード | 静的ラベル（バッジ） | 文字列 | 条件付き | 例: 「GLOW10」 | — | `promotions.code` | コードバッジとして表示。クリックでコピー。 |
| 32 | `lblPromoDiscount` | 割引情報 | 静的ラベル | 文字列 | 条件付き | 例: 「10%オフ」または「¥500オフ」 | — | `promotions.discount_type`、`promotions.discount_value` | percentage / fixedの書式設定。`discount_type`の値は`discount_types`ルックアップテーブルに限定（ルールBR-PROD-018）。 |
| 33 | `lblPromoMinOrder` | 最低注文額 | 静的ラベル | 小数文字列 | 条件付き | nullの場合は非表示 | 形式: 通貨 | `promotions.min_order_amount` | 例: 「最小注文 ¥20.00」。 |
| 34 | `lblPromoValidity` | 有効期間 | 静的ラベル | 文字列 | 条件付き | 例: 「2026-08-01 ~ 2026-09-30」 | ISO 8601形式 | `promotions.starts_at`、`promotions.expires_at` | 現地時間で表示。 |
| 35 | `lblPromoBalance` | 残数 | 静的ラベル | 整数 / 文字列 | 条件付き | 例: 「残り65」または「無制限」 | `max_uses - used_count`。`max_uses`がNULLの場合は「無制限」 | `promotions.max_uses`、`promotions.used_count` | 残数0 → プロモーションは表示されない（ルールBR-PROD-019）。 |

### 4.9 セクション[J]: サイドバー広告（サイドバー広告）

> ℹ️ 広告の購入、支払い、承認はAdsモジュール（販売者/管理者）で処理されます。本セクションはREQ §5.3の表示ルールおよびFDS v7.0のルールBR-PROD-020~023に基づき、適格な広告のみを表示します。

| No. | 項目ID | 項目名（論理名） | コンポーネント種別 | データ型＆最大長 | 必須 | 初期状態 / デフォルト値 | 入力制約 / 形式 | データソース / DBマッピング | 備考 / ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 36 | `lstSidebarAds` | サイドバー広告スライダー | 広告スライダー / カルーセル | Advertisement DTO[] | 条件付き | 適格な広告がない場合は非表示。ロード中はスケルトン | ローテーションあたり最大5件。5秒ごとに自動ローテーション。ホバー/フォーカスで一時停止 | `advertisements`（フィルター済み） | `approval_status = 'approved'`、`payment_status = 'completed'`、`is_active = true`、期間内で`product_sidebar`配置の広告のみ（ルールBR-PROD-020/021）。優先順位はPremium > Standard > Basic、層内はラウンドロビン（ルールBR-PROD-022）。 |
| 37 | `imgAdCreative` | 広告画像 | 画像（`<img>`） | URL（文字列） | — | 最初の広告の画像。nullの場合はショップロゴにフォールバック | 有効な画像URL | `advertisements.image_url` | 遅延ロード。altテキストは広告タイトルから。 |
| 38 | `lblAdTitle` | 広告タイトル | 静的ラベル | String(255) | 必須 | — | 最大255文字 | `advertisements.title` | 各広告カードに表示。 |
| 39 | `lblAdAnnouncement` | お知らせメッセージ | 静的ラベル | String(500) | 必須 | — | 最大500文字 | `advertisements.announcement_message` | バナーお知らせテキスト。 |
| 40 | `lnkAdTarget` | 広告リンク | リンク（`<a>`） | URL（文字列） | — | `link_url`がある場合はカード全体がクリック可能。nullの場合は非クリック | 外部URL | `advertisements.link_url` | `rel="noopener noreferrer nofollow sponsored"`付きで新しいタブで開く（ルールBR-PROD-023）。 |
| 41 | `lblAdShop` | 広告主ショップ名 | 静的ラベル+バッジ | String(255) | 必須 | テキスト: 「広告 · {ショップ名}」 | — | `advertisements.shop_id` → `shops.name` | 「広告」バッジは常に表示（ルールBR-PROD-023）。ショップ名は`/shops/:shopSlug`にリンク。 |

---

## 5. 項目の挙動・イベント仕様（各項目における挙動・イベント仕様）

### 5.1 ページロード / 商品詳細表示
- **トリガー:** 購入者が`/products/:slug`に移動。
- **処理ロジック:**
  1. `GET /api/v1/products/:slug`でカテゴリー、販売者、ショップを含む商品詳細をロード。
  2. 並行して、レビュー、類似商品、お気に入りステータス（ログイン中の場合は）をロード。
  3. ギャラリー、商品情報、タブ、関連商品をスケルトンローダー付きでレンダリング。
- **例外処理:**
  - `404`: 商品が見つからない / 非アクティブ → 「商品一覧に戻る」リンク付きの空状態 → `/products`へ移動。
  - `400`: 無効なスラッグ → フィールドレベルエラー / エラーページ。
  - `NET_ERR`: 再試行ボタンを表示（再フェッチ）。

### 5.2 サムネイルクリック（`lstThumbnails` onClick）
- **トリガー:** ユーザーがサムネイルをクリック。
- **処理ロジック:** `imgMainImage`のソースをクリックしたサムネイルの画像に交換。アクティブなサムネイルを強調表示。スクリーンリーダーのラベルを更新。
- **例外処理:** 該当なし。

### 5.3 数量ステッパー（`stepperQuantity` onChange）
- **トリガー:** ユーザーが`-`または`+`をクリック。
- **処理ロジック:**
  1. 範囲[1、`stock_quantity`]内で数量を増減。
  2. 1で`-`を無効化。`stock_quantity`で`+`を無効化。
  3. `btnAddToCart`の有効状態を再評価。
- **例外処理:** 該当なし。

### 5.4 カートに追加（`btnAddToCart` onClick）

> ⚠️ **カートチーム所有** — 本セクションは商品詳細の観点から期待される動作を文書化します。実装はカート＆チェックアウトチームが管理します。

- **トリガー:** ユーザーが「カートに追加」をクリック。
- **処理ロジック:**
  1. **クライアント側事前チェック:** 数量 ≥ 1、商品の在庫があるか（`stock_quantity ≥ requested_quantity`）。
  2. **バックエンド認可:** `JwtAuthGuard` + `RolesGuard('buyer')`で購入者ロールを検証（ルールB-CART-001）。
  3. **バックエンド送信:** `{ productId、quantity }`で`POST /api/v1/cart/items`。
  4. **バックエンド実行:**
     - 在庫をアトミックに再検証。`stock_quantity < quantity`の場合は拒否（ルールB-CART-011）。
     - `carts`テーブル経由で購入者のアクティブなカートを取得または作成（購入者あたり1つ）。
     - `cart_items`レコードを挿入または更新（一意制約: `(cart_id、product_id)`）。既存の場合は数量を加算（ルールB-CART-009）。
     - 全アイテムを含む更新されたカートを返す。
  5. **実行後UI:** トースト「カートに追加しました」。カートバッジ数を無効化して更新。数量ステッパーを1にリセット。
- **例外処理:**
  - `400`: 在庫不足 → インラインエラー、CTAを無効化、在庫バッジを更新。
  - `401`: 未認証 → ログインモーダルを開く / `/login`へリダイレクト。
  - `403`: 購入者ロールでない → `/unauthorized`へリダイレクト（ルールB-CART-001）。
  - `404`: 商品が見つからない → 空状態。
  - `422`: 商品の在庫切れ（`stock_quantity = 0`）→ カートに追加を無効化 + 「在庫切れ」バッジ（ルールB-CART-011）。

### 5.5 お気に入りに追加（`btnWishlist` onClick）

> ⚠️ **お気に入りチーム所有** — 本セクションは商品詳細の観点から期待される動作を文書化します。実装はお気に入り管理チームが管理します。

- **トリガー:** ユーザーが♡ボタンをクリック（off → on）。
- **処理ロジック:**
  1. **クライアント側認可:** 認証状態をチェック。未認証の場合はボタンを無効化し、ツールチップ「保存するにはサインインしてください」を表示。
  2. **楽観的更新:** 即座にハートを塗りつぶす（♡ → ♥）。
  3. **バックエンド認可:** `JwtAuthGuard` + `RolesGuard('buyer')`で購入者ロールを検証。
  4. **バックエンド送信:** `POST /api/v1/wishlist/:productId`。
  5. **実行後UI:** 成功をトーストで確認。失敗時は楽観的状態をロールバックしてエラーを表示。
- **例外処理:**
  - `401`: 未認証 → ログインゲーティング（ボタン無効+ツールチップ）。
  - `403`: 購入者ロールでない → `/unauthorized`へリダイレクト（ルールB-WISH-001）。
  - `404`: 商品が見つからない → 空状態。
  - `409`: お気に入りに追加済み → トースト「お気に入りに追加済みです」、♥の塗りつぶしを維持。

> 注: お気に入りからの削除/削除処理は専用のお気に入り画面/モジュールで処理され、本画面のスコープ外です。ルールB-WISH-005ではお気に入り項目をカートに移動できます。

### 5.6 レビュー投稿（`btnSubmitReview` onClick）
- **トリガー:** ユーザーが「レビューを投稿」をクリック。
- **処理ロジック:**
  1. **クライアント側事前チェック:** レーティング1–5、タイトル ≤ 255、本文 ≤ 5000、画像 ≤ 5枚。
  2. **バックエンド送信:** `POST /api/v1/products/:productId/reviews`。
  3. **バックエンド実行:** 購入者ロール、検証済み購入、一意な`(user_id, product_id)`を検証。レビューを作成。トランザクション内で`avg_rating`/`review_count`を再計算。キャッシュを無効化。
  4. **実行後UI:** トースト「レビューを投稿しました」。レビュー一覧とレーティングサマリーを更新。
- **例外処理:**
  - `422`: 検証済み購入でない → 説明テキストを表示。
  - `409`: 重複レビュー → レビューフォームを無効化。
  - `401`: 未認証 → ログインプロンプト。
  - `403`: 購入者ロールでない → `/unauthorized`へリダイレクト。

### 5.6.1 レビュー報告（`btnReportReview` onClick）
- **トリガー:** ユーザーがレビューカードで「レビューを報告」をクリック。
- **処理ロジック:**
  1. **クライアント側認可:** 認証状態をチェック。未認証の場合はボタンを無効化し、ツールチップ「報告するにはサインインしてください」を表示。
  2. **バックエンド認可:** `JwtAuthGuard` + `RolesGuard('buyer')`で購入者ロールを検証。
  3. **バックエンド送信:** `{ reason、description? }`で`POST /api/v1/reviews/:reviewId/report`。
  4. **実行後UI:** トースト「報告を送信しました」。ボタン状態を「報告済み」に更新（無効）。
- **例外処理:**
  - `401`: 未認証 → ログインゲーティング。
  - `403`: 購入者ロールでない → `/unauthorized`へリダイレクト。
  - `409`: 報告済み → トースト「既に報告済みです」、ボタン無効を維持。
  - `429`: レート制限超過 → 再試行カウントダウンを表示。

### 5.7 関連商品のロード
- **トリガー:** 商品詳細ページが「類似商品」セクションをロード。
- **処理ロジック:** `GET /api/v1/recommendations/similar/:productId`;最大8件の商品カードをレンダリング。フォールド下で遅延ロード。
- **例外処理:**
  - `404`: 商品が見つからない → セクション非表示 / 空状態。
  - `NET_ERR`: セクションがスケルトン再試行を表示。

### 5.8 アクティブプロモーションのロード
- **トリガー:** 商品詳細ページが「アクティブプロモーション」セクションをロード。
- **処理ロジック:** `GET /api/v1/products/:slug/promotions`;`is_active = true`、有効期間内、残高 > 0のプロモーションのみレンダリング（ルールBR-PROD-018/019）。
- **例外処理:**
  - `404` / `400`: 商品が見つからない / 無効なスラッグ → セクション非表示。
  - 有効なプロモーションがない → セクション全体を非表示。

### 5.9 商品タブ（`tabsProduct` onChange）
- **トリガー:** ユーザーが説明 / 成分 / レビュータブを切り替え。
- **処理ロジック:** 対応するコンテンツパネルを表示。レビュータブは`review_count`バッジ付きでレビュー一覧を遅延ロード。キーボード操作可能（矢印キー）。
- **例外処理:** 該当なし。

### 5.10 ナビゲーションリンク（`lnkShop`、関連商品カード、ログインプロンプト）
- **トリガー:** ユーザーがリンクをクリック。
- **処理ロジック:** React Routerで遷移:
  - ショップリンク → `/shops/:shopSlug`
  - 関連商品カード → `/products/:slug`
  - ログインプロンプト → `/login`
- **例外処理:** 該当なし。

### 5.11 サイドバー広告のロード＆ローテーション（`lstSidebarAds`）
- **トリガー:** 商品詳細ページが「サイドバー広告」セクションをロード。
- **処理ロジック:**
  1. `GET /api/v1/products/:slug/advertisements`で適格な広告のみ返却（`approval_status = 'approved'`、`payment_status = 'completed'`、`is_active = true`、有効期間内、`product_sidebar`配置 — ルールBR-PROD-020/021）。
  2. ローテーションあたり最大5件の広告をレンダリング。Premium > Standard > Basicの順、層内はラウンドロビンで並び替え（ルールBR-PROD-022）。
  3. 5秒ごとに自動ローテーション。ホバーまたはキーボードフォーカスで一時停止。離脱/ブラーで再開。
  4. 各カードに「広告」バッジ+ショップ名を表示。クリックで`rel="noopener noreferrer nofollow sponsored"`付きの新しいタブで`link_url`へ移動（ルールBR-PROD-023）。ショップ名は`/shops/:shopSlug`へ移動。
  5. APIが空配列を返した場合はセクション全体を非表示。
- **例外処理:**
  - `404` / `400`: 商品が見つからない / 無効なスラッグ → セクション非表示。
  - 空の結果 → セクション全体を非表示。
  - `NET_ERR`: セクションがスケルトン再試行を表示。

---

## 6. バリデーションおよびエラーメッセージマッピング（バリデーション及びエラーメッセージマッピング）

### 6.1 パスパラメータのバリデーションエラー

| エラーコード | 対象フィールド | 条件 / 評価ロジック | UI/UX表示形式 | デフォルトエラーメッセージ（EN） | デフォルトエラーメッセージ（JA） |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-PROD-001** | `slug` | 欠落、非文字列、または無効なURLスラッグ形式（最大255文字） | エラーページ / バナー | "slug must be a valid URL slug" | 「スラッグは有効なURLスラッグである必要があります」 |
| **VAL-PROD-002** | `productId` | 無効なUUID形式 | エラーページ / バナー | "productId must be a valid UUID" | 「productId は有効なUUIDである必要があります」 |

### 6.2 レビューフォームのバリデーションエラー

| エラーコード | 対象フィールド | 条件 / 評価ロジック | UI/UX表示形式 | デフォルトエラーメッセージ（EN） | デフォルトエラーメッセージ（JA） |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-PROD-010** | `rdoRating` | レーティング未選択（必須） | 赤い境界線。フィールド下にテキスト | "Rating is required" | 「評価は必須です」 |
| **VAL-PROD-011** | `rdoRating` | レーティングが範囲1–5外 | 赤い境界線。フィールド下にテキスト | "rating must be between 1 and 5" | 「評価は1〜5の整数である必要があります」 |
| **VAL-PROD-012** | `txtReviewTitle` | タイトルが255文字超過 | 赤い境界線。フィールド下にテキスト | "title must be at most 255 characters" | 「タイトルは255文字以内です」 |
| **VAL-PROD-013** | `txaReviewBody` | 本文が5000文字超過 | 赤い境界線。フィールド下にテキスト | "body must be at most 5000 characters" | 「本文は5000文字以内です」 |
| **VAL-PROD-014** | `uplReviewImages` | 5枚を超える画像 | アップロードゾーン上のインラインエラー | "images must contain at most 5 items" | 「画像は最大5枚までです」 |

#### 6.2.1 レビュー報告のバリデーションエラー

| エラーコード | 対象フィールド | 条件 / 評価ロジック | UI/UX表示形式 | デフォルトエラーメッセージ（EN） | デフォルトエラーメッセージ（JA） |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-PROD-040** | `rdoReportReason` | 理由未選択（必須） | 赤い境界線。フィールド下にテキスト | "Reason is required" | 「報告理由は必須です」 |
| **VAL-PROD-041** | `txaReportDescription` | 説明が1000文字超過 | 赤い境界線。フィールド下にテキスト | "description must be at most 1000 characters" | 「詳細は1000文字以内です」 |
| **VAL-PROD-042** | `btnReportReview` | 重複報告（購入者ごと・レビューごとに1回） | トースト「既に報告済みです」 | "You have already reported this review" | 「このレビューは既に報告済みです」 |

### 6.3 カートに追加のバリデーションエラー

> ⚠️ **カートチーム所有** — 参照のみ。バリデーションとエラー処理はカートチームが管理します。

| エラーコード | 対象フィールド | 条件 / 評価ロジック | UI/UX表示形式 | デフォルトエラーメッセージ（EN） | デフォルトエラーメッセージ（JA） |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-PROD-020** | `stepperQuantity` | 数量 < 1 | `-`ボタン無効 + インラインテキスト | "quantity must be at least 1" | 「数量は1以上である必要があります」 |
| **VAL-PROD-021** | `stepperQuantity` | 数量 > `stock_quantity` | `+`ボタン無効 + インラインテキスト | "Quantity exceeds available stock" | 「数量が在庫を超えています」 |

### 6.4 ページネーションのバリデーションエラー

| エラーコード | 対象フィールド | 条件 / 評価ロジック | UI/UX表示形式 | デフォルトエラーメッセージ（EN） | デフォルトエラーメッセージ（JA） |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-PROD-030** | `page` | ページ数 < 1 | バナー | "page must not be less than 1" | 「ページ番号は1以上である必要があります」 |
| **VAL-PROD-031** | `limit` | 件数が1–50範囲外 | バナー | "limit must not be greater than 50" | 「件数は1〜50の範囲です」 |

### 6.5 APIエラーマッピング — 商品詳細＆レビュー

| HTTPステータス | エラーコード | シナリオ | UI/UX表示形式 | デフォルトエラーメッセージ（EN） | デフォルトエラーメッセージ（JA） |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `400` | `BAD_REQUEST` | 無効なスラッグ / バリデーション失敗 | フィールドレベルのインラインエラー + 上部バナー | "Invalid request" | 「無効なリクエストです」 |
| `401` | `UNAUTHORIZED` | JWT欠落または無効 | ログインモーダル / `/login`へリダイレクト | "Please sign in" | 「ログインしてください」 |
| `403` | `FORBIDDEN` | 販売者/管理者ロール（購入者でない） | `/unauthorized`へリダイレクト | "You do not have permission" | 「権限がありません」 |
| `404` | `NOT_FOUND` | 商品が見つからない、または非アクティブ | 空状態 + 「商品一覧に戻る」リンク | "Product not found" | 「商品が見つかりません」 |
| `409` | `CONFLICT` | 重複レビュー（一意な`user_id + product_id`） | レビューフォームを無効化 | "You have already reviewed this product" | 「この商品はすでにレビュー済みです」 |
| `409` | `CONFLICT` | 重複報告（一意な`user_id + review_id`） | トースト「既に報告済みです」 | "You have already reported this review" | 「このレビューは既に報告済みです」 |
| `422` | `UNPROCESSABLE_ENTITY` | 検証済み購入でない（ルール4.4.1） | 説明テキストを表示 | "Only verified purchasers can review" | 「購入者のみレビューできます」 |
| `429` | `TOO_MANY_REQUESTS` | レート制限超過 | 再試行カウントダウンを表示 | "Too many requests. Please wait {seconds} seconds" | 「リクエストが多すぎます。{seconds}秒お待ちください」 |
| `500` | `INTERNAL_SERVER_ERROR` | サーバーエラー | 「問題が発生しました」+ 再試行ボタン | "Something went wrong. Please try again" | 「問題が発生しました。もう一度お試しください」 |
| `NET_ERR` | — | ネットワークエラー | バナー + 再試行ボタン | "Network error. Please check your connection" | 「ネットワークエラー。接続を確認してください」 |

> ⚠️ **カート＆お気に入りチーム所有** — 参照のみ。エラー処理契約は各チームが管理します。

### 6.6 APIエラーマッピング — お気に入り＆カート

| HTTPステータス | エラーコード | シナリオ | UI/UX表示形式 | デフォルトエラーメッセージ（EN） | デフォルトエラーメッセージ（JA） |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `400` | `BAD_REQUEST` | 在庫不足（`stock_quantity < requested`） | インラインエラー、CTA無効 | "Insufficient stock" | 「在庫が不足しています」 |
| `401` | `UNAUTHORIZED` | 未認証 | ログインモーダル / `/login`へリダイレクト | "Please sign in" | 「ログインしてください」 |
| `404` | `NOT_FOUND` | 商品が見つからない | 空状態 | "Product not found" | 「商品が見つかりません」 |
| `409` | `CONFLICT` | お気に入りに追加済み | トースト「既にお気に入りに追加済み」、♥の塗りつぶしを維持 | "Already in wishlist" | 「ウィッシュリストに追加済みです」 |
| `422` | `UNPROCESSABLE_ENTITY` | 商品の在庫切れ（`stock_quantity = 0`、ルール4.2.2） | カートに追加を無効化 + 「在庫切れ」バッジ | "Out of stock" | 「在庫切れです」 |

---

## 7. データベースフィールドマッピング（データベースフィールドマッピング）

### 7.1 商品詳細 → データベース

| UI要素 / フィールド | APIフィールド | データベースカラム | テーブル | データ型 |
| :--- | :--- | :--- | :--- | :--- |
| `imgMainImage` / `lstThumbnails` | `images` | `images` | `products` | TEXT[]（String[]、最初がカバー） |
| `lblProductName` | `name` | `name` | `products` | VARCHAR(255) |
| `lblPrice` | `price` | `price` | `products` | DECIMAL(10,2) |
| `lblCompareAtPrice` | `compareAtPrice` | `compare_at_price` | `products` | DECIMAL(10,2)（nullable） |
| `badgeStockStatus` | `stockQuantity` | `stock_quantity` | `products` | INT |
| `badgeStockStatus` | `lowStockThreshold` | `low_stock_threshold` | `products` | INT |
| `lblSKU` | `sku` | `sku` | `products` | VARCHAR(100)（nullable） |
| `grpSkinType` | `skinTypes` | `skin_types` | `products` | TEXT[]（String[]） |
| `lstIngredients` | `ingredients` | `ingredients` | `products` | TEXT[]（String[]） |
| `wgtRatingSummary` | `avgRating` | `avg_rating` | `products` | DECIMAL(3,2) |
| `wgtRatingSummary` | `reviewCount` | `review_count` | `products` | INT |
| `lnkShop` | `merchant` / `shop` | `merchant_id` / `user_id` / `name`、`slug`、`logo_url`、`is_approved` | `products` → `merchants` → `shops` | UUID FK連鎖: `products.merchant_id` → `merchants.id`;`merchants.user_id` → `shops.user_id`。ショップは`is_approved = true`である必要がある（ルールMRCH-005、SKM-DEV-001 §2.1）。 |

### 7.2 レビューフォーム → データベース

| フォームフィールド | APIフィールド | データベースカラム | テーブル | データ型 |
| :--- | :--- | :--- | :--- | :--- |
| `rdoRating` | `rating` | `rating` | `reviews` | INTEGER（1–5） |
| `txtReviewTitle` | `title` | `title` | `reviews` | VARCHAR(255)（nullable） |
| `txaReviewBody` | `body` | `body` | `reviews` | TEXT（nullable） |
| `uplReviewImages` | `images` | `images` | `reviews` | TEXT[]（String[]、最大5） |
| — | `isVerifiedPurchase` | `is_verified_purchase` | `reviews` | BOOLEAN |

#### 7.2.1 レビュー報告 → データベース

| フォームフィールド | APIフィールド | データベーステーブル＆カラム | データ型 | 備考 |
| :--- | :--- | :--- | :--- | :--- |
| `rdoReportReason` | `reason` | `review_reports.reason` | VARCHAR(50) | 報告理由: spam、inappropriate、fake、other。CHECK制約: `chk_review_reports_reason`。 |
| `txaReportDescription` | `description` | `review_reports.description` | TEXT（nullable） | 任意の追加詳細。 |
| — | `reviewId` | `review_reports.review_id`（FK） | UUID | `reviews.id`への参照。ON DELETE CASCADE。 |
| — | `userId` | `review_reports.user_id`（FK） | UUID | `JwtAuthGuard`から暗黙的に取得。`users.id`への参照。 |
| — | `status` | `review_reports.status` | VARCHAR(20) | 報告ステータス: pending、reviewed、resolved、rejected。デフォルト: `pending`。 |

**レビュー報告ライフサイクル:**
- **報告の送信:** 購入者がレビューカードで`btnReportReview`をクリック → `dlgReportReview`が開く → 理由と任意の説明を選択 → `POST /api/v1/reviews/:reviewId/report`に送信。
- **ステータスフロー:** `pending` → `reviewed` → `resolved`（アクション実施）または`rejected`（アクション不要）。
- **重複処理:** 購入者ごとにレビューあたり1回の報告。`(user_id, review_id)`の一意制約`uq_review_reports_user_review`。
- **管理者アクション:** 管理者は`/admin/reviews/reports`で報告されたレビューを確認し、元のレビューに対してアクションを実行できます。

> ⚠️ **カートチーム所有** — カートのデータモデルはカートチームが管理します。マッピングは参照のみとして提供されます。

### 7.3 カートに追加 → データベース

| フォームフィールド | APIフィールド | データベーステーブル＆カラム | データ型 | 備考 |
| :--- | :--- | :--- | :--- | :--- |
| `stepperQuantity` | `quantity` | `cart_items.quantity` | INT（≥ 1） | リクエストボディの値。最小1、最大`stock_quantity`で検証。カートごとの`product_id`と一意制約（ルールB-CART-009）。 |
| — | `productId` | `cart_items.product_id`（FK） | UUID | `products.id`への参照。ON DELETE CASCADE。 |
| — | `cartId` | `cart_items.cart_id`（FK） | UUID | `carts.id`への参照。ON DELETE CASCADE。`carts`テーブルから自動取得（認証済み購入者あたり1つ）。 |
| — | `userId` | `carts.user_id`（FK） | UUID | `JwtAuthGuard`から暗黙的に取得。`users.id`への参照。一意制約`uq_carts_user_id`により購入者あたり1つのアクティブなカートを保証（ルールB-CART-001、B-CART-006）。 |

**カートライフサイクル（ルールB-CART-008~014）:**
- **空のカート:** 購入者が認証されると、存在しない場合に`carts`レコードを自動作成。
- **項目の追加:** `cart_items`を挿入または更新（同じ商品 → 数量を加算、ルールB-CART-009）。
- **数量の更新:** PATCH `/api/v1/cart/items/:cartItemId`で`cart_items.quantity`を更新。在庫を再検証。
- **項目の削除:** DELETE `/api/v1/cart/items/:cartItemId`で`cart_items`から行を削除。
- **チェックアウト:** POST `/api/v1/checkout`で`orders` + `order_items`を作成（`cart_items`からコピー）。その後`cart_items`をTRUNCATEまたはDELETEして`carts`をリセット（ルールB-CART-014）。
- **永続化:** カートは認証済み購入者のセッションをまたいで永続化されます（ルールB-CART-006、`carts` + `cart_items`テーブルに保存）。

### 7.4 アクティブプロモーション → データベース

| UI要素 / フィールド | APIフィールド | データベースカラム | テーブル | データ型 |
| :--- | :--- | :--- | :--- | :--- |
| `lblPromoCode` | `code` | `code` | `promotions` | VARCHAR(50) UNIQUE |
| `lblPromoDiscount` | `discountType` | `discount_type` | `promotions` | VARCHAR(20)（CHECK: `chk_promotions_discount_type` — 'percentage'/'fixed'。FK → `discount_types.type_code`ルックアップテーブル、DB_SPEC v2.4） |
| `lblPromoDiscount` | `discountValue` | `discount_value` | `promotions` | DECIMAL(10,2) |
| `lblPromoMinOrder` | `minOrderAmount` | `min_order_amount` | `promotions` | DECIMAL(10,2)（nullable） |
| `lblPromoBalance` | `usedCount` | `used_count` | `promotions` | INT |
| `lblPromoBalance` | `maxUses` | `max_uses` | `promotions` | INT（nullable = 無制限） |
| `lblPromoValidity` | `startsAt` | `starts_at` | `promotions` | TIMESTAMPTZ |
| `lblPromoValidity` | `expiresAt` | `expires_at` | `promotions` | TIMESTAMPTZ |

### 7.5 サイドバー広告 → データベース

| UI要素 / フィールド | APIフィールド | データベースカラム | テーブル | データ型 |
| :--- | :--- | :--- | :--- | :--- |
| `lstSidebarAds` | `data[]` | —（フィルター済み行） | `advertisements` | `approval_status = 'approved'`、`payment_status = 'completed'`、`is_active = true`、かつ`now()`が`starts_at` / `expires_at`内（`chk_advertisements_dates`）の行 |
| `imgAdCreative` | `imageUrl` | `image_url` | `advertisements` | TEXT（nullable） |
| `lblAdTitle` | `title` | `title` | `advertisements` | VARCHAR(255) |
| `lblAdAnnouncement` | `announcementMessage` | `announcement_message` | `advertisements` | VARCHAR(500) |
| `lnkAdTarget` | `linkUrl` | `link_url` | `advertisements` | TEXT（nullable） |
| `lblAdShop` | `shop.name` / `shop.slug` / `shop.logoUrl` | `name` / `slug` / `logo_url` | `advertisements.shop_id`（FK: `fk_advertisements_shop`）経由の`shops` | VARCHAR(255) / VARCHAR(255) / TEXT |

**表示フィルター（ルールBR-PROD-020/021）:**
- `approval_status = 'approved'`（`chk_advertisements_approval_status`）
- `payment_status = 'completed'`（`chk_advertisements_payment_status`）
- `is_active = true`
- `starts_at <= now() AND expires_at > now()`
- 配置 = `product_sidebar`（`ad_fee_settings.placement`。デフォルトは1日あたり$2.00/$3.50/$6.00、15日間、最大3件の広告）

> ⚠️ **オープン項目（SKM-DEV-001 §13）** — `advertisements`テーブルには`placement`または`tier`列が保存されていません。配置フィルタリングとPremium > Standard > Basicの優先順位付けは、購入/パッケージのリンク（`ad_payments` → `ad_fee_settings`）に依存します。`placement`/`tier`列を`advertisements`に追加すべきかどうか、DBチームに確認してください。内部フィールド（`payment_amount`、`payment_reference`、`approved_by`、`rejection_reason`、`week_number`）は購入者に公開されることはありません。

---

## 8. APIレスポンスマッピング（APIレスポンスマッピング）

### 8.1 商品詳細の成功レスポンス

```json
{
  "data": {
    "id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
    "name": "Hydrating Facial Serum",
    "slug": "hydrating-facial-serum",
    "description": "Lightweight daily serum with hyaluronic acid...",
    "shortDescription": "24-hour hydration for dry skin",
    "price": "25.00",
    "compareAtPrice": "32.00",
    "sku": "SKU-0001",
    "stockQuantity": 45,
    "lowStockThreshold": 10,
    "images": [
      "https://cdn.example.com/products/a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d/1-full.webp",
      "https://cdn.example.com/products/a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d/2-full.webp"
    ],
    "tags": ["serum", "hydrating"],
    "skinTypes": ["dry", "sensitive"],
    "ingredients": ["Hyaluronic Acid", "Vitamin E", "Glycerin"],
    "isActive": true,
    "isFeatured": true,
    "avgRating": "4.50",
    "reviewCount": 32,
    "category": {
      "id": "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e",
      "name": "Serums",
      "slug": "serums",
      "parent": { "name": "Skincare", "slug": "skincare" }
    },
    "merchant": {
      "id": "c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f",
      "shopName": "Glow Lab",
      "licenseStatus": "approved",
      "shop": {
        "name": "Glow Lab Official Store",
        "slug": "glow-lab-official-store",
        "logoUrl": "https://cdn.example.com/shops/glow-logo.webp",
        "isApproved": true
      }
    }
  }
}
```

### 8.2 レビュー一覧の成功レスポンス

```json
{
  "data": [
    {
      "id": "d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a",
      "rating": 5,
      "title": "Amazing for dry skin",
      "body": "My skin feels hydrated all day.",
      "images": [],
      "isVerifiedPurchase": true,
      "createdAt": "2026-08-01T10:00:00.000Z",
      "user": {
        "id": "e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b",
        "name": "Jane Doe",
        "avatarUrl": null
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 32,
    "totalPages": 4
  }
}
```

### 8.3 レビュー作成の成功レスポンス

```json
{
  "data": {
    "id": "d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a",
    "rating": 5,
    "title": "Amazing for dry skin",
    "body": "My skin feels hydrated all day.",
    "images": [],
    "isVerifiedPurchase": true,
    "isApproved": true,
    "createdAt": "2026-08-05T12:00:00.000Z"
  }
}
```

### 8.4 類似商品の成功レスポンス

```json
{
  "data": [
    {
      "id": "f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c",
      "name": "Vitamin C Brightening Serum",
      "slug": "vitamin-c-brightening-serum",
      "price": "28.00",
      "compareAtPrice": null,
      "images": ["https://cdn.example.com/products/f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c/1-thumb.webp"],
      "avgRating": "4.30",
      "reviewCount": 18,
      "stockQuantity": 20
    }
  ]
}
```

### 8.5 アクティブプロモーションの成功レスポンス

```json
{
  "data": [
    {
      "id": "a7b8c9d0-e1f2-4a3b-5c6d-7e8f9a0b1c2d",
      "code": "GLOW10",
      "description": "10% off from Glow Lab",
      "discountType": "percentage",
      "discountValue": "10.00",
      "minOrderAmount": "20.00",
      "usedCount": 35,
      "maxUses": 100,
      "balance": 65,
      "startsAt": "2026-08-01T00:00:00.000Z",
      "expiresAt": "2026-09-30T23:59:59.000Z"
    }
  ]
}
```

### 8.6 エラーレスポンス（404の例）

```json
{
  "statusCode": 404,
  "message": ["Product not found"],
  "error": "Not Found",
  "timestamp": "2026-08-05T12:00:00.000Z",
  "path": "/api/v1/products/hydrating-facial-serum"
}
```

### 8.7 レビュー報告の成功レスポンス（201）

```json
{
  "data": {
    "id": "b8c9d0e1-f2a3-4b5c-6d7e-8f9a0b1c2d3e",
    "reviewId": "d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a",
    "userId": "e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b",
    "reason": "spam",
    "description": "This review contains promotional content",
    "status": "pending",
    "createdAt": "2026-08-05T12:00:00.000Z"
  }
}
```

### 8.8 サイドバー広告の成功レスポンス

```json
{
  "data": [
    {
      "id": "c9d0e1f2-a3b4-5c6d-8e9f-0a1b2c3d4e5f",
      "title": "Autumn Glow Sale",
      "announcementMessage": "20% off all serums this week",
      "imageUrl": "https://cdn.example.com/ads/autumn-glow.webp",
      "linkUrl": "https://example.com/campaign/autumn-glow",
      "startsAt": "2026-08-15T00:00:00.000Z",
      "expiresAt": "2026-08-30T23:59:59.000Z",
      "shop": {
        "name": "Glow Lab Official Store",
        "slug": "glow-lab-official-store",
        "logoUrl": "https://cdn.example.com/shops/glow-logo.webp"
      }
    }
  ]
}
```

> 適格な広告がない場合は空配列を返します。セクションは完全に非表示になります。

---

## 9. i18nキーリファレンス（i18nキーリファレンス）

### 9.1 英語（en） — 商品情報

| キー | 値 |
| :--- | :--- |
| `product.rating` | "★ {rating} ({count} reviews)" |
| `product.stock.inStock` | "In stock ({quantity})" |
| `product.stock.lowStock` | "Only {quantity} left" |
| `product.stock.outOfStock` | "Out of stock" |
| `product.sku` | "SKU: {sku}" |
| `product.skinType` | "Skin Type" |
| `product.skinType.dry` | "Dry" |
| `product.skinType.oily` | "Oily" |
| `product.skinType.combination` | "Combination" |
| `product.skinType.sensitive` | "Sensitive" |
| `product.skinType.normal` | "Normal" |
| `product.soldBy` | "Sold by {merchant}" |
| `product.visitShop` | "Visit Shop →" |

### 9.2 英語（en） — タブ＆関連

| キー | 値 |
| :--- | :--- |
| `product.tabs.description` | "Description" |
| `product.tabs.ingredients` | "Ingredients" |
| `product.tabs.reviews` | "Reviews ({count})" |
| `product.related` | "Similar Products" |

### 9.3 英語（en） — カート＆お気に入り

| キー | 値 |
| :--- | :--- |
| `product.addToCart` | "Add to Cart" |
| `product.addToCart.adding` | "Adding..." |
| `product.addToCart.added` | "Added to cart" |
| `product.addToCart.outOfStock` | "Out of stock" |
| `product.wishlist.add` | "Add to wishlist" |
| `product.wishlist.added` | "Added to wishlist" |
| `product.wishlist.already` | "Already in wishlist" |

### 9.4 英語（en） — プロモーション

| キー | 値 |
| :--- | :--- |
| `product.promotions` | "Active Promotions" |
| `product.promotions.code` | "Code: {code}" |
| `product.promotions.discountPercentage` | "{value}% off" |
| `product.promotions.discountFixed` | "¥{value} off" |
| `product.promotions.minOrder` | "Min. order {amount}" |
| `product.promotions.validity` | "Valid {start} ~ {end}" |
| `product.promotions.balance` | "{balance} left" |
| `product.promotions.balanceUnlimited` | "Unlimited" |
| `product.promotions.copyCode` | "Copy code" |
| `product.promotions.codeCopied` | "Code copied" |

### 9.5 英語（en） — レビュー

| キー | 値 |
| :--- | :--- |
| `product.review.title` | "Write a Review" |
| `product.review.rating` | "Rating" |
| `product.review.titlePlaceholder` | "Title" |
| `product.review.bodyPlaceholder` | "Share your experience..." |
| `product.review.submit` | "Submit Review" |
| `product.review.submitting` | "Submitting..." |
| `product.review.success` | "Review submitted successfully" |
| `product.review.verifiedPurchase` | "Verified Purchase" |
| `product.review.loginPrompt` | "Sign in to write a review" |
| `product.review.empty` | "No reviews yet" |
| `product.review.notVerified` | "Only verified purchasers can review" |
| `product.review.report` | "Report Review" |
| `product.review.report.title` | "Report This Review" |
| `product.review.report.reason` | "Reason for reporting" |
| `product.review.report.reason.spam` | "Spam" |
| `product.review.report.reason.inappropriate` | "Inappropriate content" |
| `product.review.report.reason.fake` | "Fake review" |
| `product.review.report.reason.other` | "Other" |
| `product.review.report.description` | "Additional details (optional)" |
| `product.review.report.submit` | "Submit Report" |
| `product.review.report.submitting` | "Submitting..." |
| `product.review.report.success` | "Report submitted successfully" |
| `product.review.report.alreadyReported` | "You have already reported this review" |

### 9.6 英語（en） — エラー

| キー | 値 |
| :--- | :--- |
| `product.error.notFound` | "Product not found" |
| `product.error.backToProducts` | "Back to products" |

### 9.7 日本語（ja） — 商品情報

| キー | 値 |
| :--- | :--- |
| `product.rating` | "★ {rating}（{count}件のレビュー）" |
| `product.stock.inStock` | "在庫あり（{quantity}）" |
| `product.stock.lowStock` | "残りわずか（{quantity}）" |
| `product.stock.outOfStock` | "在庫切れ" |
| `product.sku` | "SKU: {sku}" |
| `product.skinType` | "肌タイプ" |
| `product.skinType.dry` | "乾燥肌" |
| `product.skinType.oily` | "脂性肌" |
| `product.skinType.combination` | "混合肌" |
| `product.skinType.sensitive` | "敏感肌" |
| `product.skinType.normal` | "普通肌" |
| `product.soldBy` | "出品者: {merchant}" |
| `product.visitShop` | "ショップへ →" |

### 9.8 日本語（ja） — タブ＆関連

| キー | 値 |
| :--- | :--- |
| `product.tabs.description` | "説明" |
| `product.tabs.ingredients` | "成分" |
| `product.tabs.reviews` | "レビュー（{count}）" |
| `product.related` | "似ている商品" |

### 9.9 日本語（ja） — カート＆お気に入り

| キー | 値 |
| :--- | :--- |
| `product.addToCart` | "カートに追加" |
| `product.addToCart.adding` | "追加中..." |
| `product.addToCart.added` | "カートに追加しました" |
| `product.addToCart.outOfStock` | "在庫切れ" |
| `product.wishlist.add` | "ウィッシュリストに追加" |
| `product.wishlist.added` | "ウィッシュリストに追加しました" |
| `product.wishlist.already` | "ウィッシュリストに追加済みです" |

### 9.10 日本語（ja） — プロモーション

| キー | 値 |
| :--- | :--- |
| `product.promotions` | "キャンペーン" |
| `product.promotions.code` | "コード: {code}" |
| `product.promotions.discountPercentage` | "{value}%オフ" |
| `product.promotions.discountFixed` | "¥{value}オフ" |
| `product.promotions.minOrder` | "最小注文 {amount}" |
| `product.promotions.validity` | "期間 {start} ~ {end}" |
| `product.promotions.balance` | "残り{balance}回" |
| `product.promotions.balanceUnlimited` | "無制限" |
| `product.promotions.copyCode` | "コードをコピー" |
| `product.promotions.codeCopied` | "コードをコピーしました" |

### 9.11 日本語（ja） — レビュー

| キー | 値 |
| :--- | :--- |
| `product.review.title` | "レビューを書く" |
| `product.review.rating` | "評価" |
| `product.review.titlePlaceholder` | "タイトル" |
| `product.review.bodyPlaceholder` | "感想を共有してください..." |
| `product.review.submit` | "レビューを投稿" |
| `product.review.submitting` | "投稿中..." |
| `product.review.success` | "レビューを投稿しました" |
| `product.review.verifiedPurchase` | "購入者" |
| `product.review.loginPrompt` | "レビューを書くにはログインしてください" |
| `product.review.empty` | "レビューはまだありません" |
| `product.review.notVerified` | "購入者のみレビューできます" |
| `product.review.report` | "レビューを報告" |
| `product.review.report.title` | "このレビューを報告" |
| `product.review.report.reason` | "報告理由" |
| `product.review.report.reason.spam` | "スパム" |
| `product.review.report.reason.inappropriate` | "不適切なコンテンツ" |
| `product.review.report.reason.fake` | "偽のレビュー" |
| `product.review.report.reason.other` | "その他" |
| `product.review.report.description` | "追加の詳細（任意）" |
| `product.review.report.submit` | "報告を送信" |
| `product.review.report.submitting` | "送信中..." |
| `product.review.report.success` | "報告を送信しました" |
| `product.review.report.alreadyReported` | "このレビューは既に報告済みです" |

### 9.12 日本語（ja） — エラー

| キー | 値 |
| :--- | :--- |
| `product.error.notFound` | "商品が見つかりません" |
| `product.error.backToProducts` | "商品一覧に戻る" |

### 9.13 ミャンマー語（my） — 商品情報

| キー | 値 |
| :--- | :--- |
| `product.rating` | "★ {rating} (သုံးသပ်ချက် {count} ခု)" |
| `product.stock.inStock` | "ပစ္စည်းရှိ ({quantity})" |
| `product.stock.lowStock` | "{quantity} ခုသာ ကျန်ပါသည်" |
| `product.stock.outOfStock` | "ပစ္စည်းကုန်" |
| `product.sku` | "SKU: {sku}" |
| `product.skinType` | "အသားအရေအမျိုးအစား" |
| `product.skinType.dry` | "ခြောက်သွေ့" |
| `product.skinType.oily` | "အဆီပြန်" |
| `product.skinType.combination` | "ပေါင်းစပ်" |
| `product.skinType.sensitive` | "ထိခိုက်လွယ်" |
| `product.skinType.normal` | "သာမန်" |
| `product.soldBy` | "{merchant} မှရောင်းချသည်" |
| `product.visitShop` | "ဆိုင်သို့သွားမည် →" |

### 9.14 ミャンマー語（my） — タブ＆関連

| キー | 値 |
| :--- | :--- |
| `product.tabs.description` | "ဖော်ပြချက်" |
| `product.tabs.ingredients` | "ပါဝင်ပစ္စည်းများ" |
| `product.tabs.reviews` | "သုံးသပ်ချက်များ ({count})" |
| `product.related` | "ဆင်တူပစ္စည်းများ" |

### 9.15 ミャンマー語（my） — カート＆お気に入り

| キー | 値 |
| :--- | :--- |
| `product.addToCart` | "ခြင်းထဲထည့်မည်" |
| `product.addToCart.adding` | "ထည့်နေသည်..." |
| `product.addToCart.added` | "ခြင်းထဲထည့်ပြီးပါပြီ" |
| `product.addToCart.outOfStock` | "ပစ္စည်းကုန်" |
| `product.wishlist.add` | "နှစ်သက်စာရင်းထဲထည့်မည်" |
| `product.wishlist.added` | "နှစ်သက်စာရင်းထဲထည့်ပြီးပါပြီ" |
| `product.wishlist.already` | "နှစ်သက်စာရင်းတွင်ရှိပြီးသားဖြစ်သည်" |

### 9.16 ミャンマー語（my） — プロモーション

| キー | 値 |
| :--- | :--- |
| `product.promotions` | "ပရိုမိုးရှင်းများ" |
| `product.promotions.code` | "ကုဒ်: {code}" |
| `product.promotions.discountPercentage` | "{value}% လျှော့" |
| `product.promotions.discountFixed` | "¥{value} လျှော့" |
| `product.promotions.minOrder` | "အနည်းဆုံး မှာယူမှု {amount}" |
| `product.promotions.validity` | "သက်တမ်း {start} ~ {end}" |
| `product.promotions.balance` | "{balance} ခုကျန်" |
| `product.promotions.balanceUnlimited` | "အကန့်အသတ်မရှိ" |
| `product.promotions.copyCode` | "ကုဒ်ကူးယူမည်" |
| `product.promotions.codeCopied` | "ကုဒ်ကူးယူပြီးပါပြီ" |

### 9.17 ミャンマー語（my） — レビュー

| キー | 値 |
| :--- | :--- |
| `product.review.title` | "သုံးသပ်ချက်ရေးသားမည်" |
| `product.review.rating` | "အဆင့်သတ်မှတ်ချက်" |
| `product.review.titlePlaceholder` | "ခေါင်းစဉ်" |
| `product.review.bodyPlaceholder` | "သင့်အတွေ့အကြုံကို မျှဝေပါ..." |
| `product.review.submit` | "သုံးသပ်ချက်တင်မည်" |
| `product.review.submitting` | "တင်နေသည်..." |
| `product.review.success` | "သုံးသပ်ချက်တင်ပြီးပါပြီ" |
| `product.review.verifiedPurchase` | "အတည်ပြုဝယ်ယူမှု" |
| `product.review.loginPrompt` | "သုံးသပ်ချက်ရေးရန် အကောင့်ဝင်ပါ" |
| `product.review.empty` | "သုံးသပ်ချက်မရှိသေးပါ" |
| `product.review.notVerified` | "အတည်ပြုဝယ်ယူသူများသာ သုံးသပ်ချက်ရေးနိုင်သည်" |
| `product.review.report` | "သုံးသပ်ချက် အစီရင်ခံမည်" |
| `product.review.report.title` | "ဤသုံးသပ်ချက်ကို အစီရင်ခံမည်" |
| `product.review.report.reason` | "အစီရင်ခံခြင်း အကြောင်းအရာ" |
| `product.review.report.reason.spam` | " spam" |
| `product.review.report.reason.inappropriate` | "မသင့်လျော်သော အကြောင်းအရာ" |
| `product.review.report.reason.fake` | "အတုအယောင် သုံးသပ်ချက်" |
| `product.review.report.reason.other` | "အခြား" |
| `product.review.report.description` | "ထပ်ဆင့်အသေးစိတ် (အခမဲ့)" |
| `product.review.report.submit` | "အစီရင်ခံစာ တင်မည်" |
| `product.review.report.submitting` | "တင်နေသည်..." |
| `product.review.report.success` | "အစီရင်ခံစာ တင်ပြီးပါပြီ" |
| `product.review.report.alreadyReported` | "ဤသုံးသပ်ချက်ကို အစီရင်ခံပြီးသားဖြစ်သည်" |

### 9.18 ミャンマー語（my） — エラー

| キー | 値 |
| :--- | :--- |
| `product.error.notFound` | "ပစ္စည်းမတွေ့ပါ" |
| `product.error.backToProducts` | "ပစ္စည်းများသို့ပြန်သွားမည်" |

### 9.19 英語（en） — 広告

| キー | 値 |
| :--- | :--- |
| `product.ads.sponsored` | "Sponsored" |
| `product.ads.sponsoredBy` | "Sponsored · {shop}" |

### 9.20 日本語（ja） — 広告

| キー | 値 |
| :--- | :--- |
| `product.ads.sponsored` | "広告" |
| `product.ads.sponsoredBy` | "広告 · {shop}" |

### 9.21 ミャンマー語（my） — 広告

| キー | 値 |
| :--- | :--- |
| `product.ads.sponsored` | "ကြေးငှားကြော်ငြာ" |
| `product.ads.sponsoredBy` | "ကြေးငှားကြော်ငြာ · {shop}" |

---

## 10. 共有コンポーネント（共有コンポーネント）

### 10.1 ProductGalleryコンポーネント

| 項目 | 値 |
| :--- | :--- |
| **場所** | `frontend/src/features/products/components/ProductGallery.tsx` |
| **目的** | メイン画像 + 交換動作付きサムネイルリスト |

### 10.2 ProductInfoコンポーネント

| 項目 | 値 |
| :--- | :--- |
| **場所** | `frontend/src/features/products/components/ProductInfo.tsx` |
| **目的** | 商品名、レーティング、価格、比較価格、在庫、SKU |

### 10.3 ProductTabsコンポーネント

| 項目 | 値 |
| :--- | :--- |
| **場所** | `frontend/src/features/products/components/ProductTabs.tsx` |
| **目的** | 説明 / 成分 / レビュータブ |

### 10.4 SkinTypeCompatibilityコンポーネント

| 項目 | 値 |
| :--- | :--- |
| **場所** | `frontend/src/features/products/components/SkinTypeCompatibility.tsx` |
| **目的** | 肌タイプバッジグループ |

### 10.5 RelatedProductsコンポーネント

| 項目 | 値 |
| :--- | :--- |
| **場所** | `frontend/src/features/products/components/RelatedProducts.tsx` |
| **目的** | 「類似商品」カードグリッド。遅延ロード |

### 10.6 ProductReviewsコンポーネント

| 項目 | 値 |
| :--- | :--- |
| **場所** | `frontend/src/features/products/components/ProductReviews.tsx` |
| **目的** | レビュー一覧、ページネーション、レビューフォーム |

### 10.7 ReviewReportDialogコンポーネント

| 項目 | 値 |
| :--- | :--- |
| **場所** | `frontend/src/features/products/components/ReviewReportDialog.tsx` |
| **目的** | 理由セレクタと任意の説明付きレビュー報告ダイアログ |

### 10.8 ActivePromotionコンポーネント

| 項目 | 値 |
| :--- | :--- |
| **場所** | `frontend/src/features/products/components/ActivePromotion.tsx` |
| **目的** | 割引と残数表示付きアクティブプロモーションカード |

### 10.9 Alert / Toastコンポーネント

| 項目 | 値 |
| :--- | :--- |
| **場所** | `frontend/src/components/ui/alert.tsx`、`frontend/src/components/ui/toast.tsx` |
| **バリアント** | `default`、`destructive`、`success` |
| **用途** | エラー/成功バナーおよびトースト通知 |

### 10.10 SidebarAdvertisementsコンポーネント

| 項目 | 値 |
| :--- | :--- |
| **場所** | `frontend/src/features/products/components/SidebarAdvertisements.tsx` |
| **目的** | `product_sidebar`配置向けサイドバー広告スライダー/カルーセル。ローテーションあたり最大5件、5秒ごとに自動ローテーション、ホバー/フォーカスで一時停止、「広告」ラベル+ショップリンク、安全な外部リンク属性（ルールBR-PROD-022 / BR-PROD-023） |

---

## 11. 特記事項・UI仕様（特記事項・UI仕様）

- **デザインシステム:** ラグジュアリー化粧品テーマ — プライマリ`#7C3AED`（紫）、アクセント`#EC4899`（ピンク）、セカンダリ`#F3E8FF`（ラベンダー）。
- **レスポンシブビューポートデザイン:** デスクトップ2カラム（≥ 1024px、左にギャラリー/右に情報）。下部に固定「カートに追加」バー付きスタックモバイルレイアウト。
- **アクセシビリティ:** すべてのコントロールはキーボード操作可能であること。ARIAラベル必須。エラーメッセージは`role="alert"`で通知されること。レーティングウィジェットはアクセス可能なラジオグループセマンティクスを使用。レビュー報告ダイアログはキーボードおよびスクリーンリーダーでアクセス可能であること。
- **パフォーマンス:** 商品/レビュー/類似商品セクションのスケルトンローダー。非同期処理中はボタンにスピナーを表示。フォールド下のすべての画像を遅延ロード。商品詳細APIはRedisキャッシュ（300ms以下を目標）。
- **セキュリティ:** XSS防止のためすべてのユーザー入力をサニタイズ（React自動エスケープ + CSPヘッダー）。レビューは検証済み購入 + 一意制約でゲーティング（ルール4.4.1）。在庫はカート挿入時にアトミックに再検証。
- **デザイントークン:** ステータスバッジは標準のカラーマッピングを使用 — 成功: `bg-green-100 text-green-800`、エラー: `bg-red-100 text-red-800`、警告: `bg-amber-100 text-amber-800`。在庫ステータス: 在庫あり=緑、残りわずか=アンバー、在庫切れ=赤。

---

## 12. テストチェックリスト（テストチェックリスト）

### 12.1 商品詳細表示のテスト

- [ ] 商品が名前、価格、レーティング、在庫、SKUでロードされる
- [ ] メイン画像が`images[0]`を表示（カバー画像ルール）
- [ ] サムネイルクリックでメイン画像が切り替わる
- [ ] 空の画像配列でフォールバックが表示される
- [ ] 比較価格が取り消し線と割引バッジ付きで表示される
- [ ] 比較価格がnullの場合は非表示
- [ ] 在庫ステータスが正しいバッジをレンダリング（在庫あり / 残りわずか / 在庫切れ）
- [ ] 肌タイプバッジが正しくレンダリングされる
- [ ] 出品者セクションが「ショップへ行く →」リンク付きのショップを表示
- [ ] タブが説明 / 成分 / レビュー間で切り替わる
- [ ] 初期ロード中にスケルトンローダーが表示される

### 12.2 カートに追加のテスト

- [ ] 数量ステッパーが境界内で増減する
- [ ] 1で`-`が無効。`stock_quantity`で`+`が無効
- [ ] 在庫切れ時にカートに追加が無効
- [ ] 有効なデータでカートに追加が動作（201）
- [ ] 在庫不足はインラインエラー付きで400を返す
- [ ] 在庫切れはCTA無効付きで422を返す
- [ ] 追加後にカートバッジ数が更新される
- [ ] 未認証のカート追加はログインへリダイレクト
- [ ] 送信中にロード状態が表示される

### 12.3 お気に入りのテスト

- [ ] お気に入りボタンがステータスのロード中にスケルトンを表示
- [ ] ♡のクリックで楽観的更新付きでお気に入りに追加（201）
- [ ] 重複追加は「お気に入りに追加済み」トースト付きで409を返す
- [ ] 失敗時に楽観的状態がロールバックされる
- [ ] 未認証のお気に入りボタンはゲーティングされる

### 12.4 レビューのテスト

- [ ] レーティングのバリデーション（1–5）が適用される
- [ ] タイトルの最大長（255）が適用される
- [ ] 本文の最大長（5000）が適用される
- [ ] 最大5画像が適用される
- [ ] 未認証ユーザーにはレビューフォームが非表示（ログインプロンプト表示）
- [ ] 有効なデータでレビュー送信が動作（201）
- [ ] 重複レビューは409を返しフォームを無効化
- [ ] 検証済み購入でない場合は説明付きで422を返す
- [ ] レビュー一覧が正しくページネーションされる
- [ ] 検証済み購入バッジが正しく表示される
- [ ] レーティングサマリーが更新された集計を反映
- [ ] 送信中にロード状態が表示される

#### 12.4.1 レビュー報告のテスト

- [ ] 各レビューカードにレビュー報告ボタンが表示される（ホバー/タップ）
- [ ] レビュー報告ダイアログが理由セレクタと任意の説明付きで開く
- [ ] 報告理由のバリデーションが適用される（spam、inappropriate、fake、other）
- [ ] 報告の説明の最大長（1000）が適用される
- [ ] 有効なデータで報告送信が動作（201）
- [ ] 重複報告は409を返す（購入者ごと・レビューごとに1回）
- [ ] 未認証の報告はログインリダイレクトをトリガー
- [ ] 報告成功はトースト確認を表示
- [ ] 報告失敗はUI状態をロールバック

### 12.5 関連商品のテスト

- [ ] 関連商品セクションが遅延ロードされる
- [ ] カードが`/products/:slug`へ遷移する
- [ ] セクションが空の結果を適切に処理する

### 12.6 アクティブプロモーションのテスト

- [ ] 販売者に有効なプロモーションがない場合はセクションが非表示
- [ ] アクティブで期間内のプロモーションのみ表示
- [ ] 残数が`max_uses - used_count`で表示
- [ ] `max_uses`がnullの場合は「無制限」が表示
- [ ] 使い切ったプロモーション（残数0）は表示されない
- [ ] クーポンコードのコピーボタンが動作
- [ ] 割引のパーセンテージ/定額の書式が正しい
- [ ] 割引タイプは`discount_types`ルックアップ値（percentage / fixed）のみレンダリング

### 12.7 エラー＆アクセシビリティのテスト

- [ ] 404は「商品一覧に戻る」リンク付きの空状態を表示
- [ ] 403は`/unauthorized`へリダイレクト
- [ ] ネットワークエラーは再試行ボタンを表示
- [ ] キーボードナビゲーションが動作（Tab、Enter、タブ内の矢印）
- [ ] すべてのコントロールにARIAラベルが存在
- [ ] エラーメッセージが`role="alert"`で通知される
- [ ] すべてのi18nキーが正しくレンダリングされる（EN / JA / MY）
- [ ] レビュー本文のXSSペイロードがエスケープされる（スクリプト実行なし）

### 12.8 サイドバー広告のテスト

- [ ] `product_sidebar`配置向けに承認済み、支払済み、アクティブな広告がない場合はセクションが非表示
- [ ] `approval_status = 'approved'`、`payment_status = 'completed'`、`is_active = true`、期間内の広告のみ表示（ルールBR-PROD-020）
- [ ] `product_sidebar`配置の広告のみ表示（ルールBR-PROD-021）
- [ ] ローテーションあたり最大5件（ルールBR-PROD-022）
- [ ] 広告がPremium > Standard > Basicの順、層内はラウンドロビンで並び替え（ルールBR-PROD-022）
- [ ] スライダーが5秒ごとに自動ローテーション。ホバー/フォーカスで一時停止
- [ ] 各広告カードに「広告」ラベルが表示（ルールBR-PROD-023）
- [ ] 外部広告リンクが`rel="noopener noreferrer nofollow sponsored"`付きで新しいタブで開く（ルールBR-PROD-023）
- [ ] `image_url`がnullの場合は広告画像がショップロゴにフォールバック
- [ ] `link_url`がnullの場合は広告カードが非クリック
- [ ] APIが空配列を返した場合はセクション全体が非表示
- [ ] APIエラー（ネットワーク / 404 / 400）でセクションが非表示

---

*画面項目仕様の終わり（商品詳細ページ）*