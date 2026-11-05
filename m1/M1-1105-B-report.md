---
round: M1-1105-B
pr:
  fork: agilo-medusa-pos-fork#25
  fork_url: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/25
  fork_commit: e65043d
outcome: expo-secure-store 웹 폴리필 우회 (localStorage 폴백) + 상시 ⓐ 기본 E2E 하네스 신설 · 네이티브 동작 변화 0
kyu_checks: 0 (네이티브 영향 0 · Kyu 실기 선택)
---

# M1-1105-B · Web SecureStore 폴백 + 상시 ⓐ 기본 E2E 하네스

**일자**: 2026-11-05 · **허브**: M1 · **작업 디렉토리**: `pos-m1` · **리포지토리**: `agilo-medusa-pos-fork` (브랜치 `fix/m1-1105-b-web-secure-store` · base `0515209` master) · **승인**: 사전 "커밋·push·PR 승인 없이 바로".

---

## 0. 원문 (Kyu 11-05)

Expo SDK 58 웹에서 `expo-secure-store` 폴리필이 빈 객체라 `setItemAsync` TypeError → 웹 로그인 불가 → 모든 앱 PR 의 Playwright 가 로그인 화면에서 멈춤. 웹일 때만 localStorage 로 폴백하는 얇은 래퍼를 넣어 **웹 로그인 → 상품 화면 도달** E2E 를 열어라.

## 1. 뿌리 (문서화 재확인)

- `node_modules/expo-secure-store/build/ExpoSecureStore.web.js` = `export default {};`
- 결과: `getValueWithKeyAsync` / `setValueWithKeyAsync` / `deleteValueWithKeyAsync` 가 모두 undefined.
- 소비처 호출 체인: `SecureStore.setItemAsync` → `ExpoSecureStore.setValueWithKeyAsync(...)` → **TypeError**.
- `contexts/auth.tsx` 는 init path 에서 `safeGetSecureItem`/`safeDeleteSecureItem` 래퍼로 TypeError 삼켰지만 (M0-1104-A), **로그인 경로** 의 `setItemAsync` 는 safe 래퍼 없이 직접 호출 → 로그인 처리 중 throw → 로그인 실패.
- 이 결함을 M0-1104-A 와 M1-1105-A 보고가 "웹 E2E 한계" 로 두 번 기록 · 이번 라운드가 완전 해소.

## 2. 산출물 (신규 4 + import 1줄 치환 4 · 금지 영역 0)

| 파일 | 변경 | 비고 |
|------|------|------|
| `lib/secure-storage.ts` | **신규** | `Platform.OS === 'web'` 분기로 `window.localStorage` (prefix `meros.secureStorage.v1.`) 폴백 · 그 외는 `expo-secure-store` 를 그대로 재노출. API 서명 동일 (`getItemAsync` / `setItemAsync` / `deleteItemAsync` / `isAvailableAsync`). |
| `contexts/auth.tsx` | import 1줄 | `expo-secure-store` → `@/lib/secure-storage`. 본문/로직/safe 래퍼 전부 유지. |
| `contexts/settings.tsx` | import 1줄 | 동상. |
| `utils/loginRemember.ts` | import 1줄 | 동상. |
| `api/hooks/draft-orders.tsx` | import 1줄 | 동상. |
| `scripts/m1-1105-b-playwright.mjs` | **신규** | 상시 ⓐ 기본 E2E — Medusa mock (login/me/sales-channels/regions/stock-locations/products) + CORS + testID 기반 상품 2 카드 어설션 + "Maximum update depth" 0 + console.error 0. |
| `docs/testing/web-e2e.md` | **신규** | 하네스 공식 문서 (실행법 · mock contract · 어설션 규약 · 한계 · 변경 소유). |
| `docs/M1-1105-B-products-reached.png` | **신규** | 상품 그리드 도달 스샷 (Kopi Tubruk Rp 25,000 + Teh Tarik Rp 18,000 · "매장 자동 선택 매장: Jakarta 본점" 토스트 가시). |

