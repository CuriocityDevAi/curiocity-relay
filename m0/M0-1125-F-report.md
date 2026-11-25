# M0-1125-F · PASS

**PR**: https://github.com/CuriocityDevAi/storeport/pull/430
**브랜치**: `feat/M0-1125-F-pos-settings-folder-tab`
**원장**: `curiocity-relay/ledger/decision-admin-pos-settings-20261125.md` R1 · R2
**워크트리**: `~/curiocity-live/storeport-wts/M0-1125-F-wt`
**HEAD**: `19c3fe3`

---

## 반영 내용

### R1 — 탭 한 몸 (폴더 탭) · `apps/commerce-core/src/admin/routes/pos-settings/page.tsx`

- `Tabs.List` + 5 `Tabs.Content` 전체를 하나의 패널 상자(`bg-ui-bg-component` · `border border-t-0` · `rounded-b-md`)로 감쌌다.
- 활성 탭 = 패널과 같은 bg 토큰 + 상단 2px `border-t-ui-fg-interactive` accent + `:after` 1px overlay 로 하단 경계선 cut (탭이 패널로 열림).
- 비활성 탭 = `bg-ui-bg-subtle` (패널보다 옅은 muted).
- Medusa UI semantic 토큰만 사용 — raw hex 없음 → 라이트/다크 둘 다.
- Radix 의 `role=tablist`/`role=tab`/`role=tabpanel` · `aria-selected` · `aria-controls` · ←/→ 키 이동 그대로.
- 새 testid 노출: `pos-settings-tabs-frame`, `pos-settings-tab-panel`.

### R2 — 닉네임 영숫자 + 주문번호 하이픈

공용 helper 한 곳 (`apps/commerce-core/src/modules/order_number/lib/format.ts`):

- `NICKNAME_REGEX = /^[A-Z][A-Z0-9]{1,3}$/` (첫 글자 영문 필수 · 숫자로 시작 불가).
- `NICKNAME_RULE_TEXT = "2–4 letters or digits, starting with a letter"` — Admin 모든 설명/에러 문구 단일 원천.
- `needsOrderNumberHyphen(nickname)` — 닉네임이 숫자로 끝나면 `true`.
- `formatOrderNumber` 가 하이픈을 삽입: `PIM3 + 2026-11 + 1000` → `PIM3-26B1000`. `PIM` 은 기존 `PIM26B1000` 그대로.

호출부 (서버·Admin):

- `src/modules/order_number/service.ts` setNickname 에러 메시지 갱신.
- `src/modules/order_number/lib/reserve.ts` → `NICKNAME_REGEX` import 그대로 → 새 regex 적용 (주문번호 발급 generateCustomDisplayIdImpl).
- `src/admin/routes/pos-settings/sections/NicknameEditor.tsx`: 설명 "2–4 letters or digits, starting with a letter" · 에러 토스트 · 자동 대문자 유지.
- `src/admin/routes/pos-settings/sections/OrderNumbersSection.tsx`: label · 설명문 · 에러 토스트 갱신 (Receipt 탭의 "Order number format" 미리보기도 자동 반영).

기존 발급분 보존:

- 이미 저장된 `custom_display_id` 값은 바꾸지 않는다 (마이그레이션 없음).
- 포맷팅은 발급 시점에만 적용 → `generateCustomDisplayId` 콜백이 DB atomic UPSERT 후 `formatOrderNumber` 로 문자열 생성.

### 영향 밖 (POS 앱 · 손님화면) — 수정 없음, 위치 보고

주문번호를 **parse** 하는 코드가 없고 opaque 문자열로 받아 그대로 렌더:

- `~/projects/agilo-medusa-pos-fork/app/checkout/success/[orderId].tsx:55-61`, `:153-159` — `orderQuery.data.order.custom_display_id` 를 receipt props 에 전달.
- `~/projects/agilo-medusa-pos-fork/app/orders/[orderId].tsx:483-485`, `:868-870`, `:878-880` — 긴 주문번호 표시·영수증 재인쇄.
- `~/projects/agilo-medusa-pos-fork/api/hooks/orders.ts:82` — fields 에 `+custom_display_id` 포함 (parse 없음).
- `apps/customer-display/src/screens/receipt-view.ts:7-9`, `:171-175` + `types/order-snapshot.ts:151`, `:181` — snapshot 의 `order_custom_display_id` 를 그대로 렌더.

위 어디에도 `[A-Z]{2,4}` 류의 regex parse 없음. M3 가 소유하는 리포에서 추후 parse 필요시 공용 helper 를 포팅하면 된다.

---

## 자기 검증

### 단위 테스트

`pnpm --filter commerce-core test` (silent · runInBand · 전체):

```
Test Suites: 60 passed, 60 total
Tests:       674 passed, 674 total
Snapshots:   18 passed, 18 total
```

신규 추가된 order_number 포맷 assertion (`src/modules/order_number/__tests__/format.unit.spec.ts`):

- `PIM 2026-11 start 1000 → PIM26B1000`
- `PIM3 → PIM3-26B1000` (하이픈 삽입)
- `P1A → P1A26B1000` (중간 숫자, 끝 영문 → 하이픈 없음)
- `A2 → A2-26B0001`
- `NICKNAME_REGEX` 매트릭스: `PIM`·`AB`·`ABCD`·`PIM3`·`P1`·`A123`·`A2B9` 허용 / `3PIM`·`1AB`·`P`·`ABCDE`·`""`·`pim`·`PI-M`·`PI M` 거절
- `needsOrderNumberHyphen` 공용 테스트

