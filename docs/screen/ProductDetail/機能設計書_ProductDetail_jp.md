# 機能設計書 — 商品詳細ページ

---

## 文書管理

| 属性 | 値 |
|-----------|-------|
| **文書ID** | SKM-FDS-PROD-001 |
| **対象画面** | 商品詳細ページ |
| **サブシステム** | 商品カタログ — 商品詳細、レビュー、お気に入り＆カート追加 |
| **機能ID** | FN-PROD-001 |
| **バージョン** | 5.1 |
| **作成日** | 2026-08-05 |
| **最終更新日** | 2026-08-17 |
| **作成者** | ソフトウェアアーキテクト |
| **ステータス** | ドラフト（審査中） |
| **分類** | 社内 — 技術部門 |

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
  ┌───────────────────────┐          ┌────────────────────────┐
  │  Product Detail Page  │          │  Redis (Product Cache) │
  │  (React Frontend)     │◄─────────┤  cache:product:<id>    │
  └───────────┬───────────┘          └────────────────────────┘
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
| `slug` | URLパスパラメータ | 商品詳細を解決するために使用される商品スラッグ |
| `productId` | URLパスパラメータ | レビュー/お気に入り/カートで使用されるUUID商品識別子 |
| `page`, `limit` | クエリパラメータ | レビューリストのページネーション |
| `rating`, `title`, `body`, `images` | ユーザー入力 | レビューフォームから送信されるレビューコンテンツ |
| `quantity` | ユーザー入力 | 「カートに追加」ステッパーで選択された数量 |

| 出力情報 | データカテゴリ | 宛先/説明 |
|--------------------|---------------|---------------------------|
| `product` | 商品DTO | カテゴリー、販売者、ショップを含む完全な商品詳細 |
| `reviews` | レビューDTO配列 | ユーザー情報とページネーションメタ付きの承認済みレビューのページネーション |
| `similarProducts` | 商品カードDTO配列 | 「類似商品」セクション用の関連商品 |
| `wishlist` | お気に入りDTO | お気に入りメンバーシップステータス/追加結果 |
| `cart` | カートDTO | カートへの商品追加結果 |
| `promotions` | プロモーションDTO配列 | 割引詳細と残数付きの有効プロモーション |

### 1.6 関連文書

| No. | 文書ID | 文書名 | ファイルパス/参照 | 備考 |
|-----|-------------|---------------|----------------------|---------|
| 1 | SKM-REQ-001 | 要件定義書（v1.7） | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | ビジネスワークフロー論理、必須フィールド、ルール（ルール4.2.x、4.4.x、B-CART-008~014）。 |
| 2 | SKM-DBS-001 | データベース設計書（v2.2） | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | テーブル構造（`products`、`reviews`、`wishlist`、`promotions`、`carts`、`cart_items`、`review_reports`）、UUID PK、`merchants`テーブル、制約。 |
| 3 | SKM-DEV-001 | 開発ルール（v2.1） | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` | セキュリティルール、デザイントークン、エラーレスポンス。 |

---

## 2. ユースケースとビジネスワークフロー

### 2.1 ユースケースカタログ

| UC-ID | ユースケース名 | 前提条件 | 結果条件 | 発行アクター |
|-------|---------------|--------------|---------------|------------------|
| UC-PROD-001 | 商品詳細を表示 | 商品がアクティブかつ存在する。 | ギャラリー、価格、成分、販売者、ショップ付きの完全な商品詳細が表示される。 | 訪問者 / 購入者 |
| UC-PROD-002 | レビューを表示 | 商品が存在する。 | レーティングサマリー付きの承認済みレビューがページネーションで表示される。 | 訪問者 / 購入者 |
| UC-PROD-003 | レビューを投稿 | ユーザーが`buyer`として認証済みで、購入済み（verified purchase）である。 | レビューが作成され、`avg_rating` / `review_count`が再計算され、キャッシュが無効化される。 | 購入者 |
| UC-PROD-004 | 関連商品を表示 | 商品が存在する。 | 「類似商品」セクションに類似商品が表示される。 | 訪問者 / 購入者 |
| UC-PROD-005 | お気に入りに追加 | ユーザーが`buyer`として認証済み。商品がお気に入りに未登録。 | お気に入りアイテムが作成される（ユニーク`user_id + product_id`）。 | 購入者 |
| UC-PROD-006 | 商品をカートに追加 | ユーザーが`buyer`として認証済み。商品が在庫あり。 | カートアイテムが在庫の再検証付きで挿入またはマージされる。 | 購入者 |
| UC-PROD-007 | 有効プロモーションを表示 | 商品が存在し、その販売者に有効プロモーションがある。 | 有効プロモーション（コード、割引、有効期間、残数）が表示される。 | 訪問者 / 購入者 |

### 2.2 主要ビジネスワークフロー

```
                          ┌─────────────────────┐
                          │  Buyer Navigates    │
                          │  to /products/:slug │
                          └─────────┬───────────┘
                                    │
                                    ▼
                    ┌──────────────────────────────┐
                    │  Load Product Detail         │
                    │  (GET /api/v1/products/:slug)│
                    └──────────────┬───────────────┘
                       ┌──────────┴───────────┐
                       ▼                      ▼
                 ┌────────────┐        ┌──────────────────┐
                 │  200 OK    │        │  404 / 400       │
                 │ Product    │        │ (Not Found /     │
                 │ Detail DTO │        │  Invalid slug)   │
                 └─────┬──────┘        └──────────────────┘
                       │
                       ▼
        ┌───────────────────────────────┐
        │ Load Reviews + Similar +      │
        │ Wishlist Status (if logged in)│
        └───────────────┬───────────────┘
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
    └─────────────┘
