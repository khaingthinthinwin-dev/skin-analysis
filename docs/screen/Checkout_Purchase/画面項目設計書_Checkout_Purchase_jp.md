# 画面項目設計書 — 購入・チェックアウト

**文書ID:** SKM-SIS-SCR-CHECKOUT-001  
**対象画面:** 購入・チェックアウト (Purchase & Checkout)  
**サブシステム:** バイヤーモジュール — チェックアウト & 注文確定  
**機能ID:** FN-CHECK-001, FN-ORDER-001  
**バージョン:** 1.1  
**作成日:** 2026-08-25  
**最終更新日:** 2026-08-26  
**作成者:** シニアシステムエンジニア  
**レビュー状況:** 承認済み (Released)  
**分類:** 社内 — エンジニアリング部門

---

## 1. ドキュメント管理

### 1.1 文書改訂履歴

| バージョン | 日付 | 作成者 | 変更内容 |
| :--- | :--- | :--- | :--- |
| 1.0 | 2026-08-25 | シニアシステムエンジニア | 初版リリース。チェックアウトおよび注文確認画面の画面項目定義書。注文履歴、注文詳細、注文追跡画面は注文ステータス画面チームが担当。要件定義書 v2.11、データベース設計書 v2.5、開発ルール v2.1、機能設計書 v1.2に準拠。 |
| 1.1 | 2026-08-26 | シニアシステムエンジニア | スポンサー広告スライドダウンパネル（`slotAdCheckout`、[D0]〜[D0d]）を実装。スライドダウンアニメーション、水平カルーセル（5秒自動スライド、最大5件）、レスポンシブなデスクトップ（横型）/ モバイル（縦積み）レイアウトを定義。スライドサブ項目定義（セクション4.2 項目3〜10）を追加、レイアウト図（セクション3.1）、ブレークポイント（セクション3.2）、動作（セクション5.2）、i18nキー（セクション8）、テストチェックリスト（セクション12.1）を更新。スライドダウンアニメーション、5秒自動スライド、最大5件、API、承認、スケジュール、ティア優先度ルールをSearch & Filter仕様と統一。 |

### 1.2 関連文書

