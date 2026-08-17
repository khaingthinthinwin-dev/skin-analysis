# Cosmetics Finder 要件定義書

## Requirements Definition（要件定義）

---

## Document Control（ドキュメント管理）

| Attribute | Value |
| :--- | :--- |
| **Document ID** | SKM-REQ-001 |
| **System** | Cosmetics Finder |
| **Version** | 1.7 |
| **Created** | 2026-08-03 |
| **Last Updated** | 2026-08-17 |
| **Author** | Software Architect |
| **Status** | Released（承認済み） |

### Document Revision History（ドキュメント改訂履歴）

| Version | Date | Author | Description of Changes（変更説明） |
| :--- | :--- | :--- | :--- |
| 1.0 | 2026-08-03 | Software Architect | 初回要件定義 |
| 1.1 | 2026-08-10 | Software Architect | 広告承認ワークフロー、決済システム、週間広告制限、告知メッセージ要件を追加 |
| 1.2 | 2026-08-14 | Software Architect | システム仕様書から、包括的な出品者ステート管理、商品所有権ルール、レビューバリデーション、データベーススキーマ、API要件、データベースリレーションシップを追加 |
| 1.3 | 2026-08-14 | Software Architect | ショッピング機能（カート、お気に入り、チェックアウト）を購入者ロールのみに制限。メール通知をウェブサイト通知システムに置換 |
| 1.4 | 2026-08-14 | Software Architect | 全エンティティ定義をUUID主キーに更新。全エンティティのSQLスキーマを追加。usersテーブルにmerchant_idフィールドを追加 |
| 1.5 | 2026-08-14 | Software Architect | 重複していた注文ステータスフローセクションを削除 |
| 1.6 | 2026-08-17 | Software Architect | 手数料管理（§3.2.19）、収益追跡（§3.2.20）、広告料収益（§3.2.21）の要件を追加。commission_settings、revenue_targets、payoutsのデータベーススキーマを追加。手数料、収益、支払い、広告料のビジネスルール（§4.8-4.11）を追加。手数料＆収益APIエンドポイントを追加。フロントエンドルート構成を更新 |
| 1.7 | 2026-08-17 | Software Architect | AI肌分析の詳細要件（B-AI-009~021）、カートライフサイクルルール（B-CART-008~014）、注文ステータス履歴（§3.2.22）、在庫変動（§3.2.23）、レビュー報告（§3.2.24）、監査ログ（§3.2.25）、通知（§3.2.26）を追加。skin_analyses、skin_analysis_conditions、skin_analysis_recommendations、carts、cart_items、order_status_history、inventory_transactions、review_reports、audit_logs、notificationsのデータベーススキーマを追加 |

---

## Table of Contents（目次）

