# 機能設計書（サインアップ / ログインページ）

---

## ドキュメント管理

| 属性 | 値 |
|------|-----|
| **ドキュメントID** | SKM-FDS-AUTH-001 |
| **システム** | Cosmetics Finder |
| **モジュール** | 認証（サインアップ / ログイン） |
| **バージョン** | 1.0 |
| **作成日** | 2026-08-04 |
| **ステータス** | 下書き |

---

## 1. 概要

本文書は、サインアップおよびログインページの詳細な機能設計を定義し、フロントエンドUI、バックエンドAPI、データベースインタラクションをカバーしています。

---

## 2. 要件トレーサビリティ

| 要件ID | 説明 | 優先度 |
|--------|------|--------|
| B-AUTH-001 | ユーザーはメールアドレスとパスワードで登録できる | 高 |
| B-AUTH-002 | ユーザーはメールアドレスとパスワードでログインできる | 高 |
| B-AUTH-003 | システムはJWTアクセストークン（15分）とリフレッシュトークン（7日）を発行する | 高 |
| B-AUTH-004 | ユーザーはログアウトできる（トークンはRedisでブラックリスト化） | 高 |
| B-AUTH-005 | アクセストークンはリフレッシュトークンによって自動更新される | 高 |
| B-AUTH-006 | パスワードはArgon2でハッシュ化される | 高 |
| B-AUTH-007 | リフレッシュトークンは毎回ローテーションされる | 高 |
| B-AUTH-008 | トークンファミリー追跡による違反検知 | 中 |

---

## 3. APIエンドポイント設計

### 3.1 エンドポイント概要

| メソッド | パス | 説明 | 認証 |
|----------|------|------|------|
| `POST` | `/api/v1/auth/register` | ユーザー登録 | 公開 |
| `POST` | `/api/v1/auth/login` | ユーザーログイン | 公開 |
| `POST` | `/api/v1/auth/refresh` | アクセストークン更新 | Cookie（リフレッシュトークン） |
| `POST` | `/api/v1/auth/logout` | ログアウト（トークンブラックリスト化） | Bearer JWT |
| `GET` | `/api/v1/auth/verify` | トークン有効性確認 | Bearer JWT |

---

### 3.2 POST `/api/v1/auth/register`

**リクエストボディ（RegisterDto）：**

```json
{
  "email": "user@example.com",
  "password": "secureP@ss1",
  "name": "John Doe",
  "role": "buyer"
}
```

**バリデーションルール（class-validator）：**

| フィールド | 型 | 制約 |
|------------|-----|------|
| `email` | `string` | `@IsEmail()`、`@IsNotEmpty()` |
| `password` | `string` | `@MinLength(8)`、`@MaxLength(128)`、`@Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)` |
| `name` | `string` | `@IsString()`、`@IsNotEmpty()`、`@MaxLength(200)` |
| `role` | `string` | `@IsIn(['buyer', 'merchant'])`、`@IsOptional()` |

**成功レスポンス（201）：**

```json
{
  "data": {
    "id": "clx1234567890",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "buyer",
    "emailVerified": false,
    "createdAt": "2026-08-04T12:00:00.000Z"
  }
}
```

**エラーレスポンス：**

| ステータス | メッセージ | トリガー |
|------------|-----------|----------|
| `409` | `["Email already exists"]` | 重複メールアドレス |
| `400` | `["email must be an email", ...]` | バリデーション失敗 |

**バックエンド処理フロー：**

```
RegisterDtoがValidationPipeでバリデーション
  → AuthService.register()
    → usersテーブルでメールアドレスの一意性を確認
    → Argon2でパスワードをハッシュ化（64MB、3反復、4スレッド）
    → usersテーブルにユーザーレコードを作成
    → ユーザーDTOを返す（password_hashを除く）
    → ログ：USER_REGISTERED監査イベント
```

---

### 3.3 POST `/api/v1/auth/login`

**リクエストボディ（LoginDto）：**

```json
{
  "email": "user@example.com",
  "password": "secureP@ss1"
}
```

**バリデーションルール：**

