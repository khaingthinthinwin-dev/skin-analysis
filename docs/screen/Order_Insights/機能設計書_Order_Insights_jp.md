# 機能設計書（Functional Specification）— Order Insights（注文インサイト）

---

## 文書管理（Document Control）

| 属性 | 値 |
|------|-----|
| **文書ID** | SKM-FDS-OI-001 |
| **対象画面** | Buyer Order Insights（購入者の注文履歴・注文詳細・注文追跡）、Merchant Order Insights（販売者の注文管理・売上サマリー・収益サマリー）、Admin Order Insights（全注文管理） |
| **サブシステム** | Order Insights |
| **機能ID** | FN-OI-001（Buyer Order Insights）、FN-OI-002（Merchant Order Insights）、FN-OI-003（Admin Order Insights） |
| **バージョン** | 2.0 |
| **作成日** | 2026-08-14 |
| **最終更新日** | 2026-08-21 |
| **作成者** | Software Architect |
| **ステータス** | Draft（レビュー中） |
| **区分** | Internal — Engineering Division（社内・開発部門向け） |

---

## 文書改訂履歴（Document Revision History）

| バージョン | 日付 | 作成者 | 変更内容 |
|------------|------|--------|----------|
| 1.0 | 2026-08-14 | Software Architect | Sales & Analytics サブシステムの初期機能設計書。Merchant Sales Dashboard、Merchant Analytics、Admin Analytics & Reports 画面を対象とする。 |
| 1.1 | 2026-08-14 | Software Architect | 販売者のライセンス状態ゲートおよび販売者ID解決パターンを追加（確定済みの `merchants` テーブル定義に合わせるため）。 |
| 2.0 | 2026-08-21 | Software Architect | **サブシステム名を Sales & Analytics → Order Insights に変更**し、要件定義書 §3.3 / §4.5 / §5.6 / §6.4 に再スコープ。対象外の分析機能を削除（売上推移グラフ、商品実績、顧客属性、管理者向けプラットフォームダッシュボード、ユーザー増減、カテゴリ実績、販売者ランキング、CSV レポート出力）。Buyer Order History / Order Detail / Order Tracking（§3.3）および Admin All Orders（ショップ/販売者・ステータス絞り込み付き、§5.6）を追加。Merchant のスコープを自ショップの Order History、Order Detail（明細＋顧客情報）、Order Tracking、Sales Summary、Revenue Summary（§4.5）に限定。Revenue Summary の計算式を PM と確認（BR-OI-020~024）。**AOV は総売上（Gross）ではなく純収益（Net Revenue）を基準に算出**する。注文ステータス列挙型を DATABASE_SPEC §3.1 に合わせて再調整（`placed → confirmed → packed → shipped → out_for_delivery → delivered`）。注文作成時のコミッション率スナップショットのスキーマギャップは未解決である。 |

---

## 目次（Table of Contents）