| No. | 文書ID | 文書名 | ファイルパス | 備考 |
| :-- | :--- | :--- | :--- | :--- |
| 1 | SKM-REQ-001 | 要件定義書 | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | ビジネスワークフローロジック、必須項目、ルール。 |
| 2 | SKM-DBS-001 | データベース設計書 | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | テーブル構造（`orders`, `order_items`, `promotions`）、制約。 |
| 3 | SKM-DEV-001 | 開発ルール | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` | セキュリティルール、デザイントークン、エラーレスポンス。 |
| 4 | SKM-FDS-CHECKOUT-001 | 機能設計書 — チェックアウト | `docs/screen/Checkout_Purchase/機能設計書_Checkout_Purchase.md` | ユースケース、状態遷移、バリデーションルール、エラーハンドリング。 |

---

## 2. 画面概要・目的

### 2.1 目的
チェックアウトおよび注文確認画面は、Cosmetics Finderプラットフォーム上の認証済みバイヤーに対して購入ワークフローを提供します。これらの画面は、在庫状況の検証、クーポン割引の適用、合計金額の計算、および出品者の注文履行のための注文レコードの永続化を行いながら、カート内容を確認済み注文へと変換します。

### 2.2 対象ユーザーと権限

| 属性 | 値 |
| :--- | :--- |
| **主要アクター** | 認証済みバイヤー (Authenticated Buyer) |
| **必要な認証** | JWTベアラートークン |
| **データ範囲** | 自身の注文、自身の配送先住所、自身の決済記録 |
| **ゲストユーザーの動作** | チェックアウト不可。ゲストユーザーが`/checkout`にアクセスを試みた場合、アラートモーダルを表示：「購入を完了するにはログインしてください。」[ログイン]をクリックするとログインページ（`/login`）に遷移する。 |

### 2.3 主要機能・基本設計方針
1. **チェックアウトフロー** — 配送先住所入力、決済方法選択、クーポン適用、注文サマリー確認を経て、最終確定までユーザーを案内する。
2. **クーポン検証** — チェックアウト時に割引コード（パーセンテージまたは固定額）を検証・適用し、有効期限、最低注文額、1回限りの制約を適用する。
3. **注文計算** — カート商品と適用クーポンに基づき、小計、割引額、最終合計を計算する。
4. **注文登録** — ステータス`placed`で注文記録を作成し、在庫を原子的に減算し、カートをクリアし、注文確認を返す。

---

## 3. 画面レイアウト構成

### 3.1 全体画面構成

#### チェックアウト画面レイアウト (`/checkout`)
```text
┌──────────────────────────────────────────────────────────────────────┐
│                           ブラウザビューポート                         │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  [A] ページヘッダー                                            │  │
│  │  [A1] ページタイトル "チェックアウト"                           │  │
│  │  [A2] カートに戻るリンク                                       │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │           [D0] スポンサー広告スライドダウンパネル (条件付き)     │  │
│  │                (広告読み込み時にスライドダウン表示・中央揃え)     │  │
│  │          ┌─────────────┬──────────────────────────┐           │  │
│  │          │ [D0a]       │ [D0b] 広告タイトル        │           │  │
│  │          │ 画像 /      │ [D0c] 説明文             │           │  │
│  │          │ バナー      │ [D0d] CTAボタン          │           │  │
│  │          └─────────────┴──────────────────────────┘           │  │
│  │      (コンテナ全幅、[A]と[B+C]の間で水平中央揃え、               │  │
│  │       水平スライド、5秒自動スライド、最大5件)                     │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────┐  ┌───────────────────────────────────┐    │
│  │ [B] 注文サマリー     │  │ [C] 配送先住所                    │    │
│  │   [B1] 商品リスト    │  │   [C1] 受取人氏名                 │    │
│  │   [B2] 小計          │  │   [C2] 電話番号                   │    │
│  │   [B3] クーポン入力  │  │   [C3] 住所1                      │    │
│  │   [B4] 適用ボタン    │  │   [C4] 住所2                      │    │
│  │   [B5] 割引額        │  │   [C5] 市区町村                   │    │
│  │   [B6] クーポン削除  │  │   [C6] 都道府県                   │    │
│  │   [B7] 合計金額      │  │   [C7] 郵便番号                   │    │
│  └──────────────────────┘  │   [C8] 国                         │    │
│                            └───────────────────────────────────┘    │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  [D] 決済方法                                                 │  │
│  │  [D1] 決済方法ラジオグループ                                   │  │
│  │  [D2] 代金引換                                                │  │
│  │  [D3] 銀行振込                                                │  │
│  │  [D4] カード決済                                              │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  [E] 注文備考                                                 │  │
│  │  [E1] 備考テキストエリア                                       │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  [F] 注文確定                                                 │  │
│  │  [F1] 注文を確定するボタン                                     │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  [G] ゲストログインアラートモーダル (条件付き)                 │  │
│  │  [G1] アラートメッセージ                                      │  │
│  │  [G2] ログインボタン                                           │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  [H] ローディングオーバーレイ (条件付き)                       │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### 注文確認画面レイアウト (`/checkout/confirmation/:orderId`)
```text
┌─────────────────────────────────────────────────────────┐
│                    ブラウザビューポート                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│              ┌─────────────────────────────┐            │
│              │  [I] 成功セクション          │            │
│              │   [I1] 成功アイコン         │            │
│              │   [I2] 成功タイトル         │            │
│              │   [I3] 注文ID               │            │
│              │   [I4] 注文ステータスバッジ │            │
│              │   [I5] 配達予定日           │            │
│              └─────────────────────────────┘            │
│                                                         │
│              ┌─────────────────────────────┐            │
│              │  [J] 注文サマリーカード     │            │
│              │   [J1] 注文商品リスト       │            │
│              │   [J2] 小計                 │            │
│              │   [J3] 割引額               │            │
│              │   [J4] 合計金額             │            │
│              │   [J5] 配送先住所           │            │
│              └─────────────────────────────┘            │
│                                                         │
│              ┌─────────────────────────────┐            │
│              │  [K] アクションボタン       │            │
│              │   [K1] 買い物を続ける       │            │
│              │   [K2] 注文を表示           │            │
│              │   [K3] 領収書を印刷         │            │
│              └─────────────────────────────┘            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 3.2 レスポンシブ対応 (ブレークポイント)

| ブレークポイント | 最小幅 | チェックアウトレイアウト |
| :--- | :--- | :--- |
| モバイル (default) | 0px | 1カラム構成: ヘッダー → 広告（縦積み: 上部に全幅画像、タイトル、説明文、下部に全幅CTA） → サマリー + 住所（縦積み） → 決済方法 → 備考 → 注文確定。広告パネルは[A]と[B+C]の間にコンテナ全幅で配置。 |
| タブレット (`md:`) | 768px | 1カラム構成: ヘッダー → 広告（横型: 左画像、右テキストブロック） → サマリー + 住所（縦積み） → 決済方法 → 備考 → 注文確定。広告パネルはコンテナ全幅、[A]と[B+C]の間で水平中央揃え。 |
| デスクトップ (`lg:`) | 1024px | 2カラム構成: 左側にサマリー、右側に配送先住所。広告パネルは横型（左画像、右テキストブロック）、カラム上部に全幅表示、[A]と[B+C]の間で水平中央揃え。 |
| ワイド (`xl:`) | 1280px | `lg:`と同様で余白を拡張。広告パネルは`lg:`と同一で余白を拡張。 |

---

## 4. 画面項目定義

### 4.1 セクション [A]: チェックアウトページヘッダー

| No. | 項目ID | 項目名 (論理名) | コンポーネント種別 | データ型 & 最大長 | 必須 | 初期値 / デフォルト値 | 入力制約 / フォーマット | データソース / DBマッピング | 備考 / ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 1 | `lblCheckoutTitle` | ページタイトル | 見出し (`<h1>`) | String | — | 表示。テキスト: "Checkout" / "チェックアウト" | — | ハードコードUIテキスト | i18nキー: `checkout.title`。Tailwind: `text-2xl font-bold`。 |
| 2 | `lnkBackToCart` | カートに戻るリンク | リンク (`<Link>`) | String | — | 表示。テキスト: "← Back to Cart" / "← カートに戻る" | — | — | i18nキー: `checkout.backToCart`。`/cart`に遷移。Tailwind: `text-sm text-muted-foreground hover:text-primary`。 |

### 4.2 セクション [D0]: スポンサー広告スライドダウンパネル

セクション[A]（ページヘッダー）と[B]+[C]（注文サマリー＋配送先住所）行の間にコンテナ全幅・水平中央揃えで描画。広告パネルの直下に[B]+[C]行が配置される。

| No. | 項目ID | 項目名 (論理名) | コンポーネント種別 | データ型 & 最大長 | 必須 | 初期値 / デフォルト値 | 入力制約 / フォーマット | データソース / DBマッピング | 備考 / ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 3 | `slotAdCheckout` | スポンサー広告枠 — チェックアウト上部 (スライドダウンパネル) | スライドダウンパネル (`div`, アニメーション展開/折りたたみ) | — | 条件付き | 広告レスポンス到着まで非表示。最初の適格広告到着時: [A]ページヘッダーの直下かつ[B]+[C]行の直上にコンテナ全幅で水平中央揃えでスライドダウン表示（translateY −100% → 0、高さ展開、300ms ease-out、マウント時1回）。注文サマリー＋配送先行および後続セクションをスムーズに押し下げる。 | 最大5件の広告、5秒ごとに自動スライド。 | `GET /api/v1/ads?placement=checkout_top` (Redis TTL 5分, `cache:ads:checkout-top`) | 出品者が購入した広告パッケージのうち、掲載枠にチェックアウト上部を含む承認済み広告レコードを表示。パッケージ掲載枠およびティア優先度ルール（Premium > Standard > Basic、ティア内はラウンドロビン）を適用。承認済み・有効・掲載期間内の広告のみが対象。広告取得エラー時または適格広告なし時は非表示（スライドダウンなし、グレースフルデグラデーション）。`prefers-reduced-motion: reduce`設定時は初期アニメーションを省略（即時表示、ローテーションルールは維持）。 |
| 4 | `trackAdSlides` | 広告スライドトラック *(sub-item of `slotAdCheckout`)* | スライダートラック (`div`, 垂直) | — | 条件付き | `slotAdCheckout`展開時に描画。 | スライド間の垂直スライドダウントランジション（500ms ease-in-out）、送り間隔5秒。 | `GET /api/v1/ads?placement=checkout_top`の`data[]` | `slotAdCheckout`へのマウスホバー時またはキーボードフォーカス時に自動進行を一時停止し、離脱/ブラー時に再開（WCAG 2.2.2準拠）。最後のスライドの後は先頭にループ。 |
| 5 | `cardAdSlide` | 広告スライドカード *(sub-item of `slotAdCheckout`)* | カード (flexコンテナ) | — | 広告ごと (≤ 5) | 適格広告ごとに1枚。カードは`slotAdCheckout`内で中央揃えされ、コンテナ全幅に広がる。 | デスクトップ/タブレット (≥ 768px): 横型 — 画像左 (w-80)、テキストブロック右。モバイル (< 768px): 縦積み — 画像上、コンテンツ下。 | `data[]`の広告オブジェクト | レスポンシブなレイアウト切り替えはCSSのみ（Tailwindブレークポイント）。ブレークポイント変更時の再取得やローテーションリセットはなし。カード全体がクリック可能。 |
| 6 | `imgAdBanner` | 広告画像 / バナー *(sub-item of `slotAdCheckout`)* | 画像 (`<img>`) | VARCHAR(500) URL | 必須 (広告ごと) | スライドごとに描画。 | デスクトップ: 固定320×120、`object-cover`。モバイル: 全幅16:9、`object-cover`。遅延読み込み。 | `advertisements.image_url` → `imageUrl` | `alt`属性は広告タイトルを含むi18nテンプレート`checkout.sponsored.adAlt`から生成。 |
| 7 | `lblAdTitle` | 広告タイトル *(sub-item of `slotAdCheckout`)* | 見出し (`<h3>`) | VARCHAR(255) | 必須 (広告ごと) | スライドごとに描画。 | 1行切り捨て (`truncate`)。 | `advertisements.title` → `title` | 同一の`cardAdSlide`内で`imgAdBanner`、`txtAdDescription`、`btnAdCta`と一緒に表示。 |
| 8 | `txtAdDescription` | 広告説明文 *(sub-item of `slotAdCheckout`)* | 段落 (`<p>`) | TEXT | 任意 | 存在する場合にスライドごとに描画。 | すべてのブレークポイントで2行クランプ (`line-clamp-2`)。 | `advertisements.description` → `description` | タイトル、画像/バナー、CTAと一緒に表示。null/空の場合はレイアウトを崩さずに非表示。 |
| 9 | `btnAdCta` | 広告CTAボタン *(sub-item of `slotAdCheckout`)* | ボタン/リンク (`primary`) | VARCHAR(100) ラベル / VARCHAR(500) URL | 必須 (広告ごと) | スライドごとに描画。 | デスクトップ: インライン右寄せ。モバイル: 全幅。視認可能なプライマリフォーカスリング付きキーボードフォーカス可能リンク。 | `advertisements.cta_text` / `cta_url` → `ctaText` / `ctaUrl` | 広告遷移先URLへ移動。`ad_id`と`placement`を含む`ad.click`アナリティクスイベントを発火。 |
| 10 | `badgeSponsored` | スポンサーバッジ *(sub-item of `slotAdCheckout`)* | バッジ (`span`) | — | 必須 (スライドごと) | 全スライドで表示。 | テキスト: i18nキー `checkout.sponsored.label`。大文字、アンバー背景＋ダーク文字。 | ハードコードUI要素 | 広告と通常のチェックアウトコンテンツを識別。 |

### 4.3 セクション [B]: 注文サマリー

| No. | 項目ID | 項目名 (論理名) | コンポーネント種別 | データ型 & 最大長 | 必須 | 初期値 / デフォルト値 | 入力制約 / フォーマット | データソース / DBマッピング | 備考 / ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 11 | `lstOrderItems` | 注文商品リスト | リスト (`<ul>`) | Array | — | 表示。カート商品から設定。 | — | `cart_items` JOIN `products` | 各商品に商品画像、名前、単価、数量、行合計を表示。 |
| 12 | `itmOrderItem` | 注文商品行 | 行 (`<li>`) | Object | — | カート商品ごとに表示。 | — | `cart_items.quantity`, `products.name`, `products.price`, `products.images` | Tailwind: `flex items-center gap-4 py-3 border-b`。 |
| 13 | `imgOrderItem` | 商品サムネイル | 画像 (`<img>`) | URL | — | 表示。商品サムネイル。 | — | `products.images[0]` | Tailwind: `h-16 w-16 rounded-md object-cover`。 |
| 14 | `lblOrderItemName` | 商品名 | 静的ラベル (`<span>`) | String(255) | — | 表示。商品表示名。 | — | `products.name` | Tailwind: `font-medium`。 |
| 15 | `lblOrderItemQty` | 数量 | 静的ラベル (`<span>`) | Integer | — | 表示。"Qty: {quantity}" / "数量: {quantity}" | — | `cart_items.quantity` | Tailwind: `text-sm text-muted-foreground`。 |
| 16 | `lblOrderItemPrice` | 単価 | 静的ラベル (`<span>`) | Decimal(10,2) | — | 表示。フォーマット済み価格。 | — | `products.price` | Tailwind: `text-sm`。通貨フォーマット適用。 |
| 17 | `lblOrderItemTotal` | 行合計 | 静的ラベル (`<span>`) | Decimal(10,2) | — | 表示。"unit_price × quantity"。 | — | 計算値 | Tailwind: `font-medium`。通貨フォーマット適用。 |
| 18 | `lblSubtotal` | 小計ラベル | 静的ラベル (`<span>`) | String | — | 表示。テキスト: "Subtotal" / "小計" | — | ハードコードUIテキスト | i18nキー: `checkout.subtotal`。 |
| 19 | `lblSubtotalValue` | 小計金額 | 静的ラベル (`<span>`) | Decimal(10,2) | — | 表示。全行合計の総和。 | — | 計算値 | Tailwind: `font-medium`。通貨フォーマット適用。 |
| 20 | `txtCouponCode` | クーポンコード入力欄 | 入力 (`text`) | String(50) | いいえ | 空。プレースホルダー: "Enter coupon code" / "クーポンコードを入力" | 最大文字数: 50。 | — | i18nキー: `checkout.couponCode`。Tailwind: `w-full`。 |
| 21 | `btnApplyCoupon` | クーポン適用ボタン | ボタン (`button`, `secondary`) | — | — | 表示。テキスト: "Apply" / "適用" | — | — | i18nキー: `checkout.applyCoupon`。Tailwind: `ml-2`。ローディング時: スピナー + "Applying..." / "適用中..."。 |
| 22 | `lblDiscount` | 割引金額 | 静的ラベル (`<span>`) | Decimal(10,2) | 条件付き | デフォルト非表示。クーポン適用時に表示。テキスト: "-$X.XX" / "-¥X,XXX" | — | `orders.discount_amount` | i18nキー: `checkout.discount`。Tailwind: `text-green-600 font-medium`。 |
| 23 | `btnRemoveCoupon` | クーポン削除ボタン | ボタン (`button`, `ghost`) | — | 条件付き | デフォルト非表示。クーポン適用時に表示。テキスト: "Remove" / "削除" | — | — | i18nキー: `checkout.removeCoupon`。Tailwind: `text-sm text-destructive`。 |
| 24 | `lblTotal` | 合計ラベル | 静的ラベル (`<span>`) | String | — | 表示。テキスト: "Total" / "合計" | — | ハードコードUIテキスト | i18nキー: `checkout.total`。 |
| 25 | `lblTotalValue` | 最終合計金額 | 静的ラベル (`<span>`) | Decimal(10,2) | — | 表示。"subtotal - discount"。必須 > 0。 | — | 計算値 | Tailwind: `text-lg font-bold`。通貨フォーマット適用。 |

### 4.4 セクション [C]: 配送先住所フォーム

| No. | 項目ID | 項目名 (論理名) | コンポーネント種別 | データ型 & 最大長 | 必須 | 初期値 / デフォルト値 | 入力制約 / フォーマット | データソース / DBマッピング | 備考 / ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 26 | `lblRecipientName` | 受取人氏名ラベル | 静的ラベル (`<label>`) | String | — | 常時表示。テキスト: "Recipient Name" / "受取人氏名" | — | ハードコードUIテキスト | i18nキー: `checkout.recipientName`。`txtRecipientName`に関連付け。 |
| 27 | `txtRecipientName` | 受取人氏名入力欄 | 入力 (`text`) | String(200) | 必須 | 空。プレースホルダー: "Full name" / "氏名" | 最大長: 200。最小長: 1。 | `shipping_address.recipientName` | AutoComplete: `name`。Tailwind: `w-full`。 |
| 28 | `lblPhone` | 電話番号ラベル | 静的ラベル (`<label>`) | String | — | 常時表示。テキスト: "Phone Number" / "電話番号" | — | ハードコードUIテキスト | i18nキー: `checkout.phone`。`txtPhone`に関連付け。 |
| 29 | `txtPhone` | 電話番号入力欄 | 入力 (`tel`) | String(20) | 必須 | 空。プレースホルダー: "Phone number" / "電話番号" | 最大長: 20。 | `shipping_address.phone` | AutoComplete: `tel`。InputMode: `tel`。 |
| 30 | `lblAddress1` | 住所1ラベル | 静的ラベル (`<label>`) | String | — | 常時表示。テキスト: "Address Line 1" / "住所1" | — | ハードコードUIテキスト | i18nキー: `checkout.address1`。`txtAddress1`に関連付け。 |
| 31 | `txtAddress1` | 住所1入力欄 | 入力 (`text`) | String(255) | 必須 | 空。プレースホルダー: "Street address" / "住所" | 最大長: 255。 | `shipping_address.addressLine1` | AutoComplete: `address-line1`。 |
| 32 | `lblAddress2` | 住所2ラベル | 静的ラベル (`<label>`) | String | — | 常時表示。テキスト: "Address Line 2" / "住所2" | — | ハードコードUIテキスト | i18nキー: `checkout.address2`。`txtAddress2`に関連付け。 |
| 33 | `txtAddress2` | 住所2入力欄 | 入力 (`text`) | String(255) | いいえ | 空。プレースホルダー: "Apartment, suite, unit, etc." / "マンション名・部屋番号など" | 最大長: 255。 | `shipping_address.addressLine2` | AutoComplete: `address-line2`。 |
| 34 | `lblCity` | 市区町村ラベル | 静的ラベル (`<label>`) | String | — | 常時表示。テキスト: "City" / "市区町村" | — | ハードコードUIテキスト | i18nキー: `checkout.city`。`txtCity`に関連付け。 |
| 35 | `txtCity` | 市区町村入力欄 | 入力 (`text`) | String(100) | 必須 | 空。プレースホルダー: "City" / "市区町村" | 最大長: 100。 | `shipping_address.city` | AutoComplete: `address-level2`。 |
| 36 | `lblState` | 都道府県ラベル | 静的ラベル (`<label>`) | String | — | 常時表示。テキスト: "State/Province" / "都道府県" | — | ハードコードUIテキスト | i18nキー: `checkout.state`。`txtState`に関連付け。 |
| 37 | `txtState` | 都道府県入力欄 | 入力 (`text`) | String(100) | 必須 | 空。プレースホルダー: "State/Province" / "都道府県" | 最大長: 100。 | `shipping_address.state` | AutoComplete: `address-level1`。 |
| 38 | `lblPostalCode` | 郵便番号ラベル | 静的ラベル (`<label>`) | String | — | 常時表示。テキスト: "Postal Code" / "郵便番号" | — | ハードコードUIテキスト | i18nキー: `checkout.postalCode`。`txtPostalCode`に関連付け。 |
| 39 | `txtPostalCode` | 郵便番号入力欄 | 入力 (`text`) | String(20) | 必須 | 空。プレースホルダー: "Postal code" / "郵便番号" | 最大長: 20。 | `shipping_address.postalCode` | AutoComplete: `postal-code`。 |
| 40 | `lblCountry` | 国ラベル | 静的ラベル (`<label>`) | String | — | 常時表示。テキスト: "Country" / "国" | — | ハードコードUIテキスト | i18nキー: `checkout.country`。`selCountry`に関連付け。 |
| 41 | `selCountry` | 国選択ドロップダウン | セレクト (`<select>`) | String(100) | 必須 | デフォルト: 最初の選択肢または空。 | 事前定義リストから選択肢を読み込み。 | `shipping_address.country` | AutoComplete: `country`。 |

### 4.5 セクション [D]: 決済方法

| No. | 項目ID | 項目名 (論理名) | コンポーネント種別 | データ型 & 最大長 | 必須 | 初期値 / デフォルト値 | 入力制約 / フォーマット | データソース / DBマッピング | 備考 / ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 42 | `lblPaymentMethod` | 決済方法ラベル | 静的ラベル (`<label>`) | String | — | 常時表示。テキスト: "Payment Method" / "決済方法" | — | ハードコードUIテキスト | i18nキー: `checkout.paymentMethod`。 |
| 43 | `rdoPaymentMethod` | 決済方法ラジオグループ | ラジオグループ | Enum | 必須 | デフォルト: `cod` | 選択肢: `cod`, `bank_transfer`, `card` | `orders.payment_method` | i18nキー: `checkout.cod`, `checkout.bankTransfer`, `checkout.cardPayment`。 |
| 44 | `rdoCOD` | 代金引換ラジオ | ラジオボタン | — | — | デフォルト選択。 | 値: `cod` | — | ラベル: "Cash on Delivery" / "代金引換" |
| 45 | `rdoBankTransfer` | 銀行振込ラジオ | ラジオボタン | — | — | 未選択。 | 値: `bank_transfer` | — | ラベル: "Bank Transfer" / "銀行振込" |
| 46 | `rdoCard` | カード決済ラジオ | ラジオボタン | — | — | 未選択。 | 値: `card` | — | ラベル: "Credit/Debit Card" / "クレジット・デビットカード" (MVPではスタブ) |

### 4.6 セクション [E]: 注文備考

| No. | 項目ID | 項目名 (論理名) | コンポーネント種別 | データ型 & 最大長 | 必須 | 初期値 / デフォルト値 | 入力制約 / フォーマット | データソース / DBマッピング | 備考 / ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 47 | `lblNotes` | 注文備考ラベル | 静的ラベル (`<label>`) | String | — | 常時表示。テキスト: "Order Notes (optional)" / "備考（任意）" | — | ハードコードUIテキスト | i18nキー: `checkout.notes`。`txtNotes`に関連付け。 |
| 48 | `txtNotes` | 注文備考テキストエリア | テキストエリア (`<textarea>`) | TEXT(500) | いいえ | 空。プレースホルダー: "Notes for the merchant..." / "出品者への備考..." | 最大長: 500。 | `orders.notes` | Tailwind: `w-full min-h-[80px]`。 |

### 4.7 セクション [F]: 注文確定

| No. | 項目ID | 項目名 (論理名) | コンポーネント種別 | データ型 & 最大長 | 必須 | 初期値 / デフォルト値 | 入力制約 / フォーマット | データソース / DBマッピング | 備考 / ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 49 | `btnPlaceOrder` | 注文を確定するボタン | ボタン (`submit`, `primary`, `lg`) | — | — | 表示。テキスト: "Place Order" / "注文を確定する" | — | — | i18nキー: `checkout.placeOrder`。全幅表示。ローディング時: スピナー + "Placing order..." / "注文を送信中..."。フォームが無効または送信中の場合は非活性。Tailwind: `w-full`。 |

### 4.8 セクション [G]: ゲストログインアラートモーダル

| No. | 項目ID | 項目名 (論理名) | コンポーネント種別 | データ型 & 最大長 | 必須 | 初期値 / デフォルト値 | 入力制約 / フォーマット | データソース / DBマッピング | 備考 / ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 50 | `dlgGuestAlert` | ゲストログインアラートモーダル | ダイアログ/モーダル | — | 条件付き | デフォルト非表示。ゲストがチェックアウトを試行した際に表示。 | — | — | i18nキー: `checkout.guestLoginAlert`。 |
| 51 | `lblGuestAlertMessage` | アラートメッセージ | 静的ラベル (`<p>`) | String | — | モーダル内に表示。テキスト: "Please log in to complete your purchase." / "購入を完了するにはログインしてください。" | — | ハードコードUIテキスト | Tailwind: `text-center`。 |
| 52 | `btnGuestLogin` | ログインボタン | ボタン (`button`, `default`) | — | — | モーダル内に表示。テキスト: "Log in" / "ログイン" | — | — | `/login`に遷移。Tailwind: `w-full`。 |

### 4.9 セクション [H]: ローディングオーバーレイ

| No. | 項目ID | 項目名 (論理名) | コンポーネント種別 | データ型 & 最大長 | 必須 | 初期値 / デフォルト値 | 入力制約 / フォーマット | データソース / DBマッピング | 備考 / ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 53 | `ovlLoading` | ローディングオーバーレイ | オーバーレイ (`<div>`) | — | 条件付き | デフォルト非表示。注文送信処理中に表示。 | — | — | Tailwind: `fixed inset-0 z-50 bg-background/80 flex items-center justify-center`。スピナー + "Processing your order..." / "注文を処理中..."。 |

### 4.10 セクション [I]: 注文確認 — 成功セクション

| No. | 項目ID | 項目名 (論理名) | コンポーネント種別 | データ型 & 最大長 | 必須 | 初期値 / デフォルト値 | 入力制約 / フォーマット | データソース / DBマッピング | 備考 / ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 54 | `icoSuccess` | 成功アイコン | アイコン (`CheckCircle2`) | — | — | 表示。大きな緑のチェックマーク。 | — | — | Lucideアイコン。Tailwind: `h-16 w-16 text-green-500 mx-auto`。 |
| 55 | `lblConfirmTitle` | 成功タイトル | 見出し (`<h1>`) | String | — | 表示。テキスト: "Order Placed Successfully!" / "注文が完了しました！" | — | ハードコードUIテキスト | i18nキー: `checkout.confirmation.title`。Tailwind: `text-2xl font-bold text-center mt-4`。 |
| 56 | `lblConfirmOrderId` | 注文ID表示 | 静的ラベル (`<p>`) | UUID | — | 表示。"Order #ABC-12345" / "注文番号 #ABC-12345" | — | `orders.id` | i18nキー: `checkout.confirmation.orderId`。UUIDの先頭8文字を表示。Tailwind: `text-center text-muted-foreground`。 |
| 57 | `lblConfirmStatus` | 注文ステータスバッジ | バッジ | Enum | — | 表示。ステータス: "Placed" / "受付済み" | — | `orders.status` | i18nキー: `checkout.confirmation.status`。色分けバッジ。 |
| 58 | `lblConfirmEstDelivery` | 配達予定日 | 静的ラベル (`<p>`) | Date | 条件付き | 発送済み/配達中ステータス時に表示。 | — | 計算値 | i18nキー: `checkout.confirmation.estimatedDelivery`。Tailwind: `text-center text-muted-foreground`。 |
| 59 | `cardConfirmSummary` | 注文サマリーカード | カード | — | — | 表示。商品、合計、配送先住所を含む。 | — | 注文データ | Tailwind: `mt-6 border rounded-lg p-4`。 |

### 4.11 セクション [K]: 注文確認 — アクションボタン

| No. | 項目ID | 項目名 (論理名) | コンポーネント種別 | データ型 & 最大長 | 必須 | 初期値 / デフォルト値 | 入力制約 / フォーマット | データソース / DBマッピング | 備考 / ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 60 | `btnContinueShopping` | 買い物を続けるボタン | ボタン (`button`, `primary`) | — | — | 表示。テキスト: "Continue Shopping" / "買い物を続ける" | — | — | i18nキー: `checkout.confirmation.continueShopping`。`/products`に遷移。Tailwind: `w-full`。 |
| 61 | `btnViewOrder` | 注文を表示ボタン | ボタン (`button`, `secondary`) | — | — | 表示。テキスト: "View Order" / "注文を表示" | — | — | i18nキー: `checkout.confirmation.viewOrder`。`/orders/:orderId`に遷移。Tailwind: `w-full`。 |
| 62 | `btnPrintReceipt` | 領収書を印刷ボタン | ボタン (`button`, `ghost`) | — | — | 表示。テキスト: "Print Receipt" / "領収書を印刷" | — | — | i18nキー: `checkout.confirmation.print`。`window.print()`を呼び出し。Tailwind: `w-full`。 |

---

## 5. 各項目における挙動・イベント仕様

### 5.1 チェックアウト画面読み込み (`/checkout`)
- **トリガー:** カート画面の「チェックアウトへ進む」ボタンからの画面遷移。
- **処理ロジック:**
  1. **認証チェック:** JWTトークンを検証。ゲストの場合は`dlgGuestAlert`を表示。
  2. **ロールチェック:** ロールが`buyer`であることを検証。それ以外の場合は403トーストを表示。
  3. **カートバリデーション:** 商品詳細を含むカート商品を取得。カートが空の場合は`/cart`にリダイレクト。
  4. **在庫バリデーション:** 全商品の在庫を確認。在庫切れ商品がある場合は`alertStockWarning`を表示。
  5. **小計計算:** 全商品の（単価 × 数量）の合計を計算。
  6. **描画:** 注文サマリー、配送フォーム、決済オプションを表示。
- **例外処理:**
  - `401 UNAUTHORIZED`: `/login`にリダイレクト。
  - `403 FORBIDDEN`: トースト：「ショッピング機能は購入者のみ利用できます」。
  - カートが空: `/cart`にリダイレクト。

### 5.2 スポンサー広告表示 (`slotAdCheckout` マウント時)
- **トリガー:** コンポーネントマウント時（チェックアウト画面読み込み時）。
- **処理ロジック:**
  1. **広告枠取得:** `GET /api/v1/ads?placement=checkout_top` — カートデータ取得と並行して実行し、チェックアウトの読み込みをブロック/遅延させない。
  2. **フィルタリング:** 出品者が購入した広告パッケージから、チェックアウト上部（Checkout Top）掲載枠の承認済み広告レコードを選択。現在時刻をカバーする承認済み・有効な広告のみを保持。
  3. **優先順位付け:** パッケージ掲載枠およびティア優先度ルール（Premium > Standard > Basic）を適用し、各ティア内ではラウンドロビンでローテーション。スライダーを最大5件の広告に制限。
  4. **キャッシュ:** 結果の広告リストをRedisにキー`cache:ads:checkout-top`、TTL 5分でキャッシュ。
  5. **スライドダウン入場:** 適格広告が存在する場合、`slotAdCheckout`がページヘッダー([A])と注文サマリー＋配送先行([B]+[C])の間にコンテナ全幅・水平中央揃えでスライドダウン表示される。高さが0から展開し、パネルが−100%から0に移動（300ms ease-out、マウント時1回）。[B]+[C]行および後続セクションをスムーズに押し下げる。`prefers-reduced-motion: reduce`設定時はアニメーションなしで即時表示。
  6. **スライドコンテンツ描画:** 各スライドは広告の画像/バナー（`imgAdBanner`）、タイトル（`lblAdTitle`）、説明文（`txtAdDescription`、存在しない場合は非表示）、CTA（`btnAdCta`）を1つの`cardAdSlide`内にまとめて描画し、全スライドに「スポンサー」バッジ（`badgeSponsored`）を表示。説明文は2行クランプ、タイトルは1行切り捨て。
  7. **自動スライド:** 垂直スライドダウントランジション（現在のスライドが上へ抜け、次のスライドが上から入る、500ms）を使用して5秒ごとに次の広告へ自動進行。最大5枚、末尾の後は先頭にループ。
  8. **レスポンシブレイアウト:** デスクトップ/タブレット (≥ 768px): 横型スライド — 画像左（320×120、object-cover）、テキストブロック右、インラインCTA。モバイル (< 768px): 縦積みスライド — 全幅16:9画像、タイトル、説明文、下部に全幅CTA。全ブレークポイントでパネルはコンテナ全幅かつ[A]と[B+C]行の間で水平中央揃え。レイアウト切り替えはCSSのみ（ブレークポイント）。ブレークポイント切り替え時の再取得やローテーションリセットはなし。
  9. **操作時の一時停止:** `slotAdCheckout`へのマウスホバー時またはキーボードフォーカス時に自動進行を一時停止し、離脱/ブラー時に再開（WCAG 2.2.2準拠）。5秒間隔自体は不変。
  10. **エラーハンドリング:** 広告取得エラー時または空レスポンス時、`slotAdCheckout`を完全に非表示とし、スライドダウン入場は実行しない（グレースフルデグラデーション。広告障害がチェックアウト機能を妨げることはない）。
  11. **クリック追跡:** CTAクリック時に`ad_id`と`placement`を含む`ad.click`アナリティクスイベントを発火。
- **例外処理:** なし（広告枠の障害はクリティカルではなく、画面は広告なしで通常通り動作）。

### 5.3 クーポンコード適用 (`btnApplyCoupon` onClick)
- **トリガー:** クーポンコード入力後、「適用」ボタンをクリック。
- **処理ロジック:**
  1. **クライアント側事前チェック:** クーポンコードが空でないことを確認。
  2. **バックエンド送信:** `{ couponCode, subtotal }` を指定して `POST /api/v1/checkout/validate-coupon` を実行。
  3. **バックエンド実行:** クーポンを検証（有効、期限内、最低注文額、使用回数制限）。割引額を計算。
  4. **実行後UI:** 注文サマリーを割引で更新。`lblDiscount`、`btnRemoveCoupon` を表示。合計金額を再計算。
- **例外処理:**
  - `VAL-CHECK-010`: 「クーポンコードは必須です」 — `txtCouponCode` のインラインエラー。
  - `VAL-CHECK-011`: 「無効なクーポンコードです」 — トースト。
  - `VAL-CHECK-012`: 「クーポンの有効期限が切れています」 — トースト。
  - `VAL-CHECK-013`: 「最低注文金額を満たしていません」 — トースト。
  - `VAL-CHECK-014`: 「クーポンの使用回数上限に達しました」 — トースト。

### 5.4 クーポンコード削除 (`btnRemoveCoupon` onClick)
- **トリガー:** 適用済みクーポンの「削除」ボタンをクリック。
- **処理ロジック:**
  1. stateからクーポンコードをクリア。
  2. `lblDiscount`、`btnRemoveCoupon` を非表示にする。
  3. 合計金額を小計と同じ値にリセット。
  4. `txtCouponCode` の入力をクリア。
- **例外処理:** 該当なし。

### 5.5 注文確定 (`btnPlaceOrder` onClick)
- **トリガー:** 「注文を確定する」ボタンをクリック。
- **処理ロジック:**
  1. **クライアント側事前チェック:** 全配送先フィールドが有効、決済方法選択済み、カート非空であることを検証。
  2. **バックエンド送信:** `{ shippingAddress, paymentMethod, couponCode?, notes? }` を指定して `POST /api/v1/orders` を実行。
  3. **バックエンド実行:** DTOを検証。最新の商品価格でカート商品を取得。在庫を再検証。小計を計算。クーポンが指定されている場合は検証・適用。割引と合計を計算。注文レコード作成（ステータス: `placed`）。`order_items`レコード作成。在庫を原子的に減算。クーポン適用時used_countをインクリメント。カートをクリア。出品者に通知を送信。
  4. **実行後UI:** `/checkout/confirmation/:orderId` に遷移。カートのstateをクリア。
- **例外処理:**
  - `VAL-CHECK-001`〜`VAL-CHECK-008`: 配送先住所フィールドのフィールドレベルインラインエラー。
  - `VAL-CHECK-009`: 「決済方法は必須です」 — インラインエラー。
  - `CHECK_001` (400): 「カートが空です」 — トースト。
  - `CHECK_002` (409): 「一部の商品は利用できなくなりました。カートを確認してください。」 — トースト。
  - `CHECK_003` (400): 「無効なクーポンコードです」 — トースト。
  - `401 UNAUTHORIZED`: ログイン画面にリダイレクト。
  - `500 INTERNAL_SERVER_ERROR`: トースト：「問題が発生しました。もう一度お試しください。」

### 5.6 ゲストチェックアウト試行 (`dlgGuestAlert` 表示)
- **トリガー:** ゲストユーザーが`/checkout`に直接遷移。
- **処理ロジック:**
  1. 未認証状態を検知。
  2. `dlgGuestAlert` モーダルを表示。
  3. `btnGuestLogin` をクリックすると `/login` に遷移。
- **例外処理:** 該当なし。

### 5.7 ナビゲーションリンク
- **トリガー:** ユーザーがナビゲーションリンクをクリック。
- **処理ロジック:**
  1. `lnkBackToCart`: `/cart` に遷移。
  2. `btnContinueShopping`: `/products` に遷移。
  3. `btnViewOrder`: `/orders/:orderId` に遷移。
  4. `btnPrintReceipt`: `window.print()` を呼び出し。
- **例外処理:** 該当なし。

---

## 6. バリデーション及びエラーメッセージマッピング

### 6.1 配送先住所バリデーションエラー

| エラーコード | 対象フィールド | 条件 / 評価ロジック | UI/UX表示スタイル | デフォルトエラーメッセージ (EN) | デフォルトエラーメッセージ (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-CHECK-001** | `txtRecipientName` | 受取人氏名が未入力または200文字超過 | 赤枠＋フィールド下テキスト | "Recipient name is required" / "Name must not exceed 200 characters" | "受取人氏名は必須です" / "氏名は200文字以内にしてください" |
| **VAL-CHECK-002** | `txtPhone` | 電話番号が未入力または20文字超過 | 赤枠＋フィールド下テキスト | "Phone number is required" / "Phone number is invalid" | "電話番号は必須です" / "無効な電話番号です" |
| **VAL-CHECK-003** | `txtAddress1` | 住所1が未入力または255文字超過 | 赤枠＋フィールド下テキスト | "Address is required" / "Address must not exceed 255 characters" | "住所は必須です" / "住所は255文字以内にしてください" |
| **VAL-CHECK-004** | `txtCity` | 市区町村が未入力または100文字超過 | 赤枠＋フィールド下テキスト | "City is required" / "City must not exceed 100 characters" | "市区町村は必須です" / "市区町村は100文字以内にしてください" |
| **VAL-CHECK-005** | `txtState` | 都道府県が未入力または100文字超過 | 赤枠＋フィールド下テキスト | "State is required" / "State must not exceed 100 characters" | "都道府県は必須です" / "都道府県は100文字以内にしてください" |
| **VAL-CHECK-006** | `txtPostalCode` | 郵便番号が未入力または20文字超過 | 赤枠＋フィールド下テキスト | "Postal code is required" / "Postal code must not exceed 20 characters" | "郵便番号は必須です" / "郵便番号は20文字以内にしてください" |
| **VAL-CHECK-007** | `selCountry` | 国が未選択 | 赤枠＋フィールド下テキスト | "Country is required" | "国は必須です" |

### 6.2 決済方法バリデーションエラー

| エラーコード | 対象フィールド | 条件 / 評価ロジック | UI/UX表示スタイル | デフォルトエラーメッセージ (EN) | デフォルトエラーメッセージ (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-CHECK-008** | `rdoPaymentMethod` | 決済方法が未選択 | フォームレベルエラー | "Payment method is required" | "決済方法は必須です" |

### 6.3 クーポンバリデーションエラー

| エラーコード | 対象フィールド | 条件 / 評価ロジック | UI/UX表示スタイル | デフォルトエラーメッセージ (EN) | デフォルトエラーメッセージ (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-CHECK-010** | `txtCouponCode` | クーポンコードが空 | 赤枠＋フィールド下テキスト | "Coupon code is required" | "クーポンコードは必須です" |
| **VAL-CHECK-011** | `alertError` | クーポンが存在しないまたは無効 (400応答) | トースト通知 | "Invalid coupon code" | "無効なクーポンコードです" |
| **VAL-CHECK-012** | `alertError` | クーポン有効期限切れ (400応答) | トースト通知 | "Coupon has expired" | "クーポンの有効期限が切れています" |
| **VAL-CHECK-013** | `alertError` | 最低注文金額未達 (400応答) | トースト通知 | "Minimum order amount not met" | "最低注文金額を満たしていません" |
| **VAL-CHECK-014** | `alertError` | クーポン使用回数上限到達 (400応答) | トースト通知 | "Coupon usage limit reached" | "クーポンの使用回数上限に達しました" |

### 6.4 注文確定エラー

| エラーコード | 対象フィールド | 条件 / 評価ロジック | UI/UX表示スタイル | デフォルトエラーメッセージ (EN) | デフォルトエラーメッセージ (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CHECK_001** | `alertError` | カートが空 (400応答) | トースト通知 | "Your cart is empty" | "カートが空です" |
| **CHECK_002** | `alertError` | 送信時の在庫不足 (409応答) | トースト通知 | "Some items are no longer available. Please review your cart." | "一部の商品は利用できなくなりました。カートを確認してください。" |
| **CHECK_003** | `alertError` | 注文確定時の無効クーポン (400応答) | トースト通知 | "Invalid coupon code" | "無効なクーポンコードです" |
| **CHECK_004** | `alertError` | バイヤー以外のロール (403応答) | トースト通知 | "Shopping features are only available to buyers" | "ショッピング機能は購入者のみ利用できます" |
| **AUTH_001** | `alertError` | JWTトークン欠落または無効 (401応答) | ログインへリダイレクト | "Session expired. Please log in again." | "セッションが期限切れです。再度ログインしてください。" |
| **SYS_001** | `alertError` | サーバーエラー (500応答) | トースト通知 | "Something went wrong. Please try again." | "問題が発生しました。もう一度お試しください。" |
| **NET_ERR** | `alertError` | ネットワークエラー | トースト通知 | "Network error. Please check your connection" | "ネットワークエラー。接続を確認してください" |

### 6.5 バリデーション適用レイヤー

1. **フロントエンド (Client)**: React Hook Form + ZodスキーマバリデーションによるAPI呼び出し前のリアルタイムフィードバック。
2. **バックエンド (Server)**: すべてのエンドポイントにおけるNestJS ValidationPipe + class-validator DTO。
3. **データベース (DB)**: 最終防衛線としてのPrisma制約（ユニーク、チェック、外部キー）。

---

## 7. APIレスポンスマッピング

### 7.1 チェックアウト読み込み成功レスポンス

```json
{
  "data": {
    "items": [
      {
        "id": "uuid",
        "productId": "uuid",
        "productName": "Product Name",
        "productImage": "https://...",
        "unitPrice": 29.99,
        "quantity": 2,
        "lineTotal": 59.98,
        "stockQuantity": 15
      }
    ],
    "subtotal": 59.98,
    "discountAmount": 0,
    "total": 59.98,
    "cartId": "uuid"
  }
}
```

### 7.2 クーポン検証成功レスポンス

```json
{
  "data": {
    "discountType": "percentage",
    "discountValue": 10,
    "discountAmount": 5.998,
    "newTotal": 53.982
  }
}
```

### 7.3 注文確定成功レスポンス (201)

```json
{
  "data": {
    "orderId": "uuid",
    "orderNumber": "abc12345",
    "status": "placed",
    "subtotal": 59.98,
    "discountAmount": 5.998,
    "total": 53.982,
    "paymentMethod": "cod",
    "shippingAddress": {
      "recipientName": "John Doe",
      "phone": "+1234567890",
      "addressLine1": "123 Main St",
      "city": "New York",
      "state": "NY",
      "postalCode": "10001",
      "country": "US"
    },
    "createdAt": "2026-08-25T12:00:00.000Z",
    "estimatedDelivery": "2026-08-30"
  }
}
```

### 7.4 スポンサー広告枠レスポンス

```json
{
  "data": [
    {
      "id": "uuid",
      "imageUrl": "https://cdn.example.com/ads/banner1.jpg",
      "title": "Summer Sale - 20% Off",
      "description": "Limited time offer on all skincare products.",
      "ctaText": "Shop Now",
      "ctaUrl": "https://example.com/summer-sale",
      "priority": "premium",
      "scheduleStart": "2026-08-20T00:00:00.000Z",
      "scheduleEnd": "2026-09-30T23:59:59.000Z"
    }
  ]
}
```

---

## 8. i18nキーリファレンス

### 8.1 英語 (en) — チェックアウト

| キー | 値 |
| :--- | :--- |
| `checkout.title` | "Checkout" |
| `checkout.backToCart` | "← Back to Cart" |
| `checkout.subtotal` | "Subtotal" |
| `checkout.couponCode` | "Enter coupon code" |
| `checkout.applyCoupon` | "Apply" |
| `checkout.discount` | "Discount" |
| `checkout.removeCoupon` | "Remove" |
| `checkout.total` | "Total" |
| `checkout.recipientName` | "Recipient Name" |
| `checkout.phone` | "Phone Number" |
| `checkout.address1` | "Address Line 1" |
| `checkout.address2` | "Address Line 2" |
| `checkout.city` | "City" |
| `checkout.state` | "State/Province" |
| `checkout.postalCode` | "Postal Code" |
| `checkout.country` | "Country" |
| `checkout.paymentMethod` | "Payment Method" |
| `checkout.cod` | "Cash on Delivery" |
| `checkout.bankTransfer` | "Bank Transfer" |
| `checkout.cardPayment` | "Credit/Debit Card" |
| `checkout.notes` | "Order Notes (optional)" |
| `checkout.placeOrder` | "Place Order" |
| `checkout.guestLoginAlert` | "Please log in to complete your purchase." |
| `checkout.sponsored.label` | "Sponsored" |
| `checkout.sponsored.adAlt` | "Advertisement: {title}" |

### 8.2 英語 (en) — 注文確認

| キー | 値 |
| :--- | :--- |
| `checkout.confirmation.title` | "Order Placed Successfully!" |
| `checkout.confirmation.orderId` | "Order #{orderId}" |
| `checkout.confirmation.status` | "Status" |
| `checkout.confirmation.estimatedDelivery` | "Estimated delivery: {date}" |
| `checkout.confirmation.continueShopping` | "Continue Shopping" |
| `checkout.confirmation.viewOrder` | "View Order" |
| `checkout.confirmation.print` | "Print Receipt" |

### 8.3 日本語 (ja) — チェックアウト

| キー | 値 |
| :--- | :--- |
| `checkout.title` | "チェックアウト" |
| `checkout.backToCart` | "← カートに戻る" |
| `checkout.subtotal` | "小計" |
| `checkout.couponCode` | "クーポンコードを入力" |
| `checkout.applyCoupon` | "適用" |
| `checkout.discount` | "割引" |
| `checkout.removeCoupon` | "削除" |
| `checkout.total` | "合計" |
| `checkout.recipientName` | "受取人氏名" |
| `checkout.phone` | "電話番号" |
| `checkout.address1` | "住所1" |
| `checkout.address2` | "住所2" |
| `checkout.city` | "市区町村" |
| `checkout.state` | "都道府県" |
| `checkout.postalCode` | "郵便番号" |
| `checkout.country` | "国" |
| `checkout.paymentMethod` | "決済方法" |
| `checkout.cod` | "代金引換" |
| `checkout.bankTransfer` | "銀行振込" |
| `checkout.cardPayment` | "クレジット・デビットカード" |
| `checkout.notes` | "備考（任意）" |
| `checkout.placeOrder` | "注文を確定する" |
| `checkout.guestLoginAlert` | "購入を完了するにはログインしてください。" |
| `checkout.sponsored.label` | "スポンサー" |
| `checkout.sponsored.adAlt` | "広告：{title}" |

### 8.4 日本語 (ja) — 注文確認

| キー | 値 |
| :--- | :--- |
| `checkout.confirmation.title` | "注文が完了しました！" |
| `checkout.confirmation.orderId` | "注文番号 #{orderId}" |
| `checkout.confirmation.status` | "ステータス" |
| `checkout.confirmation.estimatedDelivery` | "配達予定日：{date}" |
| `checkout.confirmation.continueShopping` | "買い物を続ける" |
| `checkout.confirmation.viewOrder` | "注文を表示" |
| `checkout.confirmation.print` | "領収書を印刷" |

---

## 9. データベースフィールドマッピング

### 9.1 チェックアウトフォーム → データベース

| フォーム項目 | APIフィールド | データベース列 | テーブル | データ型 |
| :--- | :--- | :--- | :--- | :--- |
| `txtRecipientName` | `shippingAddress.recipientName` | `shipping_address->>'recipientName'` | `orders` | JSONB |
| `txtPhone` | `shippingAddress.phone` | `shipping_address->>'phone'` | `orders` | JSONB |
| `txtAddress1` | `shippingAddress.addressLine1` | `shipping_address->>'addressLine1'` | `orders` | JSONB |
| `txtAddress2` | `shippingAddress.addressLine2` | `shipping_address->>'addressLine2'` | `orders` | JSONB |
| `txtCity` | `shippingAddress.city` | `shipping_address->>'city'` | `orders` | JSONB |
| `txtState` | `shippingAddress.state` | `shipping_address->>'state'` | `orders` | JSONB |
| `txtPostalCode` | `shippingAddress.postalCode` | `shipping_address->>'postalCode'` | `orders` | JSONB |
| `selCountry` | `shippingAddress.country` | `shipping_address->>'country'` | `orders` | JSONB |
| `rdoPaymentMethod` | `paymentMethod` | `payment_method` | `orders` | VARCHAR(50) |
| `txtCouponCode` | `couponCode` | `coupon_code` | `orders` | VARCHAR(50) |
| `txtNotes` | `notes` | `notes` | `orders` | TEXT |

### 9.2 注文商品 → データベース

| データソース | データベース列 | テーブル | データ型 |
| :--- | :--- | :--- | :--- |
| カート商品数量 | `quantity` | `order_items` | INTEGER |
| 現在の商品価格 | `unit_price` | `order_items` | DECIMAL(10,2) |
| quantity × unit_price | `total_price` | `order_items` | DECIMAL(10,2) |
| 商品参照 | `product_id` | `order_items` | UUID (FK) |
| 出品者参照 | `merchant_id` | `order_items` | UUID (FK) |

---

## 10. 共有コンポーネント

### 10.1 注文ステータスバッジコンポーネント (`OrderStatusBadge`)

| プロパティ | 値 |
| :--- | :--- |
| **配置場所** | `frontend/src/components/common/OrderStatusBadge.tsx` |
| **用途** | 注文ステータスを色分けバッジで表示 |

**ステータスカラーマッピング:**
| ステータス | カラー | Tailwindクラス |
| :--- | :--- | :--- |
| `placed` | Blue | `bg-blue-100 text-blue-800` |
| `confirmed` | Yellow | `bg-yellow-100 text-yellow-800` |
| `packed` | Orange | `bg-orange-100 text-orange-800` |
| `shipped` | Purple | `bg-purple-100 text-purple-800` |
| `out_for_delivery` | Cyan | `bg-cyan-100 text-cyan-800` |
| `delivered` | Green | `bg-green-100 text-green-800` |

### 10.2 価格フォーマットユーティリティ

| プロパティ | 値 |
| :--- | :--- |
| **配置場所** | `frontend/src/lib/format.ts` |
| **用途** | ロケールに適した通貨フォーマットで価格を整形 |

### 10.3 スポンサー広告スライダーコンポーネント (`SponsoredAdSlider`)

| プロパティ | 値 |
| :--- | :--- |
| **配置場所** | `frontend/src/features/buyer/checkout/components/SponsoredAdSlider.tsx` |
| **用途** | 自動スライド、操作時の一時停止、レスポンシブレイアウトを備えた再利用可能なスライドダウン広告カルーセル |

**機能仕様:**
- スライドダウン入場アニメーション（300ms ease-out, translateY −100% → 0）
- 広告間の垂直スライダウントランジション（500ms ease-in-out）
- 5秒ごとの自動進行（ホバー/フォーカス時に一時停止、離脱/ブラー時に再開）
- ティア優先度ローテーション（Premium > Standard > Basic）による最大5件の広告
- デスクトップ/タブレット (≥ 768px): 横型レイアウト — 左画像、右テキストブロック
- モバイル (< 768px): 縦積みレイアウト — 上画像、下コンテンツ
- `prefers-reduced-motion: reduce`設定時は入場アニメーションをスキップ
- 取得エラー時のグレースフルデグラデーション（非表示、アニメーションなし）

---

## 11. 特記事項・UI仕様

- **デザインシステム:** 高級コスメテーマ — プライマリ `#7C3AED` (Purple)、アクセント `#EC4899` (Pink)、セカンダリ `#F3E8FF` (Lavender)。
- **レスポンシブビューポート設計:** デスクトップでは2カラムチェックアウトレイアウト（左サマリー、右フォーム）。モバイルでは1カラム構成。スポンサー広告スライドダウンパネルは2カラムレイアウト上部にコンテナ全幅で広がり、ページヘッダーとサマリー＋住所行の間で水平中央揃え。
- **スポンサー広告動作:** 広告読み込み時にスライドダウン入場アニメーション（300ms ease-out）。垂直トランジション（500ms）を伴う5秒間隔の自動スライド。ホバー/フォーカス時に一時停止（WCAG 2.2.2）。ティア優先度ローテーションによる最大5件の広告。広告障害時のグレースフルデグラデーション。
- **アクセシビリティ:** すべてのコントロールはキーボード操作可能。ARIAラベル必須。エラーメッセージは `role="alert"` で通知。
- **パフォーマンス:** フォームは初期読み込み時にスケルトンローダーを使用。非同期処理中はボタンにスピナーを表示。チェックアウト画面は2秒以内に読み込み完了。
- **セキュリティ:** XSSを防止するため全ユーザー入力をサニタイズ。価格はクライアントではなくDBから取得。Prismaトランザクションによる原子的在庫減算。
- **デザイントークン:** ステータスバッジは標準カラーマッピングを使用 — success: `bg-green-100 text-green-800`、error: `bg-red-100 text-red-800`、warning: `bg-amber-100 text-amber-800`。
- **通貨フォーマット:** 全価格はロケールに適した通貨記号で表示（例: 英語は`$XX.XX`、日本語は`¥XX,XXX`）。

