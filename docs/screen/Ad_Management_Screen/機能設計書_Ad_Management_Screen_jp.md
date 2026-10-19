# 機能設計書 — 管理者広告管理画面

---

## 文書管理

| 属性 | 値 |
|-----------|-------|
| **文書ID** | SKM-FDS-ADM-001 |
| **対象画面** | 管理者広告管理 — 広告レビュー、承認、料金管理、分析・レポート |
| **サブシステム** | 広告管理 — 管理者広告承認、一括操作、パッケージ・料金管理、収益分析、レポート出力 |
| **機能ID** | FN-ADM-001 |
| **バージョン** | 2.0 |
| **作成日** | 2026-08-24 |
| **最終更新日** | 2026-10-15 |
| **作成者** | ソフトウェアアーキテクト |
| **ステータス** | リリース済み |
| **分類** | 社内 — エンジニアリング部門 |

---

## 文書改訂履歴

| バージョン | 日付 | 作成者 | 変更内容 |
|---------|------|--------|------------------------|
| 1.0 | 2026-08-24 | ソフトウェアアーキテクト | 初回機能設計書 |
| 1.1 | 2026-08-25 | ソフトウェアアーキテクト | 料金作成・無効化操作を追加；出力を CSV のみに |
| 2.0 | 2026-10-15 | ソフトウェアアーキテクト | 実際のコードベースに合わせて全面改訂：配置場所・ルート・通貨（KS）の修正、料金再有効化・履歴削除・月フィルター・デバウンス検索・2ステップ却下フロー・全パッケージ作成済みロジック・テーブル列・レスポンシブ動作を追加 |

---

## 目次