1. [Project Overview & Background](#1-project-overview--background)
2. [User Roles & Permissions](#2-user-roles--permissions)
3. [Functional Requirements](#3-functional-requirements)
4. [Special Business Rules](#4-special-business-rules)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [System Architecture Context](#6-system-architecture-context)
7. [Acceptance Criteria & Success Metrics](#7-acceptance-criteria--success-metrics)
8. [Appendix](#8-appendix)
9. [Appendix B - Cross-File Consistency Check](#9-appendix-b---cross-file-consistency-check)

---

## 1. Project Overview & Background（プロジェクト概要と背景）

### 1.1 Project Name（プロジェクト名）
**Cosmetics Finder**

### 1.2 Purpose & objectives（目的と目標）
本システムは、パーソナライズされたスキンケアソリューションを求める購入者と、スキンケア商品を販売する出品者をつなぐCosmetics Finderプラットフォームを提供します。プラットフォームの特徴は、AI肌分析、スマートな商品レコメンド、閲覧からチェックアウトまでの完全なeコマースワークフローです。

### 1.3 Business Context（ビジネス背景）
- **問題提起:** 消費者は個人の肌タイプや肌悩みに合ったスキンケア商品を見つけるのが困難です。従来のeコマースにはパーソナライゼーションが欠如しており、不適切な商品選択や無駄な支出につながっています。
- **解決策:** ユーザーの肌状態を分析し、パーソナライズされた商品をレコメンドするAI搭載のマーケットプレイスを実装し、購入者と適切な出品者をつなぎます。
- **期待される成果:**
  - AI分析に基づくパーソナライズされたスキンケア商品レコメンド
  - ターゲット商品マッチングによるコンバージョン率の向上
  - 出品者向けの商品管理・売上分析ツール
  - マルチベンダーマーケットプレイスモデルによるプラットフォーム成長

### 1.4 Project Scope（プロジェクト範囲）
- **含まれるもの:** ユーザー認証/認可、AI肌分析、商品管理、ショッピングカート、チェックアウト、注文管理、出品者ダッシュボード、管理者パネル、多言語対応（EN/MY/JA）
- **含まれないもの:** 物理的な商品配送ロジスティクス、ペイメントゲートウェイ統合（スタブ化）、モバイルネイティブアプリ、高度なMLモデルトレーニング

### 1.5 Technology Stack（技術スタック）

**Backend（バックエンド）:**
- Runtime: Node.js v22+ (LTS)
- Framework: NestJS v11
- Language: TypeScript v5.7+
- ORM: Prisma v6
- Database: PostgreSQL v16
- Cache: Redis v7 (ioredis v6)
- Auth: JWT (access + refresh tokens)、Argon2パスワードハッシュ
- API Docs: Swagger/OpenAPI v11

**Frontend（フロントエンド）:**
- UI Library: React v19
- Bundler: Vite v6
- Language: TypeScript v5.7+ (strict)
- Routing: React Router v7
- State: TanStack Query v5
- Forms: React Hook Form + Zod
- UI Components: shadcn/ui (Radix UI)
- Styling: Tailwind CSS v4
- i18n: i18next (English, Myanmar, Japanese)
- Testing: Vitest、Testing Library、MSW v2

---

## 2. User Roles & Permissions（ユーザーロールと権限）

### 2.0 Guest / Unauthorized User Rules（未認証ユーザールール）

#### Allowed Actions（許可される操作）
- ログインなしでホームページを閲覧
- 公開商品一覧を閲覧
- キーワードで商品を検索
- 商品をフィルタ（カテゴリ、価格、評価）
- 商品詳細ページを閲覧
- 公開の店舗プロフィールと所在地を閲覧
- ストアフロントに表示される広告を閲覧
- 商品レビューを閲覧（読み取りのみ）

#### Restricted Actions（制限される操作。ログインへリダイレクト。）

| Action | Behavior |
|--------|----------|
| カートに追加 | ログインボタン付きアラートモーダルを表示 → `/login` へリダイレクト |
| お気に入りに追加 | ログインボタン付きアラートモーダルを表示 → `/login` へリダイレクト |
| AI肌分析 | `/register` へリダイレクト |
| チェックアウト＆決済 | `/login` へリダイレクト |
| レビュー作成 | `/login` へリダイレクト |
| 注文履歴の閲覧 | `/login` へリダイレクト |
| 出品者とのチャット | `/login` へリダイレクト |
| 注文追跡 | `/login` へリダイレクト |

#### Implementation Notes（実装上の注意事項）
- すべての制限操作は、実行前に `req.user` または同等の認証状態をチェックすること
- ユーザー操作なしではアラートモーダルを閉じないこと（自動クローズなし）
- リダイレクトURLにはログイン後ナビゲーション用に `?redirect=<original_path>` を含めること
- 公開ルートは、いかなる個人ユーザーデータやセッショントークンも公開してはならない

### 2.1 User Roles Overview（ユーザーロール概要）

| Role | Japanese Name | Primary Responsibility | Key Permissions |
|------|---------------|----------------------|-----------------|
| **Buyer** | 購入者 | 商品閲覧、AI分析、購入 | • Register/login<br>• AI肌分析<br>• 商品の閲覧/検索<br>• カート/お気に入りに追加<br>• チェックアウト＆決済<br>• レビュー作成<br>• 注文履歴の閲覧 |
| **Merchant** | 出品者 | スキンケア商品の販売 | • Register/login<br>• 商品の閲覧<br>• 商品管理（CRUD）<br>• 店舗プロフィール管理<br>• プロモーション/クーポン作成<br>• 広告管理<br>• セールスダッシュボード閲覧<br>• 分析閲覧 |
| **Admin** | 管理者 | プラットフォーム管理 | • Register/login<br>• ユーザー管理<br>• 出品者承認<br>• レビューモデレーション<br>• コンテンツモデレーション<br>• 分析＆レポート<br>• 収益＆手数料管理 |

### 2.2 Role-Based Access Control (RBAC)（ロールベースアクセス制御）

**Permission Matrix（権限マトリクス）:**

| Feature | Buyer | Merchant | Admin |
|---------|:-----:|:--------:|:-----:|
| **User Management（ユーザー管理）** | | | |
| Register/Login（登録/ログイン） | ✅ | ✅ | ✅ |
| View/Edit Own Profile（自分のプロフィール表示/編集） | ✅ | ✅ | ✅ |
| Manage Users（ユーザー管理） | ❌ | ❌ | ✅ |
| **Product Management（商品管理）** | | | |
| Browse Products（商品閲覧） | ✅ | ✅ | ✅ |
| Search/Filter Products（商品検索/フィルタ） | ✅ | ✅ | ✅ |
| View Product Details（商品詳細の閲覧） | ✅ | ✅ | ✅ |
| Create/Edit Products（商品作成/編集） | ❌ | ✅ | ✅ |
| Delete Products（商品削除） | ❌ | ✅ | ✅ |
| **AI Skin Analysis（AI肌分析）** | | | |
| Upload Photo（写真アップロード） | ✅ | ❌ | ❌ |
| View Analysis Results（分析結果の閲覧） | ✅ | ❌ | ❌ |
| View Recommendations（レコメンドの閲覧） | ✅ | ❌ | ❌ |
| **Shopping（ショッピング）** | | | |
| Add to Cart（カート追加） | ✅ | ❌ | ❌ |
| Manage Cart（カート管理） | ✅ | ❌ | ❌ |
| Checkout（チェックアウト） | ✅ | ❌ | ❌ |
| View Orders（注文閲覧） | ✅ | ❌ | ❌ |
| **Wishlist（お気に入り）** | | | |
| Add/Remove Wishlist（お気に入り追加/削除） | ✅ | ❌ | ❌ |
| View Wishlist（お気に入り一覧の閲覧） | ✅ | ❌ | ❌ |
| **Reviews（レビュー）** | | | |
| Write Reviews（レビュー作成） | ✅ | ❌ | ❌ |
| View Reviews（レビュー閲覧） | ✅ | ✅ | ✅ |
| Moderate Reviews（レビューモデレーション） | ❌ | ❌ | ✅ |
| **Merchant Features（出品者機能）** | | | |
| Manage Shop Profile（店舗プロフィール管理） | ❌ | ✅ | ✅ |
| View Sales Dashboard（セールスダッシュボード閲覧） | ❌ | ✅ | ✅ |
| Create Promotions（プロモーション作成） | ❌ | ✅ | ✅ |
| Manage Advertisements（広告管理） | ❌ | ✅ | ✅ |
| View Analytics（分析閲覧） | ❌ | ✅ | ✅ |
| **Admin Features（管理者機能）** | | | |
| Approve Merchants（出品者承認） | ❌ | ❌ | ✅ |
| Moderate Content（コンテンツモデレーション） | ❌ | ❌ | ✅ |
| Revenue Tracking（収益追跡） | ❌ | ❌ | ✅ |
| Commission Management（手数料管理） | ❌ | ❌ | ✅ |

### 2.3 Buyer / Authorized User Rules（認証済み購入者ルール）

#### Authentication Requirements（認証要件）
- 有効なJWT/セッショントークンでログインしていること
- アカウントステータスが `active` であること（`inactive` や `banned` でないこと）
- 全機能へのアクセス前にメール認証が必須

#### Allowed Actions（許可される操作）
- 完全な商品閲覧と検索
- AI肌分析（写真アップロードと結果）
- パーソナライズされた商品レコメンド
- **ショッピング機能（購入者のみ）:**
  - お気に入り管理（追加/削除/カートへ移動）
  - カート管理（追加/削除/数量更新）
  - チェックアウトと決済処理
  - 注文の登録と追跡
- 購入済み商品のレビュー作成
- 自分のプロフィール管理
- 出品者とのチャット（将来機能）
- パスワードリセットの要求
- パスワード忘れの要求

#### Buyer-Specific Validations（購入者固有のバリデーション）
- AI機能にはプロフィールに肌タイプと肌悩みの設定が必要
- 写真アップロード: JPG, PNG, WebPのみ、最大10MB
- 顧客ごとに商品ごとに1件のみのレビュー
- レビューは商品到着確認後にのみ許可
- クーポンコードはチェックアウト時に検証（有効期限、最低金額、単一使用）

#### Shopping Restriction（ショッピング制限）
- **MerchantおよびAdminユーザーはショッピング機能にアクセス不可**
- カート、お気に入り、チェックアウト、注文機能はBuyerロールのみに限定
- 制限された操作を試みると `403 Forbidden` を返し、メッセージ: "Shopping features are only available to buyers"

#### Session Management（セッション管理）
- JWTトークン有効期限: 24時間
- リフレッシュトークン有効期限: 7日間
- 無効/期限切れトークンは `401 Unauthorized` を返す

### 2.4 Merchant Rules（出品者ルール）

#### Merchant Allowed Actions（出品者の許可操作）
- Register/login
- 商品の閲覧と検索（閲覧のみ）
- 商品詳細の閲覧
- 自社商品の管理（CRUD）
- 店舗プロフィール管理
- プロモーション/クーポン作成
- 広告管理
- セールスダッシュボードと分析の閲覧
- レビューの閲覧（読み取りのみ）
- 紛争管理（虚偽/悪質なレビューの報告）

#### Merchant Restricted Actions（出品者の制限操作）
- **ショッピング機能（カート、お気に入り、チェックアウト）にアクセス不可**
- **レビューを作成不可**
- **AI肌分析を使用不可**
- 制限された操作を試みると `403 Forbidden` を返し、メッセージ: "This feature is not available for merchant accounts"

### 2.5 Admin Rules（管理者ルール）

#### Admin Allowed Actions（管理者の許可操作）
- Register/login
- ユーザー管理（閲覧、ステータス切替）
- 出品者の承認/却下
- レビューモデレーション（承認/却下/フラグ）
- コンテンツモデレーション
- 広告の管理と承認
- 収益と手数料の管理
- プラットフォーム分析とレポート
- システム設定

#### Admin Restricted Actions（管理者の制限操作）
- **ショッピング機能（カート、お気に入り、チェックアウト）にアクセス不可**
- **レビューを作成不可**
- **AI肌分析を使用不可**
- **商品の作成/編集不可（モデレーション目的を除く）**
- 制限された操作を試みると `403 Forbidden` を返し、メッセージ: "This feature is not available for admin accounts"

### 2.6 Merchant State Management（出品者ステート管理）

#### State Definitions（ステート定義）

| State | Code | Description |
|-------|------|-------------|
| **Pending** | `pending` | 登録送信済み、管理者の承認待ち |
| **Approved** | `approved` | ライセンス検証済み、完全なアクセス権が付与 |
| **Rejected** | `rejected` | ライセンス却下、アクセス不可 |

#### State Transitions（ステート遷移）

```
[新規登録]
       ↓
    PENDING ────────→ APPROVED
       ↓                  ↑
    REJECTED ─── Resubmit ┘
```

#### Pending State Rules（保留ステートのルール）
- メールアドレスとパスワードでログイン可
- 出品者ダッシュボードにアクセス可
- 自分のプロフィールを閲覧・編集可
- ライセンスステータスと却下理由を閲覧可
- **不可:** 商品の作成/編集/削除
- **不可:** プロモーションやクーポンの作成
- **不可:** 広告の作成
- **不可:** セールス分析へのアクセス
- **不可:** 店舗の一般公開
- **不可:** ショッピング機能（カート、お気に入り、チェックアウト）へのアクセス
- 制限された操作を試みると `403 Forbidden` を返し、メッセージ: "Your account is pending approval"

#### Approved State Rules（承認ステートのルール）
- 全出品者機能への完全なアクセス（ショッピングを除く）
- 店舗が一般公開される
- 商品が検索結果に表示される
- 商品、プロモーション、広告の作成/管理ができる
- セールスダッシュボードと分析の閲覧ができる
- 注文請求書を生成できる
- **不可:** ショッピング機能（カート、お気に入り、チェックアウト）へのアクセス

#### Rejected State Rules（却下ステートのルール）
- メールアドレスとパスワードでログイン可
- アラートバナーを表示: "Your account has been rejected. Reason: [reason]"
- 却下の詳細を閲覧可
- 承認のためにライセンスを再送信可
- **不可:** 出品者機能のいずれにもアクセス不可
- **不可:** ショッピング機能（カート、お気に入り、チェックアウト）へのアクセス
- 制限された操作を試みると `403 Forbidden` を返し、メッセージ: "Your account has been rejected"

### 2.7 Strict APPROVED-Only Merchant Feature Gate（承認済み限定の厳格な出品者機能ゲート）

#### Implementation Rule（実装ルール）
すべての出品者固有機能は、アクセス許可前に `merchant.license_status === 'approved'` をチェックすること。

#### Middleware / Guard Logic（ミドルウェア/ガードロジック）
```typescript
// Pseudocode for merchant feature guard
function requireApprovedMerchant(req, res, next) {
  const merchant = getMerchantByUserId(req.user.id);

  if (!merchant) {
    return res.status(403).json({
      error: 'MERCHANT_NOT_FOUND',
      message: 'You must register as a merchant first'
    });
  }

  if (merchant.license_status !== 'approved') {
    return res.status(403).json({
      error: 'MERCHANT_NOT_APPROVED',
      status: merchant.license_status,
      message: getStatusMessage(merchant.license_status)
    });
  }

  next();
}
```

#### Shopping Feature Guard（ショッピング機能ガード）
```typescript
// Middleware to restrict shopping features to buyers only
function requireBuyerRole(req, res, next) {
  if (req.user.role !== 'buyer') {
    return res.status(403).json({
      error: 'SHOPPING_NOT_ALLOWED',
      message: 'Shopping features are only available to buyers'
    });
  }
  next();
}
```

#### Protected Endpoints (Merchant Only)（出品者専用保護エンドポイント）
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/products` | POST | 商品作成 |
| `/products/:id` | PATCH | 商品編集 |
| `/products/:id` | DELETE | 商品のソフト削除 |
| `/products/:id/stock` | PATCH | 在庫更新 |
| `/promotions` | POST | プロモーション作成 |
| `/promotions/:id` | PATCH | プロモーション編集 |
| `/promotions/:id` | DELETE | プロモーション削除 |
| `/ads` | POST | 広告作成 |
| `/ads/:id/pay` | POST | 広告料金の支払い |
| `/ads/:id/submit` | POST | 承認用に広告を送信 |
| `/shops/merchant` | PATCH | 店舗プロフィール編集 |
| `/analytics/merchant/dashboard` | GET | ダッシュボード閲覧 |
| `/analytics/merchant/sales` | GET | 分析閲覧 |

#### Protected Endpoints (Buyer Only - Shopping)（購入者専用保護エンドポイント - ショッピング）
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/cart` | GET | カート閲覧 |
| `/cart/items` | POST | カートにアイテム追加 |
| `/cart/items/:id` | PATCH | カートアイテム更新 |
| `/cart/items/:id` | DELETE | カートアイテム削除 |
| `/wishlist` | GET | お気に入り閲覧 |
| `/wishlist/:productId` | POST | お気に入りに追加 |
| `/wishlist/:productId` | DELETE | お気に入りから削除 |
| `/orders` | POST | 注文登録 |
| `/orders` | GET | 注文履歴の閲覧 |
| `/orders/:id` | GET | 注文詳細の閲覧 |
| `/checkout` | POST | チェックアウト処理 |

### 2.8 Product Ownership & 403 Authorization（商品所有権と403認可）

#### Ownership Rules（所有権ルール）
- 商品は `approved` ステータスの出品者のみが作成できる
- 各商品は `merchant_id` を介して正確に1人の出品者にリンクされる
- 所有する出品者のみが自社商品を編集/削除できる
- Adminは所有権に関係なくすべての商品を閲覧できる

#### Authorization Check（認可チェック）
```typescript
// Middleware for product ownership verification
function requireProductOwnership(req, res, next) {
  const product = getProductById(req.params.id);

  if (!product) {
    return res.status(404).json({ error: 'PRODUCT_NOT_FOUND' });
  }

  if (req.user.role === 'admin') {
    return next(); // Admin bypass
  }

  if (req.user.role !== 'merchant') {
    return res.status(403).json({ error: 'UNAUTHORIZED' });
  }

  const merchant = getMerchantByUserId(req.user.id);

  if (product.merchant_id !== merchant.id) {
    return res.status(403).json({
      error: 'PRODUCT_OWNERSHIP_REQUIRED',
      message: 'You can only manage your own products'
    });
  }

  next();
}
```

#### 403 Error Responses（403エラーレスポンス）
| Scenario | Error Code | Message |
|----------|------------|---------|
| 購入者が出品者機能にアクセスしようとした | `UNAUTHORIZED_ROLE` | "You do not have merchant permissions" |
| 出品者/管理者がショッピング機能にアクセスしようとした | `SHOPPING_NOT_ALLOWED` | "Shopping features are only available to buyers" |
| 保留中の出品者が商品を作成しようとした | `MERCHANT_NOT_APPROVED` | "Your account is pending approval" |
| 却下された出品者が出品者操作を試みた | `MERCHANT_REJECTED` | "Your account has been rejected" |
| 出品者が他者の商品を編集しようとした | `PRODUCT_OWNERSHIP_REQUIRED` | "You can only manage your own products" |
| 未認証ユーザーが保護された操作を試みた | `AUTHENTICATION_REQUIRED` | "Please login to continue" |

### 2.9 Password Reset / Forgot Password（パスワードリセット/パスワード忘れ）

#### Flow（フロー）
```
ユーザーが「パスワードを忘れた」をクリック
    ↓
メールアドレスを入力
    ↓
システムがパスワードリセットトークン（6桁コードまたはリンク）を生成
    ↓
リセットコード/リンク付きのウェブサイト通知を表示
    ↓
ユーザーがコードを入力するかリンクをクリック
    ↓
ユーザーが新しいパスワードを入力（8文字以上、大文字1つ、数字1つ、特殊文字1つ）
    ↓
パスワードが更新され、すべての既存セッションが無効化される
    ↓
成功メッセージ付きでログインへリダイレクト
```

#### API Endpoints（APIエンドポイント）
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/forgot-password` | パスワードリセットの要求 |
| POST | `/auth/reset-password` | トークンでパスワードをリセット |
| POST | `/auth/verify-reset-code` | 6桁コードの検証 |

#### Security Rules（セキュリティルール）
- リセットトークンは15分後に失効
- メールごとに1時間あたり最大3回のリセット要求
- リセットコードは6桁で、有効期限10分
- リセット成功後、すべての既存セッションを無効化
- パスワードリセットイベントを監査証跡にログ記録

### 2.10 Website Notification System（ウェブサイト通知システム）

#### Notification Types（通知タイプ）
| Type | Trigger | Target User |
|------|---------|-------------|
| `merchant_approved` | Adminが出品者登録を承認 | Merchant |
| `merchant_rejected` | Adminが出品者登録を却下 | Merchant |
| `order_placed` | 購入者が新しい注文を登録 | Merchant |
| `order_status_changed` | 出品者が注文ステータスを更新 | Buyer |
| `ad_approved` | Adminが広告を承認 | Merchant |
| `ad_rejected` | Adminが広告を却下 | Merchant |
| `review_submitted` | 購入者が商品レビューを投稿 | Merchant |
| `review_moderated` | Adminがレビューをモデレーション | Buyer |
| `password_reset` | ユーザーがパスワードリセットを要求 | User（全ロール） |
| `stock_low_warning` | 商品在庫が閾値を下回る | Merchant |
| `license_expiring` | 出品者ライセンスの期限が近い | Merchant |

#### Notification Data Structure（通知データ構造）
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "type": "merchant_approved",
  "title": "Merchant Registration Approved",
  "message": "Your merchant registration has been approved. You can now access all merchant features.",
  "data": {
    "merchant_id": "uuid",
    "shop_name": "Beauty Shop"
  },
  "is_read": false,
  "created_at": "2026-08-14T10:30:00Z"
}
```

#### Notification Endpoints（通知エンドポイント）
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/notifications` | ユーザー通知を取得（ページネーション付き） |
| GET | `/notifications/unread-count` | 未読通知数を取得 |
| PATCH | `/notifications/:id/read` | 通知を既読にする |
| PATCH | `/notifications/read-all` | すべての通知を既読にする |
| DELETE | `/notifications/:id` | 通知を削除 |

#### Notification Display Rules（通知表示ルール）
- 通知はヘッダーのベルアイコンと未読数バッジで表示される
- ベルアイコンをクリックすると通知ドロップダウンパネルが表示される
- 通知は作成日順（新しい順）に並べられる
- 未読通知は太字で強調表示される
- 通知をクリックすると既読になり、該当ページに遷移する（該当する場合）
- ユーザーごとの通知は最大100件（古いものは自動削除）
- 90日以上経過した通知は自動削除

### 2.11 Merchant Rejection Reason & Review Information（出品者却下理由と審査情報）

#### Rejection Data Structure（却下データ構造）
```json
{
  "merchant_id": "uuid",
  "license_status": "rejected",
  "rejection_reason": "Business license is expired or unreadable",
  "rejection_details": {
    "category": "expired_license | invalid_document | mismatch | other",
    "message": "The uploaded license shows an expiration date of 2024-12-31",
    "suggested_action": "Please upload a current valid business license",
    "resubmit_allowed": true
  },
  "reviewed_at": "2026-08-10T10:30:00Z",
  "reviewed_by": "admin_user_id"
}
```

#### Website Notification for Rejection（却下時のウェブサイト通知）
```json
{
  "type": "merchant_rejected",
  "title": "Merchant Registration Update",
  "message": "Your merchant registration has been reviewed. Reason: Business license is expired or unreadable. Please resubmit with a valid license.",
  "data": {
    "merchant_id": "uuid",
    "rejection_reason": "Business license is expired or unreadable",
    "resubmit_url": "/merchant/license/resubmit"
  }
}
```

---

## 3. Functional Requirements（機能要件）

### 3.1 Core Entities & Data Model（コアエンティティとデータモデル）

#### 3.1.1 User Entity
ロール割り当てを持つシステムユーザーを表現します。

**Attributes（属性）:**
- UserID (Primary Key, UUID)
- Email (Unique, VARCHAR(255))
- PasswordHash (VARCHAR(255), Argon2)
- Name (VARCHAR(255))
- Phone (VARCHAR(20), Optional)
- AvatarUrl (TEXT, Optional)
- Role (VARCHAR(20), Default: 'buyer') - 値: 'buyer', 'merchant', 'admin', 'super_admin'
- MerchantID (UUID, Foreign Key to Merchants, Optional) - ユーザーを出品者アカウントにリンク
- IsActive (BOOLEAN, Default: true)
- EmailVerified (BOOLEAN, Default: false)
- CreatedAt (TIMESTAMP)
- UpdatedAt (TIMESTAMP)

**SQL Schema:**
```sql
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  name            VARCHAR(255) NOT NULL,
  phone           VARCHAR(20),
  avatar_url      TEXT,
  role            VARCHAR(20) NOT NULL DEFAULT 'buyer',
  -- roles: 'buyer', 'merchant', 'admin', 'super_admin'
  merchant_id     UUID REFERENCES merchants(id),
  is_active       BOOLEAN DEFAULT true,
  email_verified  BOOLEAN DEFAULT false,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);
```

#### 3.1.2 Product Entity
出品者によって出品されたスキンケア商品を表現します。

**Attributes（属性）:**
- ProductID (Primary Key, UUID)
- MerchantID (Foreign Key to Merchants)
- CategoryID (Foreign Key to Categories)
- Name (VARCHAR(255))
- Slug (VARCHAR(255), Unique)
- Description (TEXT)
- ShortDescription (VARCHAR(500), Optional)
- Price (DECIMAL(10,2))
- CompareAtPrice (DECIMAL(10,2), Optional)
- SKU (VARCHAR(100), Unique, Optional)
- StockQuantity (INTEGER, Default: 0)
- LowStockThreshold (INTEGER, Default: 10)
- Images (TEXT Array)
- Tags (TEXT Array)
- SkinTypes (TEXT Array)
- Ingredients (TEXT Array)
- IsActive (BOOLEAN, Default: true)
- IsFeatured (BOOLEAN, Default: false)
- AvgRating (DECIMAL(3,2), Default: 0)
- ReviewCount (INTEGER, Default: 0)
- CreatedAt (TIMESTAMP)
- UpdatedAt (TIMESTAMP)

**SQL Schema:**
```sql
CREATE TABLE products (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id       UUID NOT NULL REFERENCES merchants(id),
  category_id       UUID REFERENCES categories(id),
  name              VARCHAR(255) NOT NULL,
  slug              VARCHAR(255) UNIQUE NOT NULL,
  description       TEXT,
  short_description VARCHAR(500),
  price             DECIMAL(10,2) NOT NULL,
  compare_at_price  DECIMAL(10,2),
  sku               VARCHAR(100) UNIQUE,
  stock_quantity    INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 10,
  images            TEXT[],
  tags              TEXT[],
  skin_types        TEXT[],
  ingredients       TEXT[],
  is_active         BOOLEAN DEFAULT true,
  is_featured       BOOLEAN DEFAULT false,
  avg_rating        DECIMAL(3,2) DEFAULT 0,
  review_count      INTEGER DEFAULT 0,
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW()
);
```

#### 3.1.3 Category Entity
ツリー構造を持つ商品カテゴリを表現します。

**Attributes（属性）:**
- CategoryID (Primary Key, UUID)
- Name (VARCHAR(255))
- Slug (VARCHAR(255), Unique)
- ParentID (Foreign Key to Categories, Optional)
- IconUrl (TEXT, Optional)
- SortOrder (INTEGER, Default: 0)
- CreatedAt (TIMESTAMP)

**SQL Schema:**
```sql
CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  slug        VARCHAR(255) UNIQUE NOT NULL,
  parent_id   UUID REFERENCES categories(id),
  icon_url    TEXT,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMP DEFAULT NOW()
);
```

#### 3.1.4 Order Entity
顧客注文を表現します。

**Attributes（属性）:**
- OrderID (Primary Key, UUID)
- BuyerID (Foreign Key to Users)
- MerchantID (Foreign Key to Merchants)
- Status (VARCHAR(30), Default: 'placed') - 値: 'placed', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'
- TotalAmount (DECIMAL(10,2))
- ShippingAddress (JSONB)
- PaymentMethod (VARCHAR(50))
- PaymentStatus (VARCHAR(20), Default: 'pending') - 値: 'pending', 'completed', 'failed', 'refunded'
- CouponCode (VARCHAR(50), Optional)
- DiscountAmount (DECIMAL(10,2), Default: 0)
- Notes (TEXT, Optional)
- CreatedAt (TIMESTAMP)
- UpdatedAt (TIMESTAMP)

**SQL Schema:**
```sql
CREATE TABLE orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id        UUID NOT NULL REFERENCES users(id),
  merchant_id     UUID NOT NULL REFERENCES merchants(id),
  status          VARCHAR(30) NOT NULL DEFAULT 'placed',
  total_amount    DECIMAL(10,2) NOT NULL,
  shipping_address JSONB NOT NULL,
  payment_method  VARCHAR(50) NOT NULL,
  payment_status  VARCHAR(20) NOT NULL DEFAULT 'pending',
  coupon_code     VARCHAR(50),
  discount_amount DECIMAL(10,2) DEFAULT 0,
  notes           TEXT,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);
```

#### 3.1.5 Review Entity
商品レビューを表現します。

**Attributes（属性）:**
- ReviewID (Primary Key, UUID)
- UserID (Foreign Key to Users)
- ProductID (Foreign Key to Products)
- Rating (INTEGER, 1-5)
- Title (VARCHAR(255), Optional)
- Body (TEXT, Optional)
- Images (TEXT Array)
- IsVerifiedPurchase (BOOLEAN, Default: false)
- IsApproved (BOOLEAN, Default: true)
- CreatedAt (TIMESTAMP)
- UpdatedAt (TIMESTAMP)
- Unique Constraint: [UserID, ProductID]

**SQL Schema:**
```sql
CREATE TABLE reviews (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id),
  product_id          UUID NOT NULL REFERENCES products(id),
  rating              INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title               VARCHAR(255),
  body                TEXT,
  images              TEXT[],
  is_verified_purchase BOOLEAN DEFAULT false,
  is_approved         BOOLEAN DEFAULT true,
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);
```

#### 3.1.6 Wishlist Entity
ユーザーの保存された商品を表現します。

**Attributes（属性）:**
- WishlistID (Primary Key, UUID)
- UserID (Foreign Key to Users)
- ProductID (Foreign Key to Products)
- CreatedAt (TIMESTAMP)
- Unique Constraint: [UserID, ProductID]

**SQL Schema:**
```sql
CREATE TABLE wishlist (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  product_id  UUID NOT NULL REFERENCES products(id),
  created_at  TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);
```

#### 3.1.7 Shop Entity
出品者の店舗プロフィールを表現します。

**Attributes（属性）:**
- ShopID (Primary Key, UUID)
- UserID (Foreign Key to Users, Unique)
- Name (VARCHAR(255))
- Slug (VARCHAR(255), Unique)
- Description (TEXT, Optional)
- LogoUrl (TEXT, Optional)
- BannerUrl (TEXT, Optional)
- Address (TEXT, Optional)
- Phone (VARCHAR(20), Optional)
- Email (VARCHAR(255), Optional)
- Latitude (DECIMAL(10,7), Optional)
- Longitude (DECIMAL(10,7), Optional)
- IsApproved (BOOLEAN, Default: false)
- CreatedAt (TIMESTAMP)
- UpdatedAt (TIMESTAMP)

**SQL Schema:**
```sql
CREATE TABLE shops (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID UNIQUE NOT NULL REFERENCES users(id),
  name        VARCHAR(255) NOT NULL,
  slug        VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  logo_url    TEXT,
  banner_url  TEXT,
  address     TEXT,
  phone       VARCHAR(20),
  email       VARCHAR(255),
  latitude    DECIMAL(10,7),
  longitude   DECIMAL(10,7),
  is_approved BOOLEAN DEFAULT false,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);
```

#### 3.1.8 Promotion Entity
割引コードとプロモーションを表現します。

**Attributes（属性）:**
- PromotionID (Primary Key, UUID)
- MerchantID (Foreign Key to Merchants)
- Code (VARCHAR(50), Unique)
- Description (TEXT, Optional)
- DiscountType (VARCHAR(20)) - 値: 'percentage', 'fixed'
- DiscountValue (DECIMAL(10,2))
- MinOrderAmount (DECIMAL(10,2), Optional)
- MaxUses (INTEGER, Optional)
- UsedCount (INTEGER, Default: 0)
- StartsAt (TIMESTAMP)
- ExpiresAt (TIMESTAMP)
- IsActive (BOOLEAN, Default: true)
- CreatedAt (TIMESTAMP)

**SQL Schema:**
```sql
CREATE TABLE promotions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id     UUID NOT NULL REFERENCES merchants(id),
  code            VARCHAR(50) UNIQUE NOT NULL,
  description     TEXT,
  discount_type   VARCHAR(20) NOT NULL,
  discount_value  DECIMAL(10,2) NOT NULL,
  min_order_amount DECIMAL(10,2),
  max_uses        INTEGER,
  used_count      INTEGER DEFAULT 0,
  starts_at       TIMESTAMP NOT NULL,
  expires_at      TIMESTAMP NOT NULL,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMP DEFAULT NOW()
);
```

#### 3.1.9 Advertisement Entity
承認ワークフロー、決済追跡、週間制限を持つ店舗広告を表現します。

**Attributes（属性）:**
- AdvertisementID (Primary Key, UUID)
- ShopID (Foreign Key to Shops)
- Title (VARCHAR(255))
- Content (TEXT, Optional)
- AnnouncementMessage (VARCHAR(500), Required) — ストアフロントに表示されるバナーテキスト
- ImageUrl (TEXT, Optional)
- LinkUrl (TEXT, Optional)
- IsActive (BOOLEAN, Default: true)
- ApprovalStatus (VARCHAR(20), Default: 'pending') - 値: 'pending', 'approved', 'rejected'
- PaymentStatus (VARCHAR(20), Default: 'pending') - 値: 'pending', 'completed', 'refunded', 'failed'
- PaymentAmount (DECIMAL(10,2), Optional) — 広告料金
- PaymentReference (VARCHAR(255), Optional) — 決済取引参照
- ApprovedBy (Foreign Key to Users, Optional) — 承認/却下した管理者
- ApprovedAt (TIMESTAMP, Optional)
- RejectionReason (TEXT, Optional) — 管理者が却下する際の理由
- WeekNumber (INTEGER) — 週間制限追跡用のISO週番号
- StartsAt (TIMESTAMP)
- ExpiresAt (TIMESTAMP)
- CreatedAt (TIMESTAMP)

**SQL Schema:**
```sql
CREATE TABLE advertisements (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id               UUID NOT NULL REFERENCES shops(id),
  title                 VARCHAR(255) NOT NULL,
  content               TEXT,
  announcement_message  VARCHAR(500) NOT NULL,
  image_url             TEXT,
  link_url              TEXT,
  is_active             BOOLEAN DEFAULT true,
  approval_status       VARCHAR(20) NOT NULL DEFAULT 'pending',
  payment_status        VARCHAR(20) NOT NULL DEFAULT 'pending',
  payment_amount        DECIMAL(10,2),
  payment_reference     VARCHAR(255),
  approved_by           UUID REFERENCES users(id),
  approved_at           TIMESTAMP,
  rejection_reason      TEXT,
  week_number           INTEGER,
  starts_at             TIMESTAMP NOT NULL,
  expires_at            TIMESTAMP NOT NULL,
  created_at            TIMESTAMP DEFAULT NOW()
);
```

#### 3.1.10 RefreshToken Entity
JWTリフレッシュトークンを表現します。

**Attributes（属性）:**
- RefreshTokenID (Primary Key, UUID)
- UserID (Foreign Key to Users)
- TokenHash (VARCHAR(255))
- Family (VARCHAR(255))
- DeviceInfo (JSONB, Optional)
- IPAddress (VARCHAR(45), Optional)
- IsRevoked (BOOLEAN, Default: false)
- AbsoluteLimitAt (TIMESTAMP)
- ExpiresAt (TIMESTAMP)
- CreatedAt (TIMESTAMP)

**SQL Schema:**
```sql
CREATE TABLE refresh_tokens (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id),
  token_hash        VARCHAR(255) NOT NULL,
  family            VARCHAR(255) NOT NULL,
  device_info       JSONB,
  ip_address        VARCHAR(45),
  is_revoked        BOOLEAN DEFAULT false,
  absolute_limit_at TIMESTAMP NOT NULL,
  expires_at        TIMESTAMP NOT NULL,
  created_at        TIMESTAMP DEFAULT NOW()
);
```

### 3.1.11 Database Schema（データベーススキーマ）

#### Users Table
```sql
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  name            VARCHAR(255) NOT NULL,
  phone           VARCHAR(20),
  avatar_url      TEXT,
  role            VARCHAR(20) NOT NULL DEFAULT 'buyer',
  -- roles: 'buyer', 'merchant', 'admin', 'super_admin'
  is_active       BOOLEAN DEFAULT true,
  email_verified  BOOLEAN DEFAULT false,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);
