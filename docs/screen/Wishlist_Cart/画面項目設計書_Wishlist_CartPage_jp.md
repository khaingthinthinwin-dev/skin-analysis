# 画面項目設計書 — お気に入り & カートページ

**ドキュメントID:** SKM-SIS-SCR-WISH-CART-001  
**対象画面:** お気に入り & カートページ  
**サブシステム:** バイヤーモジュール — お気に入り管理 & ショッピングカート  
**機能ID:** FN-WISH-001, FN-CART-001  
**バージョン:** 2.0  
**作成日:** 2026-08-08  
**最終更新日:** 2026-08-14  
**著者:** シニアシステムエンジニア   
**レビュー状態:** 承認済み  
**分類:** 社内 — エンジニアリング部門

## 1. ドキュメント管理

### 1.1 ドキュメント改訂履歴

| バージョン | 日付 | 著者 | 変更内容 |
| :--- | :--- | :--- | :--- |
| 1.0 | 2026-08-08 | シニアシステムエンジニア | 初版リリース。お気に入りおよびカートページの包括的な画面項目設計書。 |
| 1.1 | 2026-08-12 | シニアシステムエンジニア | カート「すべて削除」機能を追加: `btnCartClearAll` 項目、`dlgCartClearConfirm` 確認ダイアログ、`DELETE /api/v1/cart` API仕様、i18nキー、バリデーションエラーコード、テストケース。 |
| 1.2 | 2026-08-12 | シニアシステムエンジニア | リダイレクトURLのリダイレクトを追加: `btnGuestAlertLogin` が `/login?redirect={currentPath}` にナビゲートするように変更。動作仕様に現在パスのキャプチャとログイン後のリダイレクトロジックを追加。ゲストユーザーテストを更新。 |
| 2.0 | 2026-08-14 | シニアシステムエンジニア | REQUIREMENT_SPEC v1.5およびDATABASE_SPEC v2.0に準拠：ID形式をCUIDからUUID形式に更新、DBマッピングデータ型をUUIDに修正、アクセス権限をバイヤーロールのみに制限。 |

### 1.2 関連ドキュメント

| No. | ドキュメントID | ドキュメント名 | ファイルパス | 備考 |
| :-- | :--- | :--- | :--- | :--- |
| 1 | SKM-REQ-001 | 要件定義書 | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | ビジネスワークフロー、必須フィールド、ルール。 |
| 2 | SKM-DBS-001 | データベース設計書 | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | テーブル構造、制約、データ型。 |
| 3 | SKM-DEV-001 | 開発ルール | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` | セキュリティルール、デザイントークン、エラー応答。 |
| 4 | SKM-FDS-WISH-CART-001 | 機能設計書 — お気に入り & カート | `docs/screen/Wishlist_Cart/機能設計書_Wishlist_CartPage.md` | ユースケース、状態遷移、バリデーションルール、エラーハンドリング。 |

---

## 2. 画面概要・目的

### 2.1 目的
お気に入りページでは、認証済みユーザーが将来の参考のために保存した商品を閲覧・管理できます。カートページでは、認証済みユーザーがチェックアウト前に商品を確認・管理でき、数量の調整、商品の削除、チェックアウトへの proceeding が可能です。両ページは、ECサイトの購入ワークフローのコアコンポーネントです。

### 2.2 対象ユーザーと権限

| 属性 | 値 |
| :--- | :--- |
| **主要アクター** | 認証済みバイヤー |
| **認証要件** | JWT Bearer Token |
| **データスコープ** | 自分のお気に入り商品、自分のカート商品 |
| **アクセス制御** | 保護ルート — JwtAuthGuard 適用。バイヤーロール（Buyer）のみに制限（マーチャントおよび管理者は403 Forbiddenでアクセス不可）。 |
| **ゲスト動作** | カートは永続化されない；お気に入りは利用不可。ゲストユーザーが「カートに追加」または「お気に入りに追加」を操作するとアラートモーダルが表示される。 |

### 2.3 主要機能・基本設計方針
1. **お気に入り管理** — 保存されたお気に入りに商品を追加/削除し、詳細付きで保存された商品を閲覧し、カートに商品を移動する。
2. **ショッピングカート管理** — カートに商品を追加し、数量を更新し、商品を削除し、リアルタイムの小計を閲覧する。
3. **在庫検証** — カートに追加する前に商品の在庫を確認し、数量更新時に在庫を検証する。
4. **価格計算** — 単価 × 数量に基づいて商品小計を計算する。割引やクーポンはチェックアウト時に適用され、カートページでは適用されない。
5. **お気に入りからカートへ転送** — 保存されたお気に入り商品をショッピングカートに直接移動する。
6. **カート永続化** — ログイン済みユーザーのカート内容をデータベースストレージを通じてセッション間で維持する。
7. **ゲストユーザー対応** — 認証されていないユーザーがカート/お気に入りの操作を試みた場合、アラートモーダルを表示する。

---

## 3. 画面レイアウト構成

### 3.1 全体画面構成 — お気に入りページ

```text
┌─────────────────────────────────────────────────────────┐
│                    ブラウザビューポート                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│              ┌─────────────────────────────┐            │
│              │   [A] ページヘッダー         │            │
│              │   タイトル + 商品数          │            │
│              └─────────────────────────────┘            │
│                                                         │
│              ┌─────────────────────────────┐            │
│              │   [B] お気に入りグリッド      │            │
│              │                             │            │
│              │   ┌───────┐  ┌───────┐      │            │
│              │   │ カード │  │ カード │     │            │
│              │   │ [C]   │  │ [C]   │      │            │
│              │   └───────┘  └───────┘      │            │
│              │   ┌───────┐  ┌───────┐      │            │
│              │   │ カード │  │ カード │     │            │
│              │   │ [C]   │  │ [C]   │      │            │
│              │   └───────┘  └───────┘      │            │
│              │                             │            │
│              └─────────────────────────────┘            │
│                                                         │
│              ┌─────────────────────────────┐            │
│              │   [D] 空状態 (条件付き)      │            │
│              └─────────────────────────────┘            │
│                                                         │
│              ┌─────────────────────────────┐            │
│              │   [E] フッターコントロール    │            │
│              │   [買い物を続ける]           │            │
│              └─────────────────────────────┘            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 3.2 全体画面構成 — カートページ

