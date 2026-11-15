# #268 APPROVE · #269 APPROVE · main CI 초록

## 0. main CI 상태 (최신 커밋 기준)

최신 run: `43685195064` (2026-11-15T06:23:11Z, feat M1-1105-CF push)

| job | 결과 |
|---|---|
| markers-and-forbidden | ✅ success |
| changes-filter | ✅ success |
| unit-commerce-core | ✅ success |
| docker-smoke-commerce-core | ⬜ skipped (paths-filter miss) |
| pos-integration | ⬜ skipped |
| docker-smoke-anchor | ⬜ skipped |
| docker-smoke-wing | ⬜ skipped |
| wrangler-check-care-agent | ⬜ skipped |

**결론: 초록 (실행 job 전부 success, skip은 paths-filter 미해당)**

이전 run `43685189901` 은 cancelled (7s) — 중복 push 자동 취소, 무관.

---

## 1. #268 리뷰 · M3-1105-CL G2 Receipt+Done + 상태 머신 A~I

### 변경 파일
```
apps/customer-display/app/done.tsx             (신규)
apps/customer-display/app/receipt.tsx          (신규)
apps/customer-display/app/index.tsx            (수정)
apps/customer-display/e2e/receipt-done.spec.ts (신규)
apps/customer-display/src/hooks/useDisplayMachine.ts     (신규)
apps/customer-display/src/lib/__tests__/display-machine.test.ts (신규)
apps/customer-display/src/lib/display-machine.ts         (신규)
apps/customer-display/src/mocks/adapter.ts               (수정)
apps/customer-display/src/mocks/snapshot-source.ts       (신규)
apps/customer-display/src/screens/DoneScreen.tsx         (신규)
apps/customer-display/src/screens/ReceiptScreen.tsx      (신규)
apps/customer-display/src/types/customer-display.ts      (신규)
```

### 규칙 A~I 대조 (결정 파일: decision-customer-display-flow-20261115.md CD-12~14 / P-4)

| 규칙 | 결정 요구 | 구현 위치 | 판정 |
|---|---|---|---|
| A | pre_entry=true + paid → 6→5 | display-machine.ts `RECEIPT_DONE + pre_entry=true → done` | ✅ |
| B | pre_entry=false + paid → 6→3' | display-machine.ts `RECEIPT_DONE + pre_entry=false → keypad-after` | ✅ |
| C | keypad 중 paid 무시; OK ≤10s→6→5, >10s→5 직행 | `stay keypad; KEYPAD_OK + dt≤10_000→receipt, 초과→done` | ✅ |
| D | 5 → ~4s → 1 | `DONE_TIMER + done → main`; `doneAutoReturnMs=4000` | ✅ |
| E | 터미널 플로우 중 새 checkout 무시 | `isTerminalFlow + newCheckout → stay` | ✅ |
| G | 결제 실패 + cart → cart 유지 | `cart + status===checkout → stay` | ✅ |
| H | POLL_ERROR 3회 → 경고 오버레이 | `errCount >= pollErrorThreshold(3) → showErrorOverlay=true` | ✅ |
| I | expired → main | 최우선 `expired → main` | ✅ |

규칙 F — 결정 파일에 없음, 구현 없음 (N/A).

### 화면 문구·토큰
- ReceiptScreen: "Payment complete", 메서드 뱃지 (QRIS/Card/Cash) — CD-12 ✅
- DoneScreen: "Thank you for shopping with us", "Points earned", "Current balance", 마스킹 폰 — CD-13 ✅
- i18n: `useLang()` → `cart.order`, `cart.subtotal` 적용 ✅
- GlobeMenu 양 화면 포함 (CD-4 언어 선택) ✅

### 하드코딩 색
`ReceiptScreen.tsx` 영수증 용지 내부에 `#FFFFFF`, `#111`, `#555`, `#CFCFCF` (line ~200-250).
실물 영수증지 재현 목적(theme-neutral paper)으로 의도적 선택. 블로커 아님.
**권장**: 해당 블록 주석 추가 — 다음 PR에서 보완.

