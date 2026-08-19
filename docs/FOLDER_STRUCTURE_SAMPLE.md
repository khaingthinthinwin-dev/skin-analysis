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

## 0. 技術スタック

| レイヤー | 技術 | 備考 |
|---------|------|------|
| フロントエンド | React + TypeScript + Vite | TanStack Query、React Hook Form、Zod |
| UI | shadcn/ui + Tailwind CSS v4 | Lucide Icons |
| バックエンド | Node.js + NestJS + TypeScript | モジュール設計 |
| データベース | PostgreSQL | Prisma ORM |
| キャッシュ | Redis | セッション、キャッシュ |
| 認証 | JWT | アクセストークン＋リフレッシュトークン |
| 多言語 | i18next | 英語、日本語、ビルマ語 |
| CI/CD | GitHub Actions | Lint、TypeCheck、テスト |

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
│   │   ├── auth/                            # [ATM] 認証
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── dto/
│   │   │   │   ├── login.dto.ts
│   │   │   │   └── register.dto.ts
│   │   │   ├── guards/
│   │   │   └── strategies/
│   │   │
│   │   ├── users/                           # [ATM] ユーザー管理
│   │   │   ├── users.module.ts
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   └── dto/
│   │   │
│   │   ├── buyer/
│   │   │   ├── skin-analysis/              # [ATM] AI肌分析
│   │   │   │   ├── skin-analysis.module.ts
│   │   │   │   ├── skin-analysis.controller.ts
│   │   │   │   └── skin-analysis.service.ts
│   │   │   │
│   │   │   ├── matching/                   # [ATM] マッチング＆レコメンド
│   │   │   │   ├── matching.module.ts
│   │   │   │   ├── matching.controller.ts
│   │   │   │   └── matching.service.ts
│   │   │   │
│   │   │   ├── wishlist/                   # [EEM] ウィッシュリスト
│   │   │   │   ├── wishlist.module.ts
│   │   │   │   ├── wishlist.controller.ts
│   │   │   │   └── wishlist.service.ts
│   │   │   │
│   │   │   ├── cart/                       # [EEM] ショッピングカート
│   │   │   │   ├── cart.module.ts
│   │   │   │   ├── cart.controller.ts
│   │   │   │   └── cart.service.ts
│   │   │   │
│   │   │   └── orders/                     # [EEM] 注文＆支払い
│   │   │       ├── orders.module.ts
│   │   │       ├── orders.controller.ts
│   │   │       ├── orders.service.ts
│   │   │       └── dto/
│   │   │
│   │   ├── catalog/
│   │   │   ├── products/                   # [TMO] 商品管理
│   │   │   │   ├── products.module.ts
│   │   │   │   ├── products.controller.ts
│   │   │   │   ├── products.service.ts
│   │   │   │   └── dto/
│   │   │   │
│   │   │   ├── categories/                 # [TRPH] カテゴリフィルタ
│   │   │   │   ├── categories.module.ts
│   │   │   │   ├── categories.controller.ts
│   │   │   │   └── categories.service.ts
│   │   │   │
│   │   │   └── search/                     # [TRPH] 検索・フィルタ
│   │   │       ├── search.module.ts
│   │   │       ├── search.controller.ts
│   │   │       ├── search.service.ts
│   │   │       └── dto/
│   │   │
│   │   ├── merchant/
│   │   │   ├── products/                   # [ZSLS] マーチャント商品
│   │   │   │   ├── merchant-products.module.ts
│   │   │   │   ├── merchant-products.controller.ts
│   │   │   │   └── merchant-products.service.ts
│   │   │   │
│   │   │   ├── promotions/                 # [ZSLS] プロモーション
│   │   │   │   ├── promotions.module.ts
│   │   │   │   ├── promotions.controller.ts
│   │   │   │   └── promotions.service.ts
│   │   │   │
│   │   │   └── advertisements/             # [WYT] 広告管理
│   │   │       ├── advertisements.module.ts
│   │   │       ├── advertisements.controller.ts
│   │   │       └── advertisements.service.ts
│   │   │
│   │   ├── admin/
│   │   │   ├── user-management/            # [PET] ユーザー管理
│   │   │   │   ├── user-management.module.ts
│   │   │   │   ├── user-management.controller.ts
│   │   │   │   └── user-management.service.ts
│   │   │   │
│   │   │   ├── merchant-management/        # [PET] マーチャント管理
│   │   │   │   ├── merchant-management.module.ts
│   │   │   │   ├── merchant-management.controller.ts
│   │   │   │   └── merchant-management.service.ts
│   │   │   │
│   │   │   ├── review-management/          # [PET] レビュー管理
│   │   │   │   ├── reviews.module.ts
│   │   │   │   ├── reviews.controller.ts
│   │   │   │   └── reviews.service.ts
│   │   │   │
│   │   │   ├── content-moderation/         # [PET] コンテンツ管理
│   │   │   │   ├── moderation.module.ts
│   │   │   │   ├── moderation.controller.ts
│   │   │   │   └── moderation.service.ts
│   │   │   │
│   │   │   ├── advertisement-management/   # [PET] 広告承認
│   │   │   │   ├── advertisement-approval.module.ts
│   │   │   │   ├── advertisement-approval.controller.ts
│   │   │   │   └── advertisement-approval.service.ts
│   │   │   │
│   │   │   ├── commission-revenue/         # [PPH] 手数料＆収益
│   │   │   │   ├── commission.module.ts
│   │   │   │   ├── commission.controller.ts
│   │   │   │   └── commission.service.ts
│   │   │   │
│   │   │   └── audit-logs/                 # [ATM] 監査ログ
│   │   │       ├── audit-logs.module.ts
│   │   │       ├── audit-logs.controller.ts
│   │   │       └── audit-logs.service.ts
│   │   │
│   │   └── shared/
│   │       │
│   │       ├── profile/                    # [ATM] プロフィール
│   │       │   ├── profile.module.ts
│   │       │   ├── profile.controller.ts
│   │       │   └── profile.service.ts
│   │       │
│   │       ├── notifications/              # [ATM] 通知
│   │       │   ├── notifications.module.ts
│   │       │   ├── notifications.controller.ts
│   │       │   └── notifications.service.ts
│   │       │
│   │       └── order-insights/             # [HAML] 注文インサイト
│   │           ├── order-insights.module.ts
│   │           ├── order-insights.controller.ts
│   │           ├── order-insights.service.ts
│   │           ├── dto/
│   │           │   └── order-history-query.dto.ts
│   │           └── README.md
│   │
│   ├── shared/                              # グローバル共有サービス
│   │   ├── shared.module.ts
│   │   ├── prisma/                          # PrismaModule, PrismaService
│   │   │   ├── prisma.module.ts
│   │   │   └── prisma.service.ts
│   │   ├── redis/                           # RedisModule, RedisService
│   │   │   ├── redis.module.ts
│   │   │   └── redis.service.ts
│   │   └── mail/                            # MailModule（将来用）
│   │       ├── mail.module.ts
│   │       └── mail.service.ts
│   │
│   └── database/                            # 共有データベース
│       ├── prisma/
│       │   ├── schema.prisma
│       │   ├── migrations/
│       │   └── seed.ts
│       └── seeds/
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
│   │   │
│   │   ├── About.tsx                       # Aboutページ
│   │   ├── NotFound.tsx                    # 404ページ
│   │   ├── Settings.tsx                    # ユーザー設定ページ
│   │   ├── Unauthorized.tsx                # 認証エラーページ
│   │   │
│   │   ├── auth/                           # [ATM] 認証ページ
│   │   │   ├── Login.tsx                   # ログインページ
│   │   │   └── Register.tsx                # 登録ページ
│   │   │
│   │   ├── buyer/
│   │   │   ├── Dashboard.tsx               # [TRPH] 検索＆フィルタトップ
│   │   │   ├── SearchFilter.tsx            # [TRPH] 商品検索・フィルタ
│   │   │   ├── ProductDetail.tsx           # [TMO] 商品詳細
│   │   │   ├── Wishlist.tsx                # [EEM] ウィッシュリスト
│   │   │   ├── Cart.tsx                    # [EEM] ショッピングカート
│   │   │   ├── Checkout.tsx                # [EEM] チェックアウト＆支払い
│   │   │   ├── SkinAnalysis.tsx            # [ATM] AI肌分析
│   │   │   ├── MatchingRecommendations.tsx # [ATM] おすすめ商品
│   │   │   └── RecommendationHistory.tsx   # [ATM] おすすめ履歴
│   │   │
│   │   ├── merchant/
│   │   │   ├── Dashboard.tsx               # [ZSLS] 商品管理トップ
│   │   │   ├── ProductManagement.tsx       # [ZSLS] 商品CRUD
│   │   │   ├── Advertisements.tsx          # [WYT] 広告管理
│   │   │   └── Promotions.tsx              # [ZSLS] プロモーション管理
│   │   │
│   │   ├── admin/
│   │   │   ├── Dashboard.tsx               # [PET] 管理者ダッシュボード
│   │   │   ├── ReviewManagement.tsx        # [PET] レビュー管理
│   │   │   ├── ContentModeration.tsx       # [PET] コンテンツ管理
│   │   │   ├── UserManagement.tsx          # [PET] ユーザー管理
│   │   │   ├── MerchantManagement.tsx      # [PET] マーチャント管理
│   │   │   ├── AdvertisementManagement.tsx # [PET] 広告承認
│   │   │   ├── CommissionRevenue.tsx       # [PPH] 手数料＆収益
│   │   │   └── AuditLog.tsx                # [ATM] 監査ログ
│   │   │
│   │   └── shared/
│   │       ├── Profile.tsx                 # [ATM] プロフィール設定
│   │       ├── Notifications.tsx           # [ATM] 通知センター
│   │       └── OrderInsights.tsx           # [HAML] 注文インサイト
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
│   │   │   └── Sidebar.tsx
│   │   ├── navigation/
│   │   │   ├── BuyerNavbar.tsx              # 共有
│   │   │   ├── MerchantNavbar.tsx           # 共有
│   │   │   ├── AdminNavbar.tsx              # 共有
│   │   │   └── RoleBasedMenu.tsx            # 共有
│   │   ├── common/                          # ThemeToggle, LanguageToggle, ErrorBoundary
│   │   │   ├── ThemeToggle.tsx
│   │   │   ├── LanguageToggle.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   └── EmptyState.tsx
│   │   └── auth/                            # [ATM] 認証コンポーネント
│   │       └── ProtectedRoute.tsx
│   ├── features/                            # 機能別コンポーネント＆ロジック
│   │   ├── auth/                            # [ATM] 認証
│   │   │   ├── components/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   ├── RegisterForm.tsx
│   │   │   │   └── AuthTabs.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useAuth.ts
│   │   │   ├── services/
│   │   │   │   └── auth.service.ts
│   │   │   └── schemas/
│   │   │       └── auth.schema.ts
│   │   │
│   │   ├── buyer/
│   │   │   ├── skin-analysis/              # [ATM] AI肌分析
│   │   │   │   ├── components/
│   │   │   │   │   ├── AnalysisUpload.tsx
│   │   │   │   │   ├── AnalysisResults.tsx
│   │   │   │   │   └── AnalysisHistory.tsx
│   │   │   │   ├── hooks/
│   │   │   │   │   └── useSkinAnalysis.ts
│   │   │   │   └── services/
│   │   │   │       └── analysis.service.ts
│   │   │   │
│   │   │   ├── matching/                   # [ATM] マッチング＆レコメンド
│   │   │   │   ├── components/
│   │   │   │   │   ├── RecommendationCard.tsx
│   │   │   │   │   ├── MatchResultList.tsx
│   │   │   │   │   └── SkinTypeFilter.tsx
│   │   │   │   ├── hooks/
│   │   │   │   │   └── useMatching.ts
│   │   │   │   └── services/
│   │   │   │       └── matching.service.ts
│   │   │   │
│   │   │   ├── products/                   # [TMO] 商品
│   │   │   │   ├── components/
│   │   │   │   │   ├── ProductCard.tsx
│   │   │   │   │   ├── ProductGrid.tsx
│   │   │   │   │   ├── ProductDetail.tsx
│   │   │   │   │   └── ProductReviews.tsx
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── useProducts.ts
│   │   │   │   │   └── useProductDetail.ts
│   │   │   │   └── services/
│   │   │   │       └── product.service.ts
│   │   │   │
│   │   │   ├── wishlist/                   # [EEM] ウィッシュリスト
│   │   │   │   ├── components/
│   │   │   │   │   ├── WishlistItem.tsx
│   │   │   │   │   └── WishlistGrid.tsx
│   │   │   │   ├── hooks/
│   │   │   │   │   └── useWishlist.ts
│   │   │   │   └── services/
│   │   │   │       └── wishlist.service.ts
│   │   │   │
│   │   │   ├── cart/                       # [EEM] カート
│   │   │   │   ├── components/
│   │   │   │   │   ├── CartItem.tsx
│   │   │   │   │   ├── CartSummary.tsx
│   │   │   │   │   └── CartDrawer.tsx
│   │   │   │   ├── hooks/
│   │   │   │   │   └── useCart.ts
│   │   │   │   └── services/
│   │   │   │       └── cart.service.ts
│   │   │   │
│   │   │   └── checkout/                   # [EEM] チェックアウト
│   │   │       ├── components/
│   │   │       │   ├── CheckoutForm.tsx
│   │   │       │   ├── PaymentMethod.tsx
│   │   │       │   └── OrderSummary.tsx
│   │   │       ├── hooks/
│   │   │       │   └── useCheckout.ts
│   │   │       └── services/
│   │   │           └── checkout.service.ts
│   │   │
│   │   ├── merchant/
│   │   │   ├── products/                   # [ZSLS] マーチャント商品
│   │   │   │   ├── components/
│   │   │   │   │   ├── ProductForm.tsx
│   │   │   │   │   ├── OrdersTable.tsx
│   │   │   │   │   └── DashboardStats.tsx
│   │   │   │   ├── hooks/
│   │   │   │   │   └── useMerchantProducts.ts
│   │   │   │   └── services/
│   │   │   │       └── merchantProduct.service.ts
│   │   │   │
│   │   │   ├── promotions/                 # [ZSLS] プロモーション
│   │   │   │   ├── components/
│   │   │   │   │   └── PromotionForm.tsx
│   │   │   │   ├── hooks/
│   │   │   │   │   └── usePromotions.ts
│   │   │   │   └── services/
│   │   │   │       └── promotion.service.ts
│   │   │   │
│   │   │   └── advertisements/             # [WYT] 広告
│   │   │       ├── components/
│   │   │       │   └── AdvertisementForm.tsx
│   │   │       ├── hooks/
│   │   │       │   └── useAdvertisements.ts
│   │   │       └── services/
│   │   │           └── advertisement.service.ts
│   │   │
│   │   ├── admin/
│   │   │   ├── user-management/            # [PET] ユーザー管理
│   │   │   │   ├── components/
│   │   │   │   ├── hooks/
│   │   │   │   └── services/
│   │   │   │
│   │   │   ├── merchant-management/        # [PET] マーチャント管理
│   │   │   │   ├── components/
│   │   │   │   ├── hooks/
│   │   │   │   └── services/
│   │   │   │
│   │   │   ├── content-moderation/         # [PET] コンテンツ管理
│   │   │   │   ├── components/
│   │   │   │   ├── hooks/
│   │   │   │   └── services/
│   │   │   │
│   │   │   ├── review-management/          # [PET] レビュー管理
│   │   │   │   ├── components/
│   │   │   │   ├── hooks/
│   │   │   │   └── services/
│   │   │   │
│   │   │   ├── advertisement-management/   # [PET] 広告承認
│   │   │   │   ├── components/
│   │   │   │   ├── hooks/
│   │   │   │   └── services/
│   │   │   │
│   │   │   ├── commission-revenue/         # [PPH] 手数料＆収益
│   │   │   │   ├── components/
│   │   │   │   ├── hooks/
│   │   │   │   └── services/
│   │   │   │
│   │   │   └── audit-log/                  # [ATM] 監査ログ
│   │   │       ├── components/
│   │   │       ├── hooks/
│   │   │       └── services/
│   │   │
│   │   └── shared/
│   │       ├── profile/                    # [ATM] プロフィール
│   │       │   ├── components/
│   │       │   ├── hooks/
│   │       │   └── services/
│   │       │
│   │       ├── notifications/              # [ATM] 通知
│   │       │   ├── components/
│   │       │   ├── hooks/
│   │       │   └── services/
│   │       │
│   │       └── order-insights/             # [HAML] 注文インサイト
│   │           ├── components/
│   │           │   ├── OrderHistoryTable.tsx
│   │           │   ├── OrderDetailModal.tsx
│   │           │   └── OrderStatusChart.tsx
│   │           ├── hooks/
│   │           │   └── useOrderInsights.ts
│   │           └── services/
│   │               └── orderInsights.service.ts
│   ├── layouts/                              # レイアウトコンポーネント
│   │   ├── MainLayout.tsx                    # 共有
│   │   ├── DashboardLayout.tsx               # 共有
│   │   ├── BuyerLayout.tsx                  # 共有
│   │   ├── MerchantLayout.tsx               # 共有
│   │   ├── AdminLayout.tsx                  # 共有
│   │   └── AuthLayout.tsx                   # [ATM]
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

### 8.2 開発者所有者ルール

- 各機能モジュールには開発者所有者を記載した`README.md`が必須
- 開発者は各自のモジュールに責任を持つ
- モジュール間連携はNestJSモジュールエクスポートを使用
- 共有フォルダ（common/, shared/, components/ui/）は共同開発

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