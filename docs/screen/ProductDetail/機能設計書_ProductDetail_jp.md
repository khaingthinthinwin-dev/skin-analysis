# 機能設計書 — 商品詳細ページ

---

## 文書管理

| 属性 | 値 |
|-----------|-------|
| **文書ID** | SKM-FDS-PROD-001 |
| **対象画面** | 商品詳細ページ |
| **サブシステム** | 商品カタログ — 商品詳細、レビュー、お気に入り＆カート追加 |
| **機能ID** | FN-PROD-001 |
| **バージョン** | 8.0 |
| **作成日** | 2026-08-05 |
| **最終更新日** | 2026-10-21 |
| **作成者** | ソフトウェアアーキテクト |
| **ステータス** | ドラフト（審査中） |
| **分類** | 社内 — 技術部門 |

> **整合メモ（v8.0）:** TMOソースコード（`backend/src/modules/catalog/products/buyer-products.controller.ts`、`public-reviews.controller.ts`、`products.service.ts`、`reviews.service.ts`；`frontend/src/pages/buyer/ProductDetail.tsx`、`frontend/src/features/buyer/products/**`）と突合。エンドポイント所有権とパス、組み込みプロモーション、レビュー管理（`pending`）、`can-review`資格エンドポイント、レビュー/報告エラーコード、広告配置`productDetail_page_banner`、販売者-viewゲーティングを修正。§1.1参照。

---

## 文書改訂履歴

| バージョン | 日付 | 作成者 | 変更内容 |
|---------|------|--------|------------------------|
| 1.0 | 2026-08-05 | ソフトウェアアーキテクト | 商品詳細ページの初期機能設計。商品表示、画像ギャラリー、レビュー、関連商品、お気に入りトグル、カート追加を網羅。 |
| 2.0 | 2026-08-06 | ソフトウェアアーキテクト | 標準機能仕様テンプレートに完全準拠するよう構成を更新。要件定義書、データベース設計書、開発ルール書の詳細仕様を統合。 |
| 3.0 | 2026-08-07 | ソフトウェアアーキテクト | 他の画面仕様書と構成を揃えるため、第5章からUIワイヤーフレーム、レイアウト動作、フォルダ構成、フロントエンド実装詳細（ルート、型、Zodスキーマ、サービス層、フック）を削除（UI要素のみ）。 |
| 4.0 | 2026-08-10 | ソフトウェアアーキテクト | 削除は別モジュールで処理されるため、商品詳細のスコープからお気に入り削除セクションおよび削除関連の参照をすべて削除。有効プロモーション表示セクション（残数を含む）を追加。データベーステーブル参照を修正（DB設計に`cart_items`テーブルは存在しない — `promotions` / `order_items`に置換）。 |
| 5.0 | 2026-08-14 | ソフトウェアアーキテクト | DB設計書v2.0に整合。CUID参照をすべてUUIDに置換（全PKが`gen_random_uuid()`を使用）。マーチャントデータモデルを`merchants`テーブル参照に更新（表示名は`name`ではなく`shopName`）。お気に入りテーブル名を`wishlists`から`wishlist`（単数形）に修正、制約/インデックス名も修正。検証済み購入チェックを`delivered`注文ステータス（DB設計の終端状態）を使用するよう明確化。すべてのJSON例とPrismaクエリを更新。 |
| 5.1 | 2026-08-17 | ソフトウェアアーキテクト | DB設計書v2.2 / 要件定義書v1.7 / 開発ルールv2.1に整合。カート機能を新しい`carts`および`cart_items`テーブル参照に更新（`order_items`参照をカート操作に置換）。カートライフサイクルルール（B-CART-008~014）を追加。データベーストレーサビリティセクションに`carts`および`cart_items`テーブルを追加。レビュー管理用に`review_reports`テーブル参照を追加。注：カートおよびお気に入りセクションは他のチームが管理するため変更なし。 |
| 6.0 | 2026-08-20 | ソフトウェアアーキテクト | DB設計書v2.4 / 要件定義書v2.10 / 開発ルールv2.1に整合。すべてのバージョン参照を最新版に更新（DB設計書v2.2→v2.4、要件定義書v1.7→v2.10）。プロモーション割引型バリデーション用に`discount_types`ルックアップテーブル参照を追加（BR-PROD-018）。DB設計書v2.4の`password_reset_tokens`、`order_status_history`、`inventory_transactions`テーブルをデータベーストレーサビリティに追加。設定項目キーを`VITE_API_URL`から`VITE_API_BASE_URL`に修正。文書メタデータを更新。 |
| 7.0 | 2026-08-21 | ソフトウェアアーキテクト | サイドバー広告表示機能を要件定義書v2.10 §5.3/§5.7（「商品詳細サイドバー」配置）に基づき追加：UC-PROD-008、ビジネスルールBR-PROD-020~023（承認済み/支払済み/アクティブのみ表示、配置ターゲティング、ローテーションルール、拒否処理）、UI要素EL-19、動作§6.8（`GET /api/v1/products/:slug/advertisements`）、出力仕様§7.8、設定項目（`ADVERTISEMENT_SLIDER_ROTATION_MS`、`AD_SIDEBAR_MAX_PER_ROTATION`）、および`advertisements`、`ad_fee_settings`、`ad_payments`テーブルのデータベーストレーサビリティ。オープン項目をフラグ：`advertisements`テーブルに`placement`/`tier`列が存在しない — 購入レコード経由のリンクをDBチームに確認する必要あり（SKM-DEV-001 §13）。広告の購入/承認ワークフローはAdsモジュールの管轄のまま。 |
| 7.1 | 2026-08-24 | ソフトウェアアーキテクト | サインアップ/ログイン仕様書（`SKM-SIS-SCR-001`）の形式および画面項目設計書v1.10に合わせるため、パンくずリストUI要素（EL-01）を削除：§5.1.1のEL-01行、§12.2のパンくずナビゲーション行、データベーストレーサビリティ（§15.2）のパンくず表記、実装チェックリストのパンくず項目を削除。相互参照の安定性のため、残りの要素IDは維持。 |
| **8.0** | **2026-10-21** | **ソフトウェアアーキテクト** | **ソースコードと突合。** ルートは`/products/:id`（UUID\|slug\|SKU、`ProductsService.resolveProduct`で解決）。レビュー・類似・広告・`can-review`はすべて`BuyerProductsController`（`/products/:idOrSlug/...`）に所在。存在しない`/recommendations/similar/:productId`、`/products/:slug/promotions`、`/products/:slug/advertisements`（独立コントローラ）を削除。プロモーションは**商品詳細レスポンスに組み込み**（`balance`フィルタ/フィールドなし）。新規レビューは`status='pending'`で作成（管理）、集計は`approved`のみ。未配送購入は**400**（422ではない）。`can-review`（§6.2、UC-PROD-009）を追加。レビュー報告はJWTのみ（buyerロール不要）、`detail`フィールド、重複は409。広告配置は`ad_fee_settings`経由の`productDetail_page_banner`（オープン項目解消）。コンポーネントパスを`features/buyer/products/**`に修正。 |

---

## 目次

