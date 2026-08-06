# 画面項目設計書 — サインアップ / ログイン

**ドキュメントID:** SKM-SIS-SCR-001  
**対象画面:** 認証（サインアップ / ログイン）  
**サブシステム:** ユーザー認証  
**機能ID:** FN-AUTH-001  
**バージョン:** 3.0  
**作成日:** 2026-08-04  
**最終更新日:** 2026-08-05  
**著者:** シニアシステムエンジニア  
**レビュー状態:** 承認済み  
**分類:** 社内 — エンジニアリング部門

---

## 1. ドキュメント管理

### 1.1 ドキュメント改訂履歴

| バージョン | 日付 | 著者 | 変更内容 |
| :--- | :--- | :--- | :--- |
| 1.0 | 2026-08-04 | シニアシステムエンジニア | 初版リリース。サインアップおよびログインページの基本的な画面項目仕様。 |
| 2.0 | 2026-08-05 | シニアシステムエンジニア | PRWM-SIS-SCR-001形式に完全準拠するよう全面改定。Item ID、コンポーネントタイプ、データソース、イベント仕様、バリデーションエラーコード、レスポンシブブレークポイント、アクセシビリティ要件を含む包括的な項目定義を追加。 |
| 3.0 | 2026-08-05 | シニアシステムエンジニア | 出品者ロール用の条件付きライセンスファイルアップロードを追加。「出品者」ラジオ選択時に事業許可書（license.pdf）のPDFファイルアップロードフィールドが表示。バリデーションルール、ファイル制約、イベント仕様を含む。 |

### 1.2 関連ドキュメント