```text
┌─────────────────────────────────────────────────────────┐
│                    ブラウザビューポート                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│              ┌─────────────────────────────┐            │
│              │   [F] ページヘッダー         │            │
│              │   タイトル + 商品数          │            │
│              └─────────────────────────────┘            │
│                                                         │
│  ┌──────────────────────────┐  ┌────────────────────┐   │
│  │   [G] カート商品リスト     │  │  [H] サマリーパネル │   │
│  │                          │  │                    │   │
│  │   ┌──────────────────┐   │  │  小計: ¥X,XXX      │   │
│  │   │ [I] カート商品1   │   │  │  商品数: N         │   │
│  │   │ 画像/名前/価格    │   │  │                    │   │
│  │   │ 数量コントロール   │   │  │  ┌──────────────┐  │   │
│  │   │ 小計/削除       　│   │  │  │ [J] チェック  │  │   │
│  │   └──────────────────┘   │  │  │    アウト     │  │   │
│  │   ┌──────────────────┐   │  │  └──────────────┘  │   │
│  │   │ [I] カート商品2   │   │  │                    │   │
│  │   │ ...              │   │  │  [K] 買い物を       │   │
│  │   └──────────────────┘   │  │      続ける         │   │
│  │                          │  └────────────────────┘   │
│  └──────────────────────────┘                           │
│                                                         │
│              ┌─────────────────────────────┐            │
│              │   [L] 空状態 (条件付き)      │            │
│              └─────────────────────────────┘            │
│                                                         │
│              ┌─────────────────────────────┐            │
│              │   [M] ゲストログイン         │            │
│              │    アラートモーダル(条件付き) │            │
│              └─────────────────────────────┘            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 3.3 レスポンシブ対応

| ブレークポイント | 最小幅 | お気に入りレイアウト | カートレイアウト |
| :--- | :--- | :--- | :--- |
| モバイル (デフォルト) | 0px | 1カラムリスト | 商品スタック + 下部サマリー |
| タブレット (`md:`) | 768px | 2カラムグリッド | 商品リスト + 下部サマリー |
| デスクトップ (`lg:`) | 1024px | 4カラムグリッド | 商品リスト + 右サイドバー サマリー |
| ワイド (`xl:`) | 1280px | 4カラムグリッド | 商品リスト + 右サイドバー サマリー |

---

## 4. 画面項目定義

### 4.1 セクション [A]: お気に入りページヘッダー

| No. | 項目ID | 項目名（論理名） | コンポーネントタイプ | データ型 & 最大長 | 必須 | 初期状態 / デフォルト値 | 入力制約 / フォーマット | データソース / DBマッピング | 備考 / ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 1 | `lblWishlistTitle` | ページタイトル | 見出し (`<h1>`) | String | — | 表示中。テキスト: "お気に入り" | — | ハードコードUIテキスト | i18nキー: `wishlist.title`。Tailwind: `text-2xl font-bold`。 |
| 2 | `lblWishlistItemCount` | 商品数 | テキスト (`<p>`) | String | — | 表示中。テキスト: "{count}件の商品が保存されています" | — | お気に入り配列の長さから算出 | i18nキー: `wishlist.itemCount`。複数形対応。 |

### 4.2 セクション [B]: お気に入りグリッド

| No. | 項目ID | 項目名（論理名） | コンポーネントタイプ | データ型 & 最大長 | 必須 | 初期状態 / デフォルト値 | 入力制約 / フォーマット | データソース / DBマッピング | 備考 / ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 3 | `grdWishlist` | お気に入りグリッドコンテナ | グリッドコンテナ (`<div>`) | — | はい | レスポンシブグリッドレイアウト。デスクトップ4列、タブレット2列、モバイル1列。 | CSS Grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4` | — | `crdWishlistItem`インスタンスを含む。 |

### 4.3 セクション [C]: お気に入り商品カード

| No. | 項目ID | 項目名（論理名） | コンポーネントタイプ | データ型 & 最大長 | 必須 | 初期状態 / デフォルト値 | 入力制約 / フォーマット | データソース / DBマッピング | 備考 / ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 4 | `crdWishlistItem` | お気に入り商品カード | カード | — | はい | 各お気に入り商品に対して表示中。 | — | `wishlists` + `products`結合 | Tailwind: `rounded-lg border bg-card shadow-sm`。 |
| 5 | `imgWishlistProduct` | 商品画像 | 画像 (`<img>`) | URL文字列 | はい | 表示中。`products.images[0]`から最初の画像を表示。 | Alt属性: 商品名 | `products.images[0]` | クリック可能、`/products/:slug`にナビゲート。Tailwind: `aspect-square object-cover rounded-t-lg`。 |
| 6 | `lnkWishlistProductName` | 商品名（リンク） | リンク (`<a>`) | String(255) | はい | 表示中。2行で切り詰め表示。 | — | `products.name` | `/products/:slug`にナビゲート。Tailwind: `font-medium line-clamp-2 hover:underline`。 |
| 7 | `lblWishlistProductPrice` | 商品価格 | テキスト | String | はい | 表示中。ロケール通貨形式の現在価格。 | — | `products.price` | i18n対応の通貨フォーマット。 |
| 8 | `lblWishlistComparePrice` | 比較価格 | テキスト（取り消し線） | String | 条件付き | `products.compare_at_price`が設定され、価格より大きい場合のみ表示。 | — | `products.compare_at_price` | Tailwind: `line-through text-muted-foreground`。 |
| 9 | `badgeWishlistStockStatus` | 在庫ステータスバッジ | バッジ | Enum | はい | `products.stock_quantity`に基づいて動的表示。 | "在庫あり" / "残りわずか" / "在庫切れ" | `products.stock_quantity` | 色: success/warning/danger。 |
| 10 | `btnWishlistMoveToCart` | カートに移動ボタン | ボタン (`primary`) | — | はい | 表示中。テキスト: "カートに追加" | — | — | `stock_quantity = 0`の場合無効化。ローディング: スピナー。i18n: `wishlist.moveToCart`。 |
| 11 | `btnWishlistRemove` | 削除ボタン | ボタン (`ghost` / アイコン) | — | はい | 表示中。ゴミ箱/Xアイコン。 | — | — | 楽観UI: クリック時にカードを即座に削除。i18n: `wishlist.remove`。 |
| 12 | `lblWishlistCardHelper` | ヘルパーテキスト（在庫切れ時） | テキスト | String | 条件付き | 商品が在庫切れの場合のみ表示。テキスト: "この商品は現在在庫切れです。" | — | — | i18n: `wishlist.unavailable`。Tailwind: `text-xs text-destructive`。 |

### 4.4 セクション [D]: お気に入り空状態

| No. | 項目ID | 項目名（論理名） | コンポーネントタイプ | データ型 & 最大長 | 必須 | 初期状態 / デフォルト値 | 入力制約 / フォーマット | データソース / DBマッピング | 備考 / ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 13 | `emptyWishlist` | 空状態コンテナ | EmptyState | — | 条件付き | お気に入りに0件の商品がある場合に表示。 | — | — | — |
| 14 | `lblEmptyWishlistTitle` | 空状態タイトル | テキスト (`<h2>`) | String | 条件付き | テキスト: "まだお気に入りに追加された商品がありません" | — | — | i18n: `wishlist.emptyTitle`。Tailwind: `text-lg font-semibold`。 |
| 15 | `lblEmptyWishlistMessage` | 空状態メッセージ | テキスト (`<p>`) | String | 条件付き | テキスト: "商品を閲覧してお気に入りを追加しましょう。" | — | — | i18n: `wishlist.emptyMessage`。Tailwind: `text-muted-foreground`。 |
| 16 | `lnkWishlistContinueShopping` | 買い物を続けるリンク | リンク (`<Link>`) | String | 条件付き | テキスト: "買い物を続ける" | — | — | `/products`にナビゲート。i18n: `wishlist.continueShopping`。 |

### 4.5 セクション [E]: お気に入りフッターコントロール

| No. | 項目ID | 項目名（論理名） | コンポーネントタイプ | データ型 & 最大長 | 必須 | 初期状態 / デフォルト値 | 入力制約 / フォーマット | データソース / DBマッピング | 備考 / ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 17 | `skeletonWishlist` | ローディングスケルトン | スケルトン | — | 条件付き | 初回データ取得中に表示。4つのカードプレースホルダーを表示。 | — | — | Tailwind: `animate-pulse`。 |

### 4.6 セクション [F]: カートページヘッダー

| No. | 項目ID | 項目名（論理名） | コンポーネントタイプ | データ型 & 最大長 | 必須 | 初期状態 / デフォルト値 | 入力制約 / フォーマット | データソース / DBマッピング | 備考 / ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 18 | `lblCartTitle` | ページタイトル | 見出し (`<h1>`) | String | — | 表示中。テキスト: "カート" | — | ハードコードUIテキスト | i18nキー: `cart.title`。Tailwind: `text-2xl font-bold`。 |
| 19 | `lblCartItemCount` | 商品数 | テキスト (`<p>`) | String | — | 表示中。テキスト: "{count}件の商品がカートに入っています" | — | カート商品配列の長さから算出 | i18nキー: `cart.itemCount`。複数形対応。 |

### 4.7 セクション [G]: カート商品リスト

| No. | 項目ID | 項目名（論理名） | コンポーネントタイプ | データ型 & 最大長 | 必須 | 初期状態 / デフォルト値 | 入力制約 / フォーマット | データソース / DBマッピング | 備考 / ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 20 | `lstCartItems` | カート商品コンテナ | コンテナ (`<div>`) | — | はい | 縦方向スタックのリストレイアウト。 | — | — | `rowCartItem`インスタンスを含む。 |