```

#### Merchants Table
```sql
CREATE TABLE merchants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID UNIQUE NOT NULL REFERENCES users(id),
  shop_name       VARCHAR(255) NOT NULL,
  business_license_url TEXT NOT NULL,
  license_status  VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- status: 'pending', 'approved', 'rejected'
  rejection_reason TEXT,
  reviewed_at     TIMESTAMP,
  reviewed_by     UUID REFERENCES users(id),
  license_expires_at TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);
```

#### Orders Table
```sql
CREATE TABLE orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id        UUID NOT NULL REFERENCES users(id),
  merchant_id     UUID NOT NULL REFERENCES merchants(id),
  status          VARCHAR(30) NOT NULL DEFAULT 'placed',
  total_amount    DECIMAL(10,2) NOT NULL,
  shipping_address JSONB NOT NULL,
  payment_method  VARCHAR(50) NOT NULL,
  payment_status  VARCHAR(20) NOT NULL DEFAULT 'pending',
  coupon_code     VARCHAR(50),
  discount_amount DECIMAL(10,2) DEFAULT 0,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);
```

#### Order Status Flow（注文ステータスフロー）
```
placed → confirmed → packed → shipped → out_for_delivery → delivered
   ↓         ↓          ↓         ↓              ↓              ↓
  Any state can be cancelled (before shipped) → cancelled
```

#### Order Status Updates（注文ステータス更新）
| Status | Description | Updated By |
|--------|-------------|------------|
| `placed` | 注文作成、確認待ち | System |
| `confirmed` | 出品者が注文を受け付けた | Merchant |
| `packed` | 注文が梱包され、発送準備完了 | Merchant |
| `shipped` | 注文が運送業者に引き渡された | Merchant |
| `out_for_delivery` | 注文が購入者へ配達中 | Courier/System |
| `delivered` | 購入者が注文を受け取った | Buyer/System |
| `cancelled` | 注文がキャンセルされた（購入者または出品者） | Buyer/Merchant |

#### Tracking Response（追跡レスポンス）
```json
{
  "order_id": "uuid",
  "status": "shipped",
  "timeline": [
    { "status": "placed", "timestamp": "2026-08-10T10:00:00Z" },
    { "status": "confirmed", "timestamp": "2026-08-10T14:30:00Z" },
    { "status": "packed", "timestamp": "2026-08-11T09:00:00Z" },
    { "status": "shipped", "timestamp": "2026-08-11T15:00:00Z" }
  ],
  "estimated_delivery": "2026-08-14",
  "carrier": "YANGON_EXPRESS",
  "tracking_number": "YOE123456789"
}
```

#### Advertisements Table
```sql
CREATE TABLE advertisements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id         UUID NOT NULL REFERENCES shops(id),
  title           VARCHAR(255) NOT NULL,
  content         TEXT,
  announcement_message VARCHAR(500) NOT NULL,
  image_url       TEXT,
  link_url        TEXT,
  is_active       BOOLEAN DEFAULT true,
  approval_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  payment_status  VARCHAR(20) NOT NULL DEFAULT 'pending',
  payment_amount  DECIMAL(10,2),
  payment_reference VARCHAR(255),
  approved_by     UUID REFERENCES users(id),
  approved_at     TIMESTAMP,
  rejection_reason TEXT,
  week_number     INTEGER,
  starts_at       TIMESTAMP NOT NULL,
  expires_at      TIMESTAMP NOT NULL,
  created_at      TIMESTAMP DEFAULT NOW()
);
```

#### Ad Fee Settings Table（広告料金設定テーブル）
```sql
CREATE TABLE ad_fee_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placement       VARCHAR(50) NOT NULL,
  tier            VARCHAR(20) NOT NULL,
  daily_rate      DECIMAL(10,2) NOT NULL,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE(placement, tier)
);
```

#### Default Fee Settings（デフォルト料金設定）
| Placement | Basic | Standard | Premium |
|-----------|-------|----------|---------|
| Homepage Slider | $3.00/day | $5.00/day | $8.00/day |
| Product Page Sidebar | $2.00/day | $3.50/day | $6.00/day |
| Category Banner | $2.50/day | $4.00/day | $7.00/day |
| Search Results Top | $1.50/day | $2.50/day | $5.00/day |

#### Ad Fee Calculation Formula（広告料金計算式）
```
Total Fee = daily_rate × number_of_days × tier_multiplier