```

### 2.3 ワークフロークリティカルパスサマリー

| ステップ | アクション | ステータス（前） | ステータス（後） | 担当 |
|:--------:|--------|---------------|--------------|-------------|
| 1 | 購入者が`/products/:slug`に遷移 | 未認証 | — | システム |
| 2 | リレーション付きで商品詳細をロード | — | 商品表示 | システム |
| 3 | レビュー、類似商品、お気に入りステータスをロード | — | 全セクションロード完了 | システム |
| 4 | 購入者が数量を選択 | — | — | 購入者 |
| 5 | 購入者がカートに追加 | 在庫あり | カートアイテム作成 | システム |
| 6 | 購入者がレビューを投稿（認証済み、購入済み） | — | レビュー作成、レーティング更新 | システム |
| 7 | 購入者がお気に入りに追加 | — | お気に入り更新 | システム |

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
| `OUT_OF_STOCK` | `stock_quantity = 0` | ✗（422） |

### 3.4 レビューの状態

| 状態 | 説明 | 購入者に表示 |
|-------|-------------|:---------------:|
| `PENDING` | 送信済み、モデレーション待ち | ✗ |
| `APPROVED` | `is_approved = true`（作成時のデフォルト） | ✓ |
| `REJECTED` | 管理者モデレーションにより削除 | ✗ |

| 遷移ID | 遷移元状態 | 遷移先状態 | トリガーアクション | ガード条件 |
|---------------|--------------|--------------|----------------|------------------|
| TR-PROD-01 | `NOT_IN_WISHLIST` | `IN_WISHLIST` | お気に入りに追加 | 認証済み購入者、商品が存在 |
| TR-PROD-02 | `IN_STOCK` / `LOW_STOCK` | `STOCK_EXCEEDED` | カートに追加 | `requested > stock_quantity` |
| TR-PROD-03 | `IN_STOCK` | `OUT_OF_STOCK` | 在庫が0に | ルール4.2.2 |
| TR-PROD-04 | `APPROVED` | `REJECTED` | 管理者モデレーション | 管理者アクション |

---

## 4. ビジネスルール

### 4.1 商品表示ルール

| ルールID | ルール名 | 説明 | 強制レイヤー |
|---------|-----------|-------------|-------------------|
| BR-PROD-001 | アクティブのみ | `is_active = true`の商品のみ詳細エンドポイントから返却。 | バックエンド（クエリフィルター） |
| BR-PROD-002 | カバー画像 | `images`の最初の画像がメイン/カバー画像（ルール4.2.3）。 | バックエンド（データモデル）+ フロントエンド（ギャラリー順序） |
| BR-PROD-003 | 価格表示 | 比較価格は存在時、取り消し線+割引%で表示。 | フロントエンド |
| BR-PROD-004 | 在庫表示 | 在庫状態を表示。在庫切れまたは数量が在庫超過時は「カートに追加」を無効化。 | フロントエンド + バックエンド |

### 4.2 レビュールール

| ルールID | ルール名 | 説明 | 強制レイヤー |
|---------|-----------|-------------|-------------------|
| BR-PROD-005 | 購入済みユーザーのみ | 商品を含む完了済み注文を持つ購入者のみレビュー可能（ルール4.4.1）。 | バックエンド（サービスチェック） |
| BR-PROD-006 | 商品あたりレビュー1件 | `(user_id, product_id)`のユニーク制約`uq_reviews_user_product`。 | バックエンド（DB制約+ConflictException） |
| BR-PROD-007 | レーティング範囲 | レーティングは1〜5（ルール4.4.2、`chk_reviews_rating`）。 | バックエンド（DTO+DBチェック） |
| BR-PROD-008 | モデレーション | `is_approved`はデフォルト`true`。管理者は`/admin/reviews/:id/moderate`でモデレーション可能。 | バックエンド（管理者モジュール） |
| BR-PROD-009 | 集計 | 承認済みレビューごとに`avg_rating` / `review_count`をトランザクション内で再計算。 | バックエンド（トランザクション） |

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
| BR-PROD-016 | キャッシュ無効化 | レビュー/商品更新時に商品キャッシュを無効化。 | バックエンド（Redis） |
| BR-PROD-017 | XSS防止 | レビューコンテンツはReactにより自動エスケープ。CSPヘッダーを強制。 | フロントエンド + バックエンド（ヘッダー） |

### 4.6 有効プロモーションルール

| ルールID | ルール名 | 説明 | 強制レイヤー |
|---------|-----------|-------------|-------------------|
| BR-PROD-018 | 有効プロモーション表示 | `is_active = true`、`starts_at` / `expires_at`の有効期間内（ルール4.5.1）、かつ残数あり（`max_uses - used_count > 0`、または`max_uses`がNULLの場合は無制限）のプロモーションのみ、商品の販売者について表示。 | バックエンド（クエリフィルター） |
| BR-PROD-019 | プロモーション残数表示 | 残りのプロモーション残数を`max_uses - used_count`として表示。`max_uses`がNULLの場合、残数は「無制限」と表示。残数`0`はプロモーションが使い果たされたことを意味し、表示されない。 | バックエンド（計算フィールド）+ フロントエンド（表示） |

---

## 5. 画面仕様

### 5.1 画面：商品詳細ページ（`/products/:slug`）

**目的：** アクティブな単一商品を完全な情報とコンバージョンアクション付きで表示する。

#### 5.1.1 UI要素

| 要素ID | 要素名 | 要素タイプ | i18nキー | 必須 | 説明 |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-01 | パンくずリスト | ナビゲーション | — | いいえ | ホーム / カテゴリー / 商品のトレイル |
| EL-02 | メイン画像 | 画像 | — | はい | メイン画像（`images[0]`、ルール4.2.3） |
| EL-03 | サムネイル | 画像リスト | — | いいえ | クリックでメイン画像を切り替え |
| EL-04 | 商品名 | テキスト | — | はい | 商品名 |
| EL-05 | レーティングサマリー | レーティングウィジェット | `product.rating` | はい | `★ 4.5（32件のレビュー）` — 平均レーティング+件数 |
| EL-06 | 価格 | テキスト | — | はい | 現在価格 |
| EL-07 | 比較価格 | テキスト（取り消し線） | — | いいえ | 割引%バッジ付きの元の価格 |
| EL-08 | 在庫状態 | テキスト / バッジ | `product.stock` | はい | 「在庫あり（45）」「在庫切れ」/ 在庫少警告 |
| EL-09 | SKU | テキスト | — | いいえ | ストックキーピングユニット |
| EL-10 | 肌タイプ適合性 | バッジグループ | `product.skinType` | はい | 例：[乾燥肌] [敏感肌] [普通肌] |
| EL-11 | 数量ステッパー | 数値入力 | — | いいえ | `[ - ] 数量 [ 1 ] [+]` |
| EL-12 | カートに追加ボタン | ボタン（プライマリ） | `product.addToCart` | はい | 在庫切れ / 数量が在庫超過時は無効 |
| EL-13 | お気に入りに追加ボタン | ボタン（アイコン） | `product.wishlist` | いいえ | 楽観的更新付き♡ボタン（追加のみ。削除はお気に入り画面/モジュールで処理） |
| EL-14 | 販売者 | テキスト+リンク | `product.soldBy` | いいえ | ショップ名と「ショップを見る →」 |
| EL-15 | 商品タブ | タブ | — | いいえ | 説明 / 成分 / レビュー（件数） |
| EL-16 | レビューフォーム | フォーム | — | いいえ | レーティングスター、タイトル、本文。ログインゲーティング |
| EL-17 | 関連商品 | カードグリッド | `product.related` | いいえ | 「類似商品」セクション |
| EL-18 | 有効プロモーション | バナー / カード | `product.promotions` | いいえ | 有効な販売者プロモーション：クーポンコード、割引（パーセンテージ/固定）、最低注文金額、有効期間、残数（`max_uses - used_count`） |

**デフォルト状態：**
- メイン画像は`images[0]`を表示。すべての非同期セクションにスケルトンローダー。
- 商品ロード完了まで「カートに追加」は無効。`stockQuantity <= 0`の場合も無効。
- 未認証時はレビューフォーム非表示（代わりにログインプロンプト表示）。
- 商品の販売者に有効プロモーションがない場合、有効プロモーションセクションは非表示。

---

## 6. 機能動作仕様

### 6.1 動作：商品詳細を表示

| 属性 | 仕様 |
|-----------|---------------|
| **トリガー** | 購入者が`/products/:slug`に遷移 |
| **APIエンドポイント** | `GET /api/v1/products/:slug` |
| **リクエストContent-Type** | `application/json`（レスポンス） |
| **送信前バリデーション** | `slug`パスパラメータ形式（URLスラッグ、最大255文字） |
| **処理ステップ** | 1. slug形式を検証。2. slugで商品を検索（`idx_products_slug`）。3. `is_active = true`をフィルター（ルール4.2.1）。4. カテゴリー（親含む）、販売者（ショップ含む）を含める。5. 商品詳細DTOを返却（内部フィールドを除外）。 |
| **成功レスポンス** | 商品詳細付き200 OK（§7.4参照） |
| **エラーレスポンス** | 400 slug無効。404 商品が見つからない/非アクティブ |
| **後続アクション** | レビュー、類似商品、お気に入りステータスを並行ロード |

**バックエンド処理フロー：**

```
Slug validated as URL slug format (max 255 chars)
  → ProductsService.findOneBySlug()
    → Lookup product by slug (idx_products_slug index)
    → Filter where is_active = true
    → Include category (with parent), merchant (with shop)
    → If product not found → NotFoundException
    → Return product detail DTO (exclude internal fields)