### 4.8 セクション [I]: カート商品行

| No. | 項目ID | 項目名（論理名） | コンポーネントタイプ | データ型 & 最大長 | 必須 | 初期状態 / デフォルト値 | 入力制約 / フォーマット | データソース / DBマッピング | 備考 / ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 21 | `rowCartItem` | カート商品行 | 行 / カード | — | はい | 各カート商品に対して表示中。 | — | `cart_items` + `products`結合 | Tailwind: `flex items-center gap-4 p-4 border-b`。 |
| 22 | `imgCartProduct` | 商品画像 | 画像 (`<img>`) | URL文字列 | はい | 表示中。`products.images[0]`から最初の画像を表示。 | Alt属性: 商品名 | `products.images[0]` | クリック可能、`/products/:slug`にナビゲート。Tailwind: `h-20 w-20 rounded-md object-cover`。 |
| 23 | `lnkCartProductName` | 商品名（リンク） | リンク (`<a>`) | String(255) | はい | 表示中。 | — | `products.name` | `/products/:slug`にナビゲート。Tailwind: `font-medium hover:underline`。 |
| 24 | `lblCartUnitPrice` | 単価 | テキスト | String | はい | 表示中。ロケール通貨形式の単価。 | — | `products.price` | i18n対応の通貨フォーマット。 |
| 25 | `stepperCartQuantity` | 数量ステッパー | ステッパー（グループ） | — | はい | 表示中。マイナスボタン、入力、プラスボタンを含む。 | — | — | Tailwind: `flex items-center border rounded-md`。 |
| 26 | `btnCartMinus` | マイナスボタン | ボタン (`アイコン`) | — | はい | 表示中。マイナスアイコン。 | — | — | `quantity = 1`の場合無効化。数量を1減少。i18n: `cart.decreaseQuantity`。 |
| 27 | `txtCartQuantity` | 数量入力 | 入力 (`number`) | Integer | はい | 表示中。現在の数量値。 | 最小: 1。最大: 99。 | `cart_items.quantity` | コンテンツ幅に自動リサイズ。変更時: 検証し更新APIを呼び出し。 |
| 28 | `btnCartPlus` | プラスボタン | ボタン (`アイコン`) | — | はい | 表示中。プラスアイコン。 | — | — | `quantity >= stock_quantity`の場合無効化。数量を1増加。i18n: `cart.increaseQuantity`。 |
| 29 | `lblCartItemSubtotal` | 商品小計 | テキスト | String | はい | 表示中。算出: 単価 × 数量。 | — | 算出フィールド | i18n対応の通貨フォーマット。Tailwind: `font-medium`。 |
| 30 | `badgeCartStockWarning` | 在庫警告バッジ | バッジ/アラート | String | 条件付き | `stock_quantity ≤ low_stock_threshold`の場合に表示。テキスト: "残り{n}個" | — | `products.stock_quantity` | i18n: `cart.lowStock`。Tailwind: `bg-amber-100 text-amber-800`。 |
| 31 | `badgeCartOutOfStock` | 在庫切れバッジ | バッジ/アラート | String | 条件付き | `stock_quantity = 0`の場合に表示。テキスト: "在庫切れ" | — | `products.stock_quantity` | i18n: `cart.outOfStock`。Tailwind: `bg-red-100 text-red-800`。チェックアウトを無効化。 |
| 32 | `btnCartItemRemove` | 削除ボタン | ボタン (`ghost` / アイコン) | — | はい | 表示中。ゴミ箱/Xアイコン。 | — | — | 楽観UI: クリック時に行を即座に削除。i18n: `cart.remove`。 |

### 4.9 セクション [H]: カートサマリーパネル

| No. | 項目ID | 項目名（論理名） | コンポーネントタイプ | データ型 & 最大長 | 必須 | 初期状態 / デフォルト値 | 入力制約 / フォーマット | データソース / DBマッピング | 備考 / ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 33 | `pnlCartSummary` | サマリーパネル | カード/サイドバー | — | はい | 表示中。デスクトップでは右側、モバイルでは商品下に配置。 | — | — | Tailwind: `rounded-lg border bg-card p-6`。デスクトップでは固定。 |
| 34 | `lblCartSubtotalLabel` | 小計ラベル | テキスト | String | — | テキスト: "小計" | — | — | i18n: `cart.subtotal`。 |
| 35 | `lblCartSubtotalValue` | 小計値 | テキスト | String | はい | 表示中。全商品小計の合計。 | — | 算出: (単価 × 数量)の合計 | i18n対応の通貨フォーマット。Tailwind: `text-lg font-bold`。 |
| 36 | `lblCartTotalItemsLabel` | 合計点数ラベル | テキスト | String | — | テキスト: "合計点数" | — | — | i18n: `cart.totalItems`。 |
| 37 | `lblCartTotalItemsValue` | 合計点数値 | テキスト | Integer | はい | 表示中。全数量の合計。 | — | 算出: 数量の合計 | — |
| 38 | `btnCartCheckout` | チェックアウトボタン | ボタン (`primary`) | — | はい | 表示中。テキスト: "購入手続きへ" | — | — | 全幅。`hasOutOfStock = true`またはカートが空の場合無効化。ローディング: スピナー。`/checkout`にナビゲート。i18n: `cart.checkout`。 |
| 39 | `lnkCartContinueShopping` | 買い物を続けるリンク | リンク (`<Link>`) | String | — | テキスト: "買い物を続ける" | — | — | `/products`にナビゲート。i18n: `cart.continueShopping`。 |
| 40 | `btnCartClearAll` | すべて削除ボタン | ボタン (`destructive` / `ghost`) | — | はい | 表示中。テキスト: "すべて削除" | — | — | 全幅。カートが空の場合無効化。削除前に確認ダイアログを表示。ローディング: スピナー。i18n: `cart.clearAll`。 |
| 41 | `dlgCartClearConfirm` | すべて削除確認ダイアログ | ダイアログ/モーダル | — | 条件付き | デフォルトで非表示。ユーザーが「すべて削除」ボタンをクリックした場合に表示。 | ESCキーまたは外側クリックで閉じる。 | — | i18n: `cart.clearConfirm.title`。 |
| 42 | `lblCartClearConfirmTitle` | 確認タイトル | テキスト (`<h2>`) | String | 条件付き | テキスト: "カートを空にしますか？" | — | — | i18n: `cart.clearConfirm.title`。Tailwind: `text-lg font-semibold`。 |
| 43 | `lblCartClearConfirmMessage` | 確認メッセージ | テキスト (`<p>`) | String | 条件付き | テキスト: "カート内のすべての商品が削除されます。" | — | — | i18n: `cart.clearConfirm.message`。 |
| 44 | `btnCartClearConfirmYes` | 確認削除ボタン | ボタン (`destructive`) | — | 条件付き | テキスト: "すべて削除" | — | — | 全幅。`DELETE /api/v1/cart`を実行。i18n: `cart.clearConfirm.confirmButton`。 |
| 45 | `btnCartClearConfirmNo` | キャンセルボタン | ボタン (`ghost`) | — | 条件付き | テキスト: "キャンセル" | — | — | ダイアログを閉じる。i18n: `cart.clearConfirm.cancelButton`。 |

### 4.10 セクション [L]: カート空状態

| No. | 項目ID | 項目名（論理名） | コンポーネントタイプ | データ型 & 最大長 | 必須 | 初期状態 / デフォルト値 | 入力制約 / フォーマット | データソース / DBマッピング | 備考 / ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 41 | `emptyCart` | 空状態コンテナ | EmptyState | — | 条件付き | カートに0件の商品がある場合に表示。 | — | — | — |
| 42 | `lblEmptyCartTitle` | 空状態タイトル | テキスト (`<h2>`) | String | 条件付き | テキスト: "カートは空です" | — | — | i18n: `cart.emptyTitle`。Tailwind: `text-lg font-semibold`。 |
| 43 | `lblEmptyCartMessage` | 空状態メッセージ | テキスト (`<p>`) | String | 条件付き | テキスト: "お買い物を始めましょう！" | — | — | i18n: `cart.emptyMessage`。Tailwind: `text-muted-foreground`。 |
| 44 | `lnkEmptyCartContinueShopping` | 買い物を続けるリンク | リンク (`<Link>`) | String | 条件付き | テキスト: "商品を見る" | — | — | `/products`にナビゲート。i18n: `cart.browseProducts`。 |

