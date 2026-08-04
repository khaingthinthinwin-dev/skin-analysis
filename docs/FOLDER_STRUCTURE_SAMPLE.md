# フォルダ構造サンプル

## Cosmetics Finder - プロジェクト構造

---

| 属性 | 値 |
|------|-----|
| **ドキュメントID** | SKM-FDS-001 |
| **システム** | Cosmetics Finder |
| **バージョン** | 1.0 |
| **作成日** | 2026-08-04 |
| **ステータス** | 下書き |

---

## 1. ルートディレクトリ構造

```
skin-analysis/
├── backend/                                # NestJS バックエンド
├── frontend/                               # React フロントエンド
├── docs/                                   # ドキュメント
├── .github/                                # GitHub設定
├── docker-compose.yml                      # 開発環境Docker設定
├── .gitignore
├── README.md
└── package.json                            # モノレポ設定（オプション）
```

---

## 2. バックエンド構造（NestJS）

```
backend/
├── src/
│   ├── main.ts                              # ブートストラップエントリーポイント
│   ├── app.module.ts                        # ルートモジュール
│   ├── config/                              # 環境検証＆アプリ設定
│   │   ├── config.module.ts
│   │   ├── config.service.ts
│   │   └── validation.ts                    # Zod envスキーマ
│   ├── common/                              # 横断的関心事（共有）
│   │   ├── decorators/                      # @Roles(), @CurrentUser(), @Public()
│   │   │   ├── roles.decorator.ts
│   │   │   ├── current-user.decorator.ts
│   │   │   └── public.decorator.ts
│   │   ├── guards/                          # JwtAuthGuard, RolesGuard
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── roles.guard.ts
│   │   ├── filters/                         # AllExceptionsFilter
│   │   │   └── all-exceptions.filter.ts
│   │   ├── interceptors/                    # Logging, Transform, Timeout
│   │   │   ├── logging.interceptor.ts
│   │   │   ├── transform.interceptor.ts
│   │   │   └── timeout.interceptor.ts
│   │   ├── pipes/                           # ValidationPipe
│   │   │   └── validation.pipe.ts
│   │   ├── dto/                             # 共有DTO（ページネーションなど）
│   │   │   ├── pagination.dto.ts
│   │   │   └── pagination-response.dto.ts
│   │   ├── interfaces/                      # 共有インターフェース
│   │   │   ├── pagination.interface.ts
│   │   │   └── api-response.interface.ts
│   │   └── utils/                           # 純粋ユーティリティ関数
│   │       ├── slug.util.ts
│   │       └── date.util.ts
│   ├── modules/                             # 機能モジュール
│   │   ├── auth/                            # 認証
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── strategies/                  # JWT戦略
│   │   │   │   ├── jwt-access.strategy.ts
│   │   │   │   └── jwt-refresh.strategy.ts
│   │   │   ├── guards/                      # LocalAuthGuard
│   │   │   │   └── local-auth.guard.ts
│   │   │   ├── dto/                         # LoginDto, RegisterDto
│   │   │   │   ├── login.dto.ts
│   │   │   │   └── register.dto.ts
│   │   │   └── auth.service.spec.ts         # ユニットテスト
│   │   ├── users/                           # ユーザー管理
│   │   │   ├── users.module.ts
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   ├── dto/
│   │   │   │   ├── update-user.dto.ts
│   │   │   │   └── user-response.dto.ts
│   │   │   └── users.service.spec.ts
│   │   ├── merchants/                       # 出品者管理
│   │   │   ├── merchants.module.ts
│   │   │   ├── merchants.controller.ts
│   │   │   ├── merchants.service.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-shop.dto.ts
│   │   │   │   └── update-shop.dto.ts
│   │   │   └── merchants.service.spec.ts
│   │   ├── products/                        # 商品管理
│   │   │   ├── products.module.ts
│   │   │   ├── products.controller.ts
│   │   │   ├── products.service.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-product.dto.ts
│   │   │   │   ├── update-product.dto.ts
│   │   │   │   └── product-query.dto.ts
│   │   │   └── products.service.spec.ts
│   │   ├── categories/                      # カテゴリ管理
│   │   │   ├── categories.module.ts
│   │   │   ├── categories.controller.ts
│   │   │   ├── categories.service.ts
│   │   │   └── categories.service.spec.ts
│   │   ├── reviews/                         # レビュー管理
│   │   │   ├── reviews.module.ts
│   │   │   ├── reviews.controller.ts
│   │   │   ├── reviews.service.ts
│   │   │   ├── dto/
│   │   │   │   └── create-review.dto.ts
│   │   │   └── reviews.service.spec.ts
│   │   ├── wishlist/                        # ウィッシュリスト
│   │   │   ├── wishlist.module.ts
│   │   │   ├── wishlist.controller.ts
│   │   │   ├── wishlist.service.ts
│   │   │   └── wishlist.service.spec.ts
│   │   ├── cart/                            # ショッピングカート
│   │   │   ├── cart.module.ts
│   │   │   ├── cart.controller.ts
│   │   │   ├── cart.service.ts
│   │   │   ├── dto/
│   │   │   │   └── add-to-cart.dto.ts
│   │   │   └── cart.service.spec.ts
│   │   ├── orders/                          # 注文管理
│   │   │   ├── orders.module.ts
│   │   │   ├── orders.controller.ts
│   │   │   ├── orders.service.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-order.dto.ts
│   │   │   │   └── update-order-status.dto.ts
│   │   │   └── orders.service.spec.ts
│   │   ├── promotions/                      # プロモーション
│   │   │   ├── promotions.module.ts
│   │   │   ├── promotions.controller.ts
│   │   │   ├── promotions.service.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-promotion.dto.ts
│   │   │   │   └── validate-promotion.dto.ts
│   │   │   └── promotions.service.spec.ts
│   │   ├── advertisements/                  # 広告管理
│   │   │   ├── advertisements.module.ts
│   │   │   ├── advertisements.controller.ts
│   │   │   ├── advertisements.service.ts
│   │   │   └── advertisements.service.spec.ts
│   │   ├── recommendations/                 # AI推薦
│   │   │   ├── recommendations.module.ts
│   │   │   ├── recommendations.controller.ts
│   │   │   ├── recommendations.service.ts
│   │   │   ├── dto/
│   │   │   │   └── skin-analysis.dto.ts
│   │   │   └── recommendations.service.spec.ts
│   │   ├── analytics/                       # 分析
│   │   │   ├── analytics.module.ts
│   │   │   ├── analytics.controller.ts
│   │   │   ├── analytics.service.ts
│   │   │   └── analytics.service.spec.ts
│   │   └── admin/                           # 管理者パネル
│   │       ├── admin.module.ts
│   │       ├── admin.controller.ts
│   │       ├── admin.service.ts
│   │       └── admin.service.spec.ts
│   └── shared/                              # グローバル共有サービス
│       ├── shared.module.ts
│       ├── redis/                           # RedisModule, RedisService
│       │   ├── redis.module.ts
│       │   └── redis.service.ts
│       ├── prisma/                          # PrismaModule, PrismaService
│       │   ├── prisma.module.ts
│       │   └── prisma.service.ts
│       └── mail/                            # MailModule（将来用）
│           ├── mail.module.ts
│           └── mail.service.ts
├── prisma/
│   ├── schema.prisma                        # Prismaスキーマ（真の源）
│   ├── seed.ts                              # シードデータ
│   ├── migrations/                          # マイグレーションファイル
│   │   └── 20260804000000_init/
│   │       └── migration.sql
│   └── prisma.config.ts                     # Prisma設定
├── test/                                    # E2Eテスト
│   ├── app.e2e-spec.ts
│   └── jest-e2e.json
├── uploads/                                 # アップロードファイル（gitignore）
├── .env                                     # 環境変数（gitignore）
├── .env.example                             # 環境変数テンプレート
├── .eslintrc.js                             # ESLint設定
├── .prettierrc                              # Prettier設定
├── nest-cli.json                            # NestJS CLI設定
├── tsconfig.json                            # TypeScript設定
├── tsconfig.build.json                      # ビルド用TS設定
├── package.json
└── README.md
```

