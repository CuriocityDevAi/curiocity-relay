---
round: M1-1104-A
pr:
  fork: agilo-medusa-pos-fork#17 (pos-m1 worktree)
  fork_url: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/17
  fork_commit: bb35a2f43ca6f53e5f0dabb7cebc0868c5305074
outcome: Shop URL 입력 제거 · 서버 상수화 · 옛 URL 저장 기기 자동 마이그레이션 · 로그인 2-필드화
kyu_checks: 2 (칸 없음 · 기존 설치 재로그인 안내 1회)
---

# M1-1104-A · Meros POS 로그인 Shop URL 제거 · api.meros.id 상수 고정

**일자**: 2026-11-04 · **허브**: M1 (신설) · **작업 디렉토리**: `pos-m1` · **리포지토리**: `agilo-medusa-pos-fork` (브랜치 `feat/m1-1104-a-fixed-server`) · **선행 승인**: M0-1104-G 계획 C (11-04 오케).

---

## 0. 원문 (Kyu 11-03)

Meros POS 로그인에서 Shop URL 칸 제거 · 서버 주소는 앱 상수 `https://api.meros.id` 고정 · 로그인은 이메일·비번만. 옛 주소가 저장된 기기(아이패드)는 토큰이 안 맞으므로 자동 정리 + "서버 주소가 바뀌어 다시 로그인해 주세요" 안내 1회.

---

## 1. 산출물 (허용 주인 파일 5 + 보조)

| 파일 | 변경 | 비고 |
|------|------|------|
| `constants/api.ts` | **신규** | `MEROS_API_URL = 'https://api.meros.id'`. `__DEV__` + `EXPO_PUBLIC_API_URL` 분기 1 곳. 프로덕션은 env 무시. |
| `app/login.tsx` | 재작성 | Shop URL TextField 삭제 · zod `medusaUrl` 삭제 · `validateShopUrl` + URL BottomSheet UX 삭제 · 기억 UI 는 email flat list 로 축소. |
| `contexts/auth.tsx` | 수정 | `login(email, password)` 2-인자화 · 모든 `baseUrl` = `MEROS_API_URL` · `loadAuthState` 초입에 **마이그레이션 블록**: 저장 URL ≠ 상수면 `STALE_URL_CLEAR_KEYS` 6개 atomic clear + 상수로 덮어쓰기 + 토스트 1회. |
| `contexts/settings.tsx` | 2-line | `state.medusaUrl` → `MEROS_API_URL` (SDK baseUrl 단일 출처). |
| `utils/loginRemember.ts` | 재작성 | 스키마를 `{ emails, lastUsed }` 로 축소. 레거시 `{ urls, emailsByUrl, lastUsed:{url,email} }` 는 `migrate()` 로 flat 화 (zero-touch 승격). `removeRememberedUrl` 삭제. |
| `README.md` | 1-line | "Secure Authentication" 항목에 "server is fixed to https://api.meros.id" 명시. |
| `scripts/m1-1104-a-assertions.mjs` | **신규** | 로직 어설션 44 건. |
| `scripts/m1-1104-a-playwright.mjs` | **신규** | Expo 웹 실기동 어설션 9 건. |
| `docs/M1-1104-A-login-no-shop-url.png` | **신규** | 로그인 화면 스샷 (MEROS 로고 + Email + Password + Sign In). |

**금지 영역 미건드림** (확인): `package.json`, `app/_layout.tsx`, `components/setup-wizard/**`, `components/Product*` 전부 untouched. `package-lock.json` 은 사전부터 비커밋 상태로 존재한 name 변경 (`medusa-pos` → `meros-pos`) 이라 이번 라운드 커밋에서 제외.

### STALE_URL_CLEAR_KEYS (순서 고정)
```
apiKey · userEmail · sales_channel_id · stock_location_id · region_id · draft_order_id
```
→ 지시 명시 그대로 6 개 · atomic.