```

### 6.2 動作：レビュー一覧表示

| 属性 | 仕様 |
|-----------|---------------|
| **トリガー** | 商品詳細ページがレビュータブをロード |
| **APIエンドポイント** | `GET /api/v1/products/:productId/reviews` |
| **リクエストContent-Type** | `application/json`（レスポンス） |
| **送信前バリデーション** | `productId`（UUID）。クエリ`page`（最小1）、`limit`（1〜50） |
| **処理ステップ** | 1. 商品の存在を確認。2. `product_id`かつ`is_approved = true`のレビューをクエリ（`idx_reviews_product_id`）。3. ユーザー（名前、avatarUrl）を含める。4. `created_at DESC`で並び替え。5. ページネーションして返却。 |
| **成功レスポンス** | レビューリスト+ページネーションメタ付き200 OK（§7.5参照） |
| **エラーレスポンス** | 404 商品が見つからない |
| **後続アクション** | 集計からレーティングサマリーを描画 |

**バックエンド処理フロー：**

```
productId validated (UUID format)
  → ReviewsService.findByProduct()
    → Verify product exists
    → Query reviews where product_id = productId AND is_approved = true (idx_reviews_product_id index)
    → Include user (name, avatarUrl)
    → Order by created_at DESC
    → Paginate and return