---

## 3. フロントエンド構造（React + Vite）

```
frontend/
├── src/
│   ├── app/                                 # アプリシェル＆ルーティング
│   │   ├── App.tsx                          # ルートコンポーネント
│   │   └── routes.tsx                       # ルート定義
│   ├── pages/                               # ルートレベルコンポーネント
│   │   ├── Home.tsx                         # トップページ
│   │   ├── Login.tsx                        # ログインページ
│   │   ├── Register.tsx                     # 登録ページ
│   │   ├── Profile.tsx                      # プロフィールページ
│   │   ├── Settings.tsx                     # 設定ページ
│   │   ├── NotFound.tsx                     # 404ページ
│   │   ├── Unauthorized.tsx                 # 401ページ
│   │   ├── products/
│   │   │   ├── ProductList.tsx              # 商品一覧
│   │   │   ├── ProductDetail.tsx            # 商品詳細
│   │   │   └── ProductSearch.tsx            # 商品検索
│   │   ├── cart/
│   │   │   └── Cart.tsx                     # ショッピングカート
│   │   ├── checkout/
│   │   │   └── Checkout.tsx                 # チェックアウト
│   │   ├── skin-analysis/
│   │   │   └── SkinAnalysis.tsx             # AI肌分析
│   │   ├── merchant/
│   │   │   ├── Dashboard.tsx                # 出品者ダッシュボード
│   │   │   ├── Products.tsx                 # 商品管理
│   │   │   ├── ProductForm.tsx              # 商品登録/編集
│   │   │   ├── Promotions.tsx               # プロモーション管理
│   │   │   └── Analytics.tsx                # 分析
│   │   └── admin/
│   │       ├── Dashboard.tsx                # 管理者ダッシュボード
│   │       ├── Users.tsx                    # ユーザー管理
│   │       ├── Merchants.tsx                # 出品者管理
│   │       ├── Reviews.tsx                  # レビュー管理
│   │       └── Analytics.tsx                # 分析
│   ├── components/
│   │   ├── ui/                              # shadcn/uiプリミティブ（手動編集不可）
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── table.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── select.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── form.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── skeleton.tsx
│   │   │   └── separator.tsx
│   │   ├── layout/                          # ヘッダー、フッター、サイドバー
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── MainLayout.tsx
│   │   │   ├── DashboardLayout.tsx
│   │   │   └── AuthLayout.tsx
│   │   ├── common/                          # ThemeToggle, LanguageToggle, ErrorBoundary
│   │   │   ├── ThemeToggle.tsx
│   │   │   ├── LanguageToggle.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   └── EmptyState.tsx
│   │   └── auth/                            # ProtectedRoute
│   │       └── ProtectedRoute.tsx
│   ├── features/                            # 機能別コンポーネント＆ロジック
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   ├── RegisterForm.tsx
│   │   │   │   └── AuthTabs.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useAuth.ts
│   │   │   ├── schemas/
│   │   │   │   └── auth.schema.ts
│   │   │   └── services/
│   │   │       └── auth.service.ts
│   │   ├── products/
│   │   │   ├── components/
│   │   │   │   ├── ProductCard.tsx
│   │   │   │   ├── ProductGrid.tsx
│   │   │   │   ├── ProductFilters.tsx
│   │   │   │   └── ProductReviews.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useProducts.ts
│   │   │   │   └── useProductDetail.ts
│   │   │   ├── schemas/
│   │   │   │   └── product.schema.ts
│   │   │   └── services/
│   │   │       └── product.service.ts
│   │   ├── cart/
│   │   │   ├── components/
│   │   │   │   ├── CartItem.tsx
│   │   │   │   ├── CartSummary.tsx
│   │   │   │   └── CartDrawer.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useCart.ts
│   │   │   └── services/
│   │   │       └── cart.service.ts
│   │   ├── skin-analysis/
│   │   │   ├── components/
│   │   │   │   ├── AnalysisUpload.tsx
│   │   │   │   ├── AnalysisResults.tsx
│   │   │   │   └── AnalysisHistory.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useSkinAnalysis.ts
│   │   │   └── services/
│   │   │       └── analysis.service.ts
│   │   ├── merchant/
│   │   │   ├── components/
│   │   │   │   ├── DashboardStats.tsx
│   │   │   │   ├── OrdersTable.tsx
│   │   │   │   └── ProductForm.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useMerchant.ts
│   │   │   └── services/
│   │   │       └── merchant.service.ts
│   │   └── admin/
│   │       ├── components/
│   │       │   ├── AdminStats.tsx
│   │       │   ├── UsersTable.tsx
│   │       │   └── MerchantsTable.tsx
│   │       ├── hooks/
│   │       │   └── useAdmin.ts
│   │       └── services/
│   │           └── admin.service.ts
│   ├── hooks/                               # 共有カスタムフック
│   │   ├── useDebounce.ts
│   │   ├── useLocalStorage.ts
│   │   └── useMediaQuery.ts
│   ├── providers/                           # コンテキストプロバイダー
│   │   ├── AuthProvider.tsx
│   │   ├── ThemeProvider.tsx
│   │   ├── QueryProvider.tsx
│   │   └── I18nProvider.tsx
│   ├── services/                            # APIサービストイヤー
│   │   ├── api-client.ts                    # axios/fetch設定
│   │   ├── queryKeys.ts                     # TanStack Queryキー
│   │   └── auth.service.ts
│   ├── schemas/                             # 共有Zodスキーマ
│   │   ├── pagination.schema.ts
│   │   └── common.schema.ts
│   ├── types/                               # 共有TypeScript型
│   │   ├── api.types.ts
│   │   ├── user.types.ts
│   │   ├── product.types.ts
│   │   └── index.ts
│   ├── lib/                                 # ユーティリティ、APIクライアント、定数
│   │   ├── utils.ts                         # cn()ユーティリティ
│   │   ├── constants.ts                     # アプリ定数
│   │   └── api.ts                           # APIクライアント
│   └── i18n/                                # i18next設定
│       ├── index.ts
│       └── locales/
│           ├── en/
│           │   ├── common.json
│           │   ├── auth.json
│           │   ├── products.json
│           │   └── cart.json
│           ├── ja/
│           │   ├── common.json
│           │   ├── auth.json
│           │   ├── products.json
│           │   └── cart.json
│           └── my/
│               ├── common.json
│               ├── auth.json
│               ├── products.json
│               └── cart.json
├── public/
│   ├── locales/                             # i18n翻訳ファイル
│   ├── favicon.ico
│   └── images/
│       ├── logo.svg
│       └── placeholder.png
├── .env                                     # 環境変数（gitignore）
├── .env.example                             # 環境変数テンプレート
├── .eslintrc.cjs                            # ESLint設定
├── .prettierrc                              # Prettier設定
├── index.html                               # HTMLエントリーポイント
├── vite.config.ts                           # Vite設定
├── tailwind.config.ts                       # Tailwind設定
├── postcss.config.js                        # PostCSS設定
├── tsconfig.json                            # TypeScript設定
├── components.json                          # shadcn/ui設定
├── package.json
└── README.md
```

