# UI ナビゲーション再設計 - 情報アーキテクチャ (IA) 提案

## 現状の問題分析

### 現在のナビゲーション構造（8項目）

```
ホーム | ナレッジ | 検索 | 分析 | 類災事例 | チェックリスト | リスク評価 | 現場管理
```

**問題点:**

1. **モバイルボトムナビに8項目** -- 各アイテムの幅が約47px、ラベルのフォントサイズが0.6rem。物理的にタップ不能に近い
2. **「ナレッジ」と「検索」が別枠** -- 検索はナレッジの子機能であり、トップレベルに並べる意味がない
3. **安全系機能（類災事例・チェックリスト・リスク評価）が分散** -- 概念的に同一グループなのにフラット展開
4. **「現場管理」と「分析」は管理者向け** -- 作業者がタップする頻度は低いのにナビを圧迫
5. **AIチャット（事務/現場モード）がナビに露出していない** -- アプリのコア機能がホーム画面内のカード選択でしか到達できない

---

## 設計提案

### 1. モバイルボトムナビ（4項目）

全ユーザー共通。最も使用頻度が高い4機能に絞る。

| 位置 | アイコン | ラベル | 遷移先 | 理由 |
|------|---------|--------|--------|------|
| 1 | `HiOutlineHome` | ホーム | `/` | ダッシュボード・起点 |
| 2 | `HiOutlineChatAlt2` | AIチャット | `/office-chat` | コア機能。最も使う機能をワンタップで |
| 3 | `HiOutlineBookOpen` | ナレッジ | `/knowledge` | ナレッジ閲覧・検索（検索は子ページ化） |
| 4 | `HiOutlineShieldCheck` | 安全管理 | `/safety` | チェックリスト・類災事例・リスク評価を統合 |

**設計判断の根拠:**

- **AIチャットをナビに昇格**: 現在はホーム画面のモードセレクターからしか到達できない。建設現場で移動中に「すぐ質問したい」ときに2タップ必要なのは致命的。ボトムナビに置けば1タップで到達する。
- **「検索」は「ナレッジ」に統合**: ナレッジ一覧ページの上部に検索バーを常設し、詳細検索は `/knowledge/search` として内部遷移。
- **安全系3機能を「安全管理」として統合**: 建設現場では「安全に関すること」は一つの概念。チェックリスト/類災事例/リスク評価はタブ切り替えまたはハブページで分岐。
- **分析・現場管理はドロワーメニューに格下げ**: 管理者向け機能はハンバーガーメニュー（ドロワー）からアクセス。毎日使う機能ではない。

---

### 2. デスクトップサイドバー（グルーピング）

768px以上で表示。ヘッダーナビではなく左サイドバーに変更し、グルーピングで階層構造を明示する。

```
 [K] 現場のミカタ
 ─────────────────────

 メイン
   ホーム
   AIチャット
     ├ 事務作業モード
     └ 現場作業モード

 ナレッジ
   一覧
   検索
   新規登録

 安全管理
   チェックリスト
   類災事例
   リスク評価

 ─────────────── (管理者のみ)
 管理
   分析ダッシュボード
   現場管理
   会話履歴
```

**ポイント:**
- 現在のヘッダー横並びナビ（`NavLinks`）は8項目を横に並べており、1280px以下で崩れやすい。サイドバーなら項目数に制約がない。
- ただし、サイドバー実装は変更量が大きいため、**Phase 1ではヘッダーナビのグルーピング（ドロップダウン方式）**でも可。

---

### 3. ページ統合案

#### 3-A. 安全管理ハブページ（新規: `/safety`）

類災事例・チェックリスト・リスク評価への入口となるハブページを新設する。

```
/safety                  -- SafetyHubPage（タブ or カード選択）
  /checklists            -- チェックリスト一覧
  /checklists/new        -- チェックリスト作成
  /checklists/:id        -- チェックリスト詳細
  /incidents             -- 類災事例一覧
  /incidents/new         -- 類災事例作成
  /incidents/:id         -- 類災事例詳細
  /risk-assessment       -- リスク評価
```

SafetyHubPage の構成イメージ:

```jsx
// 3つのセクションをカード形式で表示
// - 今日のチェックリスト（未完了件数バッジ付き）
// - 最近の類災事例（注意喚起）
// - クイックリスク評価ボタン
```

#### 3-B. ナレッジページに検索を統合

現在の `/knowledge/search` は独立ページだが、`/knowledge` のページ上部に検索入力を常設する。
詳細なセマンティック検索が必要な場合のみ `/knowledge/search` に遷移。

ナビ上は「ナレッジ」1項目で、一覧と検索の両方をカバーする。

#### 3-C. AIチャットの入口整理

現在: ホーム画面の `ModeSelector` コンポーネント内でのみ事務/現場モードを選択可能。