### `loginRemember` URL 필드 폐기
- 신 스키마: `{ emails: string[]; lastUsed?: string }` · MAX 10.
- 레거시 `v1` 로드 → `migrate()` 가 `emailsByUrl` 의 모든 리스트를 flat + dedup, `lastUsed.email` 만 보존. 다음 save 시 신 shape 로 overwrite.
- SecureStore key 는 동일 (`meros.loginRemember.v1`) → 사용자 migration 액션 없음.

---

## 2. 검증 (돌려본 로그 전원 pass)

### TypeScript
```
$ npx tsc --noEmit  → exit 1 (총 에러 1건)
app/_layout.tsx(4,8): error TS2882: Cannot find module or type declarations for side-effect import of '../global.css'.
```
**이 1 건은 master `cd09eef` 동일 재현** (stash 확인) · 이번 라운드와 무관한 pre-existing. 본 라운드 신규 에러 **0 건**.

### 로직 어설션 44/44 pass
```
$ node scripts/m1-1104-a-assertions.mjs
--- (1) 코드 shape (회귀 가드) ---                           ✓ 24건
--- (2) 마이그레이션 모의 (옛 URL → clear 전부 호출) ---     ✓ 5건
--- (2b) 상수 URL 저장 → migrate skip ---                   ✓ 2건
--- (2c) 빈 store → migrate 미실행 (clean install) ---      ✓ 1건
--- (3) loginRemember v1 레거시 → email flat list ---       ✓ 4건
--- (4) constants/api.ts 분기 ---                            ✓ 5건
--- (실 이름) STALE_URL_CLEAR_KEYS 키 6개 모두 그대로 ---    ✓ 3건
44/44 passed · 0 failed
```

핵심 어설션 요지:
- **(2)** mock SecureStore 에 옛 URL + 종속 키 7 개 심음 → 마이그레이션 블록 실행 → 지시한 6 키 모두 `deleteItemAsync` 호출됨 + `medusaUrl` 상수 갱신 + 토스트 1 회.
- **(2b)** 이미 상수 URL 저장 기기 → clear 호출 0 · `apiKey` 유지 (재로그인 재요구 없음).
- **(2c)** 신규 설치 (`medusaUrl` 자체 없음) → migrate 분기 자체 skip.
- **(3)** 레거시 v1 레코드 `{ urls, emailsByUrl: { 'old.example.com': ['kyu@…', 'admin@…'], 'api.meros.id': ['kyu@…'] } }` → flat `['admin@…','kyu@…']` + `lastUsed='kyu@…'`.
- **(4)** `__DEV__=false` 분기 — `EXPO_PUBLIC_API_URL` 있어도 상수 반환. `__DEV__=true` + env 있음 → env 적용 + 끝 슬래시 제거.

### M0 기존 어설션 회귀 검사
```
$ node scripts/m0-1104-a-assertions.mjs  → 15/15 passed · 0 failed
```
(auth.tsx `safeGetSecureItem` 래퍼 · `AuthedBootstrap` 조건부 렌더 · useRef 1회성 전부 그대로)

### Expo 웹 Playwright 9/9 pass (상시 체크 + Shop URL 삭제 어설션)
```
$ npx expo export -p web --output-dir dist   → 3 bundles · 29 routes
$ node scripts/m1-1104-a-playwright.mjs
--- (1) 미인증 상태 index.html 로드 → crash 없음 ---     ✓ pageerror 0건
--- (2) 로그인 화면 DOM 도달 ---                          ✓ email · password · Sign In 모두 존재
--- (3) Shop URL 필드 부재 (M1-1104-A 제거 어설션) ---    ✓ testID 0 · placeholder 0 · 본문 "shop url" 0
--- (4) Meros 로고 렌더 ---                               ✓ SVG 존재
--- (5) 콘솔 error 총 수 ---                              ✓ 0건
9/9 passed · 0 failed
```

**스샷** (`docs/M1-1104-A-login-no-shop-url.png`): MEROS 로고 + "POS" · **Email Address** · **Password** · **Sign In**. Shop URL 칸 완전 부재.