**금지 영역 미건드림** (확인): `app/**`, `components/**` 전부 untouched (#22·#23 충돌 회피). `lib/printer/ble.ts` (M2-owned) 는 로그인/wizard/products 플로에서 호출되지 않아 미치환 — M2 PR 에서 처리 권장.

### 네이티브 동작 변화 0 증명
```ts
export const setItemAsync = async (key, value, options) => {
  if (Platform.OS === 'web') return webSet(key, value);
  return ExpoSecureStore.setItemAsync(key, value, options);
};
```
iOS/Android 경로는 `ExpoSecureStore.<method>` 를 **그대로** 호출 · 반환값/에러/옵션 그대로 보존.

### 소비처 import 치환 전/후
```ts
// 변경 전 (4 파일 공통)
import * as SecureStore from 'expo-secure-store';
// 변경 후
import * as SecureStore from '@/lib/secure-storage';
```
본문은 손대지 않음 — 함수 시그니처 동일.

---

## 3. 검증 (돌려본 로그 전원 pass)

### TypeScript
```
$ npx tsc --noEmit  → exit 1 (총 1건)
app/_layout.tsx(6,8): TS2882 (global.css · pre-existing · master 동일 재현)
```
신규 에러 **0 건**.

### 상시 ⓐ Expo 웹 Playwright (신규 하네스) — 6/6 pass
```
$ rm -rf dist && npx expo export -p web --output-dir dist   → 3 bundles · 29 routes
$ node scripts/m1-1105-b-playwright.mjs
serving /Users/kyu.lee/projects/pos-m1/dist on :9414

--- (1) 로그인 플로 ---                                   ✓ /login 이탈
--- (2) setup wizard — sales channel + region 통과 ---
--- (3) stock location 자동 선택 + /products 도달 ---     current url: /products
--- (4) 상품 그리드 어설션 ---                            ✓ Kopi Tubruk · ✓ Teh Tarik
--- (5) 에러 수집 ---                                     ✓ Max depth 0 · console.error (신규) 0 · pageerror (신규) 0
  api calls: 19 · console.error 전체: 0 · pageerror 전체: 1 (pre-existing React #418 필터)

6/6 passed · 0 failed
```

**스샷** (`docs/M1-1105-B-products-reached.png`): RegisterBadge "Closed · Jakarta 본점 · Tap to open" · Search bar · 상품 카드 2개 · 하단 탭 네비게이션 · 토스트.

### 왜 base master 에서도 통과하는가 (M1-1105-A 미적용인데)
웹 Playwright 환경에서는 iPad 네이티브의 Keychain + Stack.Protected guard flip timing 이 만드는 플랫폼 고유 race (M1-1105-A 뿌리 ②) 가 재현되지 않음. 웹 localStorage 는 동기적으로 반환하는 성격이라 "settings refetch 대기 창" 이 사실상 사라져 loop 가 발화하지 않음. **M1-1105-A 수정은 iPad 네이티브 정합성 유지를 위해 별건으로 필요**. 이 PR 는 하네스만 열고 M1-1105-A 와 **독립** 머지 가능.

---

## 4. Kyu 아이패드 실기 체크 (선택적)

네이티브 동작 변화 **0** · 기존 플로 그대로. 다음만 가볍게 확인:
- [ ] 아이패드 로그인 → 상품 화면 정상 (M1-1104-A/B · M1-1105-A 와 동일)
- [ ] (CI 측면) 머지 후 다른 앱 PR 의 상시 ⓐ Playwright 가 `/login` 이상을 검증할 수 있음

---

## 5. 규약 정합

| 규약 | 정합 |
|------|------|
| 허용 주인 파일 (lib/secure-storage.ts · contexts/auth.tsx import) | ✓ · 추가로 settings/loginRemember/draft-orders import 1줄씩 (E2E 가 끝까지 성공하려면 필요) |
| 금지 영역 (app/**, components/**) 미건드림 — #22·#23 충돌 회피 | ✓ |
| 네이티브 동작 변화 0 | ✓ · 웹 분기만 추가 · iOS/Android 는 ExpoSecureStore 그대로 호출 |
| 상시 ⓐ 기본 하네스 E2E (로그인 → 상품 그리드 2개 · Max depth 0 · console.error 0) | ✓ (6/6 pass) |
| docs/testing/web-e2e.md 에 "모든 앱 PR 상시 ⓐ 기본 하네스" 등록 | ✓ |
| PR 본문에 Playwright 로그 + 스샷 | ✓ |
| 커밋 메시지 `!` 미사용 | ✓ |

---

## 6. 이연 순증감

| 카테고리 | 수 |
|---------|----|
| 해소 | +1 (M0-1104-A · M1-1105-A 반복 기록된 "웹 E2E 한계") |
| 보강 | +2 (상시 ⓐ 기본 하네스 확립 · docs/testing 신설) |
| 등재 | +1 (M2 소유 `lib/printer/ble.ts` import 치환 — 결제/프린터 플로 E2E 확장 시 필요 · M2 PR 에서 처리 권장) |
| 미완 (Kyu 도장) | 선택 (네이티브 영향 0) |
| **총 순증감** | **+1 해소 · +2 보강 · +1 등재** |

---

## 7. 다음 게이트

1. **PR**: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/25 — 셀프 머지 가능 (네이티브 영향 0).
2. **M1-1105-A PR #23** 는 iPad 네이티브 wizard loop 정합성 유지 목적으로 별도 머지 필요 (본 PR 과 독립).
3. **다른 앱 PR** 은 이 하네스를 상시 ⓐ 로 사용 · `docs/testing/web-e2e.md` 참조.
4. **M2-owned `lib/printer/ble.ts`** 는 결제/프린터 E2E 확장 시 M2 PR 에서 import 치환 (1줄).
5. **React #418 (SSG hydration) flag** 는 계속 유지 · 별건 추적.

---

*M1-1105-B · 2026-11-05 · 웹 SecureStore 폴백 + E2E 하네스 신설 · fork PR #25 · Playwright 6/6 pass · 네이티브 영향 0 · kyu_checks 선택*
