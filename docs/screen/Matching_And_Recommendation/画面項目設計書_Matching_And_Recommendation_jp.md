# 画面項目設計書 — マッチング＆おすすめ商品

**ドキュメントID:** SKM-SIS-MATCH-001  
**対象画面:** おすすめ商品ページ  
**サブシステム:** バイヤーモジュール — スマート商品マッチング＆パーソナライズおすすめ  
**機能ID:** FN-MATCH-001  
**バージョン:** 1.2  
**作成日:** 2026-09-01  
**最終更新日:** 2026-10-15  
**作成者:** シニアシステムエンジニア  
**レビュー状況:** 承認済み  
**分類:** 社内 — 技術部門

> **現行ソースとの整合（2026-10-15）:** 元の画面項目と番号は維持しています。現行画面には成分選択とモバイル用「もっと見る」はありません。カテゴリと最低評価のフィルターを備え、既定のページ件数は12、既定の並び順は新着順（`createdAt desc`）です。グリッド／リスト表示、カート・ウィッシュリスト操作に対応します。グリッド列数は標準1列、`sm`で2列、`lg`で3列です。広告は共通配置`recommendation_page_banner`を使い、独立した開示フッターの代わりに告知バッジを表示します。

---

## 1. ドキュメント管理

### 1.1 改訂履歴

| バージョン | 日付 | 作成者 | 変更内容 |
| :--- | :--- | :--- | :--- |
| 1.0 | 2026-09-01 | シニアシステムエンジニア | 初版。おすすめ商品ページの画面項目として、パーソナライズおすすめ、マッチングフィルター、おすすめ履歴、画面共通広告パネルを定義。 |
| 1.1 | 2026-09-02 | シニアシステムエンジニア | §7.1に不足していたDBフィールド対応（`slug`、`compare_at_price`、`avgRating`、`reviewCount`）を追加。 |
| 1.2 | 2026-10-15 | コード照合 | 実装に合わせて改訂。成分選択とモバイル用「もっと見る」を削除し、カテゴリ・評価フィルターを追加。グリッド列数、既定ソート・件数を更新。レスポンスのcamelCase項目、i18n未接続の状況を反映。 |

### 1.2 関連文書