### 타입

`pnpm --filter commerce-core typecheck` → 에러 0.

### Lint · naming-check

- `pnpm --filter commerce-core lint` → 에러 0 (사전 warning 만).
- `bash scripts/naming-check.sh` → PASS (meros 매치 0).

### Playwright smoke

`npx playwright test --config playwright.smoke.config.ts --grep "POS Settings"` — 7/7 pass:

| # | spec | 결과 |
|---|------|------|
| 1 | 탭 5개 · Receipt 활성 · Advanced 섹션 | ✓ |
| 2 | General 탭 · 매장 선택 시 nickname 편집기 | ✓ |
| 3 | Receipt 탭 트리거 활성 강조 (shadow + 배경) | ✓ |
| 4 | **R1 폴더 탭 · 패널·토큰·ARIA 구조** | ✓ |
| 5 | **R1 폴더 탭 · ←/→ 방향키로 탭 이동** | ✓ |
| 6 | **R2 닉네임 영숫자 · PIM3 허용 · pim3 자동 대문자** | ✓ |
| 7 | **R2 닉네임 영숫자 · 3PIM 은 클라이언트 regex 로 거절** | ✓ |

스크린샷 (하니스는 Medusa UI CSS 미로드 → 구조/토큰 어설션 중심, 실 색상 확인은 PR 본문의 실기 체크):

- `screenshots/04-pos-settings-receipt.png` — Receipt 탭 전체
- `screenshots/04b-pos-settings-general-nickname.png` — General 탭 · 매장 선택 시 nickname 편집기
- `screenshots/04c-pos-settings-tab-highlight.png` — Receipt 탭 active highlight
- `screenshots/04d-pos-settings-folder-tab-structure.png` — R1 폴더 탭 구조

### Feature-map

- `node scripts/feature-map-check.mjs --diff ...` → `matched=7 unmatched=0`.
- processes: `commerce-core.order-number` (format.ts · service.ts · 테스트), `commerce-core.admin-customization` (admin pos-settings page · sections).
- admin-smoke.spec.ts 는 `commerce-core.pos-void-refund` (기존 패턴에 이미 등록).

---

## 변경 파일 (8)

- `apps/commerce-core/src/modules/order_number/lib/format.ts` (M) — 공용 helper · 하이픈 로직.
- `apps/commerce-core/src/modules/order_number/service.ts` (M) — setNickname 에러 메시지.
- `apps/commerce-core/src/modules/order_number/__tests__/format.unit.spec.ts` (M) — R2 assertion.
- `apps/commerce-core/src/admin/routes/pos-settings/page.tsx` (M) — R1 폴더 탭.
- `apps/commerce-core/src/admin/routes/pos-settings/sections/NicknameEditor.tsx` (M) — 공용 helper 사용.
- `apps/commerce-core/src/admin/routes/pos-settings/sections/OrderNumbersSection.tsx` (M) — 공용 helper 사용.
- `apps/commerce-core/e2e/admin/admin-smoke.spec.ts` (M) — R1·R2 Playwright assertion.
- `apps/commerce-core/.gitignore` (M) — e2e 리포트/스크린샷 artifact 제외.

## 기술 선택지 (PR 본문 3줄)

1. 폴더 탭 효과는 활성 탭의 `:after` 1px overlay 로 `Tabs.List` 하단 경계를 패널 bg 토큰으로 덮어 "열려 있는" 느낌을 낸다 — border 색 교체 대신 overlay 를 쓴 이유는 active/inactive 전환 때 border 두께 변화로 생기는 미세한 레이아웃 이동을 피하기 위함.
2. Nickname 규칙·에러·설명 문구는 `lib/format.ts` 한 곳(`NICKNAME_REGEX` · `NICKNAME_RULE_TEXT` · `needsOrderNumberHyphen`)에서만 노출 — 서버 검증·주문번호 포맷·Admin UI 세 곳이 어긋나지 않는다.
3. 하이픈 삽입은 포맷팅 단계에서만 적용 — 이미 저장된 `custom_display_id` 는 그대로 두고, parse 하는 다운스트림이 아직 없어 (POS fork · customer-display 모두 opaque 렌더) 이번 변경이 영향을 주지 않는다.

## 실기 체크 (PR 본문)

- admin.meros.id 시크릿 창 → POS Settings → 탭 전환 시 활성 탭이 아래 상자와 이어져 보이는지 (라이트/다크)
- 매장 선택 → General → Store nickname 에 `PIM3` 저장 성공 · `3PIM` 거절 · `pim3` → `PIM3` 자동 변환
- Receipt 탭 주문번호 예시 `PIM3-26B1000` 노출

## 미해결 · 다음

- (M3) `agilo-medusa-pos-fork` 쪽은 변경 없음. parse 코드 등장 시 공용 helper 포팅 필요.
- 원장 (`ledger/decision-admin-pos-settings-20261125.md`) R1·R2 상태 줄은 오케 소관 (허브 수정 금지).