Tier Multipliers:
- basic: 1.0x
- standard: 1.5x
- premium: 2.0x
```

#### Ad Payments Table（広告支払いテーブル）
```sql
CREATE TABLE ad_payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id           UUID NOT NULL REFERENCES advertisements(id),
  merchant_id     UUID NOT NULL REFERENCES merchants(id),
  amount          DECIMAL(10,2) NOT NULL,
  payment_method  VARCHAR(50) NOT NULL,
  payment_status  VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- status: 'pending', 'completed', 'refunded', 'failed'
  transaction_id  VARCHAR(255),
  paid_at         TIMESTAMP,
  refund_amount   DECIMAL(10,2),
  refund_reason   TEXT,
  refunded_at     TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);
```

#### Ad Fee History Table（広告料金履歴テーブル）
```sql
CREATE TABLE ad_fee_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_fee_setting_id UUID NOT NULL REFERENCES ad_fee_settings(id),
  old_daily_rate  DECIMAL(10,2),
  new_daily_rate  DECIMAL(10,2),
  changed_by      UUID NOT NULL REFERENCES users(id),
  change_reason   TEXT,
  effective_from  TIMESTAMP NOT NULL,
  created_at      TIMESTAMP DEFAULT NOW()
);
```

#### Fee History Rules（料金履歴ルール）
- 料金変更は、すでに支払われた広告には影響しない
- 新しい料金は、変更発効日以降に作成された広告のみに適用
- すべての料金変更は `ad_fee_history` にログ記録される
- Adminはタイムスタンプと理由付きの料金変更履歴を閲覧できる

#### Commission Settings Table（手数料設定テーブル）
```sql
CREATE TABLE commission_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  -- rate: 0.00 to 100.00 (percentage)
  updated_by      UUID REFERENCES users(id),
  updated_at      TIMESTAMP DEFAULT NOW(),
  created_at      TIMESTAMP DEFAULT NOW()
);
```

#### Commission Settings Rules（手数料設定ルール）
- 行は1つだけ存在する（シングルトンテーブル）
- 手数料率は0から100の間で、小数点以下最大2桁であること
- 手数料率は保存された瞬間からすべての新規取引に適用される
- 正の手数料は過去の請求書に影響しない
- すべての変更は監査証跡にログ記録される

#### Revenue Targets Table（収益目標テーブル）
```sql
CREATE TABLE revenue_targets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_amount   DECIMAL(12,2) NOT NULL,
  period          VARCHAR(20) NOT NULL,
  -- period: 'monthly', 'quarterly'
  is_active       BOOLEAN DEFAULT true,
  created_by      UUID REFERENCES users(id),
  updated_at      TIMESTAMP DEFAULT NOW(),
  created_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE(period, is_active)
);
```

#### Revenue Targets Rules（収益目標ルール）
- 目標金額は正の値（> 0）で、小数点以下最大2桁であること
- サポートされる期間は `monthly` と `quarterly` のみ
- 期間タイプごとにアクティブな目標は1つだけ（新しいものが上書き）
- 進捗は完了/決済済みの注文のみから計算

#### Payouts Table（支払いテーブル）
```sql
CREATE TABLE payouts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id     UUID NOT NULL REFERENCES merchants(id),
  total_amount    DECIMAL(12,2) NOT NULL,
  commission_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  ad_fee_amount   DECIMAL(12,2) NOT NULL DEFAULT 0,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- status: 'pending', 'processing', 'completed', 'failed'
  processed_by    UUID REFERENCES users(id),
  processed_at    TIMESTAMP,
  failure_reason  TEXT,
  idempotency_key VARCHAR(255) UNIQUE,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);
```

#### Payout Rules（支払いルール）
- 支払いステータスの遷移: pending → processing → completed、または pending → failed
- 処理は冪等（idempotency_keyで二重払い防止）
- 金額 = 期間中の獲得手数料 + 請求広告料
- ステータス = pending のみ支払い可能

#### Skin Analyses Table（肌分析テーブル）
```sql
CREATE TABLE skin_analyses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  image_url       TEXT NOT NULL,
  skin_type       VARCHAR(20),
  -- skin_type: 'dry', 'oily', 'combination', 'sensitive', 'normal'
  estimated_age   INTEGER,
  analysis_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- status: 'pending', 'processing', 'completed', 'failed'
  ai_model        VARCHAR(100),
  ai_model_version VARCHAR(50),
  created_at      TIMESTAMP DEFAULT NOW(),
  completed_at    TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT NOW()
);
```

#### Skin Analysis Conditions Table（肌分析状態テーブル）
```sql
CREATE TABLE skin_analysis_conditions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id     UUID NOT NULL REFERENCES skin_analyses(id) ON DELETE CASCADE,
  condition_name  VARCHAR(100) NOT NULL,
  -- condition_name: 'acne', 'dark_spots', 'wrinkles', 'dryness', 'oiliness', etc.
  severity        VARCHAR(10) NOT NULL,
  -- severity: 'low', 'medium', 'high'
  confidence      DECIMAL(5,2) NOT NULL,
  -- confidence: 0.00 to 1.00
  created_at      TIMESTAMP DEFAULT NOW()
);
```

#### Skin Analysis Recommendations Table（肌分析レコメンドテーブル）
```sql
CREATE TABLE skin_analysis_recommendations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id     UUID NOT NULL REFERENCES skin_analyses(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id),
  reason          TEXT NOT NULL,
  match_score     INTEGER NOT NULL,
  -- match_score: 0 to 100
  display_order   INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMP DEFAULT NOW()
);
```

#### Carts Table（カートテーブル）
```sql
CREATE TABLE carts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID UNIQUE NOT NULL REFERENCES users(id),
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);
```

#### Cart Items Table（カートアイテムテーブル）
```sql
CREATE TABLE cart_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id     UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id),
  quantity    INTEGER NOT NULL DEFAULT 1,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW(),
  UNIQUE(cart_id, product_id)
);
```

#### Order Status History Table（注文ステータス履歴テーブル）
```sql
CREATE TABLE order_status_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status_id   INTEGER NOT NULL REFERENCES order_statuses(status_id),
  changed_by  UUID REFERENCES users(id),
  note        TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);
```

#### Inventory Transactions Table（在庫変動テーブル）
```sql
CREATE TABLE inventory_transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID NOT NULL REFERENCES products(id),
  merchant_id       UUID NOT NULL REFERENCES merchants(id),
  transaction_type  VARCHAR(30) NOT NULL,
  -- transaction_type: 'order_created', 'order_cancelled', 'restock', 'manual_adjustment', 'return'
  quantity          INTEGER NOT NULL,
  before_quantity   INTEGER NOT NULL,
  after_quantity    INTEGER NOT NULL,
  reference_type    VARCHAR(50),
  reference_id      UUID,
  reason            TEXT,
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMP DEFAULT NOW()
);
```

#### Review Reports Table（レビュー報告テーブル）
```sql
CREATE TABLE review_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id     UUID NOT NULL REFERENCES reviews(id),
  reported_by   UUID NOT NULL REFERENCES users(id),
  reason        VARCHAR(50) NOT NULL,
  -- reason: 'spam', 'inappropriate', 'fake', 'other'
  description   TEXT,
  status        VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- status: 'pending', 'reviewed', 'resolved', 'rejected'
  admin_note    TEXT,
  resolved_by   UUID REFERENCES users(id),
  resolved_at   TIMESTAMP,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);
```

#### Audit Logs Table（監査ログテーブル）
```sql
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id),
  action      VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id   UUID,
  old_value   JSONB,
  new_value   JSONB,
  ip_address  VARCHAR(45),
  user_agent  TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);
```

#### Notifications Table（通知テーブル）
```sql
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  type        VARCHAR(50) NOT NULL,
  title       VARCHAR(255) NOT NULL,
  message     TEXT NOT NULL,
  entity_type VARCHAR(100),
  entity_id   UUID,
  is_read     BOOLEAN DEFAULT FALSE,
  read_at     TIMESTAMP,
  created_at  TIMESTAMP DEFAULT NOW()
);
```

### 3.2 Functional Requirements by Module（モジュール別機能要件）

#### 3.2.1 Buyer Module - Authentication（購入者モジュール - 認証）

| ID | Requirement | Priority |
|----|-------------|----------|
| B-AUTH-001 | ユーザーはメールアドレスとパスワードで登録できる | High |
| B-AUTH-002 | ユーザーはメールアドレスとパスワードでログインできる | High |
| B-AUTH-003 | システムはJWTアクセストークン（15分）とリフレッシュトークン（7日間）を発行する | High |
| B-AUTH-004 | ユーザーはログアウトできる（Redisでトークンをブラックリスト化） | High |
| B-AUTH-005 | アクセストークンはリフレッシュトークンによって自動更新される | High |
| B-AUTH-006 | パスワードはArgon2でハッシュ化される | High |
| B-AUTH-007 | 使用のたびにリフレッシュトークンがローテーションされる | High |
| B-AUTH-008 | 侵入検出のためのトークンファミリー追跡 | Medium |
| B-AUTH-009 | ユーザーはウェブサイト経由でパスワードリセットを要求できる | High |
| B-AUTH-010 | ユーザーは6桁コードでパスワードをリセットできる | High |
| B-AUTH-011 | リセットトークンは15分後に失効する | High |
| B-AUTH-012 | メールごとに1時間あたり最大3回のリセット要求 | Medium |
| B-AUTH-013 | パスワードリセットはすべての既存セッションを無効化する | High |

#### 3.2.2 Buyer Module - Profile Setup（購入者モジュール - プロフィール設定）

| ID | Requirement | Priority |
|----|-------------|----------|
| B-PROF-001 | ユーザーは自分のプロフィールを閲覧できる | High |
| B-PROF-002 | ユーザーは名前、メール、電話番号を編集できる | High |
| B-PROF-003 | ユーザーはアバターをアップロード/変更できる | Medium |
| B-PROF-004 | ユーザーは肌タイプ（乾燥、脂性、混合、敏感、普通）を設定できる | High |
| B-PROF-005 | ユーザーは肌悩み（ニキビ、シミ、しわなど）を設定できる | High |
| B-PROF-006 | 登録時にプロフィールが自動入力される | High |

#### 3.2.3 Buyer Module - AI Skin Analysis（購入者モジュール - AI肌分析）

| ID | Requirement | Priority |
|----|-------------|----------|
| B-AI-001 | ユーザーは分析用に顔写真をアップロードまたはカメラを使用できる | High |
| B-AI-002 | システムはAIベースの肌状態分析を行う | High |
| B-AI-003 | システムは分析結果（肌タイプ、状態、年齢推定）を表示する | High |
| B-AI-004 | システムは分析結果に基づいて商品をレコメンドする | High |
| B-AI-005 | ユーザーは分析履歴を閲覧できる | Medium |
| B-AI-006 | システムは時間経過に伴う肌状態のトレンドを表示する | Medium |
| B-AI-007 | 対応画像形式: JPG, PNG, WebP | High |
| B-AI-008 | 最大画像サイズ: 10MB | High |
| B-AI-009 | 画像には分析を進めるために顔が含まれていること | High |
| B-AI-010 | 各分析には一意の分析IDがある | High |
| B-AI-011 | 分析には処理ステータスがある（pending, processing, completed, failed） | High |
| B-AI-012 | 分析は肌タイプ（乾燥、脂性、混合、敏感、普通）を返す | High |
| B-AI-013 | 分析は検出された肌状態の重大度と信頼度を返す | High |
| B-AI-014 | AIは推定年齢を返す場合がある（オプション） | Medium |
| B-AI-015 | 各レコメンドにはマッチスコア（0-100）がある | High |
| B-AI-016 | 各レコメンドにはレコメンド理由がある | High |
| B-AI-017 | レコメンドはマッチスコア降順で並べられる | High |
| B-AI-018 | ユーザーはいつでも別の分析を実行できる | High |
| B-AI-019 | 分析失敗はエラーメッセージで適切に処理される | High |
| B-AI-020 | 分析結果は既存のキャッシングルールに従ってキャッシュされる場合がある | Medium |
| B-AI-021 | 分析履歴は無期限に保持される | Medium |

##### AI Skin Analysis Flow（AI肌分析フロー）
```
ユーザーが顔画像をアップロード
    ↓
システムが画像を検証（形式、サイズ、顔検出）
    ↓
画像をAI分析サービスに送信
    ↓
分析が返す: skin_type, conditions[], estimated_age
    ↓
システムが結果に基づいて商品レコメンドを生成
    ↓
結果が分析ステータスとともにデータベースに保存
    ↓