| フィールド | 型 | 制約 |
|------------|-----|------|
| `email` | `string` | `@IsEmail()`、`@IsNotEmpty()` |
| `password` | `string` | `@IsNotEmpty()`、`@MinLength(8)` |

**成功レスポンス（200）：**

```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
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

**レスポンスヘッダー：**

```
Set-Cookie: refreshToken=<hashed>; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth/refresh; Max-Age=604800
```

**エラーレスポンス：**

| ステータス | メッセージ | トリガー |
|------------|-----------|----------|
| `401` | `["Invalid email or password"]` | 認証情報エラー |
| `403` | `["Account is deactivated"]` | `is_active = false` |
| `400` | バリデーションエラー | 無効な入力 |

**バックエンド処理フロー：**

```
LoginDtoがバリデーション
  → AuthService.login()
    → メールアドレスでユーザーを検索（idx_users_emailインデックス）
    → is_active = trueを確認
    → argon2.verify()でパスワードを検証
    → Redisレート制限を確認（rate:auth:{ip}、5回/300秒）
    → JWTアクセストークンを生成（有効期限15分）
      ペイロード：{ sub: userId, email, role, jti }
      署名：JWT_ACCESS_SECRET
    → リフレッシュトークンを生成（有効期限7日）
      署名：JWT_REFRESH_SECRET
    → Argon2でリフレッシュトークンをハッシュ化
    → refresh_tokensテーブルにリフレッシュトークンを保存
      - family: cuid()（新しいセッションファミリー）
      - absoluteLimitAt: now + 90日
      - expiresAt: now + 7日
    → httpOnlyクッキーに生のリフレッシュトークンを設定
    → レスポンスボディにaccessToken + ユーザーDTOを返す
    → ログ：USER_LOGIN成功監査イベント
```

---

### 3.4 POST `/api/v1/auth/refresh`

**リクエスト：**
- ボディは不要
- リフレッシュトークンはhttpOnlyクッキーから読み取り

**成功レスポンス（200）：**

```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**レスポンスヘッダー：**

```
Set-Cookie: refreshToken=<new_hashed>; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth/refresh; Max-Age=604800
```

**エラーレスポンス：**

| ステータス | メッセージ | トリガー |
|------------|-----------|----------|
| `401` | `["Refresh token not found"]` | クッキー欠落 |
| `401` | `["Refresh token has been revoked"]` | `is_revoked = true` |
| `401` | `["Session expired. Please login again"]` | `expires_at < now` |
| `401` | `["Absolute session limit reached"]` | `absolute_limit_at < now` |
| `401` | `["Token reuse detected. All sessions revoked"]` | ファミリーのリユース検知 |
| `401` | `["Invalid refresh token"]` | 署名検証失敗 |

**バックエンド処理フロー（リフレッシュトークンローテーション）：**

```
クッキーからリフレッシュトークンを読み取り
  → AuthService.refresh()
    → JWT_REFRESH_SECRETでJWT署名を検証
    → トークンからjtiを抽出
    → token_hashでrefresh_tokenレコードを検索
    → 検証：
      1. トークンがDBに存在する
      2. is_revoked = false
      3. expires_at > now()
      4. absolute_limit_at > now()
    → トークンファミリーを確認：
      - 同じファミリーで無効化されたトークンが検知された場合 → リユース検知
        → このユーザーのすべてのトークンを無効化
        → ログ：SECURITY_VIOLATION
        → 401を返す
    → 古いトークンを無効化（is_revoked = true）
    → 新しいアクセストークンを生成（15分）
    → 新しいリフレッシュトークンを生成（7日）
      - 同じファミリーIDを継承
    → 新しいリフレッシュトークンをハッシュ化
    → 新しいリフレッシュトークンをDBに保存
    → 新しいhttpOnlyクッキーを設定
    → 新しいアクセストークンを返す
    → ログ：TOKEN_REFRESHED監査イベント
```

---

### 3.5 POST `/api/v1/auth/logout`

**リクエストヘッダー：**

```
Authorization: Bearer <accessToken>
```

**成功レスポンス（204）：** ボディなし

**バックエンド処理フロー：**