### 4.11 セクション [M]: ゲストログインアラートモーダル

| No. | 項目ID | 項目名（論理名） | コンポーネントタイプ | データ型 & 最大長 | 必須 | 初期状態 / デフォルト値 | 入力制約 / フォーマット | データソース / DBマッピング | 備考 / ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 45 | `dlgGuestLoginAlert` | ゲストログインアラートモーダル | ダイアログ/モーダル | — | 条件付き | デフォルトで非表示。認証されていないユーザーが「カートに追加」または「カートに移動」をクリックした場合に表示。 | ESCキーまたは外側クリックで閉じる。 | — | i18n: `cart.guestLoginAlert.title`。 |
| 46 | `lblGuestAlertTitle` | アラートタイトル | テキスト (`<h2>`) | String | 条件付き | テキスト: "ログインが必要です" | — | — | i18n: `cart.guestLoginAlert.title`。Tailwind: `text-lg font-semibold`。 |
| 47 | `lblGuestAlertMessage` | アラートメッセージ | テキスト (`<p>`) | String | 条件付き | テキスト: "カートに商品を追加するにはログインしてください。" | — | — | i18n: `cart.guestLoginAlert.message`。 |
| 48 | `btnGuestAlertLogin` | ログインボタン | ボタン (`primary`) | — | 条件付き | テキスト: "ログイン" | — | — | `/login?redirect={currentPath}`にナビゲート。`currentPath`はモーダルがトリガーされたページのパス（例: `/cart`、`/products/:slug`）。i18n: `cart.guestLoginAlert.loginButton`。全幅。 |
| 49 | `btnGuestAlertClose` | 閉じるボタン | ボタン (`ghost`) | — | 条件付き | テキスト: "キャンセル" | — | — | モーダルを閉じる。i18n: `cart.guestLoginAlert.closeButton`。 |

### 4.12 共有: ローディングスケルトン

| No. | 項目ID | 項目名（論理名） | コンポーネントタイプ | データ型 & 最大長 | 必須 | 初期状態 / デフォルト値 | 入力制約 / フォーマット | データソース / DBマッピング | 備考 / ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 50 | `skeletonWishlistCard` | お気に入りカードスケルトン | スケルトン | — | 条件付き | お気に入りデータ取得中に表示。カード型プレースホルダー。 | — | — | Tailwind: `animate-pulse rounded-lg border h-64`。 |
| 51 | `skeletonCartItem` | カート商品スケルトン | スケルトン | — | 条件付き | カートデータ取得中に表示。行型プレースホルダー。 | — | — | Tailwind: `animate-pulse h-20 border-b`。 |

---

## 5. 各項目における挙動・イベント仕様

### 5.1 お気に入り: ハートのトグル / お気に入りに追加 (`btnWishlistAdd` / ハートアイコン onClick)
- **トリガー:** ユーザーが商品カード/詳細のハートアイコンをクリック。
- **処理ロジック:**
  1. **クライアント側事前チェック:** ユーザーが認証されていることを確認。でなければ`dlgGuestLoginAlert`をトリガー。
  2. **楽観UI:** ハートアイコンを即座にトグル（アウトライン → 埋め or 埋め → アウトライン）。
  3. **バックエンドディスパッチ:**
     - お気に入りにない場合: `POST /api/v1/wishlist/:productId`。
     - 既にお気に入りにある場合: `DELETE /api/v1/wishlist/:productId`。
  4. **バックエンド実行:** JWT検証。商品の存在と有効化を確認。お気に入りレコードを作成/削除。
  5. **実行後UI:** トグル状態を確認。追加時に成功トーストを表示。削除時に成功トーストを表示。
- **例外処理:**
  - `401 UNAUTHORIZED`: トグルを元に戻す。ログインにリダイレクト。
  - `404 NOT_FOUND`: トグルを元に戻す。トースト: "商品が見つかりません"。
  - `409 CONFLICT`: トグルを元に戻す。トースト: "商品は既にお気に入りに追加されています"。
  - `500 INTERNAL_SERVER_ERROR`: トグルを元に戻す。トースト: "問題が発生しました"。

### 5.2 お気に入り: お気に入りから削除 (`btnWishlistRemove` onClick)
- **トリガー:** ユーザーがお気に入り商品カードのゴミ箱/Xアイコンをクリック。
- **処理ロジック:**
  1. **楽観UI:** フェードアウトアニメーション付きでグリッドからカードを即座に削除。
  2. **バックエンドディスパッチ:** `DELETE /api/v1/wishlist/:productId`。
  3. **バックエンド実行:** JWT検証。お気に入りレコードを検索して削除。
  4. **実行後UI:** 商品数を更新。商品がなければ空状態を表示。
- **例外処理:**
  - `401 UNAUTHORIZED`: 削除を元に戻す。ログインにリダイレクト。
  - `404 NOT_FOUND`: 商品は既に削除済み。UIを更新。
  - `500 INTERNAL_SERVER_ERROR`: 削除を元に戻す。トースト: "商品の削除に失敗しました"。

### 5.3 お気に入り: カートに移動 (`btnWishlistMoveToCart` onClick)
- **トリガー:** ユーザーがお気に入り商品の「カートに追加」ボタンをクリック。
- **処理ロジック:**
  1. **クライアント側事前チェック:** ユーザーが認証されていることを確認。でなければ`dlgGuestLoginAlert`をトリガー。
  2. **クライアント側事前チェック:** 商品が在庫切れでないことを確認。在庫切れの場合はエラートーストを表示。
  3. **バックエンドディスパッチ:** `POST /api/v1/wishlist/:productId/move-to-cart`。
  4. **バックエンド実行:** JWT検証。商品の在庫 > 0を確認。カート商品を作成/更新。必要に応じてお気に入り商品を削除。
  5. **実行後UI:** お気に入りグリッドから商品を削除。商品数を更新。該当する場合は空状態を表示。成功トーストを表示。
- **例外処理:**
  - `401 UNAUTHORIZED`: 状態を元に戻す。ログインにリダイレクト。
  - `400 BAD_REQUEST`（在庫切れ）: トースト: "商品は在庫切れです"。
  - `500 INTERNAL_SERVER_ERROR`: トースト: "カートへの移動に失敗しました"。

### 5.4 カート: 数量更新 — マイナスボタン (`btnCartMinus` onClick)
- **トリガー:** ユーザーがカート商品のマイナスボタンをクリック。
- **処理ロジック:**
  1. **クライアント側事前チェック:** `currentQuantity > 1`であることを確認。`currentQuantity = 1`の場合、ボタンは無効。
  2. **楽観UI:** 表示数量を1減少。商品小計を即座に更新。
  3. **バックエンドディスパッチ:** `PATCH /api/v1/cart/items/:id` 本体 `{ quantity: currentQuantity - 1 }`。
  4. **バックエンド実行:** JWT検証。数量 ≥ 1を検証。在庫を確認。カート商品を更新。
  5. **実行後UI:** 新しい数量と小計を確認。サマリーパネルの合計を更新。
- **例外処理:**
  - `401 UNAUTHORIZED`: 数量を元に戻す。ログインにリダイレクト。
  - `400 BAD_REQUEST`（数量 < 1）: 数量を元に戻す。
  - `400 BAD_REQUEST`（在庫超過）: 数量を元に戻す。トースト: "在庫が{n}個しかありません"。
  - `500 INTERNAL_SERVER_ERROR`: 数量を元に戻す。トースト: "数量の更新に失敗しました"。

