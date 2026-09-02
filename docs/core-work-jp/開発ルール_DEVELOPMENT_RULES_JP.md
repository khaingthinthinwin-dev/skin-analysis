# 開発ルール_DEVELOPMENT_RULES.md

## エンタープライズ開発ガバナンス仕様

---

| 属性 | 値 |
|------|-----|
| **ドキュメントID** | SKM-DEV-001 |
| **システム** | Cosmetics Finder |
| **バージョン** | 2.1 |
| **作成日** | 2026-08-03 |
| **最終更新日** | 2026-08-17 |
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
backend/src
│
├── main.ts                                         # ブートストラップエントリーポイント
├── app.module.ts                                   # ルートモジュール
│
├── config/
│   ├── config.module.ts
│   ├── config.service.ts
│   └── validation.ts
│
├── common/                             # 共同開発
│   ├── decorators/
│   │   ├── roles.decorator.ts
│   │   ├── current-user.decorator.ts
│   │   └── public.decorator.ts
│   │
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   └── roles.guard.ts
│   │
│   ├── filters/
│   │   └── all-exceptions.filter.ts
│   │
│   ├── interceptors/
│   │   ├── logging.interceptor.ts
│   │   ├── transform.interceptor.ts
│   │   └── timeout.interceptor.ts
│   │
│   ├── pipes/
│   │   └── validation.pipe.ts
│   │
│   ├── dto/
│   │   ├── pagination.dto.ts
│   │   └── pagination-response.dto.ts
│   │
│   ├── interfaces/
│   │   ├── api-response.interface.ts
│   │   └── pagination.interface.ts
│   │
│   └── utils/
│       ├── date.util.ts
│       └── slug.util.ts
│
├── modules/
│   │
│   ├── auth/                           # [ATM]
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── dto/
│   │   │   ├── login.dto.ts
│   │   │   └── register.dto.ts
│   │   ├── guards/
│   │   └── strategies/
│   │
│   ├── users/                          # [ATM]
│   │   ├── users.module.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   └── dto/
│   │
│   ├── buyer/
│   │   ├── skin-analysis/              # [ATM]
│   │   │   ├── skin-analysis.module.ts
│   │   │   ├── skin-analysis.controller.ts
│   │   │   └── skin-analysis.service.ts
│   │   │
│   │   ├── matching/                   # [ATM]
│   │   │   ├── matching.module.ts
│   │   │   ├── matching.controller.ts
│   │   │   └── matching.service.ts
│   │   │
│   │   ├── wishlist/                   # [EEM]
│   │   │   ├── wishlist.module.ts
│   │   │   ├── wishlist.controller.ts
│   │   │   └── wishlist.service.ts
│   │   │
│   │   ├── cart/                       # [EEM]
│   │   │   ├── cart.module.ts
│   │   │   ├── cart.controller.ts
│   │   │   └── cart.service.ts
│   │   │
│   │   └── orders/                     # [EEM]
│   │       ├── orders.module.ts
│   │       ├── orders.controller.ts
│   │       ├── orders.service.ts
│   │       └── dto/
│   │
│   ├── catalog/
│   │   ├── products/                   # [TMO]
│   │   │   ├── products.module.ts
│   │   │   ├── products.controller.ts
│   │   │   ├── products.service.ts
│   │   │   └── dto/
│   │   │
│   │   ├── categories/                 # [TRPH]
│   │   │   ├── categories.module.ts
│   │   │   ├── categories.controller.ts
│   │   │   └── categories.service.ts
│   │   │
│   │   └── search/                     # [TRPH]
│   │       ├── search.module.ts
│   │       ├── search.controller.ts
│   │       ├── search.service.ts
│   │       └── dto/
│   │
│   ├── merchant/
│   │   ├── products/                   # [ZSLS]
│   │   │   ├── merchant-products.module.ts
│   │   │   ├── merchant-products.controller.ts
│   │   │   └── merchant-products.service.ts
│   │   │
│   │   ├── promotions/                 # [ZSLS]
│   │   │   ├── promotions.module.ts
│   │   │   ├── promotions.controller.ts
│   │   │   └── promotions.service.ts
│   │   │
│   │   └── advertisements/             # [WYT]
│   │       ├── advertisements.module.ts
│   │       ├── advertisements.controller.ts
│   │       └── advertisements.service.ts
│   │
│   ├── admin/
│   │   ├── user-management/            # [PET]
│   │   │   ├── user-management.module.ts
│   │   │   ├── user-management.controller.ts
│   │   │   └── user-management.service.ts
│   │   │
│   │   ├── merchant-management/        # [PET]
│   │   │   ├── merchant-management.module.ts
│   │   │   ├── merchant-management.controller.ts
│   │   │   └── merchant-management.service.ts
│   │   │
│   │   ├── review-management/          # [PET]
│   │   │   ├── reviews.module.ts
│   │   │   ├── reviews.controller.ts
│   │   │   └── reviews.service.ts
│   │   │
│   │   ├── content-moderation/         # [PET]
│   │   │   ├── moderation.module.ts
│   │   │   ├── moderation.controller.ts
│   │   │   └── moderation.service.ts
│   │   │
│   │   ├── advertisement-management/   # [PET]
│   │   │   ├── advertisement-approval.module.ts
│   │   │   ├── advertisement-approval.controller.ts
│   │   │   └── advertisement-approval.service.ts
│   │   │
│   │   ├── commission-revenue/         # [PPH]
│   │   │   ├── commission.module.ts
│   │   │   ├── commission.controller.ts
│   │   │   └── commission.service.ts
│   │   │
│   │   └── audit-logs/                 # [ATM]
│   │       ├── audit-logs.module.ts
│   │       ├── audit-logs.controller.ts
│   │       └── audit-logs.service.ts
│   │
│   └── shared/
│       │
│       ├── profile/                    # [ATM]
│       │   ├── profile.module.ts
│       │   ├── profile.controller.ts
│       │   └── profile.service.ts
│       │
│       ├── notifications/              # [ATM]
│       │   ├── notifications.module.ts
│       │   ├── notifications.controller.ts
│       │   └── notifications.service.ts
│       │
│       └── order-insights/             # [HAML]
│           ├── order-insights.module.ts
│           ├── order-insights.controller.ts
│           ├── order-insights.service.ts
│           ├── dto/
│           │   ├── order-history-query.dto.ts
│           └── README.md
│
├── shared/
│   ├── shared.module.ts
│   │
│   ├── prisma/                         # 共有
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   │
│   ├── redis/                          # 共有
│   │   ├── redis.module.ts
│   │   └── redis.service.ts
│   │
│   └── mail/                           # 共有（将来用）
│       ├── mail.module.ts
│       └── mail.service.ts
│
└── database/                           # 共有
    ├── prisma/
    │   ├── schema.prisma
    │   ├── migrations/
    │   └── seed.ts
    │
    └── seeds/
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

