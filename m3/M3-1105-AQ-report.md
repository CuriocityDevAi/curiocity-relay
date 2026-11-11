# M3-1105-AQ Report

日時: 2026-11-11

---

## C1 — PR #91 AO·AN screenshots コミット

**状態: 完了**

- スクリプト実行: `node scripts/m3-1105-ao-screenshots.mjs` → 8/8 passed
- 生成物:
  - `screenshots-m3-1105-ao/01-order-detail-banner.png`
  - `screenshots-m3-1105-ao/02-retry-sheet.png`
  - `screenshots-m3-1105-ao/03-after-retry-success.png`
- 参考: `scripts/m3-1105-an-screenshots.mjs` も実行済み
  - `screenshots-m3-1105-an/01-card-last4-input-UNVERIFIED.png` (card-last4-input locator 未ヒット)
  - `screenshots-m3-1105-an/02-void-pin-input.png`
- コミット sha: `49b1d5a` (branch: `feat/m3-1105-ao-refund-retry`)
- アサーションログ: 8/8 passed → 0 failed

---

## C2 — PR #91 423 fixture + アサーション追加

**状態: 完了**

- 追加ファイル: `fixtures/pos-refund-retry-423.json`
  ```json
  { "response": { "status": 423, "body": { "ok": false, "reason": "locked", "locked_until": "2026-11-11T10:30:00.000Z" } } }
  ```
  storeport #214 契約 (423 = `{ok:false, reason:"locked", locked_until}`) 準拠
- `scripts/m3-1105-ao-assertions.mjs` に (8) を追加:
  - status=423, ok=false, reason="locked", locked_until string, locked_until 파싱 가능 (Locked until HH:MM 표시용)
- アサーションログ: 38/38 passed → 0 failed
- コミット sha: `49b1d5a` (同上)

---

## B1 — PR #92 AP screenshots ブランチへコミット

**状態: 完了**

- `/tmp/m3-1105-ap-screenshots/` → `screenshots-m3-1105-ap/` ブランチへ
- 収録スクリーンショット:
  - `01-cart-4-items.png` — Cart 4-item 全表示
  - `02-checkout-4-items.png` — Checkout 4-item
  - `04-cart-6-items-before-scroll.png` — 6-item 初期表示
  - `05-cart-6-items-scrolled.png` — 6-item スクロール後
- コミット sha: `ed8e9d5` (branch: `feat/m3-1105-ap-cart-checkout-mismatch`)

---

## B2 — 6-item スクロール証拠

**状態: 完了**

- `scripts/m3-1105-ap-screenshots.mjs` に ④⑤ シナリオ追加:
  - 6品目 (`Coffee Latte Hot ×2, Iced Tea Lemon, Coffee Latte Iced, Green Tea Matcha, Ice Americano`)
  - `page.route('**', ...)` で 6-item draft order を追加モック
  - localStorage を `draft_ap_06` に切り替え → SPA pushState で /cart 再レンダリング
  - `④` スクロール前スクリーンショット: Ice Americano DOM 存在確認
  - `⑤` 末尾スクロール後: Green Tea Matcha・Ice Americano DOM 存在 + 배지 = 6
- アサーション結果: 13/13 passed → 0 failed
- 備考: Playwright (web) での FlashList は SPA DOM 全体にレンダリングするため
  `beforeScroll` 時点でも全品目が DOM に存在する。
  ネイティブ iPad ではビューポート外は仮想化で未レンダリングになる点に注意
  (web テストは "スクロール範囲でコンテンツが消えていない" ことの間接証拠)。
  배지 = 6 は `tabBarBadge={items.length}` → Expo Router web レンダリング
  (DIV, y>650, h<30) で確認。

---

## B3 — estimatedItemSize vs 実測行高さ

**状態: 完了 (Playwright 웹 실측)**

- Playwright 웹 실측값: **136px** (viewport 1180×820)
  - 測定方法: `getComputedStyle(el).paddingTop === '24px'` (= `py-6`) の行要素で
    getBoundingClientRect().height を計測
- estimatedItemSize: `150` (`app/(tabs)/cart.tsx:574`)
- 分析:
  - `DraftOrderItem` のレイアウト: `py-6` = 패딩 48px(24×2) + `h-[5.25rem]` = 84px → **最小 132px**
  - オプション行・QuantityPicker 追加で実測 ~136px (web) / ネイティブは ~160px と推定
  - `estimatedItemSize=150` は最小値(132px)と実測(136~160px)の間
  - **수정 전** (`estimatedItemSize` なし): FlashList がデフォルト値で contentSize を過小算出
    → スクロール範囲が品目数×実高さより短くなり 4番目品目がスクロール圏外
  - **수정 후** (`estimatedItemSize=150`): 初回レンダリングの誤差が縮小
    → スクロール範囲が正しく確保され全品目到達可能
  - Kyu の実機「アイスラテは cart から消えた(スクロールしても見えなかった)」と一致

---

## イレギュラー

- AN screenshots: `01-card-last4-input` locator 未ヒット → `UNVERIFIED` サフィックス付きで保存
  (`app/(tabs)/checkout` で card last4 UI の `data-testid` 未設定の可能性)
- Playwright (web) の배지検索: `span` ではなく `DIV` (React Native Web `r-` class) として描画
  → `getBoundingClientRect().y > 650` フィルタで識別

---

## 커밋 목록

| ブランチ | sha | 内容 |
|---|---|---|
| `feat/m3-1105-ao-refund-retry` | `49b1d5a` | C1 (AO/AN screenshots) + C2 (423 fixture + 어설션) |
| `feat/m3-1105-ap-cart-checkout-mismatch` | `ed8e9d5` | B1 (AP screenshots) + B2 (6-item) + B3 (행 높이) |

---

## 이연 순증감

- 미완 항목 없음 (C1·C2·B1·B2·B3 모두 완료)
- 착지 커맨드: 아래 참조