提案: ボトムナビの「AIチャット」タップ時の動作:
- **デフォルト**: 直近で使ったモードを開く（localStorageで記憶）
- **初回 or 切り替え**: ページ上部にモード切り替えトグルを常設

```
/office-chat   -- 事務作業モード（既存）
/field-voice   -- 現場作業モード（既存）
```

ボトムナビからは `/office-chat` をデフォルトとし、ページ内でワンタップで `/field-voice` に切り替え可能にする。

---

### 4. ロールベース表示

AuthContextの既存ロール定義を活用する。

```javascript
// 既存の定義（AuthContext.jsx）
// roles: 'worker', 'expert', 'site_manager', 'admin'
// isAdmin: user?.role === 'admin'
// isSiteManager: user?.role === 'site_manager' || user?.role === 'admin'
// isExpert: user?.role === 'expert' || user?.role === 'site_manager' || user?.role === 'admin'
```

| 機能 | worker | expert | site_manager | admin |
|------|--------|--------|-------------|-------|
| ホーム | 表示 | 表示 | 表示 | 表示 |
| AIチャット（事務） | 表示 | 表示 | 表示 | 表示 |
| AIチャット（現場） | 表示 | 表示 | 表示 | 表示 |
| ナレッジ閲覧・検索 | 表示 | 表示 | 表示 | 表示 |
| ナレッジ登録 | -- | 表示 | 表示 | 表示 |
| 安全管理（チェックリスト） | 表示 | 表示 | 表示 | 表示 |
| 安全管理（類災事例） | 閲覧のみ | 表示 | 表示 | 表示 |
| 安全管理（リスク評価） | 表示 | 表示 | 表示 | 表示 |
| **分析ダッシュボード** | -- | -- | 表示 | 表示 |
| **現場管理** | -- | -- | 表示 | 表示 |
| **会話履歴（全員分）** | -- | -- | 表示 | 表示 |

**ボトムナビはロールによらず4項目固定**。管理者向け機能（分析・現場管理）はドロワーメニュー内に配置し、`isSiteManager` が `false` のユーザーには非表示とする。

---

### 5. 具体的な実装コード

#### 5-A. navItems 配列の再設計

```jsx
// Layout.jsx 内の navItems を以下に置き換え

// --- ボトムナビ用（モバイル: 全ユーザー共通 4項目） ---
const bottomNavItems = [
  { path: '/', label: 'ホーム', icon: <HiOutlineHome /> },
  { path: '/office-chat', label: 'AIチャット', icon: <HiOutlineChatAlt2 /> },
  { path: '/knowledge', label: 'ナレッジ', icon: <HiOutlineBookOpen /> },
  { path: '/safety', label: '安全管理', icon: <HiOutlineShieldCheck /> },
];

// --- デスクトップヘッダーナビ用（グルーピング） ---
const desktopNavItems = [
  { path: '/', label: 'ホーム', icon: <HiOutlineHome /> },
  {
    label: 'AIチャット',
    icon: <HiOutlineChatAlt2 />,
    children: [
      { path: '/office-chat', label: '事務作業モード', icon: <HiOutlineDesktopComputer /> },
      { path: '/field-voice', label: '現場作業モード', icon: <HiOutlineMicrophone /> },
    ],
  },
  {
    label: 'ナレッジ',
    icon: <HiOutlineBookOpen />,
    children: [
      { path: '/knowledge', label: 'ナレッジ一覧', icon: <HiOutlineBookOpen /> },
      { path: '/knowledge/search', label: 'ナレッジ検索', icon: <HiOutlineSearch /> },
      // isExpert の場合のみ表示
      { path: '/knowledge/new', label: 'ナレッジ登録', icon: <HiOutlinePlus />, requiredRole: 'expert' },
    ],
  },
  {
    label: '安全管理',
    icon: <HiOutlineShieldCheck />,
    children: [
      { path: '/checklists', label: 'チェックリスト', icon: <HiOutlineClipboardCheck /> },
      { path: '/incidents', label: '類災事例', icon: <HiOutlineExclamation /> },
      { path: '/risk-assessment', label: 'リスク評価', icon: <HiOutlineShieldCheck /> },
    ],
  },
];

// --- 管理者メニュー（ドロワー内、isSiteManager のみ表示） ---
const adminNavItems = [
  { path: '/analytics', label: '分析ダッシュボード', icon: <HiOutlineChartBar /> },
  { path: '/sites', label: '現場管理', icon: <HiOutlineOfficeBuilding /> },
  { path: '/sessions', label: '会話履歴', icon: <HiOutlineChatAlt2 /> },
];
```

#### 5-B. ボトムナビのレンダリング変更