```
JwtAuthGuardがアクセストークンを検証
  → AuthService.logout()
    → トークンペイロードからjtiを抽出
    → Redisブラックリストにjtiを追加：
      SET blacklist:{jti} "1" EX <remaining_ttl>
    → このユーザーのすべてのリフレッシュトークンを無効化（オプション：現在のセッションのみ）
    → ログ：USER_LOGOUT監査イベント
```

---

### 3.6 GET `/api/v1/auth/verify`

**リクエストヘッダー：**

```
Authorization: Bearer <accessToken>
```

**成功レスポンス（200）：**

```json
{
  "data": {
    "id": "clx1234567890",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "buyer",
    "emailVerified": false
  }
}
```

**エラーレスポンス：**

| ステータス | メッセージ | トリガー |
|------------|-----------|----------|
| `401` | `["Invalid or expired token"]` | トークン期限切れまたはブラックリスト化 |

---

## 4. フロントエンド設計

### 4.1 ページ構成

```
frontend/src/
├── pages/
│   ├── Login.tsx                    # ログインページ（ルート：/login）
│   └── Register.tsx                 # 登録ページ（ルート：/register）
├── features/auth/
│   ├── components/
│   │   ├── LoginForm.tsx            # ログインフォームコンポーネント
│   │   ├── RegisterForm.tsx         # 登録フォームコンポーネント
│   │   └── AuthLayout.tsx           # 共通認証レイアウト（ロゴ、背景）
│   ├── hooks/
│   │   └── useAuth.ts              # 認証フック
│   ├── schemas/
│   │   └── auth.schema.ts          # Zodバリデーションスキーマ
│   └── services/
│       └── auth.service.ts         # APIサービストイヤー
```

### 4.2 ルート定義（routes.tsx）

```tsx
// 公開ルート
<Route path="/login" element={<Login />} />
<Route path="/register" element={<Register />} />

// 保護ルート（認証が必要）
<Route element={<ProtectedRoute />}>
  <Route path="/profile" element={<Profile />} />
  {/* ... その他の保護ルート */}
</Route>
```

### 4.3 Zodスキーマ（auth.schema.ts）

```typescript
export const loginSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(8, 'パスワードは8文字以上である必要があります'),
});

export const registerSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z
    .string()
    .min(8, 'パスワードは8文字以上である必要があります')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
      'パスワードには大文字、小文字、数字、特殊文字を含む必要があります'
    ),
  name: z.string().min(1, '名前は必須です').max(200),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'パスワードが一致しません',
  path: ['confirmPassword'],
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
```

### 4.4 UIワイヤーフレーム

#### ログインページ

```
┌─────────────────────────────────────────────┐
│  ┌─────────────────────────────────────┐    │
│  │         🌿 Cosmetics Finder         │    │
│  │                                     │    │
│  │  ┌─────────────────────────────┐    │    │
│  │  │  メールアドレス              │    │    │
│  │  │  ┌─────────────────────┐    │    │    │
│  │  │  │ user@example.com    │    │    │    │
│  │  │  └─────────────────────┘    │    │    │
│  │  └─────────────────────────────┘    │    │
│  │                                     │    │
│  │  ┌─────────────────────────────┐    │    │
│  │  │  パスワード                  │    │    │
│  │  │  ┌─────────────────────┐    │    │    │
│  │  │  │ ••••••••       👁   │    │    │    │
│  │  │  └─────────────────────┘    │    │    │
│  │  └─────────────────────────────┘    │    │
│  │                                     │    │
│  │  ┌─────────────────────────────┐    │    │
│  │  │       ログイン（プライマリ）  │    │    │
│  │  └─────────────────────────────┘    │    │
│  │                                     │    │
│  │  アカウントをお持ちでない方はこちら   │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  🌐 言語：EN | MY | JA                      │
│  🌙 テーマ：ライト / ダーク                   │
└─────────────────────────────────────────────┘
```

#### 登録ページ