ユーザーが分析結果とレコメンドを閲覧
```

##### Skin Conditions Structure（肌状態構造）
各検出された状態には以下が含まれる:
- **condition_name**: 例: "acne", "dark_spots", "wrinkles", "dryness", "oiliness"
- **severity**: low, medium, high
- **confidence**: 0.00 to 1.00（AI信頼度スコア）

#### 3.2.4 Buyer Module - Smart Product Matching（購入者モジュール - スマート商品マッチング）

| ID | Requirement | Priority |
|----|-------------|----------|
| B-MATCH-001 | システムは肌分析に基づくパーソナライズされたレコメンドを提供する | High |
| B-MATCH-002 | ユーザーは肌タイプで商品をフィルタできる | High |
| B-MATCH-003 | ユーザーは成分で商品をフィルタできる | Medium |
| B-MATCH-004 | ユーザーは価格帯で商品をフィルタできる | High |
| B-MATCH-005 | ユーザーはレビュー評価で商品をフィルタできる | Medium |
| B-MATCH-006 | システムは「おすすめ」セクションを表示する | High |

#### 3.2.5 Buyer Module - Search & Filter（購入者モジュール - 検索・フィルタ）

| ID | Requirement | Priority |
|----|-------------|----------|
| B-SEARCH-001 | ユーザーはキーワードで商品を検索できる | High |
| B-SEARCH-002 | ユーザーはカテゴリで商品を閲覧できる | High |
| B-SEARCH-003 | ユーザーは価格、評価、新着順でソートできる | High |
| B-SEARCH-004 | 結果はページネーションされる（デフォルト1ページ20件） | High |
| B-SEARCH-005 | 検索は部分一致をサポートする | High |
| B-SEARCH-006 | カテゴリツリーはネストされたナビゲーションをサポートする | Medium |

#### 3.2.6 Buyer Module - Product Details（購入者モジュール - 商品詳細）

| ID | Requirement | Priority |
|----|-------------|----------|
| B-PROD-001 | 商品詳細は画像、説明、価格、成分を表示する | High |
| B-PROD-002 | 商品詳細はギャラリービューで複数画像を表示する | Medium |
| B-PROD-003 | 商品詳細はレビューと評価を表示する | High |
| B-PROD-004 | ユーザーはレビューを書ける（ログイン必須） | High |
| B-PROD-005 | 商品詳細は関連商品を表示する | Medium |
| B-PROD-006 | 商品詳細は肌タイプとの適合性を表示する | High |
| B-PROD-007 | 商品詳細は平均評価とレビュー数を表示する | High |

#### 3.2.7 Buyer Module - Wishlist（購入者モジュール - お気に入り）

| ID | Requirement | Priority |
|----|-------------|----------|
| B-WISH-001 | ユーザーは商品をお気に入りに追加できる | High |
| B-WISH-002 | ユーザーは商品をお気に入りから削除できる | High |
| B-WISH-003 | ユーザーはお気に入り一覧を閲覧できる | High |
| B-WISH-004 | お気に入りは商品画像、価格、在庫状況を表示する | High |
| B-WISH-005 | ユーザーはお気に入りアイテムをカートに移動できる | Medium |

#### 3.2.8 Buyer Module - Cart（購入者モジュール - カート）

| ID | Requirement | Priority |
|----|-------------|----------|
| B-CART-001 | ユーザーは商品をカートに追加できる | High |
| B-CART-002 | ユーザーはアイテム数量を更新できる | High |
| B-CART-003 | ユーザーはカートからアイテムを削除できる | High |
| B-CART-004 | カートはアイテム小計を計算して表示する | High |
| B-CART-005 | カートは利用可能な在庫を表示する | High |
| B-CART-006 | カートはセッション間で保持される（ログインユーザー） | High |
| B-CART-007 | カートは商品画像と名前を表示する | High |
| B-CART-008 | 数量はゼロ greater than zeroでなければならない | High |
| B-CART-009 | 同じ商品が重複したカート行として表示されない | High |
| B-CART-010 | カート価格はチェックアウト時の現在の商品価格を使用する | High |
| B-CART-011 | カート追加時に在庫が検証される | High |
| B-CART-012 | チェックアウト時に再度在庫が検証される | High |
| B-CART-013 | ユーザーはカートをすべてクリアできる | Medium |
| B-CART-014 | カートは合計価格（すべてのアイテム小計の合計）を表示する | High |

##### Cart Lifecycle（カートライフサイクル）
```
空カート → アイテム追加 → アイテム付きカート → チェックアウト → 注文作成 → カートクリア
                                        ↓
                                数量更新
                                        ↓
                                アイテム削除
                                        ↓
                                カートクリア
```

##### Cart Business Rules（カートビジネスルール）
- 購入者ごとに1つのカート（アクティブカート）
- カートアイテムは追加時点の現在の商品価格を参照
- 在庫検証は追加時とチェックアウト時に実行
- チェックアウト前に商品が在庫切れになった場合、ユーザーに通知
- 注文作成成功後にカートがクリアされる

#### 3.2.9 Buyer Module - Checkout & Payment（購入者モジュール - 注文・決済）

| ID | Requirement | Priority |
|----|-------------|----------|
| B-CHECK-001 | ユーザーは配送先住所を入力できる | High |
| B-CHECK-002 | ユーザーは決済方法を選択できる | High |
| B-CHECK-003 | ユーザーは注文確認前に注文を確認できる | High |
| B-CHECK-004 | システムは小計、送料、税金、合計を計算する | High |
| B-CHECK-005 | 注文は「pending」ステータスで作成される | High |
| B-CHECK-006 | 注文作成時に在庫が減らされる | High |
| B-CHECK-007 | ユーザーは注文確認を閲覧できる | High |
| B-CHECK-008 | ユーザーは注文履歴を閲覧できる | High |
| B-CHECK-009 | ユーザーは注文詳細を閲覧できる | High |
| B-CHECK-010 | 注文確認通知が送信される | Medium |

#### 3.2.10 Merchant Module - Product Management（出品者モジュール - 商品管理）

| ID | Requirement | Priority |
|----|-------------|----------|
| M-PROD-001 | 出品者は新しい商品を作成できる | High |
| M-PROD-002 | 出品者は既存の商品を編集できる | High |
| M-PROD-003 | 出品者は商品を削除できる（ソフト削除） | High |
| M-PROD-004 | 出品者は商品画像をアップロードできる | High |
| M-PROD-005 | 出品者は在庫数量を管理できる | High |
| M-PROD-006 | 出品者は自分の商品一覧を閲覧できる | High |
| M-PROD-007 | 出品者は商品の有効/無効を切り替えられる | High |
| M-PROD-008 | 出品者は商品をおすすめに設定できる | Medium |
| M-PROD-009 | 商品作成には必須項目: 名前、カテゴリ、価格、説明 | High |
| M-PROD-010 | 商品画像はJPG, PNG, WebP対応（各最大5MB） | High |

#### 3.2.11 Merchant Module - Sales Dashboard（出品者モジュール - セールスダッシュボード）

| ID | Requirement | Priority |
|----|-------------|----------|
| M-DASH-001 | 出品者は日次/月次売上概要を閲覧できる | High |
| M-DASH-002 | 出品者は注文一覧を閲覧できる | High |
| M-DASH-003 | 出品者は注文ステータスを更新できる | High |
| M-DASH-004 | 出品者はベストセラー商品ランキングを閲覧できる | Medium |
| M-DASH-005 | ダッシュボードは主要指標を表示する: 総売上、注文数、平均注文価値 | High |

#### 3.2.12 Merchant Module - Analytics（出品者モジュール - 分析）

| ID | Requirement | Priority |
|----|-------------|----------|
| M-ANAL-001 | 出品者は売上トレンド（チャート）を閲覧できる | Medium |
| M-ANAL-002 | 出品者は商品パフォーマンス（閲覧数、売上）を閲覧できる | Medium |
| M-ANAL-003 | 出品者は顧客デモグラフィックスを閲覧できる | Low |

#### 3.2.13 Merchant Module - Promotions（出品者モジュール - プロモーション）

| ID | Requirement | Priority |
|----|-------------|----------|
| M-PROMO-001 | 出品者は割引クーポンを作成できる | High |
| M-PROMO-002 | 出品者は割引タイプ（パーセンテージまたは固定）を設定できる | High |
| M-PROMO-003 | 出品者は最低注文金額を設定できる | Medium |
| M-PROMO-004 | 出品者は最大使用数と有効期限を設定できる | High |
| M-PROMO-005 | 出品者はクーポン使用統計を閲覧できる | Medium |
| M-PROMO-006 | 出品者はクーポンを編集/削除できる | High |

#### 3.2.14 Merchant Module - Shop Advertisement（出品者モジュール - 店舗広告）

| ID | Requirement | Priority |
|----|-------------|----------|
| M-AD-001 | 出品者は店舗広告を作成できる | Medium |
| M-AD-002 | 出品者は広告スケジュール（開始/終了日）を設定できる | Medium |
| M-AD-003 | 出品者は広告画像をアップロードできる | Medium |
| M-AD-004 | 出品者は自分の広告を閲覧/管理できる | Medium |
| M-AD-005 | 有効な広告はプラットフォーム上に表示される | Medium |
| M-AD-006 | 管理者は広告を承認/却下できる | High |
| M-AD-007 | 出品者は送信前に広告料金を支払う必要がある | High |
| M-AD-008 | 週あたり最大5件の有効な広告 | High |
| M-AD-009 | 広告はバナー/画像と告知メッセージで表示される | Medium |
| M-AD-010 | 広告ステート: draft → pending_payment → pending_approval → approved → active → expired | High |
| M-AD-011 | 却下された広告は出品者に自動返金される | High |
| M-AD-012 | 出品者ごと: 同時に最大2件の有効な広告 | Medium |
| M-AD-013 | 最小広告期間: 7日間 | Medium |
| M-AD-014 | 最大広告期間: 30日間 | Medium |

#### Advertisement Ad States Flow（広告ステートフロー）
```
draft → pending_payment → pending_approval → approved → active → expired
                                    ↓
                                rejected (refund fee)
                                    ↓
                                resubmitted
```

#### Ad Creation Flow（広告作成フロー）
```
出品者が広告を作成
    ↓
コンテンツをアップロード（画像、タイトル、説明、日付範囲）
    ↓
システムが期間とプレースメントに基づいて料金を計算
    ↓
出品者が広告料金を支払う
    ↓
広告が管理者の承認キューに入る
    ↓
管理者が広告コンテンツ、画像、メッセージ、期日を審査
    ↓
├── 承認 → 広告がストアフロントに表示される
└── 却下 → 料金が返金され、理由が出品者に送信される
```

#### Advertisement Slider on Product Dashboard（商品ダッシュボードの広告スライダー）

##### Display Rules（表示ルール）
- スライダーはメインの商品ダッシュボード/ホームページに表示される
- `approved` かつ `active` の広告のみを表示する
- ローテーションは最大5件
- 5秒ごとに自動ローテーション
- 手動ナビゲーション（前へ/次へボタン）
- アクティブ広告は5分間TTLでRedisにキャッシュされる

##### Slider Response（スライダーレスポンス）
```json
{
  "ads": [
    {
      "id": "uuid",
      "title": "Summer Sale - 20% Off",
      "image_url": "https://...",
      "link": "/products?promo=summer20",
      "shop_name": "Beauty Shop",
      "start_date": "2026-08-01",
      "end_date": "2026-08-31"
    }
  ]
}
```

##### Display Priority（表示優先度）
1. 決済ティアが高い順（premium > standard > basic）
2. 最も早く終了する広告（緊急性）
3. 同じ優先度内でのランダムローテーション

#### 3.2.15 Merchant Module - Shop Profile（出品者モジュール - 店舗プロフィール）

| ID | Requirement | Priority |
|----|-------------|----------|
| M-SHOP-001 | 出品者は店舗プロフィールを作成/編集できる | High |
| M-SHOP-002 | 店舗プロフィールに含める項目: 名前、説明、ロゴ、バナー | High |
| M-SHOP-003 | 店舗プロフィールに含める項目: 住所、電話番号、メール | Medium |
| M-SHOP-004 | 店舗プロフィールにはショップファインダー用のGPS座標を含む | Low |
| M-SHOP-005 | 店舗は管理者の承認を得てから公開される | High |

#### 3.2.16 Admin Module - Review Moderation（管理者モジュール - レビュー管理）

| ID | Requirement | Priority |
|----|-------------|----------|
| A-REV-001 | 管理者はすべてのレビューを閲覧できる | High |
| A-REV-002 | 管理者はレビューを承認/却下できる | High |
| A-REV-003 | 管理者は不適切なレビューを削除できる | High |

#### 3.2.17 Admin Module - Content Moderation（管理者モジュール - コンテンツ管理）

| ID | Requirement | Priority |
|----|-------------|----------|
| A-CONT-002 | 管理者は出品者登録を承認/却下できる | High |
| A-CONT-004 | 管理者は違反コンテンツを削除できる | High |

#### 3.2.18 Admin Module - Analytics & Reports（管理者モジュール - 分析・レポート）

| ID | Requirement | Priority |
|----|-------------|----------|
| A-ANAL-001 | 管理者はプラットフォーム全体のダッシュボードを閲覧できる | High |
| A-ANAL-002 | 管理者はユーザー成長分析を閲覧できる | Medium |
| A-ANAL-003 | 管理者は売上レポート（月次/年次）を閲覧できる | High |
| A-ANAL-004 | 管理者はカテゴリパフォーマンスを閲覧できる | Medium |
| A-ANAL-005 | 管理者は出品者パフォーマンスを閲覧できる | Medium |

#### 3.2.19 Admin Module - Commission Management（管理者モジュール - 手数料管理）

| ID | Requirement | Priority |
|----|-------------|----------|
| A-COMM-001 | 管理者はプラットフォーム手数料率を設定できる | High |
| A-COMM-002 | システムは取引ごとの手数料を計算する | High |
| A-COMM-003 | 管理者は出品者別の手数料レポートを閲覧できる | Medium |
| A-COMM-004 | 手数料率は0から100の間で、小数点以下最大2桁であること | High |
| A-COMM-005 | 手数料率は保存された瞬間からすべての新規取引に適用される | High |
| A-COMM-006 | 手数料レポートは日付範囲フィルタ（from/to）をサポートする | Medium |
| A-COMM-007 | 手数料レポートはページネーションとソートをサポートする | Medium |
| A-COMM-008 | 手数料率の変更は監査証跡にログ記録される | High |

#### 3.2.20 Admin Module - Revenue Tracking（管理者モジュール - 収益追跡）

| ID | Requirement | Priority |
|----|-------------|----------|
| A-REV-001 | 管理者は収益ダッシュボードを閲覧できる | High |
| A-REV-002 | 管理者は収益トレンド（チャート）を閲覧できる | High |
| A-REV-003 | 管理者は決済ステータスを閲覧できる | High |
| A-REV-004 | 管理者は出品者への支払いを管理できる | Medium |
| A-REV-005 | 管理者は月次/四半期の収益目標を設定し、進捗を閲覧できる | Medium |
| A-REV-006 | システムは過去のデータを使用して収益とプラットフォーム手数料を予測できる | Medium |
| A-REV-007 | 収益KPIには以下が含まれる: 総収益、総手数料、平均注文価値、純収益 | High |
| A-REV-008 | 収益トレンドチャートは7d/30d/90d/1yの範囲選択をサポートする | High |
| A-REV-009 | 収益目標の進捗はゲージバー（0-100%）で表示される | Medium |
| A-REV-010 | 支払い処理は冪等である（二重払い防止） | High |
| A-REV-011 | 支払いステータスの遷移: pending → processing → completed、または pending → failed | High |
| A-REV-012 | 収益目標は月次と四半期のみサポートする | Medium |
| A-REV-013 | 期間タイプごとにアクティブな目標は1つだけ（新しいものが上書き） | Medium |
| A-REV-014 | 予測は参考情報であり、財務記録に書き込まれない | Low |

#### 3.2.21 Admin Module - Ad Fee Revenue（管理者モジュール - 広告料収益）

| ID | Requirement | Priority |
|----|-------------|----------|
| A-ADFE-001 | 管理者はダッシュボードで広告料料収益を閲覧できる | Medium |
| A-ADFE-002 | 広告料収益はプラットフォーム総収入KPIに含まれる | Medium |
| A-ADFE-003 | 広告料の支払いステータスは注文の支払いステータスとともに追跡される | Medium |
| A-ADFE-004 | 広告料トレンドシリーズは収益チャートに表示される | Medium |
| A-ADFE-005 | 広告料収益は支払い控除計算に含まれる | Medium |
| A-ADFE-006 | 広告料広告料収益は収益目標進捗計算に含まれる | Low |
| A-ADFE-007 | 広告料収益はAI予測計算に含まれる | Low |

#### 3.2.22 Buyer Module - Order Status History（購入者モジュール - 注文ステータス履歴）

| ID | Requirement | Priority |
|----|-------------|----------|
| B-OSH-001 | すべての注文ステータス遷移は履歴に記録される | High |
| B-OSH-002 | 購入者は注文追跡/履歴タイムラインを閲覧できる | High |
| B-OSH-003 | ステータス履歴は各遷移のタイムスタンプを表示する | High |
| B-OSH-004 | ステータス履歴は変更を開始したユーザー/システムを表示する | High |
| B-OSH-005 | ステータス履歴にはオプションのメモを含めることができる | Medium |
| B-OSH-006 | システム生成のステータス変更も記録される | High |

##### Order Status Flow (Official)（公式注文ステータスフロー）
```
placed → confirmed → packed → shipped → out_for_delivery → delivered
   ↓         ↓          ↓         ↓              ↓              ↓
  任意の状態はキャンセル可能（発送前） → cancelled
