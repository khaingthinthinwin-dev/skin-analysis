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
│   │   │   ├── strategies/                  # JWT戦略
│   │   │   │   ├── jwt-access.strategy.ts
│   │   │   │   └── jwt-refresh.strategy.ts
│   │   │   ├── guards/                      # LocalAuthGuard
│   │   │   │   └── local-auth.guard.ts
│   │   │   ├── dto/                         # LoginDto, RegisterDto
│   │   │   │   ├── login.dto.ts
│   │   │   │   └── register.dto.ts
│   │   │   ├── auth.service.spec.ts         # ユニットテスト
│   │   │   └── README.md                    # [ATM] 所有者
│   │   ├── users/                           # [ATM] ユーザー管理
│   │   │   ├── users.module.ts
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   ├── dto/
│   │   │   │   ├── update-user.dto.ts
│   │   │   │   └── user-response.dto.ts
│   │   │   ├── users.service.spec.ts
│   │   │   └── README.md                    # [ATM] 所有者
│   │   ├── skin-analysis/                   # [ATM] AI肌分析
│   │   │   ├── skin-analysis.module.ts
│   │   │   ├── skin-analysis.controller.ts
│   │   │   ├── skin-analysis.service.ts
│   │   │   ├── dto/
│   │   │   │   └── skin-analysis.dto.ts
│   │   │   ├── skin-analysis.service.spec.ts
│   │   │   └── README.md                    # [ATM] 所有者
│   │   ├── matching/                        # [HAML] マッチング＆レコメンド
│   │   │   ├── matching.module.ts
│   │   │   ├── matching.controller.ts
│   │   │   ├── matching.service.ts
│   │   │   ├── dto/
│   │   │   │   └── match-query.dto.ts
│   │   │   ├── matching.service.spec.ts
│   │   │   └── README.md                    # [HAML] 所有者
│   │   ├── products/                        # [TMO] 商品管理
│   │   │   ├── products.module.ts
│   │   │   ├── products.controller.ts
│   │   │   ├── products.service.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-product.dto.ts
│   │   │   │   ├── update-product.dto.ts
│   │   │   │   └── product-query.dto.ts
│   │   │   ├── products.service.spec.ts
│   │   │   └── README.md                    # [TMO] 所有者
│   │   ├── search/                          # [TRPH] 検索・フィルタ
│   │   │   ├── search.module.ts
│   │   │   ├── search.controller.ts
│   │   │   ├── search.service.ts
│   │   │   ├── dto/
│   │   │   │   └── search-query.dto.ts
│   │   │   ├── search.service.spec.ts
│   │   │   └── README.md                    # [TRPH] 所有者
│   │   ├── categories/                      # [TRPH] カテゴリフィルタ
│   │   │   ├── categories.module.ts
│   │   │   ├── categories.controller.ts
│   │   │   ├── categories.service.ts
│   │   │   ├── categories.service.spec.ts
│   │   │   └── README.md                    # [TRPH] 所有者
│   │   ├── wishlist/                        # [EEM] ウィッシュリスト
│   │   │   ├── wishlist.module.ts
│   │   │   ├── wishlist.controller.ts
│   │   │   ├── wishlist.service.ts
│   │   │   ├── wishlist.service.spec.ts
│   │   │   └── README.md                    # [EEM] 所有者
│   │   ├── cart/                            # [EEM] ショッピングカート
│   │   │   ├── cart.module.ts
│   │   │   ├── cart.controller.ts
│   │   │   ├── cart.service.ts
│   │   │   ├── dto/
│   │   │   │   └── add-to-cart.dto.ts
│   │   │   ├── cart.service.spec.ts
│   │   │   └── README.md                    # [EEM] 所有者
│   │   ├── orders/                          # [EEM] 注文＆支払い
│   │   │   ├── orders.module.ts
│   │   │   ├── orders.controller.ts
│   │   │   ├── orders.service.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-order.dto.ts
│   │   │   │   └── update-order-status.dto.ts
│   │   │   ├── orders.service.spec.ts
│   │   │   └── README.md                    # [EEM] 所有者
│   │   ├── promotions/                      # [ZSLS] プロモーション
│   │   │   ├── promotions.module.ts
│   │   │   ├── promotions.controller.ts
│   │   │   ├── promotions.service.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-promotion.dto.ts
│   │   │   │   └── validate-promotion.dto.ts
│   │   │   ├── promotions.service.spec.ts
│   │   │   └── README.md                    # [ZSLS] 所有者
│   │   ├── advertisements/                  # [WYT] 広告管理
│   │   │   ├── advertisements.module.ts
│   │   │   ├── advertisements.controller.ts
│   │   │   ├── advertisements.service.ts
│   │   │   ├── advertisements.service.spec.ts
│   │   │   └── README.md                    # [WYT] 所有者
│   │   ├── reviews/                         # [PET] レビュー管理
│   │   │   ├── reviews.module.ts
│   │   │   ├── reviews.controller.ts
│   │   │   ├── reviews.service.ts
│   │   │   ├── dto/
│   │   │   │   └── create-review.dto.ts
│   │   │   ├── reviews.service.spec.ts
│   │   │   └── README.md                    # [PET] 所有者
│   │   ├── analytics/                       # [PET/WYT] 分析ダッシュボード
│   │   │   ├── analytics.module.ts
│   │   │   ├── analytics.controller.ts
│   │   │   ├── analytics.service.ts
│   │   │   ├── analytics.service.spec.ts
│   │   │   └── README.md                    # [PET/WYT] 所有者
│   │   ├── admin/                           # [PET/PPH] 管理者パネル
│   │   │   ├── admin.module.ts
│   │   │   ├── admin.controller.ts
│   │   │   ├── admin.service.ts
│   │   │   ├── admin.service.spec.ts
│   │   │   └── README.md                    # [PET/PPH] 所有者
│   │   └── commission/                      # [PPH] 手数料＆収益
│   │       ├── commission.module.ts
│   │       ├── commission.controller.ts
│   │       ├── commission.service.ts
│   │       ├── commission.service.spec.ts
│   │       └── README.md                    # [PPH] 所有者
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
│   │   ├── Login.tsx                        # [ATM] ログインページ
│   │   ├── Register.tsx                     # [ATM] 登録ページ
│   │   ├── Profile.tsx                      # [ATM] プロフィールページ
│   │   ├── Settings.tsx                     # 設定ページ
│   │   ├── NotFound.tsx                     # 404ページ
│   │   ├── Unauthorized.tsx                 # 401ページ
│   │   ├── products/
│   │   │   ├── ProductList.tsx              # 商品一覧
│   │   │   ├── ProductDetail.tsx            # [TMO] 商品詳細
│   │   │   └── ProductSearch.tsx            # [TRPH] 商品検索
│   │   ├── cart/
│   │   │   └── Cart.tsx                     # [EEM] ショッピングカート
│   │   ├── checkout/
│   │   │   └── Checkout.tsx                 # [EEM] チェックアウト
│   │   ├── wishlist/
│   │   │   └── Wishlist.tsx                 # [EEM] ウィッシュリスト
│   │   ├── skin-analysis/
│   │   │   └── SkinAnalysis.tsx             # [ATM] AI肌分析
│   │   ├── matching/
│   │   │   └── Recommendations.tsx          # [HAML] おすすめ
│   │   ├── merchant/
│   │   │   ├── Dashboard.tsx                # [WYT] 出品者ダッシュボード
│   │   │   ├── Products.tsx                 # [ZSLS] 商品管理
│   │   │   ├── ProductForm.tsx              # [ZSLS] 商品登録/編集
│   │   │   ├── Promotions.tsx               # [ZSLS] プロモーション管理
│   │   │   ├── Advertisements.tsx           # [WYT] 広告管理
│   │   │   └── SalesAnalytics.tsx           # [WYT] 売上分析
│   │   └── admin/
│   │       ├── Dashboard.tsx                # [PET] 管理者ダッシュボード
│   │       ├── Users.tsx                    # [PET] ユーザー管理
│   │       ├── Reviews.tsx                  # [PET] レビュー管理
│   │       ├── ContentModeration.tsx        # [PET] コンテンツ管理
│   │       ├── Reports.tsx                  # [PET] レポート
│   │       ├── Commission.tsx               # [PPH] 手数料管理
│   │       └── Revenue.tsx                  # [PPH] 収益管理
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
│   │   ├── auth/                            # [ATM] 認証
│   │   │   ├── components/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   ├── RegisterForm.tsx
│   │   │   │   └── AuthTabs.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useAuth.ts
│   │   │   ├── schemas/
│   │   │   │   └── auth.schema.ts
│   │   │   ├── services/
│   │   │   │   └── auth.service.ts
│   │   │   └── README.md                    # [ATM] 所有者
│   │   ├── skin-analysis/                   # [ATM] 肌分析
│   │   │   ├── components/
│   │   │   │   ├── AnalysisUpload.tsx
│   │   │   │   ├── AnalysisResults.tsx
│   │   │   │   └── AnalysisHistory.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useSkinAnalysis.ts
│   │   │   ├── services/
│   │   │   │   └── analysis.service.ts
│   │   │   └── README.md                    # [ATM] 所有者
│   │   ├── matching/                        # [HAML] マッチング＆レコメンド
│   │   │   ├── components/
│   │   │   │   ├── RecommendationCard.tsx
│   │   │   │   ├── MatchResultList.tsx
│   │   │   │   └── SkinTypeFilter.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useMatching.ts
│   │   │   ├── services/
│   │   │   │   └── matching.service.ts
│   │   │   └── README.md                    # [HAML] 所有者
│   │   ├── products/                        # [TMO] 商品
│   │   │   ├── components/
│   │   │   │   ├── ProductCard.tsx
│   │   │   │   ├── ProductGrid.tsx
│   │   │   │   ├── ProductDetail.tsx
│   │   │   │   └── ProductReviews.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useProducts.ts
│   │   │   │   └── useProductDetail.ts
│   │   │   ├── services/
│   │   │   │   └── product.service.ts
│   │   │   └── README.md                    # [TMO] 所有者
│   │   ├── search/                          # [TRPH] 検索＆フィルタ
│   │   │   ├── components/
│   │   │   │   ├── SearchBar.tsx
│   │   │   │   ├── FilterPanel.tsx
│   │   │   │   └── SearchResults.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useSearch.ts
│   │   │   ├── services/
│   │   │   │   └── search.service.ts
│   │   │   └── README.md                    # [TRPH] 所有者
│   │   ├── wishlist/                        # [EEM] ウィッシュリスト
│   │   │   ├── components/
│   │   │   │   ├── WishlistItem.tsx
│   │   │   │   └── WishlistGrid.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useWishlist.ts
│   │   │   ├── services/
│   │   │   │   └── wishlist.service.ts
│   │   │   └── README.md                    # [EEM] 所有者
│   │   ├── cart/                            # [EEM] カート
│   │   │   ├── components/
│   │   │   │   ├── CartItem.tsx
│   │   │   │   ├── CartSummary.tsx
│   │   │   │   └── CartDrawer.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useCart.ts
│   │   │   ├── services/
│   │   │   │   └── cart.service.ts
│   │   │   └── README.md                    # [EEM] 所有者
│   │   ├── checkout/                        # [EEM] チェックアウト
│   │   │   ├── components/
│   │   │   │   ├── CheckoutForm.tsx
│   │   │   │   ├── PaymentMethod.tsx
│   │   │   │   └── OrderSummary.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useCheckout.ts
│   │   │   ├── services/
│   │   │   │   └── checkout.service.ts
│   │   │   └── README.md                    # [EEM] 所有者
│   │   ├── merchant/                        # [ZSLS/WYT] マーチャント
│   │   │   ├── components/
│   │   │   │   ├── DashboardStats.tsx       # [WYT]
│   │   │   │   ├── OrdersTable.tsx
│   │   │   │   ├── ProductForm.tsx          # [ZSLS]
│   │   │   │   ├── PromotionForm.tsx        # [ZSLS]
│   │   │   │   ├── AdvertisementForm.tsx    # [WYT]
│   │   │   │   └── SalesChart.tsx           # [WYT]
│   │   │   ├── hooks/
│   │   │   │   ├── useMerchant.ts
│   │   │   │   ├── useProducts.ts           # [ZSLS]
│   │   │   │   ├── usePromotions.ts         # [ZSLS]
│   │   │   │   ├── useAdvertisements.ts     # [WYT]
│   │   │   │   └── useSalesAnalytics.ts     # [WYT]
│   │   │   ├── services/
│   │   │   │   ├── merchant.service.ts
│   │   │   │   ├── product.service.ts       # [ZSLS]
│   │   │   │   ├── promotion.service.ts     # [ZSLS]
│   │   │   │   ├── advertisement.service.ts # [WYT]
│   │   │   │   └── sales.service.ts         # [WYT]
│   │   │   └── README.md                    # [ZSLS/WYT] 所有者
│   │   └── admin/                           # [PET/PPH] 管理者
│   │       ├── components/
│   │       │   ├── AdminStats.tsx
│   │       │   ├── UsersTable.tsx           # [PET]
│   │       │   ├── ReviewsTable.tsx         # [PET]
│   │       │   ├── ContentModeration.tsx    # [PET]
│   │       │   ├── ReportChart.tsx          # [PET]
│   │       │   ├── CommissionTable.tsx      # [PPH]
│   │       │   └── RevenueChart.tsx         # [PPH]
│   │       ├── hooks/
│   │       │   ├── useAdmin.ts
│   │       │   ├── useModeration.ts         # [PET]
│   │       │   ├── useReports.ts            # [PET]
│   │       │   └── useCommission.ts         # [PPH]
│   │       ├── services/
│   │       │   ├── admin.service.ts
│   │       │   ├── moderation.service.ts    # [PET]
│   │       │   ├── report.service.ts        # [PET]
│   │       │   └── commission.service.ts    # [PPH]
│   │       └── README.md                    # [PET/PPH] 所有者
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