| No. | ドキュメントID | ドキュメント名 | ファイルパス | 備考 |
| :-- | :--- | :--- | :--- | :--- |
| 1 | SKM-REQ-001 | 要件定義書 | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | ビジネスワークフローロジック、必須フィールド、ルール。 |
| 2 | SKM-DBS-001 | データベース設計書 | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | テーブル構造、制約、データ型。 |
| 3 | SKM-DEV-001 | 開発ルール | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` | セキュリティルール、デザイントークン、エラーレスポンス。 |
| 4 | SKM-FSD-SCR-001 | 機能設計書 — 認証 | `docs/screen/SignUp_LogIn/機能設計書_SignUp_Login.md` | ユースケース、状態遷移、バリデーションルール、エラーハンドリング。 |

---

## 2. 画面概要・目的

### 2.1 目的
サインアップおよびログインページは、Cosmetics Finderプラットフォームにおけるユーザー認証のエントリーポイントです。新規ユーザーがアカウント（購入者または出品者）を作成し、既存ユーザーがメールアドレスとパスワードで認証し、セッション管理用のJWTトークンを受け取ることができます。

### 2.2 対象ユーザーと権限

| 属性 | 値 |
| :--- | :--- |
| **プライマリアクター** | 未認証ビジター（サインアップ）、認証済みユーザー（ログイン） |
| **必要認証** | なし（これは認証前の画面です） |
| **データスコープ** | 新規ユーザー作成、既存ユーザー資格情報検証 |
| **アクセス制御** | 公開ルート — ガード不適用 |

### 2.3 主要機能・基本設計方針
1. **ユーザー登録** — ロール選択（購入者/出品者）で新規アカウントを作成。
2. **ユーザー認証** — 資格情報を検証し、JWTアクセストークン/リフレッシュトークンを発行。
3. **パスワードセキュリティ** — 強力なパスワードポリシーを適用、表示/非表示切替。
4. **フォームバリデーション** — リアルタイムフィードバック付きクライアント側バリデーション。
5. **エラーハンドリング** — エラーコード付きインラインおよびフォームレベルエラーの表示。
6. **国際化** — EN、JA、MYの完全i18nサポート。
7. **レスポンシブデザイン** — モバイルファーストのセンタードカードレイアウト。

---

## 3. 画面レイアウト構成

### 3.1 全体画面構成

#### ログインページレイアウト
```text
┌─────────────────────────────────────────────────────────┐
│                    ブラウザビューポート                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│              ┌─────────────────────────────┐            │
│              │      [A] ページヘッダー      │            │
│              │   ロゴ + システム名          │            │
│              │   "Cosmetics Finder"        │            │
│              └─────────────────────────────┘            │
│                                                         │
│              ┌─────────────────────────────┐            │
│              │   [B] エラーアラート（条件付き）│            │
│              │   APIエラー時に表示           │            │
│              └─────────────────────────────┘            │
│                                                         │
│              ┌─────────────────────────────┐            │
│              │   [C] ログインフォーム       │            │
│              │                             │            │
│              │   [C1] メールアドレス入力     │            │
│              │   [C2] パスワード入力        │            │
│              │       + 表示/非表示切替      │            │
│              │   [C3] 送信ボタン           │            │
│              │                             │            │
│              └─────────────────────────────┘            │
│                                                         │
│              ┌─────────────────────────────┐            │
│              │   [D] 新規登録リンク         │            │
│              │   "アカウントをお持ちでないですか？"│        │
│              └─────────────────────────────┘            │
│                                                         │
│              ┌─────────────────────────────┐            │
│              │   [E] フッターコントロール    │            │
│              │   [言語] [テーマ]            │            │
│              └─────────────────────────────┘            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### 登録ページレイアウト
```text
┌─────────────────────────────────────────────────────────┐
│                    ブラウザビューポート                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│              ┌─────────────────────────────┐            │
│              │      [A] ページヘッダー      │            │
│              │   ロゴ + システム名          │            │
│              │   "Cosmetics Finder"        │            │
│              └─────────────────────────────┘            │
│                                                         │
│              ┌─────────────────────────────┐            │
│              │   [B] エラーアラート（条件付き）│            │
│              │   APIエラー時に表示           │            │
│              └─────────────────────────────┘            │
│                                                         │
│              ┌─────────────────────────────┐            │
│              │   [F] 登録フォーム           │            │
│              │                             │            │
│              │   [F1] フルネーム入力        │            │
│              │   [F2] メールアドレス入力     │            │
│              │   [F3] パスワード入力        │            │
│              │       + 要件リスト          │            │
│              │       + 表示/非表示切替      │            │
│              │   [F4] パスワード確認        │            │
│              │       + 表示/非表示切替      │            │
│              │   [F5] ロール選択           │            │
│              │       （購入者 / 出品者）     │            │
│              │   [F6] ライセンスアップロード（条件付き）│ ← 新規 │
│              │       （出品者選択時に表示）   │            │
│              │   [F7] 送信ボタン           │            │
│              │                             │            │
│              └─────────────────────────────┘            │
│                                                         │
│              ┌─────────────────────────────┐            │
│              │   [G] ログインリンク         │            │
│              │   "すでにアカウントをお持ちですか？"│        │
│              └─────────────────────────────┘            │
│                                                         │
│              ┌─────────────────────────────┐            │
│              │   [H] フッターコントロール    │            │
│              │   [言語] [テーマ]            │            │
│              └─────────────────────────────┘            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 3.2 レスポンシブ対応

| ブレークポイント | 最小幅 | レイアウト動作 |
| :--- | :--- | :--- |
| モバイル（デフォルト） | 0px | フル幅カード、スタック入力、センタードレイアウト |
| タブレット（`md:`） | 768px | 最大幅400pxのセンタードカード |
| デスクトップ（`lg:`） | 1024px | 最大幅400pxのセンタードカード、強化されたスペーシング |
| ワイド（`xl:`） | 1280px | 最大幅400pxのセンタードカード |

---

## 4. 項目定義

### 4.1 セクション [A]: ページヘッダー

| No. | Item ID | 項目名（論理名） | コンポーネントタイプ | データ型＆最大長 | 必須 | 初期状態／デフォルト値 | 入力制約／フォーマット | データソース／DBマッピング | 備考／ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 1 | `lblLogo` | ロゴアイコン | アイコン（`Sparkles`） | — | — | 表示中。常に表示。 | — | ハードコードUI要素 | Lucide `Sparkles`アイコン。Tailwind: `h-5 w-5 text-primary`。 |
| 2 | `lblSystemName` | システム名 | 静的ラベル（`<span>`） | 文字列 | — | 表示中。常に表示。テキスト: "Cosmetics Finder" | — | ハードコードUIテキスト | Tailwind: `font-bold text-lg`。 |

### 4.2 セクション [B]: エラーアラート

| No. | Item ID | 項目名（論理名） | コンポーネントタイプ | データ型＆最大長 | 必須 | 初期状態／デフォルト値 | 入力制約／フォーマット | データソース／DBマッピング | 備考／ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 3 | `alertError` | エラーアラートバナー | アラート（`destructive`） | 文字列 | 条件付き | デフォルト非表示。APIエラー発生時に表示。 | — | APIエラーレスポンスメッセージ | Tailwind: `border-destructive/50 text-destructive`。閉じ可能。 |

### 4.3 セクション [C]: ログインフォーム

| No. | Item ID | 項目名（論理名） | コンポーネントタイプ | データ型＆最大長 | 必須 | 初期状態／デフォルト値 | 入力制約／フォーマット | データソース／DBマッピング | 備考／ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 4 | `lblEmail` | メールアドレスラベル | 静的ラベル（`<label>`） | 文字列 | — | 常に表示。テキスト: "メールアドレス" | — | ハードコードUIテキスト | `htmlFor`/`id`で`txtEmail`に関連付け。 |
| 5 | `txtEmail` | メールアドレス入力 | 入力（`email`） | 文字列(255) | 必須 | 空。プレースホルダー: "user@example.com" | フォーマット: 有効なメールアドレス。最大長: 255。 | `users.email` | AutoFocus: true。AutoComplete: `email`。InputMode: `email`。 |
| 6 | `lblPassword` | パスワードラベル | 静的ラベル（`<label>`） | 文字列 | — | 常に表示。テキスト: "パスワード" | — | ハードコードUIテキスト | `htmlFor`/`id`で`txtPassword`に関連付け。 |
| 7 | `txtPassword` | パスワード入力 | 入力（`password`） | 文字列(128) | 必須 | 空。プレースホルダー: "パスワードを入力" | 最小長: 8。最大長: 128。 | `users.password_hash` | AutoComplete: `current-password`。表示/非表示切替可能。 |
| 8 | `btnShowPassword` | パスワード表示/非表示 | アイコンボタン | — | — | 表示中。アイコン。 | — | — | `txtPassword`のタイプを`password`と`text`で切替。 |
| 9 | `btnLogin` | ログインボタン | ボタン（`submit`、`default`） | — | — | 表示中。テキスト: "ログイン" | — | — | 全幅。ローディング: スピナー + "ログイン中..."。ローディング中は無効。 |
| 10 | `lblNoAccount` | 新規登録プロンプト | 静的ラベル | 文字列 | — | テキスト: "アカウントをお持ちでないですか？" | — | — | フッターテキスト。 |
| 11 | `lnkSignUp` | 新規登録リンク | リンク（`<Link>`） | 文字列 | — | テキスト: "作成する" | — | — | `/register`にナビゲート。 |

### 4.4 セクション [E]: ログインフッターコントロール

| No. | Item ID | 項目名（論理名） | コンポーネントタイプ | データ型＆最大長 | 必須 | 初期状態／デフォルト値 | 入力制約／フォーマット | データソース／DBマッピング | 備考／ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 12 | `btnLanguageToggle` | 言語切替 | トグルグループ | 列挙型 | — | デフォルト: ブラウザ言語または"en" | 選択肢: EN, JA, MY | — | すべてのi18nキーを切替。localStorageに永続化。 |
| 13 | `btnThemeToggle` | テーマ切替 | アイコンボタン | 列挙型 | — | デフォルト: システム設定 | 選択肢: light, dark, system | — | light → dark → systemで切替。`next-themes`を使用。 |

### 4.5 セクション [F]: 登録フォーム

| No. | Item ID | 項目名（論理名） | コンポーネントタイプ | データ型＆最大長 | 必須 | 初期状態／デフォルト値 | 入力制約／フォーマット | データソース／DBマッピング | 備考／ビジネスルール |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 14 | `lblFullName` | フルネームラベル | 静的ラベル（`<label>`） | 文字列 | — | 常に表示。テキスト: "フルネーム" | — | ハードコードUIテキスト | `htmlFor`/`id`で`txtFullName`に関連付け。 |
| 15 | `txtFullName` | フルネーム入力 | 入力（`text`） | 文字列(200) | 必須 | 空。プレースホルダー: "田中太郎" | 最大長: 200。最小長: 2。 | `users.name` | AutoComplete: `name`。 |
| 16 | `lblRegEmail` | メールアドレスラベル | 静的ラベル（`<label>`） | 文字列 | — | 常に表示。テキスト: "メールアドレス" | — | ハードコードUIテキスト | `htmlFor`/`id`で`txtRegEmail`に関連付け。 |
| 17 | `txtRegEmail` | メールアドレス入力 | 入力（`email`） | 文字列(255) | 必須 | 空。プレースホルダー: "user@example.com" | フォーマット: 有効なメールアドレス。最大長: 255。 | `users.email` | AutoComplete: `email`。 |
| 18 | `lblRegPassword` | パスワードラベル | 静的ラベル（`<label>`） | 文字列 | — | 常に表示。テキスト: "パスワード" | — | ハードコードUIテキスト | `htmlFor`/`id`で`txtRegPassword`に関連付け。 |
| 19 | `txtRegPassword` | パスワード入力 | 入力（`password`） | 文字列(128) | 必須 | 空。プレースホルダー: "パスワードを作成" | 複雑な正規表現（§4.5.1参照）。 | `users.password_hash` | AutoComplete: `new-password`。表示/非表示切替可能。 |
| 20 | `btnShowRegPassword` | パスワード表示/非表示 | アイコンボタン | — | — | 表示中。アイコン。 | — | — | `txtRegPassword`のタイプを切替。 |
| 21 | `lstPasswordRequirements` | パスワード要件 | ヘルパーテキストリスト | — | — | パスワードフィールドの下に表示中 | 5つの要件のチェックリスト | — | ユーザー入力時にリアルタイムフィードバック。適合時に緑のチェック。 |
| 22 | `lblConfirmPassword` | パスワード確認ラベル | 静的ラベル（`<label>`） | 文字列 | — | 常に表示。テキスト: "パスワード確認" | — | ハードコードUIテキスト | `htmlFor`/`id`で`txtConfirmPassword`に関連付け。 |
| 23 | `txtConfirmPassword` | パスワード確認入力 | 入力（`password`） | 文字列(128) | 必須 | 空。プレースホルダー: "パスワードを再入力" | `txtRegPassword`と一致すること。 | — | AutoComplete: `new-password`。表示/非表示切替可能。 |
| 24 | `btnShowConfirmPassword` | パスワード表示/非表示 | アイコンボタン | — | — | 表示中。アイコン。 | — | — | `txtConfirmPassword`のタイプを切替。 |
| 25 | `lblRoleSelection` | ロール選択ラベル | 静的ラベル（`<label>`） | 文字列 | — | テキスト: "私は：" | — | ハードコードUIテキスト | `rdoRole`グループに関連付け。 |
| 26 | `rdoRole` | ロール選択 | ラジオグループ | 列挙型 | 必須 | デフォルト: `buyer` | 選択肢: buyer, merchant | `users.role` | `buyer`: ブラウズ＆購入。`merchant`: 商品販売。 |
| 27 | `rdoBuyer` | 購入者ラジオ | ラジオボタン | — | — | デフォルトで選択済み | 値: `buyer` | — | ラベル: "購入者 — 商品を閲覧・購入する" |
| 28 | `rdoMerchant` | 出品者ラジオ | ラジオボタン | — | — | 未選択 | 値: `merchant` | — | ラベル: "出品者 — スキンケア商品を販売する" |
| 29 | `btnRegister` | アカウント作成ボタン | ボタン（`submit`、`default`） | — | — | 表示中。テキスト: "アカウント作成" | — | — | 全幅。ローディング: スピナー + "アカウント作成中..."。ローディング中は無効。 |
| 30 | `lblHasAccount` | ログインプロンプト | 静的ラベル | 文字列 | — | テキスト: "すでにアカウントをお持ちですか？" | — | — | フッターテキスト。 |
| 31 | `lnkSignIn` | ログインリンク | リンク（`<Link>`） | 文字列 | — | テキスト: "ログイン" | — | — | `/login`にナビゲート。 |
| 32 | `lblLicenseUpload` | 事業許可書ラベル | 静的ラベル（`<label>`） | 文字列 | — | `rdoMerchant`選択時のみ表示。テキスト: "事業許可書（PDF）" | — | ハードコードUIテキスト | `htmlFor`/`id`で`uplLicense`に関連付け。必須インジケーター: 赤いアスタリスク`*`。 |
| 33 | `uplLicense` | ライセンスファイルアップロード | ファイル入力（`file`） | ファイル（バイナリ） | 条件付き | デフォルト非表示。`rdoMerchant`選択時に表示。 | 許可MIME: `application/pdf`。最大サイズ: 10MB。ファイル名は`license.pdf`であること。 | `users.license_url`（S3/ローカルに保存） | PDFのみ。ドラッグ＆ドロップゾーン + ファイルピッカーボタン。 |
| 34 | `lblLicenseFileName` | アップロード済みファイル名 | 静的ラベル | 文字列(255) | — | アップロード後に表示。アップロードされたファイル名を表示。 | — | — | アップロード時に"license.pdf"を表示。クリックでプレビュー/ダウンロード可能。 |
| 35 | `btnRemoveLicense` | ライセンスファイル削除 | アイコンボタン（危険） | — | — | ファイルアップロード時のみ表示。ゴミ箱アイコン。 | — | — | アップロードされたファイルを削除。アップロードゾーンに戻る。 |
| 36 | `lblLicenseHelper` | ライセンスヘルパーテキスト | 静的ラベル（ヘルパー） | 文字列 | — | テキスト: "事業許可書をPDF形式でアップロードしてください（最大10MB）。ファイル名はlicense.pdfである必要があります。" | — | — | アップロードゾーンの下に表示。Tailwind: `text-xs text-muted-foreground`。 |

### 4.5.1 パスワードバリデーションルール（登録）

| ルール | 正規表現 | エラーメッセージ（EN） | エラーメッセージ（JA） |
| :--- | :--- | :--- | :--- |
| 最小長 | `.{8,}` | "At least 8 characters" | "8文字以上" |
| 大文字 | `[A-Z]` | "One uppercase letter (A-Z)" | "大文字1つ (A-Z)" |
| 小文字 | `[a-z]` | "One lowercase letter (a-z)" | "小文字1つ (a-z)" |
| 数字 | `[0-9]` | "One number (0-9)" | "数字1つ (0-9)" |
| 特殊文字 | `[@$!%*?&]` | "One special character (@$!%*?&)" | "特殊文字1つ (@$!%*?&)" |

---

## 5. 各項目における挙動・イベント仕様

### 5.1 ログインフォーム送信（`btnLogin` onClick）
- **トリガー:** ユーザーが「ログイン」ボタンをクリック。
- **処理ロジック:**
  1. **クライアント側事前チェック:** フォームがバリデーションを受ける — メールアドレス形式、パスワード非空。
  2. **バックエンド送信:** `POST /api/v1/auth/login` に `{ email, password }` を送信。
  3. **バックエンド実行:** `users`テーブルの資格情報を検証。JWTアクセストークン+リフレッシュトークンを発行。
  4. **実行後UI:** トークンをlocalStorageに保存。`/dashboard/profile`にナビゲート。成功トーストを表示。
- **例外処理:**
  - `AUTH_001`（401）: `alertError`に「メールアドレスまたはパスワードが無効です」を表示。
  - `AUTH_006`（429）: リトライ秒数付きレート制限メッセージを表示。
  - `AUTH_004`（403）: `alertError`に「アカウントが無効化されています」を表示。
  - ネットワークエラー: 「ネットワークエラー。接続を確認してください」を表示。

### 5.2 登録フォーム送信（`btnRegister` onClick）
- **トリガー:** ユーザーが「アカウント作成」ボタンをクリック。
- **処理ロジック:**
  1. **クライアント側事前チェック:** 厳格なバリデーション — すべてのフィールドが有効、パスワード一致、ロール選択済み。
  2. **バックエンド送信:** `POST /api/v1/auth/register` に `{ name, email, password, role }` を送信。
  3. **バックエンド実行:** ハッシュ化パスワード付きユーザーレコードを作成。`emailVerified = false`を設定。
  4. **実行後UI:** 成功トーストを表示。`/login`にナビゲート。
- **例外処理:**
  - `AUTH_007`（409）: メールアドレスフィールドに「メールアドレスは既に登録されています」をインライン表示。
  - `VAL_001`（400）: フィールド固有のバリデーションエラーを表示。
  - `AUTH_006`（429）: レート制限メッセージを表示。

### 5.3 パスワード表示/非表示切替（`btnShowPassword` / `btnShowRegPassword` / `btnShowConfirmPassword` onClick）
- **トリガー:** ユーザーがアイコンボタンをクリック。
- **処理ロジック:**
  1. 関連する入力の`type`を`password`と`text`で切替。
  2. アイコンを`Eye`と`EyeOff`で切替。
  3. スクリーンリーダーラベルを更新。
- **例外処理:** 該当なし。

### 5.4 言語切替（`btnLanguageToggle` onClick）
- **トリガー:** ユーザーが言語切替ボタンをクリック。
- **処理ロジック:**
  1. 言語を切替: EN → JA → MY → EN。
  2. `i18n.changeLanguage()`で`i18next`言語を更新。
  3. 設定を`localStorage`に永続化。
  4. すべての翻訳ラベルを再レンダリング。
- **例外処理:** 該当なし。

### 5.5 テーマ切替（`btnThemeToggle` onClick）
- **トリガー:** ユーザーがテーマ切替ボタンをクリック。
- **処理ロジック:**
  1. テーマを切替: light → dark → system。
  2. `setTheme()`で`next-themes`テーマを更新。
  3. 設定を`localStorage`に永続化。
- **例外処理:** 該当なし。

### 5.6 ナビゲーションリンク（`lnkSignUp` / `lnkSignIn` onClick）
- **トリガー:** ユーザーが新規登録またはログインリンクをクリック。
- **処理ロジック:**
  1. React Routerで`/register`または`/login`にナビゲート。
  2. ナビゲーション時にフォーム状態をリセット。
- **例外処理:** 該当なし。

### 5.7 ロール選択変更（`rdoRole` onChange）
- **トリガー:** ユーザーが別のロール（購入者または出品者）を選択。
- **処理ロジック:**
  1. **購入者選択時:**
     - `lblLicenseUpload`、`uplLicense`、`lblLicenseFileName`、`btnRemoveLicense`、`lblLicenseHelper`を非表示。
     - アップロードされたライセンスファイルをクリア。
     - バリデーションからライセンスファイル要件を削除。
  2. **出品者選択時:**
     - `lblLicenseUpload`、`uplLicense`、`lblLicenseHelper`を表示。
     - ライセンスファイルアップロードゾーンを有効化。
     - 厳格なバリデーションにライセンスファイル要件を追加。
- **例外処理:** 該当なし。

### 5.8 ライセンスファイルアップロード（`uplLicense` onChange / onDrop）
- **トリガー:** ユーザーがファイルピッカーまたはドラッグ＆ドロップでファイルを選択。
- **処理ロジック:**
  1. **クライアント側事前チェック:**
     - ファイルMIMEタイプが`application/pdf`であることを検証。
     - ファイルサイズが≤10MBであることを検証。
     - ファイル名が`license.pdf`であること（大文字小文字不問）を検証。
  2. **バリデーション後:**
     - 有効な場合: `lblLicenseFileName`にファイル名を表示。`btnRemoveLicense`を表示。アップロードゾーンを非表示。
     - 無効な場合: インラインエラーメッセージを表示。アップロードゾーンを表示したまま維持。
  3. **ファイルストレージ:** フォーム送信までファイルを一時保存。
- **例外処理:**
  - `VAL-AUTH-030`: "サポートされていないファイル形式です。PDFファイルのみ対応しています。"
  - `VAL-AUTH-031`: "ファイルサイズが10MBを超えています"
  - `VAL-AUTH-032`: "ファイル名はlicense.pdfである必要があります"

### 5.9 ライセンスファイル削除（`btnRemoveLicense` onClick）
- **トリガー:** ユーザーがアップロードされたライセンスの削除ボタンをクリック。
- **処理ロジック:**
  1. 状態からアップロードされたファイルをクリア。
  2. `uplLicense`入力値をリセット。
  3. `lblLicenseFileName`と`btnRemoveLicense`を非表示。
  4. 再びアップロードゾーンを表示。
- **例外処理:** 該当なし。

---

## 6. バリデーション及びエラーメッセージマッピング

### 6.1 ログインバリデーションエラー

| エラーコード | 対象フィールド | 条件／評価ロジック | UI/UX表示スタイル | デフォルトエラーメッセージ（EN） | デフォルトエラーメッセージ（JA） |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-AUTH-001** | `txtEmail` | メールアドレスが空または無効な形式 | 赤いボーダー。フィールド下のテキスト。 | "Email is required" | "メールアドレスは必須です" |
| **VAL-AUTH-002** | `txtEmail` | メールアドレスが255文字を超える | 赤いボーダー。フィールド下のテキスト。 | "Email must not exceed 255 characters" | "メールアドレスは255文字以内にしてください" |
| **VAL-AUTH-003** | `txtPassword` | パスワードが空 | 赤いボーダー。フィールド下のテキスト。 | "Password is required" | "パスワードは必須です" |
| **VAL-AUTH-004** | `txtPassword` | パスワードが8文字未満 | 赤いボーダー。フィールド下のテキスト。 | "Password must be at least 8 characters" | "パスワードは8文字以上である必要があります" |
| **AUTH_001** | `alertError` | 資格情報エラー（401レスポンス） | アラートバナー（破壊的） | "Invalid email or password" | "メールアドレスまたはパスワードが無効です" |
| **AUTH_004** | `alertError` | アカウント無効化（403レスポンス） | アラートバナー（破壊的） | "Account is deactivated. Please contact support" | "アカウントが無効化されています。サポートにお問い合わせください" |
| **AUTH_006** | `alertError` | レート制限（429レスポンス） | アラートバナー（破壊的） | "Too many attempts. Please wait {seconds} seconds" | "試行回数が多すぎます。{seconds}秒お待ちください" |
| **SYS_001** | `alertError` | サーバーエラー（500レスポンス） | アラートバナー（破壊的） | "Something went wrong. Please try again" | "問題が発生しました。もう一度お試しください" |
| **NET_ERR** | `alertError` | ネットワークエラー | アラートバナー（破壊的） | "Network error. Please check your connection" | "ネットワークエラー。接続を確認してください" |

### 6.2 登録バリデーションエラー

| エラーコード | 対象フィールド | 条件／評価ロジック | UI/UX表示スタイル | デフォルトエラーメッセージ（EN） | デフォルトエラーメッセージ（JA） |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-AUTH-010** | `txtFullName` | 名前が空または< 2文字 | 赤いボーダー。フィールド下のテキスト。 | "Name must be at least 2 characters" | "名前は2文字以上である必要があります" |
| **VAL-AUTH-011** | `txtFullName` | 名前が200文字を超える | 赤いボーダー。フィールド下のテキスト。 | "Name must not exceed 200 characters" | "名前は200文字以内にしてください" |
| **VAL-AUTH-012** | `txtRegEmail` | メールアドレスが空または無効な形式 | 赤いボーダー。フィールド下のテキスト。 | "Email is required" | "メールアドレスは必須です" |
| **VAL-AUTH-013** | `txtRegEmail` | メールアドレスが255文字を超える | 赤いボーダー。フィールド下のテキスト。 | "Email must not exceed 255 characters" | "メールアドレスは255文字以内にしてください" |
| **VAL-AUTH-014** | `txtRegPassword` | パスワードが空 | 赤いボーダー。フィールド下のテキスト。 | "Password is required" | "パスワードは必須です" |
| **VAL-AUTH-015** | `txtRegPassword` | パスワード < 8文字 | 赤いボーダー。フィールド下のテキスト。 | "Password must be at least 8 characters" | "パスワードは8文字以上である必要があります" |
| **VAL-AUTH-016** | `txtRegPassword` | パスワード > 128文字 | 赤いボーダー。フィールド下のテキスト。 | "Password must not exceed 128 characters" | "パスワードは128文字以内にしてください" |
| **VAL-AUTH-017** | `txtRegPassword` | 大文字が不足 | 赤いボーダー。フィールド下のテキスト。 | "Password must contain at least one uppercase letter" | "パスワードには大文字を含めてください" |
| **VAL-AUTH-018** | `txtRegPassword` | 小文字が不足 | 赤いボーダー。フィールド下のテキスト。 | "Password must contain at least one lowercase letter" | "パスワードには小文字を含めてください" |
| **VAL-AUTH-019** | `txtRegPassword` | 数字が不足 | 赤いボーダー。フィールド下のテキスト。 | "Password must contain at least one number" | "パスワードには数字を含めてください" |
| **VAL-AUTH-020** | `txtRegPassword` | 特殊文字が不足 | 赤いボーダー。フィールド下のテキスト。 | "Password must contain at least one special character (@$!%*?&)" | "パスワードには特殊文字を含めてください" |
| **VAL-AUTH-021** | `txtConfirmPassword` | パスワードが一致しない | 赤いボーダー。フィールド下のテキスト。 | "Passwords do not match" | "パスワードが一致しません" |
| **VAL-AUTH-022** | `rdoRole` | ロール未選択 | フォームレベルエラー | "Please select a role" | "役割を選択してください" |
| **VAL-AUTH-030** | `uplLicense` | ファイル形式がPDFでない | アップロードゾーンのインラインエラー | "File type not supported. Only PDF files are accepted." | "サポートされていないファイル形式です。PDFファイルのみ対応しています。" |
| **VAL-AUTH-031** | `uplLicense` | ファイルが10MBを超える | アップロードゾーンのインラインエラー | "File exceeds maximum size of 10 MB" | "ファイルサイズが10MBを超えています" |
| **VAL-AUTH-032** | `uplLicense` | ファイル名がlicense.pdfでない | アップロードゾーンのインラインエラー | "File must be named license.pdf" | "ファイル名はlicense.pdfである必要があります" |
| **VAL-AUTH-033** | `uplLicense` | ロール=出品者の場合ファイル未アップロード | アップロードゾーンのインラインエラー | "Business license is required for merchant registration" | "出品者登録には事業許可書が必要です" |
| **AUTH_007** | `txtRegEmail` | メールアドレスが既に存在（409レスポンス） | 赤いボーダー + インラインテキスト | "Email already registered" | "メールアドレスは既に登録されています" |
| **AUTH_006** | `alertError` | レート制限（429レスポンス） | アラートバナー（破壊的） | "Too many attempts. Please wait {seconds} seconds" | "試行回数が多すぎます。{seconds}秒お待ちください" |
| **SYS_001** | `alertError` | サーバーエラー（500レスポンス） | アラートバナー（破壊的） | "Something went wrong. Please try again" | "問題が発生しました。もう一度お試しください" |

---

## 7. データベースフィールドマッピング

### 7.1 ログインフォーム → データベース

| フォームフィールド | APIフィールド | データベースカラム | テーブル | データ型 |
| :--- | :--- | :--- | :--- | :--- |
| `txtEmail` | `email` | `email` | `users` | VARCHAR(255) UNIQUE |
| `txtPassword` | `password` | `password_hash` | `users` | VARCHAR(255)（bcryptハッシュ） |

### 7.2 登録フォーム → データベース

| フォームフィールド | APIフィールド | データベースカラム | テーブル | データ型 |
| :--- | :--- | :--- | :--- | :--- |
| `txtFullName` | `name` | `name` | `users` | VARCHAR(200) |
| `txtRegEmail` | `email` | `email` | `users` | VARCHAR(255) UNIQUE |
| `txtRegPassword` | `password` | `password_hash` | `users` | VARCHAR(255)（bcryptハッシュ） |
| `rdoRole` | `role` | `role` | `users` | ENUM('buyer', 'merchant') |
| `uplLicense` | `license` | `license_url` | `users` | VARCHAR(500)（Nullable） |

---

## 8. APIレスポンスマッピング

### 8.1 ログイン成功レスポンス

```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "clx1234567890",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "buyer",
      "avatarUrl": null
    }
  }
}
```

### 8.2 ログインエラーレスポンス

```json
{
  "statusCode": 401,
  "error": "UNAUTHORIZED",
  "errorCode": "AUTH_001",
  "message": "Invalid email or password",
  "timestamp": "2026-08-05T12:00:00.000Z",
  "path": "/api/v1/auth/login"
}
```

### 8.3 登録成功レスポンス

```json
{
  "data": {
    "id": "clx1234567890",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "merchant",
    "licenseUrl": "/uploads/licenses/license_clx1234567890.pdf",
    "emailVerified": false,
    "createdAt": "2026-08-05T12:00:00.000Z"
  }
}
```

**注意:** `licenseUrl`は`role = "merchant"`の場合のみ存在。`role = "buyer"`の場合、このフィールドは`null`または省略。

### 8.4 登録エラーレスポンス（重複メール）

```json
{
  "statusCode": 409,
  "error": "CONFLICT",
  "errorCode": "AUTH_007",
  "message": "Email already registered",
  "timestamp": "2026-08-05T12:00:00.000Z",
  "path": "/api/v1/auth/register"
}
```

---

## 9. i18nキーリファレンス

### 9.1 英語（en） — ログイン

| キー | 値 |
| :--- | :--- |
| `auth.login.title` | "Sign In" |
| `auth.login.email` | "Email" |
| `auth.login.emailPlaceholder` | "user@example.com" |
| `auth.login.password` | "Password" |
| `auth.login.passwordPlaceholder` | "Enter your password" |
| `auth.login.submit` | "Sign In" |
| `auth.login.submitting` | "Signing in..." |
| `auth.login.success` | "Logged in successfully" |
| `auth.login.forgotPassword` | "Forgot password?" |
| `auth.login.noAccount` | "Don't have an account?" |
| `auth.login.createAccount` | "Create one" |
| `auth.login.showPassword` | "Show password" |
| `auth.login.hidePassword` | "Hide password" |

### 9.2 英語（en） — 登録

| キー | 値 |
| :--- | :--- |
| `auth.register.title` | "Create Account" |
| `auth.register.fullName` | "Full Name" |
| `auth.register.fullNamePlaceholder` | "John Doe" |
| `auth.register.email` | "Email" |
| `auth.register.emailPlaceholder` | "user@example.com" |
| `auth.register.password` | "Password" |
| `auth.register.passwordPlaceholder` | "Create a password" |
| `auth.register.confirmPassword` | "Confirm Password" |
| `auth.register.confirmPasswordPlaceholder` | "Confirm your password" |
| `auth.register.submit` | "Create Account" |
| `auth.register.submitting` | "Creating account..." |
| `auth.register.success` | "Account created successfully" |
| `auth.register.hasAccount` | "Already have an account?" |
| `auth.register.signIn` | "Sign in" |
| `auth.register.iAm` | "I am a:" |
| `auth.register.buyer` | "Buyer — Browse and purchase products" |
| `auth.register.merchant` | "Merchant — Sell skincare products" |
| `auth.register.showPassword` | "Show password" |
| `auth.register.hidePassword` | "Hide password" |
| `auth.register.passwordRequirement.length` | "At least 8 characters" |
| `auth.register.passwordRequirement.uppercase` | "One uppercase letter (A-Z)" |
| `auth.register.passwordRequirement.lowercase` | "One lowercase letter (a-z)" |
| `auth.register.passwordRequirement.number` | "One number (0-9)" |
| `auth.register.passwordRequirement.special` | "One special character (@$!%*?&)" |
| `auth.register.license` | "Business License (PDF)" |
| `auth.register.licensePlaceholder` | "Drag & drop or click to upload" |
| `auth.register.licenseHelper` | "Upload your business license as PDF (max 10MB). File must be named license.pdf." |
| `auth.register.licenseRemove` | "Remove file" |
| `auth.register.licenseError.type` | "File type not supported. Only PDF files are accepted." |
| `auth.register.licenseError.size` | "File exceeds maximum size of 10 MB" |
| `auth.register.licenseError.name` | "File must be named license.pdf" |
| `auth.register.licenseError.required` | "Business license is required for merchant registration" |

### 9.3 日本語（ja） — ログイン

| キー | 値 |
| :--- | :--- |
| `auth.login.title` | "ログイン" |
| `auth.login.email` | "メールアドレス" |
| `auth.login.emailPlaceholder` | "user@example.com" |
| `auth.login.password` | "パスワード" |
| `auth.login.passwordPlaceholder` | "パスワードを入力" |
| `auth.login.submit` | "ログイン" |
| `auth.login.submitting` | "ログイン中..." |
| `auth.login.success` | "ログイン成功" |
| `auth.login.forgotPassword` | "パスワードをお忘れですか？" |
| `auth.login.noAccount` | "アカウントをお持ちでないですか？" |
| `auth.login.createAccount` | "作成する" |
| `auth.login.showPassword` | "パスワードを表示" |
| `auth.login.hidePassword` | "パスワードを非表示" |

### 9.4 日本語（ja） — 登録

| キー | 値 |
| :--- | :--- |
| `auth.register.title` | "アカウント作成" |
| `auth.register.fullName` | "氏名" |
| `auth.register.fullNamePlaceholder` | "田中太郎" |
| `auth.register.email` | "メールアドレス" |
| `auth.register.emailPlaceholder` | "user@example.com" |
| `auth.register.password` | "パスワード" |
| `auth.register.passwordPlaceholder` | "パスワードを作成" |
| `auth.register.confirmPassword` | "パスワード確認" |
| `auth.register.confirmPasswordPlaceholder` | "パスワードを再入力" |
| `auth.register.submit` | "アカウント作成" |
| `auth.register.submitting` | "アカウント作成中..." |
| `auth.register.success` | "アカウント作成成功" |
| `auth.register.hasAccount` | "すでにアカウントをお持ちですか？" |
| `auth.register.signIn` | "ログイン" |
| `auth.register.iAm` | "私は：" |
| `auth.register.buyer` | "購入者 — 商品を閲覧・購入する" |
| `auth.register.merchant` | "出品者 — スキンケア商品を販売する" |
| `auth.register.showPassword` | "パスワードを表示" |
| `auth.register.hidePassword` | "パスワードを非表示" |
| `auth.register.passwordRequirement.length` | "8文字以上" |
| `auth.register.passwordRequirement.uppercase` | "大文字1つ (A-Z)" |
| `auth.register.passwordRequirement.lowercase` | "小文字1つ (a-z)" |
| `auth.register.passwordRequirement.number` | "数字1つ (0-9)" |
| `auth.register.passwordRequirement.special` | "特殊文字1つ (@$!%*?&)" |
| `auth.register.license` | "事業許可書 (PDF)" |
| `auth.register.licensePlaceholder` | "ドラッグ＆ドロップまたはクリックしてアップロード" |
| `auth.register.licenseHelper` | "事業許可書をPDF形式でアップロードしてください（最大10MB）。ファイル名はlicense.pdfである必要があります。" |
| `auth.register.licenseRemove` | "ファイルを削除" |
| `auth.register.licenseError.type` | "サポートされていないファイル形式です。PDFファイルのみ対応しています。" |
| `auth.register.licenseError.size` | "ファイルサイズが10MBを超えています" |
| `auth.register.licenseError.name` | "ファイル名はlicense.pdfである必要があります" |
| `auth.register.licenseError.required` | "出品者登録には事業許可書が必要です" |

---

## 10. 共有コンポーネント

### 10.1 AuthLayoutコンポーネント

| プロパティ | 値 |
| :--- | :--- |
| **場所** | `frontend/src/features/auth/components/AuthLayout.tsx` |
| **目的** | ログインおよび登録ページ用の共有レイアウトラッパー |

**レイアウト構造:**
```text
┌─────────────────────────────────────────────┐
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │         [ロゴ]                      │    │
│  │         Cosmetics Finder            │    │
│  │                                     │    │
│  │         {children}                  │    │
│  │                                     │    │
│  │         [言語] [テーマ]              │    │
│  └─────────────────────────────────────┘    │
│                                             │
└─────────────────────────────────────────────┘
```

### 10.2 Alertコンポーネント

| プロパティ | 値 |
| :--- | :--- |
| **場所** | `frontend/src/components/ui/alert.tsx` |
| **バリアント** | `default`、`destructive`、`success` |
| **使用場面** | フォーム上部のエラー/成功バナー |

### 10.3 RadioGroupコンポーネント

| プロパティ | 値 |
| :--- | :--- |
| **場所** | `frontend/src/components/ui/radio-group.tsx` |
| **使用場面** | 登録フォームのロール選択 |

---

## 11. 特記事項・UI仕様

- **デザイシステム:** Luxury Cosmetics Theme — プライマリ `#7C3AED`（Purple）、アクセント `#EC4899`（Pink）、セカンダリ `#F3E8FF`（Lavender）。
- **レスポンシブビューポートデザイン:** 最大幅400pxのセンタードカードレイアウト。モバイルではフル幅。
- **アクセシビリティ:** すべてのコントロールはキーボードナビゲーション可能であること。ARIAラベル必須。エラーメッセージは`role="alert"`で announcements されること。
- **パフォーマンス:** フォームは初期ロード時にスケルトンローダーを使用。ボタンは非同期操作中にスピナーを表示。
- **セキュリティ:** すべてのユーザー入力はXSS防止のためサニタイズ。パスワードはログされない。AutoComplete属性が正しく設定される。
- **デザイントークン:** ステータスバッジは標準カラーマッピングを使用 — success: `bg-green-100 text-green-800`、error: `bg-red-100 text-red-800`、warning: `bg-amber-100 text-amber-800`。