```

### 6.3 動作：レビューを投稿

| 属性 | 仕様 |
|-----------|---------------|
| **トリガー** | レビューフォームの「レビューを投稿」 |
| **APIエンドポイント** | `POST /api/v1/products/:productId/reviews` |
| **リクエストContent-Type** | `application/json` |
| **送信前バリデーション** | Zodレビュースキーマ（レーティング1〜5、タイトル≤255、本文≤5000、画像≤5枚） |
| **処理ステップ** | 1. JWT + `buyer`ロールを検証。2. 商品の存在を確認。3. 検証済み購入（`delivered`ステータスの注文に商品を含む、ルール4.4.1）を確認。4. ユニーク`(user_id, product_id)`制約をチェック（ルール4.4.1）。5. `is_verified_purchase = true`でレビューを作成。6. `avg_rating` / `review_count`をトランザクション内で再計算。7. Redis商品キャッシュを無効化。8. `REVIEW_CREATED`をログ。 |
| **成功レスポンス** | レビューDTO付き201 Created |
| **エラーレスポンス** | 401 未認証。403 購入者でない。404 商品が見つからない。409 重複レビュー。422 購入済みでない |
| **後続アクション** | レビュー+商品詳細クエリを無効化。レーティングサマリーを更新 |

**バックエンド処理フロー：**

```
JwtAuthGuard + RolesGuard(buyer) validate access token
  → ReviewsService.create()
    → Verify product exists
    → Verify user has a delivered order (status = 'delivered') containing the product (Rule 4.4.1)
      → If not → UnprocessableEntityException
    → Check unique constraint (user_id, product_id) for existing review
      → If exists → ConflictException
    → Create review with is_verified_purchase = true
    → Recalculate product avg_rating and review_count in a transaction
    → Invalidate Redis product cache: DEL cache:product:<id>, DEL cache:products:list:*
    → Return review DTO
    → Log: REVIEW_CREATED audit event
```

### 6.4 動作：関連商品を表示

| 属性 | 仕様 |
|-----------|---------------|
| **トリガー** | 商品詳細ページが「関連商品」セクションをロード |
| **APIエンドポイント** | `GET /api/v1/recommendations/similar/:productId` |
| **リクエストContent-Type** | `application/json`（レスポンス） |
| **送信前バリデーション** | `productId`（UUID） |
| **処理ステップ** | 1. 対象商品をロード（categoryId、skinTypes、tags）。2. カテゴリーまたはskinTypes/tagsの重複に一致するアクティブ商品をクエリ。3. 対象商品を除外。4. 8件に制限。5. 商品カードDTOを返却。 |
| **成功レスポンス** | 類似商品カードリスト付き200 OK（§7.6参照） |
| **エラーレスポンス** | 404 商品が見つからない |
| **後続アクション** | なし |

**バックエンド処理フロー：**

```
productId validated (UUID format)
  → MatchingService.findSimilar()
    → Load target product (categoryId, skinTypes, tags)
    → Query active products matching category or overlapping skinTypes/tags
    → Exclude the target product itself
    → Limit to 8 results
    → Return product card DTOs
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

### 6.7 動作：有効プロモーションを表示

| 属性 | 仕様 |
|-----------|---------------|
| **トリガー** | 商品詳細ページが「有効プロモーション」セクションをロード |
| **APIエンドポイント** | `GET /api/v1/products/:slug/promotions` |
| **リクエストContent-Type** | `application/json`（レスポンス） |
| **送信前バリデーション** | `slug`（URLスラッグ形式、最大255文字） |
| **処理ステップ** | 1. slug形式を検証。2. slugで商品を検索。3. 商品の販売者をロード。4. `merchant_id` = 商品の販売者、`is_active = true`、`starts_at <= now()`、`now() < expires_at`の`promotions`をクエリ（ルール4.5.1）。5. 残数`> 0`のプロモーションをフィルター（ルールBR-PROD-019）。6. `starts_at DESC`で並び替え。7. 計算済み`balance`を含むプロモーションDTOを返却。 |
| **成功レスポンス** | 有効プロモーションリスト付き200 OK（§7.7参照） |
| **エラーレスポンス** | 400 slug無効。404 商品が見つからない/非アクティブ |
| **後続アクション** | 有効プロモーションセクションを割引と残数付きで描画 |

**バックエンド処理フロー：**