### 테스트
- `display-machine.test.ts`: 규칙 A/B/C/D/E/G/H/I 15건 ✅
- `receipt-done.spec.ts`: Playwright 7건 (규칙 A/B/C/G/I) ✅
- PR 본문: vitest 89/89 · Playwright 19/19

### 결론: **APPROVE**

---

## 2. #269 리뷰 · M2-1105-BQ A0 web 빌드 · 서빙 · CI job

### 변경 파일
```
.github/workflows/ci.yml                                  (수정)
apps/commerce-core/Dockerfile                             (수정)
apps/commerce-core/src/api/admin/pos/customer-display/web-version/route.ts (신규)
apps/commerce-core/src/api/customer-display-web/[...path]/route.ts         (신규)
apps/commerce-core/src/api/customer-display-web/route.ts                   (신규)
apps/customer-display/README.md                           (신규)
apps/customer-display/app.json                            (수정)
apps/customer-display/e2e/dev-server.mjs                  (신규)
apps/customer-display/e2e/playwright.config.ts            (수정)
apps/customer-display/package.json                        (수정)
apps/customer-display/scripts/gen-version.mjs             (신규)
railway.json                                              (수정)
scripts/build-customer-display-web.sh                     (신규)
```

### 서빙 경로·캐시·인증

- `/customer-display-web/[...path]`: `safePath()` path traversal 방어 ✅
- `index.html` = `no-cache` / 나머지 = `max-age=31536000, immutable` ✅
- 경로 `src/api/customer-display-web/` (공개, `admin/` 아님) → 손님 iPad 공개 접근 의도 ✅
- `GET /admin/pos/customer-display/web-version` → `src/api/admin/` 하위 (admin 인증 적용) ✅

### 빌드 산출물 커밋 여부
diff에 `dist/` 내 번들 파일 없음 ✅ — Dockerfile 조건부 복사 (`if [ -d public/customer-display-web ]`)로 처리

### CI job
- `customer-display` job 추가: typecheck → test → `expo export --platform web` → Playwright e2e ✅
- `paths-filter: apps/customer-display/**` + `event_name == 'pull_request'` 조건 ✅
- 기존 job (`unit-commerce-core`, `markers-and-forbidden` 등) 독립 — 깨지 않음 ✅
- 실패 시 `actions/upload-artifact@v4` screenshots ✅

### 주의 (블로커 아님)
- `pnpm install --frozen-lockfile` 을 `apps/customer-display` 단독 실행 → 현재 외부 workspace 의존 없어 문제없음. workspace 패키지 참조 시 루트 install 변경 필요.
- `railway.json` watchPatterns에 `apps/customer-display/**` 추가 → Railway Root Directory 변경은 별도 운영 작업 필요 (PR 본문 TODO 명시 ✅).

### 결론: **APPROVE**

---

## 3. 파일 겹침 확인

#268 변경 파일 ∩ #269 변경 파일 = **∅ (겹침 없음)**

- #268: `apps/customer-display/` 내 src/app/e2e만
- #269: `.github/workflows/ci.yml`, `apps/commerce-core/`, `apps/customer-display/app.json` / `package.json` / `README.md` / `e2e/*.mjs` / `scripts/`

겹치는 파일 없으므로 머지 순서 무관. 단, #268이 먼저 머지되는 것이 자연스러운 의존 순서.

---

## 4. PR 리뷰 제출 결과

- **#268**: `gh pr review 268 --comment` 제출 완료 (self-review GraphQL 제한으로 comment 대체)
- **#269**: `gh pr review 269 --comment` 제출 완료 (동일 사유)

---

## 5. 미검증 항목

- 디자인 v7 아티팩트 (`claude.ai/artifact/NZ6zv4KFgz3FRgTV8yDqnY`) 직접 열람 불가 — 결정 파일 텍스트 기술로 대조
- worktree `~/curiocity-live/storeport-wts/R0-1105-EX-wt` 미존재 — relay ledger로 대체
- 실기기/Playwright 로컬 재실행 미수행 (PR 본문 89/89 · 19/19 신뢰)