```jsx
// Layout.jsx: BottomNav 部分を変更

// Before（8項目全部表示）:
<BottomNav>
  {navItems.map(item => (
    <BottomNavItem key={item.path} to={item.path} $active={isActive(item.path)}>
      <BottomNavIcon>{item.icon}</BottomNavIcon>
      {item.label}
    </BottomNavItem>
  ))}
</BottomNav>

// After（4項目のみ）:
<BottomNav>
  {bottomNavItems.map(item => (
    <BottomNavItem key={item.path} to={item.path} $active={isActive(item.path)}>
      <BottomNavIcon>{item.icon}</BottomNavIcon>
      {item.label}
    </BottomNavItem>
  ))}
</BottomNav>
```

#### 5-C. isActive 関数の修正

```jsx
// 安全管理ハブのアクティブ判定を追加
const isActive = (path) => {
  if (path === '/') return location.pathname === '/';
  // /safety は /checklists, /incidents, /risk-assessment もカバー
  if (path === '/safety') {
    return ['/safety', '/checklists', '/incidents', '/risk-assessment'].some(
      p => location.pathname.startsWith(p)
    );
  }
  // AIチャットは /office-chat, /field-voice 両方をカバー
  if (path === '/office-chat') {
    return location.pathname === '/office-chat' || location.pathname === '/field-voice';
  }
  return location.pathname.startsWith(path);
};
```

#### 5-D. モバイルドロワーの再構成

```jsx
// MobileDrawer 内のナビリンク部分を以下に変更

<MobileNavLinks>
  {/* メイン機能 */}
  <MobileNavSectionLabel>メイン</MobileNavSectionLabel>
  <MobileNavLink to="/" $active={isActive('/')} onClick={closeMobileMenu}>
    <span style={{ fontSize: '1.3rem', display: 'flex' }}><HiOutlineHome /></span>
    ホーム
  </MobileNavLink>
  <MobileNavLink to="/office-chat" $active={location.pathname === '/office-chat'} onClick={closeMobileMenu}>
    <span style={{ fontSize: '1.3rem', display: 'flex' }}><HiOutlineDesktopComputer /></span>
    事務作業モード
  </MobileNavLink>
  <MobileNavLink to="/field-voice" $active={location.pathname === '/field-voice'} onClick={closeMobileMenu}>
    <span style={{ fontSize: '1.3rem', display: 'flex' }}><HiOutlineMicrophone /></span>
    現場作業モード
  </MobileNavLink>

  {/* ナレッジ */}
  <MobileNavSectionLabel>ナレッジ</MobileNavSectionLabel>
  <MobileNavLink to="/knowledge" $active={isActive('/knowledge')} onClick={closeMobileMenu}>
    <span style={{ fontSize: '1.3rem', display: 'flex' }}><HiOutlineBookOpen /></span>
    ナレッジ一覧
  </MobileNavLink>
  <MobileNavLink to="/knowledge/search" $active={isActive('/knowledge/search')} onClick={closeMobileMenu}>
    <span style={{ fontSize: '1.3rem', display: 'flex' }}><HiOutlineSearch /></span>
    ナレッジ検索
  </MobileNavLink>

  {/* 安全管理 */}
  <MobileNavSectionLabel>安全管理</MobileNavSectionLabel>
  <MobileNavLink to="/checklists" $active={isActive('/checklists')} onClick={closeMobileMenu}>
    <span style={{ fontSize: '1.3rem', display: 'flex' }}><HiOutlineClipboardCheck /></span>
    チェックリスト
  </MobileNavLink>
  <MobileNavLink to="/incidents" $active={isActive('/incidents')} onClick={closeMobileMenu}>
    <span style={{ fontSize: '1.3rem', display: 'flex' }}><HiOutlineExclamation /></span>
    類災事例
  </MobileNavLink>
  <MobileNavLink to="/risk-assessment" $active={isActive('/risk-assessment')} onClick={closeMobileMenu}>
    <span style={{ fontSize: '1.3rem', display: 'flex' }}><HiOutlineShieldCheck /></span>
    リスク評価
  </MobileNavLink>

  {/* 管理者メニュー -- isSiteManager の場合のみ */}
  {isSiteManager && (
    <>
      <MobileNavSectionLabel>管理</MobileNavSectionLabel>
      <MobileNavLink to="/analytics" $active={isActive('/analytics')} onClick={closeMobileMenu}>
        <span style={{ fontSize: '1.3rem', display: 'flex' }}><HiOutlineChartBar /></span>
        分析ダッシュボード
      </MobileNavLink>
      <MobileNavLink to="/sites" $active={isActive('/sites')} onClick={closeMobileMenu}>
        <span style={{ fontSize: '1.3rem', display: 'flex' }}><HiOutlineOfficeBuilding /></span>
        現場管理
      </MobileNavLink>
      <MobileNavLink to="/sessions" $active={isActive('/sessions')} onClick={closeMobileMenu}>
        <span style={{ fontSize: '1.3rem', display: 'flex' }}><HiOutlineChatAlt2 /></span>
        会話履歴
      </MobileNavLink>
    </>
  )}
</MobileNavLinks>
```