### 2.1.1 開発者所有者タグ

| タグ | 開発者 | モジュール |
|-----|-----------|---------|
| **[ATM]** | ATM | Auth、Users、Skin Analysis、Notifications、Profile、Matching & Recommendation、Audit Logs |
| **[TMO]** | TMO | Products（catalog） |
| **[TRPH]** | TRPH | Search、Categories |
| **[EEM]** | EEM | Wishlist、Cart、Orders |
| **[ZSLS]** | ZSLS | Promotions、Merchant Products |
| **[WYT]** | WYT | Advertisements |
| **[HAML]** | HAML | Order Insights |
| **[PET]** | PET | Reviews、Admin（user/merchant/content moderation、Advertisements） |
| **[PPH]** | PPH | Commission、Revenue |

## 2.2 フロントエンドページ構造（React + TypeScript）

```
frontend/src
│
├── app/
│   ├── App.tsx                                        # ルートアプリケーションコンポーネント
│   └── routes.tsx                                     # ルート設定
│
├── pages/
│   │
│   ├── About.tsx                          # Aboutページ
│   ├── NotFound.tsx                       # 404ページ
│   ├── Settings.tsx                       # ユーザー設定ページ
│   ├── Unauthorized.tsx                   # アクセス拒否ページ
│   │
│   ├── auth/                           # [ATM]
│   │   ├── Login.tsx                   # [ATM] ユーザーログインページ
│   │   └── Register.tsx                # [ATM] ユーザー登録ページ
│   │
│   ├── buyer/
│   │   ├── Dashboard.tsx               # [TRPH] 検索＆フィルタホーム
│   │   ├── SearchFilter.tsx            # [TRPH] 商品検索とフィルタリング
│   │   ├── ProductDetail.tsx           # [TMO] 商品詳細とレビュー
│   │   ├── Wishlist.tsx                # [EEM] 保存された商品
│   │   ├── Cart.tsx                    # [EEM] ショッピングカート
│   │   ├── Checkout.tsx                # [EEM] チェックアウト＆支払い
│   │   ├── SkinAnalysis.tsx            # [ATM] 肌分析/プロフィール設定
│   │   ├── MatchingRecommendations.tsx # [ATM] 商品レコメンド
│   │   └── RecommendationHistory.tsx   # [ATM] レコメンド履歴
│   │
│   ├── merchant/
│   │   ├── Dashboard.tsx               # [ZSLS] 商品管理ホーム
│   │   ├── ProductManagement.tsx       # [ZSLS] 商品CRUD
│   │   ├── Advertisements.tsx          # [WYT] 広告管理
│   │   └── Promotions.tsx              # [ZSLS] プロモーション管理
│   │
│   ├── admin/
│   │   ├── Dashboard.tsx               # [PET] 管理者ダッシュボード概要
│   │   ├── ReviewManagement.tsx        # [PET]
│   │   ├── ContentModeration.tsx       # [PET]
│   │   ├── UserManagement.tsx          # [PET]
│   │   ├── MerchantManagement.tsx      # [PET]
│   │   ├── AdvertisementManagement.tsx # [PET]
│   │   ├── CommissionRevenue.tsx       # [PPH]
│   │   └── AuditLog.tsx                # [ATM]
│   │
│   └── shared/
│       ├── Profile.tsx                 # [ATM] プロフィール設定
│       ├── Notifications.tsx           # [ATM] 通知センター
│       └── OrderInsights.tsx           # [HAML] 注文＆レポートダッシュボード
│
├── features/
│   │
│   ├── auth/                           # [ATM]
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── schemas/
│   │
│   ├── buyer/
│   │   ├── skin-analysis/              # [ATM]
│   │   ├── matching/                   # [ATM]
│   │   ├── products/                   # [TMO]
│   │   ├── wishlist/                   # [EEM]
│   │   ├── cart/                       # [EEM]
│   │   └── checkout/                   # [EEM]
│   │
│   ├── merchant/
│   │   ├── products/                   # [ZSLS]
│   │   ├── promotions/                 # [ZSLS]
│   │   └── advertisements/             # [WYT]
│   │
│   ├── admin/
│   │   ├── user-management/            # [PET]
│   │   ├── merchant-management/        # [PET]
│   │   ├── content-moderation/         # [PET]
│   │   ├── review-management/          # [PET]
│   │   ├── advertisement-management/   # [PET]
│   │   ├── commission-revenue/         # [PPH]
│   │   └── audit-log/                  # [ATM]
│   │
│   └── shared/
│       ├── profile/                    # [ATM]
│       │   ├── components/
│       │   ├── hooks/
│       │   └── services/
│       │
│       ├── notifications/              # [ATM]
│       │   ├── components/
│       │   ├── hooks/
│       │   └── services/
│       │
│       └── order-insights/             # [HAML]
│           ├── components/
│           │   ├── OrderHistoryTable.tsx
│           │   ├── OrderDetailModal.tsx
│           │   └── OrderStatusChart.tsx
│           ├── hooks/
│           │   └── useOrderInsights.ts
│           └── services/
│               └── orderInsights.service.ts
│
├── components/
│   ├── ui/                             # 共同開発
│   ├── layout/                         # 共同開発
│   ├── navigation/
│   │   ├── BuyerNavbar.tsx             # 共同開発
│   │   ├── MerchantNavbar.tsx          # 共同開発
│   │   ├── AdminNavbar.tsx             # 共同開発
│   │   └── RoleBasedMenu.tsx           # 共同開発
│   │
│   ├── common/                         # 共同開発
│   └── auth/                           # [ATM]
│
├── layouts/
│   ├── MainLayout.tsx                 # 共同開発
│   ├── DashboardLayout.tsx            # 共同開発
│   ├── BuyerLayout.tsx                 # 共同開発
│   ├── MerchantLayout.tsx              # 共同開発
│   ├── AdminLayout.tsx                 # 共同開発
│   └── AuthLayout.tsx                  # [ATM]
│
├── hooks/                              # 共同開発
├── providers/                          # 共同開発
├── services/                           # 共同開発
├── schemas/                            # 共同開発
├── types/                              # 共同開発
├── lib/                                # 共同開発
└── i18n/                               # 共同開発
```