| No. | 文書ID | 文書名 | ファイルパス | 備考 |
| :-- | :-- | :-- | :-- | :-- |
| 1 | SKM-REQ-001 | 要件定義書 | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | 業務フロー、必須項目、ルール。 |
| 2 | SKM-DBS-001 | データベース設計書 | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | テーブル構造、制約、データ型。 |
| 3 | SKM-DEV-001 | 開発ルール | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` | セキュリティ、デザイントークン、エラーレスポンス。 |
| 4 | SKM-FDS-MATCH-001 | 機能設計書 — マッチング＆おすすめ商品 | `docs/screen/Matching_And_Recommendation/機能設計書_Matching_And_Recommendation.md` | ユースケース、状態遷移、業務ルール、エラー処理。 |

---

## 2. 画面概要・目的

### 2.1 目的

おすすめ商品ページは、Cosmetics Finderにおけるパーソナライズ商品探索の入口です。バイヤーのAI肌分析結果を基にスキンケア商品を提示し、カテゴリ、肌タイプ、価格帯、最低評価で絞り込めます。有効なAI分析結果がない場合は、汎用の注目商品・高評価商品を表示し、AI分析の実施を案内します。おすすめ履歴と、画面共通のスポンサー広告パネルも表示します。

### 2.2 対象ユーザーと権限

| 属性 | 値 |
| :--- | :--- |
| 主な利用者 | AI分析結果の有無を問わない、認証済みバイヤー |
| 認証 | バイヤールート。パーソナライズ／履歴APIにはJWTと`buyer`ロールが必要。類似商品APIは公開。 |
| データ範囲 | 利用可能な場合は本人の最新AI分析結果。汎用表示では全体の商品カタログのうち有効な商品。 |
| アクセス制御 | 保護ルート。Auth Route Guardを使用し、ゲストは`/login`へ遷移。 |

### 2.3 主要機能・基本設計方針

1. **パーソナライズおすすめ:** AI肌分析（肌タイプと肌悩み）に基づいて商品を順位付けする。
2. **マッチスコア表示:** おすすめカードに0〜100の一致スコアを表示する。
3. **フィルター:** カテゴリ、肌タイプ、価格帯、最低評価。成分検索はAPIで対応するが、画面に操作項目はない。
4. **分析結果に応じた表示:** 分析結果があればAIおすすめ、なければ案内付きの汎用おすすめを表示する。
5. **おすすめ履歴:** AI分析結果に基づく過去のおすすめセッションを表示する。
6. **スポンサー広告:** `recommendation_page_banner`配置で共通`AdBannerSlider`を使用し、クリック／表示計測を行う。
7. **購入操作と表示形式:** ウィッシュリスト、在庫商品のカート追加、グリッド／リスト表示に対応する。
8. **レスポンシブ表示:** 標準1列、`sm`で2列、`lg`で3列。`lg`以上ではサイドバー、それ未満ではフィルターシートを使う。

---

## 3. 画面レイアウト構成

### 3.1 画面全体

画面はヘッダー、条件に応じた分析案内、広告パネル、フィルター、商品一覧、履歴、エラー／空状態で構成します。

| 領域 | 表示内容 |
| :--- | :--- |
| [A] ヘッダー | 「あなたへのおすすめ」、分析元バッジ、結果件数などのサブタイトル。 |
| [A4] プロフィール案内 | 分析結果がない場合は分析開始案内。分析結果が24時間より古い場合は再分析の案内。 |
| [B] フィルター | カテゴリ、肌タイプ、価格、評価。画面には成分フィルターを表示しない。 |
| [C] おすすめ一覧 | 商品カード。AI由来ではマッチスコアを表示。カテゴリバッジは返却値がある場合に表示。 |
| [C5] ページネーション | 複数ページがある場合、全画面幅で番号付きページネーションを表示。 |
| [D0] 広告パネル | 条件を満たす広告を最大5件表示する共通カルーセル。 |
| [E] おすすめ履歴 | 完了済みの分析履歴がある場合に表示。日付ごとのセッションを展開できる。 |
| [F] エラー／空状態 | APIエラー時の再試行案内、または該当商品がない場合のフィルターリセット案内。 |

### 3.2 表示状態

| 状態 | 表示 |
| :--- | :--- |
| AI分析あり（`source = "ai"`） | AI分析バッジ、マッチスコア付き商品、肌タイプ条件。 |
| 汎用（`source = "generic"`） | 汎用おすすめバッジ、分析開始案内、カテゴリバッジ付き商品。マッチスコアは表示しない。 |
| 古い分析結果（24時間超） | AI分析結果を引き続き使用し、最新結果を得るための再分析案内を表示。 |

### 3.3 レスポンシブブレークポイント

| ブレークポイント | 最小幅 | 表示 |
| :--- | :--- | :--- |
| モバイル（標準） | 0px | フィルターシート、1列グリッド、番号付きページネーション。 |
| Small（`sm:`） | 640px | 2列グリッド。`lg`未満ではフィルターシート。 |
| デスクトップ（`lg:`） | 1024px | サイドバーフィルター、3列グリッド、番号付きページネーション。 |
| ワイド（`xl:`） | 1280px | デスクトップと同じ構成で余白を拡張。 |

---

## 4. 画面項目定義

項目ID、APIフィールド名、DB列名、ルート、列挙値は実装との対応を維持するため原表記を残しています。

### 4.1 [A] ページヘッダー

| No. | 項目ID | 項目名 | 型／表示 | 初期値・条件 | データ元・備考 |
| :--: | :--- | :--- | :--- | :--- | :--- |
| 1 | `lblPageTitle` | ページタイトル | 見出し（`<h1>`） | 常に「あなたへのおすすめ」。 | 固定表示。i18nキー:`matching.title`。 |
| 2 | `lblSourceBadge` | データ元バッジ | バッジ | AI時は「AI分析」、汎用時は「おすすめピック」。 | `response.source`。AIはemerald、汎用はamber。 |
| 3 | `lblSourceSubtitle` | サブタイトル | テキスト | AI時は肌タイプ・件数、汎用時は注目商品を表示中である旨。 | `response.source`、`response.meta.total`。 |
| 4 | `lnkStartAnalysis` | 肌分析開始CTA | リンク／ボタン | 汎用時は表示。AI分析が24時間超なら再分析CTAを表示。それ以外は非表示。 | `/buyer/skin-analysis`へ遷移。 |
| 5 | `lblProfilePromptHeading` | 案内見出し | 見出し | 汎用時はパーソナライズ案内。古い分析時は最新結果の案内。 | [A4]に表示。 |
| 6 | `lblProfilePromptBody` | 案内本文 | テキスト | 汎用時は分析実施を案内。古い分析時は再分析を案内。 | [A4]に表示。 |
| 7 | `imgProfilePromptIllustration` | 案内イラスト | 画像 | 汎用時のみAI肌分析イラストを表示。 | 静的アセット。代替テキストを設定。 |

### 4.2 [B] フィルターパネル

| No. | 項目ID | 項目名 | 型 | 初期値・制約 | データ元・備考 |
| :--: | :--- | :--- | :--- | :--- | :--- |
| 8 | `lblFiltersTitle` | フィルター見出し | 見出し | 「フィルター」。 | i18nキー:`matching.filtersTitle`。 |
| 9 | `chkSkinType` | 肌タイプ | チェックボックス群 | `SKIN_TYPES`の値。選択状態はURL状態による。 | 分析結果／URLの`skinTypes`。互換性と`all`タグのルールを適用。 |
| 10 | `txtMinPrice` | 最低価格 | 数値入力 | 空欄。0以上、小数点以下2桁。 | URLの`minPrice`。価格が指定値以上。 |
| 11 | `txtMaxPrice` | 最高価格 | 数値入力 | 空欄。0以上。最低価格との大小関係を検証。 | URLの`maxPrice`。価格が指定値以下。 |
| 12 | — | カテゴリ | 選択コントロール | 実装済みカテゴリ条件。 | 現行画面のカテゴリフィルター。 |
| 13 | `ingredients` | 成分 | APIクエリのみ | 画面には表示しない。 | `ingredients`クエリ。商品成分のいずれかに一致。 |
| 14 | `selSortField` | 並び替え項目 | 選択リスト | 既定は`createdAt desc`（新着順）。AI結果ではマッチスコアも選択可能。 | URLの`sort`。APIは`matchScore`、`price`、`rating`、`createdAt`に対応。 |
| 15 | `selSortOrder` | 並び順 | 選択リスト | `asc`または`desc`。 | URLの`order`。 |
| 16 | `btnResetFilters` | フィルターリセット | ボタン | 全条件を既定値に戻し、`page`を1にする。 | i18nキー:`matching.filters.reset`。 |
| 17 | `btnApplyFilters` | フィルター適用 | ボタン | モバイルで表示。読み込み中は無効化。 | 現在の条件で取得。 |
| — | — | 最低評価 | 選択コントロール | 3.0+、3.5+、4.0+、4.5+。 | 現行の評価フィルター。 |

### 4.3 [C] おすすめグリッドと商品カード

| No. | 項目ID | 項目名 | 型 | 表示・制約 | データ元・備考 |
| :--: | :--- | :--- | :--- | :--- | :--- |
| 18 | `grdRecommendations` | おすすめ一覧 | レスポンシブグリッド | 初回ロード時はスケルトン。再取得時は既存結果を保持。1／2／3列。 | `response.data`。グリッド／リスト表示を切替可能。 |
| 19 | `cardRecommendation` | 商品カード | カード | 画像、販売者、商品名、評価・レビュー、肌タイプ、価格、バッジ、任意のスコア。 | カードから`/buyer/products/:slug`へ遷移。 |
| 20 | `lblMatchScore` | マッチスコア | 0〜100の整数バッジ | AI由来の場合のみ表示。例:「92%一致」。 | `data[i].matchScore`。emeraldからtealのグラデーション。 |
| 21 | `lblCategoryBadge` | カテゴリバッジ | 列挙値 | 値がある場合に表示。優先順は注目、高評価、ベストセラー、新着。 | `data[i].categoryBadge`。値は`featured`、`topRated`、`bestSeller`、`new`、またはnull。 |
| 22 | `imgProduct` | 商品画像 | 画像URL | 主画像、1:1、遅延読み込み。 | `data[i].images[0]`。代替テキストは商品名。 |
| 23 | `lblProductName` | 商品名 | テキスト | 2行で省略。 | `data[i].name`。 |
| 24 | `lblProductSlug` | 商品スラッグ | 非表示テキスト | カード遷移先に使用。 | `data[i].slug`。 |
| 25 | `lblProductPrice` | 商品価格 | 10進数文字列 | ロケール形式で表示し、末尾に`Ks`。 | `data[i].price`。 |
| 26 | `lblCompareAtPrice` | 参考価格 | 10進数文字列 | 値がある場合に取消線で表示。 | `data[i].compareAtPrice`。 |
| 27 | `lblAvgRating` | 平均評価 | 10進数文字列 | 例:「★ 4.70」。 | `data[i].avgRating`。 |
| 28 | `lblReviewCount` | レビュー数 | 整数 | 例:「(128)」。 | `data[i].reviewCount`。 |
| 29 | `lblSkinTypeTags` | 肌タイプタグ | 列挙値配列 | 商品名の下に小さなタグで表示。 | `data[i].skinTypes`。 |
| 30 | `lblOutOfStock` | 在庫切れ表示 | バッジ | `isInStock = false`の場合「在庫切れ」。 | `data[i].isInStock`。 |
| 50 | `viewToggle` | グリッド／リスト切替 | トグル | 既定はグリッド。リストはカードを縦積みにする。 | ページ内状態。API条件は変更しない。 |
| 51 | `btnWishlist` | ウィッシュリスト切替 | ボタン | 登録状態をハートで示し、追加／削除する。 | 認証必須。ゲストにはログイン案内。 |
| 52 | `btnAddToCart` | カートに追加 | ボタン | 在庫がある場合に表示し、数量1で追加。 | 認証必須。重複商品はダイアログで案内。 |

### 4.4 [C5/C6] ページネーション

| No. | 項目ID | 項目名 | 型 | 表示・制約 | 備考 |
| :--: | :--- | :--- | :--- | :--- | :--- |
| 31 | `pagPagination` | ページ操作 | ページネーション | 複数ページがある場合、前後ボタンとページ番号を全画面幅で表示。ページは1以上。 | 件数のフロント既定値は12。最大ページは`response.meta.totalPages`。 |
| 32 | `btnLoadMore` | もっと見る | ボタン | 未実装。表示しない。 | モバイル／デスクトップとも番号付きページネーションを使用。 |

### 4.5 [E] おすすめ履歴

| No. | 項目ID | 項目名 | 型 | 表示・制約 | 備考 |
| :--: | :--- | :--- | :--- | :--- | :--- |
| 33 | `lblHistoryTitle` | 履歴見出し | 見出し | 完了済みの分析履歴があれば、現在の`source`に関係なく表示。 | 「これまでのおすすめ」。 |
| 34 | `accHistorySessions` | 履歴セッション | アコーディオン | 新しい分析から表示。初回取得は5件。 | `GET /api/v1/recommendations/history`。追加取得は最大50件。 |
| 35 | `cardHistoryProduct` | 履歴商品カード | コンパクトカード | 商品画像、商品名、スコア、価格を表示。 | クリックで`/buyer/products/:id`へ遷移。 |
| 36 | `emptyHistory` | 履歴なし表示 | 空状態 | 完了済みセッションがない場合、「おすすめ履歴はまだありません」。 | 現在の`source`に依存しない。 |

### 4.6 [D0] 画面共通広告パネル

| No. | 項目ID | 項目名 | 型 | 表示・制約 | 備考 |
| :--: | :--- | :--- | :--- | :--- | :--- |
| 37 | `pnlAdSlideDown` | スポンサーバナー | 共通`AdBannerSlider` | 広告がある場合におすすめのデータ元と独立して表示。 | 配置は`recommendation_page_banner`。 |
| 38 | `imgAdBanner` | 広告画像 | 画像URL | 各スライドの画像。16:9、遅延読み込み。 | `ads[i].imageUrl`。 |
| 39 | `lblAdTitle` | 広告タイトル | テキスト | スライド中央に表示。 | `ads[i].title`。 |
| 40 | `lblAdDescription` | 広告説明 | テキスト | タイトルの下に表示。nullの場合あり。 | `ads[i].description`。 |
| 41 | `btnAdCta` | 広告CTA | ボタン | 「今すぐ購入」「商品を見る」「カートに追加」等。リンクがnullなら非表示または無効。 | `ads[i].linkUrl`へ遷移。 |
| 42 | `btnAdPrev` | 前の広告 | アイコンボタン | 左矢印。自動切替を操作する。 | — |
| 43 | `btnAdNext` | 次の広告 | アイコンボタン | 右矢印。自動切替を操作する。 | — |
| 44 | `dotAdIndicators` | 広告位置表示 | ドット群 | 現在のスライドを塗りつぶしドットで示す。 | — |
| 45 | `lblAdDisclosure` | 広告開示フッター | テキスト | 未実装。独立フッターはなく、既定`SPONSORED`の告知バッジを表示。 | 共通バナーの責務。 |

### 4.7 [F] エラー・空状態

| No. | 項目ID | 項目名 | 型 | 表示・制約 | 備考 |
| :--: | :--- | :--- | :--- | :--- | :--- |
| 46 | `alertError` | エラーバナー | Alert（destructive） | APIエラー時にメッセージと再試行ボタンを表示。既定は非表示。 | エラーレスポンスに基づく。 |
| 47 | `btnRetry` | 再試行 | ボタン | エラーバナー内に表示し、失敗したクエリを再取得。 | — |
| 48 | `emptyResults` | 検索結果なし | 空状態 | `total = 0`の場合、該当商品がない旨とリセット操作を表示。 | `response.meta.total = 0`。 |
| 49 | `btnResetFiltersEmpty` | 空状態のリセット | ボタン | 全フィルターを既定値に戻す。 | — |

---

## 5. 項目の動作・イベント仕様

### 5.1 ページ読み込みとデータ元の決定

**起点:** バイヤーが`/buyer/recommendations`へ移動。

1. JWTと`buyer`ロールを確認する。無効な場合は`/login`へ遷移する。
2. バックエンドは完了日時がnullでない最新の完了済み分析を選ぶ。経過時間は対象判定に影響しない。
3. 最新分析があれば（24時間を超えていても）`source = "ai"`、分析がなければ`source = "generic"`とする。
4. 既定条件で`GET /api/v1/recommendations/personalized`を呼び出す。
5. バックエンドはユーザー単位のRedisキャッシュを確認する（TTL 5分）。HITならキャッシュを返し、MISSならDB検索・スコア計算後にキャッシュする。
6. データ元に応じた商品カードを表示する。汎用結果ではプロフィール案内を出し、完了済み履歴はデータ元とは独立して表示する。

エラー処理: `401`は`/login`、`403`は`/unauthorized`へ遷移。`500`とネットワークエラーは再試行ボタン付きのエラーバナーを表示する。

### 5.2 肌タイプフィルター変更

チェック変更時にURLの`skinTypes`（カンマ区切り）を更新し、`page`を1に戻して再取得する。バックエンドは`products.skin_types`に`hasSome`条件を適用する（BR-MATCH-016）。

### 5.3 価格フィルター変更

最低価格と最高価格はいずれも0以上で検証する。最低価格が最高価格を上回る場合は項目内エラーを表示する。URLの`minPrice`／`maxPrice`を更新し、ページを1に戻して再取得する。

### 5.4 成分検索（APIのみ）

画面には成分操作がない。`ingredients`を含むAPI／クエリ文字列を直接受けた場合、バックエンドは既知の成分キーをカタログ表記に対応付け、要求された成分のいずれかを含む商品を抽出する。

### 5.5 フィルターのリセット

`skinTypes`、`ingredients`、`minPrice`、`maxPrice`等のフィルター条件をクリアし、`page`を1に戻す。並び順を既定の`createdAt desc`（新着順）に戻して再取得する。

### 5.6 並び替え変更

URLの`sort`と`order`を更新して`page`を1に戻し、再取得する。APIの対応項目は`matchScore`、`price`、`rating`、`createdAt`。既定は新着順で、マッチスコアはAI結果の場合のみ選択できる。不正な項目は`VAL-MATCH-006`とする。

### 5.7 ページ移動

ページ番号または前後ボタンの操作でURLの`page`を更新し、TanStack Queryの`keepPreviousData`を使って再取得する。取得中は既存結果を表示し、ページ変更時に自動スクロールしない。

### 5.8 「もっと見る」

未実装。モバイルとデスクトップの両方で番号付きページネーションを使用し、結果を追記する処理はない。

### 5.9 商品カード選択

商品画像または商品名を選択すると`/buyer/products/:slug`へ移動する。

### 5.10 履歴セッションの展開／折りたたみ

履歴行を選択すると展開状態を切り替える。展開時は画像・商品名・スコア・価格を含む商品カードを表示し、折りたたみ時は日付と矢印のみを表示する。

### 5.11 広告パネルの自動切替

パネル表示時に5秒間隔の自動切替を開始する（BR-MATCH-048）。ホバー中、キーボードフォーカス中、または動きを減らす設定時は停止する。バナー／CTAの選択で広告遷移を実行する。

### 5.12 広告表示計測

IntersectionObserverでパネルの50%以上が表示された時点で、表示中の広告IDを`POST /api/v1/ads/track/impression`へ送信する。ユーザー向けエラーは表示しない。

### 5.13 広告CTA選択

CTA選択時に`adId`を`POST /api/v1/ads/track/click`へ送信する。SKU商品、フォールバック商品、設定済みターゲット／リンク、商品カタログの順に遷移先を解決する。HTTP(S)リンクはページ全体を遷移する。

### 5.14 肌分析開始CTA

プロフィール案内のCTAから`/buyer/skin-analysis`へ移動する。

### 5.15 ウィッシュリストとカート

ウィッシュリスト操作は追加／削除を切り替え、成功または競合の案内を表示する。ゲストには復帰先URLを付けたログインダイアログ、バイヤー以外にはトーストを表示する。カート追加は在庫商品のみで数量1を送信する。重複時は専用ダイアログを出し、その他の失敗はエラートーストで通知する。

---

## 6. バリデーション・エラーメッセージ対応

### 6.1 フィルターの入力エラー

| エラーコード | 対象 | 条件 | 表示方法 | 日本語メッセージ |
| :--- | :--- | :--- | :--- | :--- |
| `VAL-MATCH-001` | `chkSkinType` | 肌タイプの列挙値が不正 | グループ下に表示 | 無効な肌タイプです |
| `VAL-MATCH-002` | `chkIngredients` | 成分形式が不正 | グループ下に表示 | 無効な成分です |
| `VAL-MATCH-003` | `txtMinPrice` | 価格が0未満 | 赤枠と項目下の文言 | 最低価格は0以上である必要があります |
| `VAL-MATCH-004` | `txtMaxPrice` | 価格が0未満、または最低価格より小さい | 赤枠と項目下の文言 | 最高価格は0以上である必要があります |
| `VAL-MATCH-006` | 並び替え | 並び替え項目が不正 | 項目内に表示 | 無効な並び順項目です |
| `VAL-MATCH-007` | 並び替え | 並び順が不正 | 項目内に表示 | 無効な並び順です |
| `VAL-MATCH-008` | `pagPagination` | ページが1未満 | 項目内に表示 | ページは1以上である必要があります |
| `VAL-MATCH-009` | `pagPagination` | 件数が1未満または50超 | 項目内に表示 | 件数は1〜50の間である必要があります |

### 6.2 APIエラー

| エラーコード | HTTP | 状況 | 画面上の処理 | 日本語メッセージ |
| :--- | :--- | :--- | :--- | :--- |
| `MATCH_001` | 400 | パラメーター検証失敗 | 入力ヒントと上部バナー | リクエストパラメーターが無効です |
| `MATCH_002` | 401 | トークンなし／無効 | `/login`へ遷移 | 続行するにはログインしてください |
| `MATCH_003` | 403 | バイヤー以外のロール | `/unauthorized`へ遷移 | このページにアクセスする権限がありません |
| `MATCH_004` | 404 | 類似商品が見つからない | 空状態／セクション非表示 | 商品が見つかりません |
| `MATCH_005` | 429 | レート制限超過 | 待機案内とカウントダウン | リクエストが多すぎます。{seconds}秒お待ちください |
| `MATCH_006` | 500 | サーバーエラー | 再試行ボタン付きエラーバナー | 問題が発生しました |
| `NET_ERR` | — | ネットワークエラー | エラーバナー | ネットワークエラー。接続を確認してください |

---

## 7. データベース項目対応

### 7.1 おすすめカードとDB

| 画面項目 | APIレスポンス | DB列 | テーブル | 型 |
| :--- | :--- | :--- | :--- | :--- |
| `cardRecommendation` | `data[i].id` | `id` | `products` | UUID |
| `lblProductName` | `data[i].name` | `name` | `products` | VARCHAR(255) |
| `imgProduct` | `data[i].images[0]` | `images` | `products` | TEXT[] |
| `lblProductPrice` | `data[i].price` | `price` | `products` | DECIMAL(10,2) |
| `lblCompareAtPrice` | `data[i].compareAtPrice` | `compare_at_price` | `products` | DECIMAL(10,2) |
| `lblAvgRating` | `data[i].avgRating` | `avg_rating` | `products` | DECIMAL(3,2) |
| `lblReviewCount` | `data[i].reviewCount` | `review_count` | `products` | INTEGER |
| `lblMatchScore` | `data[i].matchScore` | メモリ上で算出 | — | INTEGER（0〜100） |
| `lblSkinTypeTags` | `data[i].skinTypes` | `skin_types` | `products` | TEXT[] |
| `lblOutOfStock` | `data[i].isInStock` | `stock_quantity`から導出 | `products` | INTEGERから導出 |
| `lblCategoryBadge` | `data[i].categoryBadge` | 商品属性から導出 | `products` | 列挙値またはnull |

### 7.2 フィルターとDB

| フィルター | APIクエリ | DB列 | テーブル | 条件 |
| :--- | :--- | :--- | :--- | :--- |
| `chkSkinType` | `skinTypes` | `skin_types` | `products` | Prisma `hasSome` |
| 最低価格 | `minPrice` | `price` | `products` | `>=` |
| 最高価格 | `maxPrice` | `price` | `products` | `<=` |
| `chkIngredients`（APIのみ） | `ingredients` | `ingredients` | `products` | Prisma `hasSome` |
| カテゴリ | カテゴリクエリ | カテゴリ項目 | `products` | 実装のカテゴリ条件 |
| 最低評価 | 評価クエリ | `avg_rating` | `products` | 指定評価以上 |

### 7.3 広告パネルとDB

| 画面項目 | APIレスポンス | DB列 | テーブル | 型 |
| :--- | :--- | :--- | :--- | :--- |
| `imgAdBanner` | `ads[i].imageUrl` | `image_url` | `advertisements` | TEXT |
| `lblAdTitle` | `ads[i].title` | `title` | `advertisements` | VARCHAR(255) |
| `lblAdDescription` | `ads[i].description` | `content` | `advertisements` | TEXT（null可） |
| `btnAdCta` | `ads[i].linkUrl` | `link_url` | `advertisements` | TEXT（null可） |
| 広告主 | `ads[i].shopName` | `name` | `shops` | VARCHAR(255) |

---

## 8. APIレスポンス例

以下のJSONキー、列挙値、URLはAPI契約との互換性のため原表記を維持しています。画面の既定ページ件数は12です。例はAPI応答形状を示すサンプル値です。

### 8.1 AIパーソナライズおすすめ — 成功レスポンス

```json
{
  "data": [
    {
      "id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      "name": "Vitamin C Brightening Serum",
      "slug": "vitamin-c-brightening-serum",
      "price": "4980",
      "compareAtPrice": "6980",
      "images": ["https://cdn.example.com/products/vitamin-c-1.webp"],
      "brandName": "GlowLab",
      "shortDescription": "Brightening serum",
      "categoryBadge": "topRated",
      "analysisAge": 2,
      "skinTypes": ["oily", "combination"],
      "avgRating": "4.70",
      "reviewCount": 128,
      "isFeatured": true,
      "isInStock": true,
      "matchScore": 92
    }
  ],
  "meta": { "page": 1, "limit": 12, "total": 156, "totalPages": 13 },
  "source": "ai"
}
```

### 8.2 汎用おすすめ — 成功レスポンス

```json
{
  "data": [
    {
      "id": "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e",
      "name": "Hydrating Moisturizer",
      "slug": "hydrating-moisturizer",
      "price": "3200",
      "compareAtPrice": null,
      "images": ["https://cdn.example.com/products/moisturizer-1.webp"],
      "brandName": "GlowLab",
      "shortDescription": "Daily moisturizer",
      "categoryBadge": "featured",
      "analysisAge": null,
      "skinTypes": ["dry", "normal"],
      "avgRating": "4.50",
      "reviewCount": 89,
      "isFeatured": true,
      "isInStock": true,
      "matchScore": null
    }
  ],
  "meta": { "page": 1, "limit": 12, "total": 230, "totalPages": 20 },
  "source": "generic"
}
```

### 8.3 広告パネル — 成功レスポンス

```json
{
  "data": [
    {
      "adId": "adv_abc456",
      "title": "Vitamin C Brightening Serum",
      "description": "Dermatologist-recommended for dull skin",
      "imageUrl": "https://cdn.example.com/ads/vitamin-c-banner.webp",
      "linkUrl": "/buyer/products/a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      "ctaText": "Shop Now",
      "priorityAmount": "8.00",
      "shopName": "GlowLab"
    }
  ],
  "placement": "recommendation_page_banner",
  "meta": { "total": 5, "maxAds": 5 }
}
```

### 8.4 おすすめ履歴 — 成功レスポンス

```json
{
  "data": [
    {
      "sessionId": "c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f",
      "sessionDate": "2026-08-20T14:30:00.000Z",
      "skinTypesUsed": ["oily", "combination"],
      "products": [
        {
          "id": "d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f80",
          "name": "Vitamin C Brightening Serum",
          "slug": "vitamin-c-brightening-serum",
          "price": "4980",
          "images": ["https://cdn.example.com/products/vitamin-c-1.webp"],
          "matchScore": 92
        }
      ]
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 5, "totalPages": 1 }
}
```

### 8.5 エラーレスポンス

```json
{
  "statusCode": 400,
  "message": ["limit must not be greater than 50"],
  "error": "Bad Request",
  "timestamp": "2026-08-28T12:00:00.000Z",
  "path": "/api/v1/recommendations/personalized"
}
```

---

## 9. i18nキー一覧

> **実装状況（2026-10-15）:** 以下のキーは画面に接続されていません。`MatchingRecommendations.tsx`と機能コンポーネントは英語文字列を直接表示し、`useTranslation`を使っていません。共通`AdBannerSlider`のラベルのみ翻訳されます。`matching.filters.ingredients`と`matching.loadMore`は現行画面にないUIを表します（成分はAPIのみ、ページ移動は番号付きページネーション）。以下は将来のi18n対応に向けた定義です。

### 9.1 日本語（ja）— おすすめ商品ページ

| キー | 日本語表示 |
| :--- | :--- |
| `matching.title` | あなたへのおすすめ |
| `matching.source.ai` | AI分析 |
| `matching.source.generic` | おすすめピック |
| `matching.subtitle.ai` | AI分析に基づく · {skinType} · {count}件の結果 |
| `matching.subtitle.generic` | おすすめ商品を表示中 · スキン分析が見つかりません |
| `matching.profilePrompt.heading` | パーソナライズされたおすすめを受け取る |
| `matching.profilePrompt.body` | AI肌分析を実行して、あなたの肌タイプや悩みに合った商品を受け取りましょう |
| `matching.profilePrompt.cta` | 肌分析を開始 → |
| `matching.profilePrompt.retake.heading` | 最新の結果を確認しますか？ |
| `matching.profilePrompt.retake.body` | 肌分析をやり直して、最新のおすすめを受け取りましょう |
| `matching.profilePrompt.retake.cta` | 肌分析をやり直す → |
| `matching.filtersTitle` | フィルター |
| `matching.filters.skinType` | 肌タイプ |
| `matching.filters.minPrice` | 最低価格 |
| `matching.filters.maxPrice` | 最高価格 |
| `matching.filters.ingredients` | 成分 |
| `matching.filters.reset` | フィルターをリセット |
| `matching.filters.apply` | フィルターを適用 |
| `matching.card.matchScore` | {score}%一致 |
| `matching.card.category.featured` | おすすめ |
| `matching.card.category.topRated` | 高評価 |
| `matching.card.category.bestSeller` | ベストセラー |
| `matching.card.category.new` | 新着 |
| `matching.card.outOfStock` | 在庫切れ |
| `matching.pagination.previous` | 前へ |
| `matching.pagination.next` | 次へ |
| `matching.loadMore` | もっと見る |
| `matching.historyTitle` | これまでのおすすめ |
| `matching.historyEmpty` | おすすめ履歴はまだありません |
| `matching.empty` | 一致する商品がありません |
| `matching.empty.resetFilters` | フィルターをリセット |
| `matching.errors.serverError` | 問題が発生しました |
| `matching.errors.retry` | 再試行 |
| `matching.errors.network` | ネットワークエラー。接続を確認してください |
| `matching.sort.field` | 並び順 |
| `matching.sort.order` | 並び方向 |
| `matching.adPanel.disclosure` | スポンサー商品はマーチャントによる有料掲載です |

### 9.2 英語（en）・ミャンマー語（my）

英語（en）とミャンマー語（my）の各キー・値は翻訳対象ではなく、キー参照用のため原文書に記載された表記を維持します。日本語値については上表を参照してください。

---

## 10. 共有コンポーネント

### 10.1 RecommendationCard

| 属性 | 値 |
| :--- | :--- |
| 配置 | `frontend/src/pages/buyer/MatchingRecommendations.tsx`内でカードをインライン描画。`features/buyer/matching/components/RecommendationCard.tsx`も存在するが、このページからはimportされていない。 |
| 目的 | おすすめグリッドの商品カード。 |

```typescript
interface RecommendationCardProps {
  id: string;
  name: string;
  slug: string;
  price: string;
  images: string[];
  skinTypes: string[];
  matchScore: number | null;
  isFeatured: boolean;
  isInStock: boolean;
  source: 'ai' | 'generic';
  onClick: () => void;
}
```

### 10.2 共通広告`AdBannerSlider`

| 属性 | 値 |
| :--- | :--- |
| 配置 | `frontend/src/components/shared/AdBannerSlider.tsx`。設計上のパス`frontend/src/components/AdSlidePanel.tsx`は存在しない。 |
| 目的 | 画面横断で再利用するスポンサー広告カルーセル。 |

```typescript
interface AdBannerSliderProps {
  placement: AdBannerPlacement; // この画面では 'recommendation_page_banner'
  fallbackProductId?: string;
  onImpression?: (adIds: string[]) => void;
  onAdClick?: (adId: string) => void;
}
```

### 10.3 FiltersPanel

配置: `frontend/src/features/buyer/matching/components/FiltersPanel.tsx`。デスクトップのサイドバーと、モバイルの`Sheet`内のフィルター（カテゴリ、肌タイプ、価格、評価。成分はなし）を担当します。

### 10.4 SkeletonGrid

配置: `frontend/src/features/buyer/matching/components/SkeletonGrid.tsx`。おすすめグリッドの読み込み中にスケルトン表示を行います。設計上の名称`SkeletonRecommendationGrid.tsx`に代わる実装名です。

---

## 11. 特記事項・UI仕様

- **デザインシステム:** ラグジュアリー化粧品テーマ。Primary `#7C3AED`（紫）、Accent `#EC4899`（ピンク）、Secondary `#F3E8FF`（ラベンダー）。CTAはローズゴールド。
- **レスポンシブグリッド:** 標準1列、`sm`で2列、`lg`で3列。
- **フィルター:** `lg`以上はサイドバー、それ未満はフィルターシート。
- **アクセシビリティ:** すべての操作をキーボードで利用可能にする。ARIAラベルを付け、エラーは`role="alert"`で通知する。広告パネルに`aria-roledescription="carousel"`を設定する。
- **読み込み:** 初回はスケルトンを表示する。再取得／ページ移動中は既存結果を維持し、更新中であることを示す。ソースコード上の表示時間保証はない。
- **セキュリティ:** ユーザー入力をサニタイズ（XSS対策）する。Prismaのパラメーター化クエリを使用する。パーソナライズAPIにはJWTを必須とし、本番で`console.log`を出さない。
- **デザイントークン:** マッチスコアは`bg-gradient-to-r from-emerald-500 to-teal-500`。カテゴリバッジは注目`bg-amber-100 text-amber-800`、高評価`bg-teal-100 text-teal-800`、ベストセラー`bg-orange-100 text-orange-800`、新着`bg-purple-100 text-purple-800`。
- **キャッシュ:** パーソナライズ結果をRedisに5分間キャッシュする。キーは`cache:recommendations:user:{userId}:{hashOfQuery}`。新しいAI分析時に無効化する。

---

## 12. テストチェックリスト

### 12.1 ページ読み込み・データ元

- [ ] AI分析済みの認証バイヤーでは`source = "ai"`、緑色バッジ、マッチスコアが表示される。
- [ ] 24時間を超えた分析でも`source = "ai"`とスコアを表示し、「最新結果を確認しますか？」の案内を表示する。
- [ ] 分析未実施の認証バイヤーでは`source = "generic"`、琥珀色バッジ、プロフィール案内を表示する。
- [ ] 未認証ユーザーは`/login`へ遷移する。
- [ ] バイヤー以外のロールは`/unauthorized`へ遷移する。
- [ ] NFR-001に従い2秒以内にページを読み込む。
- [ ] 読み込み中にスケルトングリッドを表示する。

### 12.2 フィルター

- [ ] AI結果では分析に基づく肌タイプが選択される。
- [ ] 汎用結果では肌タイプがすべて未選択。
- [ ] 肌タイプ変更で正しい`hasSome`条件を付けて再取得する。
- [ ] 最低価格・最高価格とも0以上を検証する。
- [ ] 最低価格が最高価格を上回る場合、項目内エラーを表示する。
- [ ] 評価条件に3.0+、3.5+、4.0+、4.5+がある。
- [ ] 成分フィルターはAPIのみで、画面には表示されない。
- [ ] 並び替えに新着、価格昇順／降順、高評価があり、AI結果ではマッチスコアも選べる。
- [ ] リセットで全条件を消去し、`page`を1に戻す。
- [ ] フィルターまたは並び替えの変更で`page`が1に戻る。

### 12.3 おすすめグリッド

- [ ] デスクトップ（`lg`、1024px以上）で3列。
- [ ] `sm`（640px以上）で2列。
- [ ] `sm`未満（640px未満）で1列。
- [ ] マッチスコアは`source = "ai"`の場合のみ表示。
- [ ] `categoryBadge`がnull以外なら、データ元に関係なくカテゴリバッジを表示。
- [ ] 商品名は2行で省略。
- [ ] 価格を整形して表示。
- [ ] 在庫切れの場合に表示を出す。
- [ ] カード選択で`/buyer/products/:slug`へ移動。

### 12.4 ページネーション

- [ ] デスクトップでページ番号付き操作を表示。
- [ ] 複数ページがあればモバイルでも番号付き操作を表示。
- [ ] ページ変更で再取得する。
- [ ] 選択ページの商品に置き換え、既存結果への追記はしない。
- [ ] ページ移動中にスケルトンを表示する。

### 12.5 おすすめ履歴

- [ ] 完了済み分析履歴があれば、どちらの`source`でも表示する。
- [ ] 履歴は完了済み分析セッション由来で、現在のおすすめデータ元とは独立している。
- [ ] 分析日ごとにセッションをまとめる。
- [ ] アコーディオンの展開／折りたたみが動作する。
- [ ] 展開行に画像、商品名、スコア、価格を含むミニカードを表示する。
- [ ] 過去セッションがない場合に履歴なし表示を出す。

### 12.6 広告パネル（D0）

- [ ] `source = "ai"`と`source = "generic"`の両方で表示する。
- [ ] 広告スライドは最大5件。
- [ ] 5秒ごとに自動切替する。
- [ ] ホバー、キーボードフォーカス、動きを減らす設定で自動切替を一時停止する。
- [ ] バナー／CTA選択でコンポーネントの遷移先解決を行う。
- [ ] 告知バッジを表示し、独立した開示フッターは表示しない。
- [ ] 表示率が50%以上になった時にインプレッションを記録する。
- [ ] CTA選択時にクリックを記録する。

### 12.7 エラー処理

- [ ] 400では項目内ヒントと上部バナーを表示する。
- [ ] 401では`/login`へ遷移する。
- [ ] 403では`/unauthorized`へ遷移する。
- [ ] 不明な類似商品IDでは類似商品なしの空レスポンスを返す。
- [ ] 500では再試行ボタン付きエラーバナーを表示する。
- [ ] ネットワークエラーではネットワークエラーバナーを表示する。
- [ ] 再試行ボタンで最後に失敗したクエリを再取得する。

### 12.8 レスポンシブ・アクセシビリティ

- [ ] デスクトップ（1024px以上）でサイドバーフィルターと3列グリッド。
- [ ] `sm`（640px以上）で2列グリッド、`lg`未満ではフィルターシート。
- [ ] モバイル（640px未満）でフィルターシートと1列グリッド。
- [ ] すべての操作をキーボードで利用できる。
- [ ] 操作要素にARIAラベルが設定されている。

### 12.9 i18n

- [ ] アプリ共通の言語切替は、現状ハードコードされた英語ラベルをこの画面で翻訳しない。

---

*以上 — 画面項目設計書（マッチング＆おすすめ商品）*