1. [機能概要](#1-機能概要)
2. [ユースケースとビジネスワークフロー](#2-ユースケースとビジネスワークフロー)
3. [状態遷移仕様](#3-状態遷移仕様)
4. [ビジネスルール](#4-ビジネスルール)
5. [画面仕様](#5-画面仕様)
6. [機能操作仕様](#6-機能操作仕様)
7. [入出力仕様](#7-入出力仕様)
8. [入力検証ルール](#8-入力検証ルール)
9. [エラーハンドリング仕様](#9-エラーハンドリング仕様)
10. [権限とアクセス制御](#10-権限とアクセス制御)
11. [リアルタイム通知の挙動](#11-リアルタイム通知の挙動)
12. [画面遷移仕様](#12-画面遷移仕様)
13. [非機能要件](#13-非機能要件)
14. [設定可能項目（外部定義）](#14-設定可能項目外部定義)
15. [クロスリファレンス・トレーサビリティマトリクス](#15-クロスリファレンストレーサビリティマトリクス)

---

## 1. 機能概要（Functional Overview）

### 1.1 目的とスコープ

**Order Insights** サブシステムは、各ロールに対してそのロールに属する注文を表示し、さらに販売者向けにはそれらの注文から導出される売上・収益サマリーを提供します。本サブシステムは、3 ロールすべてについて注文履歴・注文詳細・注文追跡を仕様化する単一の場所です。

本サブシステムは**完全な読み取り専用**です。すべての数値は、クエリ実行時に `orders`、`order_items`、`commission_settings` を集計して導出されます。本バージョンでは集計結果を保持する派生サマリーテーブルは作成されません。

**スコープ境界（書き込み操作）：** 注文ステータスの進行（advancing）は **Order Fulfillment モジュール**が所有しており、**本サブシステムの対象外**です。Order Insights は `orders.status` および `order_status_history` を追跡表示・注文数・キャッシュ無効化（§11.2）のために*読み取る*のみです。本サブシステムが注文データへ書き込むことは一切ありません。

**スコープ境界（v2.0 で削除された分析機能）：** 売上推移グラフ、商品実績、顧客属性、管理者向けプラットフォームダッシュボード、ユーザー増減分析、カテゴリ実績、販売者収益ランキング、CSV レポート出力は v1.1 に含まれていましたが、**対象外となりました**。プラットフォームレベルの収益、コミッション設定、支払（payout）、収益目標は **Revenue & Commission** サブシステム（要件定義書 §5.7）に属します。

### 1.2 機能責務（Functional Responsibilities）

**Buyer（購入者、要件定義書 §3.3）**

1. **Order History（注文履歴）** — 購入者は自身の過去のすべての注文を閲覧する。
2. **Order Detail（注文詳細）** — 購入者は自身の注文の明細・合計・支払ステータスを閲覧する。
3. **Order Tracking（注文追跡）** — 購入者は自身の注文のステータスタイムラインを閲覧する。

**Merchant（販売者、要件定義書 §4.5）**

4. **Order History（自ショップのみ）** — 販売者は自身のショップに対して発生した注文を閲覧する。
5. **Order Detail（注文詳細）** — 販売者は自身のショップの注文について、注文明細**および顧客情報**を閲覧する。
6. **Order Tracking（注文追跡）** — 販売者は自身のショップの注文のステータスタイムラインを閲覧する。
7. **Sales Summary（売上サマリー）** — 販売者は自ショップの注文数（本日・今月・完了）を閲覧する。
8. **Revenue Summary（収益サマリー）** — 販売者は自ショップの**売上（Sales）、コミッション（Commission）、収益（Revenue）、平均注文額（AOV）**をまとめて閲覧する（BR-OI-021~025）。

**Admin（管理者、要件定義書 §5.6）**

9. **All Orders（全注文）** — 管理者はプラットフォーム上のすべての注文を閲覧する。
10. **Orders by Merchant / Shop（販売者・ショップ別注文）** — 管理者は注文リストをショップまたは販売者で絞り込む。
11. **Orders by Status（ステータス別注文）** — 管理者は注文リストを注文ステータスで絞り込む。

**共有（要件定義書 §6.4）**

12. **Own-Scope Enforcement（自スコープの強制）** — すべてのロールは自身のスコープの注文のみを閲覧する。購入者 → 自身の注文、販売者 → 自身のショップの注文、管理者 → プラットフォーム全体の注文。サーバーサイドで強制される（BR-OI-001~004）。

### 1.3 対象ユーザー（Target Users）

| 属性 | 値 |
|------|-----|
| **主アクター（Buyer）** | 自身の注文履歴・詳細・追跡を閲覧する認証済み購入者 |
| **主アクター（Merchant）** | 自身のショップの注文・売上サマリー・収益サマリーを閲覧する、ライセンス承認済みの認証済み販売者 |
| **主アクター（Admin）** | ショップ/販売者およびステータス絞り込み付きでプラットフォーム全体の注文を閲覧する認証済み管理者 |
| **必要な認証** | すべてのエンドポイントで JWT Bearer Token（公開アクセスなし） |
| **データスコープ** | Buyer: `orders.buyer_id = self`。Merchant: `orders.merchant_id = 自身の merchants.id`。Admin: プラットフォーム全体。（§6.4） |

### 1.4 他機能・周辺システムとの関係（Relationships with Other Functions and Peripheral Systems）

```text
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Buyer Actor  │  │Merchant Actor│  │ Admin Actor  │
│ own orders   │  │ own shop     │  │ all orders   │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
        │                 │                 │
        └────────┬────────┴────────┬────────┘
                 ▼                 ▼
       ┌────────────────────────────────────────────┐
       │           Order Insights Module            │
       │  GET /orders            (role-scoped list) │
       │  GET /orders/:id        (detail)           │
       │  GET /orders/:id/tracking                  │
       │  GET /order-insights/merchant/sales-summary│
       │  GET /order-insights/merchant/revenue-summary
       └───────────────┬────────────────────────────┘
                       │ Reads / Aggregates (read-only)
    ┌──────────────┬───┴──────────┬──────────────┬──────────────┐
    ▼              ▼              ▼              ▼              ▼
 ┌──────────┐ ┌──────────┐ ┌──────────────┐ ┌──────────┐ ┌──────────────┐
 │ orders   │ │order_items│ │order_status_ │ │merchants │ │ commission_  │
 │buyer_id, │ │merchant_id│ │  history     │ │id,user_id│ │  settings    │
 │merchant_ │ │quantity,  │ │order_id,     │ │license_  │ │commission_   │
 │id,status,│ │unit_price,│ │status_id,    │ │status    │ │rate          │
 │total_amt │ │total_price│ │created_at    │ │shop_name │ │              │
 └──────────┘ └──────────┘ └──────────────┘ └──────────┘ └──────────────┘
       ▲              ▲
       │ writes       │
 ┌─────┴──────────────┴──────────┐   ┌──────────────────────────────┐
 │ Order Fulfillment module      │   │ Revenue & Commission module  │
 │ (status updates — OUT OF      │   │ (platform revenue, payouts,  │
 │  SCOPE, §6.6)                 │   │  rate config — OUT OF SCOPE) │
 └───────────────────────────────┘   └──────────────────────────────┘
```
> Order Insights は**書き込みを行わない**。`orders.status` の遷移は Order Fulfillment モジュールが所有し、コミッション**率**は Revenue & Commission モジュール（§5.7）が所有し、ここでは*読み取る*のみである。

### 1.5 入力／出力（Inputs / Outputs）

| 入力情報 | データ区分 | ソース／説明 |
|----------|------------|--------------|
| `status` | クエリパラメータ | 注文ステータス絞り込み（`placed`/`confirmed`/`packed`/`shipped`/`out_for_delivery`/`delivered`）— 全ロール |
| `merchantId` | クエリパラメータ | 販売者による注文絞り込み — **管理者のみ**（§5.6） |
| `shopId` | クエリパラメータ | ショップによる注文絞り込み — **管理者のみ**（§5.6） |
| `from` / `to` | クエリパラメータ | 注文日範囲（ISO 8601、UTC） |
| `period` | クエリパラメータ | 収益サマリーの期間：`today`、`this_month`、`last_month`、`custom` |
| `page` / `limit` | クエリパラメータ | 注文履歴リストのページネーション |
| `sort` / `order` | クエリパラメータ | ソート項目（`createdAt`/`totalAmount`/`status`）および方向 |
| `id` | パスパラメータ | 注文詳細／追跡用の注文ID（UUID） |

| 出力情報 | データ区分 | 送信先／説明 |
|----------|------------|--------------|
| `orders` | 注文データ | ロールスコープの注文履歴行 |
| `orderDetail` | 注文データ | 注文ヘッダ、明細、合計、支払ステータス（＋販売者/管理者向け顧客情報） |
| `tracking` | タイムラインデータ | `order_status_history` から構成される順序付きステータスタイムライン |
| `salesSummary` | 集計データ | 注文数：本日、今月、完了 |
| `revenueSummary` | 集計データ | **売上、コミッション、収益、AOV — 常にまとめて返却（BR-OI-026）** |
| `filters` | 参照データ | 利用可能なショップ/販売者およびステータス絞り込み選択肢（管理者） |
| `meta` | ページネーションメタ | ページ、limit、total、totalPages |

### 1.6 関連文書（Related Documents）

| No. | 文書ID | 文書名 | ファイルパス／参照 | 備考 |
|-----|--------|--------|-------------------|------|
| 1 | SKM-REQ-001 | 要件定義書 | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | §3.3 Order Insights（Buyer）、§4.5 Order Insights（Merchant）、§5.6 Order Insights（Admin）、§6.4 Order Insights（Shared）、§7.3 Orders、§7.7 Monetization、§2.2 権限マトリクス |
| 2 | SKM-DBS-001 | データベース設計書 | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | §3.1 `order_statuses`、§3.2 `merchants`、§3.9 `orders`、§3.10 `order_items`、§3.11 `shops`、§3.17 `commission_settings`、§3.25 `order_status_history` |
| 3 | SKM-DEV-001 | 開発ルール | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` | ダッシュボード/テーブル設計、デザイントークン、RBAC、`[HAML]` Order Insights の所有権 |

---

## 2. ユースケースとビジネスワークフロー（Use Cases and Business Workflow）

### 2.1 ユースケース一覧（Use Case Catalog）

| UC-ID | ユースケース名 | ロール | 事前条件 | 事後条件 |
|-------|----------------|--------|----------|----------|
| UC-OI-001 | 自身の注文履歴を閲覧 | Buyer | 購入者が認証済み。 | 購入者自身の注文のページネーション付きリストを表示。 |
| UC-OI-002 | 自身の注文詳細を閲覧 | Buyer | 購入者が認証済み。注文が購入者自身に属する。 | 注文明細、合計、支払ステータスを表示。 |
| UC-OI-003 | 自身の注文を追跡 | Buyer | 購入者が認証済み。注文が購入者自身に属する。 | ステータスタイムライン（placed → … → delivered）を表示。 |
| UC-OI-004 | 自ショップの注文履歴を閲覧 | Merchant | 販売者が認証済みかつ `license_status = 'approved'`。 | 販売者自身のショップの注文のページネーション付きリストを表示。 |
| UC-OI-005 | 自ショップの注文詳細を閲覧 | Merchant | 販売者が認証済み。注文が販売者のショップに属する。 | 注文明細**および顧客情報**を表示。 |
| UC-OI-006 | 自ショップの注文を追跡 | Merchant | 販売者が認証済み。注文が販売者のショップに属する。 | ステータスタイムラインを表示。 |
| UC-OI-007 | 売上サマリーを閲覧 | Merchant | 販売者が認証済みかつ承認済み。 | 注文数（本日／今月／完了）を表示。 |
| UC-OI-008 | 収益サマリーを閲覧 | Merchant | 販売者が認証済みかつ承認済み。 | **売上、コミッション、収益、AOV をまとめて表示。** |
| UC-OI-009 | 全注文を閲覧 | Admin | 管理者が認証済み。 | プラットフォーム全体の注文のページネーション付きリストを表示。 |
| UC-OI-010 | ショップ／販売者で注文を絞り込み | Admin | 管理者が認証済み。 | 注文リストを選択したショップ/販売者に絞り込み。 |
| UC-OI-011 | ステータスで注文を絞り込み | Admin | 管理者が認証済み。 | 注文リストを選択した注文ステータスに絞り込み。 |
| UC-OI-012 | 任意の注文の詳細／追跡を閲覧 | Admin | 管理者が認証済み。 | 任意のプラットフォーム注文の詳細と追跡を表示。 |

> **対象外：** 注文ステータスの進行（Order Fulfillment モジュール）、プラットフォームレベルの収益/コミッション/支払管理（Revenue & Commission モジュール、要件定義書 §5.7）。

### 2.2 主要ビジネスワークフロー — Buyer（§3.3）

```
       ┌──────────────────────┐
       │  Buyer Logs In       │
       │  (JWT Authenticated) │
       └──────────┬───────────┘
                  ▼
       ┌──────────────────────┐
       │  /orders             │
       │  Order History       │
       │  (UC-OI-001)         │
       └──────────┬───────────┘
                  │ click order row
                  ▼
       ┌──────────────────────┐        ┌──────────────────────┐
       │  /orders/:id         │───────►│  /orders/:id/tracking│
       │  Order Detail        │        │  Status Timeline     │
       │  items, totals,      │        │  (UC-OI-003)         │
       │  payment status      │        │                      │
       │  (UC-OI-002)         │        └──────────────────────┘
       └──────────────────────┘
```
> 購入者には `orders.buyer_id = self` の注文**のみ**が表示される（BR-OI-002）。購入者には顧客情報パネルは描画されない（自身のデータであるため）、また売上/収益の数値は購入者に公開されない（BR-OI-005）。

### 2.3 主要ビジネスワークフロー — Merchant（§4.5）

```
       ┌──────────────────────┐
       │  Merchant Logs In    │
       │  license = approved  │
       └──────────┬───────────┘
                  ▼
       ┌──────────────────────────────────┐
       │  /merchant/orders                │
       │  Order Insights (own shop only)  │
       └──────────┬───────────────────────┘
                  │
    ┌─────────────┼───────────────┬────────────────────┐
    ▼             ▼               ▼                    ▼
 ┌─────────┐ ┌──────────┐ ┌────────────────┐ ┌──────────────────────┐
 │ Order   │ │ Order    │ │ Sales Summary  │ │ Revenue Summary      │
 │ History │ │ Detail   │ │ today / month  │ │ Sales · Commission   │
 │(UC-004) │ │ items +  │ │ completed      │ │ Revenue · AOV        │
 │         │ │ customer │ │ (UC-007)       │ │ (all four together)  │
 │         │ │(UC-005)  │ │                │ │ (UC-008)             │
 └─────────┘ └────┬─────┘ └────────────────┘ └──────────────────────┘
                  ▼
         ┌──────────────────┐
         │ Order Tracking   │
         │ (UC-OI-006)      │
         └──────────────────┘
```
> 販売者には `orders.merchant_id = 自身の merchants.id` の注文**のみ**が表示される（BR-OI-003）。売上/収益サマリーはまさにその同じスコープを集計する — 販売者が他の販売者の数値やプラットフォーム集計を見ることはない。

> **ステータスの読み取り専用動作：** 販売者の Order Detail は現在のステータスとステータス履歴を表示する。**Change Status** アクションは Order Fulfillment へ遷移するだけであり、ステータス更新 API の呼び出し、`orders.status` の変更、`order_status_history` への書き込み、状態遷移はここでは行わない。フローは **Order Details -> Change Status -> Order Fulfillment -> Update Status** である。

### 2.4 主要ビジネスワークフロー — Admin（§5.6）

```
       ┌──────────────────────┐
       │  Admin Logs In       │
       └──────────┬───────────┘
                  ▼
       ┌──────────────────────────────────┐
       │  /admin/orders — All Orders      │
       │  (UC-OI-009)                     │
       └──────────┬───────────────────────┘
                  │
    ┌─────────────┴──────────────┐
    ▼                            ▼
 ┌────────────────────┐  ┌────────────────────┐
 │ Filter by          │  │ Filter by          │
 │ shop / merchant    │  │ order status       │
 │ (UC-OI-010)        │  │ (UC-OI-011)        │
 └─────────┬──────────┘  └─────────┬──────────┘
           └───────────┬───────────┘
                       ▼
           ┌──────────────────────────┐
           │ /admin/orders/:id        │
           │ Detail + Tracking        │
           │ (UC-OI-012)              │
           └──────────────────────────┘
```
> 絞り込みは**組み合わせ可能**（ショップ AND ステータス AND 日付範囲）であり、サーバーサイドで適用される（BR-OI-016）。

### 2.5 データ依存 — 注文ステータス更新（Order Fulfillment モジュール）

Order Insights はステータス変更の純粋な消費者である。

| 手順 | アクション | モジュール |
|:----:|------------|------------|
| 1 | 販売者/管理者が注文のステータスを進行させる | Order Fulfillment |
| 2 | `orders.status` を更新し、`order_status_history` に行を追加する | Order Fulfillment |
| 3 | `cache:oi:merchant:{merchantId}:summary` を無効化する（モジュール間契約、§11.2） | Order Fulfillment |
| 4 | Order Insights は次回リクエスト時にステータス/履歴を再読み取りする | Order Insights（読み取り専用） |

---

## 3. 状態遷移仕様（State Transition Specification）

> 注文ステータスのステートマシンは **Order Fulfillment モジュールが所有し強制**する。ここで規定するのは、Order Insights がそれを描画するため（注文追跡タイムライン、ステータスバッジ）および計数するため（Sales Summary、BR-OI-018）である。

### 3.1 注文ステータスの状態（DATABASE_SPEC §3.1 `order_statuses`）

| 表示順 | 状態 | DB値 | 説明 | 終端か |
|:---:|------|------|------|:---:|
| 1 | `PLACED` | `'placed'` | 注文作成済み、確認待ち | ✗ |
| 2 | `CONFIRMED` | `'confirmed'` | 販売者が注文を承認 | ✗ |
| 3 | `PACKED` | `'packed'` | 梱包完了、発送準備完了 | ✗ |
| 4 | `SHIPPED` | `'shipped'` | 配送業者へ引き渡し済み | ✗ |
| 5 | `OUT_FOR_DELIVERY` | `'out_for_delivery'` | 購入者へ配送中 | ✗ |
| 6 | `DELIVERED` | `'delivered'` | 購入者が受け取り完了 | ✓ |

> 要件定義書 §3.3 は購入者向けタイムラインを略式（"placed → confirmed → shipped → delivered"）で記述している。追跡画面は `order_statuses` の**全6状態**を `display_order` 順に描画する（BR-OI-013）。略式は表示上の省略であり、別の状態集合ではない。

### 3.2 注文ステータス遷移表

| 遷移ID | 起点状態 | 到達状態 | トリガーアクション |
|--------|----------|----------|--------------------|
| TR-OI-01 | `PLACED` | `CONFIRMED` | 販売者が注文を確認 |
| TR-OI-02 | `CONFIRMED` | `PACKED` | 販売者が梱包 |
| TR-OI-03 | `PACKED` | `SHIPPED` | 配送業者へ引き渡し |
| TR-OI-04 | `SHIPPED` | `OUT_FOR_DELIVERY` | 配送業者が配送開始 |
| TR-OI-05 | `OUT_FOR_DELIVERY` | `DELIVERED` | 購入者が受け取り |

> ルール：**前方のみ**（TR-OI-01→05）。後戻りなし、スキップなし。`delivered` は終端（`is_terminal_state = TRUE`）。Order Fulfillment モジュールが強制 — Order Insights は遷移をトリガーしない。

### 3.3 追跡タイムラインの描画状態

| 状態 | 説明 | 描画 |
|------|------|------|
| `STEP_DONE` | `order_status_history` に行があるステータス | 塗りつぶしマーカー＋実際のタイムスタンプ |
| `STEP_CURRENT` | `orders.status` と等しいステータス | 強調マーカー（Luxury Purple #7C3AED）＋タイムスタンプ |
| `STEP_UPCOMING` | まだ到達していない以降のステータス | ミュート色マーカー、タイムスタンプなし |
| `STEP_UNKNOWN` | 履歴行が存在しない（レガシー注文） | タイムラインは現在のステータスのみに折りたたみ、注記を添える（BR-OI-014） |

### 3.4 サマリークエリ／キャッシュ状態

| 状態 | 説明 | TTL | 挙動 |
|------|------|:---:|------|
| `CACHE_COLD` | 販売者サマリーがキャッシュされていない | — | DB を参照し Redis を初期投入 |
| `CACHE_WARM` | 販売者サマリーがキャッシュ済み | 5分 | キャッシュ応答を返す |
| `CACHE_INVALIDATED` | 注文作成またはステータス更新（Checkout / Order Fulfillment による） | — | `DEL cache:oi:merchant:{merchantId}:summary`；次回リクエストで再参照 |

---

## 4. ビジネスルール（Business Rules）

### 4.1 データスコープ＆認可ルール（§6.4 — 各ロールは自身のスコープのみ閲覧）

| ルールID | ルール名 | 説明 | 強制レイヤー |
|----------|----------|------|--------------|
| BR-OI-001 | Own-Scope Principle（自スコープ原則） | **すべての** Order Insights クエリは、呼び出し元自身のデータにサーバーサイドでスコープされる。クライアントは自らのID絞り込みを与えない。非管理者ロールからのクライアント指定 `buyerId`/`merchantId` は無視される。 | バックエンド（クエリスコープ） |
| BR-OI-002 | Buyer Scope（購入者スコープ） | 購入者クエリは `orders.buyer_id = currentUser.id` にスコープされる。購入者は他の購入者の注文や、いかなる販売者/プラットフォーム集計も見ることはできない。 | バックエンド（クエリスコープ） |
| BR-OI-003 | Merchant Scope（販売者スコープ） | 販売者クエリは `merchants.id` を `merchants.user_id = currentUser.id` から解決し、すべてのクエリを `orders.merchant_id = <解決済み merchants.id>` にスコープしなければならない。販売者が他の販売者の注文や数値を見ることはできない。 | バックエンド（クエリスコープ） |
| BR-OI-004 | Admin Scope（管理者スコープ） | 管理者クエリは暗黙の所有者フィルタなしでプラットフォーム全体の注文を対象とする。ショップ/販売者およびステータス絞り込みは**任意かつ明示的**（§5.6）。 | バックエンド（クエリスコープ） |
| BR-OI-005 | Role Requirement（ロール要件） | Order History / Detail / Tracking：`buyer`、`merchant`、`admin`（各々自身のスコープ内）。Sales Summary と Revenue Summary： `merchant` および `admin` のみ — 購入者はアクセス**不可**（"View Order Insights" = ❌ for buyer、要件定義書 §2.2）。 | バックエンド（RBAC） |
| BR-OI-006 | Merchant Eligibility Gate（販売者資格ゲート） | `merchant` ロールは、任意の販売者 Order Insights エンドポイントへアクセスするために `merchants.license_status = 'approved'` でなければならない。それ以外の場合は `403 FORBIDDEN` — "Your merchant account is not approved"。`admin` ロールはこのチェックをバイパスする。 | バックエンド（RBAC／ライセンスゲート） |
| BR-OI-007 | Read-Only Subsystem（読み取り専用サブシステム） | Order Insights は**書き込み操作を一切公開しない**。ステータス更新は Order Fulfillment モジュールが所有し、コミッション率設定と支払は Revenue & Commission（§5.7）が所有する。 | バックエンド（メソッド設計） |
| BR-OI-008 | Ownership on Detail/Tracking（詳細/追跡の所有権） | `GET /orders/:id` および `/orders/:id/tracking` は読み込み*後*に所有権を検証しなければならない。buyer → `buyer_id` 一致；merchant → `merchant_id` 一致；admin → 常に許可。不一致の場合は `404 NOT_FOUND`（※`403` ではない）を返し、注文IDの列挙を防ぐ。 | バックエンド（サービスチェック） |

### 4.2 注文履歴ルール（Order History Rules）

| ルールID | ルール名 | 説明 | 強制レイヤー |
|----------|----------|------|--------------|
| BR-OI-009 | Default Sort（既定ソート） | 注文履歴は既定で `created_at DESC`（新しい順）でソートされる。 | バックエンド（クエリ） |
| BR-OI-010 | Pagination（ページネーション） | 既定 20 行/ページ、最大 100（`OI_TABLE_MAX_PAGE_SIZE`）。 | バックエンド（検証） |
| BR-OI-011 | Status Filter（ステータス絞り込み） | すべてのロールは自身のスコープを `orders.status` で絞り込める。値は `order_statuses.status_code` に対して検証される。 | バックエンド（検証） |
| BR-OI-012 | Date Range Filter（日付範囲絞り込み） | 任意の `from`/`to` による `orders.created_at` の絞り込み。`to` は `from` 以上。いずれも UTC として解釈。 | バックエンド（検証） |

### 4.3 注文詳細＆追跡ルール（Order Detail & Tracking Rules）

| ルールID | ルール名 | 説明 | 強制レイヤー |
|----------|----------|------|--------------|
| BR-OI-013 | Timeline Composition（タイムライン構成） | 追跡タイムラインは、`order_statuses`（全6ステップ、`display_order` 順）を `order_status_history` と左結合して構成する。未来のステップは省略されず「予定（upcoming）」として描画される。 | バックエンド（集計） |
| BR-OI-014 | Missing History Fallback（履歴欠損フォールバック） | 注文に `order_status_history` 行がない場合、現在の `orders.status` のみを「Detailed history unavailable for this order.」という注記とともに表示する。エラーは発生させない（BR-OI-030）。 | バックエンド＋フロントエンド |
| BR-OI-015 | Customer Information Visibility（顧客情報の可視性） | Order Detail は**顧客情報（購入者名、連絡先、配送先住所）を `merchant` および `admin` のみ**に公開する（§4.5「Order Detail — order items, customer info」）。購入者自身の詳細画面は自身のデータとして配送先住所を表示する。他者の同一性が公開されることはない。購入者のメール/電話は、その販売者のショップに属する注文についてのみ販売者に表示される。 | バックエンド（DTO 投影） |
| BR-OI-016 | Combinable Admin Filters（組み合わせ可能な管理者絞り込み） | 管理者絞り込み（`shopId`/`merchantId`、`status`、`from`/`to`）は AND 結合で適用され、すべて SQL 内で適用され、クライアントサイドでは行わない。 | バックエンド（クエリ） |
| BR-OI-017 | Item Price Immutability（明細価格の不変性） | `order_items.unit_price` / `total_price` は注文作成時に固定された価格（§7.3）であり、格納されたまま表示される — 現在の `products.price` から再計算してはならない。 | バックエンド（クエリ） |

### 4.4 Sales Summary ルール（Merchant、§4.5）

Sales Summary は金額ではなく**注文数**を提示する。すべての計数は BR-OI-003 によりスコープされる。

| ルールID | ルール名 | 説明 | 強制レイヤー |
|----------|----------|------|--------------|
| BR-OI-018 | Sales Summary Counters（売上サマリーカウンタ） | 3つのカウンタをまとめて返す：<br>• **Today（本日）** = `created_at` が当日に該当する `COUNT(orders)`<br>• **This Month（今月）** = `created_at` が当月に該当する `COUNT(orders)`<br>• **Completed（完了）** = `status = 'delivered'`（終端状態、`order_statuses.is_terminal_state = TRUE`）の `COUNT(orders)` | バックエンド（集計） |
| BR-OI-019 | Counting Boundaries（計数境界） | 本日／今月の境界は UTC で計算される（DB は TIMESTAMPTZ を格納）。表示レイヤーはユーザーのロケールでラベルを付ける。本日と今月はステータスを問わず**すべての**注文を計数する。Completed は期間絞り込みがない限り累計計数である。 | バックエンド（クエリ） |

### 4.5 Revenue Summary ルール（Merchant、§4.5 — PMと確認済み）

> 以下の4数値は本サブシステムの確定定義であり、これまでの「total sales / net revenue」という表現を**優先**する。すべて販売者自身の注文にスコープされる（BR-OI-003）。

| ルールID | ルール名 | 計算式／定義 | 強制レイヤー |
|----------|----------|--------------|--------------|
| BR-OI-021 | **Sales（売上）** | 顧客が支払った**総額（Gross）**。<br>`Sales = SUM(orders.total_amount)`（選択期間の販売者スコープ注文について）。 | バックエンド（集計） |
| BR-OI-022 | **Commission（コミッション）** | プラットフォームの取り分。<br>`Commission = Sales × コミッション率`。率は注文作成時に**固定（locked）**されたもの（要件定義書 §7.7）。**注文ごとに**計算してから合算 — `Commission = SUM(order.total_amount × order.commission_rate)` — これにより、後の率変更が過去の数値を遡及的に変更することはない。率の取得元と現在のスキーマギャップ：**BR-OI-023**。 | バックエンド（集計） |
| BR-OI-023 | Commission Rate Sourcing — Schema Gap（コミッション率取得 — スキーマギャップ） | §7.7 はコミッション率を注文作成時に固定することを要求するが、`orders` には `commission_rate` 列が存在しない。グローバルで可変の `commission_settings.commission_rate`（既定 12.00）のみが存在する（DATABASE_SPEC §3.17）。`orders.commission_rate` が追加されるまで、率はクエリ時に `commission_settings` から読み取り、レスポンスに `commissionRateSource: "current_settings"` および `commissionRateLocked: false` を含め、UI は「Commission is calculated with the current platform rate; historical rate locking is pending.」という脚注を表示しなければならない。列が存在するようになれば、クエリは `orders.commission_rate` を読み取り、フラグは `"order_snapshot"` / `true` となる。 | バックエンド（集計）＋フロントエンド（表示） |
| BR-OI-024 | **Revenue（収益）** | 販売者が受け取る**純額（Net）**。<br>`Revenue = Sales − Commission`。<br>要件定義書 §7.7「Merchant payouts = Total Sales − Commission」と整合。 | バックエンド（集計） |
| BR-OI-025 | **AOV（平均注文額）** | `AOV = Revenue ÷ Number of Orders` — **総売上（Gross）ではなく純収益（Net Revenue）を基準に算出**（PMと確認済み）。`Number of Orders` = Sales に使用した同じスコープ注文の `COUNT(orders)`。`Number of Orders = 0` の場合、AOV は `0.00` を表示。 | バックエンド（集計）＋フロントエンド（書式） |
| BR-OI-026 | **Four-Field Disclosure Rule（4項目開示ルール）** | Sales、Commission、Revenue、AOV は API により**まとめて、1つのグループとして**返却され、画面にも描画されなければならない。単独の「revenue」という数値を孤立して表示することは**許されない** — 裸の数値は総額か純額かで曖昧になり、これまでにも誤読を招いていた。4項目のうち1つ（コンパクト/モバイルレイアウトや今後の出力を含む）を表示する画面は、すべての4項目をそれぞれのラベルとともに表示しなければならない。 | バックエンド（DTO 契約）＋フロントエンド（コンポーネント契約） |
| BR-OI-027 | Consistent Order Set（一貫した注文集） | ある期間の Sales、Commission、Revenue、AOV、および `orderCount` は、**1つの**注文集に対するクエリからすべて導出されなければならず、4数値は常に内部的に整合する（`Revenue = Sales − Commission` および `AOV × orderCount = Revenue` が、BR-OI-028 の丸めを除き厳密に成り立つ）。 | バックエンド（単一集計） |
| BR-OI-028 | Rounding（丸め） | 金額は `DECIMAL` で計算され、小数点以下2桁への半Up丸めは表示境界のみで行う。コミッションは支払算術（DATABASE_SPEC §3.18 `payouts.commission_amount`）と一致させるため、合算前に注文ごとに丸める。 | バックエンド（集計） |

#### 作業例（Revenue Summary）

| 数値 | 計算式 | 例 |
|------|--------|-----|
| Number of Orders（注文数） | `COUNT(orders)` | 10 |
| **Sales（売上）** | `SUM(orders.total_amount)` | $1,000.00 |
| **Commission（コミッション）** | `Sales × 12%`（注文作成時固定率） | $120.00 |
| **Revenue（収益）** | `Sales − Commission` | $880.00 |
| **AOV（平均注文額）** | `Revenue ÷ Number of Orders` = `880.00 ÷ 10` | $88.00 |

> 意図的な選択に注意：ここでの AOV は **$88.00**（純額）であって、$100.00（総額÷注文数）ではない。これは PM と確認されており、実装される定義である。

### 4.6 表示＆UXルール（Display & UX Rules）

| ルールID | ルール名 | 説明 | 強制レイヤー |
|----------|----------|------|--------------|
| BR-OI-029 | Currency Formatting（通貨書式） | すべての金額は通貨記号と小数点以下2桁で、プラットフォーム既定ロケール（`Intl.NumberFormat`）を用いて書式化する。 | フロントエンド |
| BR-OI-030 | Empty States（空状態） | ゼロ／欠損データは `0` / `—` とイラスト付き空状態として描画し、エラーにはしない。 | フロントエンド |
| BR-OI-031 | Status Badge（ステータスバッジ） | ステータスバッジは `order_statuses.status_code` ごとに1色を用い、ラベルは `order_statuses.status_name`（EN/MY/JA で i18n マッピング）から取る。 | フロントエンド |
| BR-OI-032 | Unsupported-Metric Marking（未サポート指標の表示） | スキーマギャップ（BR-OI-023 固定率）によってゲートされるいかなる数値も、確信を持った値としてではなく `—` / 脚注で視覚的にマークされなければならない。 | フロントエンド |
| BR-OI-033 | PII Minimisation（PII 最小化） | Order Detail の顧客情報は、フルフィルメントに必要なもの（氏名、連絡先、配送先住所）に限定する。それを超える購入者アカウント識別子を販売者へ投影することはない。 | バックエンド（DTO 投影） |

---

## 5. 画面仕様（Screen Specifications）

### 5.1 画面：Buyer Order History（`/orders`）

**目的：** 購入者が自身の過去のすべての注文を閲覧する（§3.3）。

#### 5.1.1 UI 要素（UI Elements）

| 要素ID | 要素名 | 要素型 | i18n キー | 必須 | 説明 |
|--------|--------|--------|-----------|:---:|------|
| EL-OI-01 | ページタイトル | 見出し（h5） | `buyer.orders.title` | Yes | 「My Orders」 |
| EL-OI-02 | ステータス絞り込み | セレクト | `orders.filter.status` | No | All / placed / confirmed / packed / shipped / out for delivery / delivered |
| EL-OI-03 | 日付範囲絞り込み | 日付範囲ピッカー | `orders.filter.dateRange` | No | 注文日で絞り込み |
| EL-OI-04 | 注文リストテーブル | テーブル | `orders.table` | Yes | 注文番号、日付、明細数、合計額、支払ステータス、ステータスバッジ |
| EL-OI-05 | ステータスバッジ | バッジ | — | Yes | 色分けされた `order_statuses.status_name` |
| EL-OI-06 | 追跡リンク | リンク/ボタン（ghost） | `orders.track` | Yes | 注文追跡を開く |
| EL-OI-07 | ページネーション | コントロール | `common.pageInfo` | Yes | 「Page 1 of 3 · 42 orders」＋ 前へ/次へ |
| EL-OI-08 | 空状態 | イラスト＋テキスト | `orders.empty` | Yes | 「You haven't placed any orders yet.」＋ Browse Products CTA |

**既定状態：** 絞り込みなし。`created_at DESC` ソート。20 行/ページ。

### 5.2 画面：Buyer Order Detail（`/orders/:id`）

**目的：** 購入者自身の注文の明細・合計・支払ステータスを表示する（§3.3）。

| 要素ID | 要素名 | 要素型 | i18n キー | 必須 | 説明 |
|--------|--------|--------|-----------|:---:|------|
| EL-OI-10 | 注文ヘッダ | カード | `orders.detail.header` | Yes | 注文番号、注文日、現在ステータスバッジ |
| EL-OI-11 | 注文明細テーブル | テーブル | `orders.detail.items` | Yes | 商品、数量、単価、行合計（注文作成時に固定された価格、BR-OI-017） |
| EL-OI-12 | 合計パネル | カード | `orders.detail.totals` | Yes | 小計、割引（`discount_amount`、`coupon_code` があれば併記）、合計額 |
| EL-OI-13 | 支払ステータス | バッジ＋テキスト | `orders.detail.payment` | Yes | `payment_method` ＋ `payment_status`（pending / completed） |
| EL-OI-14 | 配送先住所 | カード | `orders.detail.shipping` | Yes | `orders.shipping_address`（JSONB）から描画 |
| EL-OI-15 | 注文メモ | テキスト | `orders.detail.notes` | No | `orders.notes`（存在時） |
| EL-OI-16 | 注文追跡ボタン | ボタン（primary） | `orders.track` | Yes | 追跡へ遷移 |

> いかなる購入者画面にも売上・コミッション・収益の数値は表示されない（BR-OI-005）。

### 5.3 画面：Order Tracking（`/orders/:id/tracking`）— Buyer ＆ Merchant ＆ Admin

**目的：** 1注文のステータスタイムラインを表示する（§3.3 buyer、§4.5 merchant、§5.6 admin ドリルダウン）。

| 要素ID | 要素名 | 要素型 | i18n キー | 必須 | 説明 |
|--------|--------|--------|-----------|:---:|------|
| EL-OI-20 | 注文参照 | テキスト | `orders.tracking.ref` | Yes | 注文番号＋注文日 |
| EL-OI-21 | ステータスタイムライン | ステッパー（縦） | `orders.tracking.timeline` | Yes | `order_statuses` の6ステップを `display_order` 順（BR-OI-013） |
| EL-OI-22 | ステップタイムスタンプ | テキスト | — | Yes | 到達済みステップは `order_status_history.created_at`、未到達は空白 |
| EL-OI-23 | 現在ステータス強調 | マーカー | — | Yes | `STEP_CURRENT` に Luxury Purple（#7C3AED）マーカー |
| EL-OI-24 | 配送完了確認 | バナー | `orders.tracking.delivered` | No | `status = 'delivered'`（終端）のとき表示 |
| EL-OI-25 | 履歴不明注記 | テキスト | `orders.tracking.noHistory` | No | BR-OI-014 に従い表示 |
| EL-OI-26 | 注文詳細へ戻る | リンク | `common.back` | Yes | ロールに応じた詳細画面へ戻る |

**既定状態：** タイムライン展開。現在ステップが表示範囲に入るようスクロール。

### 5.4 画面：Merchant Order Insights（`/merchant/orders`）

**目的：** 自ショップの注文履歴に加え、売上サマリーと収益サマリー（§4.5）。

#### 5.4.1 サマリーパネル — Sales Summary（注文数）

| 要素ID | 要素名 | 要素型 | i18n キー | 必須 | 説明 |
|--------|--------|--------|-----------|:---:|------|
| EL-OI-30 | 本日の注文タイル | 統計タイル | `merchant.orders.today` | Yes | 本日作成された自ショップ注文数（BR-OI-018） |
| EL-OI-31 | 今月の注文タイル | 統計タイル | `merchant.orders.thisMonth` | Yes | 当月作成された自ショップ注文数 |
| EL-OI-32 | 完了注文タイル | 統計タイル | `merchant.orders.completed` | Yes | `status = 'delivered'` の注文数 |

#### 5.4.2 サマリーパネル — Revenue Summary（4項目まとめて）

| 要素ID | 要素名 | 要素型 | i18n キー | 必須 | 説明 |
|--------|--------|--------|-----------|:---:|------|
| EL-OI-34 | Revenue Summary グループ | カード（単一コンポーネント） | `merchant.revenue.title` | Yes | **EL-OI-35~38 を不可分な1グループとして描画（BR-OI-026）** |
| EL-OI-35 | Sales（売上） | 統計（通貨） | `merchant.revenue.sales` | Yes | 顧客が支払った総額 — `SUM(orders.total_amount)`（BR-OI-021） |
| EL-OI-36 | Commission（コミッション） | 統計（通貨） | `merchant.revenue.commission` | Yes | `Sales × コミッション率`（BR-OI-022） |
| EL-OI-37 | Revenue（収益） | 統計（通貨、強調） | `merchant.revenue.net` | Yes | `Sales − Commission` — 受け取る純額（BR-OI-024） |
| EL-OI-38 | AOV（平均注文額） | 統計（通貨） | `merchant.revenue.aov` | Yes | `Revenue ÷ Number of Orders`（BR-OI-025） |
| EL-OI-39 | 注文数キャプション | テキスト | `merchant.revenue.orderCount` | Yes | 「Based on N orders」— AOV の分母 |
| EL-OI-40 | コミッション率脚注 | テキスト（小） | `merchant.revenue.rateNote` | Yes | 適用率と BR-OI-023 取得元注記を表示 |
| EL-OI-41 | 期間セレクタ | ボタングループ | `merchant.revenue.period` | Yes | 本日 / 今月 / 先月 / カスタム |

> **EL-OI-37 単独での描画は禁止。** 4数値が収まらないレイアウトは、落とさず積み上げること（BR-OI-026）。

#### 5.4.3 自ショップ注文リスト

| 要素ID | 要素名 | 要素型 | i18n キー | 必須 | 説明 |
|--------|--------|--------|-----------|:---:|------|
| EL-OI-42 | 注文リストテーブル | テーブル | `merchant.orders.table` | Yes | 注文番号、日付、顧客名、明細、合計額、支払ステータス、ステータスバッジ |
| EL-OI-43 | ステータス絞り込み | セレクト | `orders.filter.status` | No | 自ショップ注文をステータスで絞り込み |
| EL-OI-44 | 日付範囲絞り込み | 日付範囲ピッカー | `orders.filter.dateRange` | No | 注文日で絞り込み |
| EL-OI-45 | 行アクション | リンクグループ | `common.view` / `orders.track` | Yes | 詳細表示 / 追跡 |
| EL-OI-46 | ページネーション | コントロール | `common.pageInfo` | Yes | 20 行/ページ |
| EL-OI-47 | スコープ注記 | テキスト（小） | `merchant.orders.scopeNote` | Yes | 「Showing orders for your shop only.」（§6.4） |

**既定状態：** サマリーの期間＝今月。注文リストは未絞り込み、`created_at DESC`、20 行/ページ。

### 5.5 画面：Merchant Order Detail（`/merchant/orders/:id`）

**目的：** 自ショップ1注文の注文明細**および顧客情報**（§4.5）。

| 要素ID | 要素名 | 要素型 | i18n キー | 必須 | 説明 |
|--------|--------|--------|-----------|:---:|------|
| EL-OI-50 | 注文ヘッダ | カード | `orders.detail.header` | Yes | 注文番号、日付、ステータスバッジ、支払ステータス |
| EL-OI-51 | 注文明細テーブル | テーブル | `orders.detail.items` | Yes | 商品、数量、単価、行合計 — **自ショップ明細**（`order_items.merchant_id` = 自身） |
| EL-OI-52 | 合計パネル | カード | `orders.detail.totals` | Yes | 小計、割引、合計額 |
| EL-OI-53 | 顧客情報 | カード | `merchant.orders.customer` | Yes | 購入者名、連絡先、配送先住所（BR-OI-015/033） |
| EL-OI-54 | 注文メモ | テキスト | `orders.detail.notes` | No | 顧客からの `orders.notes` |
| EL-OI-55 | 注文追跡ボタン | ボタン | `orders.track` | Yes | 追跡へ遷移 |
| EL-OI-56 | ステータスバッジ | バッジ | — | Yes | **読み取り専用** — 現在のステータスを表示。ステータス変更は Order Fulfillment 画面でのみ行う |
| EL-OI-57 | Change Status アクション | リンク/ボタン | `orders.changeStatus` | No | Order Fulfillment への遷移のみ。ここではステータス更新 API や状態遷移を実行しない |

### 5.6 画面：Admin All Orders（`/admin/orders`）

**目的：** ショップ/販売者およびステータス絞り込み付きでプラットフォーム全体の注文を閲覧する（§5.6）。

| 要素ID | 要素名 | 要素型 | i18n キー | 必須 | 説明 |
|--------|--------|--------|-----------|:---:|------|
| EL-OI-60 | ページタイトル | 見出し（h5） | `admin.orders.title` | Yes | 「All Orders」 |
| EL-OI-61 | ショップ／販売者絞り込み | 検索可能セレクト | `admin.orders.filter.shop` | No | ショップまたは販売者で絞り込み（§5.6「Orders by Merchant」） |
| EL-OI-62 | ステータス絞り込み | セレクト | `admin.orders.filter.status` | No | 注文ステータスで絞り込み（§5.6「Orders by Status」） |
| EL-OI-63 | 日付範囲絞り込み | 日付範囲ピッカー | `orders.filter.dateRange` | No | 注文日で絞り込み |
| EL-OI-64 | 適用絞り込みチップ | チップグループ | `common.filters` | No | 適用中の絞り込みを個別クリアボタン付きで表示 |
| EL-OI-65 | 注文リストテーブル | テーブル | `admin.orders.table` | Yes | 注文番号、日付、ショップ/販売者、購入者、明細、合計額、支払ステータス、ステータスバッジ |
| EL-OI-66 | 結果件数 | テキスト | `common.resultCount` | Yes | 「42 orders match the current filters」 |
| EL-OI-67 | 行アクション | リンクグループ | `common.view` / `orders.track` | Yes | 詳細表示 / 追跡（任意の注文） |
| EL-OI-68 | ページネーション | コントロール | `common.pageInfo` | Yes | 20 行/ページ |
| EL-OI-69 | 空状態 | イラスト＋テキスト | `admin.orders.empty` | Yes | 「No orders match the current filters.」＋ Clear Filters CTA |

**既定状態：** 絞り込みなし（プラットフォーム全体の注文）。`created_at DESC`。20 行/ページ。

> 本サブシステムの管理者画面は**注文の閲覧のみ**を対象とする。プラットフォーム収益、コミッション率設定、支払、収益目標は Revenue & Commission サブシステム（要件定義書 §5.7）に属し、ここでは規定しない。

---

## 6. 機能操作仕様（Functional Operation Specification）

### 6.1 操作：Order History 閲覧（ロールスコープ）

| 属性 | 仕様 |
|------|------|
| **トリガー** | `/orders`（buyer）、`/merchant/orders`（merchant）、`/admin/orders`（admin）への遷移。または絞り込み/ページの変更 |
| **API エンドポイント** | `GET /api/v1/orders?status=&from=&to=&page=1&limit=20&sort=createdAt&order=desc`（admin は追加で `&merchantId=&shopId=`） |
| **リクエスト Content-Type** | なし（クエリパラメータ） |
| **送信前検証** | `status` ∈ `order_statuses.status_code`；`to ≥ from`；`page ≥ 1`；`limit` 1–100；`merchantId`/`shopId` は非管理者呼び出し元には `403` で**拒否** |
| **処理手順** | 1. JWT 検証、ロール読み取り。2. 所有者スコープ適用（BR-OI-001）：buyer → `buyer_id = currentUser.id`；merchant → `merchants.id` を `merchants.user_id = currentUser.id` から解決、`license_status = 'approved'` を確認、さもなくば `403`（BR-OI-006）、その後 `orders.merchant_id = <解決済み id>`；admin → 所有者フィルタなし。3. 任意の `status`、`from`/`to`、および（admin のみ）`merchantId`/`shopId` を SQL で適用（BR-OI-016）。4. ソートとページネーション（BR-OI-009/010）。5. ロールに応じた DTO を投影（顧客名は merchant/admin のみ、BR-OI-015）。6. 行＋`meta` を返す。 |
| **成功応答** | 200 OK（注文行と `meta`） |
| **事後アクション** | テーブル描画。`ORDER_LIST_VIEWED` 監査イベントを記録 |

### 6.2 操作：Order Detail 閲覧

| 属性 | 仕様 |
|------|------|
| **トリガー** | 注文行／「View」アクションのクリック |
| **API エンドポイント** | `GET /api/v1/orders/:id` |
| **リクエスト Content-Type** | なし |
| **送信前検証** | `:id` は有効な UUID |
| **処理手順** | 1. JWT と `:id` を検証。2. 注文を `order_items`（`products` と結合して名称/画像）付きで読み込む。3. BR-OI-008 に従い所有権を検証 — 不一致 → `404 NOT_FOUND`。4. merchant の場合：`order_items` を `merchant_id = <解決済み merchants.id>` に限定。5. 合計（`total_amount`、`discount_amount`、`coupon_code`）と `payment_status` を投影。6. 顧客情報ブロックを **`merchant`/`admin` のみ** 添付（BR-OI-015/033）。7. 詳細 DTO を返す。 |
| **成功応答** | 200 OK（注文詳細） |
| **事後アクション** | 詳細画面描画 |

### 6.3 操作：Order Tracking 閲覧

| 属性 | 仕様 |
|------|------|
| **トリガー** | リスト行または詳細画面から「Track」をクリック |
| **API エンドポイント** | `GET /api/v1/orders/:id/tracking` |
| **リクエスト Content-Type** | なし |
| **送信前検証** | `:id` は有効な UUID |
| **処理手順** | 1. JWT と `:id` を検証。2. 注文を読み込み、所有権を検証（BR-OI-008）— 不一致 → `404`。3. `order_statuses` をすべて `display_order` 順で読み込む。4. 本注文の `order_status_history` を左結合し、到達済みステップのタイムスタンプを付与（BR-OI-013）。5. 各ステップを `done` / `current` / `upcoming` として `orders.status` に対してマーク（§3.3）。6. 履歴行が存在しない場合、単一の現在ステップに `historyAvailable: false` を付けて返す（BR-OI-014）。7. `tracking` DTO を返す。 |
| **成功応答** | 200 OK（`tracking`） |
| **事後アクション** | ステッパー描画 |

### 6.4 操作：Merchant Sales Summary 閲覧

| 属性 | 仕様 |
|------|------|
| **トリガー** | `/merchant/orders` のロード。期間セレクタの変更。手動更新 |
| **API エンドポイント** | `GET /api/v1/order-insights/merchant/sales-summary` |
| **リクエスト Content-Type** | なし |
| **送信前検証** | ロール ∈ {`merchant`、`admin`}；販売者はライセンス承認済み（BR-OI-006） |
| **処理手順** | 1. JWT とロールを検証。2. `merchants.id` を解決（BR-OI-003）し `license_status = 'approved'` を確認。3. キャッシュ `cache:oi:merchant:{merchantId}:summary` を確認。4. ミス時、販売者にスコープされた `orders` に対する**1つの**集計を実行し `todayCount`、`thisMonthCount`、`completedCount`（`status = 'delivered'`）を `idx_orders_merchant_id` / `idx_orders_created_at` を用いて算出。5. キャッシュ投入（TTL `OI_SUMMARY_CACHE_TTL_SECONDS`）。6. `salesSummary` を返す。 |
| **成功応答** | 200 OK（`salesSummary`：3カウンタ） |
| **事後アクション** | 3つの統計タイルを描画 |

### 6.5 操作：Merchant Revenue Summary 閲覧

| 属性 | 仕様 |
|------|------|
| **トリガー** | `/merchant/orders` のロード。期間セレクタの変更。手動更新 |
| **API エンドポイント** | `GET /api/v1/order-insights/merchant/revenue-summary?period=this_month`（または `period=custom` 時は `from`/`to`） |
| **リクエスト Content-Type** | なし |
| **送信前検証** | ロール ∈ {`merchant`、`admin`}；販売者はライセンス承認済み；`period` ∈ `today/this_month/last_month/custom`；`period=custom` 時は `from`/`to` 必須かつ `to ≥ from` |
| **処理手順** | 1. JWT とロールを検証。2. `merchants.id` を解決（BR-OI-003）し `license_status = 'approved'` を確認。3. 期間ウィンドウ（UTC）を解決。4. 販売者のスコープ注文に対する**1つの**集計（BR-OI-027）で計算：`orderCount = COUNT(orders)`；`sales = SUM(orders.total_amount)`（BR-OI-021）；`commission = SUM(order.total_amount × rate)`（率は BR-OI-022/023 に従い解決、注文ごと丸め、BR-OI-028）；`revenue = sales − commission`（BR-OI-024）；`aov = orderCount > 0 ? revenue / orderCount : 0` — **分子は純収益（Net Revenue）**（BR-OI-025）。5. `commissionRate`、`commissionRateSource`、`commissionRateLocked` を添付（BR-OI-023）。6. **4数値をすべてまとめて**返す — DTO に部分形はない（BR-OI-026）。 |
| **成功応答** | 200 OK（`revenueSummary` = `{ sales, commission, revenue, aov, orderCount, commissionRate, commissionRateSource, commissionRateLocked, period }`） |
| **事後アクション** | 収益サマリーグループ（EL-OI-34）を4統計すべてと率脚注付きで描画 |

---

## 7. 入出力仕様（Input / Output Specification）

### 7.1 入力仕様 — 注文リストクエリ（入力定義）

| 項目 | 表示名（EN） | 表示名（JA） | データ型 | 必須 | 入力コントロール | 検証 |
|------|--------------|--------------|----------|:---:|------------------|------|
| `status` | Order Status | 注文ステータス | String | No | セレクト | `@IsIn(['placed','confirmed','packed','shipped','out_for_delivery','delivered'])`, `@IsOptional()` |
| `from` | From Date | 開始日 | Date | No | 日付ピッカー | `@IsDateString()`, `@IsOptional()` |
| `to` | To Date | 終了日 | Date | No | 日付ピッカー | `@IsDateString()`, `@IsOptional()`；`from` 以上 |
| `merchantId` | Merchant | 出品者 | UUID | No | 検索可能セレクト | `@IsUUID()`, `@IsOptional()` — **管理者のみ**；他ロールは `403` |
| `shopId` | Shop | 店舗 | UUID | No | 検索可能セレクト | `@IsUUID()`, `@IsOptional()` — **管理者のみ**；他ロールは `403` |
| `page` | Page | ページ | Number | No | ページネーション | `@IsInt()`, `@Min(1)`, 既定 1 |
| `limit` | Limit | 表示件数 | Number | No | ページネーション | `@IsInt()`, `@Min(1)`, `@Max(100)`, 既定 20 |
| `sort` | Sort Field | 並び替え項目 | String | No | 列ヘッダ | `@IsIn(['createdAt','totalAmount','status'])`, 既定 `createdAt` |
| `order` | Sort Direction | 並び順 | String | No | 列ヘッダ | `@IsIn(['asc','desc'])`, 既定 `desc` |

### 7.2 入力仕様 — 注文詳細／追跡（入力定義）

| 項目 | 表示名（EN） | 表示名（JA） | データ型 | 必須 | 入力コントロール | 検証 |
|------|--------------|--------------|----------|:---:|------------------|------|
| `id` | Order ID | 注文ID | UUID | Yes | パスパラメータ | `@IsUUID()`；所有権は BR-OI-008 に従い検証 |

### 7.3 入力仕様 — 販売者サマリークエリ（入力定義）

| 項目 | 表示名（EN） | 表示名（JA） | データ型 | 必須 | 入力コントロール | 検証 |
|------|--------------|--------------|----------|:---:|------------------|------|
| `period` | Period | 期間 | String | No | ボタングループ | `@IsIn(['today','this_month','last_month','custom'])`, 既定 `this_month` |
| `from` | From Date | 開始日 | Date | 条件付 | 日付ピッカー | `period = custom` のとき必須；`@IsDateString()` |
| `to` | To Date | 終了日 | Date | 条件付 | 日付ピッカー | `period = custom` のとき必須；`@IsDateString()`；`from` 以上 |

> 販売者の同一性は**決して**入力とはならない — JWT からサーバーサイドで解決される（BR-OI-001/003）。

### 7.4 出力仕様 — 注文履歴行（出力定義）

| 項目 | データソース | 表示書式 | 表示対象 |
|------|--------------|----------|----------|
| `id` | `orders.id` | UUID（注文番号として描画） | 全ロール |
| `createdAt` | `orders.created_at` | 日時（ロケール） | 全ロール |
| `status` | `orders.status` → `order_statuses.status_name` | ステータスバッジ | 全ロール |
| `itemCount` | `COUNT(order_items)` | 整数 | 全ロール |
| `totalAmount` | `orders.total_amount` | 通貨（例 `$120.00`） | 全ロール |
| `paymentStatus` | `orders.payment_status` | バッジ（pending/completed） | 全ロール |
| `customerName` | `users.name`（経由 `orders.buyer_id`） | 文字列 | Merchant、Admin（BR-OI-015） |
| `shopName` | `merchants.shop_name`（経由 `orders.merchant_id`） | 文字列 | Admin |

### 7.5 出力仕様 — 注文詳細（出力定義）

| 項目 | データソース | 表示書式 | 表示対象 |
|------|--------------|----------|----------|
| `id` / `createdAt` / `status` | `orders` | UUID / 日時 / バッジ | 全ロール |
| `items[].productName` | `products.name`（経由 `order_items.product_id`） | 文字列 | 全ロール |
| `items[].quantity` | `order_items.quantity` | 整数 | 全ロール |
| `items[].unitPrice` | `order_items.unit_price` | 通貨（注文作成時固定） | 全ロール |
| `items[].totalPrice` | `order_items.total_price` | 通貨 | 全ロール |
| `discountAmount` | `orders.discount_amount` | 通貨 | 全ロール |
| `couponCode` | `orders.coupon_code` | 文字列（存在時） | 全ロール |
| `totalAmount` | `orders.total_amount` | 通貨 | 全ロール |
| `paymentMethod` / `paymentStatus` | `orders.payment_method` / `payment_status` | 文字列 / バッジ | 全ロール |
| `shippingAddress` | `orders.shipping_address`（JSONB） | 整形済み住所ブロック | 全ロール |
| `notes` | `orders.notes` | テキスト | 全ロール |
| `customer.name` / `customer.email` / `customer.phone` | `users`（経由 `orders.buyer_id`） | 文字列 | **Merchant、Admin のみ**（BR-OI-015/033） |
| `shop.name` / `shop.merchantId` | `merchants`（経由 `orders.merchant_id`） | 文字列 / UUID | Admin（buyer はショップ名のみ） |

### 7.6 出力仕様 — 注文追跡（出力定義）

| 項目 | データソース | 表示書式 |
|------|--------------|----------|
| `orderId` | `orders.id` | UUID |
| `currentStatus` | `orders.status` | 文字列 |
| `historyAvailable` | 派生（`order_status_history` 行数 > 0） | Boolean（BR-OI-014） |
| `steps[].statusCode` | `order_statuses.status_code` | 文字列 |
| `steps[].statusName` | `order_statuses.status_name` | 文字列（i18n） |
| `steps[].displayOrder` | `order_statuses.display_order` | 整数（1–6） |
| `steps[].state` | 派生（§3.3） | `done` / `current` / `upcoming` |
| `steps[].reachedAt` | `order_status_history.created_at` | ISO 8601（未到達時は null） |
| `steps[].isTerminal` | `order_statuses.is_terminal_state` | Boolean |

### 7.7 出力仕様 — 販売者 Sales Summary（出力定義）

| 項目 | データソース | 表示書式 |
|------|--------------|----------|
| `todayCount` | `created_at` が当日に該当する `COUNT(orders)` | 整数 |
| `thisMonthCount` | `created_at` が当月に該当する `COUNT(orders)` | 整数 |
| `completedCount` | `status = 'delivered'` の `COUNT(orders)` | 整数 |

### 7.8 出力仕様 — 販売者 Revenue Summary（出力定義）

> 4つの金額/派生数値は**すべてまとめて**返される。部分 DTO は存在しない（BR-OI-026）。

| 項目 | データソース／計算式 | 表示書式 |
|------|----------------------|----------|
| `sales` | `SUM(orders.total_amount)` — 顧客が支払った総額（BR-OI-021） | 通貨（例 `$1,000.00`） |
| `commission` | `SUM(order.total_amount × コミッション率)`、率は注文作成時固定（BR-OI-022） | 通貨（例 `$120.00`） |
| `revenue` | `sales − commission` — 販売者が受け取る純額（BR-OI-024） | 通貨、強調（例 `$880.00`） |
| `aov` | `revenue ÷ orderCount` — **純収益（Net Revenue）、総売上（Gross）ではない**（BR-OI-025） | 通貨（例 `$88.00`） |
| `orderCount` | 同じ注文集の `COUNT(orders)`（BR-OI-027） | 整数 |
| `commissionRate` | 適用率（パーセント） | 数値（例 `12.00`） |
| `commissionRateSource` | `"current_settings"` \| `"order_snapshot"`（BR-OI-023） | 文字列 |
| `commissionRateLocked` | `orders.commission_rate` が存在するまで `false`（BR-OI-023） | Boolean |
| `period` | 解決済みウィンドウのエコー | `{ code, from, to }` |

---

## 8. 入力検証ルール（Input Validation Rules）

### 8.1 クエリパラメータ検証

| 項目 | 検証ルール | エラーメッセージ（EN） | エラーメッセージ（JA） |
|------|------------|------------------------|------------------------|
| `status` | 有効な `order_statuses.status_code` であること | "Invalid order status" | "注文ステータスが不正です" |
| `from`/`to` | 有効な ISO 日付；`to ≥ from` | "Invalid date range" | "日付範囲が不正です" |
| `page` | 整数 ≥ 1 | "Invalid page number" | "ページ番号が不正です" |
| `limit` | 整数 1–100 | "Invalid limit" | "件数指定が不正です" |
| `sort` / `order` | 許可された項目／方向であること | "Invalid sort option" | "並び替えの指定が不正です" |
| `period` | `today/this_month/last_month/custom` であること | "Invalid period" | "期間の指定が不正です" |
| `period=custom` | `from` と `to` の両方が必須 | "Select a start and end date" | "開始日と終了日を選択してください" |

### 8.2 スコープ＆所有権検証

| 項目 | 検証ルール | エラーメッセージ（EN） | エラーメッセージ（JA） |
|------|------------|------------------------|------------------------|
| `merchantId` / `shopId` | 管理者のみ；buyer/merchant として指定された場合は拒否（BR-OI-001） | "You don't have permission to filter by merchant" | "この絞り込みを行う権限がありません" |
| `:id` | 有効な UUID であること | "Invalid order reference" | "注文の指定が不正です" |
| `:id` | 呼び出し元のスコープに属すること（BR-OI-008） | "Order not found" | "注文が見つかりません" |

### 8.3 検証強制レイヤー

1. **フロントエンド（クライアント）：** すべての絞り込み・ページネーション・ソート・期間入力に対する React Hook Form + Zod スキーマ。
2. **バックエンド（サーバー）：** すべての Order Insights エンドポイントに対する NestJS `ValidationPipe` ＋ class-validator DTO。所有者スコープはサービスレイヤーで適用し、クライアント入力からは行わない。
3. **データベース（PostgreSQL）：** `order_statuses` は有効なステータスコードの真値源。`chk_orders_status` は格納値を制約する（本サブシステムでは読み取り専用）。

---

## 9. エラーハンドリング仕様（Error Handling Specification）

### 9.1 エラー応答構造

```json
{
  "statusCode": 404,
  "message": ["Order not found"],
  "error": "Not Found",
  "timestamp": "2026-08-21T12:00:00.000Z",
  "path": "/api/v1/orders/9f1c1a52-6f0e-4f6d-9a1e-2b5d3c7e8a10"
}
```

### 9.2 エラー分類表 — Order Insights

| HTTP ステータス | エラーコード | シナリオ | ユーザー向け挙動 |
|-----------------|--------------|----------|------------------|
| `400` | `BAD_REQUEST` | 無効な status/date/period/pagination/sort パラメータ | 項目レベルのインラインエラー＋トップバナー |
| `401` | `UNAUTHORIZED` | JWT 欠損または無効 | ログインへリダイレクト |
| `403` | `FORBIDDEN` | 販売者サマリーを要求する購入者（BR-OI-005）；`license_status ≠ 'approved'` の販売者（BR-OI-006）；`merchantId`/`shopId` を指定した非管理者 | "You don't have permission to view this data" / "Your merchant account is not approved" |
| `404` | `NOT_FOUND` | 注文が存在しない**または**呼び出し元のスコープ外（BR-OI-008 — 意図的に区別不可） | "Order not found" ＋ Back to Orders アクション |
| `422` | `UNPROCESSABLE_ENTITY` | 有効な `from`/`to` ペアなしの `period=custom` | "Select a start and end date" |
| `429` | `TOO_MANY_REQUESTS` | レート制限超過 | "Too many requests. Please wait {seconds} seconds" |
| `500` | `INTERNAL_SERVER_ERROR` | 集計／DB 障害 | "Something went wrong. Please try again" |

### 9.3 フロントエンドのエラー表示挙動

- **ローディング：** テーブル・タイル・タイムラインのスケルトンシュimmer。リトライボタン付きエラー状態。
- **空データ：** `0` / `—` プレースホルダーとイラスト付き空状態（BR-OI-030）。エラーにはしない。
- **スコープ外アクセス：** BR-OI-008 からの `404` は標準の not-found パネルを描画 — 他の所有者の下に注文が存在することを決して示さない。
- **未サポート指標：** 固定されていないコミッション率は `—` / 脚注として描画（BR-OI-032）。エラーにはしない。
- **トースト通知：** 一時的な API エラーとリトライ結果に使用。

---

## 10. 権限とアクセス制御（Permission and Access Control）

### 10.1 認証要件

- すべての Order Insights エンドポイントは有効な JWT Bearer Token を要する。公開エンドポイントは**存在しない**。
- ロールアクセスは要件定義書 §2.2 に従う。「View Order History」は購入者（自身の注文）で ✅。「View Order Insights」（売上/収益サマリー）は販売者および管理者のみ ✅、ゲストおよび購入者は ❌。

### 10.2 保護されたエンドポイント

| エンドポイント | アクセスレベル | 適用されるスコープ |
|----------------|---------------|---------------------|
| `GET /orders` | 保護（Buyer、Merchant、Admin） | Buyer → 自身；Merchant → 自ショップ；Admin → 全体（§6.4） |
| `GET /orders/:id` | 保護（Buyer、Merchant、Admin） | 所有権は BR-OI-008 に従い検証 |
| `GET /orders/:id/tracking` | 保護（Buyer、Merchant、Admin） | 所有権は BR-OI-008 に従い検証 |
| `GET /order-insights/merchant/sales-summary` | 保護（Merchant、Admin） | 自ショップのみ |
| `GET /order-insights/merchant/revenue-summary` | 保護（Merchant、Admin） | 自ショップのみ |

### 10.3 ロールベースアクセス

| ロール | Order History | Order Detail | Order Tracking | 詳細の顧客情報 | Sales Summary | Revenue Summary | ショップ/販売者絞り込み |
|------|:-------------:|:------------:|:--------------:|:---------------:|:-------------:|:---------------:|:-----------------------:|
| `guest` | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `buyer` | ✓（自注文） | ✓（自注文） | ✓（自注文） | ✗（自身の住所のみ） | ✗ | ✗ | ✗ |
| `merchant` | ✓（自ショップ） | ✓（自ショップ） | ✓（自ショップ） | ✓ | ✓（自ショップ） | ✓（自ショップ） | ✗ |
| `admin` | ✓（全体） | ✓（全体） | ✓（全体） | ✓ | ✓ | ✓ | ✓ |

### 10.4 所有権＆データスコープ

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('buyer', 'merchant', 'admin')
@Controller('orders')
export class OrderInsightsController {
  // GET /            -> ロールスコープのリスト（BR-OI-001）
  //   buyer     -> where buyer_id = currentUser.id
  //   merchant  -> 1) merchants.user_id = currentUser.id から merchants.id を解決
  //                2) license_status = 'approved' を確認、さもなくば 403（BR-OI-006）
  //                3) where merchant_id = <解決済み merchants.id>
  //   admin     -> 所有者フィルタなし；merchantId / shopId / status を渡せる（§5.6）
  //
  // GET /:id          -> detail;   読み込み後に所有権検証、不一致 -> 404（BR-OI-008）
  // GET /:id/tracking -> timeline; 読み込み後に所有権検証、不一致 -> 404（BR-OI-008）
  //
  // 注意: ステータス更新はここでは宣言しない — Order Fulfillment
  //        モジュールに属する。本コントローラは読み取り専用（BR-OI-007）。
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('merchant', 'admin')
@Controller('order-insights/merchant')
export class MerchantOrderInsightsController {
  // GET /sales-summary   -> 注文数: 本日 / 今月 / 完了（BR-OI-018/019）
  // GET /revenue-summary -> Sales, Commission, Revenue, AOV — 常に4つすべて（BR-OI-026）
  //   merchant -> 解決済み merchants.id にスコープ；ライセンスゲート適用（BR-OI-006）
  //   admin    -> ライセンスゲートをバイパス；ショップ選択に merchantId を渡す必要あり
}
```

販売者および購入者のクエリは JWT 同一性から常にスコープされなければならない — クライアント指定の所有者IDを信頼してはならない。管理者絞り込み（`merchantId`、`shopId`）は**唯一**のクライアント指定スコープ入力であり、`admin` ロールのみから受け付ける。

### 10.5 セキュリティ監査ログ

| イベント | 記録されるデータ | 保持期間 |
|----------|------------------|----------|
| `ORDER_LIST_VIEWED` | userId、role、適用絞り込み、page、timestamp | 90日 |
| `ORDER_DETAIL_VIEWED` | userId、role、orderId、timestamp | 90日 |
| `ORDER_TRACKING_VIEWED` | userId、role、orderId、timestamp | 90日 |
| `MERCHANT_SUMMARY_VIEWED` | userId、merchantId、summary type（sales/revenue）、period、timestamp | 90日 |
| `CROSS_SCOPE_ACCESS_DENIED` | userId、role、要求 orderId、timestamp | 180日（セキュリティシグナル、BR-OI-008） |

---

## 11. リアルタイム通知の挙動（Real-Time Notification Behavior）

### 11.1 現在の実装

Order Insights 画面は WebSocket 接続を開かない。データはナビゲーション時および絞り込み/期間変更時に、標準のクエリ無効化（TanStack Query）を通じて取得される。ステータス変更は Order Fulfillment モジュールに発祥し、購入者への通知は Notification System（要件定義書 §6.2）を通じて行われ、本サブシステムからは行われない。

### 11.2 更新トリガー

| イベント | トリガー | 効果 |
|----------|----------|------|
| 注文作成 | Checkout 完了 | 販売者サマリーキャッシュ無効化；次回ロードで注文履歴を再取得 |
| 注文ステータス更新 | Order Fulfillment モジュールが `orders.status` を更新 | `cache:oi:merchant:{merchantId}:summary` 無効化；追跡＋リスト再取得 |
| 絞り込み／期間変更 | ユーザーがステータス、ショップ、日付範囲、期間を変更 | 影響クエリのみ再取得 |
| 手動更新 | 更新ボタン押下 | アクティブビューの全再取得 |
| ルートフォーカス | Order Insights ルートへの復帰 | stale-time 再取得（既定 5分 `staleTime`） |

### 11.3 通知境界

注文ステータス通知（購入者「ご注文は発送されました」、販売者「新規注文を受けました」）は **Notification System**（§6.2）が配信する。Order Insights は状態を描画するのみで、通知を発行しない。

---

## 12. 画面遷移仕様（Screen Transition Specification）

### 12.1 内向きナビゲーション（Inbound Navigation）

| ソース | ターゲット | 条件 |
|--------|------------|------|
| 購入者アカウントメニュー／「My Orders」 | `/orders` | 購入者認証済み |
| Checkout 完了画面 | `/orders/:id` | 注文が直近作成 |
| 販売者サイドバー → 「Orders」 | `/merchant/orders` | 販売者認証済みかつライセンス承認済み |
| 管理者サイドバー → 「Orders」 | `/admin/orders` | 管理者認証済み |
| 通知（注文ステータス変更） | `/orders/:id/tracking` | Notification System からのディープリンク |
| 任意の保護ルート（未認証） | `/login` | 有効なアクセストークンなし |
| `license_status ≠ approved` の販売者ルート | `/merchant/pending-approval` | BR-OI-006 |
| 販売者が販売者/管理者ルートを試行 | `/unauthorized` | BR-OI-005 |

### 12.2 内部ナビゲーション（Internal Navigation）

| ソース | ターゲット | トリガー |
|--------|------------|----------|
| 注文履歴行 | 注文詳細（`/orders/:id`、`/merchant/orders/:id`、`/admin/orders/:id`） | 注文番号／「View」のクリック |
| 注文詳細 | 注文追跡（`…/:id/tracking`） | 「Track Order」のクリック |
| 注文追跡 | 注文詳細 | 「Back」のクリック |
| 管理者注文リスト | 絞り込み適用済みの同リスト | ショップ/販売者またはステータス絞り込みの選択（§5.6） |
| 販売者サマリータイル | 事前絞り込み済みの自ショップ注文リスト | Sales Summary タイルのクリック（例「Completed」→ `status=delivered`） |

### 12.3 外向きナビゲーション（Outbound Navigation）

| ソース | ターゲット | 条件 |
|--------|------------|------|
| 購入者注文詳細 | `/products/:id` | 商品明細のクリック |
| 購入者注文詳細 | レビューフォーム | 注文 `status = 'delivered'` かつ未レビューの商品（Review サブシステム） |
| 販売者注文詳細 | Order Fulfillment ステータス画面 | **Change Status** は Order Fulfillment への遷移のみ。実際の更新は同画面で行う |
| 管理者注文リスト | `/admin/merchants/:id` | ショップ/販売者名のクリック |

### 12.4 エラーナビゲーション

| ソース | ターゲット | 条件 |
|--------|------------|------|
| 任意の Order Insights ページ | `/login` | 401 Unauthorized |
| 任意の Order Insights ページ | `/unauthorized` | 403 Forbidden（ロールまたはライセンスゲート） |
| 注文詳細／追跡 | 現在ルート上の not-found パネル | 404（注文欠損またはスコープ外、BR-OI-008） |
| 任意の Order Insights ページ | 現在ページ＋トースト | 400 / 422 / 429 / 500（インライン処理、リダイレクトなし） |

---

## 13. 非機能要件（Non-Functional Considerations）

### 13.1 パフォーマンス要件

| 指標 | 目標 |
|------|------|
| 注文履歴ページロード | ≤ 2秒 |
| 注文リスト API（任意ロール、ページネーション付き） | ≤ 1秒 |
| 注文詳細 API | ≤ 500ms |
| 注文追跡 API | ≤ 500ms |
| 販売者 Sales Summary API | ≤ 500ms（キャッシュヒット）/ ≤ 1.5秒（キャッシュミス） |
| 販売者 Revenue Summary API | ≤ 500ms（キャッシュヒット）/ ≤ 1.5秒（キャッシュミス） |
| フィルタ付き管理者全注文 API | ≤ 1.5秒 |

### 13.2 キャッシュ戦略

| キャッシュキー | TTL | 無効化トリガー |
|----------------|-----|----------------|
| `cache:oi:merchant:{merchantId}:summary` | 5分 | 注文作成（Checkout）/ ステータス更新（Order Fulfillment）/ 手動更新 |
| `cache:oi:statuses` | 24時間 | `order_statuses` マスタデータ変更（デプロイ時） |

> 注文履歴・詳細・追跡の応答は**サーバーキャッシュしない** — ユーザーごとにスコープされ、インデックス付きクエリから直接提供される。

### 13.3 クエリ＆インデックス使用

| クエリ | 依存するインデックス |
|--------|----------------------|
| 購入者注文履歴 | `idx_orders_buyer_id`、`idx_orders_created_at` |
| 販売者注文履歴／サマリー | `idx_orders_merchant_id`、`idx_orders_created_at` |
| 管理者フィルタ付きリスト | `idx_orders_merchant_id`、`idx_orders_status`、`idx_orders_created_at` |
| 注文詳細明細 | `idx_order_items_order_id`、`idx_order_items_merchant_id` |
| 追跡タイムライン | `idx_order_status_history_order_id` |

### 13.4 レスポンシブ設計要件

| ブレイクポイント | レイアウト |
|------------------|------------|
| デスクトップ（≥ 1024px） | Sales Summary タイル3列；Revenue Summary は4列グループ；全幅注文テーブル |
| タブレット（768px – 1023px） | Sales Summary タイルは1×3行；Revenue Summary は2×2グループ；圧縮テーブル |
| モバイル（< 768px） | 1列タイル；**Revenue Summary は4数値すべてを縦積み — 単一値への切り詰め禁止（BR-OI-026）**；注文リストはカード表示 |

### 13.5 アクセシビリティ要件

| 要件 | 実装 |
|------|------|
| WCAG 2.1 AA | セマンティックHTML；すべての対話要素に ARIA ラベル |
| キーボードナビゲーション | タブ順：絞り込み → サマリータイル → テーブル行 → ページネーション |
| スクリーンリーダー | ステータスバッジは完全なステータス名を公開；追跡ステッパーは順序付きリストで現在ステータスに `aria-current="step"`；各 Revenue Summary 数値は自身のラベルとともに読み上げ（裸の数値は不可） |
| 色コントラスト | テキスト最低 4.5:1、UI コンポーネント 3:1 |
| フォーカスインジケータ | すべての対話要素に視認可能なフォーカスリング |

### 13.6 国際化（Internationalisation）

すべてのラベル — `order_statuses.status_name`、4つの Revenue Summary ラベル、スキーマギャップ脚注を含む — は EN / MY / JA 向けに解決される i18n キーである（要件定義書 §8.1）。

---

## 14. 設定可能項目（外部定義）（Configurable Items — External Definitions）

`.env` 設定により定義：

| 定義キー | 既定値 | 説明 |
|----------|--------|------|
| `OI_ORDER_LIST_PAGE_SIZE` | `20` | 注文履歴の既定ページサイズ |
| `OI_TABLE_MAX_PAGE_SIZE` | `100` | API が受け付ける最大ページサイズ |
| `OI_DEFAULT_SUMMARY_PERIOD` | `this_month` | Revenue Summary の既定期間 |
| `OI_SUMMARY_CACHE_TTL_SECONDS` | `300` | 販売者売上/収益サマリーのキャッシュ TTL（5分） |
| `OI_STATUS_CACHE_TTL_SECONDS` | `86400` | `order_statuses` マスタデータのキャッシュ TTL |
| `OI_DEFAULT_COMMISSION_RATE` | `12.00` | `commission_settings` が読めない場合のみ使用するフォールバックコミッション率（%）（BR-OI-023） |

---

## 15. クロスリファレンス・トレーサビリティマトリクス（Cross-Reference Traceability Matrix）

### 15.1 要件定義書トレーサビリティ

| 要件 | 要件説明 | 本書でのカバー |
|------|----------|----------------|
| §3.3 Order History（Buyer） | 過去の注文をすべて閲覧 | UC-OI-001、BR-OI-002/009~012、§5.1、§6.1 |
| §3.3 Order Detail（Buyer） | 注文明細、合計、支払ステータスを閲覧 | UC-OI-002、BR-OI-008/017、§5.2、§6.2、§7.5 |
| §3.3 Order Tracking（Buyer） | ステータスタイムラインを追跡 | UC-OI-003、BR-OI-013/014、§3.1~3.3、§5.3、§6.3、§7.6 |
| §4.5 Order History（Merchant） | 自ショップの注文を閲覧 | UC-OI-004、BR-OI-003/006、§5.4.3、§6.1 |
| §4.5 Order Detail（Merchant） | 注文明細、顧客情報を閲覧 | UC-OI-005、BR-OI-015/033、§5.5、§6.2、§7.5 |
| §4.5 Order Tracking（Merchant） | 注文ステータスを追跡 | UC-OI-006、BR-OI-013/014、§5.3、§6.3 |
| §4.5 Sales Summary（Merchant） | 注文数：本日 / 今月 / 完了 | UC-OI-007、BR-OI-018~019、§5.4.1、§6.4、§7.7 |
| §4.5 Revenue Summary（Merchant） | Sales、Commission、Revenue、AOV | UC-OI-008、**BR-OI-021~028**、§5.4.2、§6.5、§7.8 |
| §5.6 All Orders（Admin） | プラットフォーム全体の注文を閲覧 | UC-OI-009、BR-OI-004、§5.6、§6.1 |
| §5.6 Orders by Merchant（Admin） | ショップで注文を絞り込み | UC-OI-010、BR-OI-016、§5.6（EL-OI-61）、§6.1 |
| §5.6 Orders by Status（Admin） | 注文ステータスで絞り込み | UC-OI-011、BR-OI-011/016、§5.6（EL-OI-62）、§6.1 |
| §6.4 Order Insights（Shared） | 各ロールは自身のスコープのみ閲覧 | **BR-OI-001~004、BR-OI-008**、§10.3、§10.4 |
| §7.3 Orders | ステータスフロー；価格は注文作成時固定 | §3.1、§3.2、BR-OI-017 |
| §7.7 Monetization | コミッション率は注文作成時固定；payout = Sales − Commission | BR-OI-022、BR-OI-023、BR-OI-024 |
| §2.2 Permission Matrix | View Order Insights：Merchant ✅ / Admin ✅ | BR-OI-005、§10.1、§10.3 |

### 15.2 データベース設計トレーサビリティ

| データベーステーブル | 関連する機能操作 |
|----------------------|------------------|
| `orders` | 注文履歴リスト（`buyer_id`/`merchant_id`/`status`/`created_at` での SELECT）、注文詳細ヘッダ、売上サマリー計数、収益集計。**書き込みなし。** |
| `order_items` | 注文詳細明細；販売者スコープの明細投影（`merchant_id`） |
| `order_statuses` | ステータスラベル/順序の真値源；追跡タイムラインの枠組み（BR-OI-013）；完了計数の終端状態定義（BR-OI-018） |
| `order_status_history` | 追跡タイムラインのタイムスタンプ（BR-OI-013/014） |
| `merchants` | 販売者ID解決（`user_id` → `id`）、ライセンスゲート（`license_status`）、管理者リスト用ショップ名 |
| `shops` | 管理者ショップ絞り込み選択肢リスト（EL-OI-61） |
| `users` | 顧客情報ブロック用の購入者名/連絡先（販売者/管理者のみ） |
| `commission_settings` | Revenue Summary 用コミッション率（BR-OI-022/023）— 読み取り専用 |

### 15.3 関連文書参照

| 文書ID | 文書名 | ファイルパス |
|--------|--------|--------------|
| SKM-REQ-001 | 要件定義書 | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` |
| SKM-DBS-001 | データベース設計書 | `docs/core-work/データベース設計書_DATABASE_SPEC.md` |
| SKM-DEV-001 | 開発ルール | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` |

---

---

*機能設計書（Order Insights）の終わり*