---

## 4. ドキュメント構造

```
docs/
├── SPECIFICATION.md                         # 全体アーキテクチャ、技術スタック
├── FOLDER_STRUCTURE_SAMPLE.md               # 本文書
├── core-work/                               # コア開発ドキュメント（英語）
│   ├── 開発ルール_DEVELOPMENT_RULES.md
│   ├── 要件定義書_REQUIREMENT_SPEC.md
│   └── データベース設計書_DATABASE_SPEC.md
├── core-work-jp/                            # コア開発ドキュメント（日本語）
│   ├── 開発ルール_DEVELOPMENT_RULES.md
│   ├── 要件定義書_REQUIREMENT_SPEC.md
│   └── データベース設計書_DATABASE_SPEC.md
├── screen/                                  # 画面設計書
│   ├── SignUp_LogIn/
│   │   ├── 機能設計書_SignUp_Login.md       # 英語版
│   │   └── SignUp_LogIn_日本語.md           # 日本語版
│   ├── Home/
│   ├── ProductList/
│   ├── ProductDetail/
│   ├── Cart/
│   ├── Checkout/
│   ├── SkinAnalysis/
│   ├── Merchant/
│   └── Admin/
├── guides/                                  # ガイド
│   ├── ENVIRONMENT_SETUP.md
│   ├── DEPLOYMENT.md
│   └── CONTRIBUTING.md
└── api/                                     # API仕様
    └── openapi.yaml                         # OpenAPI仕様
```