1. [機能概要](#1-機能概要)
2. [ユースケースとビジネスワークフロー](#2-ユースケースとビジネスワークフロー)
3. [状態遷移仕様](#3-状態遷移仕様)
4. [ビジネスルール](#4-ビジネスルール)
5. [画面仕様](#5-画面仕様)
6. [機能動作仕様](#6-機能動作仕様)
7. [入出力仕様](#7-入出力仕様)
8. [入力バリデーションルール](#8-入力バリデーションルール)
9. [エラー処理仕様](#9-エラー処理仕様)
10. [権限とアクセス制御](#10-権限とアクセス制御)
11. [リアルタイム通知動作](#11-リアルタイム通知動作)
12. [画面遷移仕様](#12-画面遷移仕様)
13. [非機能要件](#13-非機能要件)
14. [設定項目（外部定義）](#14-設定項目外部定義)
15. [クロスリファレンストレーサビリティマトリクス](#15-クロスリファレンストレーサビリティマトリクス)
16. [付録A: 実装チェックリスト](#16-付録a-実装チェックリスト)

---

## 1. 機能概要

### 1.1 目的と範囲

本画面は、画像ギャラリー、価格、肌タイプ適合性、成分、販売者/ショップ情報、レビュー、関連商品を含む単一商品の完全な情報を購入者に表示します。購入者のジャーニーにおける主要なコンバージョンポイントであり、カートへの商品追加とお気に入り管理のアクションを提供します。

本サブシステムは、アクティブな商品のみが表示され（ルール4.2.1）、カート挿入前に常に在庫状況が検証され（ルール4.2.2）、メイン画像がカバー画像ルールに従い（ルール4.2.3）、レビューが購入済みユーザーのみに制限され、ユーザーごと・商品ごとにレビューが1件のみであること（ルール4.4.1）を保証する責任を負います。

### 1.2 機能責務

本画面は以下のコア機能領域を担当します：

1. **商品詳細表示** — 単一商品の名前、説明、価格、比較価格、SKU、在庫、タグ、成分、カテゴリー、販売者、ショップの表示。
2. **画像ギャラリー** — サムネイルナビゲーション付き複数画像。最初の画像がメイン/カバー画像（ルール4.2.3）。
3. **レビュー** — 承認済みレビューのページネーション付き表示（レーティング付き）、新規レビューの作成（購入済みユーザーのみ）。
4. **肌タイプ適合性** — 商品がマッチする肌タイプの表示。
5. **関連商品** — カテゴリー、肌タイプ、タグに基づく「類似商品」カルーセル/グリッド。
6. **カートに追加** — 数量指定で商品をカートに追加（在庫のアトミック検証対象）。
7. **お気に入り管理** — 楽観的UI更新によるお気に入りへの商品追加（お気に入りからの削除/削除処理は専用のお気に入り画面/モジュールで行われ、本画面のスコープ外）。
8. **有効プロモーション表示** — 商品の販売者の有効プロモーション（クーポンコード、割引、有効期間）、残数（`max_uses - used_count`）を含む表示（ルールBR-PROD-018対象）。
9. **広告バナー表示** — `productDetail_page_banner`配置（REQUIREMENT_SPEC §5.3/§5.7）向けに購入された、承認済み・支払済み・アクティブ・有効期間内の広告を表示（ルールBR-PROD-020~023対象）。配置/tierは`ad_fee_settings.placement`経由で解決。CTAは内部ナビゲーション（`/buyer/products/{sku}`）。広告の購入・支払い・承認ワークフローはAdsモジュール（販売者/管理者）で処理され、本画面のスコープ外。本画面は適格な広告のみを表示。

### 1.3 対象ユーザー

| 属性 | 値 |
|-----------|-------|
| **主要アクター** | 購入者（認証済みおよび未認証の訪問者） |
| **認証要件** | なし（商品表示、レビュー表示）。JWT Bearer Token（レビュー投稿、お気に入りトグル、カート追加） |
| **データ範囲** | 単一商品レコード（公開）。自身のレビュー、自身のお気に入りメンバーシップ、自身のカート（認証済み） |

### 1.4 他の機能および周辺システムとの関係

```text
┌──────────────────────────┐      ┌─────────────────────────────────────┐
│   Buyer Actor            │      │     products / categories           │
│   (Browses Product)      ├─────►│  Reads product & category data      │
└────────────┬─────────────┘      └──────────────┬──────────────────────┘
             │                                   │ Reads
             ▼                                   ▼
  ┌───────────────────────┐
  │  Product Detail Page  │
  │  (React Frontend)     │  TanStack Query (staleTime: 0, refetch on mount)
  └───────────┬───────────┘
              │
     ┌────────┼──────────────────────┬──────────────────────┐
     ▼        ▼                      ▼                      ▼
┌──────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
│ Products /   │  │ Reviews Module       │  │ Wishlist / Cart      │
│ Matching     │  │ (verified purchase,  │  │ Modules (RBAC buyer) │
│ Modules      │  │  rating recalc)      │  │                      │
└──────────────┘  └──────────────────────┘  └──────────────────────┘
```

### 1.5 入力/出力

| 入力情報 | データカテゴリ | ソース/説明 |
|-------------------|---------------|----------------------|
| `:idOrSlug` | URLパスパラメータ | 商品詳細を解決するために使用（UUID、slug、またはSKU — `resolveProduct`） |
| `page`, `limit`, `sortBy` | クエリパラメータ | レビューリストのページネーション + 並び替え |
| `limit` | クエリパラメータ | 類似商品の件数（デフォルト4、UIは8送信） |
| `rating`, `title`, `body`, `images` | ユーザー入力 | レビューフォームから送信されるレビューコンテンツ（`images`はDTOのみ、UIにアップロードなし） |
| `reason`, `detail` | ユーザー入力 | レビュー報告ペイロード |
| `quantity` | ユーザー入力 | 「カートに追加」ステッパーで選択された数量 |

| 出力情報 | データカテゴリ | 宛先/説明 |
|--------------------|---------------|---------------------------|
| `product` | 商品詳細DTO | カテゴリー、販売者、組み込み`promotions[]`、`ratingBreakdown[]`を含む完全な商品詳細 |
| `reviews` | `{items,total,page,limit,totalPages}` | 承認済みレビューのフラットページネーション |
| `canReview` | 資格DTO | `{ canReview, reason }` |
| `similarProducts` | 類似商品DTO配列（bare） | 「類似商品」セクション用の関連商品 |
| `advertisement` | 広告DTO配列（bare） | `productDetail_page_banner`配置の適格広告（最大5件、tier順） |
| `review` / `report` | DTO | 作成レビュー（`pending`）/ 報告 |
| `cart` | カートDTO | カートへの商品追加結果 ⚠️ Cartチーム |
| `wishlist` | お気に入りDTO | お気に入り追加結果 ⚠️ Wishlistチーム |

### 1.6 関連文書

| No. | 文書ID | 文書名 | ファイルパス/参照 | 備考 |
|-----|-------------|---------------|----------------------|---------|
| 1 | SKM-REQ-001 | 要件定義書（v2.10） | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | ビジネスワークフロー論理、必須フィールド、ルール（ルール4.2.x、4.4.x、B-CART-008~014）。 |
| 2 | SKM-DBS-001 | データベース設計書（v2.4） | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | テーブル構造（`products`、`reviews`、`wishlist`、`promotions`、`carts`、`cart_items`、`review_reports`、`discount_types`、`password_reset_tokens`、`order_status_history`、`inventory_transactions`）、UUID PK、`merchants`テーブル、制約。 |
| 3 | SKM-DEV-001 | 開発ルール（v2.1） | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` | セキュリティルール、デザイントークン、エラーレスポンス。 |

---

## 2. ユースケースとビジネスワークフロー

### 2.1 ユースケースカタログ

| UC-ID | ユースケース名 | 前提条件 | 結果条件 | 発行アクター |
|-------|---------------|--------------|---------------|------------------|
| UC-PROD-001 | 商品詳細を表示 | 商品がアクティブで、販売者の`license_status = 'approved'`。 | ギャラリー、価格、成分、販売者、組み込みプロモーション、`ratingBreakdown`付きの完全な商品詳細が表示される。 | 訪問者 / 購入者 |
| UC-PROD-002 | レビューを表示 | 商品が存在する。 | レーティングサマリー付きの承認済みレビューがページネーションで表示される。 | 訪問者 / 購入者 |
| UC-PROD-003 | レビューを投稿 | ユーザーが`buyer`として認証済みで、配送済み（delivered）注文に商品を含む。既存レビューなし。 | レビューが`status='pending'`で作成され、`avg_rating` / `review_count`（`approved`のみ）が再計算され、管理者に通知される。 | 購入者 |
| UC-PROD-004 | 類似商品を表示 | 商品が存在する。 | 「類似商品」セクションに類似商品が表示される（limit=8）。 | 訪問者 / 購入者 |
| UC-PROD-005 | お気に入りに追加 | ユーザーが`buyer`として認証済み。商品がお気に入りに未登録。 | お気に入りアイテムが作成される（ユニーク`userId + productId`）。 | 購入者 |
| UC-PROD-006 | 商品をカートに追加 | ユーザーが`buyer`として認証済み。商品が在庫あり。 | カートアイテムが在庫の再検証付きで挿入またはマージされる。 | 購入者 |
| UC-PROD-007 | プロモーションを表示 | 商品詳細に組み込み`promotions[]`にアクティブ&有効期間内のプロモーションがある。 | `promotions[0]`の割引バッジが表示される（コード+割引）。 | 訪問者 / 購入者 |
| UC-PROD-008 | 広告バナーを表示 | 商品が存在。`productDetail_page_banner`配置向けに承認済み・支払済み・アクティブ・有効期間内の広告が配信中。 | スポンサーバーカルーセルが表示される（ローテーションあたり最大5件、5秒で自動ローテーション、内部ナビゲーション）。 | 訪問者 / 購入者 |
| UC-PROD-009 | レビュー資格を確認 | 認証済みbuyer。 | `{ canReview, reason }`が送信ボタンをゲート。 | 購入者 |
| UC-PROD-010 | レビューを報告 | 認証済み（merchantはUIで非表示）。 | 報告が作成（`pending`）。重複は409。管理者通知。 | 購入者 |

### 2.2 主要ビジネスワークフロー

```
                          ┌──────────────────────┐
                          │  Buyer Navigates     │
                          │  to /products/:id    │
                          └──────────┬───────────┘
                                     │
                                     ▼
                    ┌───────────────────────────────┐
                    │  Load Product Detail          │
                    │  (GET /api/v1/products/       │
                    │   :idOrSlug — UUID|slug|SKU)  │
                    └──────────────┬────────────────┘
                       ┌──────────┴───────────┐
                       ▼                      ▼
                 ┌────────────┐        ┌──────────────────┐
                 │  200 OK    │        │  404             │
                 │ Product    │        │ (Not Found /     │
                 │ Detail DTO │        │  Inactive /      │
                 │ (promotions│        │  Unapproved      │
                 │  + breakdown│       │  merchant)       │
                 └─────┬──────┘        └──────────────────┘
                       │
                       ▼
        ┌────────────────────────────────────┐
        │ Load Reviews + Similar + Ads +     │
        │ can-review (if buyer logged in)    │
        └───────────────┬────────────────────┘
                        │
           ┌────────────┼──────────────────┐
           ▼            ▼                  ▼
     ┌─────────────┐ ┌───────────────┐ ┌──────────────────┐
     │ Write       │ │ Add to Cart  │ │ Add to Wishlist  │
     │ Review      │ │ (POST cart/  │ │ (POST             │
     │ (POST       │ │  items)      │ │  wishlist/:id)   │
     │  reviews)   │ └──────┬────────┘ └────────┬─────────┘
     └──────┬──────┘        │                   │
           │               ▼                   ▼
           │        ┌──────────────┐    ┌──────────────────┐
           │        │  Stock       │    │  Duplicate       │
           │        │  Validation  │    │  Check           │
           │        └──────┬───────┘    └────────┬─────────┘
           │               ▼                     ▼
           ▼        ┌──────────────┐    ┌──────────────────┐
    ┌─────────────┐  │ 201 Cart    │    │ 201 Added /      │
    │ 201 Review  │  │ Item Added  │    │ 409 Already In   │
    │ Created     │  └─────────────┘    └──────────────────┘
    │ (pending —  │
    │  moderation)│
    └─────────────┘
```

### 2.3 ワークフロークリティカルパスサマリー

| ステップ | アクション | ステータス（前） | ステータス（後） | 担当 |
|:--------:|--------|---------------|--------------|-------------|
| 1 | 購入者が`/products/:id`（UUID\|slug\|SKU）に遷移 | 未認証 | — | システム |
| 2 | 商品詳細をロード（組み込みpromotions/ratingBreakdown、ライセンスゲート） | — | 商品表示 | システム |
| 3 | レビュー、類似商品、広告、`can-review`資格をロード | — | 全セクションロード完了 | システム |
| 4 | 購入者が数量を選択 | — | — | 購入者 |
| 5 | 購入者がカートに追加 | 在庫あり | カートアイテム作成 | システム |
| 6 | 購入者がレビューを投稿（認証済み、配送済み購入） | 資格あり | レビュー作成（`pending`）、レーティング更新 | システム |
| 7 | 購入者がお気に入りに追加 | — | お気に入り更新 | システム |
| 8 | 購入者がレビューを報告 | — | 報告作成（`pending`） | システム |

### 2.4 カバーされる関連要件

| 要件ID | 要件概要 |
|----------------|---------------------|
| B-PROD-001 | 商品詳細に画像、説明、価格、成分を表示 |
| B-PROD-002 | 商品詳細にギャラリー表示の複数画像を表示 |
| B-PROD-003 | 商品詳細にレーティング付きレビューを表示 |
| B-PROD-004 | ユーザーはレビューを投稿可能（ログイン必須） |
| B-PROD-005 | 商品詳細に関連商品を表示 |
| B-PROD-006 | 商品詳細に肌タイプ適合性を表示 |
| B-PROD-007 | 商品詳細に平均レーティングとレビュー件数を表示 |
| B-CART-001 | ユーザーは商品をカートに追加可能 |
| B-WISH-001 | ユーザーは商品をお気に入りに追加可能 |
| B-MATCH-006 | システムは「あなたへのおすすめ」セクションを表示 |

---

## 3. 状態遷移仕様

### 3.1 商品の在庫状態

| 状態 | 説明 | 商品詳細に表示 | カートに追加可能 |
|-------|-------------|:---------------------------:|:---------------:|
| `IN_STOCK` | `stock_quantity > 0` | ✓ | ✓ |
| `LOW_STOCK` | `stock_quantity <= low_stock_threshold` | ✓（警告表示） | ✓ |
| `OUT_OF_STOCK` | `stock_quantity = 0`（ルール4.2.2） | ✓（CTA無効） | ✗ |
| `INACTIVE` | `is_active = false`（ルール4.2.1） | ✗（404） | ✗ |

### 3.2 お気に入りアイテムの状態

| 状態 | 説明 | 追加可能 |
|-------|-------------|:-------:|
| `NOT_IN_WISHLIST` | ユーザー+商品のお気に入りレコードなし | ✓ |
| `IN_WISHLIST` | お気に入りレコードあり（ユニーク`user_id + product_id`） | ✗（409） |

> 注記：お気に入りの削除/削除処理（`ITEM_REMOVED`状態）は専用のお気に入り画面/モジュールで行われ、本画面のスコープ外です。

### 3.3 カートアイテムの状態

| 状態 | 説明 | 許可 |
|-------|-------------|:-------:|
| `NEW_ITEM` | 商品が初めてカートに追加される | ✓ |
| `QUANTITY_MERGED` | 既存ラインナンバーが増加 | ✓ |
| `STOCK_EXCEEDED` | 要求数量が`stock_quantity`を超過 | ✗（400） |
| `OUT_OF_STOCK` | `stock_quantity = 0` | ✗ |

### 3.4 レビューの状態

| 状態 | 説明 | 購入者に表示 |
|-------|-------------|:---------------:|
| `PENDING` | 送信済み、モデレーション待ち（作成時のデフォルト） | ✗（一覧エンドポイントは`approved`のみを返し、`@Public()`でユーザー単位の絞り込みもないため、作者本人にも非表示） |
| `APPROVED` | 管理者モデレーション（`POST /admin/reviews/:id/moderate`）により承認。**作成時のデフォルトは`pending`** | ✓ |
| `REJECTED` | 管理者モデレーションにより削除 | ✗ |

| 遷移ID | 遷移元状態 | 遷移先状態 | トリガーアクション | ガード条件 |
|---------------|--------------|--------------|----------------|------------------|
| TR-PROD-01 | `NOT_IN_WISHLIST` | `IN_WISHLIST` | お気に入りに追加 | 認証済み購入者、商品が存在 |
| TR-PROD-02 | `IN_STOCK` / `LOW_STOCK` | `STOCK_EXCEEDED` | カートに追加 | `requested > stock_quantity` |
| TR-PROD-03 | `IN_STOCK` | `OUT_OF_STOCK` | 在庫が0に | ルール4.2.2 |
| TR-PROD-04 | `PENDING` | `APPROVED` / `REJECTED` | 管理者モデレーション | 管理者アクション（`POST /admin/reviews/:id/moderate`） |

---

## 4. ビジネスルール

### 4.1 商品表示ルール

| ルールID | ルール名 | 説明 | 強制レイヤー |
|---------|-----------|-------------|-------------------|
| BR-PROD-001 | アクティブのみ | `is_active = true`の商品のみ詳細エンドポイントから返却。 | バックエンド（クエリフィルター） |
| BR-PROD-002 | カバー画像 | `images`の最初の画像がメイン/カバー画像（ルール4.2.3）。 | バックエンド（データモデル）+ フロントエンド（ギャラリー順序） |
| BR-PROD-003 | 価格表示 | 比較価格は存在時、取り消し線+絶対額の「Save {diff} MMK」バッジで表示（%ではない）。通貨はMMK。 | フロントエンド（`ProductInfo`） |
| BR-PROD-004 | 在庫表示 | 在庫状態を表示。在庫切れまたは数量が在庫超過時は「カートに追加」を無効化。 | フロントエンド + バックエンド |

### 4.2 レビュールール

| ルールID | ルール名 | 説明 | 強制レイヤー |
|---------|-----------|-------------|-------------------|
| BR-PROD-005 | 購入済みユーザーのみ | 配送済み（`statusCode = 'delivered'`）注文に商品を含む購入者のみレビュー可能（ルール4.4.1）。`canReview`と`createReview`の両方でチェック。 | バックエンド（`findDeliveredOrderItem`） |
| BR-PROD-006 | 商品あたりレビュー1件 | `(user_id, product_id)`のユニーク制約`uq_reviews_user_product`。 | バックエンド（DB制約+ConflictException） |
| BR-PROD-007 | レーティング範囲 | レーティングは1〜5（ルール4.4.2、`chk_reviews_rating`）。 | バックエンド（DTO+DBチェック） |
| BR-PROD-008 | モデレーション | 新規レビューは`status='pending'`で作成され、管理者アクション（`/admin/reviews/:id/moderate`）でのみ公開（`approved`）される。公開一覧は`status='approved'`でフィルター。 | バックエンド + 管理者モジュール |
| BR-PROD-009 | 集計 | `status='approved'`のレビューのみで`avg_rating` / `review_count`を再計算。 | バックエンド（aggregate） |
| BR-PROD-009a | 管理者通知 | レビュー作成時に全管理者に`REVIEW_CREATED`通知を作成（失敗しても非致命）。 | バックエンド（`notifyAdminsOfReviewCreated`） |

### 4.3 カート＆在庫ルール

| ルールID | ルール名 | 説明 | 強制レイヤー |
|---------|-----------|-------------|-------------------|
| BR-PROD-010 | 在庫管理 | 在庫切れ商品（`stock_quantity = 0`）はカートに追加不可（ルール4.2.2）。 | バックエンド（アトミック検証）+ フロントエンド（CTA無効） |
| BR-PROD-011 | 数量チェック | バックエンドが挿入時に在庫をアトミックに再検証。 | バックエンド（カートサービス） |
| BR-PROD-012 | 在庫少警告 | `stock_quantity <= low_stock_threshold`時に警告を表示。 | フロントエンド |

### 4.4 お気に入りルール

| ルールID | ルール名 | 説明 | 強制レイヤー |
|---------|-----------|-------------|-------------------|
| BR-PROD-013 | お気に入りユニーク性 | `(user_id, product_id)`のユニーク制約`uq_wishlist_user_product` — テーブル名は`wishlist`（単数形）。 | バックエンド（DB制約） |
| BR-PROD-014 | 重複処理 | 重複追加は409「商品は既にお気に入りにあります」を返却。 | バックエンド（サービスチェック） |

### 4.5 セキュリティルール

| ルールID | ルール名 | 説明 | 強制レイヤー |
|---------|-----------|-------------|-------------------|
| BR-PROD-015 | 更新時のRBAC | レビュー、お気に入り、カートの更新には`buyer`ロールが必要。 | バックエンド（JwtAuthGuard + RolesGuard） |
| BR-PROD-016 | キャッシュ | `getDetail`にRedis read-throughキャッシュは実装されていない。フロントエンドはTanStack Queryを使用（`staleTime: 0`、マウント時に再取得）。 | バックエンド + フロントエンド |
| BR-PROD-017 | XSS / HTML説明 | 商品`description`は`dangerouslySetInnerHTML`でHTMLとしてレンダリングされる。コンテンツは販売者/管理者作成・上流で管理済み。サニタイズ/CSPの期待値はSKM-DEV-001に従い追跡（BR-PROD-017 follow-up）。レビュー本文はReactにより自動エスケープ。 | フロントエンド（追跡項目） |

### 4.6 有効プロモーションルール

| ルールID | ルール名 | 説明 | 強制レイヤー |
|---------|-----------|-------------|-------------------|
| BR-PROD-018 | 有効プロモーション表示 | 商品詳細レスポンスに`merchant_id = product.merchantId`、`is_active = true`、`starts_at <= now()`、`expires_at >= now()`のプロモーションを組み込み（ルール4.5.1）。**サーバー側の残数（`balance > 0`）フィルタは適用しない。** `discount_type_code`は`discount_types`ルックアップテーブルの値（`percentage`または`fixed`）のみ。 | バックエンド（`getDetail`） |
| BR-PROD-019 | プロモーション残数表示 | `max_uses` / `usedCount`は返却されるが、計算済み`balance`フィールドは**存在しない**。マウントされたUIは`promotions[0]`の割引バッジのみ表示する。リッチな`ActivePromotionCard`（残数/有効期限/コードコピー）は実装されているが現在は未マウント。 | フロントエンド（部分実装） |

### 4.7 サイドバー広告ルール

| ルールID | ルール名 | 説明 | 強制レイヤー |
|---------|-----------|-------------|-------------------|
| BR-PROD-020 | 承認済み＆支払済み＆アクティブのみ | `approval_status = 'approved'`、`payment_status = 'completed'`、`is_active = true`、かつ`starts_at` / `expires_at`の有効期間内の広告のみ表示（REQ §5.3「承認必須」、§7.6「投稿前に支払い必須」）。拒否された広告はすべてのローテーションから除外。期限切れまたは非アクティブな広告も除外。 | バックエンド（クエリフィルター） |
| BR-PROD-021 | 配置ターゲティング | `productDetail_page_banner`配置（`advertisements.fee_setting` → `ad_fee_settings.placement`、有効なフィースタッティング）向けに購入された広告のみ商品詳細に表示。**オープン項目解消：** 配置/tierは`advertisements`列ではなく`ad_fee_settings.placement`/`tier`の関連（`feeSetting`include）経由で解決。 | バックエンド（`feeSetting`include） |
| BR-PROD-022 | ローテーションルール | スライダーローテーションで表示される広告は最大5件。優先順位はPremium＞Standard＞Basic。同じtier内の広告はラウンドロビンでローテーション。スライダーは5秒ごとに自動ローテーション（REQ §5.3）。 | バックエンド（並び順）+ フロントエンド（スライダー） |
| BR-PROD-023 | スポンサー表示とリンク安全性 | 広告カードはデフォルトの「SPONSORED」バッジ（announcementMessageがあれば上書き）を表示。CTAは**内部ナビゲーション**（`/buyer/products/{sku}`→`fallbackProductId`→`linkUrl`）で、絶対`http(s)` URLは`window.location.assign`。この画面に外部`sponsored` new-tabリンクは存在しない。 | フロントエンド（`AdBannerSlider`） |

---

## 5. 画面仕様

### 5.1 画面：商品詳細ページ（`/products/:id` — UUID|slug|SKU）

**目的：** アクティブな単一商品を完全な情報とコンバージョンアクション付きで表示する。`/buyer/products/:id`、`/wishlist/products/:id`、`/merchant/products/:id/view`にもマウント。

#### 5.1.1 UI要素

| 要素ID | 要素名 | 要素タイプ | i18nキー | 必須 | 説明 |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-02 | メイン画像 | 画像 | — | はい | メイン画像（`images[0]`、ルール4.2.3） |
| EL-03 | サムネイル | 画像リスト | — | いいえ | クリックでメイン画像を切り替え |
| EL-04 | 商品名 | テキスト | — | はい | 商品名 |
| EL-05 | レーティングサマリー | レーティングウィジェット | `product.rating` | はい | `★ 4.5（32件のレビュー）` — 平均レーティング+件数 |
| EL-06 | 価格 | テキスト | — | はい | 現在価格 |
| EL-07 | 比較価格 + Saveバッジ | テキスト（取り消し線）+ バッジ | — | いいえ | 取り消し線の元価格+絶対額「Save {diff} MMK」バッジ（%ではない） |
| EL-08 | 在庫状態 | テキスト / バッジ | `product.stock` | はい | 「在庫あり（45）」「在庫切れ」/ 在庫少警告 |
| EL-09 | SKU | テキスト | — | いいえ | ストックキーピングユニット |
| EL-10 | 肌タイプ適合性 | バッジグループ | `product.skinType` | はい | 例：[乾燥肌] [敏感肌] [普通肌] |
| EL-11 | 数量ステッパー | 数値入力 | — | いいえ | `[ - ] 数量 [ 1 ] [+]` |
| EL-12 | カートに追加ボタン | ボタン（プライマリ） | `product.addToCart` | はい | 在庫切れ / 数量が在庫超過時は無効 |
| EL-13 | お気に入りに追加ボタン | ボタン（アイコン+ラベル） | `product.wishlist` | いいえ | 全幅ラベル付きボタン。追加済みはピンク「Added to Wishlist」表示。状態はお気に入りリストから導出（追加のみ。削除はお気に入り画面/モジュールで処理） |
| EL-14 | 販売者 | テキスト | `product.soldBy` | いいえ | 「Sold by {shopName}」のプレーンテキスト（ショップへのリンクなし） |
| EL-15 | 商品タブ | タブ | — | いいえ | 説明 / 成分 / レビュー（件数）。`#reviews`ディープリンク |
| EL-16 | レビューフォーム | フォーム | — | いいえ | レーティングスター、タイトル、本文。`can-review`ゲーティング+ログインゲーティング |
| EL-17 | 類似商品 | カードグリッド | `product.related` | いいえ | 「類似商品」セクション（limit=8） |
| EL-18 | プロモーション割引バッジ | バッジ | `product.promotions` | いいえ | 組み込み`promotions[0]`からの割引バッジ（「{code}: {value}% off」/「{code}: {amount} off」）。merchant-viewでは非表示 |
| EL-19 | 広告バナースライダー | 広告カルーセル（共有`AdBannerSlider`） | `product.ads` | いいえ | `productDetail_page_banner`配置のスポンサー広告：ローテーションあたり最大5件、5秒ごとに自動ローテーション、優先順位Premium＞Standard＞Basic（REQ §5.3）。適格な広告がない場合は非表示 |
| EL-20 | 戻るボタン | アイコンボタン | — | はい | `navigate(-1)` |
| EL-21 | モバイル固定CTAバー | 固定コンテナ | — | いいえ | `md:hidden`。数量+カート+お気に入り。訪問者/購入者のみ表示 |

**デフォルト状態：**
- メイン画像は`images[0]`を表示。すべての非同期セクションにスケルトンローダー。`images`が空の場合はプレースホルダー`/placeholder-product.png`。
- 商品ロード完了まで「カートに追加」は無効。`stockQuantity <= 0`の場合も無効。
- 未認証時はレビューフォーム非表示（代わりにログインプロンプト表示）。
- merchant-view（`user.role === 'merchant'`）では、広告バナー、購入アクション、プロモーションバッジ、販売者表示、説明/成分タブ、類似商品を非表示（プレビューモード）。
- 商品の販売者にアクティブプロモーションがない場合、割引バッジは非表示。
- `productDetail_page_banner`配置向けに承認済み、支払済み、アクティブな広告がない場合、広告バナースライダーは非表示。スライダーはホバー/フォーカス/`prefers-reduced-motion`時に一時停止。

---

## 6. 機能動作仕様

### 6.1 動作：商品詳細を表示

| 属性 | 仕様 |
|-----------|---------------|
| **トリガー** | 訪問者/購入者が`/products/:id`に遷移 |
| **APIエンドポイント** | `GET /api/v1/products/:idOrSlug` |
| **リクエストContent-Type** | `application/json`（レスポンス） |
| **パスパラメータ** | `:idOrSlug` — UUID、slug、またはSKU（`ProductsService.resolveProduct`で解決） |
| **処理ステップ** | 1. `resolveProduct`：UUID → `{ id, isActive:true }`、それ以外 → `{ isActive:true, OR:[{slug},{sku}] }`。2. `category {id,name,slug}`、`merchant {id,shopName,licenseStatus}`を含める。3. 見つからなければ404。4. `merchant.licenseStatus !== 'approved'`なら404。5. 並行して、アクティブ&有効期間内の`promotions[]`（merchantId基準）と`ratingBreakdown`（`status='approved'`のgroupBy rating、星5→1にマップ）をロード。6. `{...product, promotions, ratingBreakdown}`を返却。 |
| **成功レスポンス** | 商品詳細（組み込みpromotions/ratingBreakdown）付き200 OK（§7.3参照） |
| **エラーレスポンス** | 404 商品が見つからない/非アクティブ/販売者未承認 |
| **後続アクション** | レビュー、類似商品、広告バナー、`can-review`資格を並行ロード |

**バックエンド処理フロー：**

```
resolveProduct(idOrSlug)
  → isUuid ? { id, isActive:true } : { isActive:true, OR:[{slug},{sku}] }
  → Include category {id,name,slug}, merchant {select: id, shopName, licenseStatus}
  → If product not found → NotFoundException
  → If merchant.licenseStatus !== 'approved' → NotFoundException
  → Promise.all([
      promotions: where merchant_id = product.merchantId AND is_active = true
                  AND starts_at <= now() AND expires_at >= now()   (no balance filter)
      ratingBreakdown: review.groupBy(rating) where status = 'approved' → stars 5→1
    ])
  → Return { ...product, promotions, ratingBreakdown }
```

### 6.2 動作：レビュー一覧表示

| 属性 | 仕様 |
|-----------|---------------|
| **トリガー** | レビュータブがロード / ページ変更 |
| **APIエンドポイント** | `GET /api/v1/products/:idOrSlug/reviews` |
| **リクエストContent-Type** | `application/json`（レスポンス） |
| **クエリ** | `page`（最小1、デフォルト1）、`limit`（1〜50、デフォルト20・UIは10送信）、`sortBy`（`newest\|oldest\|highest\|lowest`、デフォルト`newest`） |
| **処理ステップ** | 1. `resolveProduct`。2. `status = 'approved'`のレビューを`productId`でクエリ。3. `user {id, name}`を含める（`avatarUrl`は不含）。4. `sortBy`で並び替え。5. ページネーション。6. `{items, total, page, limit, totalPages}`（フラット形状）を返却。 |
| **成功レスポンス** | フラット形状のページネーション付き200 OK（§7.2参照） |
| **エラーレスポンス** | 404 商品が見つからない。400 `page`/`limit`/`sortBy`無効 |
| **後続アクション** | レーティングサマリーとレビュー一覧を描画 |

**バックエンド処理フロー：**

```
resolveProduct(idOrSlug)
  → BuyerProductsController.findReviews (@Public)
    → Query reviews where productId = ... AND status = 'approved'
    → Include user { id, name }   (no avatarUrl in select)
    → Order by sortBy (newest default)
    → Paginate (limit default 20, max 50)
    → Flatten meta → return { items, total, page, limit, totalPages }
```

### 6.3 動作：レビューを投稿

| 属性 | 仕様 |
|-----------|---------------|
| **トリガー** | レビューフォームの「レビューを投稿」 |
| **APIエンドポイント** | `POST /api/v1/products/:idOrSlug/reviews` |
| **リクエストContent-Type** | `application/json` |
| **送信前バリデーション** | `CreateReviewDto`（rating 整数1〜5、title ≤255、body ≤5000、images ≤5 URL、class-validator）。UIはrating/body必須、画像アップロードUIなし |
| **処理ステップ** | 1. JWT + `buyer`ロールを検証。2. `resolveProduct`。3. 配送済み購入（`statusCode = 'delivered'`の注文に商品を含む、ルール4.4.1）を確認、なければ400。4. 既存レビュー（`userId_productId`）をチェック、あれば409。5. `status='pending'` + `is_verified_purchase = true`でレビューを作成。6. `approved`レビューのみで`avg_rating` / `review_count`を再計算。7. 管理者に`REVIEW_CREATED`通知（失敗しても非致命）。8. 作成レビュー（`status`含む）を返却。 |
| **成功レスポンス** | レビューDTO（`status='pending'`）付き201 Created |
| **エラーレスポンス** | 400 配送済みでない/バリデーション。401 未認証。403 購入者でない。404 商品が見つからない。409 重複レビュー |
| **後続アクション** | レビュー/can-review/商品詳細クエリを無効化。成功トースト「レビューは承認待ちです」 |

**バックエンド処理フロー：**

```
JwtAuthGuard + RolesGuard(buyer) validate access token
  → BuyerProductsController.createReview → ProductsService.createReview()
    → resolveProduct(idOrSlug)
    → Verify user has a delivered order (statusCode = 'delivered') containing the product (Rule 4.4.1)
      → If not → BadRequestException (HTTP 400, not 422)
    → Check unique userId_productId for existing review
      → If exists → ConflictException (409)
    → Create review with status = 'pending', is_verified_purchase = true
    → Aggregate avg_rating / review_count over status = 'approved' only
    → Product.update({ avgRating, reviewCount })
    → notifyAdminsOfReviewCreated()  // REVIEW_CREATED, non-fatal
    → Return review DTO (with status)
```

### 6.4 動作：関連商品を表示

| 属性 | 仕様 |
|-----------|---------------|
| **トリガー** | 商品詳細ページが「類似商品」セクションをロード（非merchant） |
| **APIエンドポイント** | `GET /api/v1/products/:idOrSlug/similar` |
| **リクエストContent-Type** | `application/json`（レスポンス） |
| **クエリ** | `limit`（デフォルト4、UIは8送信） |
| **処理ステップ** | 1. `resolveProduct`。2. `id != 対象`、`isActive=true`、`merchant.licenseStatus='approved'`、同一`categoryId`、`skinTypes`が重複（hasSome）の商品をクエリ。3. `avgRating desc`で並び替え。4. `limit`件に制限。5. bare配列（id, name, slug, price, compareAtPrice, images, skinTypes, avgRating, reviewCount, category）を返却。 |
| **成功レスポンス** | bare配列の類似商品カード200 OK（§7.5参照） |
| **エラーレスポンス** | 404 商品が見つからない |
| **後続アクション** | なし（空/エラー時はセクション非表示） |

**バックエンド処理フロー：**

```
resolveProduct(idOrSlug)
  → BuyerProductsController.findSimilar (@Public)
    → Query products where id != target AND isActive = true
        AND merchant.licenseStatus = 'approved'
        AND categoryId = target.categoryId
        AND skinTypes hasSome target.skinTypes
    → Order by avgRating desc
    → Take limit (default 4)
    → Return bare product card array
```

### 6.5 動作：お気に入りに追加

| 属性 | 仕様 |
|-----------|---------------|
| **トリガー** | ♡お気に入り追加（オフ → オン） |
| **APIエンドポイント** | `POST /api/v1/wishlist/:productId` |
| **リクエストContent-Type** | `application/json`（レスポンス） |
| **送信前バリデーション** | 有効なアクセストークン。商品が存在 |
| **処理ステップ** | 1. JWT + ロールを検証。2. 商品の存在を確認。3. ユニーク`(user_id, product_id)`をチェック。4. お気に入りレコードを挿入。5. `WISHLIST_ADDED`をログ。 |
| **成功レスポンス** | お気に入りDTO付き201 Created |
| **エラーレスポンス** | 401 未認証。404 商品が見つからない。409 既にお気に入りに登録済み |
| **後続アクション** | 楽観的UI状態の確定/ロールバック |

> 注記：お気に入りアイテムの削除/削除処理は専用のお気に入り画面/モジュールで行われ、本画面のスコープ外です。

### 6.6 動作：カートに追加

| 属性 | 仕様 |
|-----------|---------------|
| **トリガー** | 選択数量付き「カートに追加」ボタン |
| **APIエンドポイント** | `POST /api/v1/cart/items` |
| **リクエストContent-Type** | `application/json` |
| **送信前バリデーション** | Zodスキーマ（productId、quantity ≥ 1） |
| **処理ステップ** | 1. JWT + ロールを検証。2. 在庫をアトミックに再検証（ルール4.2.2）。3. カートラインを挿入またはマージ。4. `CART_ITEM_ADDED`をログ。 |
| **成功レスポンス** | カートDTO付き201 Created |
| **エラーレスポンス** | 400 在庫不足。401 未認証。422 在庫切れ |
| **後続アクション** | カートバッジカウントを無効化して更新 |

### 6.6a 動作：レビュー資格を確認（`can-review`）

| 属性 | 仕様 |
|-----------|---------------|
| **トリガー** | 認証済みbuyerのレビューフォームがマウント |
| **APIエンドポイント** | `GET /api/v1/products/:idOrSlug/can-review` |
| **ガード** | `JwtAuthGuard + RolesGuard('buyer')` |
| **処理ステップ** | 1. `resolveProduct`。2. `findDeliveredOrderItem(productId, userId)` → なければ `{ canReview:false, reason:'not_delivered' }`。3. 既存レビュー（`userId_productId`）→ `{ canReview:false, reason:'already_reviewed' }`。4. それ以外 → `{ canReview:true, reason:null }`。 |
| **成功レスポンス** | `{ canReview, reason }` 200 OK（§7.2a参照）。`reason`: `'not_delivered' \| 'already_reviewed' \| null` |
| **エラーレスポンス** | 401 未認証。403 購入者でない。404 商品が見つからない |
| **後続アクション** | `canReview`が真の場合のみ送信ボタンを有効化 |

### 6.6b 動作：レビューを報告

| 属性 | 仕様 |
|-----------|---------------|
| **トリガー** | レビューカードのフラグアイコン → ダイアログ送信 |
| **APIエンドポイント** | `POST /api/v1/reviews/:id/report` |
| **ガード** | `JwtAuthGuard`（任意の認証済みロール、`@HttpCode(201)`。buyerロールは不要、merchantはUIで非表示） |
| **送信前バリデーション** | `ReportReviewDto`：`reason`（enum `spam\|inappropriate\|fake\|other`）、`detail?`（≤1000）。リクエストのフィールド名は**`detail`**（保存時は`description`にマップ） |
| **処理ステップ** | 1. レビューが存在することを確認（`findUnique`）、なければ404。2. `(reviewId, reportedBy)`の既存報告をチェック、あれば409。3. `{ status:'pending', description: dto.detail }`で報告を作成。4. 管理者に`REVIEW_REPORTED`通知（失敗しても非致命）。5. 報告を返却。 |
| **成功レスポンス** | 報告DTO 201 Created |
| **エラーレスポンス** | 401 未認証。404 レビューが見つからない。409 既に報告済み（UIは情報トースト「既に報告済み」） |

### 6.7 動作：有効プロモーション表示（商品詳細に組み込み）

> ⚠️ **独立した`GET /products/:slug/promotions`エンドポイントは存在しません。** フロントエンドの`product.service.ts`に`getPromotions`（`/products/:idOrSlug/promotions`）が定義されていますが、バックエンドの`BuyerProductsController`に該当ルートはなく、呼ぶと404になります。プロモーションは**商品詳細レスポンスに`promotions[]`として組み込まれます**（§6.1）。

| 属性 | 仕様 |
|-----------|---------------|
| **トリガー** | 商品詳細取得（§6.1）と同時にロード |
| **APIエンドポイント** | `GET /api/v1/products/:idOrSlug`（`promotions[]`を埋め込み） |
| **データロード** | `merchant_id = product.merchantId AND is_active = true AND starts_at <= now() AND expires_at >= now()`（ルールBR-PROD-018）。**サーバー側の`balance > 0`フィルタはなし。** |
| **出力フィールド** | `id, code, description, discountTypeCode`（`percentage`/`fixed`）、`discountValue, minOrderAmount, startsAt, expiresAt, maxUses, usedCount`。計算済み`balance`フィールドは**なし**。 |
| **UI描画** | `promotions[0]`から商品情報の割引バッジを描画（「{code}: {value}% off」/「{code}: {amount} off」）。`discountTypeCode`により分岐。リッチな`ActivePromotionCard`（残数/有効期限/コードコピー）は存在するが現在はマウントされていない。 |
| **成功レスポンス** | 組み込み`promotions[]`付き商品詳細200 OK（§7.3参照） |
| **エラーレスポンス** | 404 商品が見つからない/非アクティブ/販売者未承認 |

**バックエンド処理フロー（§6.1内）：**

```
getDetail(idOrSlug)
  → resolveProduct, license gate
  → promotion.findMany({
      where: { merchant_id: product.merchantId, is_active: true,
               starts_at: { lte: now }, expires_at: { gte: now } }
    })                    // no balance > 0 filter
  → return { ...product, promotions }
```

### 6.8 動作：広告バナーを表示（`productDetail_page_banner`）

| 属性 | 仕様 |
|-----------|---------------|
| **トリガー** | 商品詳細ページが広告バナースライダーをロード（非merchant） |
| **APIエンドポイント** | `GET /api/v1/products/:idOrSlug/advertisements` |
| **リクエストContent-Type** | `application/json`（レスポンス） |
| **パスパラメータ** | `:idOrSlug` — UUID、slug、またはSKU |
| **処理ステップ** | 1. `resolveProduct` + ライセンスゲート。2. `is_active = true`、`approval_status = 'approved'`、`payment_status = 'completed'`、`starts_at <= now <= expires_at`、かつ`feeSetting.placement = 'productDetail_page_banner'`（有効なフィー設定）の`advertisements`をクエリ（ルールBR-PROD-020/021）。3. `feeSetting {placement, tier}`、`shop {id,name,slug,logoUrl,userId}`を含める。4. フィー設定を持つ広告に絞り、tier優先順位Premium＞Standard＞Basic（`TIER_PRIORITY`）で並び替え、`.slice(0,5)`（ルールBR-PROD-022）。5. 広告ごとにターゲット商品を解決（`sku`→画像ファイル名の順、販売者カタログ照合）→ `{productId, productSlug}`。6. DTO（フラット+ネスト`shop`）を返却。 |
| **成功レスポンス** | bare配列の広告リスト200 OK（§7.6参照）。適格な広告がない場合は空配列（UIはセクション非表示） |
| **エラーレスポンス** | 404 商品が見つからない/販売者未承認 |
| **後続アクション** | 共有`AdBannerSlider`（`placement='productDetail_page_banner'`）を5秒自動ローテーション・ホバー/フォーカス/`prefers-reduced-motion`で一時停止・内部ナビゲーション付きで描画 |

> 注記：広告の購入、支払い、投稿、承認はAdsモジュール（`advertisements`モジュール、販売者/管理者）で処理され、本画面のスコープ外です。ローカルの`SidebarAdvertisements`コンポーネントは存在しますが現在はマウントされておらず、ページは共有`AdBannerSlider`を使用します。

**バックエンド処理フロー：**

```
resolveProduct(idOrSlug) + license gate
  → BuyerProductsController.getAdvertisements (@Public)
    → ProductsService.getSidebarAds()
      → Query advertisements where is_active = true
          AND approval_status = 'approved'
          AND payment_status = 'completed'
          AND starts_at <= now AND expires_at >= now
          AND feeSetting.placement = 'productDetail_page_banner' (active fee setting)
      → Include feeSetting { placement, tier }, shop { id, name, slug, logoUrl, userId }
      → Filter ads having a feeSetting; order by TIER_PRIORITY (premium 3 > standard 2 > basic 1)
      → .slice(0, 5)
      → Resolve target product per ad (by sku, else by image filename) → { productId, productSlug }
      → Return advertisement DTOs (flat + nested shop)
```

---

## 7. 入出力仕様

### 7.1 入力定義 — レビュー作成

| フィールド | 表示名（EN） | 表示名（JA） | データ型と長さ | 必須 | 入力制御 | バリデーション |
|-------|-------------------|-------------------|-------------------|:--------:|---------------|------------|
| `rating` | Rating | 評価 | SMALLINT | はい | スターセレクター | `@IsInt()`, `@Min(1)`, `@Max(5)` |
| `title` | Title | タイトル | VARCHAR(255) | いいえ | 入力（テキスト） | `@IsOptional()`, `@IsString()`, `@MaxLength(255)` |
| `body` | Review Body | レビュー本文 | TEXT (5000) | いいえ | テキストエリア | `@IsOptional()`, `@IsString()`, `@MaxLength(5000)` |
| `images` | Images | 画像 | JSON配列 | いいえ | ファイルアップロード | `@IsOptional()`, `@IsArray()`, `@ArrayMaxSize(5)` |

### 7.2 入力定義 — カートに追加

| フィールド | 表示名（EN） | 表示名（JA） | データ型と長さ | 必須 | 入力制御 | バリデーション |
|-------|-------------------|-------------------|-------------------|:--------:|---------------|------------|
| `productId` | Product ID | 商品ID | VARCHAR(25) | はい | 非表示 | `@IsString()`, `@IsNotEmpty()` |
| `quantity` | Quantity | 数量 | INT | はい | 数値ステッパー | `@IsInt()`, `@Min(1)` |

### 7.3 出力定義 — 商品詳細

| フィールド | データソース | 表示形式 |
|-------|-------------|----------------|
| `id` | `products.id` | UUID文字列 |
| `name` | `products.name` | 文字列 |
| `slug` | `products.slug` | URLフレンドリー文字列 |
| `description` | `products.description` | 文字列またはnull |
| `shortDescription` | `products.short_description` | 文字列またはnull |
| `price` | `products.price` | 10進文字列 |
| `compareAtPrice` | `products.compare_at_price` | 10進文字列またはnull |
| `sku` | `products.sku` | 文字列またはnull |
| `stockQuantity` | `products.stock_quantity` | 整数 |
| `lowStockThreshold` | `products.low_stock_threshold` | 整数 |
| `images` | `products.images` | 文字列配列（最初=カバー） |
| `tags` | `products.tags` | 文字列配列 |
| `skinTypes` | `products.skin_types` | 文字列配列 |
| `ingredients` | `products.ingredients` | 文字列配列 |
| `avgRating` | `products.avg_rating` | 10進文字列（小数1桁） |
| `reviewCount` | `products.review_count` | 整数 |
| `category` | `categories` | ネストオブジェクト：`id`、`name`、`slug`（親なし） |
| `merchant` | `merchants` | ネストオブジェクト：`id`、`shopName`（`merchants.shop_name`から）、`licenseStatus`（`shop`なし） |
| `promotions[]` | `promotions` | アクティブ&有効期間内の組み込みプロモーション配列（§7.3a参照） |
| `ratingBreakdown[]` | `reviews`（`status='approved'`） | `{ star: 5..1, count }`のレーティング内訳 |

**レスポンス例（200）：**

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "name": "Hydrating Facial Serum",
  "slug": "hydrating-facial-serum",
  "description": "<p>Lightweight daily serum with hyaluronic acid...</p>",
  "shortDescription": "24-hour hydration for dry skin",
  "price": 25,
  "compareAtPrice": 32,
  "sku": "SKU-0001",
  "stockQuantity": 45,
  "lowStockThreshold": 10,
  "images": [
    "/uploads/products/uuid/1-full.webp",
    "/uploads/products/uuid/2-full.webp"
  ],
  "tags": ["serum", "hydrating"],
  "skinTypes": ["dry", "sensitive"],
  "ingredients": ["Hyaluronic Acid", "Vitamin E", "Glycerin"],
  "isActive": true,
  "isFeatured": true,
  "avgRating": 4.5,
  "reviewCount": 32,
  "createdAt": "2026-07-01T08:00:00.000Z",
  "category": {
    "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "name": "Serums",
    "slug": "serums"
  },
  "merchant": {
    "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
    "shopName": "Glow Lab",
    "licenseStatus": "approved"
  },
  "promotions": [
    {
      "id": "a7b8c9d0-...",
      "code": "GLOW10",
      "description": "10% off",
      "discountTypeCode": "percentage",
      "discountValue": 10,
      "minOrderAmount": 20,
      "startsAt": "2026-08-01T00:00:00.000Z",
      "expiresAt": "2026-09-30T23:59:59.000Z",
      "maxUses": 100,
      "usedCount": 35
    }
  ],
  "ratingBreakdown": [
    { "star": 5, "count": 20 },
    { "star": 4, "count": 8 },
    { "star": 3, "count": 3 },
    { "star": 2, "count": 1 },
    { "star": 1, "count": 0 }
  ]
}
```

### 7.4 出力定義 — レビュー一覧（フラット形状）

| フィールド | データソース | 表示形式 |
|-------|-------------|----------------|
| `items[].id` | `reviews.id` | UUID文字列 |
| `items[].rating` | `reviews.rating` | 整数1〜5 |
| `items[].title` | `reviews.title` | 文字列またはnull |
| `items[].body` | `reviews.body` | 文字列またはnull |
| `items[].images` | `reviews.images` | 文字列配列 |
| `items[].isVerifiedPurchase` | `reviews.is_verified_purchase` | ブール値 |
| `items[].createdAt` | `reviews.created_at` | ISO 8601タイムスタンプ |
| `items[].user` | `users` | ネストユーザー（id、name のみ — `avatarUrl`は不含） |
| `total`, `page`, `limit`, `totalPages` | PaginationDto | フラットなページネーションフィールド |

> `status = 'approved'`のレビューのみ返却。エンドポイントは`@Public()`でユーザー単位の絞り込みがないため、pendingレビューは作者本人にも提示されない。

**レスポンス例（200）：**

```json
{
  "items": [
    {
      "id": "d4e5f6a7-b8c9-0123-defa-234567890123",
      "rating": 5,
      "title": "Amazing for dry skin",
      "body": "My skin feels hydrated all day.",
      "images": [],
      "isVerifiedPurchase": true,
      "createdAt": "2026-08-01T10:00:00.000Z",
      "user": {
        "id": "e5f6a7b8-c9d0-1234-efab-345678901234",
        "name": "Jane Doe"
      }
    }
  ],
  "total": 32,
  "page": 1,
  "limit": 10,
  "totalPages": 4
}
```

### 7.4a 出力定義 — レビュー資格（`can-review`）

```json
{ "canReview": false, "reason": "not_delivered" }
```

`reason`：`'not_delivered' | 'already_reviewed' | null`。

### 7.5 出力定義 — レビュー作成（承認待ち）

**レスポンス例（201）：**

```json
{
  "id": "d4e5f6a7-b8c9-0123-defa-234567890123",
  "rating": 5,
  "title": "Amazing for dry skin",
  "body": "My skin feels hydrated all day.",
  "images": [],
  "status": "pending",
  "isVerifiedPurchase": true,
    "isApproved": true,
    "createdAt": "2026-08-05T12:00:00.000Z"
  }
}
```

### 7.6 出力定義 — 類似商品

| フィールド | データソース | 表示形式 |
|-------|-------------|----------------|
| `id` | `products.id` | UUID文字列 |
| `name` | `products.name` | 文字列 |
| `slug` | `products.slug` | URLフレンドリー文字列 |
| `price` | `products.price` | 10進文字列 |
| `compareAtPrice` | `products.compare_at_price` | 10進文字列またはnull |
| `images` | `products.images` | 文字列配列（サムネイル） |
| `avgRating` | `products.avg_rating` | 10進文字列 |
| `reviewCount` | `products.review_count` | 整数 |
| `stockQuantity` | `products.stock_quantity` | 整数 |

**レスポンス例（200・bare配列）：**

```json
[
  {
    "id": "f6a7b8c9-d0e1-2345-fabc-456789012345",
    "name": "Vitamin C Brightening Serum",
    "slug": "vitamin-c-brightening-serum",
    "price": 28,
    "compareAtPrice": null,
    "images": ["/uploads/products/uuid/1-thumb.webp"],
    "skinTypes": ["dry", "oily"],
    "avgRating": 4.3,
    "reviewCount": 18,
    "category": { "id": "b2c3d4e5-...", "name": "Serums", "slug": "serums" }
  }
]
```

### 7.7 出力定義 — プロモーション（商品詳細に組み込み）

> 独立したプロモーションエンドポイントは存在しません（§6.7参照）。以下は商品詳細レスポンスの`promotions[]`のフィールドです。

| フィールド | データソース | 表示形式 |
|-------|-------------|----------------|
| `promotions[].id` | `promotions.id` | UUID文字列 |
| `promotions[].code` | `promotions.code` | 文字列（クーポンコード） |
| `promotions[].description` | `promotions.description` | 文字列またはnull |
| `promotions[].discountTypeCode` | `promotions.discount_type_code` | `percentage` / `fixed`（`discount_types`ルックアップに存在する値のみ） |
| `promotions[].discountValue` | `promotions.discount_value` | 数値 |
| `promotions[].minOrderAmount` | `promotions.min_order_amount` | 数値またはnull |
| `promotions[].usedCount` | `promotions.used_count` | 整数 |
| `promotions[].maxUses` | `promotions.max_uses` | 整数またはnull（無制限） |
| `promotions[].startsAt` | `promotions.starts_at` | ISO 8601タイムスタンプ |
| `promotions[].expiresAt` | `promotions.expires_at` | ISO 8601タイムスタンプ |

> **計算済み`balance`フィールドは存在しません。** サーバー側の残数フィルタもありません（§6.7参照）。

**レスポンス例（200・商品詳細の`promotions[]`）：**

```json
[
  {
    "id": "a7b8c9d0-e1f2-3456-abcd-567890123456",
    "code": "GLOW10",
    "description": "10% off from Glow Lab",
    "discountTypeCode": "percentage",
    "discountValue": 10,
    "minOrderAmount": 20,
    "usedCount": 35,
    "maxUses": 100,
    "startsAt": "2026-08-01T00:00:00.000Z",
    "expiresAt": "2026-09-30T23:59:59.000Z"
  }
]
```

### 7.8 出力定義 — 広告バナー（`productDetail_page_banner`）

| フィールド | データソース | 表示形式 |
|-------|-------------|----------------|
| `id` | `advertisements.id` | UUID文字列 |
| `title` | `advertisements.title` | 文字列 |
| `description` | `advertisements.content` | 文字列またはnull（`content`からマップ） |
| `announcementMessage` | `advertisements.announcement_message` | 文字列（最大500文字） |
| `imageUrl` | `advertisements.image_url` | URL文字列またはnull（製品画像→サンプルにフォールバック） |
| `sku` | `advertisements.sku` | 文字列またはnull（ターゲット商品解決に使用） |
| `placement` / `planTier` | `ad_fee_settings.placement` / `.tier`（`feeSetting`経由） | `productDetail_page_banner` / `premium`・`standard`・`basic` |
| `startsAt` / `expiresAt` | `advertisements.starts_at` / `.expires_at` | ISO 8601タイムスタンプ |
| `shopId` / `shopName` / `shopSlug` | `advertisements.shop_id` → `shops` | フラットフィールド |
| `productId` / `productSlug` | 解決済み（sku→画像ファイル名） | ターゲット商品、nullの場合あり |
| `shop` | `shops` via `advertisements.shop_id` | ネストオブジェクト：`name`、`slug`、`logoUrl` |

**レスポンス例（200・bare配列）：**

```json
[
  {
    "id": "c9d0e1f2-a3b4-5c6d-8e9f-0a1b2c3d4e5f",
    "title": "Autumn Glow Sale",
    "description": "20% off all serums this week",
    "announcementMessage": "20% off all serums this week",
    "imageUrl": "/uploads/ads/autumn-glow.webp",
    "sku": "SKU-0001",
    "placement": "productDetail_page_banner",
    "startsAt": "2026-08-15T00:00:00.000Z",
    "expiresAt": "2026-08-30T23:59:59.000Z",
    "planTier": "premium",
    "shopId": "d0e1f2a3-...",
    "shopName": "Glow Lab Official Store",
    "shopSlug": "glow-lab-official-store",
    "productId": "a1b2c3d4-...",
    "productSlug": "hydrating-facial-serum",
    "shop": {
      "name": "Glow Lab Official Store",
      "slug": "glow-lab-official-store",
      "logoUrl": "/uploads/shops/glow-logo.webp"
    }
  }
]
```

> 注記：内部フィールド（`approval_status`、`payment_status`、`payment_amount`、`payment_reference`、`approved_by`、`rejection_reason`）は購入者に公開されません。DTOに`link_url`フィールドは存在しません。

### 7.8a 出力定義 — レビュー報告（201）

```json
{
  "id": "b8c9d0e1-...",
  "reviewId": "d4e5f6a7-...",
  "reportedBy": "e5f6a7b8-...",
  "reason": "spam",
  "description": "This review contains promotional content",
  "status": "pending"
}
```

> リクエストは`detail`フィールドを使用し、`description`として保存。報告者は`reportedBy`（`user_id`ではない）。

---

## 8. 入力バリデーションルール

### 8.1 パスパラメータバリデーション

| パラメータ | バリデーションルール | エラーメッセージ（EN） | エラーメッセージ（JA） |
|-----------|-----------------|--------------------|--------------------|
| `:idOrSlug` | UUID、slug、またはSKU。非UUIDでslug/SKUに一致しなければ404 | "Product not found" | "商品が見つかりません" |

> `resolveProduct`は`:idOrSlug`をUUID、slug、SKUの順で解決します。slug形式の個別400エラーパスはありません。

### 8.2 レビューバリデーション（`CreateReviewDto`）

| フィールド | バリデーションルール | エラーメッセージ（EN） | エラーメッセージ（JA） |
|-------|-----------------|--------------------|--------------------|
| `rating` | 必須、整数1〜5 | "rating must be between 1 and 5" | "評価は1〜5の整数である必要があります" |
| `title` | 任意、最大255文字 | "title must be at most 255 characters" | "タイトルは255文字以内です" |
| `body` | 任意、最大5000文字 | "body must be at most 5000 characters" | "本文は5000文字以内です" |
| `images` | 任意、文字列配列、最大5枚 | "images must contain at most 5 items" | "画像は最大5枚までです" |

### 8.3 ページネーションバリデーション（ストリクトモード）

| フィールド | バリデーションルール | エラーメッセージ（EN） | エラーメッセージ（JA） |
|-------|-----------------|--------------------|--------------------|
| `page` | 任意、`@Min(1)`、デフォルト1 | "page must not be less than 1" | "ページ番号は1以上である必要があります" |
| `limit` | 任意、`@Min(1)`、`@Max(50)`、バックエンドデフォルト20（UIは10送信） | "limit must not be greater than 50" | "件数は1〜50の範囲です" |
| `sortBy` | 任意、`newest\|oldest\|highest\|lowest`、デフォルト`newest` | "sortBy is invalid" | "sortBy が無効です" |

### 8.4 カート追加バリデーション（ストリクトモード）

| フィールド | バリデーションルール | エラーメッセージ（EN） | エラーメッセージ（JA） |
|-------|-----------------|--------------------|--------------------|
| `productId` | 必須、空でない文字列 | "productId is required" | "productId は必須です" |
| `quantity` | 必須、`@IsInt()`、`@Min(1)` | "quantity must be at least 1" | "数量は1以上である必要があります" |

### 8.5 バリデーション強制レイヤー

1. **フロントエンド（クライアント）**：React Hook Form + Zodスキーマバリデーションでリアルタイムフィードバック。在庫違反時は「カートに追加」を無効化。
2. **バックエンド（サーバー）**：全エンドポイントでNestJS ValidationPipe + class-validator DTO。DBチェック制約（`chk_reviews_rating`、`chk_products_stock`）が最終的な権威。

---

## 9. エラー処理仕様

### 9.1 エラーレスポンス構造

```json
{
  "statusCode": 404,
  "message": ["Product not found"],
  "error": "Not Found",
  "timestamp": "2026-08-05T12:00:00.000Z",
  "path": "/api/v1/products/hydrating-facial-serum"
}
```

### 9.2 エラー分類表 — 商品詳細＆レビュー

| HTTPステータス | エラーコード | シナリオ | ユーザー向け動作 |
|-------------|------------|----------|---------------------|
| `400` | `BAD_REQUEST` | 配送済みでない（レビュー作成）/ バリデーション失敗 | レビューフォーム送信部にインラインエラー |
| `401` | `UNAUTHORIZED` | JWT欠落または無効 | ログインプロンプト / `/login?redirect=/buyer/products`へリダイレクト |
| `403` | `FORBIDDEN` | ユーザーロールが販売者/管理者（購入者でない） | `/unauthorized`へリダイレクト |
| `404` | `NOT_FOUND` | 商品が見つからない/非アクティブ/販売者未承認。レビューが見つからない（報告時） | 「商品一覧へ戻る」リンク付きEmptyState / エラートースト |
| `409` | `CONFLICT` | 重複レビュー。重複報告（`reviewId + reportedBy`） | インラインエラー / 情報トースト「既に報告済み」 |
| `429` | `TOO_MANY_REQUESTS` | レート制限超過（報告） | エラートースト「リクエストが多すぎます」 |
| `500` | `INTERNAL_SERVER_ERROR` | サーバーエラー | 「問題が発生しました」+リトライボタン（再取得） |

### 9.3 エラー分類表 — お気に入り＆カート

| HTTPステータス | エラーコード | シナリオ | ユーザー向け動作 |
|-------------|------------|----------|---------------------|
| `400` | `BAD_REQUEST` | 在庫不足（`stock_quantity < requested`） | インラインエラー、CTAを無効化 |
| `401` | `UNAUTHORIZED` | 未認証 | ログインモーダルを開く / `/login`へリダイレクト |
| `404` | `NOT_FOUND` | 商品が見つからない | EmptyState |
| `409` | `CONFLICT` | 商品が既にカート/お気に入りに登録済み | 「既に追加済み」ダイアログ（Cart:「Already in Cart」/ Wishlist:「Already in Wishlist」） |
| `422` | `UNPROCESSABLE_ENTITY` | 在庫切れ（`stock_quantity = 0`、ルール4.2.2） | 「カートに追加」無効化+「在庫切れ」バッジ |

### 9.4 フロントエンドのエラー表示動作

- **フィールドレベルバリデーション**：無効な入力の下に赤枠とインラインテキスト。
- **フォームレベルサマリー**：全エラーを列挙するレビューフォーム上部のアラートバナー。
- **トースト通知**：お気に入りトグルとカートAPIエラーに使用。
- **ローディング状態**：商品/レビュー/類似セクションのスケルトンローダー。API呼び出し中の送信ボタンのスピナー。

---

## 10. 権限とアクセス制御

### 10.1 認証要件

- 更新操作（レビュー投稿、お気に入り、カート）は`Authorization`ヘッダーで渡されるJWT Bearer Token。
- 公開読み取りエンドポイントは認証不要。

### 10.2 公開 vs 保護エンドポイント

| エンドポイント | アクセスレベル | 説明 |
|----------|-------------|-------------|
| `GET /products/:idOrSlug` | 公開 | 商品詳細表示（UUID\|slug\|SKU） |
| `GET /products/:idOrSlug/reviews` | 公開 | 承認済みレビュー一覧表示 |
| `GET /products/:idOrSlug/similar` | 公開 | 類似商品 |
| `GET /products/:idOrSlug/advertisements` | 公開 | 広告バナー表示 |
| `GET /products/:idOrSlug/can-review` | 保護（buyer） | レビュー資格確認 |
| `POST /products/:idOrSlug/reviews` | 保護（buyer） | レビュー作成 |
| `POST /reviews/:id/report` | 保護（任意の認証済みロール） | レビュー報告 |
| `POST /wishlist/:productId` ⚠️ | 保護（buyer） | お気に入りに追加 |
| `POST /cart/items` ⚠️ | 保護（buyer） | カートに追加 |

### 10.3 RBAC強制

| エンドポイント | ガード | ロール |
|----------|-------|------|
| 公開読み取り（§10.2） | `@Public()` | なし |
| `GET /products/:idOrSlug/can-review` | `JwtAuthGuard + RolesGuard` | `buyer` |
| `POST /products/:idOrSlug/reviews` | `JwtAuthGuard + RolesGuard` | `buyer` |
| `POST /reviews/:id/report` | `JwtAuthGuard` | 任意の認証済みロール |
| `POST /wishlist/:productId` ⚠️ | `JwtAuthGuard + RolesGuard` | `buyer` |
| `POST /cart/items` ⚠️ | `JwtAuthGuard + RolesGuard` | `buyer` |

**ルール：** バックエンドは常にRBACを強制する。フロントエンドのガード（例：merchant-viewのCTA非表示）はUX上の便宜のみ。

### 10.4 レビュー悪用防止

| ルール | 実装 |
|------|----------------|
| ユーザーごと・商品ごとにレビュー1件 | DBユニーク制約`uq_reviews_user_product`（userId_productId）+ ConflictException（409） |
| 配送済み購入のみ | `findDeliveredOrderItem`（注文`statusCode='delivered'`）→ 400 |
| レーティング範囲 | DTO `@Min(1) @Max(5)` + DBチェック`chk_reviews_rating`（1〜5） |
| レビューモデレーション | 新規レビューは`status='pending'`。公開一覧は`approved`でフィルター。管理者は`/admin/reviews/:id/moderate`で承認/却下 |
| 報告重複防止 | `(reviewId, reportedBy)`で重複 → 409 |
| 管理者通知 | `REVIEW_CREATED` / `REVIEW_REPORTED`通知（非致命） |

### 10.5 セキュリティ監査 / 通知

| イベント | 記録データ / 通知 | 保持期間 |
|-------|-------------|-----------|
| `REVIEW_CREATED` | 管理者へのアプリ内通知 | 通知ポリシーに準拠 |
| `REVIEW_REPORTED` | 管理者へのアプリ内通知 | 通知ポリシーに準拠 |

> 現行の`createReview` / `getDetail`実装に明示的なRedisキャッシュ無効化や`PRODUCT_VIEW`監査ログはありません（BR-PROD-016/017追跡項目）。

---

## 11. リアルタイム通知動作

### 11.1 現在の実装

商品詳細ページは、コア機能にWebSocket接続を必要としません。商品、レビュー、類似商品データは、TanStack Queryのポーリング/無効化によるREST経由でロードされます。

### 11.2 WebSocket統合（購入後）

認証済み購入者向けに、注文確定後に商品ページでリアルタイムイベントを表示できます：

| イベント | トリガー | アクション |
|-------|---------|--------|
| `statusUpdate` | 注文ステータス変更（例：発送済み） | トースト通知（グローバルに表示） |
| `cartUpdate` | 別セッションからのカート変更 | `cartKeys`を無効化しカートバッジを更新 |

---

## 12. 画面遷移仕様

### 12.1 遷移元（インバウンド）

| 遷移元 | 遷移先 | 条件 |
|--------|--------|-----------|
| ホーム / 検索 / カテゴリーページ | `/products/:id` | 商品カードのクリック |
| お気に入りページ | `/wishlist/products/:id` | お気に入り商品のクリック |
| 類似商品セクション | `/products/:id` | 類似商品カードのクリック |
| マーチャント商品管理 | `/merchant/products/:id/view` | マーチャントプレビュー |
| 広告バナー（他画面） | `/buyer/products/:sku` | 広告クリック |

### 12.2 内部ナビゲーション

| 遷移元 | 遷移先 | トリガー |
|--------|--------|---------|
| 商品詳細 | `history.back()` | 戻るボタン |
| 商品詳細 | `/products` | 「商品一覧へ」（Not Found状態） |
| レーティングサマリー | `#reviews` | スムーススクロール |
| 類似商品カード | `/products/:id` | カードクリック |
| 広告カード / 「Learn more」 | `/buyer/products/{sku\|fallbackId}` | 広告クリック |
| レビューフォーム（未認証） | `/login` | ログインプロンプト |
| カート/お気に入りCTA（未認証） | `/login?redirect=/buyer/products` | CTAクリック |

### 12.3 遷移先（アクション後）

| 遷移元 | 遷移先 | 条件 |
|--------|--------|-----------|
| 商品詳細（カートに追加） | `/cart` | 成功後に購入者がカートアイコンをクリック |
| 商品詳細（お気に入り） | `/wishlist` | 購入者が「お気に入りを見る」をクリック |
| 商品詳細（レビュー投稿） | `/login` | 未認証購入者がレビューフォームをクリック |

### 12.4 エラー時遷移

| 遷移元 | 遷移先 | 条件 |
|--------|--------|-----------|
| 商品詳細（403） | `/unauthorized` | ロールが許可されていない |
| 商品詳細（404） | `/products` | 商品が見つからない/非アクティブ |

---

## 13. 非機能要件

### 13.1 パフォーマンス要件

| メトリクス | 目標 / 動作 |
|--------|--------|
| ページロード（初期レンダリング） | ≤ 2秒 |
| 商品詳細クエリ鮮度 | `staleTime: 0`、`refetchOnMount: 'always'`（鮮度優先、Redisキャッシュなし） |
| レビューキャッシュ | `staleTime: 60_000` |
| 類似商品/プロモーション/広告キャッシュ | `staleTime: 300_000` |
| 画像遅延ロード | ギャラリー画像＋広告画像は遅延ロード |

### 13.2 セキュリティ考慮事項

| 懸念事項 | 緩和策 |
|---------|------------|
| 不正アクセス | レビュー/can-review/報告エンドポイントのRBAC（JwtAuthGuard + RolesGuard） |
| レビュー悪用 | 配送済み購入チェック+ユニーク制約+モデレーションキュー |
| 在庫レース | カート挿入時のアトミック在庫再検証（ルール4.2.2）⚠️ Cartチーム |
| XSS / HTML説明 | 商品`description`は`dangerouslySetInnerHTML`でHTMLレンダリング。上流コンテンツ管理済み。サニタイズ/CSP追跡（BR-PROD-017）。レビュー本文はReact自動エスケープ |
| 広告リンク安全性 | 内部ナビゲーション（外部`window.open`なし） |

### 13.3 レスポンシブデザイン要件

| ブレークポイント | レイアウト |
|------------|--------|
| ≥ 768px（`md:`） | 2カラム：左にギャラリー、右に情報。購入アクションはインライン（Product Info内） |
| < 768px | 全幅スタックレイアウト、モバイル固定CTAバー（`md:hidden`） |

### 13.4 テスト戦略

**ユニットテスト：**

| コンポーネント | テストケース |
|-----------|------------|
| `product.service.ts` | getByIdOrSlug成功、404処理、レビュー作成 |
| `useProductDetail.ts` | クエリキー構成、ミューテーション無効化 |
| `ProductGallery.tsx` | サムネイルクリックでメイン画像切替、画像なしフォールバック |

**統合テスト：**

| シナリオ | 期待結果 |
|----------|-----------------|
| UUID/slug/SKUでのGET商品 | カテゴリー、販売者、組み込み`promotions[]`/`ratingBreakdown[]`付きの完全詳細 |
| 非アクティブ商品/未承認販売者でのGET商品 | 404 |
| 商品のレビューGET | 承認済みレビューのフラットページネーション（`{items,total,page,limit,totalPages}`） |
| 配送済みでないレビューPOST | 400（BadRequest、422ではない） |
| 重複レビューPOST | 409（ユニーク制約） |
| レビューPOSTでavgRating/reviewCount更新 | `approved`レビューのみで集計を再計算 |
| 在庫切れ商品のカート追加 | 422 / バリデーションエラー（Cartモジュール） |
| お気に入り追加（新規/重複） | 201 / 409 |
| 商品の広告バナーGET | 承認済み、支払済み、アクティブ、有効期間内、`feeSetting.placement='productDetail_page_banner'`の200（tier順・最大5件）。該当なしの場合は空配列 |
| `can-review` GET | `not_delivered` / `already_reviewed` / `canReview:true`の適切な返却 |
| レビュー報告POST（重複） | 409 |

**セキュリティテスト：**

| テスト | 期待結果 |
|------|-----------------|
| レビュー本文XSSペイロード | HTMLエスケープされ、スクリプト実行なし |
| 未認証レビューPOST | 401 |
| 販売者ロールのレビューPOST | 403 |
| slugへのSQLインジェクション | パラメータ化クエリ、インジェクションなし |
| レーティング範囲外（0、6） | バリデーションエラー |

---

## 14. 設定項目（外部定義）

`.env`設定およびサービス定数で定義：

| 定義キー | デフォルト値 | 説明 |
|----------------|---------------|-------------|
| `VITE_API_BASE_URL` | `http://localhost:8080/api/v1` | バックエンドAPIベースURL（相対画像URL解決に使用） |
| レビューデフォルトlimit | `20` | バックエンドの`DefaultValuePipe`（UIは10送信） |
| `PAGINATION_MAX_LIMIT` | `50` | レビュー一覧の最大ページサイズ（`@Max(50)`） |
| `REVIEW_MAX_IMAGES` | `5` | レビューあたりの最大画像数（DTOのみ、UIにアップロードなし） |
| `REVIEW_BODY_MAX_LENGTH` | `5000` | レビュー本文の最大長 |
| 類似商品デフォルトlimit | `4` | バックエンドの`DefaultValuePipe`（UIは8送信） |
| `AUTO_SLIDE_MS` | `5000` | 広告スライダーの自動ローテーション間隔（`AdBannerSlider`の定数） |
| 広告cap | `5` | `getSidebarAds`の`.slice(0, 5)` |
| プレースホルダー画像 | `/placeholder-product.png` | `images`が空の場合のギャラリーフォールバック |
| `SAMPLE_AD_IMAGE` | `/uploads/products/cd8048d7-….png` | 広告画像の最終フォールバック |

---

## 15. クロスリファレンストレーサビリティマトリクス

### 15.1 要件定義トレーサビリティ

| 要件ID | 要件説明 | 本ドキュメントでの対応箇所 |
|----------------|-------------------------|----------------------------|
| B-PROD-001 | 商品詳細に画像、説明、価格、成分を表示 | UC-PROD-001、第5.1節、第7.3節 |
| B-PROD-002 | ギャラリービューの複数画像 | UC-PROD-001、第5.1節（ルール4.2.3） |
| B-PROD-003 | レーティング付きレビュー | UC-PROD-002、第6.2節 |
| B-PROD-004 | レビュー投稿（ログイン必須） | UC-PROD-003、第6.3節 |
| B-PROD-005 | 関連商品 | UC-PROD-004、第6.4節 |
| B-PROD-006 | 肌タイプ適合性 | UC-PROD-001、EL-10 |
| B-PROD-007 | 平均レーティングとレビュー件数 | UC-PROD-002、EL-05、第6.2節 |
| B-CART-001 | 商品をカートに追加 | UC-PROD-006、第6.6節（ルール4.2.2） |
| B-CART-008 | 数量はゼロより大きくなければならない | BR-PROD-011（数量バリデーション） |
| B-CART-009 | 同じ商品がカート行として重複して出现することはできない | UC-PROD-006（一意制約`uq_cart_items_cart_product`） |
| B-CART-010 | カート価格はチェックアウト時に現在の商品価格を使用 | 商品詳細のスコープ外（カートモジュールで処理） |
| B-CART-011 | カートに追加時に在庫が検証される | BR-PROD-010、BR-PROD-011（アトミック在庫検証） |
| B-CART-012 | チェックアウト時に再び在庫が検証される | 商品詳細のスコープ外（チェックアウトモジュールで処理） |
| B-WISH-001 | 商品をお気に入りに追加 | UC-PROD-005、第6.5節 |
| B-MATCH-006 | 「あなたへのおすすめ」セクション | UC-PROD-004、第6.4節 |

### 15.2 データベース設計トレーサビリティ

| データベーステーブル | 関連する機能動作 | 使用するインデックス/制約 |
|----------------|-------------------------------|-------------------------|
| `products` | id/slug/SKUでの商品詳細ロード（SELECT）、レーティング再計算（UPDATE） | `idx_products_slug`、`idx_products_is_active`、`idx_products_category_id`、`uq_products_sku`、`chk_products_stock` |
| `categories` | 商品詳細レスポンスに含まれるカテゴリー情報（`{id,name,slug}`、親なし） | `idx_categories_parent_id` |
| `merchants` | マーチャント表示名（`shop_name`）、ライセンスステータス（`license_status`）、ライセンスゲート | `idx_merchants_user_id`、`idx_merchants_license_status` |
| `users` | レビュー投稿者情報（名前。`avatarUrl`はselectに含まれない — UIはイニシャルにフォールバック） | `pk_users` |
| `shops` | 広告のネスト`shop {name,slug,logoUrl}` — `shops.user_id`でリンク | `idx_shops_user_id`、`uq_shops_slug`、`idx_shops_is_approved` |
| `reviews` | レビュー一覧（SELECT、`status='approved'`のみ）、レビュー作成（INSERT、`status='pending'`）、`ratingBreakdown`（groupBy） | `idx_reviews_product_id`、`uq_reviews_user_product`、`chk_reviews_rating` |
| `review_reports` | レビュー報告（INSERT）、`(reviewId, reportedBy)`重複チェック | `idx_review_reports_review_id`、`idx_review_reports_status`、`chk_review_reports_reason`、`chk_review_reports_status` |
| `wishlist` | お気に入り追加（SELECT / INSERT） — テーブル名は単数形 | `idx_wishlist_user_id`、`uq_wishlist_user_product` |
| `promotions` | 商品詳細への組み込み（SELECT — アクティブ&有効期間内、残数フィルタなし） | `idx_promotions_merchant_id`、`idx_promotions_is_active`、`idx_promotions_expires_at`、`uq_promotions_code`、`chk_promotions_discount_value`、`chk_promotions_dates` |
| `carts` | ユーザーカート管理（SELECT / INSERT） — DB設計書v2.4：カート永続化用テーブル | `idx_carts_user_id`、`uq_carts_user_id` |
| `cart_items` | カート商品行（SELECT / INSERT / UPDATE / DELETE） — DB設計書v2.4：カート商品用テーブル | `idx_cart_items_cart_id`、`uq_cart_items_cart_product`、`chk_cart_items_quantity` |
| `order_items` | 配送済み購入チェック（SELECT）— `findDeliveredOrderItem`。注：カート操作は`carts`/`cart_items`テーブルを使用（DB設計書v2.4）。 | `idx_order_items_product_id`、`idx_order_items_merchant_id`、`fk_order_items_product`、`fk_order_items_merchant`、`chk_order_items_quantity`、`chk_order_items_total` |
| `discount_types` | プロモーション割引型バリデーション用ルックアップテーブル — `promotions.discount_type_code`が参照（DB設計書v2.4） | `uq_discount_types_code` |
| `advertisements` | 広告バナー表示（SELECT） — `productDetail_page_banner`配置向けの承認済み、支払済み、アクティブ、有効期間内の広告（DB設計書v2.4 §3.13） | `idx_advertisements_is_active`、`idx_advertisements_approval_status`、`idx_advertisements_payment_status`、`idx_advertisements_expires_at`、`chk_advertisements_dates`、`chk_advertisements_approval_status`、`chk_advertisements_payment_status`、`fk_advertisements_shop` |
| `ad_fee_settings` | 配置/tier解決ルックアップ（SELECT） — `feeSetting`関連経由で`placement`/`tier`を解決（DB設計書v2.4 §3.14） | `uq_ad_fee_settings_placement_tier` |
| `ad_payments` | 表示される広告の支払い完了チェック（`payment_status='completed'`） — `ad_payments.ad_id`経由（DB設計書v2.4 §3.15） | `fk_ad_payments_ad` |

**参照Prismaクエリ：**

*商品解決 + ライセンスゲート：*

```typescript
// resolveProduct(idOrSlug) — UUID か slug|SKU
const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-…/i.test(idOrSlug);
const product = await prisma.product.findFirst({
  where: isUuid
    ? { id: idOrSlug, isActive: true }
    : { isActive: true, OR: [{ slug: idOrSlug }, { sku: idOrSlug }] },
  include: {
    category: { select: { id: true, name: true, slug: true } },   // parent 不要
    merchant: { select: { id: true, shopName: true, licenseStatus: true } },
  },
});
if (!product || product.merchant?.licenseStatus !== 'approved') throw new NotFoundException();
```

*レビュー一覧（フラットページネーション）：*

```typescript
const [items, total] = await prisma.$transaction([
  prisma.review.findMany({
    where: { productId, status: 'approved' },
    include: { user: { select: { id: true, name: true } } },  // avatarUrl なし
    orderBy: sortByOrder,   // newest: { createdAt: 'desc' } ほか
    skip: (page - 1) * limit,
    take: limit,
  }),
  prisma.review.count({ where: { productId, status: 'approved' } }),
]);
return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
```

*レビュー作成（承認待ち）+ レーティング再計算：*

```typescript
const review = await prisma.review.create({
  data: {
    userId: currentUser.id,
    productId,
    rating: dto.rating,
    title: dto.title,
    body: dto.body,
    images: dto.images ?? [],
    status: 'pending',              // モデレーションキュー
    isVerifiedPurchase: true,
  },
});

// 集計は status = 'approved' のみ
const aggregate = await prisma.review.aggregate({
  where: { productId, status: 'approved' },
  _avg: { rating: true },
  _count: { rating: true },
});

await prisma.product.update({
  where: { id: productId },
  data: {
    avgRating: aggregate._avg.rating ?? 0,
    reviewCount: aggregate._count.rating,
  },
});

await notifyAdminsOfReviewCreated(...);  // REVIEW_CREATED（非致命）
return review;
```

### 15.3 関連文書参照

| 文書ID | 文書名 | ファイルパス |
|-------------|---------------|-----------|
| SKM-REQ-001 | 要件定義書（v2.10） | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` |
| SKM-DBS-001 | データベース設計書（v2.4） | `docs/core-work/データベース設計書_DATABASE_SPEC.md` |
| SKM-DEV-001 | 開発ルール（v2.1） | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` |

---

## 16. 付録A: 実装チェックリスト

### バックエンド（NestJS）— 実装済み

- [x] `buyer-products.controller.ts` — `GET /:idOrSlug`、`/reviews`、`/similar`、`/advertisements`、`/can-review`、`POST /reviews`（`@Public()` / buyerガード）
- [x] `products.service.ts` — `resolveProduct`、`getDetail`（promotions + ratingBreakdown埋め込み）、`findReviews`、`findSimilar`、`getSidebarAds`、`canReview`、`createReview`
- [x] `public-reviews.controller.ts` — `POST /reviews/:id/report`（JwtAuthGuard、201）
- [x] `reviews.service.ts` — `reportReview` + 管理者通知
- [x] DTO: `CreateReviewDto`、`ReportReviewDto`、`ReviewQueryDto`（class-validator）

### フロントエンド（React）— 実装済み

- [x] `pages/buyer/ProductDetail.tsx` — 戻るボタン、広告バナー、ギャラリー+情報グリッド、タブ、類似商品、モバイル固定CTA、merchant-viewゲーティング
- [x] `features/buyer/products/components/**` — Gallery, Info, Tabs, PurchaseActions, QuantityStepper, StarRating, Reviews, ReviewForm, ReviewReportDialog, SimilarProducts, ProductCard
- [x] `features/buyer/products/hooks/useProductDetail.ts` — クエリ + 作成/報告ミューテーション
- [x] `features/buyer/products/services/product.service.ts` — 型付きクライアント + エンドポイント
- [x] `components/shared/AdBannerSlider.tsx` — スポンサーダカルーセル
- [ ] `ActivePromotionCard` — 実装済みだが未マウント（プロモーションは`promotions[0]`のバッジで表示）
- [ ] `SidebarAdvertisements` — 実装済みだが未マウント（ページは`AdBannerSlider`を使用）

---

*機能仕様（商品詳細）ここまで*