```
┌─────────────────────────────────────────────┐
│  ┌─────────────────────────────────────┐    │
│  │         🌿 Cosmetics Finder         │    │
│  │                                     │    │
│  │  ┌─────────────────────────────┐    │    │
│  │  │  フルネーム                  │    │    │
│  │  │  ┌─────────────────────┐    │    │    │
│  │  │  │ John Doe            │    │    │    │
│  │  │  └─────────────────────┘    │    │    │
│  │  └─────────────────────────────┘    │    │
│  │                                     │    │
│  │  ┌─────────────────────────────┐    │    │
│  │  │  メールアドレス              │    │    │
│  │  │  ┌─────────────────────┐    │    │    │
│  │  │  │ user@example.com    │    │    │    │
│  │  │  └─────────────────────┘    │    │    │
│  │  └─────────────────────────────┘    │    │
│  │                                     │    │
│  │  ┌─────────────────────────────┐    │    │
│  │  │  パスワード                  │    │    │
│  │  │  ┌─────────────────────┐    │    │    │
│  │  │  │ ••••••••       👁   │    │    │    │
│  │  │  └─────────────────────┘    │    │    │
│  │  │  8文字以上、大文字、小文字、  │    │    │
│  │  │  数字、記号を含む            │    │    │
│  │  └─────────────────────────────┘    │    │
│  │                                     │    │
│  │  ┌─────────────────────────────┐    │    │
│  │  │  パスワード確認              │    │    │
│  │  │  ┌─────────────────────┐    │    │    │
│  │  │  │ ••••••••            │    │    │    │
│  │  │  └─────────────────────┘    │    │    │
│  │  └─────────────────────────────┘    │    │
│  │                                     │    │
│  │  ┌─────────────────────────────┐    │    │
│  │  │  種類：                      │    │    │
│  │  │  ( ) 購入者  ( ) 出品者      │    │    │
│  │  └─────────────────────────────┘    │    │
│  │                                     │    │
│  │  ┌─────────────────────────────┐    │    │
│  │  │     アカウントを作成         │    │    │
│  │  └─────────────────────────────┘    │    │
│  │                                     │    │
│  │  すでにアカウントをお持ちの方はこちら  │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  🌐 言語：EN | MY | JA                      │
│  🌙 テーマ：ライト / ダーク                   │
└─────────────────────────────────────────────┘
```

### 4.5 フロントエンドサービストイヤー（auth.service.ts）