**フロントエンド構造ルール:**
- ページは薄い。再利用可能なロジックを`features/`または`hooks/`に抽出。
- `components/ui/`はshadcn/uiコンポーネントを含む。生成後は手動で編集しない。
- 機能フォルダはその機能のコンポーネント、フック、スキーマ、サービスを共存。
- 各機能フォルダには開発者所有者を記載した`README.md`が必須。
- ファイルごとに1コンポーネント。型は名前付きエクスポート、コンポーネントはデフォルトエクスポート。
- ルートレベルコンポーネントは`pages/`に。再利用可能なコンポーネントは`components/`または`features/`に。
- レイアウトはページコンテンツをラップするトップレベルコンポーネント（管理者サイドバー、認証フォーム、メインヘッダー/フッター）。
- `features/shared/`は複数のロールで使用されるクロス機能共有コンポーネント（分析チャート、プロフィール）を含む。

### 2.2.1 開発者所有者タグ

| タグ | 開発者 | モジュール |
|-----|-----------|---------|
| **[ATM]** | ATM | Authentication、Users、Skin Analysis、Notifications、Profile、Matching & Recommendation、Audit Logs |
| **[HAML]** | HAML | Order Insights |
| **[TMO]** | TMO | Products（catalog） |
| **[TRPH]** | TRPH | Search、Categories |
| **[EEM]** | EEM | Wishlist、Cart、Orders、Checkout |
| **[ZSLS]** | ZSLS | Promotions、Merchant Products |
| **[WYT]** | WYT | Advertisements |
| **[PET]** | PET | Reviews、Admin（user/merchant/content moderation、Advertisements） |
| **[PPH]** | PPH | Commission、Revenue |