### 5.5 カート: 数量更新 — プラスボタン (`btnCartPlus` onClick)
- **トリガー:** ユーザーがカート商品のプラスボタンをクリック。
- **処理ロジック:**
  1. **クライアント側事前チェック:** `currentQuantity < stock_quantity`であることを確認。最大値の場合、ボタンは無効。
  2. **楽観UI:** 表示数量を1増加。商品小計を即座に更新。
  3. **バックエンドディスパッチ:** `PATCH /api/v1/cart/items/:id` 本体 `{ quantity: currentQuantity + 1 }`。
  4. **バックエンド実行:** JWT検証。数量 ≤ 在庫を検証。カート商品を更新。
  5. **実行後UI:** 新しい数量と小計を確認。サマリーパネルの合計を更新。
- **例外処理:**
  - `401 UNAUTHORIZED`: 数量を元に戻す。ログインにリダイレクト。
  - `400 BAD_REQUEST`（在庫超過）: 数量を元に戻す。トースト: "在庫が{n}個しかありません"。
  - `500 INTERNAL_SERVER_ERROR`: 数量を元に戻す。トースト: "数量の更新に失敗しました"。

### 5.6 カート: 数量更新 — 直接入力 (`txtCartQuantity` onChange / onBlur)
- **トリガー:** ユーザーが新しい数量値を入力し、入力からフォーカスを外すかEnterキーを押す。
- **処理ロジック:**
  1. **クライアント側事前チェック:** 値が整数 ≥ 1 かつ ≤ 99であることを検証。無効な場合、以前の値に戻す。
  2. **楽観UI:** 表示数量を更新。商品小計を更新。
  3. **バックエンドディスパッチ:** `PATCH /api/v1/cart/items/:id` 本体 `{ quantity: newValue }`。
  4. **バックエンド実行:** JWT検証。数量を検証。在庫を確認。カート商品を更新。
  5. **実行後UI:** 数量と小計を確認。サマリーパネルを更新。
- **例外処理:**
  - `401 UNAUTHORIZED`: 数量を元に戻す。ログインにリダイレクト。
  - `400 BAD_REQUEST`（無効な数量）: 以前の値に戻す。インラインエラー。
  - `400 BAD_REQUEST`（在庫超過）: 以前の値に戻す。トースト: "在庫が{n}個しかありません"。
  - `500 INTERNAL_SERVER_ERROR`: 数量を元に戻す。

### 5.7 カート: 商品削除 (`btnCartItemRemove` onClick)
- **トリガー:** ユーザーがカート商品行のゴミ箱/Xアイコンをクリック。
- **処理ロジック:**
  1. **楽観UI:** フェードアウトアニメーション付きでリストから行を即座に削除。
  2. **バックエンドディスパッチ:** `DELETE /api/v1/cart/items/:id`。
  3. **バックエンド実行:** JWT検証。カート商品を検索して削除。
  4. **実行後UI:** 商品数を更新。サマリーパネルの合計を更新。商品がなければ空状態を表示。カートバッジを更新。
- **例外処理:**
  - `401 UNAUTHORIZED`: 削除を元に戻す。ログインにリダイレクト。
  - `404 NOT_FOUND`: 商品は既に削除済み。UIを更新。
  - `500 INTERNAL_SERVER_ERROR`: 削除を元に戻す。トースト: "商品の削除に失敗しました"。

### 5.8 カート: すべて削除 (`btnCartClearAll` onClick)
- **トリガー:** ユーザーがカートサマリーパネルの「すべて削除」ボタンをクリック。
- **処理ロジック:**
  1. **確認:** タイトル、メッセージ、[すべて削除] / [キャンセル] ボタンを含む`dlgCartClearConfirm`モーダルを表示。
  2. **アクション確認:** ユーザーが`btnCartClearConfirmYes`をクリックした場合:
     1. **楽観UI:** カートからすべての商品を即座にクリア。空状態を表示。サマリーパネルをゼロに更新。
     2. **バックエンドディスパッチ:** `DELETE /api/v1/cart`。
     3. **バックエンド実行:** JWT検証。認証済みユーザーのすべてのカート商品を削除。
     4. **実行後UI:** 空状態を確認。カートバッジを0に更新。成功トーストを表示。
  3. **アクションキャンセル:** ユーザーが`btnCartClearConfirmNo`をクリックするかESCキーを押した場合、アクションなしでダイアログを閉じる。
- **例外処理:**
  - `401 UNAUTHORIZED`: カートの状態を元に戻す。ログインにリダイレクト。
  - `500 INTERNAL_SERVER_ERROR`: カートの状態を元に戻す。トースト: "カートの削除に失敗しました。もう一度お試しください"。

### 5.9 カート: チェックアウト Proceed (`btnCartCheckout` onClick)
- **トリガー:** ユーザーが「購入手続きへ」ボタンをクリック。
- **処理ロジック:**
  1. **クライアント側事前チェック:** すべての商品が在庫切れでないことを確認（`hasOutOfStock = false`）。カートが空でないことを確認。
  2. **ナビゲーション:** React Routerで`/checkout`にナビゲート。
- **例外処理:**
  - 商品が在庫切れの場合: ボタンは無効化。ツールチップまたはトースト: "在庫切れの商品を削除してからチェックアウトしてください"。

### 5.10 ゲストログインアラート (`dlgGuestLoginAlert`)
- **トリガー:** 認証されていないユーザーが「カートに追加」または「カートに移動」の操作をクリック。
- **処理ロジック:**
  1. **現在パスのキャプチャ:** `window.location.pathname`を`returnUrl`として保存（例: `/cart`、`/products/vitamin-c-serum`）。
  2. **モーダル表示:** タイトル、メッセージ、[ログイン] ボタンを含む`dlgGuestAlertLogin`を表示。
  3. **ログインアクション:** `btnGuestAlertLogin`をクリックすると`/login?redirect={returnUrl}`にナビゲート。ログイン成功後、認証フローが`redirect`クエリパラメータを読み取り、ユーザーを元のページに戻す。
  4. **閉じるアクション:** `btnGuestAlertClose`をクリックするかESCキーを押すとモーダルを閉じる。
- **例外処理:** 該当なし。

### 5.11 言語切替 (`btnLanguageToggle` onClick)
- **トリガー:** ユーザーが言語切替ボタンをクリック。
- **処理ロジック:**
  1. 言語を循環: EN → JA → MY → EN。
  2. `i18n.changeLanguage()`で`i18next`の言語を更新。
  3. `localStorage`に設定を保存。
  4. 翻訳されたすべてのラベルと通貨フォーマットを再レンダリング。
- **例外処理:** 該当なし。

### 5.12 テーマ切替 (`btnThemeToggle` onClick)
- **トリガー:** ユーザーがテーマ切替ボタンをクリック。
- **処理ロジック:**
  1. テーマを循環: light → dark → system。
  2. `setTheme()`で`next-themes`のテーマを更新。
  3. `localStorage`に設定を保存。
- **例外処理:** 該当なし。

---

## 6. バリデーション及びエラーメッセージマッピング

### 6.1 お気に入りバリデーションエラー

