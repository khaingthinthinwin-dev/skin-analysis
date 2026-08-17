# 開発ルール_DEVELOPMENT_RULES.md

## エンタープライズ開発ガバナンス仕様

---

| 属性 | 値 |
|------|-----|
| **ドキュメントID** | SKM-DEV-001 |
| **システム** | Cosmetics Finder |
| **バージョン** | 2.0 |
| **作成日** | 2026-08-03 |
| **最終更新日** | 2026-08-14 |
| **著者** | プリンシパルソフトウェアアーキテクト＆エンタープライズエンジニアリングガバナンスリード |
| **ステータス** | リリース済み |
| **対象者** | 人間の開発者、Cursor AI、Gemini Code Assist、Claude |

---

## 目次

1. [命名規則＆コーディングスタンダード](#1-naming-conventions--coding-standards)
2. [プロジェクト構造ルール](#2-project-structure-rules)
3. [Gitワークフロースタンダード](#3-git-workflow-standards)
4. [AIエージェントガードレール](#4-ai-agent-guardrails)
5. [セキュリティスタンダード](#5-security-standards)
6. [エラーハンドリングスタンダード](#6-error-handling-standards)
7. [テストスタンダード](#7-testing-standards)
8. [APIスタンダード](#8-api-standards)
9. [グローバルUI/UXデザインシステム](#9-global-uiux-design-system)
10. [パフォーマンススタンダード](#10-performance-standards)
11. [環境＆デプロイメントスタンダード](#11-environment--deployment-standards)
12. [マーケットプレイス固有ルール](#12-marketplace-specific-rules)
13. [データベース変更ガバナンス](#13-database-change-governance)
14. [受入チェックリスト](#14-acceptance-checklist)

---

# 1. 命名規則＆コーディングスタンダード

## 1.1 TypeScript命名ルール

| エレメント | 慣習 | 例 | 反例 |
|---------|-----------|---------|--------------|
| 変数 | `camelCase` | `userName`, `orderTotal` | `user_name`, `UserName` |
| 関数 | `camelCase` | `getProductById()`, `validateEmail()` | `GetProductById()`, `get_product_by_id` |
| クラス | `PascalCase` | `AuthService`, `ProductController` | `authService`, `auth_service` |
| インターフェース | `PascalCase`（`I`プレフィックスなし） | `UserProfile`, `OrderItem` | `IUserProfile`, `iUserProfile` |
| 型エイリアス | `PascalCase` | `ProductFilters`, `RolePermissions` | `productFilters` |
| 列挙型 | `PascalCase`（メンバーは`PascalCase`） | `OrderStatus.Pending` | `order_status.PENDING` |
| 定数 | `UPPER_SNAKE_CASE` | `MAX_PRODUCT_IMAGES`, `JWT_EXPIRY` | `maxProductImages`, `maxProductImages` |
| プライベートクラスフィールド | `#privateField`（JSプライベート）または`_prefix` | `#prismaService`, `_userRepository` | `prismaService`（曖昧） |
| ブール変数 | `is`, `has`, `can`, `should`でプレフィックス | `isActive`, `hasPermission` | `active`, `permission` |
| イベントハンドラ | `handle` + イベント名 | `handleLogin()`, `handleSubmit()` | `login()`, `submit()` |
| コールバック | `on` + イベント名 | `onClick`, `onSubmit` | `clickHandler`（不一致） |

**禁止パターン:**
- `any`は絶対に使用しない。型 Narrowing または特定の型に`unknown`を使用。
- `undefined`で十分な場所で`null`を使用しない。オプショナルな値には`undefined`を優先。
- 文書化された正当性なしに非ヌルアサーション（`!`）を使用しない。
- 絶対に必要でない限り型アサーション（`as`）を使用しない。型ガードを優先。

## 1.2 Prisma命名ルール

| エレメント | 慣習 | 例 | 反例 |
|---------|-----------|---------|--------------|
| モデル | `PascalCase`（単数形） | `Product`, `OrderItem`, `UserRole` | `Products`, `order_items`, `user_roles` |
| フィールド | `camelCase` | `merchantId`, `createdAt` | `merchant_id`, `created_at` |
| 列挙型 | `PascalCase` | `UserRole`, `OrderStatus` | `user_role`, `order_status` |
| リレーション | 明示的な`@relation`名 | `@relation("UserProducts")` | 名前なしの暗黙的リレーション |
| テーブルマップ | `snake_case`複数形 | `@@map("products")`, `@@map("order_items")` | `@@map("Products")` |
| カラムマップ | `snake_case` | `@map("merchant_id")`, `@map("created_at")` | `@map("merchantId")` |
| プライマリキー | `@default(dbgenerated("gen_random_uuid()"))`または`@default(uuid())`付き`id` | `id String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid` | ビジネスエンティティの自動インクリメント |
| フォーリンキー | `<model>Id`camelCase | `merchantId`, `categoryId` | Prismaフィールド名の`merchant_id` |
| インデックス | `@@index([field])` | `@@index([merchantId])` | FKカラムにインデックスなし |
| チェック制約 | Prisma内インライン | `@db.Decimal(10, 2)` | シンプル制約の生SQL |

**スキーマルール:**
- すべてのFKカラムには`@@index`が必須。
- `@unique`制約が複数カラムを含む場合、明示的に名前を付けること。
- 常に`onDelete`と`onUpdate`を明示的に指定。データベースのデフォルトに依存しない。
- 金額には`Decimal`を使用。`Float`や`Double`は使用しない。
- ビジネスエンティティのプライマリキーには`String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid`（または`@default(uuid())`）を使用（データベースレベルのUUID形式に整合）。
- ルックアップ/マスターテーブルには`Int @id @default(autoincrement())`のみ使用。

## 1.3 Reactコンポーネント命名

| エレメント | 慣習 | 例 |
|---------|-----------|---------|
| コンポーネント | `PascalCase`関数 | `ProductCard`, `CartItem`, `OrderHistory` |
| コンポーネントファイル | `PascalCase.tsx` | `ProductCard.tsx`, `CartItem.tsx` |
| カスタムフック | `use` + `PascalCase` | `useAuth()`, `useDebounce()` |
| フックファイル | `use` + `PascalCase.ts` | `useAuth.ts`, `useDebounce.ts` |
| コンテキストプロバイダー | `PascalCase` + `Provider` | `AuthProvider`, `QueryProvider` |
| ページ | `PascalCase`（名詞） | `Home`, `Login`, `Profile`, `ProductDetail` |
| レイアウトコンポーネント | `PascalCase` + `Layout` | `MainLayout`, `DashboardLayout` |
| UIプリミティブ（shadcn） | 小文字`ui/`プレフィックス | `components/ui/button.tsx` |
| 機能コンポーネント | 機能フォルダ内`PascalCase` | `features/auth/components/LoginForm.tsx` |

**コンポーネントルール:**
- ファイルごとに1コンポーネント。型は名前付きエクスポート、コンポーネントはデフォルトエクスポート。
- コンポーネントファイル名はコンポーネント名と完全に一致させること。
- コンポーネントディレクトリに`index.ts`バレルファイルを作成しない（明示的なインポートが必要）。
- Props型はコンポーネントと同じファイルまたは共存する`.types.ts`ファイルで定義。

## 1.4 環境変数命名

| レイヤー | プレフィックス | 慣習 | 例 |
|-------|--------|-----------|---------|
| バックエンド（NestJS） | なし | `UPPER_SNAKE_CASE` | `DATABASE_URL`, `JWT_ACCESS_SECRET` |
| フロントエンド（Vite） | `VITE_` | `UPPER_SNAKE_CASE` | `VITE_API_URL`, `VITE_APP_NAME` |
| Prisma | なし | `UPPER_SNAKE_CASE` | `DATABASE_URL` |

**環境変数ルール:**
- すべての環境変数は起動時にZodスキーマで検証が必須。
- `.env`ファイルはコミットしない。プレースホルダー値を持つ`.env.example`のみ。
- 環境変数の値はログに残さない。
- 秘密情報（APIキー、JWT秘密情報、データベースURL）はエラーメッセージやログに表示しない。
- フロントエンド環境変数はビルド時に埋め込まれる。バックエンド秘密情報は絶対に公開しない。

## 1.5 ファイル命名規則

| 場所 | 慣習 | 例 |
|----------|-----------|---------|
| バックエンドモジュール | `kebab-case`ディレクトリ | `modules/auth/`, `modules/products/` |
| バックエンドファイル | `kebab-case.ts` | `auth.service.ts`, `jwt.strategy.ts` |
| フロントエンドページ | `PascalCase.tsx` | `Home.tsx`, `Login.tsx`, `ProductDetail.tsx` |
| フロントエンドコンポーネント | `PascalCase.tsx` | `ProductCard.tsx`, `CartItem.tsx` |
| フロントエンドフック | `usePascalCase.ts` | `useAuth.ts`, `useDebounce.ts` |
| フロントエンド型 | `kebab-case.types.ts` | `auth.types.ts`, `api.types.ts` |
| フロントエンドサービス | `kebab-case.service.ts` | `auth.service.ts`, `product.service.ts` |
| フロントエンドスキーマ | `kebab-case.schema.ts` | `auth.schema.ts`, `product.schema.ts` |
| Prismaスキーマ | 単一ファイル | `schema.prisma` |
| テストファイル | ソース + `.spec.ts` / `.test.ts` | `auth.service.spec.ts`, `ProductCard.test.tsx` |
| 設定ファイル | `kebab-case.config.ts` | `vite.config.ts`, `prisma.config.ts` |
| CSSファイル | `kebab-case.css`またはモジュールパターン | `index.css`, `ProductCard.module.css` |
| 翻訳ファイル | `{namespace}.json` | `common.json`, `auth.json`, `products.json` |

## 1.6 インポート順序スタンダード

**バックエンド（NestJS）- ESLintで実行:**

```typescript
// 1. Node.js組み込みモジュール
import { join } from 'path';

// 2. 外部パッケージ
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// 3. 内部モジュール（@/エイリアスの絶対パス）
import { AuthService } from '@/modules/auth/auth.service';
import { CreateUserDto } from '@/modules/auth/dto/create-user.dto';

// 4. 相対インポート
import { SomeHelper } from './helpers';
import { SomeType } from './types';
```

**フロントエンド（React）- ESLintで実行:**

```typescript
// 1. React / React Router
import { useState } from 'react';
import { useNavigate } from 'react-router';

// 2. サードパーティライブラリ
import { useQuery } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';

// 3. 内部絶対インポート（@/エイリアス）
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { productKeys } from '@/services/queryKeys';

// 4. 相対インポート
import { SomeHelper } from './helpers';
import { SomeType } from './types';
```

**ルール:**
- ワイルドカードインポート（`import *`）は禁止。特定の名前付きエクスポートのみインポート。
- TypeScriptファイルで`require()`は禁止。ESモジュール`import`構文を使用。
- インポートグループ間に1行空行。
- 各グループ内でインポートをアルファベット順にソート。

---

# 2. プロジェクト構造ルール

## 2.1 バックエンドモジュール構造（NestJS + PostgreSQL）

```
backend/src/
├── main.ts                              # ブートストラップエントリーポイント
├── app.module.ts                        # ルートモジュール
├── config/                              # 環境検証＆アプリ設定
│   ├── config.module.ts
│   ├── config.service.ts
│   └── validation.ts                    # Zod envスキーマ
├── common/                              # 横断的関心事（共有）
│   ├── decorators/                      # @Roles(), @CurrentUser(), @Public()
│   │   ├── roles.decorator.ts
│   │   ├── current-user.decorator.ts
│   │   └── public.decorator.ts
│   ├── guards/                          # JwtAuthGuard, RolesGuard
│   │   ├── jwt-auth.guard.ts
│   │   └── roles.guard.ts
│   ├── filters/                         # AllExceptionsFilter
│   │   └── all-exceptions.filter.ts
│   ├── interceptors/                    # ログ、変換、タイムアウト
│   │   ├── logging.interceptor.ts
│   │   ├── transform.interceptor.ts
│   │   └── timeout.interceptor.ts
│   ├── pipes/                           # ValidationPipe
│   │   └── validation.pipe.ts
│   ├── dto/                             # 共有DTO（ページネーションなど）
│   │   ├── pagination.dto.ts
│   │   └── pagination-response.dto.ts
│   ├── interfaces/                      # 共有インターフェース
│   │   ├── pagination.interface.ts
│   │   └── api-response.interface.ts
│   └── utils/                           # 純粋ユーティリティ関数
│       ├── slug.util.ts
│       └── date.util.ts
├── modules/                             # 機能モジュール
│   ├── auth/                            # [ATM] 認証
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── strategies/                  # JWT戦略
│   │   │   ├── jwt-access.strategy.ts
│   │   │   └── jwt-refresh.strategy.ts
│   │   ├── guards/                      # LocalAuthGuard
│   │   │   └── local-auth.guard.ts
│   │   ├── dto/                         # LoginDto, RegisterDto
│   │   │   ├── login.dto.ts
│   │   │   └── register.dto.ts
│   │   ├── auth.service.spec.ts
│   │   └── README.md                    # [ATM] 所有者
│   ├── users/                           # [ATM] ユーザー管理
│   │   ├── users.module.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   ├── dto/
│   │   │   ├── update-user.dto.ts
│   │   │   └── user-response.dto.ts
│   │   ├── users.service.spec.ts
│   │   └── README.md                    # [ATM] 所有者
│   ├── skin-analysis/                   # [ATM] AI肌分析
│   │   ├── skin-analysis.module.ts
│   │   ├── skin-analysis.controller.ts
│   │   ├── skin-analysis.service.ts
│   │   ├── dto/
│   │   │   └── skin-analysis.dto.ts
│   │   ├── skin-analysis.service.spec.ts
│   │   └── README.md                    # [ATM] 所有者
│   ├── matching/                        # [HAML] マッチング＆レコメンド
│   │   ├── matching.module.ts
│   │   ├── matching.controller.ts
│   │   ├── matching.service.ts
│   │   ├── dto/
│   │   │   └── match-query.dto.ts
│   │   ├── matching.service.spec.ts
│   │   └── README.md                    # [HAML] 所有者
│   ├── products/                        # [TMO] 商品管理
│   │   ├── products.module.ts
│   │   ├── products.controller.ts
│   │   ├── products.service.ts
│   │   ├── dto/
│   │   │   ├── create-product.dto.ts
│   │   │   ├── update-product.dto.ts
│   │   │   └── product-query.dto.ts
│   │   ├── products.service.spec.ts
│   │   └── README.md                    # [TMO] 所有者
│   ├── search/                          # [TRPH] 検索・フィルタ
│   │   ├── search.module.ts
│   │   ├── search.controller.ts
│   │   ├── search.service.ts
│   │   ├── dto/
│   │   │   └── search-query.dto.ts
│   │   ├── search.service.spec.ts
│   │   └── README.md                    # [TRPH] 所有者
│   ├── categories/                      # [TRPH] カテゴリフィルタ
│   │   ├── categories.module.ts
│   │   ├── categories.controller.ts
│   │   ├── categories.service.ts
│   │   ├── categories.service.spec.ts
│   │   └── README.md                    # [TRPH] 所有者
│   ├── wishlist/                        # [EEM] ウィッシュリスト
│   │   ├── wishlist.module.ts
│   │   ├── wishlist.controller.ts
│   │   ├── wishlist.service.ts
│   │   ├── wishlist.service.spec.ts
│   │   └── README.md                    # [EEM] 所有者
│   ├── cart/                            # [EEM] ショッピングカート
│   │   ├── cart.module.ts
│   │   ├── cart.controller.ts
│   │   ├── cart.service.ts
│   │   ├── dto/
│   │   │   └── add-to-cart.dto.ts
│   │   ├── cart.service.spec.ts
│   │   └── README.md                    # [EEM] 所有者
│   ├── orders/                          # [EEM] 注文＆支払い
│   │   ├── orders.module.ts
│   │   ├── orders.controller.ts
│   │   ├── orders.service.ts
│   │   ├── dto/
│   │   │   ├── create-order.dto.ts
│   │   │   └── update-order-status.dto.ts
│   │   ├── orders.service.spec.ts
│   │   └── README.md                    # [EEM] 所有者
│   ├── promotions/                      # [ZSLS] プロモーション
│   │   ├── promotions.module.ts
│   │   ├── promotions.controller.ts
│   │   ├── promotions.service.ts
│   │   ├── dto/
│   │   │   ├── create-promotion.dto.ts
│   │   │   └── validate-promotion.dto.ts
│   │   ├── promotions.service.spec.ts
│   │   └── README.md                    # [ZSLS] 所有者
│   ├── advertisements/                  # [WYT] 広告管理
│   │   ├── advertisements.module.ts
│   │   ├── advertisements.controller.ts
│   │   ├── advertisements.service.ts
│   │   ├── advertisements.service.spec.ts
│   │   └── README.md                    # [WYT] 所有者
│   ├── reviews/                         # [PET] レビュー管理
│   │   ├── reviews.module.ts
│   │   ├── reviews.controller.ts
│   │   ├── reviews.service.ts
│   │   ├── dto/
│   │   │   └── create-review.dto.ts
│   │   ├── reviews.service.spec.ts
│   │   └── README.md                    # [PET] 所有者
│   ├── analytics/                       # [PET/WYT] 分析ダッシュボード
│   │   ├── analytics.module.ts
│   │   ├── analytics.controller.ts
│   │   ├── analytics.service.ts
│   │   ├── analytics.service.spec.ts
│   │   └── README.md                    # [PET/WYT] 所有者
│   ├── admin/                           # [PET/PPH] 管理者パネル
│   │   ├── admin.module.ts
│   │   ├── admin.controller.ts
│   │   ├── admin.service.ts
│   │   ├── admin.service.spec.ts
│   │   └── README.md                    # [PET/PPH] 所有者
│   ├── commission/                      # [PPH] 手数料＆収益
│       ├── commission.module.ts
│       ├── commission.controller.ts
│       ├── commission.service.ts
│       ├── commission.service.spec.ts
│       └── README.md                    # [PPH] 所有者
│   └── notifications/                   # [ATM] ウェブサイト通知システム
│       ├── notifications.module.ts
│       ├── notifications.controller.ts
│       ├── notifications.service.ts
│       ├── dto/
│       │   └── notification-response.dto.ts
│       ├── notifications.service.spec.ts
│       └── README.md                    # [ATM] 所有者
└── shared/                              # グローバル共有サービス
    ├── shared.module.ts
    ├── prisma/                          # PrismaModule, PrismaService（PostgreSQL）
    │   ├── prisma.module.ts
    │   └── prisma.service.ts
    ├── redis/                           # RedisModule, RedisService
    │   ├── redis.module.ts
    │   └── redis.service.ts
    └── mail/                            # MailModule（将来用）
        ├── mail.module.ts
        └── mail.service.ts
```

**バックエンドモジュールルール:**
- 各機能モジュールは、コントローラー、サービス、DTO、テスト自己完結。
- 各モジュールフォルダには開発者所有者を記載した`README.md`が必須。
- 機能モジュールは`exports`配列を通じて他のモジュールに必要なもののみエクスポート。
- `common/`はすべてのモジュールで共有されるフレームワークレベルのユーティリティを含む。
- `shared/`は`@Global()`で登録されたグローバルサービス（Prisma、Redis）を含む。
- 他の機能モジュールの内部サービスを直接インポートしない。モジュールエクスポートを使用。
- コントローラーはHTTP関心事のみを処理。ビジネスロジックはサービスに属する。
- サービスはビジネスロジックとデータアクセスを含む。コントローラーからPrismaを直接呼び出さない。

## 2.2 フロントエンドページ構造（React + TypeScript）

```
frontend/src/
├── app/                                 # アプリシェル＆ルーティング
│   ├── App.tsx                          # ルートコンポーネント
│   └── routes.tsx                       # ルート定義
├── pages/                               # ルートレベルコンポーネント
│   ├── Home.tsx
│   ├── Login.tsx                        # [ATM]
│   ├── Register.tsx                     # [ATM]
│   ├── Profile.tsx                      # [ATM]
│   ├── Settings.tsx
│   ├── NotFound.tsx
│   ├── Unauthorized.tsx
│   ├── products/
│   │   ├── ProductList.tsx
│   │   ├── ProductDetail.tsx            # [TMO]
│   │   └── ProductSearch.tsx            # [TRPH]
│   ├── cart/
│   │   └── Cart.tsx                     # [EEM]
│   ├── checkout/
│   │   └── Checkout.tsx                 # [EEM]
│   ├── wishlist/
│   │   └── Wishlist.tsx                 # [EEM]
│   ├── skin-analysis/
│   │   └── SkinAnalysis.tsx             # [ATM]
│   ├── matching/
│   │   └── Recommendations.tsx          # [HAML]
│   ├── merchant/
│   │   ├── Dashboard.tsx                # [WYT]
│   │   ├── Products.tsx                 # [ZSLS]
│   │   ├── ProductForm.tsx              # [ZSLS]
│   │   ├── Promotions.tsx               # [ZSLS]
│   │   ├── Advertisements.tsx           # [WYT]
│   │   └── SalesAnalytics.tsx           # [WYT]
│   ├── admin/
│       ├── Dashboard.tsx                # [PET]
│       ├── Users.tsx                    # [PET]
│       ├── Reviews.tsx                  # [PET]
│       ├── ContentModeration.tsx        # [PET]
│       ├── Reports.tsx                  # [PET]
│       ├── Commission.tsx               # [PPH]
│       └── Revenue.tsx                  # [PPH]
│   └── notifications/                   # [ATM]
│       └── Notifications.tsx
├── components/
│   ├── ui/                              # shadcn/uiプリミティブ（手動編集禁止）
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── table.tsx
│   │   ├── badge.tsx
│   │   ├── select.tsx
│   │   ├── textarea.tsx
│   │   ├── toast.tsx
│   │   ├── form.tsx
│   │   ├── avatar.tsx
│   │   ├── skeleton.tsx
│   │   └── separator.tsx
│   ├── layout/                          # Header, Footer, Sidebar, MainLayout
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── Sidebar.tsx
│   │   ├── MainLayout.tsx
│   │   ├── DashboardLayout.tsx
│   │   └── AuthLayout.tsx
│   ├── common/                          # ThemeToggle, LanguageToggle, ErrorBoundary
│   │   ├── ThemeToggle.tsx
│   │   ├── LanguageToggle.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── EmptyState.tsx
│   └── auth/                            # ProtectedRoute
│       └── ProtectedRoute.tsx
├── features/                            # 機能固有コンポーネント＆ロジック
│   ├── auth/                            # [ATM] 認証
│   │   ├── components/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   └── AuthTabs.tsx
│   │   ├── hooks/
│   │   │   └── useAuth.ts
│   │   ├── schemas/
│   │   │   └── auth.schema.ts
│   │   ├── services/
│   │   │   └── auth.service.ts
│   │   └── README.md                    # [ATM] 所有者
│   ├── skin-analysis/                   # [ATM] 肌分析
│   │   ├── components/
│   │   │   ├── AnalysisUpload.tsx
│   │   │   ├── AnalysisResults.tsx
│   │   │   └── AnalysisHistory.tsx
│   │   ├── hooks/
│   │   │   └── useSkinAnalysis.ts
│   │   ├── services/
│   │   │   └── analysis.service.ts
│   │   └── README.md                    # [ATM] 所有者
│   ├── matching/                        # [HAML] マッチング＆レコメンド
│   │   ├── components/
│   │   │   ├── RecommendationCard.tsx
│   │   │   ├── MatchResultList.tsx
│   │   │   └── SkinTypeFilter.tsx
│   │   ├── hooks/
│   │   │   └── useMatching.ts
│   │   ├── services/
│   │   │   └── matching.service.ts
│   │   └── README.md                    # [HAML] 所有者
│   ├── products/                        # [TMO] 商品
│   │   ├── components/
│   │   │   ├── ProductCard.tsx
│   │   │   ├── ProductGrid.tsx
│   │   │   ├── ProductDetail.tsx
│   │   │   └── ProductReviews.tsx
│   │   ├── hooks/
│   │   │   ├── useProducts.ts
│   │   │   └── useProductDetail.ts
│   │   ├── services/
│   │   │   └── product.service.ts
│   │   └── README.md                    # [TMO] 所有者
│   ├── search/                          # [TRPH] 検索＆フィルタ
│   │   ├── components/
│   │   │   ├── SearchBar.tsx
│   │   │   ├── FilterPanel.tsx
│   │   │   └── SearchResults.tsx
│   │   ├── hooks/
│   │   │   └── useSearch.ts
│   │   ├── services/
│   │   │   └── search.service.ts
│   │   └── README.md                    # [TRPH] 所有者
│   ├── wishlist/                        # [EEM] ウィッシュリスト
│   │   ├── components/
│   │   │   ├── WishlistItem.tsx
│   │   │   └── WishlistGrid.tsx
│   │   ├── hooks/
│   │   │   └── useWishlist.ts
│   │   ├── services/
│   │   │   └── wishlist.service.ts
│   │   └── README.md                    # [EEM] 所有者
│   ├── cart/                            # [EEM] カート
│   │   ├── components/
│   │   │   ├── CartItem.tsx
│   │   │   ├── CartSummary.tsx
│   │   │   └── CartDrawer.tsx
│   │   ├── hooks/
│   │   │   └── useCart.ts
│   │   ├── services/
│   │   │   └── cart.service.ts
│   │   └── README.md                    # [EEM] 所有者
│   ├── checkout/                        # [EEM] チェックアウト
│   │   ├── components/
│   │   │   ├── CheckoutForm.tsx
│   │   │   ├── PaymentMethod.tsx
│   │   │   └── OrderSummary.tsx
│   │   ├── hooks/
│   │   │   └── useCheckout.ts
│   │   ├── services/
│   │   │   └── checkout.service.ts
│   │   └── README.md                    # [EEM] 所有者
│   ├── merchant/                        # [ZSLS/WYT] マーチャント
│   │   ├── components/
│   │   │   ├── DashboardStats.tsx       # [WYT]
│   │   │   ├── OrdersTable.tsx
│   │   │   ├── ProductForm.tsx          # [ZSLS]
│   │   │   ├── PromotionForm.tsx        # [ZSLS]
│   │   │   ├── AdvertisementForm.tsx    # [WYT]
│   │   │   └── SalesChart.tsx           # [WYT]
│   │   ├── hooks/
│   │   │   ├── useMerchant.ts
│   │   │   ├── useProducts.ts           # [ZSLS]
│   │   │   ├── usePromotions.ts         # [ZSLS]
│   │   │   ├── useAdvertisements.ts     # [WYT]
│   │   │   └── useSalesAnalytics.ts     # [WYT]
│   │   ├── services/
│   │   │   ├── merchant.service.ts
│   │   │   ├── product.service.ts       # [ZSLS]
│   │   │   ├── promotion.service.ts     # [ZSLS]
│   │   │   ├── advertisement.service.ts # [WYT]
│   │   │   └── sales.service.ts         # [WYT]
│   │   └── README.md                    # [ZSLS/WYT] 所有者
│   ├── admin/                           # [PET/PPH] 管理者
│       ├── components/
│       │   ├── AdminStats.tsx
│       │   ├── UsersTable.tsx           # [PET]
│       │   ├── ReviewsTable.tsx         # [PET]
│       │   ├── ContentModeration.tsx    # [PET]
│       │   ├── ReportChart.tsx          # [PET]
│       │   ├── CommissionTable.tsx      # [PPH]
│       │   └── RevenueChart.tsx         # [PPH]
│       ├── hooks/
│       │   ├── useAdmin.ts
│       │   ├── useModeration.ts         # [PET]
│       │   ├── useReports.ts            # [PET]
│       │   └── useCommission.ts         # [PPH]
│       ├── services/
│       │   ├── admin.service.ts
│       │   ├── moderation.service.ts    # [PET]
│       │   ├── report.service.ts        # [PET]
│       │   └── commission.service.ts    # [PPH]
│       └── README.md                    # [PET/PPH] 所有者
│   └── notifications/                   # [ATM] 通知
│       ├── components/
│       │   ├── NotificationBell.tsx
│       │   └── NotificationPanel.tsx
│       ├── hooks/
│       │   └── useNotifications.ts
│       ├── services/
│       │   └── notification.service.ts
│       └── README.md                    # [ATM] 所有者
├── hooks/                               # 共有カスタムフック
│   ├── useDebounce.ts
│   ├── useLocalStorage.ts
│   └── useMediaQuery.ts
├── providers/                           # コンテキストプロバイダー
│   ├── AuthProvider.tsx
│   ├── ThemeProvider.tsx
│   ├── QueryProvider.tsx
│   └── I18nProvider.tsx
├── services/                            # APIサービスレイヤー
│   ├── api-client.ts                    # axios/fetch構成
│   └── queryKeys.ts                     # TanStack Queryキー
├── schemas/                             # 共有Zodスキーマ
│   ├── pagination.schema.ts
│   └── common.schema.ts
├── types/                               # 共有TypeScript型
│   ├── api.types.ts
│   ├── user.types.ts
│   ├── product.types.ts
│   └── index.ts
├── lib/                                 # ユーティリティ、APIクライアント、定数
│   ├── utils.ts                         # cn()ユーティリティ
│   ├── constants.ts                     # アプリ定数
│   └── api.ts                           # APIクライアント
└── i18n/                                # i18next設定
    ├── index.ts
    └── locales/
        ├── en/
        │   ├── common.json
        │   ├── auth.json
        │   ├── products.json
        │   └── cart.json
        ├── ja/
        │   ├── common.json
        │   ├── auth.json
        │   ├── products.json
        │   └── cart.json
        └── my/
            ├── common.json
            ├── auth.json
            ├── products.json
            └── cart.json
```

**フロントエンド構造ルール:**
- ページは薄い。再利用可能なロジックを`features/`または`hooks/`に抽出。
- `components/ui/`はshadcn/uiコンポーネントを含む。生成後は手動で編集しない。
- 機能フォルダはその機能のコンポーネント、フック、スキーマ、サービスを共存。
- 各機能フォルダには開発者所有者を記載した`README.md`が必須。
- ファイルごとに1コンポーネント。型は名前付きエクスポート、コンポーネントはデフォルトエクスポート。
- ルートレベルコンポーネントは`pages/`に。再利用可能なコンポーネントは`components/`または`features/`に。

## 2.3 共有フォルダ制限

| 場所 | 使用者 | 内容 |
|----------|------------|----------------|
| `backend/src/common/` | すべてのバックエンドモジュール | デコレーター、ガード、フィルター、パイプ、DTO、インターフェース、ユーティリティ |
| `backend/src/shared/` | すべてのバックエンドモジュール（`@Global()`経由） | Prisma、Redis、メールサービス |
| `frontend/src/components/ui/` | すべてのフロントエンド機能 | shadcn/uiプリミティブ（生成済み、手書き不可） |
| `frontend/src/lib/` | すべてのフロントエンドコード | `cn()`ユーティリティ、APIクライアント、定数 |
| `frontend/src/types/` | すべてのフロントエンドコード | 共有型定義 |

**制限:**
- 共有フォルダに機能固有のロジックを配置しない。
- 他のモジュールの内部ファイルから`backend/src/modules/`をインポートしない。モジュールエクスポートを使用。
- shadcn CLIを通じて生成しない限り、`components/ui/`に新しいファイルを作成しない。

### 2.3.1 開発者所有者ルール
- 各機能モジュールには開発者所有者を記載した`README.md`が必須
- 開発者は各自のモジュールに責任を持つ
- モジュール間連携はNestJSモジュールエクスポートを使用
- 共有フォルダ（common/, shared/, components/ui/）は共同開発

## 2.4 モジュール間通信ルール

**バックエンドモジュール間通信:**
- モジュールAはモジュールBとNestJS依存性インジェクションを通じてエクスポートされたサービスのみで通信。
- モジュールは他のモジュールの内部（非エクスポート）サービスを絶対にインポートしない。
- モジュール間のイベントには、NestJS `EventEmitter`（将来）またはモジュールエクスポートを通じた直接サービス呼び出しを使用。
- 共有データアクセスは`PrismaService`（`shared/prisma`で注入）を通じて行う。

**フロントエンド機能間通信:**
- 機能はTanStack Query（サーバー状態）またはURL状態を通じて通信。
- サーバー状態をReact Context経由で渡さない。Contextはクライアントのみの状態（テーマ、認証）用。
- `window.dispatchEvent`やグローバルイベントバスを使用しない。TanStack Query無効化を使用。
- 共有UIコンポーネントは`components/common/`に。機能固有のUIは`features/`に。

---

# 3. Gitワークフロースタンダード

## 3.1 ブランチ命名

| ブランチタイプ | パターン | 例 |
|------------|---------|---------|
| 機能 | `feature/<チケット>-<短い説明>` | `feature/SKM-123-add-product-search` |
| バグ修正 | `bugfix/<チケット>-<短い説明>` | `bugfix/SKM-456-fix-cart-total` |
| ホットフィックス | `hotfix/<チケット>-<短い説明>` | `hotfix/SKM-789-fix-auth-bypass` |
| リファクタリング | `refactor/<チケット>-<短い説明>` | `refactor/SKM-101-extract-auth-module` |
| ドキュメント | `docs/<短い説明>` | `docs/add-api-documentation` |
| チョア | `chore/<短い説明>` | `chore/update-dependencies` |

**ルール:**
- ブランチ名には小文字kebab-caseを使用。
- 利用可能な場合はチケットIDを含める。
- ブランチ名は最大50文字（プレフィックス除く）。
- ブランチ名に個人名やタイムスタンプを使用しない。
- マージ後にブランチを削除。

## 3.2 コミットメッセージ慣習

Conventional Commits仕様に従ってください:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

**タイプ:**

| タイプ | 説明 | 例 |
|------|-------------|---------|
| `feat` | 新機能 | `feat(products): add product search with filters` |
| `fix` | バグ修正 | `fix(auth): prevent token reuse attack` |
| `docs` | ドキュメントのみ | `docs(api): add Swagger annotations` |
| `style` | フォーマット、コード変更なし | `style(components): fix button spacing` |
| `refactor` | コード再構成 | `refactor(auth): extract JWT strategy` |
| `perf` | パフォーマンス改善 | `perf(products): add Redis cache for listings` |
| `test` | テスト追加/更新 | `test(auth): add login flow unit tests` |
| `chore` | ビルド、設定、依存関係 | `chore(deps): update NestJS to v11.0.1` |
| `ci` | CI/CD変更 | `ci(github): add e2e test workflow` |
| `revert` | コミット取り消し | `revert: feat(products): add product search` |

**スコープ:**

| スコープ | 説明 |
|-------|-------------|
| `auth` | 認証＆認可 |
| `users` | ユーザー管理 |
| `products` | 商品管理 |
| `orders` | 注文処理 |
| `cart` | ショッピングカート |
| `reviews` | 商品レビュー |
| `promotions` | 割引コード |
| `admin` | 管理者パネル |
| `merchant` | 出品者ダッシュボード |
| `ai` | AI肌分析 |
| `db` | データベーススキーマ/マイグレーション |
| `api` | APIインフラ |
| `ui` | UIコンポーネント |
| `i18n` | 国際化 |
| `config` | 設定変更 |

**ルール:**
- 件名行: 命令形、小文字、ピリオドなし、最大72文字。
- 本文: 72文字で折り返し。*what*と*why*を説明し、*how*は記述しない。
- フッター: 問題IDを参照（`Closes #123`, `Refs #456`）。
- 破壊的変更: `BREAKING CHANGE:`フッターまたは`!`をタイプ後に追加（`feat!: ...`）。

## 3.3 プルリクエスト要件

**PRタイトル:** コミットメッセージ形式（Conventional Commits）に従うこと。

**PR説明テンプレート:**

```markdown
## 説明
変更の簡単な説明。

## 変更タイプ
- [ ] バグ修正（問題を修正する非破壊的変更）
- [ ] 新機能（機能を追加する非破壊的変更）
- [ ] 破壊的変更（既存の機能を変更する修正または機能）
- [ ] ドキュメント更新
- [ ] リファクタリング（機能的変更なし）

## 関連問題
Closes #(issue_number)

## テスト
- [ ] ユニットテスト追加/更新
- [ ] 統合テスト追加/更新
- [ ] 手動テスト実施

## チェックリスト
- [ ] コードはプロジェクトスタイルガイドに準拠
- [ ] セルフレビュー完了
- [ ] console.logやデバッグステートメントが残っていない
- [ ] ハードコードされた秘密情報や資格情報がない
- [ ] 既存のすべてのテストがパスする
- [ ] 新しいテストは適切なカバレッジがある
- [ ] APIドキュメントが更新されている（該当する場合）
- [ ] データベースマイグレーションがテスト済み（該当する場合）
- [ ] 新しい文字列にi18nキーが追加されている（該当する場合）
```

**PRルール:**
- PRはマージ前に少なくとも1件の承認が必須。
- PRはマージ前にすべてのCIチェック（lint、test、build）に合格が必須。
- PRにはリンクされた問題/チケットが必須。
- PRごとの差分は最大400行。それ以上の変更は分割。
- main/developブランチへのマージはスクワッシュマージ。
- 未解決のコンフリクトがある状態でマージしない。

## 3.4 コードレビューチェックリスト

**レビュアーが確認すべき事項:**

- [ ] **正確性:** コードは問題の要件を満たしているか？
- [ ] **セキュリティ:** SQLインジェクション、XSS、CSRF脆弱性がないか？コードに秘密情報がないか？
- [ ] **RBAC:** すべての新しいエンドポイントに適切な`@Roles()`デコレーターとガードがあるか？
- [ ] **検証:** すべての入力が`class-validator`デコレーター付きDTOで検証されているか？
- [ ] **エラーハンドリング:** すべてのエラーパスが適切なHTTPステータスコードとメッセージを返しているか？
- [ ] **データベース:** Prismaスキーマ変更が命名規則に準拠しているか？マイグレーションは可能な限りリバーシブルか？
- [ ] **パフォーマンス:** N+1クエリがないか？適切な`select`/`include`使用か？適切な場所でRedisキャッシングが行われているか？
- [ ] **テスト:** サービスのユニットテスト、コントローラーの統合テストがあるか？適切なカバレッジか？
- [ ] **TypeScript:** `any`型がないか？適切な型注釈があるか？`@ts-ignore`がないか？
- [ ] **i18n:** 新しいユーザー向け文字列にハードコードされたテキストではなく翻訳キーが使用されているか？
- [ ] **アクセシビリティ:** 新しいUIコンポーネントがWCAG 2.1 AAに従っているか？
- [ ] **ドキュメント:** 新しいエンドポイントのSwaggerアノテーションが更新されているか？

---

# 4. AIエージェントガードレール

## 4.1 AIが変更可能なファイル

AIエージェント（Cursor、Copilot、Claude Code、Gemini Code Assist）は以下のファイルを変更**可能**です:

| カテゴリ | 許可されたファイル |
|----------|--------------|
| **バックエンドサービス** | `src/modules/**/*.service.ts`, `src/modules/**/*.controller.ts`, `src/modules/**/*.module.ts` |
| **バックエンドDTO** | `src/modules/**/*.dto.ts` |
| **バックエンド戦略/ガード** | `src/modules/auth/strategies/*.ts`, `src/modules/auth/guards/*.ts`, `src/common/guards/*.ts` |
| **バックエンドインターセプター/フィルター** | `src/common/interceptors/*.ts`, `src/common/filters/*.ts` |
| **バックエンドパイプ/デコレーター** | `src/common/pipes/*.ts`, `src/common/decorators/*.ts` |
| **フロントエンドページ** | `src/pages/**/*.tsx` |
| **フロントエンド機能** | `src/features/**/*.tsx`, `src/features/**/*.ts` |
| **フロントエンドフック** | `src/hooks/*.ts` |
| `src/services/*.ts` |
| **フロントエンドスキーマ** | `src/schemas/*.ts` |
| **フロントエンドコンポーネント** | `src/components/layout/*.tsx`, `src/components/common/*.tsx` |
| **フロントエンド型** | `src/types/*.ts` |
| **Prismaスキーマ** | `prisma/schema.prisma`（セクション1.2の命名規則に従うことが必須） |
| **Prismaマイグレーション** | `prisma/migrations/**`（`prisma migrate dev`で生成することが必須） |
| **テスト** | `**/*.spec.ts`, `**/*.test.tsx`, `**/*.test.ts` |
| **翻訳ファイル** | `public/locales/**/*.json` |
| **ドキュメント** | `docs/**/*.md` |
| **設定** | `.eslintrc.*`, `tsconfig.json`（注意して使用） |

## 4.2 AIが変更不可なファイル

AIエージェントは明示的な人間の承認なしに以下のファイルを変更**してはいけません**:

| カテゴリ | 制限されたファイル | 理由 |
|----------|-----------------|--------|
| **ブートストラップ** | `backend/src/main.ts` | クリティカルなアプリケーションエントリーポイント |
| **ルートモジュール** | `backend/src/app.module.ts` | モジュール登録はすべての機能に影響 |
| **Prisma設定** | `backend/prisma.config.ts` | データベース接続設定 |
| **パッケージファイル** | `backend/package.json`, `frontend/package.json` | 依存関係管理にはレビューが必要 |
| **環境** | `.env`, `.env.*` | 秘密情報と設定 |
| **ロックファイル** | `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml` | 依存関係解決の整合性 |
| **Git設定** | `.gitignore`, `.git/` | リポジトリ設定 |
| **CI/CD** | `.github/workflows/*.yml` | デプロイメントパイプラインセキュリティ |
| **shadcn/ui** | `src/components/ui/*` | 生成されたコンポーネント、CLIのみ使用 |
| **Vite設定** | `frontend/vite.config.ts` | ビルド設定 |
| **NestJS CLI** | `backend/nest-cli.json` | ビルド設定 |
| **コアモジュール** | `backend/src/core/**/*.ts` | 一度だけセットアップ、AppModuleでのみインポート |
| **共有モジュール** | `backend/src/shared/shared.module.ts` | グローバルモジュール登録 |
| **Prismaシード** | `backend/prisma/seed.ts` | データベースシードロジック |

## 4.3 必須コンテキストドキュメント

コードを生成または変更する前に、AIエージェントは以下のドキュメントを読んで理解**する必要があります**:

| ドキュメント | 場所 | 目的 |
|----------|----------|---------|
| 要件定義 | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | ビジネスルール、機能要件 |
| データベース設計仕様 | `docs/core-work/データベース設計書.md` | スキーマ設計、データ辞書 |
| 仕様ドキュメント | `docs/SPECIFICATION.md` | 完全なアーキテクチャ、技術スタック、API設計 |
| このドキュメント | `DEVELOPMENT_RULES.md` | コーディングスタンダード、ガードレール、ガバナンス |
| Prismaスキーマ | `backend/prisma/schema.prisma` | 現在のデータベーススキーマ（信頼できるソース） |
| 既存コード | 各モジュールファイル | 既存パターンとの一貫性を維持 |

**コンテキストルール:**
- データベース関連コードを書く前に常にPrismaスキーマを読む。
- 新しいサービスを追加する前に常に同じモジュールの既存サービスを読む。
- 命名/スタイルの一貫性のために常にモジュールの既存DTOを読む。
- 新しいモジュールを作成する前に常に既存の類似機能を確認する。

## 4.4 出力検証チェックリスト

AI生成コードは完了と見なされる前に以下のすべてに合格**する必要があります**:

| # | 検証項目 | 検証方法 |
|---|-------------------|---------------|
| 1 | `any`型がない | strictモードでのTypeScriptコンパイル |
| 2 | 本番コードに`console.log`がない | ESLintルール |
| 3 | ハードコードされた秘密情報がない | `password`、`secret`、`key`などのパターンでグレップ |
| 4 | すべての入力が検証されている | DTOに`class-validator`デコレーターがあることを確認 |
| 5 | RBACが実行されている | コントローラーに`@UseGuards(JwtAuthGuard, RolesGuard)`があることを確認 |
| 6 | エラーハンドリング | 未処理のPromiseリジェクションがない、適切なtry/catch |
| 7 | Prismaクエリが最適化されている | N+1がない、適切な`select`/`include`使用 |
| 8 | ユニットテストが存在する | 新しいサービスの`*.spec.ts`ファイル |
| 9 | 新しい文字列にi18nキーがある | ハードコードされたUIテキストがない |
| 10 | TypeScriptがコンパイルされる | `npm run build`が成功 |
| 11 | ESLintが合格する | `npm run lint`が合格 |
| 12 | 既存のテストが合格する | `npm run test`が合格 |

---

# 5. セキュリティスタンダード

## 5.1 JWTルール

| ルール | 実装 |
|------|---------------|
| アクセストークン有効期限 | 15分 |
| リフレッシュトークン有効期限 | 7日 |
| アクセストークン秘密情報 | `JWT_ACCESS_SECRET`環境変数 |
| リフレッシュトークン秘密情報 | `JWT_REFRESH_SECRET`環境変数（アクセス秘密情報と**異なる**） |
| トークン形式 | `Authorization`ヘッダーの`Bearer <token>` |
| トークン保存（フロントエンド） | アクセストークンはメモリ変数のみ。`localStorage`や`sessionStorage`には**絶対に**保存しない |
| トークン保存（バックエンド） | リフレッシュトークンはDB保存前にArgon2でハッシュ化 |
| トークンペイロード | `{ sub: userId, email, role, jti }` |
| リフレッシュトークンクッキー | `httpOnly: true`, `secure: true`, `sameSite: 'strict'`, `path: '/api/v1/auth/refresh'` |

**必須:**
- すべてのリクエスト時にトークン署名を検証。
- 処理前にRedisブラックリストをチェック。
- 期限切れトークンは即座に拒否。
- トークンペイロードに機密データを含めない（パスワード、メール/名前以外のPII）。

**絶対にやってはいけないこと:**
- リフレッシュトークンを`localStorage`に保存。
- アクセストークンとリフレッシュトークンに同じ秘密情報を使用。
- トークン値をログに残す。
- URLクエリパラメータでトークンを返す。

## 5.2 リフレッシュトークンローテーション

| ステップ | アクション |
|------|--------|
| 1 | クライアントがHTTP-onlyクッキーでリフレッシュリクエストを送信 |
| 2 | バックエンドが`JWT_REFRESH_SECRET`でトークン署名を検証 |
| 3 | バックエンドがトークンがDBに存在し`isRevoked = false`であることを確認 |
| 4 | バックエンドが`absoluteLimitAt`（90日ハードキャップ）を検証 |
| 5 | バックエンドがトークンファミリーを検証（侵入検出） |
| 6 | バックエンドが古いトークンを無効化（`isRevoked = true`） |
| 7 | バックエンドが新しいアクセストークン+新しいリフレッシュトークンを発行 |
| 8 | バックエンドが新しいリフレッシュトークンをハッシュ化してDBに保存 |
| 9 | バックエンドがセッションレコードを更新 |
| 10 | **リユーズ検出時:** ユーザーのすべてのトークンを無効化、401を返す |

**トークンファミリールール:**
- 各ログインセッションはユニークなファミリーIDを生成。
- ローテーション時、新しいトークンは同じファミリーIDを継承。
- 無効化されたトークンが使用された場合（リユーズ検出）、そのファミリーANDユーザーのすべてのトークンが無効化。

## 5.3 Redisトークンブラックリスト

| キーパターン | TTL | ユースケース |
|-------------|-----|----------|
| `blacklist:{jti}` | トークン残り有効期限（最大15分） | ログアウト時のアクセストークンブラックリスト |
| `refresh:blacklist:{jti}` | 7日 | リユーズ検出時のリフレッシュトークンブラックリスト |

**ルール:**
- ログアウト時: `SET blacklist:{jti} "1" EX <remaining_ttl>`
- JwtAuthGuardは処理前にブラックリストをチェック: `EXISTS blacklist:{jti}`
- ブラックリストチェックはサブミリ秒（Redisはインメモリ）。
- ブラックリストにフルトークンを保存しない。JTIクレームのみ保存。

## 5.4 RBAC実行

**ロール階層:** `admin` > `merchant` > `buyer`

**バックエンド実行:**

```typescript
// すべての保護されたエンドポイントには以下が必須:
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('merchant')  // または@Roles('admin')、@Roles('buyer')
@Controller('products')
export class ProductsController { ... }

// 公開エンドポイントは明示的にマークが必須:
@Public()
@Get()
findAll() { ... }
```

**フロントエンド実行:**

```typescript
// ProtectedRouteコンポーネントはロール制限ルートをラップが必須:
<Route element={<ProtectedRoute roles={['merchant'] />}>
  <Route path="/merchant/*" element={<MerchantLayout />} />
</Route>
```

**RBACルール:**
- すべてのAPIエンドポイントにはロール要件（公開または特定のロール）が必須。
- フロントエンドのみの認可に依存しない。常にバックエンドで実行。
- 管理者エンドポイントには`admin`roleが必須。例外なし。
- 出品者エンドポイントには`merchant`または`admin`roleが必須。
- 購入者固有機能（レビュー、お気に入り、カート、チェックアウト、AI分析）には`buyer`roleが必須。出品者と管理者はこれらの機能にアクセスすることを厳格に禁止。

## 5.5 Argon2を使用したパスワードハッシュ化

| パラメータ | 値 |
|-----------|-------|
| アルゴリズム | Argon2id（メモリハード） |
| メモリコスト | 最小64MB |
| 時間コスト | 3反復 |
| 並列性 | 4スレッド |
| ソルト | argon2ライブラリによって自動生成 |

**ルール:**
- プレーンテキストパスワードは絶対に保存しない。
- パスワード値やハッシュをログに残さない。
- パスワードは最低8文字であること。
- ハッシュ化には`argon2.hash(password)`を使用。
- 検証には`argon2.verify(hash, password)`を使用。
- パスワードハッシュ化にMD5、SHA-1、SHA-256、bcryptを使用しない。Argon2のみ。

## 5.6 入力検証

**検証レイヤー（すべて必須）:**

```
レイヤー1: フロントエンド（Zod） ──> レイヤー2: APIクライアント（Zod実行時） ──> レイヤー3: バックエンドDTO（class-validator） ──> レイヤー4: Prisma（DB制約）
```

**バックエンド検証ルール:**
- すべてのリクエストボディは`class-validator`デコレーター付きDTOで検証が必須。
- グローバル`ValidationPipe`は`whitelist: true`、`forbidNonWhitelisted: true`、`transform: true`で設定が必須。
- クエリパラメータはDTOクラスで検証が必須。
- URLパラメータ（ID）は適切なUUID形式で検証が必須。

**フロントエンド検証ルール:**
- すべてのフォームはReact Hook Formで`zodResolver`を使用が必須。
- ZodスキーマはフロントエンドとバックエンドDTO制約の両方を検証が必須。
- フロントエンド検証のみを信頼しない。常にバックエンドで検証。

**禁止:**
- SQLクエリの文字列連結（Prisma経由のパラメータ化クエリを使用）。
- `eval()`、`new Function()`、または動的コード実行。
- DOMPurifyサニタイズなしの`dangerouslySetInnerHTML`。
- HTMLテンプレートでのエスケープされていないユーザー入力。

## 5.7 ファイルアップロード検証

| 制約 | 値 |
|-----------|-------|
| 最大ファイルサイズ（商品画像） | 5 MB |
| 最大ファイルサイズ（ユーザーアバター） | 5 MB |
| 最大ファイルサイズ（AI分析写真） | 10 MB |
| 許可されるMIMEタイプ | `image/jpeg`、`image/png`、`image/webp` |
| 商品ごとの最大ファイル数 | 10 |
| ファイル命名 | UUIDベース: `{uuid}.{ext}` |

**ルール:**
- サーバーサイドでMIMEタイプを検証。`Content-Type`ヘッダーのみを信頼しない。
- 拡張子だけでなくファイルマジックバイトを検証。
- アップロードされたファイルをwebrootの外に保存。署名付きURLまたはAPIエンドポイント経由で提供。
- アップロードされたファイルを実行しない。
- 本番環境でアップロードにマルウェアをスキャン（将来）。

---

# 6. エラーハンドリングスタンダード

## 6.1 標準APIエラーフォーマット

**成功レスポンス:**

```json
{
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

**エラーレスポンス:**

```json
{
  "statusCode": 400,
  "message": ["email must be an email", "password must be longer than 8 characters"],
  "error": "Bad Request",
  "timestamp": "2026-08-03T12:00:00.000Z",
  "path": "/api/v1/auth/register"
}
```

**エラーレスポンスルール:**
- `statusCode`: HTTPステータスコード（整数）。
- `message`: 検証エラー文字列の配列または単一のエラーメッセージ文字列。
- `error`: HTTPステータステキスト（例: "Bad Request"、"Unauthorized"、"Forbidden"）。
- `timestamp`: ISO 8601 UTCタイムスタンプ。
- `path`: エラーが発生したリクエストパス。

## 6.2 例外階層

| 例外 | HTTPステータス | 使用場面 |
|-----------|-------------|-------------|
| `BadRequestException` | 400 | 無効な入力、検証エラー |
| `UnauthorizedException` | 401 | 認証の欠落または無効 |
| `ForbiddenException` | 403 | 有効な認証だが権限不足 |
| `NotFoundException` | 404 | リソースが見つからない |
| `ConflictException` | 409 | 重複リソース（メールアドレスが既に存在、スラッグコンフリクト） |
| `UnprocessableEntityException` | 422 | ビジネスロジック検証失敗 |
| `TooManyRequestsException` | 429 | レート制限超過 |
| `InternalServerErrorException` | 500 | 予期しないサーバーエラー |

**カスタム例外:**
- ドメイン固有エラーの`HttpException`を拡張。
- 常に意味のあるエラーメッセージを含める。
- エラーメッセージに内部実装詳細を公開しない。

## 6.3 ログガイドライン

**ログレベル:**

| レベル | 使用 |
|-------|-------|
| `error` | システムエラー、未処理例外、セキュリティ違反 |
| `warn` | 非推奨通知、リトライ可能な失敗、制限接近 |
| `log` | 正常なアプリケーションフロー、リクエスト完了 |
| `debug` | デバッグのための詳細情報（開発のみ） |
| `verbose` | 非常に詳細なトレース（開発のみ） |

**ログルール:**
- NestJS `Logger`クラスを使用。本番コードで`console.log`は使用しない。
- ログ形式: `[${context}] ${message}` - 常にコンテキスト（モジュール名）を含める。
- 構造化ログ: 関連メタデータをオブジェクトとして含める。
- パスワード、トークン、クレジットカード、PIIはログに残さない。
- 本番環境でリクエスト/レスポンスボディ全体をログに残さない（セキュリティリスク）。
- サービス間の相関のためにリクエストIDをログ。

**例:**

```typescript
private readonly logger = new Logger(AuthService.name);

// 正しい
this.logger.log(`User ${userId} logged in successfully`);
this.logger.error(`Failed to login user ${email}: ${error.message}`, error.stack);
this.logger.warn(`Token refresh failed for user ${userId}: token family mismatch`);

// 禁止
this.logger.log(`Password: ${password}`);  // 資格情報はログに残さない
this.logger.log(`Token: ${accessToken}`);  // トークンはログに残さない
console.log('debug info');  // console.logは使用しない
```

## 6.4 監査ログ要件

| イベント | ログするデータ | 保持期間 |
|-------|------------|-----------|
| ユーザーログイン | userId、email、IP、タイムスタンプ、成功/失敗 | 90日 |
| ユーザーログアウト | userId、タイムスタンプ | 90日 |
| パスワード変更 | userId、タイムスタンプ | 90日 |
| 商品作成 | merchantId、productId、タイムスタンプ | 1年 |
| 商品更新 | merchantId、productId、変更内容、タイムスタンプ | 1年 |
| 注文作成 | userId、orderId、合計、タイムスタンプ | 1年 |
| 注文ステータス変更 | orderId、旧ステータス、新ステータス、タイムスタンプ | 1年 |
| 管理者アクション | adminId、アクション、ターゲット、タイムスタンプ | 2年 |
| 認証失敗試行 | IP、email、タイムスタンプ、理由 | 30日 |
| RBAC違反 | userId、エンドポイント、必要ロール、タイムスタンプ | 30日 |

**監査ログ形式:**

```json
{
  "event": "USER_LOGIN",
  "userId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "email": "user@example.com",
  "ip": "192.168.1.1",
  "timestamp": "2026-08-03T12:00:00.000Z",
  "success": true,
  "metadata": {}
}
```

---

# 7. テストスタンダード

## 7.1 ユニットテスト要件

**バックエンド（NestJS + Jest）:**

| コンポーネント | テストタイプ | 最小カバレッジ |
|-----------|-----------|-----------------|
| サービス | モックされた依存関係を使用したユニットテスト | 90% |
| コントローラー | モックされたサービスを使用したユニットテスト | 85% |
| 戦略（JWT） | モックされたPrisma/Redisを使用したユニットテスト | 80% |
| ガード | モックされた戦略を使用したユニットテスト | 80% |
| パイプ | ユニットテスト | 90% |
| ユーティリティ | ユニットテスト（純粋関数） | 100% |

**フロントエンド（Vitest + React Testing Library）:**

| コンポーネント | テストタイプ | 最小カバレッジ |
|-----------|-----------|-----------------|
| フック | モックされたAPIを使用したユニットテスト | 90% |
| コンポーネント（ui） | スナップショット＋インタラクションテスト | 80% |
| サービス | MSWを使用したユニットテスト | 85% |
| スキーマ（Zod） | ユニットテスト（有効/無効な入力） | 100% |
| ユーティリティ | ユニットテスト（純粋関数） | 100% |

**ユニットテストルール:**
- テストファイルはソースファイルと同じ場所に共存: `auth.service.ts` → `auth.service.spec.ts`。
- 関連するテストをグループ化するために`describe`ブロックを使用。
- 個別のテストケースには`it`（`test`ではない）を使用。
- テスト名は記述的であること: `it('should return 401 when token is expired')`。
- 外部依存関係をモック（Prisma、Redis、HTTPクライアント）。ユニットテストで実際のデータベースを呼び出さない。
- 各テストは独立していること。テスト間で共有状態なし。
- AAAパターンに従う: Arrange, Act, Assert。

## 7.2 統合テスト要件

**バックエンド統合テスト:**

| シナリオ | ツール | スコープ |
|----------|------|-------|
| APIエンドポイントフロー | Jest + Supertest | 完全なリクエスト生命周期 |
| データベース操作 | Jest + Prismaテストインスタンス | 実DBでのCRUD操作 |
| 認証フロー | Jest + Supertest | ログイン、リフレッシュ、ログアウト、ブラックリスト |
| RBAC実行 | Jest + Supertest | 各エンドポイントのロールベースアクセス |

**統合テストルール:**
- テストデータベースを使用（開発とは別）。
- テストスイートの前にデータベース状態をリセット。
- メソッド呼び出しではなく、実際のHTTPリクエスト/レスポンスをテスト。
- エラーシナリオをテスト: 無効なトークン、不足しているフィールド、禁止されたアクセス。

## 7.3 E2Eテスト要件

| フロー | カバレッジターゲット |
|------|----------------|
| ユーザー登録 → ログイン → プロフィール編集 | 完全なパス |
| 商品閲覧 → 検索 → フィルタ → 詳細 | 完全なパス |
| カート追加 → チェックアウト → 注文確認 | 完全なパス |
| 出品者: 商品作成 → 在庫管理 | 完全なパス |
| 管理者: 出品者承認 → レビューモデレーション | 完全なパス |
| AI分析: アップロード → 結果 → レコメンド | 完全なパス |
| i18n: 言語切替 → 翻訳コンテンツ | 完全なパス |

**E2Eテストルール:**
- ブラウザベースのE2EテストにはPlaywrightまたはCypressを使用。
- Chrome、Firefox、Safari（該当する場合）でテスト。
- レスポンシブレイアウトをテスト（デスクトップ、タブレット、モバイルビューポート）。
- アクセシビリティのためのキーボードナビゲーションをテスト。
- E2Eテストはデプロイメント前にCIで実行。

## 7.4 最小カバレッジターゲット

| 指標 | 最小ターゲット | 実行 |
|--------|---------------|-------------|
| バックエンドユニットテストカバレッジ | 80% | CIゲート: 80%未満で失敗 |
| フロントエンドユニットテストカバレッジ | 70% | CIゲート: 70%未満で失敗 |
| 統合テストカバレッジ | 70% | CIゲート: 70%未満で失敗 |
| クリティカルパスE2Eカバレッジ | P0フローの100% | 手動検証 |
| ブランチカバレッジ | 75% | Jest/Vitest設定で実行 |

## 7.5 セキュリティテストケース

すべてのセキュリティ関連機能には以下のテストが必須:

| テストカテゴリ | 例 |
|---------------|---------------|
| 認証バイパス | トークンなし、期限切れトークン、無効化されたトークンでのアクセス試行 |
| 認可バイパス | 購入者トークンで管理者エンドポイント、購入者トークンで出品者エンドポイントへのアクセス試行 |
| トークンリユーズ検出 | 無効化されたリフレッシュトークンを使用、ユーザーのすべてのトークンが無効化されることを確認 |
| 入力検証 | SQLインジェクション文字列、XSSペイロード、オーバーサイズ入力の送信 |
| レート制限 | 60秒以内に100以上のリクエストを送信、429レスポンスを確認 |
| パスワードセキュリティ | Argon2ハッシュ化を確認、プレーンテキスト保存がないことを確認 |
| RBAC実行 | 各エンドポイントが許可されていないロールを拒否することを確認 |
| IDOR防止 | 他のユーザーのリソースへのアクセス試行 |
| CSRF保護 | SameSiteクッキー属性を確認 |
| ファイルアップロード悪用 | 非画像ファイル、オーバーサイズファイル、不正な画像のアップロード |

---

# 8. APIスタンダード

## 8.1 REST慣習

| 動詞 | 目的 | 例 | 成功コード |
|------|---------|---------|-------------|
| `GET` | リソース読み取り | `GET /api/v1/products` | 200 |
| `POST` | リソース作成 | `POST /api/v1/products` | 201 |
| `PATCH` | 部分更新 | `PATCH /api/v1/products/:id` | 200 |
| `DELETE` | リソース削除 | `DELETE /api/v1/products/:id` | 204 |

**RESTルール:**
- リソースには複数形名詞を使用: `/products`、`/users`、`/orders`。
- 特定のリソースにはURIパラメータを使用: `/products/:id`。
- フィルタ、ソーティング、ページネーションにはクエリパラメータを使用。
- 部分更新に`PUT`は使用しない。`PATCH`を使用。
- `DELETE`は冪等。存在しないリソースの削除は204を返す。
- レスポンスボディで更新/作成されたリソースを常に返す。

## 8.2 バージョニング戦略

- URIベースのバージョニング: `/api/v1/...`
- デフォルトバージョン: `v1`
- 破壊的変更には新しいバージョンが必要: `/api/v2/...`
- 非推奨バージョンは最低6ヶ月サポート。
- バージョンヘッダーはオプショナル: `Accept-Version: v1`

**破壊的変更（バージョンアップが必要）:**
- エンドポイントの削除
- レスポンスのフィールド名変更
- フィールドタイプの変更
- 認証要件の変更
- ページネーション形式の変更

**非破壊的変更（同じバージョン）:**
- 新しいエンドポイントの追加
- レスポンスへの新しいオプショナルフィールドの追加
- 新しいオプショナルクエリパラメータの追加
- 新しい列挙値の追加

## 8.3 レスポンス構造

**単一リソース:**

```json
{
  "data": {
    "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "name": "Product Name",
    "price": "29.99"
  }
}
```

**ページネーション付きコレクション:**

```json
{
  "data": [
    { "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d", "name": "Product 1" },
    { "id": "a3b90f42-4b7d-4bad-9bdd-2b0d7b3dcb6d", "name": "Product 2" }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

**レスポンスルール:**
- データは常に`{ data: ... }`エンベロープでラップ。
- ページネーションメタデータには`meta`を使用。
- すべての日付にISO 8601を使用: `"2026-08-03T12:00:00.000Z"`。
- 浮動小数点精度問題を回避するために小数値には文字列を使用: `29.99`ではなく`"29.99"`。
- Prismaエンティティを直接返さない。DTOまたは明示的な`select`を使用。

## 8.4 ページネーションスタンダード

**オフセットベースページネーション（デフォルト）:**

```
GET /api/v1/products?page=1&limit=20&sort=createdAt&order=desc
```

**クエリパラメータ:**

| パラメータ | タイプ | デフォルト | 説明 |
|-----------|------|---------|-------------|
| `page` | 整数 | 1 | ページ番号（1インデックス） |
| `limit` | 整数 | 20 | 1ページあたりのアイテム数（最大100） |
| `sort` | 文字列 | `createdAt` | ソートフィールド |
| `order` | 文字列 | `desc` | ソート方向: `asc`または`desc` |

**レスポンス:**

```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

**カーソルベースページネーション（大規模データセット用）:**

```
GET /api/v1/products?cursor=9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d&limit=20
```

**カーソルレスポンス:**

```json
{
  "data": [...],
  "meta": {
    "nextCursor": "a3b90f42-4b7d-4bad-9bdd-2b0d7b3dcb6d",
    "hasMore": true,
    "limit": 20
  }
}
```

**ページネーションルール:**
- デフォルトページサイズ: 20。最大: 100。
- オフセットページネーションでは常に`total`カウントを返す。
- 1リクエストで100以上のアイテムを返さない。
- 無限スクロールUIにはカーソルベースページネーションを使用。

## 8.5 AI分析エンドポイントスタンダード

**エンドポイント:** `POST /api/v1/recommendations/skin-analysis`

**リクエスト:**

```json
{
  "image": "<base64-encoded-image>"
}
```

**レスポンス（200）:**

```json
{
  "data": {
    "analysisId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "skinType": "combination",
    "conditions": [
      { "name": "mild_acne", "severity": "low", "confidence": 0.87 },
      { "name": "oiliness", "severity": "moderate", "confidence": 0.92 }
    ],
    "estimatedAge": 28,
    "recommendations": [
      {
        "productId": "a3b90f42-4b7d-4bad-9bdd-2b0d7b3dcb6d",
        "productName": "Gentle Foaming Cleanser",
        "reason": "Suitable for combination skin with mild acne",
        "matchScore": 0.94
      }
    ],
    "analyzedAt": "2026-08-03T12:00:00.000Z"
  }
}
```

**AI分析ルール:**
- リクエストは画像形式（JPG、PNG、WebP）を検証が必須。
- リクエストは画像サイズ（最大10MB）を検証が必須。
- レスポンスは履歴追跡用の`analysisId`を含むことが必須。
- レスポンスは各条件の`confidence`スコアを含むことが必須。
- レスポンスは`matchScore`付きのパーソナライズされた`recommendations`を含むことが必須。
- 分析結果は24時間キャッシュされる。
- 再分析はいつでも可能（キャッシュを上書き）。
- 分析履歴は無期限に保持される。

---

# 9. グローバルUI/UXデザインシステム

## 9.1 マーケットプレイスデザイン言語

**デザイン原則:**
- Sephora、Dior Beauty、Rare Beauty、Glow Recipeにインスパイアされたラグジュアリービューティーマーケットプレイスの美学。
- エレガントでフェミニン、洗練されたビジュアルアイデンティティ。
- モバイルファーストのレスポンシブデザイン。
- Tailwindの4pxグリッドシステムを使用した一貫したスペーシング。
- shadcn/uiからのセマンティックカラートークネ（生のカラーカスタムは不可）。
- すべてのインタラクティブ要素でWCAG 2.1 AA準拠。

**ブランドアイデンティティ:**
- プライマリブランドカラー: ラグジュアリーパープル (#7C3AED) - プレミアムで洗練されたビューティーを表現。
- アクセントカラー: ビューティーピink (#EC4899) - プロモーション、CTAハイライト、お気に入りハート、評価、セールバッジに使用。
- セカンダリカラー: ソフトラベンダー (#F3E8FF) - カード背景、セクション、フィルタ、バッジ、微妙なサーフェスに使用。
- 全体的な美学は、ハイエンドビューティーレーラーのようにプレミアムでクリーンでモダンであるべき。

**レイアウトグリッド:**
- デスクトップ: 12カラムグリッド、最大幅1280px、中央揃え。
- タブレット: 8カラムグリッド。
- モバイル: 4カラムグリッド。
- スペーシングスケール: 4、8、12、16、20、24、32、40、48、64px。

## 9.2 商品カード

**レイアウト:**

```
┌─────────────────────────────┐
│  [商品画像]                  │
│  アスペクト比: 1:1           │
│  オブジェクトフィット: cover  │
├─────────────────────────────┤
│  カテゴリバッジ（オプション） │
│  商品名（最大2行）           │
│  ★★★★☆ (4.2) · 128レビュー  │
│  $29.99  $39.99（取り消し線）│
│  [肌タイプタグ]              │
│  [♡ お気に入り追加]          │
└─────────────────────────────┘
```

**商品カードルール:**
- 画像: 1:1アスペクト比、遅延読み込み、フォールドプレースホルダー。
- 名前: `line-clamp-2`で最大2行、太字ウェイト。
- 評価: Lucide `Star`アイコン、ビューティーピink (#EC4899) カラー、ハーフスター対応、レビュー数リンク。
- 価格: 現在の価格は太字、比較価格は取り消し線、通貨フォーマット。
- タグ: 肌タイプの小さなピルバッジ（例: "Oily"、"Sensitive"）、ソフトラベンダー (#F3E8FF) 背景。
- お気に入り: ハートアイコントグル、ビューティーピink (#EC4899) カラー、クリック時アニメーション。
- ホバー: 微細なシャドウエレベーション、オプションのクイックビューボタン。
- カード背景: ラグジュアリービューティーの美学のためのソフトラベンダー (#F3E8FF)。
- ボーダー: プレミアム感のためのライトグレーボーダーと角丸。

## 9.3 AI分析画面

**アップロード画面:**

```
┌─────────────────────────────────────────┐
│  📸 AI肌分析                            │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │                                 │    │
│  │   [ドロップゾーン / アップロードエリア] │    │
│  │   ドラッグ＆ドロップまたはクリックしてアップロード │    │
│  │   JPG, PNG, WebP · 最大10MB     │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [プレビュー画像]（アップロード後）        │
│  [今すぐ分析]ボタン（プライマリ）         │
│                                         │
│  過去の分析:                             │
│  ┌──────┐ ┌──────┐ ┌──────┐           │
│  │日付1 │ │日付2 │ │日付3 │           │
│  └──────┘ └──────┘ └──────┘           │
└─────────────────────────────────────────┘
```

**結果画面:**

```
┌─────────────────────────────────────────┐
│  分析結果                               │
│                                         │
│  肌タイプ: 混合肌                       │
│  推定年齢: 28                           │
│                                         │
│  状態:                                  │
│  ┌─────────────────────────────────┐    │
│  │ 🟢 軽度ニキビ        低    87%  │    │
│  │ 🟡 脂性              中    92%  │    │
│  │ 🟢 保湿力            良好  78%  │    │
│  └─────────────────────────────────┘    │
│                                         │
│  おすすめ商品:                           │
│  ┌──────────┐ ┌──────────┐             │
│  │商品1     │ │商品2     │             │
│  │94%一致   │ │91%一致   │             │
│  └──────────┘ └──────────┘             │
│                                         │
│  [再分析] [履歴確認]                     │
└─────────────────────────────────────────┘
```

**AI画面ルール:**
- ローディング状態: 分析中のスケルトンシマーメまたはスピナー、ラベンダー背景。
- エラー状態: リトライボタン付きの明確なエラーメッセージ。
- 長時間実行分析のプログレスインジケーター。
- 状態の重大度: カラーコードバッジ（緑=低、黄=中、赤=高）。
- 信頼度はパーセンテージバーで表示。
- 商品は一致スコアの降順でソート。
- 「再分析」ボタンは常に利用可能、ラグジュアリーパープル (#7C3AED) 背景。
- アップロードエリア: ソフトラベンダー (#F3E8FF) 背景とパープルボーダー。
- 結果ページ: クリーンな白背景とラベンダーカードセクション。
- CTAボタン: ラグジュアリーパープル (#7C3AED) と白テキスト。

## 9.4 出品者ダッシュボード設計

```
┌─────────────────────────────────────────┐
│  出品者ダッシュボード                     │
│                                         │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  │
│  │総売上│ │注文数│ │平均  │ │評価  │  │
│  │      │ │  127 │ │$45.2 │ │4.7★  │  │
│  │$5,740│ │      │ │      │ │      │  │
│  └──────┘ └──────┘ └──────┘ └──────┘  │
│                                         │
│  売上トレンド（チャート）                 │
│  ┌─────────────────────────────────┐    │
│  │  📈 ラインチャート / バーチャート │    │
│  │  過去30日                        │    │
│  └─────────────────────────────────┘    │
│                                         │
│  最近の注文                              │
│  ┌─────────────────────────────────┐    │
│  │ 注文番号 │ 顧客    │ 金額  │状態│    │
│  │ #1001   │ John D. │ $89.99 │ ✓│    │
│  │ #1000   │ Jane S. │ $34.50 │ ⏳│    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

**ダッシュボードルール:**
- KPIカード: 大きな数字、ラベル、トレンドインジケーター（パーセンテージ付き上下矢印）、ソフトラベンダー (#F3E8FF) 背景。
- チャート: Rechartsまたは同等のものを使用。レスポンシブ、インタラクティブ、プライマリチャートカラーとしてラグジュアリーパープル (#7C3AED)。
- テーブル: ソート可能なカラム、ページネーション、ステータスバッジ、ラグジュアリー美学。
- 時間範囲セレクター: 7日、30日、90日、1年。
- すべての金額は通貨シンボル付きでフォーマット。
- ヘッダー: ラグジュアリーパープル (#7C3AED) 背景と白テキスト。
- サイドバー: クリーンな白背景とアクティブアイテムのパープルアクセント。

## 9.5 管理者ダッシュボード設計

```
┌─────────────────────────────────────────┐
│  管理者ダッシュボード                     │
│                                         │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  │
│  │ユーザー│ │出品者│ │注文数│ │収益  │  │
│  │1,247 │ │  42  │ │3,891 │ │$127K │  │
│  │+12%  │ │ +3   │ │ +8%  │ │ +15% │  │
│  └──────┘ └──────┘ └──────┘ └──────┘  │
│                                         │
│  保留アクション                          │
│  ┌─────────────────────────────────┐    │
│  │ 🔔 5件の出品者承認が保留中       │    │
│  │ 🔔 12件のレビューがモデレーション待ち│    │
│  │ 🔔 2件のコンテンツレポート        │    │
│  └─────────────────────────────────┘    │
│                                         │
│  収益＆ユーザー成長チャート               │
│  ┌─────────────────────────────────┐    │
│  │  📈 デュアルアクシスチャート     │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

**管理者ダッシュボードルール:**
- 保留アクションのアラートバッジ（出品者承認、レビューモデレーション）、ビューティーピink (#EC4899) アクセント。
- トレンドインジケーター付きのプラットフォーム全体の指標、ソフトラベンダー (#F3E8FF) 背景。
- 一般的な管理者タスクのクイックアクションボタン、ラグジュアリーパープル (#7C3AED) スタイリング。
- すべてのチャートはインタラクティブであること（ホバーツールチップ、クリックでドリルダウン）、パープルベースのカラースキーム。
- ヘッダー: ラグジュアリーパープル (#7C3AED) 背景と白テキスト。
- サイドバー: クリーンな白背景とアクティブアイテムのパープルアクセント。
- 収益チャート: プレミアム美学のためのパープルグラデーションフィルク使用。

## 9.6 カラーパレット

**ラグジュアリーコスメティックスデザインシステム - 公式カラーパレット**

**shadcn/ui CSS変数のみを使用。生のカラーを定義しないこと。**

| トークン | ライトモード | ダークモード | 使用 |
|-------|-----------|-----------|-------|
| `--background` | #FFFFFF (白) | #18181B (ニアブラック) | ページ背景 |
| `--foreground` | #18181B (ニアブラック) | #FFFFFF (白) | プライマリテキスト |
| `--primary` | #7C3AED (ラグジュアリーパープル) | #7C3AED (ラグジュアリーパープル) | プライマリアクション、リンク、CTAボタン |
| `--primary-foreground` | #FFFFFF (白) | #FFFFFF (白) | プライマリ上のテキスト |
| `--secondary` | #F3E8FF (ソフトラベンダー) | #2D1B4E (ダークラベンダー) | セカンダリアクション、カード背景 |
| `--muted` | #F8F4FF (ライトラベンダー) | #1F1529 (非常に暗いパープル) | ミュートされた背景、微妙なサーフェス |
| `--muted-foreground` | #6B7280 (グレー) | #9CA3AF (ライトグレー) | セカンダリテキスト、キャプション |
| `--destructive` | #EF4444 (赤) | #EF4444 (赤) | 削除、エラーアクション |
| `--border` | #E5E7EB (ライトグレー) | #374151 (ダークグレー) | ボーダー |
| `--ring` | #7C3AED (ラグジュアリーパープル) | #7C3AED (ラグジュアリーパープル) | フォーカスリング |
| `--accent` | #EC4899 (ビューティーピink) | #EC4899 (ビューティーピink) | プロモーション、お気に入りハート、評価、セールバッジ |

**追加ブランドカラー:**

| カラー | 16進数 | 使用 |
|-------|--------|------|
| ラグジュアリーパープル | #7C3AED | メインブランドカラー、プライマリボタン、ヘッダー、ナビゲーション |
| ビューティーピink | #EC4899 | プロモーション、CTAハイライト、お気に入りハート、評価星、セールバッジ、ビューティー関連のアクセント |
| ソフトラベンダー | #F3E8FF | カード背景、セクション背景、フィルタ背景、バッジ、微妙なサーフェス |
| ミュートラベンダー | #F8F4FF | 入力背景、ホバーステート、微妙なハイライト |
| 成功グリーン | #22C55E | 成功状態、ポジティブインジケーター |
| 警告アンバー | #F59E0B | 警告状態、低在庫アラート |
| エラー赤 | #EF4444 | エラー状態、破壊的アクション |

**セマンティックカラー（Tailwindユーティリティ）:**

```
bg-background     → ページ背景 (白)
bg-primary        → プライマリボタン (ラグジュアリーパープル)
bg-secondary      → セカンダリサーフェス (ソフトラベンダー)
bg-accent         → アクセント要素 (ビューティーピink)
bg-destructive    → 削除ボタン (赤)
bg-muted          → ミュートされた背景 (ライトラベンダー)
text-foreground   → プライマリテキスト (ニアブラック)
text-muted-foreground → セカンダリテキスト (グレー)
text-primary-foreground → パープルボタン上のテキスト (白)
border-border     → すべてのボーダー (ライトグレー)
ring              → フォーカスリング (ラグジュアリーパープル)
```

**カラー使用ルール:**
- **パープル (#7C3AED)** がメインブランドカラーとなり、以前の「ブランドブルー」の参照をすべて置き換え。プライマリボタン、ナビゲーション、ヘッダー、リンク、フォーカスリングに使用。
- **ピンク (#EC4899)** はプロモーション、CTAハイライト、お気に入りハート、評価星、セールバッジ、ビューティー関連のアクセントに使用。
- **ラベンダー (#F3E8FF)** はカード背景、セクション背景、フィルタ背景、バッジ、微妙なサーフェスに使用。
- **白 (#FFFFFF)** がプライマリページ背景として残る。
- **ダークテキスト (#18181B)** がプライマリタイポグラフィカラーとして残る。
- `bg-white`、`bg-gray-500`、`text-red-500`などの生のカラーカスタムは使用しない。
- 常にセマンティックトークンを使用: `bg-background`、`text-muted-foreground`。
- shadcnコンポーネントの`dark:`オーバーライドは禁止。
- カラーの決定はTailwindクラスではなくCSS変数で行う。
- ヒーローセクションやプロモーションバナーにはパープルとピンクのグラデーションを使用。
- 商品カードはラベンダー背景でラグジュアリービューティーの美学を持つべき。
- AI肌分析ページはラベンダー背景とパープルCTAボタンを使用すべき。
- 出品者ダッシュボードと管理者ダッシュボードは同じパープルベースのテーマに従うべき。
- お気に入りアイコン、評価要素、プロモーションバッジはピンクアクセントを使用すべき。

## 9.7 タイポグラフィ

| エレメント | Tailwindクラス | 使用 |
|---------|-----------------|-------|
| ページタイトル | `text-3xl font-bold tracking-tight` | ページ見出し |
| セクションタイトル | `text-xl font-semibold` | セクション見出し |
| カードタイトル | `text-lg font-medium` | カード見出し |
| 本文テキスト | `text-base` | 段落 |
| 小さいテキスト | `text-sm` | キャプション、ヘルパーテキスト |
| 極小 | `text-xs` | バッジ、タイムスタンプ |
| 価格 | `text-lg font-bold` | 商品価格 |
| 価格（比較） | `text-sm text-muted-foreground line-through` | 元価格 |

**タイポグラフィルール:**
- Tailwindタイポグラフィユーティリティを使用し、生のCSS `font-size`は使用しない。
- 行の高さ: 本文は`leading-normal`、見出しは`leading-tight`。
- 最大行の長さ: 可読性のために60-80文字。
- テキスト切り詰めには`line-clamp-*`ユーティリティを使用。

## 9.8 フォーム

**フォームレイアウト:**

```
┌─────────────────────────────────────────┐
│  フォームタイトル                         │
│                                         │
│  ラベル                                  │
│  ┌─────────────────────────────────┐    │
│  │ 入力                             │    │
│  └─────────────────────────────────┘    │
│  ヘルパーテキスト / エラーメッセージ      │
│                                         │
│  ラベル                                  │
│  ┌─────────────────────────────────┐    │
│  │ セレクト ▼                       │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌──────────────┐ ┌──────────────┐     │
│  │ キャンセル    │ │ 送信         │     │
│  └──────────────┘ └──────────────┘     │
└─────────────────────────────────────────┘
```

**フォームルール:**
- ラベルは`htmlFor`/`id`を通じて入力に関連付けが必須。
- エラーメッセージは入力の下に`aria-describedby`でリンクして表示が必須。
- 必須フィールドには視覚的インジケーター（アスタリスク）と`aria-required`が必須。
- 送信ボタンは送信中にローディング状態を表示が必須、ラグジュアリーパープル (#7C3AED) 背景。
- フォーム送信はローディング中に無効化が必須。
- エラー表示にはshadcn/uiの`FormMessage`コンポーネントを使用。
- 検証エラーはアラートではなくインラインで表示が必須。
- キャンセルボタンは`variant="outline"`を使用。送信はパープルスタイリングのデフォルトバリアントを使用。
- 入力背景: ラグジュアリービューティーの美学のためのソフトラベンダー (#F3E8FF)。
- フォーカス状態: 一貫したブランドアイデンティティのためのパープルリング (#7C3AED)。

## 9.9 テーブル

**テーブル構造:**

```
┌──────┬──────────────┬────────┬─────────┬──────────┐
│ ソート│ 商品名       │ 価格   │ 在庫    │ ステータス│
├──────┼──────────────┼────────┼─────────┼──────────┤
│ ☐    │ クレンザー    │ $29.99 │ 150     │ 有効     │
│ ☐    │ セラム        │ $49.99 │ 0       │ 無効     │
│ ☐    │ 保湿剤        │ $34.99 │ 5       │ 低在庫   │
├──────┴──────────────┴────────┴─────────┴──────────┤
│ ◄ 1 2 3 ... 8 >                     1-20件を表示 │
└───────────────────────────────────────────────────┘
```

**テーブルルール:**
- shadcn/ui `Table`コンポーネントを使用。
- ソート可能なカラム: ヘッダーをクリックしてソート、パープルアクセントの矢印インジケーターを表示。
- 選択可能な行: 最初のカラムのチェックボックス、パープルアクセント。
- ページネーション: テーブルの下部、現在の範囲を表示、パープルのアクティブページ。
- 空の状態: データがない場合のメッセージ＋イラスト。
- ローディング状態: フェッチ中のスケルトン行。
- レスポンシブ: モバイルでは水平スクロール、最初のカラムは固定。
- ヘッダー背景: ラグジュアリービューティーの美学のためのソフトラベンダー (#F3E8FF)。
- 行ホバー: プレミアム感のためのライトラベンダー背景。
- ステータスバッジ: パープルとピンクアクセントの更新されたステータスバッジカラーを使用。

## 9.10 モーダル（ダイアログ）

**モーダル構造:**

```
┌─────────────────────────────────────────┐
│  ダイアログタイトル                [X]    │
├─────────────────────────────────────────┤
│                                         │
│  ダイアログコンテンツがここにあります。    │
│                                         │
├─────────────────────────────────────────┤
│  [キャンセル]                      [保存]│
└─────────────────────────────────────────┘
```

**モーダルルール:**
- shadcn/ui `Dialog`コンポーネント（Radix UI）を使用。
- 開いた時にフォーカスはダイアログ内にトラップが必須。
- ESCキーでダイアログを閉じが必須。
- ダイアログの外をクリックで閉じが必須（確認が必要な場合を除く）。
- タイトルは記述的で簡潔であること。
- アクション: 左にキャンセル（アウトライン）、右にプライマリアクション、ラグジュアリーパープル (#7C3AED) 背景。
- 破破壊的モーダル: 赤い確認ボタン付きの`AlertDialog`を使用。
- 非同期操作中の送信ボタンにローディング状態。
- モーダル背景: ラグジュアリーエステティックのためのサブティルラベンダーボーダー付きの白。
- ヘッダー: ブランド一貫性のためのラグジュアリーパープル (#7C3AED) アクセントまたはボーダー。

## 9.11 ステータスバッジ

| ステータス | バッジカラー | テキスト |
|--------|------------|------|
| 有効 | 緑（`bg-green-100 text-green-800`） | Active |
| 無効 | グレー（`bg-gray-100 text-gray-800`） | Inactive |
| 保留中 | アンバー（`bg-amber-100 text-amber-800`） | Pending |
| 処理中 | パープル（`bg-purple-100 text-purple-800`） | Processing |
| 配送済み | 緑（`bg-green-100 text-green-800`） | Delivered |
| 完了 | 緑（`bg-green-100 text-green-800`） | Done |
| 承認済み | 緑（`bg-green-100 text-green-800`） | Approved |
| 却下 | 赤（`bg-red-100 text-red-800`） | Rejected |
| 低在庫 | アンバー（`bg-amber-100 text-amber-800`） | Low Stock |
| 在庫切れ | 赤（`bg-red-100 text-red-800`） | Out of Stock |
| セール/プロモーション | ピンク（`bg-pink-100 text-pink-800`） | Sale |
| 新着 | パープル（`bg-purple-100 text-purple-800`） | New |

**バッジルール:**
- 適切な`variant`付きのshadcn/ui `Badge`コンポーネントを使用。
- 一貫したサイジング: `text-xs px-2 py-0.5 rounded-full`。
- カラーはセマンティックな意味を伝えること（緑=良好、赤=悪い、黄=警告、パープル=処理中/ブランド、ピンク=プロモーション）。
- 情報の伝達にカラーのみを使用しない。テキストラベルを含める。
- プロモーションバッジとセールインジケーターにはビューティーピink (#EC4899) を使用。
- 処理中状態とブランド関連バッジにはラグジュアリーパープル (#7C3AED) を使用。

---

# 10. パフォーマンススタンダード

## 10.1 APIレスポンスターゲット

| 指標 | ターゲット | 測定方法 |
|--------|--------|-------------|
| APIレスポンス時間（p50） | ≤ 200ms | サーバーサイドログ |
| APIレスポンス時間（p95） | ≤ 500ms | サーバーサイドログ |
| APIレスポンス時間（p99） | ≤ 1000ms | サーバーサイドログ |
| データベースクエリ時間 | ≤ 50ms | Prismaログ |
| Redis操作時間 | ≤ 5ms | Redisログ |
| ヘルスチェックエンドポイント | ≤ 50ms | 常に |

## 10.2 ダッシュボードターゲット

| 指標 | ターゲット |
|--------|--------|
| 初期ページロード（LCP） | ≤ 2秒 |
| インタラクティブ時間（TTI） | ≤ 3秒 |
| 初回コンテンツフルペイント（FCP） | ≤ 1.5秒 |
| 累積レイアウトシフト（CLS） | ≤ 0.1 |
| 初回入力遅延（FID） | ≤ 100ms |

## 10.3 検索ターゲット

| 指標 | ターゲット |
|--------|--------|
| 検索レスポンス時間（10Kレコード） | ≤ 3秒 |
| オートコンプリートレスポンス時間 | ≤ 200ms |
| フィルタ適用時間 | ≤ 500ms |
| デバウンス遅延（検索入力） | 300ms |

## 10.4 AI分析ターゲット

| 指標 | ターゲット |
|--------|--------|
| 画像アップロード時間 | ≤ 5秒（10MBファイル） |
| AI分析処理 | ≤ 10秒 |
| 結果レンダリング | ≤ 500ms |
| キャッシュヒットレスポンス | ≤ 200ms |
| 再分析許可 | 即座に（キャッシュ上書き） |

## 10.5 Redisキャッシングスタンダード

| キャッシュターゲット | TTL | 無効化 |
|-------------|-----|-------------|
| 商品詳細 | 5分 | 商品更新/削除時 |
| 商品リスト（フィルタ付き） | 2分 | 任何の商品変更時 |
| カテゴリツリー | 30分 | カテゴリ変更時 |
| ユーザープロフィール | 5分 | プロフィール更新時 |
| 店舗プロフィール | 10分 | 店舗更新時 |
| アクセストークンブラックリスト | 残りTTL | ログアウト時 |
| レート制限カウンター | 60秒（API）、300秒（認証） | 自動スライディングウィンドウ |

**キャッシングルール:**
- Cache-asideパターン: Redisをチェック → ミス → DBをクエリ → Redisを設定。
- ライトスルー無効化: 変更時、キャッシュキーを`DEL`。
- 機密データ（パスワード、トークン、PII）はキャッシュしない。
- 常にTTLを設定。無期限にキャッシュしない。
- `cache:product:{id}`命名規則を使用。
- リストキャッシュにはハッシュを使用: `cache:products:list:{hash}`。

---

# 11. 環境＆デプロイメントスタンダード

## 11.1 環境変数スキーマ

**バックエンド（.env）:**

```bash
# アプリケーション
APP_PORT=8080
APP_API_PREFIX=api/v1
APP_CORS_ORIGIN=http://localhost:5173
APP_ENV=development

# データベース
DATABASE_URL=postgresql://user:password@localhost:5432/cosmetics_finder

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_ACCESS_SECRET=your-access-secret-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
JWT_ABSOLUTE_LIMIT_DAYS=90

# ファイルアップロード
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_PRODUCT=5242880
MAX_FILE_SIZE_AVATAR=5242880
MAX_FILE_SIZE_ANALYSIS=10485760

# AI（将来）
AI_API_KEY=
AI_API_URL=
```

**フロントエンド（.env）:**

```bash
VITE_API_URL=http://localhost:8080/api/v1
VITE_APP_NAME=Cosmetics Finder
VITE_APP_VERSION=0.1.0
```

**環境変数ルール:**
- すべての環境変数は起動時にZodスキーマで検証が必須。
- `.env`ファイルはgitにコミットしない。
- `.env.example`はプレースホルダー値でコミットが必須。
- 機密値は最低32文字であること。
- 環境変数の値はログに残さない。
- バックエンド環境変数をフロントエンドに公開しない（`VITE_`プレフィックス付きのみ）。

## 11.2 Dockerセットアップ

**docker-compose.yml（開発用）:**

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: cosmetics_finder
      POSTGRES_USER: dev_user
      POSTGRES_PASSWORD: dev_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes

  backend:
    build: ./backend
    ports:
      - "8080:8080"
    environment:
      DATABASE_URL: postgresql://dev_user:dev_password@postgres:5432/cosmetics_finder
      REDIS_HOST: redis
    depends_on:
      - postgres
      - redis

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    environment:
      VITE_API_URL: http://localhost:8080/api/v1

volumes:
  postgres_data:
```

**Dockerルール:**
- 小さいサイズのためにAlpineベースのイメージを使用。
- Dockerfileに秘密情報は含めない。ランタイム環境変数を使用。
- 本番イメージにはマルチステージビルドを使用。
- 非rootユーザーとしてコンテナを実行。
- すべてのサービスにヘルスチェックを定義が必須。

## 11.3 CI/CD要件

**パイプラインステージ:**

| ステージ | ステップ | ゲート |
|-------|-------|------|
| Lint | ESLint（バックエンド+フロントエンド） | 合格必須 |
| 型チェック | TypeScript strictモードコンパイル | 合格必須 |
| ユニットテスト | Jest（バックエンド）+ Vitest（フロントエンド） | 合格必須、カバレッジ ≥ 80% |
| 統合テスト | バックエンドAPIテスト | 合格必須 |
| ビルド | `npm run build`（両方） | 成功必須 |
| セキュリティスキャン | `npm audit`、依存関係チェック | クリティカル/ハイ脆弱性なし |
| E2Eテスト | Playwright/Cypress | 合格必須（mainへのPR時） |

**CI/CDルール:**
- main/developへのマージ前にすべてのチェックに合格が必須。
- 失敗したパイプラインはデプロイメントをブロック。
- ステージングへのデプロイメント: developへのマージ時に自動。
- 本番へのデプロイメント: 手動承認が必要。
- ロールバック機能を維持が必須。

## 11.4 秘密情報管理

| 秘密情報 | 保存 | アクセス |
|--------|---------|--------|
| データベースURL | 環境変数 | バックエンドのみ |
| JWT秘密情報 | 環境変数 | バックエンドのみ |
| Redisパスワード | 環境変数 | バックエンドのみ |
| APIキー | 環境変数 | バックエンドのみ |
| アップロード資格情報 | 環境変数 | バックエンドのみ |

**秘密情報ルール:**
- 秘密情報はgitにコミットしない。
- 秘密情報はログに残さない。
- 秘密情報はエラーメッセージに含めない。
- 秘密情報はフロントエンドに公開しない。
- すべての秘密情報には環境変数を使用。
- 定期的に秘密情報をローテーション（四半期ごとが推奨）。
- 開発、ステージング、本番で異なる秘密情報を使用。

---

# 12. マーケットプレイス固有ルール

## 12.1 商品所有権ルール

| ルール | 実装 |
|------|---------------|
| 商品は出品者に帰属 | 商品テーブルの`merchantId`FK |
| 出品者は自分の商品のみ編集可能 | サービスが`merchantId === currentUser.id`をチェック |
| 出品者は自分の商品のみ削除可能 | サービスが`merchantId === currentUser.id`をチェック |
| 管理者はすべての商品を編集/削除可能 | 管理者ロールは所有権チェックをバイパス |
| `isActive`による商品ソフト削除 | `DELETE`エンドポイントが`isActive = false`を設定 |
| 無効な商品は検索から非表示 | クエリが`isActive = true`をフィルタ |

**所有権検証（バックエンド）:**

```typescript
// products.service.ts内
async update(id: string, dto: UpdateProductDto, userId: string) {
  const product = await this.prisma.product.findUnique({ where: { id } });
  if (!product) throw new NotFoundException('Product not found');
  if (product.merchantId !== userId) throw new ForbiddenException('Not your product');
  // ... 更新ロジック
}
```

## 12.2 出品者承認ワークフロー

| ステップ | アクション | ステータス |
|------|--------|--------|
| 1 | ユーザーが出品者として登録 | `role = 'merchant'` |
| 2 | 出品者が店舗プロフィールを作成 | `shops.is_approved = false` |
| 3 | 管理者が店舗を確認 | — |
| 4a | 管理者が承認 | `shops.is_approved = true` |
| 4b | 管理者が却下 | 店舗削除またはフラグ付け |
| 5 | 承認された出品者は商品を出品可能 | 商品リスト有効化 |

**ルール:**
- 新しい出品者店舗はデフォルトで`is_approved = false`。
- 未承認店舗の商品は購入者に表示されない。
- 管理者は保留中の承認通知を受信。
- 管理者は理由を付けて却下可能（出品者参照用に保存）。
- 店舗が無効化された場合、再承認が必要。

## 12.3 レビューモデレーションルール

| ルール | 詳細 |
|------|--------|
| 対象資格 | 認証済み購入者のみレビュー可能 |
| ユーザーごとに商品ごとに1件のレビュー | ユニーク制約`[userId, productId]`で実行 |
| 評価範囲 | 1-5の両端含む、チェック制約で実行 |
| 自動承認 | レビューはデフォルトで承認（`is_approved = true`） |
| 管理者モデレーション | 管理者はすべてのレビューを承認/却下/削除可能 |
| 平均評価 | 承認されたレビューのみから自動計算 |
| レビュー数 | 承認されたレビューのみから自動計算 |

**レビューフロー:**

```
ユーザーがレビューを送信 → is_approved = true → 商品で表示
                                        ↓
                            管理者がレビューをフラグ付け → is_approved = false → 商品から非表示
```

## 12.4 注文生命周期ルール

**ステータスフロー:**

```
placed → confirmed → packed → shipped → out_for_delivery → delivered
   ↓         ↓          ↓         ↓              ↓              ↓
  出荷前のいずれの状態でもキャンセル可能 → cancelled
```

**遷移ルール:**

| から | 許可される先 | トリガー |
|------|-----------|-------------|
| placed | confirmed | 出品者 |
| confirmed | packed | 出品者 |
| packed | shipped | 出品者 |
| shipped | out_for_delivery | 配送業者/システム |
| out_for_delivery | delivered | 購入者/システム |
| placed/confirmed/packed | cancelled | 購入者または出品者 |

**注文ルール:**
- 注文作成時に在庫がアトミックに減少（`$transaction`）。
- 価格は注文作成時にロック。
- 合計 = 小計 + 送料 + 税金。
- 小計 = Σ（単価 × 数量）。
- deliveredステータスはシステムまたは購入者によって確認。

## 12.5 お気に入りルール

| ルール | 詳細 |
|------|--------|
| ユーザーごとに商品ごとに1件のお気に入りエントリ | ユニーク制約`[userId, productId]` |
| トグル動作 | POSTで追加、DELETEで削除（冪等） |
| お気に入りは商品情報を表示 | productsテーブルと結合して名前、価格、画像を取得 |
| カートに移動 | オプション機能: お気に入りアイテムをカートにコピー |
| 無効な商品 | お気に入りには表示されるが利用不可としてマーク |

## 12.6 プロモーションルール

| ルール | 詳細 |
|------|--------|
| コードの一意性 | `code`カラムにユニーク制約 |
| 出品者分離 | 各出品者が独自のプロモーションを作成 |
| 割引タイプ | `percentage`または`fixed`（列挙制約） |
| 最低注文金額 | 割引適用のためのオプション最低金額 |
| 使用制限 | `used_count`追跡付きのオプション`max_uses` |
| 日付範囲 | `starts_at` < `expires_at`（チェック制約） |
| 有効ステータス | 有効/無効の`is_active`フラグ |
| 注文ごとに1つのクーポン | チェックアウトサービスレベルで実行 |
| 割引フロア | 割引後の金額は$0以下にならない |

**割引計算:**

```
percentage discount: discount = subtotal × (discountValue / 100)
fixed discount: discount = min(discountValue, subtotal)
final = max(0, subtotal - discount)
```

## 12.7 広告ルール

| ルール | 詳細 |
|------|--------|
| 出品者所有権 | 広告は店舗に帰属、店舗は出品者に帰属 |
| 日付範囲 | `starts_at` < `expires_at`（チェック制約） |
| 有効フィルタリング | `is_active = true` AND 日付範囲内のもののみ表示 |
| 店舗承認が必要 | 承認された店舗のみ有効な広告を持てる |
| 画像はオプショナル | テキストのみまたは画像付きの広告が可能 |
| リンクURLはオプショナル | クリックスルーリンクURLはオプショナル |
| 管理者承認が必要 | すべての広告は表示前に管理者承認が必要 |
| 支払いが必要 | 出品者は送信前に広告料金を支払う必要がある |
| 週間広告制限 | 週あたり最大5件の有効な広告 |
| 告知メッセージ | 表示用にバナー/画像と告知メッセージを含む必要がある |
| 承認状態 | 広告は承認状態: pending/approved/rejected |
| 支払い状態 | 広告は支払い状態: pending/paid/failed/refunded |
| 却下時返金 | 却下された場合は自動返金 |
| 再送信 | 却下された広告は編集して再送信可能 |

## 12.8 AI肌分析ルール

| ルール | 詳細 |
|------|--------|
| 画像要件 | 顔が可见で、明るく、クリアであること |
| 対応形式 | JPG、PNG、WebP |
| 最大ファイルサイズ | 10MB |
| 分析出力 | 肌タイプ、重大度付き状態、推定年齢 |
| レコメンド | 分析結果と商品データベースに基づく |
| キャッシング | ユーザーごとに24時間結果をキャッシュ |
| 再分析 | いつでも可能、キャッシュを上書き |
| 履歴 | 無期限に保持 |
| 購入者限定機能 | `buyer`roleを持つユーザーのみAI分析を使用可能 |
| 保存 | 分析画像は安全に保存、公開アクセス不可 |

---

# 13. データベース変更ガバナンス

## 13.1 Prismaマイグレーションルール

| ルール | 詳細 |
|------|--------|
| 開発マイグレーション | `npx prisma migrate dev --name <description>` |
| 本番マイグレーション | `npx prisma migrate deploy`（非対話式） |
| 本番で`db push`は使用しない | `db push`はプロトタイプ作成のみ |
| マイグレーションファイルをコミット | SQLマイグレーションファイルはバージョン管理に含めることが必須 |
| スキーマが信頼できるソース | 常に`schema.prisma`を変更し、生SQLは使用しない |
| 可能な限りリバーシブル | マイグレーションにはアップパスとダウンパスの両方があること |
| 後方互換性 | 新しいカラムはNULL許容またはデフォルト値があること |
| 破壊的変更なし | マイグレーション戦略なしにカラムをリネーム/削除しない |

**危険な変更のためのマイグレーション戦略:**

```
1. NULL許容カラムを追加
2. データをバックフィル
3. NOT NULL制約を追加
4. （オプション）次のマイグレーションで古いカラムを削除
```

## 13.2 スキーマレビュープロセス

**Prismaスキーマ変更の前:**

- [ ] スキーマ変更が命名規則に従っている（セクション1.2）
- [ ] FKカラムと頻繁にクエリされるフィルタに新しいインデックスが追加されている
- [ ] すべてのリレーションに`onDelete`/`onUpdate`が明示的に指定されている
- [ ] 金額に`Decimal`が使用されている（`Float`は使用しない）
- [ ] ビジネスルールのチェック制約が追加されている（例: `price > 0`）
- [ ] マイグレーションが開発データベースでテスト済み
- [ ] マイグレーションがステージングデータベースでテスト済み
- [ ] マイグレーションにロールバック戦略がある
- [ ] パフォーマンスへの影響が評価されている（新しいインデックス）
- [ ] スキーマ変更がPR説明に文書化されている

## 13.3 禁止された直接データベース変更

**Prismaマイグレーションを通じずに以下の行為は絶対に行わないこと:**

| 禁止されたアクション | 理由 |
|-------------------|--------|
| 生SQLによる`ALTER TABLE` | スキーマバージョン管理をバイパス |
| シードスクリプトなしのルックアップテーブルへの`INSERT` | データ不整合 |
| `DROP TABLE`または`DROP COLUMN` | データ損失リスク |
| `WHERE`句なしの`UPDATE` | 誤っての一括更新 |
| 手動インデックス作成 | スキーマ追跡をバイパス |
| カラムタイプの変更 | 破壊的変更リスク |
| 制約の変更 | データ整合性リスク |

**例外:** 文書化された承認と修正後のマイグレーション付きの緊急本番修正。

---

# 14. 受入チェックリスト

## マージ前チェックリスト（開発者が完了必须）

### コード品質
- [ ] TypeScriptコードに`any`型がない
- [ ] 本番コードに`console.log`ステートメントがない
- [ ] ハードコードされた秘密情報、資格情報、APIキーがない
- [ ] コメントアウトされたコードブロックがない
- [ ] すべての関数に明確で記述的な名前がある
- [ ] コードが命名規則に従っている（セクション1）
- [ ] ESLintがゼロエラーで合格
- [ ] TypeScriptがエラーなしでコンパイル（strictモード）

### セキュリティ
- [ ] すべての新しいエンドポイントに`@UseGuards(JwtAuthGuard, RolesGuard)`がある
- [ ] すべての新しいエンドポイントに`@Roles()`デコレーターがある
- [ ] すべての入力が`class-validator`付きDTOで検証されている
- [ ] SQLインジェクションベクトルがない（Prismaパラメータ化クエリを使用）
- [ ] XSSベクトルがない（サニタイズなしの`dangerouslySetInnerHTML`がない）
- [ ] ファイルアップロードが検証されている（MIMEタイプ、サイズ）
- [ ] パスワードがArgon2でハッシュ化されている（プレーンテキストは使用しない）
- [ ] JWT秘密情報がログやエラーメッセージに公開されていない

### データベース
- [ ] Prismaスキーマが命名規則に従っている（セクション1.2）
- [ ] 新しいFKカラムに`@@index`がある
- [ ] `onDelete`/`onUpdate`が明示的に指定されている
- [ ] マイグレーションが開発データベースでテスト済み
- [ ] マイグレーションは可能な限りリバーシブル
- [ ] マイグレーション戦略なしの破壊的変更がない

### テスト
- [ ] 新しいサービス/メソッドにユニットテストが追加されている
- [ ] 新しいコントローラーにユニットテストが追加されている
- [ ] 新しいエンドポイントに統合テストが追加されている
- [ ] 既存のテストすべてがまだ合格
- [ ] テストカバレッジが最小ターゲットを満たしている（セクション7.4）
- [ ] テスト名が記述的で規則に従っている

### フロントエンド（該当する場合）
- [ ] すべての新しいUI文字列にi18n翻訳キーが使用されている
- [ ] コンポーネントが命名規則に従っている（セクション1.3）
- [ ] フォームがReact Hook Formで`zodResolver`を使用
- [ ] 生のカラーカスタムがない（セマンティックトークンを使用）
- [ ] キーボードナビゲーションが機能
- [ ] レスポンシブデザインが検証済み（モバイル、タブレット、デスクトップ）
- [ ] ローディング/エラー状態が実装されている
- [ ] 未使用のインポートや変数がない

### バックエンド（該当する場合）
- [ ] 新しいエンドポイントのSwaggerアノテーションが更新されている
- [ ] エラーレスポンスが標準形式に従っている（セクション6.1）
- [ ] ログにNestJS Loggerが使用されている（`console.log`は使用しない）
- [ ] 適切な場所でRedisキャッシングが実装されている
- [ ] 新しい公開エンドポイントにレート制限が適用されている
- [ ] 機密操作に監査ログが実装されている

### ドキュメント
- [ ] PR説明がテンプレートに従っている（セクション3.3）
- [ ] PRに関連する問題がリンクされている
- [ ] 破壊的変更が文書化されている
- [ ] 新しい環境変数が`.env.example`に文書化されている
- [ ] APIドキュメントが更新されている（Swagger）

### パフォーマンス
- [ ] N+1クエリがない（適切に`select`/`include`を使用）
- [ ] 頻繁にアクセスされるデータにRedisキャッシングが行われている
- [ ] リストエンドポイントにページネーションが実装されている
- [ ] 画像アップロードが最適化（圧縮、複数サイズ）
- [ ] データベースクエリが適切なインデックスを使用

---

**ドキュメント管理:**
- 著者: プリンシパルソフトウェアアーキテクト＆エンタープライズエンジニアリングガバナンスリード
- 作成日: 2026-08-03
- 最終更新日: 2026-08-14
- 次回レビュー: フェーズ2企画
- 承認者: [承認済み]

---

*開発ルール_DEVELOPMENT_RULES.md ここまで*