---

## 5. GitHub設定構造

```
.github/
├── workflows/
│   ├── ci.yml                               # CIパイプライン
│   ├── cd-staging.yml                       # ステージングデプロイ
│   └── cd-production.yml                    # 本番デプロイ
├── ISSUE_TEMPLATE/
│   ├── bug_report.md
│   ├── feature_request.md
│   └── custom.md
├── PULL_REQUEST_TEMPLATE.md
├── CODEOWNERS
└── dependabot.yml
```

---

## 6. ファイル命名規則

### 6.1 バックエンド

| 場所 | 命名規則 | 例 |
|------|----------|-----|
| モジュールディレクトリ | `kebab-case` | `modules/auth/`, `modules/products/` |
| モジュールファイル | `kebab-case.ts` | `auth.module.ts`, `auth.controller.ts` |
| サービスファイル | `kebab-case.service.ts` | `auth.service.ts`, `product.service.ts` |
| コントローラーファイル | `kebab-case.controller.ts` | `auth.controller.ts` |
| DTOファイル | `kebab-case.dto.ts` | `login.dto.ts`, `create-product.dto.ts` |
| 戦略ファイル | `kebab-case.strategy.ts` | `jwt-access.strategy.ts` |
| ガードファイル | `kebab-case.guard.ts` | `jwt-auth.guard.ts`, `roles.guard.ts` |
| テストファイル | `*.spec.ts` | `auth.service.spec.ts` |