| エラーコード | 対象フィールド | 条件 / 評価ロジック | UI/UX表示スタイル | デフォルトエラーメッセージテキスト (EN) | デフォルトエラーメッセージテキスト (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-WISH-001** | `imgWishlistProduct` / `lnkWishlistProductName` | 商品が見つからないか無効 | トースト (destructive) | "Product not found or unavailable" | "商品が見つからないか利用できません" |
| **VAL-WISH-002** | `crdWishlistItem` | 商品が既にお気に入りにある | トースト (warning) | "Product already in your wishlist" | "商品は既にお気に入りに追加されています" |
| **VAL-WISH-003** | `btnWishlistMoveToCart` | カートに移動時に商品が在庫切れ | トースト (destructive) | "Product is out of stock" | "商品は在庫切れです" |
| **WISH_001** | `dlgGuestLoginAlert` | 認証されていないユーザーがお気に入り操作を試みる | モーダルダイアログ | "Please log in to add items to your wishlist" | "お気に入りに追加するにはログインしてください" |
| **WISH_002** | `emptyWishlist` | サーバーエラー（500応答） | トースト (destructive) | "Something went wrong. Please try again" | "問題が発生しました。もう一度お試しください" |
| **WISH_NET** | `dlgGuestLoginAlert` | ネットワークエラー | トースト (destructive) | "Network error. Please check your connection" | "ネットワークエラー。接続を確認してください" |

### 6.2 カートバリデーションエラー

| エラーコード | 対象フィールド | 条件 / 評価ロジック | UI/UX表示スタイル | デフォルトエラーメッセージテキスト (EN) | デフォルトエラーメッセージテキスト (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-CART-001** | `txtCartQuantity` | 数量が空または < 1 | 赤いボーダー。入力下にインラインテキスト。 | "Quantity must be at least 1" | "数量は1以上である必要があります" |
| **VAL-CART-002** | `txtCartQuantity` | 数量が99を超える | 赤いボーダー。入力下にインラインテキスト。 | "Quantity cannot exceed 99" | "数量は99を超えることはできません" |
| **VAL-CART-003** | `txtCartQuantity` | 数量が整数でない | 赤いボーダー。入力下にインラインテキスト。 | "Quantity must be a whole number" | "数量は整数である必要があります" |
| **VAL-CART-004** | `txtCartQuantity` | 要求数量 > stock_quantity | 以前の値に戻す。トースト (destructive)。 | "Only {n} available in stock" | "在庫が{n}個しかありません" |
| **VAL-CART-005** | `btnCartCheckout` | いずれかの商品の在庫 = 0 | チェックアウトボタン無効化。ツールチップ。 | "Remove out-of-stock items before checkout" | "在庫切れの商品を削除してからチェックアウトしてください" |
| **CART_001** | `dlgGuestLoginAlert` | 認証されていないユーザーがカート操作を試みる | モーダルダイアログ | "Please log in to add items to your cart." | "カートに商品を追加するにはログインしてください" |
| **CART_002** | `rowCartItem` | 商品が見つからない | トースト (destructive) | "Product not found" | "商品が見つかりません" |
| **CART_003** | `rowCartItem` | カート商品が見つからない（既に削除済み） | トースト (warning) | "Item not found in cart" | "カートにアイテムが見つかりません" |
| **CART_004** | `pnlCartSummary` | サーバーエラー（500応答） | トースト (destructive) | "Something went wrong. Please try again" | "問題が発生しました。もう一度お試しください" |
| **CART_005** | `btnCartClearAll` | カートクリアAPI障害（500応答） | トースト (destructive) | "Failed to clear cart. Please try again" | "カートの削除に失敗しました。もう一度お試しください" |
| **CART_NET** | `dlgGuestLoginAlert` | ネットワークエラー | トースト (destructive) | "Network error. Please check your connection" | "ネットワークエラー。接続を確認してください" |

---

## 7. データベースフィールドマッピング

### 7.1 お気に入り → データベース

| フォームフィールド | APIフィールド | データベースカラム | テーブル | データ型 |
| :--- | :--- | :--- | :--- | :--- |
| `imgWishlistProduct` | `productId` | `product_id` | `wishlists` | UUID FK |
| `lnkWishlistProductName` | `productName` | `name` | `products` | VARCHAR(255) |
| `lblWishlistProductPrice` | `productPrice` | `price` | `products` | NUMERIC(10,2) |
| `lblWishlistComparePrice` | `compareAtPrice` | `compare_at_price` | `products` | NUMERIC(10,2) |
| `badgeWishlistStockStatus` | `stockStatus` | `stock_quantity` | `products` | INTEGER |
| `btnWishlistMoveToCart` | `isInStock` | `stock_quantity > 0` | `products` | BOOLEAN (算出) |

### 7.2 カート → データベース

| フォームフィールド | APIフィールド | データベースカラム | テーブル | データ型 |
| :--- | :--- | :--- | :--- | :--- |
| `imgCartProduct` | `productId` | `product_id` | `cart_items` | UUID FK |
| `lnkCartProductName` | `productName` | `name` | `products` | VARCHAR(255) |
| `lblCartUnitPrice` | `unitPrice` | `price` | `products` | NUMERIC(10,2) |
| `txtCartQuantity` | `quantity` | `quantity` | `cart_items` | INTEGER |
| `lblCartItemSubtotal` | `subtotal` | 算出: `unitPrice × quantity` | — | NUMERIC(10,2) (算出) |
| `badgeCartStockWarning` | `stockQuantity` | `stock_quantity` | `products` | INTEGER |

---

## 8. APIレスポンスマッピング

### 8.1 お気に入り取得成功レスポンス

```json
{
  "data": [
    {
      "id": "e4b10b06-0370-4357-9dbd-8de5a97df778",
      "productId": "6b72a6b2-60cc-483a-867c-1b77df7f7dc8",
      "productName": "Vitamin C Serum",
      "productSlug": "vitamin-c-serum",
      "productImage": "/uploads/products/vitamin-c-serum.webp",
      "productPrice": "39.99",
      "compareAtPrice": "49.99",
      "stockStatus": "In Stock",
      "isInStock": true,
      "createdAt": "2026-08-05T12:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1
  }
}
```

### 8.2 カート取得成功レスポンス

```json
{
  "data": {
    "items": [
      {
        "id": "3a52c3c9-c1b7-4c4f-9e67-d8687cfc1d9f",
        "productId": "6b72a6b2-60cc-483a-867c-1b77df7f7dc8",
        "productName": "Vitamin C Serum",
        "productSlug": "vitamin-c-serum",
        "productImage": "/uploads/products/vitamin-c-serum.webp",
        "unitPrice": "39.99",
        "quantity": 2,
        "subtotal": "79.98",
        "stockQuantity": 15,
        "stockStatus": "In Stock",
        "isAvailable": true
      }
    ],
    "totalItems": 2,
    "subtotal": "79.98",
    "hasOutOfStock": false,
    "canCheckout": true
  }
}
```

### 8.3 お気に入り追加成功レスポンス

```json
{
  "data": {
    "id": "e4b10b06-0370-4357-9dbd-8de5a97df778",
    "productId": "6b72a6b2-60cc-483a-867c-1b77df7f7dc8",
    "createdAt": "2026-08-05T12:00:00.000Z"
  }
}
```

### 8.4 カート追加成功レスポンス

```json
{
  "data": {
    "id": "3a52c3c9-c1b7-4c4f-9e67-d8687cfc1d9f",
    "productId": "6b72a6b2-60cc-483a-867c-1b77df7f7dc8",
    "quantity": 1,
    "unitPrice": "39.99",
    "subtotal": "39.99",
    "stockQuantity": 15,
    "stockStatus": "In Stock",
    "isAvailable": true
  }
}
```

### 8.5 カート数量更新成功レスポンス

```json
{
  "data": {
    "id": "3a52c3c9-c1b7-4c4f-9e67-d8687cfc1d9f",
    "productId": "6b72a6b2-60cc-483a-867c-1b77df7f7dc8",
    "quantity": 3,
    "unitPrice": "39.99",
    "subtotal": "119.97",
    "stockQuantity": 15,
    "stockStatus": "In Stock",
    "isAvailable": true
  }
}
```

### 8.6 エラーレスポンス — 在庫切れ

```json
{
  "statusCode": 400,
  "error": "BAD_REQUEST",
  "errorCode": "VAL-CART-004",
  "message": "Only 2 available in stock",
  "timestamp": "2026-08-08T12:00:00.000Z",
  "path": "/api/v1/cart/items/3a52c3c9-c1b7-4c4f-9e67-d8687cfc1d9f"
}
```

### 8.7 エラーレスポンス — 商品が既にお気に入りにある

```json
{
  "statusCode": 409,
  "error": "CONFLICT",
  "errorCode": "VAL-WISH-002",
  "message": "Product already in wishlist",
  "timestamp": "2026-08-08T12:00:00.000Z",
  "path": "/api/v1/wishlist/6b72a6b2-60cc-483a-867c-1b77df7f7dc8"
}
```

### 8.8 カートクリア成功レスポンス

```json
{
  "data": {
    "deletedCount": 3,
    "message": "Cart cleared successfully"
  }
}
```

### 8.9 エラーレスポンス — カートクリア失敗

```json
{
  "statusCode": 500,
  "error": "INTERNAL_SERVER_ERROR",
  "errorCode": "CART_005",
  "message": "Failed to clear cart. Please try again",
  "timestamp": "2026-08-08T12:00:00.000Z",
  "path": "/api/v1/cart"
}
```

---

## 9. i18nキーリファレンス

### 9.1 英語 (en) — お気に入り

| キー | 値 |
| :--- | :--- |
| `wishlist.title` | "My Wishlist" |
| `wishlist.itemCount` | "{count} items saved" |
| `wishlist.moveToCart` | "Add to Cart" |
| `wishlist.remove` | "Remove" |
| `wishlist.emptyTitle` | "No items saved yet" |
| `wishlist.emptyMessage` | "Browse products to add favorites." |
| `wishlist.continueShopping` | "Continue Shopping" |
| `wishlist.unavailable` | "This product is currently unavailable." |
| `wishlist.inStock` | "In Stock" |
| `wishlist.lowStock` | "Low Stock" |
| `wishlist.outOfStock` | "Out of Stock" |

### 9.2 英語 (en) — カート

| キー | 値 |
| :--- | :--- |
| `cart.title` | "Shopping Cart" |
| `cart.itemCount` | "{count} items in cart" |
| `cart.subtotal` | "Subtotal" |
| `cart.totalItems` | "Total Items" |
| `cart.checkout` | "Proceed to Checkout" |
| `cart.continueShopping` | "Continue Shopping" |
| `cart.browseProducts` | "Browse Products" |
| `cart.remove` | "Remove" |
| `cart.emptyTitle` | "Your cart is empty" |
| `cart.emptyMessage` | "Start shopping!" |
| `cart.inStock` | "In Stock" |
| `cart.lowStock` | "Only {n} left in stock" |
| `cart.outOfStock` | "Out of Stock" |
| `cart.decreaseQuantity` | "Decrease quantity" |
| `cart.increaseQuantity` | "Increase quantity" |
| `cart.guestLoginAlert.title` | "Log In Required" |
| `cart.guestLoginAlert.message` | "Please log in to add items to your cart." |
| `cart.guestLoginAlert.loginButton` | "Log In" |
| `cart.guestLoginAlert.closeButton` | "Cancel" |
| `cart.clearAll` | "Clear All" |
| `cart.clearConfirm.title` | "Clear Cart?" |
| `cart.clearConfirm.message` | "This will remove all items from your cart." |
| `cart.clearConfirm.confirmButton` | "Clear All" |
| `cart.clearConfirm.cancelButton` | "Cancel" |

### 9.3 日本語 (ja) — お気に入り

| キー | 値 |
| :--- | :--- |
| `wishlist.title` | "お気に入り" |
| `wishlist.itemCount` | "{count}件の商品が保存されています" |
| `wishlist.moveToCart` | "カートに追加" |
| `wishlist.remove` | "削除" |
| `wishlist.emptyTitle` | "まだお気に入りに追加された商品がありません" |
| `wishlist.emptyMessage` | "商品を閲覧してお気に入りを追加しましょう。" |
| `wishlist.continueShopping` | "買い物を続ける" |
| `wishlist.unavailable` | "この商品は現在在庫切れです。" |
| `wishlist.inStock` | "在庫あり" |
| `wishlist.lowStock` | "残りわずか" |
| `wishlist.outOfStock` | "在庫切れ" |

### 9.4 日本語 (ja) — カート

| キー | 値 |
| :--- | :--- |
| `cart.title` | "カート" |
| `cart.itemCount` | "{count}件の商品がカートに入っています" |
| `cart.subtotal` | "小計" |
| `cart.totalItems` | "合計点数" |
| `cart.checkout` | "購入手続きへ" |
| `cart.continueShopping` | "買い物を続ける" |
| `cart.browseProducts` | "商品を見る" |
| `cart.remove` | "削除" |
| `cart.emptyTitle` | "カートは空です" |
| `cart.emptyMessage` | "お買い物を始めましょう！" |
| `cart.inStock` | "在庫あり" |
| `cart.lowStock` | "残り{n}個" |
| `cart.outOfStock` | "在庫切れ" |
| `cart.decreaseQuantity` | "数量を減らす" |
| `cart.increaseQuantity` | "数量を増やす" |
| `cart.guestLoginAlert.title` | "ログインが必要です" |
| `cart.guestLoginAlert.message` | "カートに商品を追加するにはログインしてください。" |
| `cart.guestLoginAlert.loginButton` | "ログイン" |
| `cart.guestLoginAlert.closeButton` | "キャンセル" |
| `cart.clearAll` | "すべて削除" |
| `cart.clearConfirm.title` | "カートを空にしますか？" |
| `cart.clearConfirm.message` | "カート内のすべての商品が削除されます。" |
| `cart.clearConfirm.confirmButton` | "すべて削除" |
| `cart.clearConfirm.cancelButton` | "キャンセル" |

---

## 10. 共有コンポーネント

### 10.1 EmptyState コンポーネント

| プロパティ | 値 |
| :--- | :--- |
| **場所** | `frontend/src/components/common/EmptyState.tsx` |
| **バリアント** | `wishlist`, `cart` |
| **Props** | `title`, `message`, `actionLabel`, `actionHref` |
| **使用方法** | お気に入りまたはカートに0件の商品がある場合に表示 |

### 10.2 Skeleton コンポーネント

| プロパティ | 値 |
| :--- | :--- |
| **場所** | `frontend/src/components/ui/skeleton.tsx` |
| **バリアント** | `card`（お気に入り）、`row`（カート） |
| **使用方法** | データ取得中のローディングプレースホルダー |

### 10.3 Badge コンポーネント

| プロパティ | 値 |
| :--- | :--- |
| **場所** | `frontend/src/components/ui/badge.tsx` |
| **バリアント** | `default`, `success`, `warning`, `destructive` |
| **使用方法** | 在庫ステータス表示（在庫あり、残りわずか、在庫切れ） |

### 10.4 Button コンポーネント

| プロパティ | 値 |
| :--- | :--- |
| **場所** | `frontend/src/components/ui/button.tsx` |
| **バリアント** | `default`, `ghost`, `destructive`, `outline` |
| **使用方法** | お気に入りおよびカートページ全体のアクションボタン |

### 10.5 Dialog コンポーネント

| プロパティ | 値 |
| :--- | :--- |
| **場所** | `frontend/src/components/ui/dialog.tsx` |
| **使用方法** | ゲストログインアラートモーダル (`dlgGuestLoginAlert`) |

### 10.6 Toast コンポーネント

| プロパティ | 値 |
| :--- | :--- |
| **場所** | `frontend/src/components/ui/toast.tsx` |
| **バリアント** | `default`, `success`, `destructive` |
| **使用方法** | すべての操作の成功/エラー通知 |

---

## 11. 特記事項・UI仕様

- **デザインシステム:** 奢華化粧品テーマ — プライマリ `#7C3AED`（パープル）、アクセント `#EC4899`（ピンク）、セカンダリ `#F3E8FF`（ラベンダー）。
- **レスポンシブデザイン:** モバイルファーストアプローチ。お気に入りグリッドは4 → 2 → 1カラムに折りたたまれる。カートサマリーパネルはモバイルでサイドバーから下部に移動。
- **アクセシビリティ:** すべてのコントロールはキーボードでナビゲート可能であること。ARIAラベルが必要。エラーメッセージは`role="alert"`でannounceされること。数量入力には現在値の`aria-label`が必要。
- **パフォーマンス:** 初回データ取得中にスケルトンローダーを表示。トグル/削除操作に楽観UI更新。非同期操作中はボタンにスピナーを表示。
- **セキュリティ:** XSS防止のためすべてのユーザー入力をサニタイズ。サーバーサイドで所有権検証を実行（JWTからのuserId）。価格と在庫の値はDBから取得し、クライアントからは取得しない。
- **楽観更新:** ハートアイコンのトグルとカート商品の削除は、API確認前にUIを即座に更新。API障害時は以前の状態にUIを戻す。
- **カートバッジ:** ヘッダーのカートアイコンバッジは、商品の追加/削除時にリアルタイムで更新。バッジは合計数量（すべての商品数量の合計）を表示。
- **在庫表示:** リアルタイムの在庫検証。在庫が0になると、チェックアウトボタンが即座に無効化。
- **デザイントークン:** ステータスバッジは標準のカラーマッピングを使用 — success: `bg-green-100 text-green-800`、error: `bg-red-100 text-red-800`、warning: `bg-amber-100 text-amber-800`。

---

## 12. テストチェックリスト

### 12.1 お気に入りページテスト

- [ ] お気に入りページが正しいタイトルと商品数で読み込まれる
- [ ] お気に入り商品が商品画像、名前、価格、在庫ステータスを表示する
- [ ] 商品画像のクリックで商品詳細ページにナビゲートする
- [ ] 商品名のクリックで商品詳細ページにナビゲートする
- [ ] 比較価格が商品に割引がある場合に取り消し線を表示する
- [ ] 「カートに追加」ボタンが商品をカートに正常に追加する
- [ ] 「カートに追加」ボタンが商品が在庫切れの場合に無効化される
- [ ] 削除ボタンが楽観UIでお気に入りから商品を削除する
- [ ] お気に入りに商品がない場合に空状態が表示される
- [ ] 空状態の「買い物を続ける」リンクが/productsにナビゲートする
- [ ] データ取得中にローディングスケルトンが表示される
- [ ] 追加/削除操作後に商品数が正しく更新される
- [ ] 言語切替ですべてのラベルが切り替わる (EN/JA/MY)
- [ ] テーマ切替が機能する
- [ ] キーボードナビゲーションが機能する (Tab, Enter, Escape)

### 12.2 お気に入りカート移動テスト

- [ ] お気に入り商品の「カートに追加」でカートに追加され、お気に入りから削除される
- [ ] 在庫切れ商品の「カートに追加」でエラートーストが表示される
- [ ] 在庫あり商品の「カートに追加」で成功トーストが表示される
- [ ] 楽観UIでお気に入りグリッドから商品が即座に削除される
- [ ] API障害時にUIが以前の状態に戻る

### 12.3 カートページテスト

- [ ] カートページが正しいタイトルと商品数で読み込まれる
- [ ] カート商品が商品画像、名前、単価、数量、小計を表示する
- [ ] 商品画像のクリックで商品詳細ページにナビゲートする
- [ ] 商品名のクリックで商品詳細ページにナビゲートする
- [ ] 数量マイナスボタンで数量が1減少する
- [ ] 数量マイナスボタンが数量 = 1の場合に無効化される
- [ ] 数量プラスボタンで数量が1増加する
- [ ] 数量プラスボタンが数量 = stock_quantityの場合に無効化される
- [ ] 直接入力で数量を変更すると商品小計が正しく更新される
- [ ] 直接入力で < 1の値がインラインエラーで拒否される
- [ ] 直接入力で > 99の値がインラインエラーで拒否される
- [ ] 商品小計が正しく更新される（単価 × 数量）
- [ ] 削除ボタンが楽観UIでカートから商品を削除する
- [ ] サマリーパネルが正しい小計（すべての小計の合計）を表示する
- [ ] サマリーパネルが正しい合計点数（数量の合計）を表示する
- [ ] チェックアウトボタンが/checkoutにナビゲートする
- [ ] いずれかの商品が在庫切れの場合にチェックアウトボタンが無効化される
- [ ] カートが空の場合にチェックアウトボタンが無効化される
- [ ] 「買い物を続ける」リンクが/productsにナビゲートする
- [ ] カートに商品がない場合に空状態が表示される
- [ ] 空状態の「商品を見る」リンクが/productsにナビゲートする
- [ ] データ取得中にローディングスケルトンが表示される
- [ ] 「すべて削除」ボタンが確認ダイアログを表示する
- [ ] 「すべて削除」ボタンがカートが空の場合に無効化される
- [ ] 確認ダイアログの「すべて削除」ボタンでカートからすべての商品が削除される
- [ ] 確認ダイアログの「キャンセル」ボタンで削除なしでダイアログが閉じる
- [ ] 確認ダイアログでESCキーを押すと削除なしで閉じる
- [ ] すべて削除の楽観UIで即座に空状態が表示される
- [ ] すべて削除のAPI障害でカートの状態が戻り、エラートーストが表示される
- [ ] すべて削除後にカートバッジが0に更新される
- [ ] 言語切替ですべてのラベルと通貨フォーマットが切り替わる
- [ ] テーマ切替が機能する
- [ ] キーボードナビゲーションが機能する

### 12.4 カート在庫検証テスト

- [ ] 在庫 ≤ low_stock_thresholdの場合に低在庫警告バッジが表示される
- [ ] 在庫 = 0の場合に在庫切れバッジが表示される
- [ ] 在庫切れバッジがチェックアウトボタンを無効化する
- [ ] 数量が在庫制限に達した場合にプラスボタンが無効化される
- [ ] 在庫超過の数量更新でエラートーストが表示され、元に戻る
- [ ] ページ読み込み時のリアルタイム在庫検証

### 12.5 ゲストユーザーテスト

- [ ] ゲストユーザーが商品詳細で「カートに追加」をクリックするとログインアラートモーダルが表示される
- [ ] ゲストユーザーがお気に入りで「カートに移動」をクリックするとログインアラートモーダルが表示される
- [ ] ログインアラートモーダルが正しいタイトルとメッセージを表示する
- [ ] モーダル内の[ログイン]ボタンが`/login?redirect={currentPath}`にナビゲートする
- [ ] リダイレクトパラメータに正しいページパスが含まれる（例: `/cart`、`/products/:slug`）
- [ ] ログイン後、`redirect`クエリパラメータ経由で元のページにリダイレクトされる
- [ ] モーダル内の[キャンセル]ボタンでモーダルが閉じる
- [ ] ESCキーでモーダルが閉じる
- [ ] モーダルの外側をクリックすると閉じる

### 12.6 レスポンシブデザインテスト

- [ ] お気に入りグリッドがデスクトップ（≥ 1024px）で4カラムを表示する
- [ ] お気に入りグリッドがタブレット（768px – 1023px）で2カラムを表示する
- [ ] お気に入りグリッドがモバイル（< 768px）で1カラムを表示する
- [ ] カートサマリーパネルがデスクトップで右サイドバーとして表示される
- [ ] カートサマリーパネルがモバイル/タブレットで商品下に表示される
- [ ] すべてのボタンとコントロールがモバイルでタッチフレンドリー
- [ ] 数量ステッパーがタッチデバイスで使用可能

### 12.7 エラーハンドリングテスト

- [ ] 401 Unauthorizedでログインページにリダイレクトされる
- [ ] 404 Not Foundで適切なトーストメッセージが表示される
- [ ] 409 Conflictで適切なトーストメッセージが表示される
- [ ] 500 Internal Server Errorで汎用エラートーストが表示される
- [ ] ネットワークエラーで接続エラートーストが表示される
- [ ] API障害で楽観UI更新が元に戻る
- [ ] エラーアラートがスクリーンリーダーにannounceされる（`role="alert"`）

---

*画面項目設計書（お気に入り & カートページ） 終了*