```
slug validated (URL slug format, max 255 chars)
  → ProductsService.findOneBySlug()
    → Lookup product by slug (idx_products_slug index)
    → Filter where is_active = true
    → Load product's merchant_id
    → PromotionsService.findActiveByMerchant()
      → Query promotions where merchant_id = ... AND is_active = true
        AND starts_at <= now() AND expires_at > now()
        (idx_promotions_merchant_id, idx_promotions_is_active, idx_promotions_expires_at)
      → Filter where balance > 0 (max_uses IS NULL OR max_uses - used_count > 0)
      → Order by starts_at DESC
      → Compute balance = max_uses - used_count (NULL = unlimited)
    → Return active promotion DTOs
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
| `category` | `categories` | 親付きネストオブジェクト |
| `merchant` | `merchants` | ネストオブジェクト：`id`、`shopName`（`merchants.shop_name`から）、`licenseStatus`、`shop`（`shops` via `user_id`） |

**レスポンス例（200）：**

```json
{
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
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
      "https://cdn.example.com/products/uuid/1-full.webp",
      "https://cdn.example.com/products/uuid/2-full.webp"
    ],
    "tags": ["serum", "hydrating"],
    "skinTypes": ["dry", "sensitive"],
    "ingredients": ["Hyaluronic Acid", "Vitamin E", "Glycerin"],
    "isActive": true,
    "isFeatured": true,
    "avgRating": "4.50",
    "reviewCount": 32,
    "createdAt": "2026-07-01T08:00:00.000Z",
    "category": {
      "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "name": "Serums",
      "slug": "serums",
      "parent": { "name": "Skincare", "slug": "skincare" }
    },
    "merchant": {
      "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
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

### 7.4 出力定義 — レビュー一覧

| フィールド | データソース | 表示形式 |
|-------|-------------|----------------|
| `data[].id` | `reviews.id` | UUID文字列 |
| `data[].rating` | `reviews.rating` | 整数1〜5 |
| `data[].title` | `reviews.title` | 文字列またはnull |
| `data[].body` | `reviews.body` | 文字列またはnull |
| `data[].images` | `reviews.images` | 文字列配列 |
| `data[].isVerifiedPurchase` | `reviews.is_verified_purchase` | ブール値 |
| `data[].createdAt` | `reviews.created_at` | ISO 8601タイムスタンプ |
| `data[].user` | `users` | ネストユーザー（id、name、avatarUrl） |
| `meta` | PaginationDto | page、limit、total、totalPages |

**レスポンス例（200）：**

```json
{
  "data": [
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

### 7.5 出力定義 — レビュー作成

**レスポンス例（201）：**

```json
{
  "data": {
    "id": "d4e5f6a7-b8c9-0123-defa-234567890123",
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

**レスポンス例（200）：**

```json
{
  "data": [
    {
      "id": "f6a7b8c9-d0e1-2345-fabc-456789012345",
      "name": "Vitamin C Brightening Serum",
      "slug": "vitamin-c-brightening-serum",
      "price": "28.00",
      "compareAtPrice": null,
      "images": ["https://cdn.example.com/products/uuid/1-thumb.webp"],
      "avgRating": "4.30",
      "reviewCount": 18,
      "stockQuantity": 20
    }
  ]
}
```

### 7.7 出力定義 — 有効プロモーション

| フィールド | データソース | 表示形式 |
|-------|-------------|----------------|
| `data[].id` | `promotions.id` | UUID文字列 |
| `data[].code` | `promotions.code` | 文字列（クーポンコード） |
| `data[].description` | `promotions.description` | 文字列またはnull |
| `data[].discountType` | `promotions.discount_type` | `percentage` / `fixed` |
| `data[].discountValue` | `promotions.discount_value` | 10進文字列 |
| `data[].minOrderAmount` | `promotions.min_order_amount` | 10進文字列またはnull |
| `data[].usedCount` | `promotions.used_count` | 整数 |
| `data[].maxUses` | `promotions.max_uses` | 整数またはnull（無制限） |
| `data[].balance` | 計算値 | `max_uses - used_count`。`max_uses`がnullの場合はnull（無制限） |
| `data[].startsAt` | `promotions.starts_at` | ISO 8601タイムスタンプ |
| `data[].expiresAt` | `promotions.expires_at` | ISO 8601タイムスタンプ |

**レスポンス例（200）：**

```json
{
  "data": [
    {
      "id": "a7b8c9d0-e1f2-3456-abcd-567890123456",
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

---

## 8. 入力バリデーションルール

### 8.1 パスパラメータバリデーション（ストリクトモード）

| パラメータ | バリデーションルール | エラーメッセージ（EN） | エラーメッセージ（JA） |
|-----------|-----------------|--------------------|--------------------|
| `slug` | 必須、URLスラッグ形式、最大255文字 | "slug must be a string" | "スラッグは文字列である必要があります" |
| `productId` | 必須、UUID形式 | "productId must be a valid UUID" | "productId が無効です" |

### 8.2 レビューバリデーション（ストリクトモード）

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
| `limit` | 任意、`@Min(1)`、`@Max(50)`、デフォルト10 | "limit must not be greater than 50" | "件数は1〜50の範囲です" |

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
| `400` | `BAD_REQUEST` | slug無効 / バリデーション失敗 | フィールド単位のインラインエラー+上部バナー |
| `401` | `UNAUTHORIZED` | JWT欠落または無効 | ログインモーダルを開く / `/login`へリダイレクト |
| `403` | `FORBIDDEN` | ユーザーロールが販売者/管理者（購入者でない） | `/unauthorized`へリダイレクト |
| `404` | `NOT_FOUND` | 商品が見つからないまたは非アクティブ | 「商品一覧へ戻る」リンク付きEmptyState |
| `409` | `CONFLICT` | 重複レビュー（ユニーク`user_id + product_id`） | レビューフォームを無効化 |
| `422` | `UNPROCESSABLE_ENTITY` | 購入済みでない（ルール4.4.1） | 説明テキストを表示 |
| `429` | `TOO_MANY_REQUESTS` | レート制限超過 | リトライカウントダウンを表示 |
| `500` | `INTERNAL_SERVER_ERROR` | サーバーエラー | 「問題が発生しました」+リトライボタン（再取得） |

### 9.3 エラー分類表 — お気に入り＆カート

| HTTPステータス | エラーコード | シナリオ | ユーザー向け動作 |
|-------------|------------|----------|---------------------|
| `400` | `BAD_REQUEST` | 在庫不足（`stock_quantity < requested`） | インラインエラー、CTAを無効化 |
| `401` | `UNAUTHORIZED` | 未認証 | ログインモーダルを開く / `/login`へリダイレクト |
| `404` | `NOT_FOUND` | 商品が見つからない | EmptyState |
| `409` | `CONFLICT` | 商品が既にお気に入りに登録済み | トースト「既にお気に入りにあります」、♡は塗りつぶしのまま |
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
| `GET /products/:slug` | 公開 | 商品詳細表示 |
| `GET /products/:productId/reviews` | 公開 | レビュー一覧表示 |
| `GET /products/:slug/promotions` | 公開 | 有効プロモーション表示 |
| `GET /recommendations/similar/:productId` | 公開 | 関連商品 |
| `POST /products/:productId/reviews` | 保護 | `buyer`ロール必須 |
| `POST /wishlist/:productId` | 保護 | `buyer`+ロール必須 |
| `POST /cart/items` | 保護 | `buyer`+ロール必須 |

### 10.3 RBAC強制

| エンドポイント | ガード | ロール |
|----------|-------|------|
| `GET /products/:slug` | `@Public()` | なし |
| `GET /products/:productId/reviews` | `@Public()` | なし |
| `GET /products/:slug/promotions` | `@Public()` | なし |
| `POST /products/:productId/reviews` | `JwtAuthGuard + RolesGuard` | `buyer` |
| `POST /wishlist/:productId` | `JwtAuthGuard + RolesGuard` | `buyer`+ |
| `POST /cart/items` | `JwtAuthGuard + RolesGuard` | `buyer`+ |

**ルール：** バックエンドは常にRBACを強制する。フロントエンドのガードはUX上の便宜のみ。

### 10.4 レビュー悪用防止

| ルール | 実装 |
|------|----------------|
| ユーザーごと・商品ごとにレビュー1件 | DBユニーク制約`uq_reviews_user_product`（user_id, product_id）+ ConflictException |
| 購入済みユーザーのみ | レビュー許可前に商品を含む完了済み注文をチェック（ルール4.4.1） |
| レーティング範囲 | DBチェック`chk_reviews_rating`（1〜5）+ DTOバリデーション |
| レビューモデレーション | `is_approved`はデフォルトtrue。管理者は`/admin/reviews/:id/moderate`でモデレーション可能 |
| XSS防止 | 全レビューコンテンツのReact自動エスケープ。CSPヘッダー |

### 10.5 セキュリティ監査ログ

| イベント | 記録データ | 保持期間 |
|-------|-------------|-----------|
| `REVIEW_CREATED` | userId、productId、rating、ip、タイムスタンプ | 90日 |
| `WISHLIST_ADDED` | userId、productId、タイムスタンプ | 90日 |
| `CART_ITEM_ADDED` | userId、productId、quantity、タイムスタンプ | 90日 |
| `PRODUCT_VIEW` | userId（任意）、productId、ip、タイムスタンプ | 30日 |

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
| ホーム / 検索 / カテゴリーページ | `/products/:slug` | 商品カードのクリック |
| お気に入りページ | `/products/:slug` | お気に入り商品のクリック |
| 関連商品セクション | `/products/:slug` | 類似商品カードのクリック |

### 12.2 内部ナビゲーション

| 遷移元 | 遷移先 | トリガー |
|--------|--------|---------|
| 商品詳細 | `/shops/:shopSlug` | 「ショップを見る →」リンク |
| 商品詳細 | `/category/:categorySlug` | パンくずのカテゴリークリック |
| 商品詳細 | `/wishlist` | お気に入りアイコン（ヘッダー） |
| 商品詳細 | `/cart` | カートアイコン（ヘッダー） |

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

| メトリクス | 目標 |
|--------|--------|
| ページロード（初期レンダリング） | ≤ 2秒 |
| 商品詳細APIレスポンス | ≤ 300ミリ秒（Redisキャッシュ） |
| レビュー一覧APIレスポンス | ≤ 500ミリ秒 |
| 類似商品APIレスポンス | ≤ 500ミリ秒 |
| キャッシュ無効化伝播 | ≤ 1秒 |
| 画像遅延ロード | 折り返し以下の全画像は遅延ロード |

### 13.2 セキュリティ考慮事項

| 懸念事項 | 緩和策 |
|---------|------------|
| 不正アクセス | 全更新エンドポイントでRBAC（JwtAuthGuard + RolesGuard） |
| レビュー悪用 | 購入済みチェック+ユニーク制約+モデレーション |
| 在庫レース | カート挿入時のアトミック在庫再検証（ルール4.2.2） |
| XSS | React自動エスケープ+ CSPヘッダー |
| キャッシュポイズニング | レビュー/商品更新時にRedisキャッシュを無効化 |

### 13.3 レスポンシブデザイン要件

| ブレークポイント | レイアウト |
|------------|--------|
| デスクトップ（≥ 1024px） | 2カラム：左にギャラリー、右に情報。下部にタブ |
| タブレット（768px – 1023px） | ギャラリー+情報をスタック、スティッキーCTAバー |
| モバイル（< 768px） | 全幅スタックレイアウト、スティッキー「カートに追加」バー |

### 13.4 テスト戦略

**ユニットテスト：**

| コンポーネント | テストケース |
|-----------|------------|
| `product.service.ts` | getBySlug成功、404処理、レビュー作成 |
| `useProductDetail.ts` | クエリキー構成、ミューテーション無効化 |
| `product.schema.ts` | 有効/無効レーティング、title/body最大長 |
| `ProductGallery.tsx` | サムネイルクリックでメイン画像切替、画像なしフォールバック |

**統合テスト：**

| シナリオ | 期待結果 |
|----------|-----------------|
| 有効なslugでのGET商品 | カテゴリー、販売者、ショップ付きの完全詳細 |
| 非アクティブslugでのGET商品 | 404 |
| 商品のレビューGET | ユーザー情報付きの承認済みレビューのページネーション |
| 購入なしでのレビューPOST | 422（購入済みルール） |
| 重複レビューPOST | 409（ユニーク制約） |
| レビューPOSTでavgRating/reviewCount更新 | 集計が新しいレーティングを反映 |
| 在庫切れ商品のカート追加 | 422 / バリデーションエラー |
| お気に入り追加（新規/重複） | 201 / 409 |
| 商品の有効プロモーションGET | アクティブ、有効期間内、残数>0のみの200 |

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
| `VITE_API_URL` | `/api/v1` | バックエンドAPIベースURL |
| `PAGINATION_DEFAULT_LIMIT` | `10` | レビュー一覧のデフォルトページサイズ |
| `PAGINATION_MAX_LIMIT` | `50` | レビュー一覧の最大ページサイズ |
| `REVIEW_MAX_IMAGES` | `5` | レビューあたりの最大画像数 |
| `REVIEW_BODY_MAX_LENGTH` | `5000` | レビュー本文の最大長 |
| `PRODUCT_CACHE_TTL` | `300` | Redis商品キャッシュTTL（秒） |
| `SIMILAR_PRODUCT_LIMIT` | `8` | 返却される最大類似商品数 |
| `PROMOTION_MAX_LIMIT` | `10` | 返却される最大有効プロモーション数 |
| `PRODUCT_CACHE_KEY` | `cache:product:<id>` | Redisキャッシュキープレフィックス |
| `PRODUCT_LIST_CACHE_KEY` | `cache:products:list:*` | Redisリストキャッシュキープレフィックス |

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
| `products` | slugでの商品詳細ロード（SELECT）、レーティング再計算（UPDATE） | `idx_products_slug`、`idx_products_is_active`、`idx_products_category_id`、`uq_products_slug`、`chk_products_stock` |
| `categories` | パンくずとカテゴリー表示 | `idx_categories_parent_id` |
| `merchants` | マーチャント表示名（`shop_name`）、「販売者」セクションのライセンスステータス | `idx_merchants_user_id`、`idx_merchants_license_status` |
| `users` | レビュー投稿者情報（名前、avatarUrl） | `pk_users` |
| `shops` | 「販売者」のショッププロフィール — `shops.user_id`でリンク | `idx_shops_user_id`、`uq_shops_slug`、`idx_shops_is_approved` |
| `reviews` | レビュー一覧（SELECT）、レビュー作成（INSERT） | `idx_reviews_product_id`、`uq_reviews_user_product`、`chk_reviews_rating` |
| `review_reports` | レビュー管理（SELECT / INSERT） — 不適切レビューの報告用 | `idx_review_reports_review_id`、`idx_review_reports_status`、`chk_review_reports_reason`、`chk_review_reports_status` |
| `wishlist` | お気に入り追加（SELECT / INSERT） — テーブル名は単数形 | `idx_wishlist_user_id`、`uq_wishlist_user_product` |
| `promotions` | 有効プロモーション表示（SELECT）、`max_uses` / `used_count`から残数計算 | `idx_promotions_merchant_id`、`idx_promotions_is_active`、`idx_promotions_expires_at`、`uq_promotions_code`、`chk_promotions_discount_value`、`chk_promotions_dates` |
| `carts` | ユーザーカート管理（SELECT / INSERT） — DB設計書v2.2：カート永続化用の新テーブル | `idx_carts_user_id`、`uq_carts_user_id` |
| `cart_items` | カート商品行（SELECT / INSERT / UPDATE / DELETE） — DB設計書v2.2：カート商品用の新テーブル | `idx_cart_items_cart_id`、`uq_cart_items_cart_product`、`chk_cart_items_quantity` |
| `order_items` | レビュー検ビュー検証用の検証済み購入チェック（SELECT）。注：カート操作は`carts`/`cart_items`テーブルを使用（DB設計書v2.2）。 | `idx_order_items_product_id`、`idx_order_items_merchant_id`、`fk_order_items_product`、`fk_order_items_merchant`、`chk_order_items_quantity`、`chk_order_items_total` |

**参照Prismaクエリ：**

*リレーション付き商品詳細：*

```typescript
// NOTE: products.merchant_id → references merchants(id) (DATABASE_SPEC v2.0)
// merchants.shop_name is the display name; shops links via shops.user_id (not merchant_id)
const product = await prisma.product.findUnique({
  where: { slug: dto.slug, isActive: true },
  include: {
    category: { include: { parent: true } },
    merchant: {
      select: {
        id: true,
        shopName: true,       // merchants.shop_name (display name)
        licenseStatus: true,  // merchants.license_status
        user: {
          select: {
            shop: { select: { name: true, slug: true, logoUrl: true, isApproved: true } },
          },
        },
      },
    },
  },
});
```

*レビュー一覧（ページネーション付き）：*

```typescript
const [reviews, total] = await prisma.$transaction([
  prisma.review.findMany({
    where: { productId, isApproved: true },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  }),
  prisma.review.count({ where: { productId, isApproved: true } }),
]);
```

*レビュー作成 + レーティング再計算（トランザクション）：*

```typescript
await prisma.$transaction(async (tx) => {
  const review = await tx.review.create({
    data: {
      userId: currentUser.id,
      productId,
      rating: dto.rating,
      title: dto.title,
      body: dto.body,
      images: dto.images ?? [],
      isVerifiedPurchase: true,
    },
  });

  const aggregate = await tx.review.aggregate({
    where: { productId, isApproved: true },
    _avg: { rating: true },
    _count: { rating: true },
  });

  await tx.product.update({
    where: { id: productId },
    data: {
      avgRating: aggregate._avg.rating ?? 0,
      reviewCount: aggregate._count.rating,
    },
  });

  return review;
});
```

### 15.3 関連文書参照

| 文書ID | 文書名 | ファイルパス |
|-------------|---------------|-----------|
| SKM-REQ-001 | 要件定義書（v1.7） | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` |
| SKM-DBS-001 | データベース設計書（v2.2） | `docs/core-work/データベース設計書_DATABASE_SPEC.md` |
| SKM-DEV-001 | 開発ルール（v2.1） | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` |

---

## 16. 付録A: 実装チェックリスト

### バックエンド（NestJS）

- [ ] `products.controller.ts` - `@Public()`付き`GET /:slug`エンドポイント
- [ ] `products.service.ts` - リレーション+キャッシュ付き`findOneBySlug()`
- [ ] `reviews.controller.ts` - `GET/POST /products/:productId/reviews`
- [ ] `reviews.service.ts` - 購入済みチェック+トランザクションレーティング再計算
- [ ] `matching.service.ts` - `getSimilar()`エンドポイント
- [ ] `promotions.service.ts` - `findActiveByMerchant()`エンドポイント（`GET /products/:slug/promotions`）
- [ ] `dto/create-review.dto.ts`（class-validator付き）
- [ ] Redisキャッシュ：`cache:product:{id}`（TTL 5分）、レビュー/商品更新時に無効化
- [ ] ユニットテストの作成（サービスレベル、新規コードはカバレッジ≥90%）

### フロントエンド（React）

- [ ] `pages/products/ProductDetail.tsx`
- [ ] `features/products/components/ProductGallery.tsx`
- [ ] `features/products/components/ProductInfo.tsx`
- [ ] `features/products/components/ProductTabs.tsx`
- [ ] `features/products/components/SkinTypeCompatibility.tsx`
- [ ] `features/products/components/RelatedProducts.tsx`
- [ ] `features/products/components/ProductReviews.tsx`
- [ ] `features/products/components/ActivePromotion.tsx`
- [ ] `features/products/hooks/useProductDetail.ts`
- [ ] `features/products/schemas/product.schema.ts`
- [ ] `features/products/services/product.service.ts`
- [ ] パンくずナビゲーション（ホーム / カテゴリー / 商品）
- [ ] 在庫バリデーション+数量ステッパー付きカートに追加
- [ ] 楽観的更新付きお気に入り追加（削除はお気に入りモジュールで処理）
- [ ] 割引+残数表示付き有効プロモーションセクション
- [ ] レビューフォーム（レーティングスター、バリデーション、ログインゲーティング）
- [ ] 関連商品セクション（遅延ロード）
- [ ] 全非同期セクションのスケルトンローダー
- [ ] 全文字列のi18nキー（`products.json`のen / my / ja）
- [ ] コンポーネントテストの作成
- [ ] 閲覧 → 詳細 → カートフローの完全なE2Eテスト

---

*機能仕様（商品詳細）ここまで*