```

##### Status Authorization Rules（ステータス認可ルール）
| Status | 変更先 | 変更者 |
|--------|--------|--------|
| placed | confirmed, cancelled | Merchant |
| confirmed | packed, cancelled | Merchant |
| packed | shipped, cancelled | Merchant |
| shipped | out_for_delivery | Courier/System |
| out_for_delivery | delivered | Buyer/System |
| delivered | (ターミナル) | - |
| cancelled | (ターミナル) | - |

#### 3.2.23 System Module - Inventory Transactions（システムモジュール - 在庫変動）

| ID | Requirement | Priority |
|----|-------------|----------|
| SYS-INV-001 | 在庫変動のある操作はすべて在庫変動を生成する | High |
| SYS-INV-002 | 在庫はマイナスにならない | High |
| SYS-INV-003 | 注文が正常に作成されると在庫が減少する | High |
| SYS-INV-004 | 出品者が在庫を補充すると在庫が増加する | High |
| SYS-INV-005 | 手動の在庫調整は記録される | High |
| SYS-INV-006 | 注文キャンセル時の在庫変更がサポートされている場合は記録される | Medium |
| SYS-INV-007 | 出品者は関連する在庫情報を閲覧できる | High |
| SYS-INV-008 | 管理者は権限がある場合に在庫変更を監査できる | Medium |

##### Transaction Types（取引タイプ）
| Type | Description | Stock Change |
|------|-------------|--------------|
| order_created | 注文時に在庫が減少 | -quantity |
| order_cancelled | キャンセル時に在庫が復元 | +quantity |
| restock | 出品者が在庫を補充 | +quantity |
| manual_adjustment | 管理者/出品者による手動修正 | ±quantity |
| return | 顧客返品の処理 | +quantity |

#### 3.2.24 System Module - Review Reports（システムモジュール - レビュー報告）

| ID | Requirement | Priority |
|----|-------------|----------|
| SYS-REV-001 | 購入者はレビューをモデレーションのために報告できる | High |
| SYS-REV-002 | 報告理由: spam, inappropriate, fake, other | High |
| SYS-REV-003 | 報告にはオプションの説明を含めることができる | Medium |
| SYS-REV-004 | 報告にはステータスがある: pending, reviewed, resolved, rejected | High |
| SYS-REV-005 | 管理者は報告されたレビューを確認できる | High |
| SYS-REV-006 | 管理者はメモ付きで報告を解決できる | High |
| SYS-REV-007 | 報告時に元のレビューは自動削除されない | High |
| SYS-REV-008 | 管理者は報告に基づいてレビューにアクションを実行できる | High |

##### Report Status Flow（報告ステータスフロー）
```
pending → reviewed → resolved (アクション実行)
                   → rejected (アクション不要)