---

## 3. Kyu 아이패드 실기 체크 (쉬운 말)

| # | 체크 | 쉬운 말 |
|---|------|--------|
| ① | **migration-toast-once** | 아이패드 Expo Go 기존 설치에서 앱 켜기 → "서버 주소가 바뀌어 다시 로그인해 주세요" 안내 토스트 1 회 뜨고, 바로 이메일·비번 입력해서 재로그인 성공. |
| ② | **shop-url-absent** | 로그인 화면에 Shop URL 칸 없음. Email Address + Password + Sign In 세 개만. (clean install 기기에서도 동일) |

재로그인 후 상품 Add to cart → 카트 담김까지 되면 전 라운드 (M0-1103-D) 흐름도 안 깨짐 확인. **별도 Kyu 액션 없음** — 저장소는 앱이 자동 정리.

---

## 4. 규약 정합

| 규약 | 정합 |
|------|------|
| 허용 주인 파일만 수정 (M0-1104-G 계획 C) | ✓ (5 신규/수정 · 금지 영역 0 건) |
| 서버 주소 상수화 + `__DEV__` 전용 override | ✓ (`constants/api.ts`) |
| 로그인 2-필드화 (email+password) | ✓ (`app/login.tsx` zod + Form) |
| 마이그레이션 atomic clear + 토스트 1회 | ✓ (`contexts/auth.tsx` `loadAuthState` 초입) |
| `loginRemember` URL 필드 폐기 + 레거시 호환 | ✓ (`utils/loginRemember.ts migrate`) |
| README 로그인 절 1 줄 갱신 | ✓ (Features 항목) |
| 어설션 (옛 URL 저장 → clear 호출 검증) | ✓ (단위 5건 · 2b/2c 보강) |
| Playwright Expo 웹 실기동 · Shop URL 칸 부재 어설션 · console.error 0 | ✓ (9/9 pass) |
| TypeScript 신규 에러 0 | ✓ (pre-existing global.css 외 변화 없음) |
| 커밋 메시지 `!` 미사용 | 커밋 시 준수 예정 (PR 시 확인) |
| docs: README 로그인 절만 갱신 (별도 doc 없음) | ✓ |

---

## 5. 이연 순증감

| 카테고리 | 수 |
|---------|----|
| 해소 | +1 (옛 URL 저장 기기 401 위험 — M0-1104-G 위험 #1) |
| 보강 | +1 (Shop URL 부재 Playwright 어설션 상시화) |
| 등재 | +1 (M1 허브 신설 · hubs.json `m1` 섹션) |
| 미완 (Kyu 도장) | 2 |
| **총 순증감** | **+1 해소 · +1 보강 · 도장 2건 시 -1** |

---

## 6. 다음 게이트

1. **PR 발의 (fork)**: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/17 — `feat/m1-1104-a-fixed-server` → `master`. 베이스 `cd09eef` (M0-1104-A). 본문에 Kyu 실기 2 항목 (migration-toast-once · shop-url-absent) 체크박스.
2. **Kyu 아이패드 실기**: 기존 설치 재로그인 + 칸 부재 2 체크 확진.
3. **후속 M1-1104-B (예정)**: M0-1104-G 계획 D — 1 매장 자동 선택 (`components/setup-wizard/StockLocationSelectionStep.tsx` · `SetupWizardContent.tsx`). 본 라운드 머지 후 착수 (auth 재진입 가드 변경 흡수).
4. **M0-1104-G 지연 K (다중 매장 RBAC)** 는 "2+ 매장 계정" 트리거 전까지 대기.

---

*M1-1104-A · 2026-11-04 · Shop URL 제거 + 서버 상수화 · fork `feat/m1-1104-a-fixed-server` · 어설션 44/44 + Playwright 9/9 + M0 회귀 15/15 pass · kyu_checks 2 · 이연 -1 (도장 시)*