**所有権ルール:**
- 各モジュールフォルダには割り当てられた開発者タグの`README.md`が必須。
- `Shared` / `Co-developed`モジュールは共同でメンテナンス。
- 管理者ページは共有管理機能に`[PET/PPH]`を使用。

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

## 9.2 カラーパレット

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

## 9.3 タイポグラフィ

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

## 9.4 テーブル

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

## 9.5 モーダル（ダイアログ）

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

## 9.6 ステータスバッジ

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

## 9.7 グローバルナビゲーション＆レイアウトアーキテクチャ（ヘッダー＆左サイドバー）

**ロール別ナビゲーション仕様（REQUIREMENT_SPEC.mdベース）:**

### 1. ロール別ナビゲーションアイテムマトリクス

#### 🛍️ バイヤーポータル（`role = 'BUYER'`）
| ラベル | href | アイコン | 目的 / 機能 |
|-------|------|------|-------------------|
| Dashboard | `/dashboard` | `LayoutDashboard` | 商品商品発見、検索＆フィルタリング、プロモーションバナー |
| Skin Analysis | `/skin-analysis` | `Sparkles` | AI写真アップロード、分析結果、レコメンド＆履歴 |
| Matching & Recommendations | `/recommendations` | `Wand2` | パーソナライズされたAI肌商品マッチング＆レコメンド |
| Order Details | `/orders` | `Package` | 購入者注文履歴、詳細＆追跡タイムライン（placed → delivered） |