```

#### 3.2.25 System Module - Audit Logs（システムモジュール - 監査ログ）

| ID | Requirement | Priority |
|----|-------------|----------|
| SYS-AUD-001 | 重要なアクションは監査証跡にログ記録される | High |
| SYS-AUD-002 | 監査ログは以下を記録: 誰が、何を、どのエンティティ、どのレコード | High |
| SYS-AUD-003 | 監査ログは適宜、変更前と変更後の値を記録する | Medium |
| SYS-AUD-004 | 監査ログはタイムスタンプを記録する | High |
| SYS-AUD-005 | 監査ログは追加専用（変更や削除はできない） | High |
| SYS-AUD-006 | パスワード、トークン、シークレットはログに記録されない | High |

##### Actions to Audit（監査対象アクション）
| Category | Examples |
|----------|----------|
| 出品者管理 | 承認、却下、ステータス変更 |
| ユーザー管理 | ステータス変更、ロール変更 |
| 広告 | 承認、却下、支払い |
| 商品 | 作成、更新、削除、在庫変更 |
| 手数料 | 手数料率変更 |
| レビュー | モデレーション操作 |
| 支払い | 処理、完了、失敗 |
| セキュリティ | ログイン、ログアウト、パスワードリセット |

#### 3.2.26 System Module - Notifications（システムモジュール - 通知）

| ID | Requirement | Priority |
|----|-------------|----------|
| SYS-NOT-001 | システムは関連するイベントのアプリ内通知をサポートする | High |
| SYS-NOT-002 | 通知の受信者はuser_idで識別される | High |
| SYS-NOT-003 | 通知にはタイプ、タイトル、メッセージがある | High |
| SYS-NOT-004 | 通知には既読/未読状態がある | High |
| SYS-NOT-005 | 通知は読み取りタイムスタンプを記録する | Medium |
| SYS-NOT-006 | 通知は作成日順（新しい順）に並べられる | High |
| SYS-NOT-007 | 該当する場合、関連するエンティティをリンクできる | Medium |

##### Notification Events（通知イベント）
| Event | Recipient | Title Example |
|-------|-----------|---------------|
| 出品者承認 | Merchant | "店舗承認済み" |
| 出品者却下 | Merchant | "店舗却下" |
| 広告承認 | Merchant | "広告承認済み" |
| 広告却下 | Merchant | "広告却下" |
| 注文ステータス更新 | Buyer | "注文発送済み" |
| 低在庫警告 | Merchant | "低在庫アラート" |
| 新規注文受信 | Merchant | "新規注文" |
| 支払い処理完了 | Merchant | "支払い完了" |

---

## 4. Special Business Rules（特別ビジネスルール）

### 4.1 Authentication Rules（認証ルール）

#### Rule 4.1.1: Dual-Token Architecture（デュアルトークンアーキテクチャ）
- アクセストークン: 15分の有効期限、`JWT_ACCESS_SECRET`で署名
- リフレッシュトークン: 7日間の有効期限、`JWT_REFRESH_SECRET`（異なるシークレット）で署名
- リフレッシュトークンはDB保存前にArgon2でハッシュ化
- トークンローテーション: 使用のたびに新しいリフレッシュトークンを発行
- 絶対時間制限: ローテーションに関係なく90日間のハードセッション上限
- トークンファミリー追跡による侵入検出（リユーズ検出）
- 無効化されたトークンのリユーズ検出時: そのユーザーのすべてのトークンを無効化

#### Rule 4.1.2: Redis Blacklisting（Redisブラックリスト化）
- ログアウト時、残りTTLの間アクセストークンをRedisでブラックリスト化
- JwtAuthGuardは各リクエスト時にRedisブラックリストをチェック（サブミリ秒）
- ログアウト後に盗まれたトークンの使用を防止

#### Rule 4.1.3: Password Security（パスワードセキュリティ）
- パスワードは8文字以上であること
- パスワードはArgon2でハッシュ化（メモリハード、GPU耐性）
- プレーンテキストパスワードは保存しない

### 4.2 Product Rules（商品ルール）

#### Rule 4.2.1: Product Status（商品ステータス）
- 商品は有効または無効にできる
- 有効な商品のみ検索結果に表示される
- 無効な商品は購入者には非表示だが出品者には表示される

#### Rule 4.2.2: Stock Management（在庫管理）
- 在庫数量は0以下にはならない
- 低在庫閾値で警告を発する（デフォルト: 10単位）
- 注文作成時に在庫がアトミックに減らされる
- 在庫切れの商品はカートに追加できない

#### Rule 4.2.3: Product Images（商品画像）
- 商品ごとに最大10枚の画像
- 対応形式: JPG, PNG, WebP
- 最大ファイルサイズ: 画像ごとに5MB
- 最初の画像がメイン/カバー画像

### 4.3 Order Rules（注文ルール）

#### Rule 4.3.1: Order Completion（注文完了）
- 配達済みステータスはシステムによって自動確認または購入者によって確認される

#### Rule 4.3.2: Price Calculation（価格計算）
- 小計 = すべてのアイテムの（単価 × 数量）の合計
- 税金は配送先住所の場所に基づいて計算される
- 合計 = 小計 + 送料 + 税金
- 価格は注文作成時にロックされ（後の価格変更の影響を受けない）

### 4.4 Review Rules（レビュールール）

#### Rule 4.4.1: Review Eligibility（レビュー対象資格）
- 商品を購入したユーザーのみレビュー可能（認証済み購入）
- ユーザーごとに商品ごとに1件のレビュー
- レビューはデフォルトで承認されるが、管理者によってモデレーション可能

#### Rule 4.4.2: Review Rating（レビュー評価）
- 評価は1〜5の間であること（両端含む）
- 平均評価はすべての承認されたレビューから自動計算される
- レビュー数は自動更新される

#### Rule 4.4.3: Review Validation Rules（レビューバリデーションルール）
1. **購入必須:** レビュー投稿者は、その商品を含む確認済みの注文を持っていること
2. **到着確認:** 注文ステータスが `delivered` であるか、購入者が到着を確認していること
3. **商品ごとに1件のレビュー:** 各購入者は各商品を1回のみレビュー可能
4. **評価範囲:** スター評価は1〜5の間であること（整数）
5. **コンテンツルール:**
   - 外部ウェブサイトリンクの禁止
   - 電話番号の禁止
   - 店舗広告の禁止
   - 不適切な画像の禁止
   - 無関係なコンテンツの禁止
6. **画像制限:** レビューごとに最大5枚、各最大5MB、JPG/PNGのみ

#### Review Validation Middleware（レビューバリデーションミドルウェア）
```typescript
function validateReview(req, res, next) {
  const { productId } = req.params;
  const buyerId = req.user.id;

  // Check purchase history
  const hasOrder = checkProductPurchased(buyerId, productId);
  if (!hasOrder) {
    return res.status(403).json({
      error: 'PURCHASE_REQUIRED',
      message: 'You can only review products you have purchased'
    });
  }

  // Check arrival confirmation
  const orderDelivered = checkOrderDelivered(buyerId, productId);
  if (!orderDelivered) {
    return res.status(403).json({
      error: 'DELIVERY_REQUIRED',
      message: 'You can only review products after confirming delivery'
    });
  }

  // Check existing review
  const existingReview = getReviewByBuyerAndProduct(buyerId, productId);
  if (existingReview) {
    return res.status(409).json({
      error: 'REVIEW_EXISTS',
      message: 'You have already reviewed this product'
    });
  }

  next();
}
```

#### Admin Moderation Actions（管理者モデレーション操作）
| Action | Description |
|--------|-------------|
| Approve | レビューを公開表示 |
| Reject | レビューを削除し、購入者に通知 |
| Flag | さらなる調査のためマーク |

### 4.5 Promotion Rules（プロモーションルール）

#### Rule 4.5.1: Coupon Validation（クーポンバリデーション）
- クーポンコードはユニークであること
- クーポンは有効で有効期限内であること
- 注文金額が最低要件を満たすこと（設定されている場合）
- 総使用数が最大使用数を超えないこと（設定されている場合）
- 注文ごとに1つのクーポンのみ適用可能

#### Rule 4.5.2: Discount Calculation（割引計算）
- パーセンテージ割引: 小計に適用
- 固定割引: 小計から差し引かれる（小計を超えない）
- 割引後の金額は0以下にならない

### 4.6 Advertisement Rules（広告ルール）

#### Rule 4.6.1: Advertisement Approval（広告承認）
- すべての広告は表示前に管理者承認が必要
- 支払い後、広告は `PENDING_APPROVAL` ステータスになる
- 管理者は理由付きで承認または却下できる
- 却下された広告は編集して再送信可能

#### Rule 4.6.2: Advertisement Payment（広告支払い）
- 出品者は広告送信前に広告料金を支払う必要がある
- 広告が `PENDING_APPROVAL` に遷移する前に支払いを検証する必要がある
- 支払い取引は金額、ステータス、参照で記録される
- 広告が却下された場合、返金が自動処理される

#### Rule 4.6.3: Weekly Ad Limit（週間広告制限）
- 全出品者で週あたり最大5件の有効な広告
- 週は月曜00:00から日曜23:59（UTC）
- 表示用に広告を承認する前に制限を検証

#### Rule 4.6.4: Advertisement Display（広告表示）
- 広告はバナー/画像と告知メッセージで表示
- スケジュール内の承認済み広告のみ購入者に表示
- アクティブ広告は5分間TTLでRedisにキャッシュ

### 4.7 Merchant Rules（出品者ルール）

#### Rule 4.6.1: Shop Approval（店舗承認）
- 新しい出品者店舗には管理者承認が必要
- 承認されるまで店舗は無効
- 管理者は理由を付けて店舗を却下できる

#### Rule 4.6.2: Product Ownership（商品所有権）
- 出品者は自分の商品のみ編集/削除可能
- 商品は出品者のユーザーアカウントにリンクされている

### 4.7 AI Skin Analysis Rules（AI肌分析ルール）

#### Rule 4.7.1: Image Requirements（画像要件）
- 画像には顔が含まれていること
- 画像は明るくクリアであること
- 最大画像サイズ: 10MB
- 対応形式: JPG, PNG, WebP

#### Rule 4.7.2: Analysis Results（分析結果）
- 分析結果は24時間キャッシュされる
- ユーザーはいつでも再分析可能
- 分析履歴は無期限に保持される

### 4.8 Commission Rules（手数料ルール）

#### Rule 4.8.1: Commission Rate（手数料率）
- 手数料率は0から100の間であること（パーセンテージ）
- 小数点以下最大2桁
- 手数料率は精度を保つために文字列として保存される
- 手数料率は1つだけ存在する（シングルトン設定）
- 手数料率は保存された瞬間からすべての新規取引に適用される
- 過去の請求書は遡及的に影響を受けない

#### Rule 4.8.2: Commission Calculation（手数料計算）
- 手数料 = 注文合計 × (手数料率 / 100)
- 手数料は注文作成時に取引ごとに計算される
- 手数料金額は注文レコードに保存される
- 完了/決済済みの注文のみ手数料レポートに含まれる

#### Rule 4.8.3: Commission Reports（手数料レポート）
- レポートは日付範囲（from/to）によるフィルタをサポート
- レポートはページネーションとソートをサポート
- レポートは出品者レベルの手数料内訳を表示

### 4.9 Revenue Rules（収益ルール）

#### Rule 4.9.1: Revenue KPIs（収益KPI）
- 総収益: すべての完了注文金額の合計
- 総手数料: すべての完了注文からの手数料の合計
- 平均注文価値: 総収益 / 完了注文数
- 純収益: 総収益 - 返金
- 完了/決済済みの注文のみが含まれる
- 返金は純収益から除外される

#### Rule 4.9.2: Revenue Trend Chart（収益トレンドチャート）
- 7d、30d、90d、1yの範囲をサポート
- データポイントは日別（7d、30d）または月別（90d、1y）にグループ化
- 各ポイントには日付、収益、手数料、広告料、総収入が含まれる

#### Rule 4.9.3: Revenue Targets（収益目標）
- サポートされる期間は `monthly` と `quarterly` のみ
- 目標金額は正の値（> 0）で、小数点以下最大2桁であること
- 期間タイプごとにアクティブな目標は1つだけ（新しいものが上書き）
- 進捗 = (期間中の実績収益 / 目標金額) × 100
- ゲージは表示を0-100%にクランプ; 100%超は「目標超過」として表示
- 進捗は完了/決済済みの注文のみから計算
- 広告料収益は進捗計算に含まれる

#### Rule 4.9.4: AI Revenue Forecast（AI収益予測）
- 予測はトレンド外挿法を使用して過去の収益データから導出
- 最小7つの過去データポイントが必要
- 予測された収益とプラットフォーム手数料シリーズを生成
- トレンドチャートに破線として描画
- 予測は参考情報であり、財務記録に書き込まれない
- データが不十分な場合、予測は情報メッセージ付きで非表示

### 4.10 Payout Rules（支払いルール）

#### Rule 4.10.1: Payout Processing（支払い処理）
- 支払いステータスの遷移: pending → processing → completed、または pending → failed
- 処理は冪等（idempotency_keyで二重払い防止）
- すでに処理された支払いの再試行は409 Conflictを返す
- 支払い金額 = 期間中の獲得手数料 + 請求広告料

#### Rule 4.10.2: Payout Scope（支払い範囲）
- ステータス = pending のみ支払い可能
- 支払いには手数料と広告料控除の両方が含まれる
- 処理済みの支払いは監査証跡にログ記録される

### 4.11 Ad Fee Revenue Rules（広告料収益ルール）

#### Rule 4.11.1: Ad Fee Scope（広告料範囲）
- 広告料収益には完了した広告支払いのみが含まれる
- 広告料トレンドシリーズは収益チャートにオーバーレイ表示
- 広告料の支払いステータスは注文の支払いステータスとともに要約表示

#### Rule 4.11.2: Ad Fee in Platform Income（プラットフォーム収入における広告料）
- プラットフォーム総収入 = 手数料収益 + 広告料収益
- 広告料は収益目標進捗計算に含まれる
- 広告料はAI予測計算に含まれる

---

## 5. Non-Functional Requirements（非機能要件）

### 5.1 Performance（パフォーマンス）

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-001 | ダッシュボードのページロード時間 | ≤ 2秒 |
| NFR-002 | 検索とフィルタ操作 | ≤ 3秒（10,000件のレコード） |
| NFR-003 | APIレスポンス時間（p95） | ≤ 500ミリ秒 |
| NFR-004 | AI肌分析処理 | ≤ 10秒 |
| NFR-005 | データベースクエリ最適化 | FKおよびフィルタ列に適切なインデックス |

### 5.2 Security（セキュリティ）

| ID | Requirement | Description |
|----|-------------|-------------|
| NFR-006 | ロールベース認可 | すべてのAPIエンドポイントでRBACを実行 |
| NFR-007 | 認証必要 | 非公開エンドポイントにはJWTが必要 |
| NFR-008 | 入力検証 | すべてのレイヤーでユーザー入力を検証 |
| NFR-009 | SQLインジェクション防止 | Prismaパラメータ化クエリを使用 |
| NFR-010 | XSS防止 | React自動エスケープ + CSPヘッダー |
| NFR-011 | CSRF保護 | SameSiteクッキー + CSRFトークン |
| NFR-012 | レート制限 | IP/ユーザーごとのAPIレート制限 |
| NFR-013 | 監査ログ | すべての重要なアクションをログ |
| NFR-014 | 機密データ保護 | パスワード、トークン、PIIをログしない |
| NFR-015 | HTTPS強制 | 本番トラフィックはすべてHTTPS |

### 5.3 Data Storage & File Management（データストレージ・ファイル管理）

| ID | Requirement | Description |
|----|-------------|-------------|
| NFR-016 | ファイルストレージ抽象化 | 将来のクラウド移行のためのインターフェース |
| NFR-017 | 画像最適化 | 複数解像度（サムネイル、中、フル） |
| NFR-018 | ファイルサイズ制限 | 商品画像: 5MB、ユーザーアバター: 5MB、分析写真: 10MB |
| NFR-019 | 対応ファイルタイプ | 画像はJPG, PNG, WebP |
| NFR-020 | ファイル命名規則 | 衝突防止のためUUIDベース |

### 5.4 Caching (Redis)（キャッシング）

| ID | Requirement | Description |
|----|-------------|-------------|
| NFR-021 | セッション管理 | 設定可能なTTLを持つRedisセッションストレージ |
| NFR-022 | APIキャッシング | 頻繁にアクセスされるデータ（商品、カテゴリ）をキャッシュ |
| NFR-023 | トークンブラックリスト | アクセストークンブラックリスト用Redis |
| NFR-024 | レート制限 | Redisベースのレート制限カウンター |
| NFR-025 | キャッシュ無効化 | 自動期限切れ + 更新時の手動無効化 |

### 5.5 Database（データベース）

| ID | Requirement | Description |
|----|-------------|-------------|
| NFR-026 | PostgreSQL v16 | メインリレーショナルデータベース |
| NFR-027 | Prisma ORM | 型安全なデータベースアクセス |
| NFR-028 | マイグレーション | バージョン管理されたスキーマ変更 |
| NFR-029 | インデックス | FK列と頻繁にクエリされるフィルタ列にインデックス |
| NFR-030 | バックアップ | 自動日次バックアップ |

### 5.6 Internationalization（国際化）

| ID | Requirement | Description |
|----|-------------|-------------|
| NFR-031 | 多言語対応 | English, Myanmar, Japanese |
| NFR-032 | 言語検出 | ブラウザ設定から自動検出 |
| NFR-033 | 言語切替 | ユーザーが手動で言語を切り替えられる |
| NFR-034 | ローカライズコンテンツ | UIテキスト、エラーメッセージ、通知 |
| NFR-035 | ロケール対応フォーマット | 日付、数値、通貨 |

### 5.7 Accessibility（アクセシビリティ）

| ID | Requirement | Description |
|----|-------------|-------------|
| NFR-036 | WCAG 2.1 AA準拠 | セマンティックHTML、キーボードナビゲーション |
| NFR-037 | スクリーンリーダーサポート | ARIAラベル、役割、説明 |
| NFR-038 | 色のコントラスト | 通常テキストは最小4.5:1 |
| NFR-039 | フォーカスインジケーター | すべてのインタラクティブ要素に可視のフォーカス |
| NFR-034 | ナビゲーションスキップ | メインコンテンツへのスキップリンク |

### 5.8 Scalability（スケーラビリティ）

| ID | Requirement | Description |
|----|-------------|-------------|
| NFR-040 | 水平スケーリング | バックエンドは複数インスタンスをサポート |
| NFR-041 | 接続プーリング | データベース接続プール管理 |
| NFR-042 | CDN対応 | CDN経由の画像配信 |
| NFR-043 | APIバージョニング | URIベースのバージョニング（/api/v1/） |

### 5.9 Monitoring & Logging（モニタリング・ログ）

| ID | Requirement | Description |
|----|-------------|-------------|
| NFR-044 | 構造化ログ | JSON形式ログ |
| NFR-045 | エラートラッキング | Sentryまたは同等のもの |
| NFR-046 | ヘルスチェックエンドポイント | GET /health |
| NFR-047 | パフォーマンスモニタリング | レスポンス時間、エラー率メトリクス |

---

## 6. System Architecture Context（システムアーキテクチャコンテキスト）

### 6.1 High-Level Architecture（ハイレベルアーキテクチャ）

```
┌─────────────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER（クライアントレイヤー）               │
│  +-------------------------------------------------------------+   │
│  |  React SPA (Vite + TypeScript)                              |   │
│  |  |-- shadcn/ui Components                                   |   │
│  |  |-- React Router (Lazy Routes)                             |   │
│  |  |-- TanStack Query (Server State)                          |   │
│  |  |-- React Hook Form + Zod (Forms)                          |   │
│  |  |-- i18next (EN/MY/JA)                                     |   │
│  |  +-- next-themes (Light/Dark)                               |   │
│  +----------------------------+--------------------------------+   │
│                               | HTTPS (JWT Bearer)                 │
+-------------------------------+------------------------------------+
|                          API LAYER（APIレイヤー）                     |
|  +----------------------------+--------------------------------+   │
|  |  NestJS REST API (v11 + TypeScript)                         |   │
|  |  |-- Auth Module (JWT + Refresh Rotation)                   |   │
|  |  |-- Guards (JWT, RBAC)                                     |   │
|  |  |-- Pipes (ValidationPipe + class-validator)               |   │
|  |  |-- Interceptors (Logging, Serialization, Timeout)         |   │
|  |  |-- Filters (ExceptionFilter -> Structured Errors)         |   │
|  |  +-- Swagger/OpenAPI Documentation                          |   │
|  +----------+-------------------------------+------------------+   │
|             |                               |                     |
+-------------+-------------------------------+---------------------+
|          DATA LAYER                    CACHE LAYER                |
|  +----------+----------+      +----------+----------+             |
|  |  PostgreSQL v16     |      |  Redis v7            |             |
|  |  |-- Prisma ORM v6  |      |  |-- Session Store   |             |
|  |  |-- Migrations     |      |  |-- Token Blacklist |             |
|  |  |-- Indexes        |      |  |-- API Cache       |             |
|  |  +-- Transactions   |      |  +-- Rate Limiting   |             |
|  +---------------------+      +---------------------+             |
+--------------------------------------------------------------------+
```

### 6.2 API Endpoint Overview（APIエンドポイント概要）

```
/api/v1/
├── /auth           # Authentication（認証）
│   ├── POST /register
│   ├── POST /login
│   ├── POST /refresh
│   ├── POST /logout
│   ├── POST /forgot-password
│   ├── POST /reset-password
│   └── GET  /verify
├── /users          # User Management（ユーザー管理）
│   ├── GET    /me
│   ├── PATCH  /me
│   ├── GET    /me/avatar
│   └── PATCH  /me/password
├── /products       # Product Management（商品管理）
│   ├── GET    /           # List (public, filterable)
│   ├── GET    /:slug      # Detail (public)
│   ├── POST   /           # Create (merchant)
│   ├── PATCH  /:id        # Update (merchant)
│   ├── DELETE /:id        # Delete (merchant)
│   └── PATCH  /:id/stock  # Update stock (merchant)
├── /categories     # Category Management（カテゴリ管理）
│   └── GET    /           # Category tree
├── /recommendations # AI Recommendations（AIレコメンド）
│   ├── POST   /skin-analysis
│   ├── GET    /personalized
│   └── GET    /similar/:productId
├── /wishlist       # Wishlist（お気に入り）
│   ├── GET    /
│   ├── POST   /:productId
│   └── DELETE /:productId
├── /cart           # Shopping Cart（ショッピングカート）
│   ├── GET    /
│   ├── POST   /items
│   ├── PATCH  /items/:id
│   ├── DELETE /items/:id
│   └── POST   /promo
├── /orders         # Order Management（注文管理）
│   ├── POST   /
│   ├── GET    /
│   ├── GET    /:id
│   └── POST   /:id/complete
├── /reviews        # Reviews（レビュー）
│   ├── GET    /products/:productId/reviews
│   ├── POST   /products/:productId/reviews
│   ├── PATCH  /:id
│   └── DELETE /:id
├── /promotions     # Promotions（プロモーション）
│   ├── POST   /
│   ├── GET    /
│   ├── PATCH  /:id
│   ├── DELETE /:id
│   └── POST   /validate
├── /shops          # Shop Management（店舗管理）
│   ├── GET    /:id
│   ├── GET    /merchant
│   └── PATCH  /merchant
├── /ads            # Advertisements (Merchant)（広告）
│   ├── POST   /           # Create ad (draft)
│   ├── GET    /           # List own ads
│   ├── PATCH  /:id        # Update ad
│   ├── DELETE /:id        # Soft delete ad
│   ├── POST   /:id/pay    # Pay advertising fee
│   ├── POST   /:id/submit # Submit for approval
│   └── GET    /active     # List active ads (public)
├── /notifications  # Notifications（通知）
│   ├── GET    /
│   ├── GET    /unread-count
│   ├── PATCH  /:id/read
│   ├── PATCH  /read-all
│   └── DELETE /:id
├── /analytics      # Analytics（分析）
│   ├── GET    /merchant/dashboard
│   ├── GET    /merchant/sales
│   ├── GET    /merchant/products
│   ├── GET    /admin/dashboard
│   ├── GET    /admin/revenue
│   └── GET    /admin/users
├── /admin          # Admin Management（管理者管理）
│   ├── GET    /users
│   ├── PATCH  /users/:id/status
│   ├── GET    /merchants
│   ├── PATCH  /merchants/:id/status
│   ├── GET    /reviews/pending
│   ├── POST   /reviews/:id/moderate
│   ├── GET    /ads                # List all ads / pending approval queue
│   ├── POST   /ads/:id/approve   # Approve advertisement
│   ├── POST   /ads/:id/reject    # Reject advertisement (with reason)
│   ├── GET    /commission              # 手数料設定を取得
│   ├── PATCH  /commission              # 手数料率を更新
│   ├── GET    /commission/reports      # 手数料レポートを取得
│   ├── GET    /revenue                 # 収益KPIデータを取得
│   ├── GET    /revenue/trends          # 収益トレンドシリーズを取得
│   ├── GET    /revenue/targets         # 収益目標と進捗を取得
│   ├── PUT    /revenue/targets         # 収益目標を保存/更新
│   ├── GET    /revenue/forecast        # AI収益予測を取得
│   ├── GET    /revenue/ad-fees         # 広告料収益データを取得
│   ├── GET    /revenue/payments        # 決済ステータス内訳を取得
│   ├── GET    /revenue/payouts         # 支払い一覧を取得
│   └── POST   /revenue/payouts/:id/process  # 支払いを処理
└── /health         # Health Check（ヘルスチェック）
    └── GET    /