---

## 12. テストチェックリスト

### 12.1 ログインフォームテスト

- [ ] メールアドレスバリデーションが有効な形式を受け入れる
- [ ] メールアドレスバリデーションが無効な形式を拒否する
- [ ] メールアドレス最大長（255）が適用される
- [ ] パスワード最小長（8）が適用される
- [ ] パスワード表示/非表示切替が機能する
- [ ] 有効なデータでフォームが送信される
- [ ] 無効な資格情報でエラーアラートが表示される（AUTH_001）
- [ ] 無効化されたアカウントでエラーアラートが表示される（AUTH_004）
- [ ] レート制限でエラーアラートが表示される（AUTH_006）
- [ ] 送信中にローディング状態が表示される
- [ ] 登録ページへのナビゲーションが機能する
- [ ] 言語切替がすべてのラベルを切り替える
- [ ] テーマ切替が機能する
- [ ] メールアドレス入力に自動フォーカスされる
- [ ] キーボードナビゲーションが機能する（Tab、Enter）

### 12.2 登録フォームテスト

- [ ] 名前バリデーションが機能する（最小2、最大200）
- [ ] メールアドレスバリデーションが有効な形式を受け入れる
- [ ] メールアドレスバリデーションが無効な形式を拒否する
- [ ] パスワード強度要件が適用される（5ルール）
- [ ] パスワード要件チェックリストがリアルタイムで更新される
- [ ] パスワード確認一致バリデーションが機能する
- [ ] ロール選択がデフォルトで購入者になる
- [ ] 有効なデータでフォームが送信される
- [ ] 重複メールエラーが表示される（AUTH_007）
- [ ] 送信中にローディング状態が表示される
- [ ] ログインページへのナビゲーションが機能する
- [ ] すべてのi18nキーが正しくレンダリングされる
- [ ] すべての3つのパスワードフィールドで表示/非表示が機能する
- [ ] キーボードナビゲーションが機能する

### 12.3 出品者ライセンスアップロードテスト

- [ ] 購入者選択時にライセンスアップロードフィールドが非表示
- [ ] 出品者選択時にライセンスアップロードフィールドが表示
- [ ] 購入者に切り替えたときにライセンスアップロードフィールドが非表示
- [ ] ファイルピッカーでPDFファイルアップロードが機能する
- [ ] ドラッグ＆ドロップでPDFファイルアップロードが機能する
- [ ] PDFでないファイルがエラーで拒否される（VAL-AUTH-030）
- [ ] 10MBを超えるファイルがエラーで拒否される（VAL-AUTH-031）
- [ ] 間違った名前のファイルがエラーで拒否される（VAL-AUTH-032）
- [ ] "license.pdf"という名前のファイルが受け入れられる
- [ ] "License.PDF"という名前のファイルが受け入れられる（大文字小文字不問）
- [ ] アップロードされたファイル名が正しく表示される
- [ ] 削除ボタンがアップロードされたファイルを削除する
- [ ] ファイルなしで送信時にライセンス必須エラーが表示される（VAL-AUTH-033）
- [ ] ライセンスアップロードがi18n（EN/JA/MY）で機能する

---

*画面項目設計書終了（サインアップ / ログインページ）*