#### 🏬 マーチャントポータル（`role = 'MERCHANT'`）
| ラベル | href | アイコン | 目的 / 機能 |
|-------|------|------|-------------------|
| Dashboard | `/merchant/dashboard` | `LayoutDashboard` | 商品管理ホーム（商品の作成、編集、削除、在庫ステータスサマリー） |
| Orders | `/merchant/orders` | `ShoppingBag` | 注文ライフサイクル処理（確認、梱包、発送、配送） |
| Promotions | `/merchant/promotions` | `Tag` | ショップクーポンと割引ルールの作成＆管理 |
| Advertisements | `/merchant/ads` | `Megaphone` | 広告パッケージの閲覧、広告の購入、パフォーマンス追跡 |
| Sales Overview | `/merchant/analytics` | `BarChart3` | 収益サマリー、注文合計、売上トレンド |

#### 🛡️ 管理者ポータル（`role = 'ADMIN'`）
| ラベル | href | アイコン | 目的 / 機能 |
|-------|------|------|-------------------|
| Dashboard | `/admin/dashboard` | `LayoutDashboard` | システムセキュリティログ＆管理者アクション監査証跡 |
| User Management | `/admin/users` | `Users` | ユーザーの閲覧、アクティブ/インアクティブステータスの切り替え |
| Merchant Management | `/admin/merchants` | `UserCheck` | 出品者申請の確認（承認/却下） |
| Ad Management | `/admin/ads` | `Megaphone` | 広告パッケージテンプレートの作成、出品者広告投稿の確認 |
| Review Moderation | `/admin/reviews` | `MessageSquare` | すべてのレビューの閲覧、報告されたコンテンツのモデレーション/フラグ付け |
| Revenue & Payouts | `/admin/revenue` | `DollarSign` | プラットフォーム手数料（12%）、広告料金、出品者支払いの追跡 |
| Content Moderation | `/admin/content` | `FileText` | ユーザー生成コンテンツのモデレーション、ポリシー違反のフラグ付け＆削除 |
| Orders | `/admin/orders` | `ClipboardList` | 購入者と出品者間のすべてのプラットフォーム注文の閲覧＆監視 |

---

### 2. 標準TypeScriptナビゲーション設定（`navConfig.ts`）

```typescript
import { 
  LayoutDashboard, 
  Sparkles, 
  Wand2, 
  ShoppingBag, 
  Package, 
  Tag, 
  Megaphone, 
  BarChart3, 
  Users, 
  UserCheck, 
  MessageSquare, 
  DollarSign,
  FileText,
  ClipboardList,
  LucideIcon
} from 'lucide-react';

export type UserRole = 'BUYER' | 'MERCHANT' | 'ADMIN';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface RoleNavConfig {
  portalTitle: string;
  mainNav: NavItem[];
  footerNav: NavItem[];
}

export const roleNavConfigs: Record<UserRole, RoleNavConfig> = {
  BUYER: {
    portalTitle: 'Buyer Portal',
    mainNav: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Skin Analysis', href: '/skin-analysis', icon: Sparkles },
      { label: 'Matching & Recommendations', href: '/recommendations', icon: Wand2 },
      { label: 'Order Details', href: '/orders', icon: Package },
    ],
    footerNav: []
  },
  MERCHANT: {
    portalTitle: 'Merchant Portal',
    mainNav: [
      { label: 'Dashboard', href: '/merchant/dashboard', icon: LayoutDashboard },
      { label: 'Orders', href: '/merchant/orders', icon: ShoppingBag },
      { label: 'Promotions', href: '/merchant/promotions', icon: Tag },
      { label: 'Advertisements', href: '/merchant/ads', icon: Megaphone },
      { label: 'Sales Overview', href: '/merchant/analytics', icon: BarChart3 },
    ],
    footerNav: []
  },
  ADMIN: {
    portalTitle: 'Admin Portal',
    mainNav: [
      { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
      { label: 'User Management', href: '/admin/users', icon: Users },
      { label: 'Merchant Management', href: '/admin/merchants', icon: UserCheck },
      { label: 'Ad Management', href: '/admin/ads', icon: Megaphone },
      { label: 'Review Moderation', href: '/admin/reviews', icon: MessageSquare },
      { label: 'Revenue & Payouts', href: '/admin/revenue', icon: DollarSign },
      { label: 'Content Moderation', href: '/admin/content', icon: FileText },
      { label: 'Orders', href: '/admin/orders', icon: ClipboardList },
    ],
    footerNav: []
  }
};
```

---

### 3. ロール対応サイドバーコンポーネント（`Sidebar.tsx`）