```typescript
const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

export const authService = {
  async login(data: LoginFormData): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // クッキー送受信
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new AuthError(error.message, response.status);
    }
    return response.json();
  },

  async register(data: RegisterFormData): Promise<RegisterResponse> {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: data.email,
        password: data.password,
        name: data.name,
      }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new AuthError(error.message, response.status);
    }
    return response.json();
  },

  async refresh(): Promise<{ accessToken: string }> {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) throw new AuthError('セッションが期限切れです', 401);
    return response.json();
  },

  async logout(): Promise<void> {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getAccessToken()}`,
      },
      credentials: 'include',
    });
    clearAccessToken();
  },

  async verify(): Promise<User> {
    const response = await fetch(`${API_BASE}/auth/verify`, {
      headers: {
        Authorization: `Bearer ${getAccessToken()}`,
      },
    });
    if (!response.ok) throw new AuthError('無効なトークンです', 401);
    return response.json();
  },
};
```

### 4.6 useAuthフック（useAuth.ts）

```typescript
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // マウント時にトークンを自動更新
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { accessToken } = await authService.refresh();
        setAccessToken(accessToken);
        const userData = await authService.verify();
        setUser(userData);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (data: LoginFormData) => {
    const response = await authService.login(data);
    setAccessToken(response.accessToken);
    setUser(response.user);
    navigate('/');
  };

  const register = async (data: RegisterFormData) => {
    await authService.register(data);
    navigate('/login');
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    navigate('/login');
  };

  return { user, isLoading, login, register, logout };
}
```

---

## 5. データベース操作

### 5.1 関連テーブル

| テーブル | 操作 | 目的 |
|----------|------|------|
| `users` | INSERT | 登録時に新しいユーザーを作成 |
| `users` | SELECT | ログイン時にメールアドレスでユーザーを検索 |
| `refresh_tokens` | INSERT | ハッシュ化されたリフレッシュトークンを保存 |
| `refresh_tokens` | SELECT | ローテーション時にリフレッシュトークンを検証 |
| `refresh_tokens` | UPDATE | ローテーション時に古いトークンを無効化 |
| `refresh_tokens` | UPDATE | 違反検知時にすべてのトークンを無効化 |

### 5.2 インデックス使用

| インデックス | 使用箇所 | 目的 |
|-------------|----------|------|
| `idx_users_email` | ログイン、登録（一意性確認） | 高速メールアドレス検索 |
| `idx_refresh_tokens_token_hash` | リフレッシュエンドポイント | トークン検証 |
| `idx_refresh_tokens_user_id` | ログアウト（全無効化） | ユーザートークン検索 |
| `idx_refresh_tokens_family` | 違反検知 | ファミリー追跡 |

### 5.3 Prismaクエリ

**登録 - メールアドレス一意性確認：**

```typescript
const existingUser = await prisma.user.findUnique({
  where: { email: dto.email },
  select: { id: true },
});
```

**登録 - ユーザー作成：**

```typescript
const user = await prisma.user.create({
  data: {
    email: dto.email,
    passwordHash: await argon2.hash(dto.password),
    name: dto.name,
    role: dto.role || 'buyer',
  },
  select: {
    id: true,
    email: true,
    name: true,
    role: true,
    emailVerified: true,
    createdAt: true,
  },
});
```

**ログイン - ユーザー検索：**

```typescript
const user = await prisma.user.findUnique({
  where: { email: dto.email },
  select: {
    id: true,
    email: true,
    name: true,
    passwordHash: true,
    role: true,
    avatarUrl: true,
    isActive: true,
  },
});
```

**リフレッシュ - トークン保存：**

```typescript
await prisma.refreshToken.create({
  data: {
    userId: user.id,
    tokenHash: await argon2.hash(refreshToken),
    family: familyId,
    ipAddress: requestIp,
    deviceInfo: userAgent,
    absoluteLimitAt: addDays(now, 90),
    expiresAt: addDays(now, 7),
  },
});
```

---

## 6. セキュリティ対策

### 6.1 パスワードポリシー

| ルール | 値 |
|--------|-----|
| 最小長 | 8文字 |
| 最大長 | 128文字 |
| 必須文字タイプ | 大文字、小文字、数字、特殊文字 |
| ハッシュ化アルゴリズム | Argon2id |
| メモリコスト | 64 MB |
| 時間コスト | 3反復 |
| 並列性 | 4スレッド |

### 6.2 JWT設定

| パラメータ | アクセストークン | リフレッシュトークン |
|-----------|----------------|-------------------|
| 有効期限 | 15分 | 7日 |
| シークレット | `JWT_ACCESS_SECRET` | `JWT_REFRESH_SECRET` |
| ストレージ（フロントエンド） | メモリ変数 | httpOnlyクッキー |
| ペイロード | `{ sub, email, role, jti }` | `{ sub, jti, family }` |
| クッキー属性 | 該当なし | `HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth/refresh` |

### 6.3 レート制限

| エンドポイント | 制限 | ウィンドウ | キー |
|---------------|------|-----------|------|
| `/auth/login` | 5回 | 300秒 | `rate:auth:{ip}` |
| `/auth/register` | 3回 | 300秒 | `rate:auth:{ip}` |
| `/auth/refresh` | 10回 | 60秒 | `rate:auth:{ip}` |

### 6.4 セキュリティヘッダー

```
Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth/refresh; Max-Age=604800
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

---

## 7. エラーハンドリング

### 7.1 バックエンドエラーフォーマット

```json
{
  "statusCode": 401,
  "message": ["Invalid email or password"],
  "error": "Unauthorized",
  "timestamp": "2026-08-04T12:00:00.000Z",
  "path": "/api/v1/auth/login"
}
```

### 7.2 フロントエンドエラーハンドリング

| HTTPステータス | ユーザーフレンドリーメッセージ | アクション |
|---------------|---------------------------|-----------|
| `400` | "入力を確認してください" | フィールドエラーを表示 |
| `401` | "メールアドレスまたはパスワードが無効です" | インラインエラーを表示 |
| `403` | "アカウントが無効化されています" | サポートへの連絡を表示 |
| `409` | "メールアドレスは既に登録されています" | ログインを提案 |
| `429` | "試行回数が多すぎます。しばらくお待ちください" | カウントダウンを表示 |
| `500` | "問題が発生しました" | 再試行ボタンを表示 |