1. [機能概要](#1-機能概要)
2. [ユースケースと業務ワークフロー](#2-ユースケースと業務ワークフロー)
3. [状態遷移仕様](#3-状態遷移仕様)
4. [業務ルール](#4-業務ルール)
5. [画面仕様](#5-画面仕様)
6. [機能操作仕様](#6-機能操作仕様)
7. [入力バリデーションルール](#7-入力バリデーションルール)
8. [エラー処理仕様](#8-エラー処理仕様)
9. [権限・アクセス制御](#9-権限アクセス制御)
10. [リアルタイム通知動作](#10-リアルタイム通知動作)
11. [画面遷移仕様](#11-画面遷移仕様)
12. [非機能要件](#12-非機能要件)
13. [設定可能項目](#13-設定可能項目)
14. [相互参照トレーサビリティマトリクス](#14-相互参照トレーサビリティマトリクス)

---

## 1. 機能概要

### 1.1 目的と範囲

本画面サブシステムは、Cosmetics Finder プラットフォーム内の広告ライフサイクルを、プラットフォーム管理者が完全に管理できるようにする。ショップが提出した広告のレビューと承認・却下（個別または一括）、広告パッケージ価格と料金設定の管理（作成・編集・無効化・再有効化）、料金変更履歴の表示と削除、配置場所と料金ティア別の収益内訳分析、CSV 形式のレポート出力という、管理者側の責務全体を対象とする。

### 1.2 機能責務

1. **広告レビュー・承認** — 保留中のショップ広告をレビューし、理由を付けて個別に承認または却下し、承認メタデータ（approvedBy、approvedAt）を追跡する。
2. **一括承認・却下** — チェックボックスで複数の保留中広告を選択し、単一の一括操作で承認または却下する。一括却下には共通の却下理由を使用し、自動で一括返金する。
3. **パッケージ・料金管理** — 配置場所とティアごとの料金設定を作成、編集、無効化、再有効化する。すべての変更を料金履歴へ記録する。
4. **料金履歴追跡・削除** — すべての価格変更を完全な監査証跡とともに表示する。過去月の履歴を削除可能（当月分は保護）。
5. **収益内訳分析** — カスタム日付範囲における配置場所および価格ティア別の広告収益内訳について、サマリ指標、チャート、テーブルを提供する。
6. **レポート出力** — 広告パフォーマンス、ショップ広告提出履歴、料金履歴の各レポートを CSV 形式で直接ダウンロードする。
7. **監査ログ** — 重要な管理者操作をすべて監査証跡へ記録する。

### 1.3 対象ユーザー

| 属性 | 値 |
|-----------|-------|
| **主アクター** | プラットフォーム管理者 |
| **必要な認証** | JWT Bearer Token（`admin` ロール） |
| **データ範囲** | プラットフォーム上の全広告、全料金設定、全 ad payments、プラットフォーム全体の収益データ |

### 1.4 配置場所とティア

**配置場所**（4件）:

| 配置場所値 | 表示ラベル |
|-----------------|---------------|
| `search_page_banner` | Search Page Banner |
| `recommendation_page_banner` | Recommendation Page Banner |
| `checkout_page_banner` | Checkout Page Banner |
| `productDetail_page_banner` | Product Detail Page Banner |

**ティア**（3件）:

| ティア値 | 表示ラベル |
|------------|---------------|
| `basic` | Basic |
| `standard` | Standard |
| `premium` | Premium |

**パッケージ組み合わせ総数**: 4配置場所 × 3ティア = 12件の料金設定が作成可能。

### 1.5 API エンドポイント

| エンドポイント | メソッド | 説明 |
|----------|--------|-------------|
| `/admin/ads` | GET | フィルター・ページング付き広告一覧 |
| `/admin/ads/:id` | GET | 広告詳細取得 |
| `/admin/ads/:id/approve` | POST | 保留中広告の承認 |
| `/admin/ads/:id/reject` | POST | 保留中広告の却下（理由必須） |
| `/admin/ads/bulk/approve` | POST | 一括承認 |
| `/admin/ads/bulk/reject` | POST | 一括却下（共通理由必須） |
| `/admin/ad-fees` | GET | 料金設定一覧 |
| `/admin/ad-fees` | POST | 料金設定作成 |
| `/admin/ad-fees/:id` | PUT | 料金設定更新 |
| `/admin/ad-fees/:id/deactivate` | PATCH | 料金設定無効化 |
| `/admin/ad-fees/:id/reactivate` | PATCH | 料金設定再有効化 |
| `/admin/ad-fees/history` | GET | 料金変更履歴（フィルター対応） |
| `/admin/ad-fees/history` | DELETE | 料金履歴削除 |
| `/admin/ads/analytics/revenue` | GET | 収益分析データ |
| `/admin/ads/export/ad-performance` | POST | 広告パフォーマンス CSV 出力 |
| `/admin/ads/export/submission-history` | POST | 提出履歴 CSV 出力 |
| `/admin/ads/export/fee-history` | POST | 料金履歴 CSV 出力 |

---

## 2. ユースケースと業務ワークフロー

### 2.1 ユースケース一覧

| UC-ID | ユースケース名 | 前提条件 | 事後条件 | 起動アクター |
|-------|---------------|--------------|---------------|------------------|
| UC-ADM-001 | 保留中広告のレビュー | 管理者が認証済み | フィルター付き広告一覧が表示される | 管理者 |
| UC-ADM-002 | 広告の単体承認 | 管理者が保留中広告を選択 | 広告が承認され、メタデータが記録される | 管理者 |
| UC-ADM-003 | 広告の単体却下 | 管理者が理由付きで保留中広告を選択 | 広告が却下され、返金が処理される | 管理者 |
| UC-ADM-004 | 広告の一括承認 | 管理者が複数の保留中広告を選択 | 選択した全広告が承認される | 管理者 |
| UC-ADM-005 | 広告の一括却下 | 管理者が共通理由付きで複数選択 | 選択した全広告が却下され、一括返金される | 管理者 |
| UC-ADM-006 | 広告詳細の表示 | 管理者が広告の表示をクリック | 広告詳細が表示される | 管理者 |
| UC-ADM-007 | 料金設定の管理 | 管理者が認証済み | 表示・作成・編集・無効化・再有効化が可能 | 管理者 |
| UC-ADM-008 | 料金変更履歴の表示 | 管理者が価格履歴を確認 | 料金変更履歴が表示される | 管理者 |
| UC-ADM-009 | 料金履歴の削除 | 管理者が削除可能なレコードを選択 | 過去月の履歴が削除される（当月は保護） | 管理者 |
| UC-ADM-010 | 収益分析の表示 | 管理者が財務データを確認 | 収益チャートと指標が表示される | 管理者 |
| UC-ADM-011 | 広告パフォーマンスの出力 | 管理者が広告データを出力 | CSV ファイルがダウンロードされる | 管理者 |
| UC-ADM-012 | 提出履歴の出力 | 管理者が提出記録を出力 | CSV ファイルがダウンロードされる | 管理者 |
| UC-ADM-013 | 料金履歴の出力 | 管理者が監査証跡を出力 | CSV ファイルがダウンロードされる | 管理者 |
| UC-ADM-014 | 料金設定の作成 | 管理者が新しい料金設定を追加 | 新しい料金設定が作成される（最大12件） | 管理者 |
| UC-ADM-015 | 料金設定の無効化 | 管理者が設定を無効化 | 料金設定が無効化され、新規購入がブロックされる | 管理者 |
| UC-ADM-016 | 料金設定の再有効化 | 管理者が設定を再有効化 | 料金設定が再有効化される | 管理者 |

### 2.2 主業務ワークフロー — 管理者広告レビュー

```
┌──────────────────────────────┐
│  管理者ダッシュボード          │
│  (広告管理)                   │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  広告一覧を表示               │
│  (フィルター + チェックボックス │
│   + ページング)               │
└──────────┬───────────────────┘
           │
     ┌─────┴──────────────────┐
     │                        │
     ▼                        ▼
┌──────────────┐    ┌──────────────────────┐
│ 単体レビュー   │    │ 一括選択             │
│ (広告1件の     │    │ (保留中広告を         │
│  レビュー)    │    │  複数チェック)        │
└──────┬───────┘    └──────────┬───────────┘
       │                 ┌─────┴─────┐
       ▼                 ▼           ▼
┌──────────────┐  ┌──────────┐ ┌──────────────┐
│ レビューモーダル│  │ 一括     │ │ 一括         │
│ - 内容        │  │ 承認     │ │ 却下         │
│ - ショップ情報 │  └────┬─────┘ └──────┬───────┘
│ - 料金/支払い  │       │              │
└──────┬───────┘       │              │
  ┌────┴────┐          │              │
  ▼         ▼          ▼              ▼
┌────────┐┌────────┐┌──────────┐┌──────────────┐
│ 承認   ││ 却下   ││ 選択した ││ 一括却下 +   │
│        ││(2ステップ)│ 全件を   ││ 共通理由 +   │
│        ││        ││ 一括承認 ││ 一括返金     │
└───┬────┘└───┬────┘└────┬─────┘└──────┬───────┘
    │         │          │              │
    ▼         ▼          ▼              ▼
┌──────────────────────────────────────────────┐
│  システム: 状態更新、メタデータ記録、          │
│  通知送信、返金処理、監査ログ記録              │
└──────────────────────────────────────────────┘
```

---

## 3. 状態遷移仕様

### 3.1 広告承認状態

| 状態 | 説明 | 表示対象 | 管理者の操作 |
|-------|-------------|:------------:|:-------------:|
| `pending` | ショップが提出し、管理者レビュー待ち | いいえ | 承認、却下、一括承認、一括却下 |
| `approved` | 管理者が承認し、プラットフォームに表示中 | はい | 閲覧のみ |
| `rejected` | 管理者が理由付きで却下し、返金処理済み | いいえ | 閲覧のみ |

### 3.2 広告ライフサイクル遷移（管理者起動）

| 遷移ID | 起点状態 | 遷移先状態 | 起動操作 | ガード条件 |
|---------------|--------------|--------------|----------------|------------------|
| TR-ADM-01 | `pending` | `approved` | 管理者が承認（単体） | 管理者が認証済み、広告が pending 状態 |
| TR-ADM-02 | `pending` | `rejected` | 管理者が却下（単体） | 管理者が認証済み、却下理由が指定済み |
| TR-ADM-03 | `pending` | `approved` | 管理者が一括承認 | 管理者が認証済み、選択した全広告が pending 状態 |
| TR-ADM-04 | `pending` | `rejected` | 管理者が一括却下 | 管理者が認証済み、共通却下理由が指定済み |

### 3.3 料金設定の状態遷移

| 遷移ID | 起点状態 | 遷移先状態 | 起動操作 | ガード条件 |
|---------------|--------------|--------------|----------------|------------------|
| TR-FEE-01 | — | 有効 | 管理者が料金設定を作成 | 有効な配置場所・ティア、dailyRate > 0、組み合わせが未作成 |
| TR-FEE-02 | 有効 | 更新済み | 管理者が料金を編集 | 変更が料金履歴に記録される |
| TR-FEE-03 | 有効 | 無効 | 管理者が無効化 | 変更理由が必須、既存広告には影響しない |
| TR-FEE-04 | 無効 | 有効 | 管理者が再有効化 | 変更理由は任意 |

### 3.4 料金履歴削除の保護ルール

| ルール | 説明 |
|------|-------------|
| 当月保護 | 現在の暦月（UTC）に作成された履歴レコードは削除不可 |
| 過去月削除 | 過去月の履歴は個別または一括（最大50件）で削除可能 |
| API による強制 | 当月レコードの削除要求はバックエンドが常に拒否 |

---

## 4. 業務ルール

### 4.1 広告レビュー・承認ルール

| ルールID | ルール名 | 説明 |
|---------|-----------|-------------|
| BR-ADM-001 | 管理者承認必須 | 広告を承認または却下できるのは管理者のみ |
| BR-ADM-002 | 却下理由必須 | 却下時は理由が必須（1〜1000文字） |
| BR-ADM-003 | 承認メタデータ | 承認時に approvedBy と approvedAt を記録 |
| BR-ADM-004 | 却下時返金 | 却下時に完了済み支払いの返金を実行 |
| BR-ADM-005 | 保留中ガード | `approvalStatus='pending'` の広告のみ承認・却下可能 |

### 4.2 一括操作ルール

| ルールID | ルール名 | 説明 |
|---------|-----------|-------------|
| BR-ADM-010 | 一括選択上限 | 1回の一括操作で選択できる広告は最大50件 |
| BR-ADM-011 | 一括選択対象 | チェックボックスで選択できるのは保留中広告のみ |
| BR-ADM-012 | 一括却下の共通理由 | 選択した全広告に単一の却下理由を適用 |
| BR-ADM-013 | 一括返金処理 | 返金を順次処理；失敗しても他の返金を妨げない |

### 4.3 料金管理ルール

| ルールID | ルール名 | 説明 |
|---------|-----------|-------------|
| BR-ADM-020 | 配置場所・ティアの一意性 | 配置場所とティアの組み合わせごとに料金設定は1件のみ |
| BR-ADM-021 | 組み合わせ総数 | 最大12件（4配置場所 × 3ティア） |
| BR-ADM-022 | 日額料金バリデーション | 日額料金は 0.01 以上 |
| BR-ADM-023 | 期間バリデーション | 期間日数は 1 以上の整数 |
| BR-ADM-024 | 最大広告数バリデーション | 最大広告数は 1 以上の整数 |
| BR-ADM-025 | 作成時のデフォルト理由 | 作成フォームの変更理由は "Initial fee setting" を自動送信 |
| BR-ADM-026 | 無効化理由必須 | 無効化時は変更理由が必須（1〜1000文字） |
| BR-ADM-027 | 再有効化理由任意 | 再有効化の変更理由は任意（最大1000文字） |
| BR-ADM-028 | 無効化時の影響 | 既存広告は影響なし；無効中は新規購入をブロック |
| BR-ADM-029 | 料金変更の記録 | 全変更を変更前後の値とともに ad_feeHistory へ記録 |
| BR-ADM-030 | 履歴削除の当月保護 | 当月の履歴レコードは削除不可 |
| BR-ADM-031 | 履歴一括削除上限 | 一括削除は最大50件 |

### 4.4 収益分析ルール

| ルールID | ルール名 | 説明 |
|---------|-----------|-------------|
| BR-ADM-040 | デフォルト日付範囲 | 分析のデフォルトは過去30日間 |
| BR-ADM-041 | 日付範囲必須 | 開始日と終了日の両方が必須 |
| BR-ADM-042 | 配置場所フィルター | 配置場所別に絞り込み可能（複数選択） |
| BR-ADM-043 | ティアフィルター | ティア別に絞り込み可能（複数選択） |
| BR-ADM-044 | 収益源 | 承認済み広告の完了済み支払いから収益を集計 |

### 4.5 出力ルール

| ルールID | ルール名 | 説明 |
|---------|-----------|-------------|
| BR-ADM-050 | 形式 | CSV のみ（形式セレクタは CSV に固定・無効化） |
| BR-ADM-051 | 日付範囲 | 開始日と終了日の両方が必須；終了日は開始日以降 |
| BR-ADM-052 | デフォルト日付範囲 | 出力のデフォルトは過去30日間 |
| BR-ADM-053 | 広告パフォーマンスのフィルター | 配置場所・ティア・ステータスのフィルターに対応 |
| BR-ADM-054 | 提出履歴のフィルター | ショップ名検索に対応 |
| BR-ADM-055 | 料金履歴のフィルター | 配置場所・ティアのフィルターに対応 |
| BR-ADM-056 | ファイル名パターン | `{reportType}_from{dateFrom}_to{dateTo}.csv` |

### 4.6 通貨形式

すべての金額はミャンマーチャット（KS）形式で表示する：`15,000 KS`。

---

## 5. 画面仕様

### 5.1 画面: 広告一覧（`/admin/ads`）

**目的:** フィルタリング、検索、一括選択、ページング機能付きですべての広告を表示する。

#### 5.1.1 ページヘッダー

- タイトル: "Advertisement Management"
- サブタイトル: "Review merchant ads and manage advertising fees"
- 保留中件数バッジ（琥珀色）: "{n} pending"
- ナビゲーショタン: "Manage Packages" → `/admin/ads/packages`、"Revenue Analytics" → `/admin/ads/analytics`、"Export" → `/admin/ads/export`

#### 5.1.2 フィルターバー

| フィルター | 種類 | 動作 |
|--------|------|----------|
| ショップ検索 | 検索アイコン付き入力 | 300ms デバウンス；遅延後に API 呼び出し |
| ステータス | 選択 | All Status、Pending、Approved、Rejected |
| 配置場所 | 選択 | All Placements + 4配置場所 |
| ティア | 選択 | All Tiers、Basic、Standard、Premium |
| 日付範囲 | DateRangePicker | From/To 日付入力（From > To の場合 To を自動調整） |
| リフレッシュ | タン | すべてのフィルターをデフォルトにリセット |

- フィルター変更時はページを1にリセット。

#### 5.1.3 一括操作バー

広告選択時に表示。選択件数、"Bulk Approve" タン、"Bulk Reject" タン、"Clear" タンを表示。

#### 5.1.4 広告テーブル

| 列 | 説明 | レスポンシブ |
|--------|-------------|------------|
| チェックボックス | 保留中広告を選択；非保留中は無効 | 全画面 |
| ショップ | ショップ名（切り詰め、最大110px） | 全画面 |
| タイトル | 広告タイトル（切り詰め、最大120px）；ハイライト時は "NEW" バッジ | 全画面 |
| 配置場所 | 配置場所ラベル | xl 未満で非表示 |
| ティア | ティアバッジ（Basic=灰、Standard=青、Premium=紫） | 全画面 |
| ステータス | 承認状態バッジ（Pending=琥珀、Approved=緑、Rejected=赤） | 全画面 |
| 支払 | 支払状態バッジ（Completed=緑、Pending=琥珀、Refunded=灰） | 全画面 |
| 料金 | 支払金額（KS、右寄せ） | 全画面 |
| 提出日 | ISO 日付（YYYY-MM-DD） | 全画面 |
| スケジュール | "Sep 1 ~ Sep 14" 形式 | 全画面 |
| 操作 | 保留中は Review（ペンアイコン）、それ以外は View（目アイコン）；右端固定 | 全画面 |

- 選択行は `bg-secondary/40` 背景
- ハイライト行（通知からのディープリンク）は紫色のインセット枠線と "NEW" バッジ
- ページング: ページサイズ 10/20/50/100（デフォルト10）、スマートページ番号表示（ギャップ付き）

### 5.2 画面: 広告レビューモーダル

**目的:** 管理者が広告内容をレビューし、1件の広告を承認・却下できるようにする。

#### 5.2.1 レイアウト構成

1. **ヘッダー**: タイトル "Review Advertisement"（保留中）または "View Advertisement"（閲覧モード）；ショップ名を表示
2. **ショップ情報**: ショップ名、配置場所ラベル、ティアバッジのグリッド表示
3. **広告プレビュー**:
   - タイトルとステータスバッジ
   - バナー画像（最大320px、object-contain）
   - 告知メッセージ（ある場合）
   - 内容説明（ある場合）
   - SKU ラベル（ある場合）
   - 開始日、終了日、期間（日数）
4. **料金・支払情報**:
   - 日額料金（KS）、期間（日数）、総料金（KS）、支払済み（KS）、支払状態バッジ
   - "Fee locked at purchase time" 注意書き
5. **却下理由**（却下済み広告）: 赤枠セクションに却下理由を表示
6. **却下理由入力**（却下時、2ステップフロー）:
   - ステップ1: "Reject" タンをクリック
   - ステップ2: 必須理由入力欄が表示（最大1000文字、文字カウンター、バリデーションメッセージ）
7. **フッター操作**:
   - 保留中: Cancel、Reject、Approve タン
   - 却下中: Back、Confirm Reject（有効な理由が入力されるまで無効）
   - 閲覧モード: Close タン

### 5.3 画面: 一括承認モーダル

- タイトル: "Bulk Approve Ads"
- 説明: "You are about to approve {count} advertisements."
- 警告アイコン（緑）
- 操作: Cancel、Confirm Approve（処理中は "Approving..." を表示）

### 5.4 画面: 一括却下モーダル

- タイトル: "Bulk Reject Ads"
- 説明: "You are about to reject {count} advertisements."
- 警告アイコン（赤）
- 警告文: "The advertisements will not be displayed. Paid amounts will be refunded in full (100%) according to the refund rule."
- 却下理由テキストエリア（必須、最大1000文字、文字カウンター）
- 操作: Cancel、Confirm Reject（有効な理由が入力されるまで無効）

### 5.5 画面: パッケージ・料金管理（`/admin/ads/packages`）

**目的:** 配置場所・ティアごとの料金設定を表示・作成・編集・無効化・再有効化する。

#### 5.5.1 ページヘッダー

- タイトル: "Package & Fee Management"
- サブタイトル: "Configure advertising fees by placement and tier"
- "Back to Ads" リンク → `/admin/ads`
- "View History" リンク → `/admin/ads/fee-history`
- "Create Fee Setting" タン（12件すべての組み合わせが作成済み場合は無効化）

#### 5.5.2 料金設定テーブル

| 列 | 説明 | レスポンシブ |
|--------|-------------|------------|
| 配置場所 | 配置場所ラベル（切り詰め） | 全画面 |
| ティア | ティアバッジ | 全画面 |
| 日額料金 | 金額（KS、右寄せ） | 全画面 |
| 期間 | "{n} 日" | md 未満で非表示 |
| 総料金 | 金額（KS、右寄せ） | 全画面 |
| 最大広告数 | 整数 | lg 未満で非表示 |
| ステータス | Active（緑）/ Inactive（灰）バッジ | 全画面 |
| 操作 | Edit（ペン）、Deactivate（Ban）または Reactivate（RotateCcw）；右端固定 | 全画面 |

#### 5.5.3 料金作成モーダル

- 配置場所選択（既存の組み合わせは無効化、"(already exists)" を表示）
- ティア選択（同じ一意性ロジック）
- 日額料金入力（数値、ステップ0.01、最小0.01）
- 期間入力（数値、ステップ1、最小1）
- 最大広告数入力（数値、ステップ1、最小1）
- 総料金プレビュー: "Daily rate × Duration"（自動計算、KS で表示）
- 適用開始日デートピッカー（デフォルト: 今日）
- 変更理由フィールドなし — "Initial fee setting" を自動送信

#### 5.5.4 料金編集モーダル

- 現在の配置場所とティアを表示（読み取り専用）
- 現在の総料金を表示
- 日額料金・期間・最大広告数入力（現在値で事前入力）
- 適用開始日デートピッカー（デフォルト: 今日）
- 総料金プレビュー（自動計算）
- 変更理由テキストエリア（必須、最大1000文字）

#### 5.5.5 料金無効化モーダル

- 配置場所とティアバッジを表示
- 注意文: "Existing advertisements are unaffected by this change (fee locking rule). New purchases for this placement and tier will not be available while inactive."
- 変更理由テキストエリア（必須、最大1000文字）

#### 5.5.6 料金再有効化モーダル

- 配置場所とティアバッジを表示
- 注意文: "This package will become available to merchants again with its current rate and configuration."
- 変更理由テキストエリア（任意、最大1000文字）

### 5.6 画面: 料金変更履歴（`/admin/ads/fee-history`）

**目的:** 料金変更履歴をフィルター付きで表示・削除する。

#### 5.6.1 ページヘッダー

- タイトル: "Fee Change History"
- サブタイトル: "Audit trail of fee setting changes"
- "Back to Packages" リンク → `/admin/ads/packages`

#### 5.6.2 フィルター

| フィルター | 種類 | オプション |
|--------|------|---------|
| 月 | 選択 | "All months" + 過去12ヶ月（"September 2026" 形式） |
| 配置場所 | 選択 | All placements + 4配置場所 |
| ティア | 選択 | All tiers + 3ティア |

- フィルター変更時はページをリセットし選択をクリア

#### 5.6.3 一括削除コントロール

- 全選択チェックボックス（削除可能な行のみ）
- 選択件数表示
- 50件超過時の警告: "Maximum 50 records per bulk operation"
- 削除タン（0件選択時または50件超過時は無効）
- クリアタン

#### 5.6.4 保護に関する注意書き

"Fee change history from the current month is protected and cannot be deleted. Select records from previous months to remove them."

#### 5.6.5 料金履歴テーブル

| 列 | 説明 | レスポンシブ |
|--------|-------------|------------|
| チェックボックス | 削除可能なレコードを選択；当月は無効 | 全画面 |
| 日付 | 書式付き日付 | 全画面 |
| 配置場所 | 配置場所ラベル | 全画面 |
| ティア | ティアバッジ | 全画面 |
| 旧料金 | 変更前の日額料金（KS、新規は —） | md 未満で非表示 |
| 新料金 | 変更後の日額料金（KS） | 全画面 |
| 変更者 | 管理者名 | lg 未満で非表示 |
| 理由 | 変更理由（切り詰め、なしの場合は —） | xl 未満で非表示 |
| 操作 | 削除タン（ゴミ箱アイコン）；右端固定；当月は無効 | 全画面 |

### 5.7 画面: 収益分析（`/admin/ads/analytics`）

**目的:** 広告収益の財務チャートとサマリ指標を表示する。

#### 5.7.1 ページヘッダー

- タイトル: "Revenue Analytics"
- サブタイトル: "Revenue overview from approved advertisements"
- "Back to Ads" リンク → `/admin/ads`

#### 5.7.2 フィルター操作

- 日付範囲ピッカー（デフォルト: 29日前〜今日）
- 配置場所マルチ選択
- ティアマルチ選択

#### 5.7.3 コンテンツ構成

1. **サマリ指標**: 総収益、承認済み広告総数、回収料金総額、広告あたり平均収益、返金総額のカード
2. **チャート**（2列グリッド）:
   - 配置場所別収益（棒グラフ）
   - ティア別収益（棒グラフ）
3. **収益推移**（折れ線グラフ、全幅）
4. **データテーブル**（2列グリッド）:
   - 配置場所別広告テーブル（配置場所、広告数、総収益、平均CTR）
   - ティア別広告テーブル（ティア、広告数、総収益、平均CTR）

### 5.8 画面: レポート出力（`/admin/ads/export`）

**目的:** CSV レポートを生成・ダウンロードする。

#### 5.8.1 ページヘッダー

- タイトル: "Export Reports"
- サブタイトル: "Generate CSV reports for advertisements and fee history"
- "Back to Ads" リンク → `/admin/ads`

#### 5.8.2 レポート種別セレクタ

3つの選択肢:
1. **Ad Performance**（デフォルト） — 広告ごとのインプレッション、クリック、CTR、収益
2. **Submission History** — 全広告提出とその状態・結果
3. **Fee History** — タイムスタンプと理由付きの料金設定変更

#### 5.8.3 出力設定フォーム

| フィルター | 種類 | 適用レポート |
|--------|------|------------|
| 日付範囲 | DateRangePicker | 全レポート |
| 配置場所 | マルチ選択 | Ad Performance、Fee History |
| ティア | マルチ選択 | Ad Performance、Fee History |
| ステータス | マルチ選択 | Ad Performance |
| ショップ | 入力（検索） | Submission History |
| 形式 | 選択（無効化、CSV に固定） | 全レポート |

- バリデーション: 終了日は開始日以降であること
- ヘルプテキスト: "Generates and downloads a CSV report. Filters are optional; leave empty to include all."
- 生成タン（処理中はスピナー付き）

---

## 6. 機能操作仕様

### 6.1 操作: 広告一覧

| 属性 | 仕様 |
|-----------|---------------|
| **起動** | `/admin/ads` へ移動 |
| **APIエンドポイント** | `GET /admin/ads` |
| **クエリパラメーター** | `status`、`placement`、`tier`、`shop`、`dateFrom`、`dateTo`、`page`、`limit` |
| **処理** | ショップ情報付きで広告を検索；フィルター適用；ページング（デフォルト10件） |
| **成功レスポンス** | `{ data: AdminAdvertisement[], meta: { page, limit, total, totalPages } }` |

### 6.2 操作: 広告詳細の表示

| 属性 | 仕様 |
|-----------|---------------|
| **起動** | 広告行の Review/View をクリック |
| **APIエンドポイント** | `GET /admin/ads/:id` |
| **成功レスポンス** | analytics、feeInfo、paymentInfo を含む AdminAdDetail |

### 6.3 操作: 広告の単体承認

| 属性 | 仕様 |
|-----------|---------------|
| **起動** | レビューモーダルで "Approve" をクリック |
| **APIエンドポイント** | `POST /admin/ads/:id/approve` |
| **処理** | 承認ステータスを設定、管理者IDとタイムスタンプを記録 |
| **成功レスポンス** | AdminAdApprovalResult |
| **トースト** | "Advertisement approved" |

### 6.4 操作: 広告の単体却下

| 属性 | 仕様 |
|-----------|---------------|
| **起動** | レビューモーダルで "Confirm Reject" をクリック（2ステップ） |
| **APIエンドポイント** | `POST /admin/ads/:id/reject` |
| **リクエストボディ** | `{ rejection_reason: string }` |
| **処理** | 却下ステータスを設定、理由を記録、返金を処理 |
| **成功レスポンス** | AdminAdApprovalResult |
| **トースト** | "Advertisement rejected" |

### 6.5 操作: 一括承認

| 属性 | 仕様 |
|-----------|---------------|
| **起動** | 一括承認モーダルで "Confirm Approve" をクリック |
| **APIエンドポイント** | `POST /admin/ads/bulk/approve` |
| **リクエストボディ** | `{ ad_ids: string[] }` |
| **成功レスポンス** | 承認数を含む AdminBulkResult |
| **トースト** | "{count} advertisements approved" |

### 6.6 操作: 一括却下

| 属性 | 仕様 |
|-----------|---------------|
| **起動** | 一括却下モーダルで "Confirm Reject" をクリック |
| **APIエンドポイント** | `POST /admin/ads/bulk/reject` |
| **リクエストボディ** | `{ ad_ids: string[], rejection_reason: string }` |
| **成功レスポンス** | 却下数、refundsProcessed、refundsFailed を含む AdminBulkResult |
| **トースト** | "{count} advertisements rejected" |

### 6.7 操作: 料金設定の作成

| 属性 | 仕様 |
|-----------|---------------|
| **起動** | 作成モーダルで "Create Fee Setting" をクリック |
| **APIエンドポイント** | `POST /admin/ad-fees` |
| **リクエストボディ** | `{ placement, tier, daily_rate, duration_days, max_ads, effective_from, change_reason }` |
| **処理** | 一意性を検証（配置場所+ティア）；設定を作成（is_active=true）；旧値 null の履歴レコードを作成 |
| **成功レスポンス** | AdminAdFeeSetting |
| **トースト** | "Fee setting created" |

### 6.8 操作: 料金設定の更新

| 属性 | 仕様 |
|-----------|---------------|
| **起動** | 編集モーダルで "Save Changes" をクリック |
| **APIエンドポイント** | `PUT /admin/ad-fees/:id` |
| **リクエストボディ** | `{ daily_rate, duration_days, max_ads, effective_from, change_reason }` |
| **処理** | 旧/新値の履歴レコードを作成；設定を更新 |
| **トースト** | "Fee setting updated" |

### 6.9 操作: 料金設定の無効化

| 属性 | 仕様 |
|-----------|---------------|
| **起動** | 無効化モーダルで "Confirm Deactivate" をクリック |
| **APIエンドポイント** | `PATCH /admin/ad-fees/:id/deactivate` |
| **リクエストボディ** | `{ change_reason: string }` |
| **処理** | is_active=false に設定；新値 null の履歴レコードを作成 |
| **トースト** | "Fee setting deactivated" |

### 6.10 操作: 料金設定の再有効化

| 属性 | 仕様 |
|-----------|---------------|
| **起動** | 再有効化モーダルで "Confirm Reactivate" をクリック |
| **APIエンドポイント** | `PATCH /admin/ad-fees/:id/reactivate` |
| **リクエストボディ** | `{ change_reason?: string }` |
| **処理** | is_active=true に設定 |
| **トースト** | "Fee setting reactivated" |

### 6.11 操作: 料金変更履歴の表示

| 属性 | 仕様 |
|-----------|---------------|
| **起動** | `/admin/ads/fee-history` へ移動 |
| **APIエンドポイント** | `GET /admin/ad-fees/history` |
| **クエリパラメーター** | `placement`、`tier`、`month`（YYYY-MM）、`page`、`limit` |
| **成功レスポンス** | data + meta を含む PaginatedFeeHistory |

### 6.12 操作: 料金履歴の削除

| 属性 | 仕様 |
|-----------|---------------|
| **起動** | 削除モーダルで "Confirm Delete" をクリック（単体または一括） |
| **APIエンドポイント** | `DELETE /admin/ad-fees/history` |
| **リクエストボディ** | `{ history_ids: string[] }` |
| **処理** | 指定レコードを削除；当月レコードは API が拒否 |
| **成功レスポンス** | `{ deletedCount: number, deletedIds: string[] }` |
| **トースト** | "Fee change history deleted" または "{count} fee change history records deleted" |

### 6.13 操作: 収益分析の表示

| 属性 | 仕様 |
|-----------|---------------|
| **起動** | `/admin/ads/analytics` へ移動 |
| **APIエンドポイント** | `GET /admin/ads/analytics/revenue` |
| **クエリパラメーター** | `dateFrom`、`dateTo`、`placement[]`、`tier[]` |
| **成功レスポンス** | summary、byPlacement、byTier、trend を含む RevenueAnalytics |

### 6.14 操作: レポート出力

| 属性 | 仕様 |
|-----------|---------------|
| **起動** | 出力ページで "Generate Report" をクリック |
| **APIエンドポイント** | `POST /admin/ads/export/ad-performance`、`/admin/ads/export/submission-history`、`/admin/ads/export/fee-history` |
| **リクエストボディ** | レポート種別により異なる（セクション5.8.3参照） |
| **処理** | バックエンドが CSV を生成；レスポンスは blob ストリーム |
| **成功レスポンス** | CSV ファイル blob；ブラウザが自動ダウンロード（`{type}_from{from}_to{to}.csv`） |
| **トースト** | "Report generated and download started" |

---

## 7. 入力バリデーションルール

### 7.1 Zod スキーマ（フロントエンド）

| スキーマ | フィールド | ルール |
|--------|-----------|-------|
| `adminRejectSchema` | `rejection_reason` | min(1)、max(1000) |
| `adminBulkApproveSchema` | `ad_ids` | UUID 配列、min(1)、max(50) |
| `adminBulkRejectSchema` | `ad_ids`、`rejection_reason` | 上記と同じ |
| `createFeeSettingSchema` | `placement`、`tier`、`daily_rate`、`duration_days`、`max_ads`、`effective_from`、`change_reason` | 有効な enum；daily_rate ≥ 0.01；duration_days ≥ 1 の整数；max_ads ≥ 1 の整数；有効な日付；change_reason 1〜1000 |
| `editFeeSettingSchema` | 作成と同じ（配置場所・ティアを除く） | 同じルール |
| `deactivateFeeSchema` | `change_reason` | min(1)、max(1000) |
| `reactivateFeeSchema` | `change_reason` | 任意、max(1000) |
| `deleteFeeHistorySchema` | `history_ids` | UUID 配列、min(1)、max(50) |
| `revenueAnalyticsSchema` | `dateFrom`、`dateTo`、`placement[]`、`tier[]` | 有効な日付；任意の配列 |
| `exportSchema` | `reportType`、`dateFrom`、`dateTo`、`placement[]`、`tier[]`、`status[]`、`shop`、`format` | 有効な enum；有効な日付；format は 'csv' のみ |

### 7.2 バリデーションコード

| コード | フィールド | ルール | メッセージ（日本語） |
|------|-------|------|--------------|
| VAL-ADM-001 | rejection_reason | 必須 | 却下理由は必須です |
| VAL-ADM-002 | rejection_reason | 最大1000文字 | 却下理由は1000文字以内で入力してください |
| VAL-ADM-010 | ad_ids | 最小1件 | 少なくとも1つの広告を選択してください |
| VAL-ADM-011 | ad_ids | 最大50件 | 一括操作は最大50件までです |
| VAL-ADM-020 | placement | 必須 enum | 配置場所は必須です |
| VAL-ADM-021 | tier | 必須 enum | ティアは必須です |
| VAL-ADM-022 | daily_rate | 最小0.01 | 日額料金は0より大きい必要があります |
| VAL-ADM-023 | duration_days | 最小1 | 期間は最低1日である必要があります |
| VAL-ADM-024 | max_ads | 最小1 | 最大広告数は最低1である必要があります |
| VAL-ADM-025 | effective_from | 必須日付 | 適用開始日は必須です |
| VAL-ADM-026 | change_reason | 必須 | 変更理由は必須です |
| VAL-ADM-027 | change_reason | 最大1000文字 | 変更理由は1000文字以内で入力してください |
| VAL-ADM-030 | reportType | 必須 enum | レポート種別は必須です |
| VAL-ADM-031 | dateFrom | 必須日付 | 開始日は必須です |
| VAL-ADM-032 | dateTo | 必須日付 | 終了日は必須です |
| VAL-ADM-033 | format | 必須 enum | エクスポート形式は必須です |

### 7.3 フロントエンドバリデーション機能

- **React Hook Form + Zod**: すべてのフォームでリアルタイムバリデーション
- **文字カウンター**: テキストエリアに `{length}/1000` を表示
- **確認タンの無効化**: 有効な入力がされるまで Reject/Confirm タンを無効化
- **配置場所・ティアの一意性**: 作成モーダルで既存の組み合わせをドロップダウンで無効化
- **日付範囲の自動修正**: DateRangePicker で終了日が開始日より前の場合に自動調整

---

## 8. エラー処理仕様

### 8.1 エラーレスポンス構造

```json
{
  "statusCode": 400,
  "message": ["rejection_reason must not be empty"],
  "error": "Bad Request",
  "timestamp": "2026-10-15T12:00:00.000Z"
}
```

### 8.2 エラー分類 — 広告レビュー

| HTTP | シナリオ | トーストメッセージ |
|------|----------|---------------|
| 400 | 却下理由なし | "Rejection reason is required" |
| 400 | 広告が保留中でない | "This advertisement is no longer pending review" |
| 400 | 一括: 空選択 | "At least one ad must be selected" |
| 400 | 一括: 50件超過 | "Maximum 50 ads per bulk operation" |
| 404 | 広告が見つからない | "Advertisement not found" |
| 500 | サーバーエラー | "Failed to approve/reject advertisement" |

### 8.3 エラー分類 — 料金管理

| HTTP | シナリオ | トーストメッセージ |
|------|----------|---------------|
| 400 | 日額料金不正 | "Daily rate must be greater than 0" |
| 400 | 期間不正 | "Duration must be at least 1 day" |
| 400 | 最大広告数不正 | "Max ads must be at least 1" |
| 400 | 変更理由なし | "Change reason is required" |
| 400 | 無効化: 既に無効 | "Fee setting is already inactive" |
| 404 | 料金設定が見つからない | "Fee setting not found" |
| 409 | 配置場所・ティア重複 | "A fee setting already exists for this placement and tier" |
| 500 | サーバーエラー | "Failed to create/update/deactivate/reactivate fee setting" |

### 8.4 エラー分類 — 料金履歴削除

| HTTP | シナリオ | トーストメッセージ |
|------|----------|---------------|
| 400 | 当月保護 | "Fee change history from the current month is protected" |
| 400 | 空選択 | リクエストなし |
| 400 | 50件超過 | "Maximum 50 records per bulk operation" |
| 500 | サーバーエラー | "Failed to delete fee change history" |

### 8.5 エラー分類 — 分析・出力

| HTTP | シナリオ | トーストメッセージ |
|------|----------|---------------|
| 400 | 日付範囲不正 | "End date must be after start date" |
| 400 | レポート種別不正 | "Invalid report type" |
| 500 | 出力生成失敗 | "Failed to generate report" |

### 8.6 フロントエンドのエラー表示

- **トースト通知**: すべての API エラー（destructive バリアント）と成功（default バリアント）
- **インラインバリデーション**: 不正な入力に赤枠とフィールド下のエラーテキスト
- **API エラーメッセージ**: axios エラーレスポンスから抽出（string と string[] の両形式に対応）
- **ローディングスピナー**: 処理中のタンにスピナー表示
- **タンの無効化**: 処理中の操作を防ぐためにタンを無効化

---

## 9. 権限・アクセス制御

### 9.1 認証

- すべての API リクエストで `Authorization` ヘッダーに JWT Bearer Token を付与
- Axios インターセプターが自動的にトークンを付与

### 9.2 保護対象ルート（管理者専用）

`/admin/ads/*` 配下の5ページはすべて admin ロールが必要:
- `/admin/ads` — 広告一覧
- `/admin/ads/packages` — 料金設定
- `/admin/ads/fee-history` — 料金履歴
- `/admin/ads/analytics` — 収益分析
- `/admin/ads/export` — レポート出力

### 9.3 ロールベースアクセス

| ロール | アクセス |
|------|--------|
| `buyer` | アクセス不可 |
| `merchant` | アクセス不可 |
| `admin` | 全機能アクセス可能 |

---

## 10. リアルタイム通知動作

### 10.1 通知イベント

| イベント | トリガー | 受信者 | メッセージ |
|-------|---------|-----------|---------|
| 広告承認 | 管理者が広告を承認 | ショップ所有者 | "Your advertisement '{title}' has been approved" |
| 広告却下 | 管理者が広告を却下 | ショップ所有者 | "Your advertisement '{title}' has been rejected. Reason: {reason}" |

### 10.2 ディープリンク

- 新規広告提出通知は `/admin/ads?highlightAdId={uuid}` にリンク
- ハイライトされた広告行は紫色のインセット枠線と "NEW" バッジを表示
- ハイライトは3秒後に消去
- 通知から遷移した場合、ステータスフィルターを自動クリア

---

## 11. 画面遷移仕様

### 11.1 ナビゲーションマップ

```
/admin/ads (index)
  ├── [Review] → 広告レビューモーダル（オーバーレイ）
  ├── [View] → 広告レビューモーダル（閲覧モード、オーバーレイ）
  ├── [Bulk Approve] → 一括承認モーダル（オーバーレイ）
  ├── [Bulk Reject] → 一括却下モーダル（オーバーレイ）
  ├── [Manage Packages] → /admin/ads/packages
  ├── [Revenue Analytics] → /admin/ads/analytics
  └── [Export] → /admin/ads/export

/admin/ads/packages
  ├── [Create Fee Setting] → 料金作成モーダル（オーバーレイ）
  ├── [Edit] → 料金編集モーダル（オーバーレイ）
  ├── [Deactivate] → 料金無効化モーダル（オーバーレイ）
  ├── [Reactivate] → 料金再有効化モーダル（オーバーレイ）
  ├── [View History] → /admin/ads/fee-history
  └── [Back to Ads] → /admin/ads

/admin/ads/fee-history
  ├── [Delete row] → 履歴削除モーダル（オーバーレイ、単体）
  ├── [Delete selected] → 履歴削除モーダル（オーバーレイ、一括）
  └── [Back to Packages] → /admin/ads/packages

/admin/ads/analytics
  └── [Back to Ads] → /admin/ads

/admin/ads/export
  └── [Back to Ads] → /admin/ads
```

---

## 12. 非機能要件

### 12.1 技術スタック

| レイヤー | 技術 |
|-------|------------|
| フレームワーク | React 19 + TypeScript |
| データ取得 | TanStack Query (React Query) |
| スキーマ検証 | Zod |
| フォーム管理 | React Hook Form + Zod Resolver |
| スタイリング | Tailwind CSS 4 |
| UI コンポーネント | shadcn/ui |
| チャート | AnalyticsCharts コンポーネント |
| HTTP クライアント | Axios（インターセプター付き） |
| 国際化 | react-i18next（英語・日本語） |

### 12.2 データ取得パターン

- **クエリキー**: `['admin-ads', params]`、`['fee-settings']`、`['fee-history', params]`、`['analytics', params]`
- **Stale time**: すべてのクエリで30秒
- **クエリ無効化**: ミューテーション成功時に自動実行
- **有効条件**: 広告詳細クエリは id が truthy の場合のみ実行

### 12.3 レスポンシブデザイン

- **広告テーブル**: 配置場所列は xl 未満で非表示；操作列は右端固定
- **料金設定テーブル**: 期間は md 未満、最大広告数は lg 未満で非表示
- **料金履歴テーブル**: 旧料金は md 未満、変更者は lg 未満、理由は xl 未満で非表示
- **分析**: チャートとテーブルはモバイルで1列に積み重ね
- **出力**: フィルターフォームはモバイルで縦積み

### 12.4 ページング

- ページサイズ: 10、20、50、100（デフォルト10）
- スマートページ番号表示: 最大7ページチップ、大きいページ数ではギャップ表示
- ページサイズまたはフィルター変更時は1ページ目にリセット
- 料金履歴ページはページ変更時に選択をクリア

---

## 13. 設定可能項目

| 項目 | 値 | 場所 |
|------|-------|-----------|
| デフォルトページサイズ | 10 | `Pagination.tsx` |
| ページサイズオプション | [10, 20, 50, 100] | `Pagination.tsx` |
| デフォルト分析日付範囲 | 過去30日間 | `analytics.tsx`、`export.tsx` |
| 一括操作最大件数 | 50 | Zod スキーマ |
| 履歴一括削除最大件数 | 50 | Zod スキーマ |
| パッケージ組み合わせ総数 | 12（4×3） | `packages.tsx` |
| 作成時デフォルト変更理由 | "Initial fee setting" | `CreateFeeModal.tsx` |
| Stale time | 30秒 | すべてのクエリフック |
| デバウンス遅延（ショップ検索） | 300ms | `FilterBar.tsx` |
| ハイライト表示時間 | 3秒 | `index.tsx` |
| 通貨形式 | `{value} KS` | `format.ts` |

---

## 14. 相互参照トレーサビリティマトリクス

### 14.1 要件トレーサビリティ

| 要件 | 画面 | 操作 |
|-------------|---------|------------|
| 広告は管理者承認が必要 | 5.1 | 6.1–6.6 |
| 一括承認・却下 | 5.1、5.3、5.4 | 6.5–6.6 |
| 配置場所・ティア別の料金 CRUD | 5.5 | 6.7–6.10 |
| 料金変更の監査証跡 | 5.6 | 6.11–6.12 |
| 収益分析 | 5.7 | 6.13 |
| CSV 出力 | 5.8 | 6.14 |
| 料金履歴削除 | 5.6 | 6.12 |

### 14.2 コンポーネントトレーサビリティ

| コンポーネント | 画面 | 目的 |
|-----------|------|---------|
| `FilterBar` | 広告一覧 | ステータス/配置場所/ティア/ショップ/日付でフィルター |
| `AdTable` | 広告一覧 | チェックボックス付き広告一覧表示 |
| `Pagination` | 広告一覧、料金履歴 | ページナビゲーション + ページサイズ選択 |
| `AdReviewModal` | 広告一覧（オーバーレイ） | 広告のレビューと承認/却下 |
| `BulkApproveModal` | 広告一覧（オーバーレイ） | 一括承認の確認 |
| `BulkRejectModal` | 広告一覧（オーバーレイ） | 理由入力と一括却下の確認 |
| `FeeSettingsTable` | パッケージ | 料金設定一覧の表示 |
| `CreateFeeModal` | パッケージ（オーバーレイ） | 新しい料金設定の作成 |
| `EditFeeModal` | パッケージ（オーバーレイ） | 既存料金設定の編集 |
| `DeactivateFeeModal` | パッケージ（オーバーレイ） | 理由付き無効化 |
| `ReactivateFeeModal` | パッケージ（オーバーレイ） | 再有効化 |
| `FeeHistoryTable` | 料金履歴 | 削除チェックボックス付き履歴表示 |
| `DeleteFeeHistoryModal` | 料金履歴（オーバーレイ） | 削除の確認 |
| `DateRangePicker` | 複数画面 | 日付範囲選択（自動修正付き） |
| `ReportTypeSelector` | 出力 | レポート種別の選択 |
| `ExportConfigForm` | 出力 | 出力設定と生成 |
| `AnalyticsMetrics` | 分析 | サマリ指標カード |
| `AnalyticsCharts` | 分析 | 収益チャート |
| `AnalyticsTables` | 分析 | 収益データテーブル |

---

*機能設計書（管理者広告管理画面）終わり*