```

### 6.3 Frontend Route Structure（フロントエンドルート構成）

```
Routes:
├── /                          # Home (featured products, hero)
├── /login                     # Login page
├── /register                  # Registration page
├── /profile                   # User profile
├── /skin-analysis             # AI skin analysis
├── /recommendations           # Personalized recommendations
├── /products                  # Product list (search, filter)
├── /products/:slug            # Product detail
├── /wishlist                  # Wishlist
├── /cart                      # Shopping cart
├── /checkout                  # Checkout flow
├── /orders                    # Order history
├── /orders/:id                # Order detail
├── /shop-finder               # GPS-based shop finder
├── /merchant/
│   ├── /dashboard             # Merchant dashboard
│   ├── /products              # Product management
│   ├── /products/new          # Add product
│   ├── /products/:id/edit     # Edit product
│   ├── /promotions            # Promotions management
│   ├── /advertisements        # Advertisements management
│   └── /analytics             # Analytics
├── /admin/
│   ├── /dashboard             # Admin dashboard
│   ├── /users                 # User management
│   ├── /merchants             # Merchant management
│   ├── /reviews               # Review moderation
│   ├── /analytics             # Analytics
│   ├── /commission            # Commission management
│   └── /revenue               # Revenue management
├── /unauthorized              # 403 page
└── *                          # 404 page
```

### 6.4 Development Constraints & Assumptions（開発制約・前提条件）

- **Single-Tenant:** 単一組織向けに設計
- **Multi-Language:** UIは最初からEnglish, Myanmar, Japaneseをサポート
- **Local Development:** Node.js, PostgreSQL, Redisをローカルマシンに
- **Reasonable Load:** 一般的なeコマースワークロード向けに設計
- **AI Service:** AI肌分析は外部APIを使用するか、初期実装ではスタブ化
- **Payment Gateway:** 決済処理はスタブ化（実際の決済統合なし）

### 6.5 Future Extensibility Points（将来の拡張ポイント）

1. **AI Enhancement:** 肌分析の高度なMLモデル
2. **Payment Gateway:** 実際の決済処理（Stripe, PayPal）
3. **Mobile App:** React Nativeモバイルアプリケーション
4. **Push Notifications:** Firebase Cloud Messaging
5. **Email Service:** トランザクショナルメール（SendGrid, AWS SES）
6. **Cloud Storage:** AWS S3, Azure Blob for file storage
7. **Microservice Migration:** サービスの独立スケーリング
8. **Advanced Analytics:** ビジネスインテリジェンスダッシュボード

### 6.6 API Requirements（API要件）

#### Authentication（認証）
- JWTベースの認証
- トークンはHTTP-onlyクッキーまたはAuthorizationヘッダーに保存
- トークン更新メカニズム
- 保護ルート用のロールベースミドルウェア

#### Request/Response Format（リクエスト/レスポンス形式）
- すべてのリクエストはJSONボディを使用（ファイルアップロードを除く）
- すべてのレスポンスは一貫した形式に従う:
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message",
  "error": null
}
```

#### Error Response Format（エラーレスポンス形式）
```json
{
  "success": false,
  "data": null,
  "message": "Human-readable error message",
  "error": {
    "code": "ERROR_CODE",
    "details": { ... }
  }
}
```

#### Standard HTTP Status Codes（標準HTTPステータスコード）
| Code | Usage |
|------|-------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request / Validation Error |
| 401 | Unauthorized / Invalid Token |
| 403 | Forbidden / Insufficient Permissions |
| 404 | Resource Not Found |
| 409 | Conflict (e.g., duplicate review) |
| 422 | Unprocessable Entity |
| 500 | Internal Server Error |

#### File Upload Requirements（ファイルアップロード要件）
- ファイルアップロードには `multipart/form-data` を使用
- 最大ファイルサイズ: 10MB
- 対応形式: JPG, PNG, WebP（画像）、PDF（ドキュメント）
- ファイルはクラウドストレージ（S3, GCSなど）に保存
- アップロードされたファイルの公開URLを返す

#### Rate Limiting（レート制限）
- 認証エンドポイント: IPごとに1分あたり5リクエスト
- APIエンドポイント: ユーザーごとに1分あたり100リクエスト
- ファイルアップロード: ユーザーごとに1分あたり10リクエスト

### 6.7 Database Relationships（データベースリレーションシップ）

#### Entity Relationship Diagram（エンティティリレーションシップ図）
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   users     │────<│  merchants  │────<│  products   │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  orders     │────<│ order_items │     │  reviews    │
└─────────────┘     └─────────────┘     └─────────────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  payments   │     │  coupons    │     │  promotions │
└─────────────┘     └─────────────┘     └─────────────┘
                                            │
                                            ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│advertisements│────<│ ad_payments │     │ ad_fee_hist │
└─────────────┘     └─────────────┘     └─────────────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ ad_settings │     │   shops     │     │ audit_logs  │
└─────────────┘     └─────────────┘     └─────────────┘

┌──────────────────┐     ┌──────────────────┐     ┌─────────────┐
│commission_settings│     │ revenue_targets  │     │   payouts   │
└──────────────────┘     └──────────────────┘     └─────────────┘
```

#### Key Relationships（主要なリレーションシップ）
| Relationship | Type | Description |
|--------------|------|-------------|
| users → merchants | 1:1 | 1人のユーザーは1人の出品者になれる |
| merchants → products | 1:N | 1人の出品者は多くの商品を持つ |
| users → orders | 1:N | 1人の購入者は多くの注文を持つ |
| merchants → orders | 1:N | 1人の出品者は多くの注文を持つ |
| orders → order_items | 1:N | 1つの注文は多くのアイテムを持つ |
| products → reviews | 1:N | 1つの商品は多くのレビューを持つ |
| users → reviews | 1:N | 1人の購入者は多くのレビューを持つ |
| merchants → advertisements | 1:N | 1人の出品者は多くの広告を持つ |
| advertisements → ad_payments | 1:1 | 1つの広告には1つの支払いがある |
| ad_fee_settings → ad_fee_history | 1:N | 設定変更がログ記録される |
| merchants → payouts | 1:N | 1人の出品者は多くの支払いを持つ |
| users → payouts | 1:N | 管理者は多くの支払いを処理する |

---

## 7. Acceptance Criteria & Success Metrics（受入基準と成功指標）

### 7.1 Functional Acceptance Criteria（機能的受入基準）

- [ ] すべての3つのユーザーロールがログインし、それぞれのダッシュボードにアクセスできる
- [ ] ユーザー登録と認証がエンドツーエンドで機能する
- [ ] AI肌分析が画像を処理し、結果を返す
- [ ] 商品閲覧、検索、フィルタが正しく機能する
- [ ] ショッピングカート操作（追加、更新、削除）が適切に機能する
- [ ] チェックアウトフローが注文を作成し、在庫を更新する
- [ ] 出品者は商品を管理できる（CRUD操作）
- [ ] 出品者ダッシュボードに売上データが表示される
- [ ] 管理者はレビューとコンテンツをモデレーションできる
- [ ] すべてのAPIエンドポイントでロールベースアクセス制御が実行される
- [ ] 多言語対応がEN, MY, JAで機能する

### 7.2 Non-Functional Acceptance Criteria（非機能的受入基準）

- [ ] ダッシュボードページが ≤ 2秒でロードされる
- [ ] APIレスポンス時間が ≤ 500ms（p95）
- [ ] すべてのロールベースアクセス制御が実行される
- [ ] SQLインジェクションとXSS脆弱性が軽減される
- [ ] データベーススキーマがPrismaマイグレーションで作成される
- [ ] テストカバレッジ ≥ 80%

### 7.3 Success Metrics（成功指標）

- **User Registration:** 最初の月以内に100人以上のユーザー
- **AI Analysis Usage:** 1日50件以上の分析
- **Conversion Rate:** 閲覧から購入まで5%以上
- **Merchant Adoption:** 最初の四半期以内に10人以上の出品者
- **System Uptime:** 99%以上の可用性
- **User Satisfaction:** 平均評価4.0以上

---

## 8. Appendix（付録）

### 8.1 Reference Terminology（用語集）

| Term | Definition |
|------|-----------|
| **AI Skin Analysis** | 顔画像の機械学習ベースの分析による肌タイプと状態の特定 |
| **Smart Product Matching** | ユーザーの肌分析結果に基づいて商品をレコメンドするアルゴリズム |
| **Merchant** | マーケットプレイスに商品を出品する販売者 |
| **Buyer** | 商品を閲覧および購入するエンドユーザー |
| **Admin** | 完全なアクセス権を持つプラットフォーム管理者 |
| **SKU** | Stock Keeping Unit - ユニークな商品識別子 |
| **RBAC** | Role-Based Access Control |
| **JWT** | JSON Web Token for authentication |
| **Soft Delete** | is_activeフラグを使用した論理削除。レコードは保持される |

### 8.2 Prisma Schema Reference（Prismaスキーマリファレンス）

The complete database schema is defined in:
```
backend/prisma/schema.prisma
```

### 8.3 API Documentation（APIドキュメント）

Swagger/OpenAPI documentation is available at:
```
http://localhost:8080/api/docs
```

### 8.4 Environment Setup（環境構築）

See: `docs/guides/ENVIRONMENT_SETUP.md`

---

## 9. Appendix B - Cross-File Consistency Check（Appendix B - ファイル間整合性チェック）

### Final Consistency Check（最終整合性チェック）

| Rule | Source File | Status |
|------|-------------|--------|
| Merchant license_status instead of merchant_status | Specification.xlsx | ✅ Consistent |
| 403 authorization for product ownership | TharapheeHtet(Cosmetic Finder).xlsx | ✅ Consistent |
| Password reset flow | AI Skin Analysis 1.xlsx | ✅ Consistent |
| Ad fee calculation and refund | AI Skin Analysis 1.xlsx | ✅ Consistent |
| Review validation rules | WaiYanTun(Cosmetic_Finder).xlsx | ✅ Consistent |
| Order tracking states | ThainMyweOo(CosmeticFinder).xlsx | ✅ Consistent |
| Ad slider on dashboard | PyaePhyoHein(cosmetic option).xlsx | ✅ Consistent |
| Merchant rejection/resubmit flow | AI Skin Analysis 1.xlsx | ✅ Consistent |
| Super Admin seeding | AI Skin Analysis 1.xlsx | ✅ Consistent |

### Source Files（ソースファイル）

| File | Focus Area |
|------|------------|
| `AI Skin Analysis 1.xlsx` | 詳細な機能仕様、エッジケース、ワークフロールール、管理者コントロール |
| `TharapheeHtet(Cosmetic Finder).xlsx` | 技術仕様マッピング: 機能、権限、APIルート |
| `ThainMyweOo(CosmeticFinder).xlsx` | ステップバイステップのユーザージャーニーとUIプロセスフロー |
| `WaiYanTun(Cosmetic_Finder).xlsx` | 構造化された機能マトリクスと権限チェックリスト |
| `PyaePhyoHein(cosmetic option).xlsx` | ロールごとの機能オプション分解 |
| `Specification.xlsx` | 開発ガイドライン、ギャップ分析、ドキュメント戦略 |
| `AI_Cosmetic_Finder_System_Specification.md` | データベーススキーマ、API要件、詳細なロールルールを含む包括的なシステム仕様 |

---

**Document Management（文書管理）:**
- Author: Software Architect
- Created: 2026-08-03
- Last Updated: 2026-08-17
- Next Review: Phase 2 Planning

---

*要件定義書_REQUIREMENT_SPEC.md ここまで*