```tsx
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { roleNavConfigs, UserRole } from '@/config/navConfig';

interface SidebarProps {
  role?: UserRole;
}

export function Sidebar({ role = 'BUYER' }: SidebarProps) {
  const pathname = usePathname();
  const config = roleNavConfigs[role] || roleNavConfigs.BUYER;

  return (
    <aside className="fixed left-0 top-0 z-40 w-64 h-screen bg-background border-r border-border flex flex-col justify-between select-none">
      {/* ブランドヘッダー */}
      <div>
        <div className="flex items-center gap-3 px-6 py-5 border-b border-border/60">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-foreground leading-tight">
              Cosmetics Finder
            </h1>
            <p className="text-[11px] font-semibold text-muted-foreground tracking-wide uppercase">
              {config.portalTitle}
            </p>
          </div>
        </div>

        {/* メインロールナビゲーションアイテム */}
        <nav className="px-3 py-4 space-y-1">
          {config.mainNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`));
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                  ${isActive 
                    ? 'bg-purple-100/60 text-primary font-semibold shadow-xs' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}
                `}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* フッターナビゲーションアイテム */}
      <div className="px-3 py-4 border-t border-border/60 space-y-1">
        {config.footerNav.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                ${isActive 
                  ? 'bg-purple-100/60 text-primary font-semibold' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}
              `}
            >
              <Icon className="w-4 h-4 text-muted-foreground" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
```

---

### 4. トップヘッダーコンポーネント（`Header.tsx`）

```tsx
import React from 'react';
import { Globe, Heart, ShoppingBag, Bell } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