#### 5-E. MobileNavSectionLabel（新規スタイルコンポーネント）

```jsx
const MobileNavSectionLabel = styled.div`
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: var(--space-4) var(--space-4) var(--space-1) var(--space-4);
  margin-top: var(--space-2);

  &:first-of-type {
    margin-top: 0;
  }
`;
```

---

### 6. ルーティングの変更（App.jsx）

```jsx
// 追加するインポート
import SafetyHubPage from './pages/SafetyHubPage';

// Routes 内に追加
<Route path="/safety" element={<SafetyHubPage />} />
```

既存のルーティング（`/checklists`, `/incidents`, `/risk-assessment`）はそのまま維持する。`/safety` は新規ハブページで、各機能への入口を提供するだけ。

---

### 7. SafetyHubPage の実装概要

```jsx
// pages/SafetyHubPage.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
import {
  HiOutlineClipboardCheck,
  HiOutlineExclamation,
  HiOutlineShieldCheck,
  HiOutlineChevronRight,
} from 'react-icons/hi';

const SafetyHubPage = () => {
  const navigate = useNavigate();

  const sections = [
    {
      title: 'チェックリスト',
      description: '日常点検・安全確認を実施',
      icon: <HiOutlineClipboardCheck />,
      path: '/checklists',
      color: '#2563eb',
      bg: '#dbeafe',
    },
    {
      title: '類災事例',
      description: '過去の事故・ヒヤリハットを確認',
      icon: <HiOutlineExclamation />,
      path: '/incidents',
      color: '#dc2626',
      bg: '#fee2e2',
    },
    {
      title: 'リスク評価',
      description: 'AIで作業リスクを評価',
      icon: <HiOutlineShieldCheck />,
      path: '/risk-assessment',
      color: '#16a34a',
      bg: '#dcfce7',
    },
  ];

  return (
    <Container>
      <PageTitle>安全管理</PageTitle>
      <PageSubtitle>安全に関する機能をまとめて管理します</PageSubtitle>
      <CardGrid>
        {sections.map(section => (
          <HubCard key={section.path} onClick={() => navigate(section.path)}>
            <HubCardIcon style={{ background: section.bg, color: section.color }}>
              {section.icon}
            </HubCardIcon>
            <HubCardContent>
              <HubCardTitle>{section.title}</HubCardTitle>
              <HubCardDesc>{section.description}</HubCardDesc>
            </HubCardContent>
            <HiOutlineChevronRight />
          </HubCard>
        ))}
      </CardGrid>
    </Container>
  );
};
```

---

### 8. 移行計画

#### Phase 1（即時対応 -- Layout.jsx のみ変更）

1. `bottomNavItems` を4項目に絞り、`BottomNav` で使用する
2. `MobileDrawer` 内をセクションラベル付きグルーピングに変更
3. 管理者メニューを `isSiteManager` で条件表示にする
4. `isActive` 関数を修正する

変更ファイル: `Layout.jsx` のみ。**既存ルーティングは一切変更不要。**

#### Phase 2（安全管理ハブ追加）

1. `SafetyHubPage.jsx` を新規作成
2. `App.jsx` に `/safety` ルートを追加
3. ボトムナビの「安全管理」の遷移先を `/safety` に設定

変更ファイル: `SafetyHubPage.jsx`（新規）、`App.jsx`、`Layout.jsx`

#### Phase 3（デスクトップサイドバー化 -- オプション）

1. `Layout.jsx` を大幅改修し、768px以上で左サイドバーレイアウトに切り替え
2. `desktopNavItems` のドロップダウン or ツリー構造を実装

---

### 9. 視覚的な比較

```
=== Before（現在） ===

モバイルボトムナビ:
┌────┬────┬────┬────┬────┬────┬────┬────┐
│ホーム│ナレッジ│ 検索 │ 分析 │類災 │チェック│リスク│現場 │  <-- 8項目。タップ面積 極小
└────┴────┴────┴────┴────┴────┴────┴────┘

=== After（提案） ===

モバイルボトムナビ:
┌──────────┬──────────┬──────────┬──────────┐
│  ホーム   │ AIチャット │ ナレッジ  │ 安全管理  │  <-- 4項目。各アイテム幅 約93px
└──────────┴──────────┴──────────┴──────────┘
                                                   タップ領域が約2倍に拡大
```

---

### 10. アクセシビリティ考慮

- ボトムナビの各アイテムに `aria-label` を付与
- アクティブ状態を `aria-current="page"` で表現
- 管理者メニューは `role="group"` と `aria-label="管理者メニュー"` でグルーピング
- カラーだけでなくアイコン形状でもアクティブ状態を判別可能にする（既存の上部バー表示を維持）
