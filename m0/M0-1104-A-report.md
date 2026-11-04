---
round: M0-1104-A
pr:
  fork: agilo-medusa-pos-fork#13
outcome: bootstrap-crash-hotfix (M0-1103-D 회귀)
kyu_checks: 3
---

# M0-1104-A · 앱 기동 크래시 "User is not authenticated" 핫픽스

**일자**: 2026-11-04 · **허브**: M0 · **성격**: Kyu iPad 실기 전 차단. M0-1103-D 회귀.

---

## 0. 뿌리

Kyu 11-04 iPad Expo 기동 직후:
```
useMedusaSdk (contexts/auth.tsx:262)
  ← useBootstrapDraftOrderValidator (api/hooks/draft-orders.tsx:123)
  ← App (app/_layout.tsx:40)
```

`useBootstrapDraftOrderValidator` 가 App 최상단에서 무조건 `useMedusaSdk()` 호출 → `state.status !== 'authenticated'` 상태에서 throw → React 트리 전체 크래시 → 로그인 화면 못 봄.

M0-1103-D 핫픽스 적용 시 미인증 가드가 effect 내부에만 있었고 hook 호출 자체는 unconditional 이었음 → 인증 전엔 당연히 throw.

---

## 1. 산출물 (fork PR #13 · base master `acdf587` · 변경 최소)

| 파일 | 변경 |
|------|------|
| `api/hooks/draft-orders.tsx` | `useBootstrapDraftOrderValidator` hook → `AuthedBootstrap` React.FC 컴포넌트 (마운트돼야만 `useMedusaSdk` 호출) |
| `app/_layout.tsx` | 최상단 hook 삭제 · `{auth.state.status === 'authenticated' && <AuthedBootstrap />}` 조건부 렌더 |
| `contexts/auth.tsx` | `safeGetSecureItem`/`safeDeleteSecureItem` 래퍼 (Expo SDK 57 웹 폴리필 부재 가드) · init path 3곳 교체 · **네이티브 동일** |
| `scripts/m0-1104-a-assertions.mjs` | 로직 어설션 15건 |
| `scripts/m0-1104-a-playwright.mjs` | Expo 웹 실기동 어설션 (필수) 5건 |
| `docs/M0-1104-A-login-reached.png` | 로그인 화면 도달 스샷 |

**서버 변경 없음** · storeport PR 없음.

### contexts/auth.tsx 웹 가드 사유
Expo SDK 57 `expo-secure-store` 의 웹 impl = `export default {}` (완전 비어 있음) → `SecureStore.getItemAsync` 가 `getValueWithKeyAsync is not a function` TypeError. M0-1103-D 크래시가 먼저 터져 이 pre-existing 버그가 가려져 있었음. Playwright 요구 ("로그인 화면 도달 · console.error 0") 달성 위해 함께 처리. **iPad(네이티브) 영향 없음**.

---

## 2. 검증 (실행 로그 · 미실행 금지)

### 로직 어설션 15/15 pass
```
$ node scripts/m0-1104-a-assertions.mjs
--- (1) 코드 shape (회귀 가드) ---              ✓ 8건
--- (2) 미인증 상태 렌더 모의 ---                ✓ 3건
--- (3) useRef 1회성 ---                         ✓ 1건
--- (4) safe wrapper · TypeError only ---        ✓ 3건
15/15 passed · 0 failed
```

### Expo 웹 Playwright 5/5 pass (필수 체크 · 이번 라운드 강화)
```
$ node scripts/m0-1104-a-playwright.mjs
--- (1) 미인증 상태 index.html 로드 → crash 없음 ---
  ✓ pageerror 0건
  ✓ "User is not authenticated" console/page error 없음
--- (2) 로그인 화면 DOM 도달 ---
  ✓ 로그인 화면 요소 존재 (Sign In 텍스트)
--- (3) Meros 로고 렌더 ---
  ✓ Meros 로고 SVG 렌더
--- (4) 콘솔 error 총 수 ---
  ✓ console.error 0건
5/5 passed · 0 failed
```

**스샷** (`docs/M0-1104-A-login-reached.png`): MEROS 로고 + Shop URL/Email/Password 필드 + Sign In 버튼 전부 가시.

### 베이스라인 대비 (크래시 실증)
동일 Playwright 를 master `acdf587` 번들에 실행 → `pageerror: User is not authenticated` 재현 확인 → 본 fix 가 실제 크래시를 해소함 입증.

### TypeScript
```
$ npx tsc --noEmit  → exit 0
```

---

## 3. Kyu 아이패드 재실기 체크 (쉬운 말)

- **boot-no-crash**: iPad 앱 탭 → 빨간 크래시 화면 없이 부팅.
- **login-reach**: 스플래시 → 로그인 폼 (MEROS 로고 + Shop URL/Email/Password + Sign In) 가시.
- **post-login-add-cart**: 로그인 → 상품 Add to cart → 카트에 담김 (M0-1103-D stale 복구 함께 작동).

---

## 4. 규약 정합

| 규약 | 정합 |
|------|------|
| 코어 우회·전역 try/catch 금지 | ✓ (hook→컴포넌트 분리 · 조건부 마운트) |
| 변경 최소 (3 파일 + 어설션 2 + 스샷) | ✓ |
| 어설션 (미인증 render = throw 없음 · 인증 전환 = 1회 호출) | ✓ |
| Playwright Expo 웹 실기동 · 로그인 폼 도달 · console.error 0 (필수) | ✓ |
| 돌려본 로그 첨부 | ✓ (어설션 + Playwright + 스샷) |
| TypeScript 0 error | ✓ |
| 커밋 메시지 `!` 미사용 | ✓ |

---

## 5. 이연 순증감

| 카테고리 | 수 |
|---------|----|
| 해소 | +1 (M0-1103-D 부트 크래시 회귀) |
| 보강 | +1 (Playwright 실기동 체크 상시화) |
| 미완 (Kyu 실기) | 1 |
| **총 순증감** | **-1** (Kyu 도장 3건 시 -2) |

---

## 6. 다음 게이트

1. **PR #13 Kyu 리뷰 → 머지** → Kyu iPad 실기 재개 → M0-1103-B/C/D kyu_checks 확진.
2. **상시 Playwright**: M0 라운드 코드 변경 PR 마다 `scripts/m0-1104-a-playwright.mjs` 재사용 가능 (login reach + console.error 0).
3. **별건 M0-1104-B+**:
   - storeport "Meros Admin" (브라우저 탭 + 로고)
   - 유령 예약 §4 A/B/C Kyu 결정
   - Expo SDK 57 웹 SecureStore 폴리필 교체 (upstream issue 추적)

---

*M0-1104-A · 2026-11-04 · 부트 크래시 핫픽스 · fork PR #13 · 어설션 15/15 + Playwright 5/5 pass · kyu_checks 3 · 이연 -1 (Kyu 도장 시 -2)*