export function Header() {
  return (
    <header className="sticky top-0 z-30 w-full h-16 bg-background/95 backdrop-blur-md border-b border-border px-6 flex items-center justify-end">

      {/* アクションアイコン＆ユーザープロフィール */}
      <div className="flex items-center gap-4">
        <button className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
          <Globe className="w-5 h-5" />
        </button>
        <button className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors relative">
          <Heart className="w-5 h-5" />
        </button>
        <button className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors relative">
          <ShoppingBag className="w-5 h-5" />
        </button>
        <button className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent animate-pulse" />
        </button>
        
        {/* ユーザープロフィールアバター */}
        <div className="pl-2 border-l border-border">
          <Avatar className="w-9 h-9 border border-primary/20">
            <AvatarImage src="/avatars/user.jpg" alt="User Profile" />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">CF</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
```

**ロール別ナビゲーションレイアウトルール:**
- サイドバーはログインユーザーのロール（`BUYER`、`MERCHANT`、`ADMIN`）に割り当てられた正確なアイテムをレンダリングが必須。
- `Pending`または`Rejected`承認状態の出品者は制限されたナビゲーションアクセス（ダッシュボード＆プロフィールのみ）を持つことが必須。
- アクティブなサイドバーメニューアイテムはソフトラベンダーハイライト（`bg-purple-100/60`または`bg-secondary`）、太字プライマリテキスト（`text-primary`）、`Sparkles`またはアクティブアイコンを使用が必須。
- コンテンツエリアはデスクトップビューポートで`ml-64`（margin-left: 256px）でオフセットが必須。

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
| 管理者承認 | レビューはデフォルトで非承認（`is_approved = false`）。管理者承認後に購入者に表示。 |
| 管理者モデレーション | 管理者はすべてのレビューを承認/却下/削除可能 |
| 平均評価 | 承認されたレビューのみから自動計算 |
| レビュー数 | 承認されたレビューのみから自動計算 |

**レビューフロー:**

```
ユーザーがレビューを送信 → is_approved = false → 管理者承認待ち
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

**広告フロー:**

```
パッケージ選択 → コンテンツアップロード → 料金支払い → 管理者審査 → 承認済み → 表示
```

**コア広告ルール:**

| ルール | 詳細 |
|------|--------|
| 出品者所有権 | 広告は店舗に帰属、店舗は承認された出品者に帰属 |
| パッケージ作成 | 管理者が広告パッケージ（掲載場所、 tiers、料金）を作成・管理；出品者は利用可能なパッケージを閲覧・購入 |
| 店舗承認が必要 | 承認された店舗のみ有効な広告を購入・表示可能 |
| 日付範囲 | `starts_at` < `expires_at`（チェック制約） |
| 有効フィルタリング | `is_active = true` AND 日付範囲内のもののみ表示 |
| 支払いが必要 | 出品者は管理者審査の前に広告料金を支払う必要がある |
| 管理者承認が必要 | すべての広告は表示前に管理者承認が必要（`approval_status: pending/approved/rejected`） |
| 支払い状態 | `payment_status: pending/completed/refunded`で追跡 |
| 却下時返金 | 管理者却下時は自動返金 |
| 再送信 | 却下された広告は編集して再送信可能 |
| 週間広告制限 | 出品者あたり週最大5件の有効な広告 |
| 画像＆URL | コンテンツには画像（最大5MB）とクリックスルーリンクURLを含む可能 |

**掲載場所、表示場所＆デフォルト料金設定:**

| 掲載場所 | 表示場所 / ナビゲーションページ | ベーシック | スタンダード | プレミアム | 期間 |
|-----------|----------------------------------|-------|----------|---------|----------|
| トップページバナー | トップページ上部（`/dashboard`） | $3.00/日 | $5.00/日 | $8.00/日 | 7日間 |
| 商品詳細サイドバー | 商品詳細ページサイド（`/products/[id]`） | $2.00/日 | $3.50/日 | $6.00/日 | 15日間 |
| カテゴリバナー | カテゴリページ上部（`/products/category/[slug]`） | $2.50/日 | $4.00/日 | $7.00/日 | 30日間 |
| 検索結果トップ | 検索結果上部（`/dashboard` or `/products?search=...`） | $1.50/日 | $2.50/日 | $5.00/日 | 7日間 |

**条件付き広告表示＆ナビゲーションルール:**
- **動的表示**: 有効かつ承認済みの広告が存在する場合（`is_active = true`、`approval_status = 'approved'`）、各ページの掲載場所ビューに自動的にレンダリングが必須。
- **空状態**: 掲載場所に有効な広告がない場合、空白のプレースホルダーマージンを残さずにコンテナをきれいに折りたたむ。
- **マルチ出品者掲載**: 同じ掲載場所に複数の出品者が広告を購入可能。
- **優先順位**: ローテーション順はパッケージティアに従う: **プレミアム > スタンダード > ベーシック**。同一ティア内では `payment_amount desc` で決定。
- **ラウンドロビンローテーション**: 同じティアレベル内の広告はラウンドロビンでローテーション。
- **ローテーション速度**: スライダーは5秒ごとに自動ローテーション。
- **ローテーション制限**: スライダーローテーションごとに最大5件の広告を表示。
- **除外処理**: 期限切れ、無効、却下された広告はローテーションから即座に除外。

**Cross-Screen Slide-Down Panel (D0) について:**
上記の掲載場所表は個別のバナー/サイドバー配置を定義しています。実際の実装では、SKM-FDS-MATCH-001（機能設計書）で定義された **Cross-Screen Slide-Down Panel (D0)** という統合済み水平カルーセルコンポーネントが6画面（トップページ、検索結果、カテゴリページ、商品詳細、おすすめ、カート）で使用されます。各画面での配置位置はコンテキストに応じて異なります（トップページ: ヒーロー下、検索/カテゴリ: 結果上、商品詳細: カート追加下、おすすめ: セクション間、カート: チェックアウト上）。掲載場所のパラメータは既存の `category_banner` を再利用します。

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
- 最終更新日: 2026-08-17
- 次回レビュー: フェーズ2企画
- 承認者: [承認済み]

---

**改訂履歴:**

| バージョン | 日付 | 変更内容 | 変更者 |
|-----------|------|---------|--------|
| 2.0 | 2026-08-14 | リリース版 | プリンシパルソフトウェアアーキテクト |
| 2.1 | 2026-08-17 | 英語版との同期更新 | プリンシパルソフトウェアアーキテクト |
| 2.3 | 2026-08-30 | §12.7 Cross-Screen Slide-Down Panel (D0) についての注記追加、ティア内 priority の明記 | プリンシパルソフトウェアアーキテクト |

---

*開発ルール_DEVELOPMENT_RULES.md ここまで*