### 7.3 監査ログ

| イベント | データ | 保持期間 |
|----------|--------|----------|
| `USER_REGISTERED` | userId、email、ip、timestamp | 90日 |
| `USER_LOGIN_SUCCESS` | userId、email、ip、timestamp | 90日 |
| `USER_LOGIN_FAILED` | email、ip、timestamp、reason | 30日 |
| `USER_LOGOUT` | userId、timestamp | 90日 |
| `TOKEN_REFRESHED` | userId、timestamp | 90日 |
| `SECURITY_VIOLATION` | userId、ip、timestamp、details | 1年 |

---

## 8. テスト戦略

### 8.1 ユニットテスト

| コンポーネント | テストケース |
|---------------|-------------|
| `auth.service.ts` | 登録成功、重複メール、ログイン成功、パスワードエラー、無効化アカウント |
| `auth.controller.ts` | すべてのエンドポイント成功/エラーパス、バリデーション、RBAC |
| `auth.schema.ts` | 有効/無効メール、パスワード強度、パスワード確認一致 |

### 8.2 統合テスト

| シナリオ | 期待結果 |
|----------|----------|
| 登録 → ログイン → プロフィールアクセス | フルフローが動作 |
| ログイン → リフレッシュ → 保護リソースアクセス | トークンローテーションが動作 |
| ログイン → ログアウト → 古いアクセストークン使用 | 401が返される（ブラックリスト化） |
| 無効化されたトークンでリフレッシュ | ユーザーのすべてのトークンが無効化 |
| レート制限超過 | 429が返される |

### 8.3 セキュリティテスト

| テスト | 期待結果 |
|--------|----------|
| メールフィールドでのSQLインジェクション | 入力がサニタイズされ、インジェクションなし |
| 名前フィールドでのXSS | HTMLがエスケープされ、スクリプト実行なし |
| ブルートフォースログイン | 5回の試行後にレート制限 |
| ログアウト後のトークンリプレイ | 401（ブラックリストチェック） |
| リフレッシュトークンのリユース | ファミリーが無効化、401 |

---

## 9. 実装チェックリスト

### バックエンド（NestJS）

- [ ] `auth.module.ts`を作成
- [ ] `auth.controller.ts`にすべてのエンドポイントを作成
- [ ] `auth.service.ts`にビジネスロジックを作成
- [ ] `dto/register.dto.ts`にバリデーション付きで作成
- [ ] `dto/login.dto.ts`にバリデーション付きで作成
- [ ] `strategies/jwt.strategy.ts`を作成
- [ ] `guards/local-auth.guard.ts`を作成
- [ ] Argon2パスワードハッシュ化を実装
- [ ] JWTアクセストークン/リフレッシュトークン生成を実装
- [ ] ファミリー追跡付きリフレッシュトークンローテーションを実装
- [ ] ログアウト用Redisブラックリストを実装
- [ ] レート制限を実装
- [ ] ユニットテストを作成（カバレッジ90%）
- [ ] 統合テストを作成

### フロントエンド（React）

- [ ] `pages/Login.tsx`を作成
- [ ] `pages/Register.tsx`を作成
- [ ] `features/auth/components/LoginForm.tsx`を作成
- [ ] `features/auth/components/RegisterForm.tsx`を作成
- [ ] `features/auth/components/AuthLayout.tsx`を作成
- [ ] `features/auth/schemas/auth.schema.ts`を作成
- [ ] `features/auth/services/auth.service.ts`を作成
- [ ] `hooks/useAuth.ts`を作成
- [ ] アクセストークンのインメモリストレージを実装
- [ ] アプリ起動時の自動リフレッシュを実装
- [ ] すべての文字列にi18nキーを実装
- [ ] エラー表示付きフォームバリデーションを実装
- [ ] コンポーネントテストを作成
- [ ] フル認証フローのE2Eテストを作成

---

*機能設計書終了（サインアップ / ログインページ）*