---

## 12. テストチェックリスト

### 12.1 チェックアウト画面テスト

- [ ] カート商品とともにチェックアウト画面が読み込まれること
- [ ] 広告がある場合、スポンサー広告スライドダウンパネルがスライドダウン表示されること
- [ ] 広告がない場合、スポンサー広告パネルが非表示であること
- [ ] 広告パネルがヘッダーと注文サマリー行の間で水平中央揃えで描画されること
- [ ] 広告パネルがコンテナ全幅に広がること
- [ ] 広告画像/バナーが正しく読み込まれること（デスクトップ: 320×120、モバイル: 16:9）
- [ ] 広告タイトルが1行切り捨てで表示されること
- [ ] 広告説明文が2行クランプで表示されること
- [ ] 広告CTAボタンが遷移先URLへナビゲートすること
- [ ] 広告CTAボタンが別タブで開くこと
- [ ] 全スライドに「スポンサー」バッジが表示されること
- [ ] 5秒ごとに自動スライドが進行すること
- [ ] ホバー/フォーカス時に自動スライドが一時停止すること
- [ ] ポインター離脱/ブラー時に自動スライドが再開すること
- [ ] 最大5件の広告が表示されること
- [ ] デスクトップ/タブレットで横型レイアウト（左画像、右テキスト）が表示されること
- [ ] モバイルで縦積みレイアウト（上画像、下コンテンツ）が表示されること
- [ ] スライドダウンアニメーションが prefers-reduced-motion 設定を尊重すること
- [ ] 広告エラー時にグレースフルデグラデーションすること（画面が通常通り機能すること）
- [ ] カートが空の場合、`/cart` にリダイレクトされること
- [ ] ゲストユーザーにアラートモーダルが表示されること
- [ ] アラートモーダルから `/login` に遷移すること
- [ ] バイヤー以外のロールで403エラーが表示されること
- [ ] 配送先住所フォームの全必須フィールドが検証されること
- [ ] 電話番号入力欄が tel フォーマットを受け付けること
- [ ] 国選択ドロップダウンの選択肢が読み込まれること
- [ ] 決済方法のデフォルトが「代金引換」であること
- [ ] 決済方法ラジオグループが正常に動作すること
- [ ] クーポンコード入力欄にテキスト入力できること
- [ ] 適用ボタンがAPI経由でクーポンを検証すること
- [ ] 有効なクーポンにより割引と合計が更新されること
- [ ] 無効なクーポンでトーストエラーが表示されること
- [ ] 期限切れクーポンでトーストエラーが表示されること
- [ ] クーポン削除で合計が元にリセットされること
- [ ] フォームが無効な場合に「注文を確定する」ボタンが非活性になること
- [ ] 「注文を確定する」ボタンがAPI経由で注文を送信すること
- [ ] 注文成功時に注文確認画面へ遷移すること
- [ ] 送信中にローディングオーバーレイが表示されること
- [ ] 在庫バリデーションエラー時にトーストが表示されること
- [ ] 空カートエラー時にトーストが表示されること
- [ ] 全i18nキーが正常に描画されること（EN/JA）
- [ ] キーボードナビゲーション（Tab, Enter）が動作すること
- [ ] モバイルでレスポンシブレイアウトが正しく動作すること

### 12.2 注文確認画面テスト

- [ ] 成功アイコンとタイトルが表示されること
- [ ] 注文IDが表示されること（先頭8文字）
- [ ] 注文ステータスバッジが表示されること
- [ ] 注文サマリーに全商品が表示されること
- [ ] 小計、割引、合計が正しく表示されること
- [ ] 配送先住所が表示されること
- [ ] 「買い物を続ける」が `/products` に遷移すること
- [ ] 「注文を表示」が `/orders/:orderId` に遷移すること
- [ ] 「領収書を印刷」が `window.print()` を呼び出すこと
- [ ] 全i18nキーが正常に描画されること

### 12.3 エラーハンドリングテスト

- [ ] 401 Unauthorized でログインへリダイレクトされること
- [ ] 404 注文が見つからない場合にトーストが表示されること
- [ ] 403 Forbidden でトーストが表示されること
- [ ] ネットワークエラーでトーストが表示されること
- [ ] サーバーエラーでトーストが表示されること
- [ ] バリデーションエラーでインラインエラーが表示されること
- [ ] 在庫競合でトーストが表示されること

---

*画面項目設計書（購入・チェックアウト）終了*