### 6.2 フロントエンド

| 場所 | 命名規則 | 例 |
|------|----------|-----|
| ページファイル | `PascalCase.tsx` | `Home.tsx`, `Login.tsx`, `ProductDetail.tsx` |
| コンポーネントファイル | `PascalCase.tsx` | `ProductCard.tsx`, `CartItem.tsx` |
| フックファイル | `usePascalCase.ts` | `useAuth.ts`, `useDebounce.ts` |
| 型ファイル | `kebab-case.types.ts` | `auth.types.ts`, `api.types.ts` |
| サービスファイル | `kebab-case.service.ts` | `auth.service.ts`, `product.service.ts` |
| スキーマファイル | `kebab-case.schema.ts` | `auth.schema.ts`, `product.schema.ts` |
| テストファイル | `*.test.tsx` or `*.test.ts` | `ProductCard.test.tsx` |

---

## 7. インポート順序

### 7.1 バックエンド（NestJS）

```typescript
// 1. Node.js組み込みモジュール
import { join } from 'path';

// 2. 外部パッケージ
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// 3. 内部モジュール（絶対パス @/ エイリアス）
import { AuthService } from '@/modules/auth/auth.service';
import { CreateUserDto } from '@/modules/auth/dto/create-user.dto';

// 4. 相対インポート
import { SomeHelper } from './helpers';
import { SomeType } from './types';
```

### 7.2 フロントエンド（React）

```typescript
// 1. React / React Router
import { useState } from 'react';
import { useNavigate } from 'react-router';

// 2. サードパーティライブラリ
import { useQuery } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';

// 3. 内部絶対インポート（@/ エイリアス）
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { productKeys } from '@/services/queryKeys';

// 4. 相対インポート
import { SomeHelper } from './helpers';
import { SomeType } from './types';
```

---

## 8. 注意事項

### 8.1 共有フォルダ制限

| 場所 | 使用可能 | 保存内容 |
|------|----------|----------|
| `backend/src/common/` | すべてのバックエンドモジュール | デコレーター、ガード、フィルター、パイプ、DTO、インターフェース、ユーティリティ |
| `backend/src/shared/` | すべてのバックエンドモジュール（`@Global()`経由） | Prisma、Redis、Mailサービス |
| `frontend/src/components/ui/` | すべてのフロントエンド機能 | shadcn/uiプリミティブ（生成後手動編集不可） |
| `frontend/src/lib/` | すべてのフロントエンドコード | `cn()`ユーティリティ、APIクライアント、定数 |
| `frontend/src/types/` | すべてのフロントエンドコード | 共有型定義 |

### 8.2 禁止事項

- 機能固有のロジックを共有フォルダに配置しない
- あるモジュールの内部ファイルから別のモジュールをインポートしない（モジュールエクスポートを使用）
- `components/ui/`にshadcn CLI以外で新しいファイルを作成しない
- `index.ts`バレルファイルをコンポーネントディレクトリに作成しない（明示的インポート必須）

### 8.3 コンポーネントルール

- ファイルごとに1コンポーネント
- 型は名前付きエクスポート、コンポーネントはデフォルトエクスポート
- コンポーネントファイル名はコンポーネント名と完全に一致
- Props型はコンポーネントと同じファイルまたは共存する`.types.ts`ファイルに定義

---

*フォルダ構造サンプル終了*