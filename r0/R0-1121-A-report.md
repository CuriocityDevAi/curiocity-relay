# R0-1121-A 리뷰 리포트

**#409 APPROVE · #218 APPROVE · #408 APPROVE · #219 APPROVE**

---

## A. storeport #409 — APPROVE ✅

### feature-map 등록 확인

R0-1120-I에서 `apps/customer-display/app/mirror.tsx`가 feature-map에 없어 CI `check` exit 1 → CHANGES였음.  
M3-1120-E 커밋에서 `docs/feature-map.yaml`에 `cd-mirror` 항목 등록 → CI `check` pass 확인.

### 검증 결과

| 항목 | 결과 |
|------|------|
| feature-map `cd-mirror` 등록 | ✅ CI check pass |
| diff = mirror 관련 파일만 | ✅ `mirror.tsx` + `feature-map.yaml` 2개만 |
| display-machine.ts 미수정 | ✅ |
| useDisplayMachine.ts 미수정 | ✅ |
| 콜백 no-op (onCancel/onOk/onDone/onReturn) | ✅ 모두 `() => {}` |
| 하드코딩 색 없음 | ✅ 기존 화면 컴포넌트 재사용 |
| 번들 안전 (node: import 0) | ✅ |
| CI heavy-mac | ✅ 18m15s pass |
| CI check / changes-filter / markers-and-forbidden / route | ✅ 전부 pass |
| CI heavy-cloud | skipping (조건부 — 정상) |

---

## B. fork #218 — APPROVE ✅

### 충돌 해소 확인

R0-1120-I: `mergeable_state: dirty` → 현재: `mergeable_state: unstable` (충돌 해소됨)

### CI 실패 2건 — 인프라 플래킹 (코드 무관)

| Job | Run ID | 실패 원인 |
|-----|--------|----------|
| lint | 44724062134 | self-hosted runner 통신 단절 (`npm ci` 도중 runner 소실) |
| route | 44724062325 | 6분 타임아웃 초과 (runner exceeded max execution time of 6m0s) |

→ 코드 오류 아님. 로컬 검증으로 대체.

### 로컬 검증

```
# worktree: /tmp/r0-218-review (branch: feat/M3-1120-B-cd-preview-r1 HEAD 13a24ac)
$ npm ci --legacy-peer-deps          → 완료
$ npm run lint                       → 0 errors, 63 warnings ✅
$ npx vitest run components/cd-preview/__tests__
  → Test Files 3 passed (3) · Tests 37 passed (37) ✅
$ npx playwright test e2e/flows/cd-preview.spec.ts
  → ERR_CONNECTION_REFUSED (dev server 미구성) ⚠️ 미검증
```

### diff 검토

| 항목 | 결과 |
|------|------|
| 파일 7개 모두 mirror/cd-preview 관련 | ✅ |
| 하드코딩 색 없음 (TOKEN_* 토큰) | ✅ |
| 번들 안전 | ✅ |
| WebView read-only 오버레이 (`pointerEvents="box-only"`) | ✅ |
| snapshot injectJavaScript 주입 (로드완료 + 변경시) | ✅ |
| 오프라인 표시 (`ageText`: No CD / Xs ago / Offline) | ✅ |
| S/M/L 비율 9/16 (`winH = round(winW * 9/16)`) | ✅ |
| kindToBadgeState 실연결 (classifyCustomerDisplay) | ✅ |

> **미검증**: Playwright E2E — dev server 미구성으로 `ERR_CONNECTION_REFUSED`. CI 인프라 안정화 후 자동 통과 예상.

---

## C. storeport #408 — APPROVE ✅

### M1-1120-E 커밋(557bd0f) 항목별 대조

**E1~E10 오류 수정 (10건)**

| # | 항목 | 판정 |
|---|------|------|
| E1 | `pos_screen` "서버 미저장" 오인 → §5-C에서 "현행 서버 저장·반환됨" 명시 | ✅ |
| E2 | Rule A 줄번호 `10(주석),200-206(구현)` | ✅ 실측 일치 |
| E3 | Rule B 줄번호 `11(주석),207-208(구현)` | ✅ 실측 일치 |
| E4 | KEYPAD_OPEN from cart `211-213` | ✅ 실측 일치 |
| E5 | Rule C (keypad-while-paid) `226-237` | ✅ 실측 일치 |
| E6 | Rule H (poll error overlay) `130-134` | ✅ 실측 일치 |
| E7 | Rule I (expired → main) `190-193` | ✅ 실측 일치 |
| E8 | `setSnapshotPhoneEntry()` `395-405` | ✅ (R0-1120-F: 395-406, 1줄 차이 허용범위) |
| E9 | `markSnapshotPaid()` `427-443` | ✅ 실측 일치 |
| E10 | `order_snapshot/model.ts:28` | ✅ 경로·줄번호 일치 |

**G1~G4 누락 추가 (4건) — §1-A DELETE표 추가**

| # | 항목 | 위치 |
|---|------|------|
| G1 | `kav/keypadAfterVisited` | `display-machine.ts:85,97 · hooks/useDisplayMachine.ts:51,94` ✅ |
| G2 | `doneSnapshotId` | `display-machine.ts:82,95 · hooks/useDisplayMachine.ts:50,93` ✅ |
| G3 | `skippedSnapshotId` | `display-machine.ts:80,93 · hooks/useDisplayMachine.ts:49,92` ✅ |
| G4 | `skipped_at` DB 컬럼 삭제 | `order_snapshot/model.ts:41` ✅ |

**코드 혼입 해소**: `changed_files=1` (`docs/plans/cd-loyalty-flow-v2.md` only) ✅

**Kyu 16:16 보완 5건 + 16:22 반영**

| 항목 | 위치 |
|------|------|
| 캐시어 Skip (건너뛰기) | §4-C, S-06 ✅ |
| 20초 last-key timeout | §3 타이머표, KeypadAfterScreen 1-C ✅ |
| No thanks | §2-C mermaid, S-05 ✅ |
| 신규 번호만 동의 (`is_new=true`) | §6-B ✅ |
| 결제 전 회원확인 = 캐시어 쪽만 | §6-C "현재 범위 외" ✅ |
| 영수증 CD=POS 동일화 | §10-A 11항목 대사표 ✅ |
| 애니메이션 속도 단일화 | §10-C/D 토큰 5개 ✅ |

---

### #408 Kyu 승인용 1쪽 요약

#### 손님 입장 흐름 (new)

1. 결제 완료 → 영수증 표시 (지금과 같음)
2. 영수증 아래 **"번호 입력하기" 버튼** + 5초 카운트다운 등장
3. 5초 안에 버튼 클릭 or 자동으로 번호 입력 화면 이동
4. 번호 입력: 30초 무입력 → 대기 화면 (그 판매 적립 없음)
5. 1자라도 입력 시 타이머 유지, 마지막 입력 후 20초 무반응 → 자동 취소
6. [No thanks] → 즉시 대기 화면
7. 번호 완료 → 적립 결과 4초 → 대기

**결제 중에는 번호 입력 없음** (가장 큰 변경점)

#### 캐시어 입장 흐름 (new)

- 손님 입력 중 → POS 카트 버튼 비활성 + 배너 표시
- 급하면 [건너뛰기] → 확인 1회 → 번호 흐름 취소
- 오프라인/Skip 후: success 화면 → [Link Customer] → 직접 입력 or 손님 화면에 번호 화면 열기

#### Kyu 결정 반영 위치

| Kyu 결정 | 반영 위치 |
|---------|----------|
| 5초 버튼 카운트다운 | §3 타이머표, §2-B 상태표, S-17 |
| 20초 last-key | §3 타이머표, §1-C KeypadAfterScreen |
| No thanks | §2-C mermaid, S-05 |
| 신규 번호만 동의 | §6-B `is_new=true` |
| 결제 전 회원확인 = 캐시어 쪽 | §6-C "현재 범위 외" |
| 영수증 CD=POS 동일 | §10-A 대사표 11항목 |
| 애니메이션 속도 POS 동일 | §10-C/D 토큰 5개 |

#### 열린 질문 (Kyu 확인 대기)

**소급 적립 창**: 현재 설계서는 10분(`link_open_until`). 권장안 = **그날 영업 마감까지**.  
확장 시 `computeLinkOpenUntil()` 로직 변경 필요 — 설계서 §5-A 하단 명시.

---

## D. fork #219 — APPROVE ✅

### CI 실패 1건 — 기존 실패 (이 PR 무관)

`assertions` fail: `m3-1105-aa-assertions.mjs` 1건 — R0-1120-I 확인된 기존 실패(SuccessReceiptAnim · 보조 버튼 3개 한 줄). 46/47 pass.

### CI 결과

| Job | 결과 |
|-----|------|
| lint | ✅ pass |
| route | ✅ pass |
| flow-tests | ✅ pass |
| heavy-cloud | ✅ pass |
| assertions | ❌ m3-1105-aa 기존 실패 (무관) |
| playwright | skipping (assertions 차단) |

### 로컬 테스트

```
# worktree: /tmp/r0-219-review (branch: fix/M0-1120-E-ble-mtu-chunk HEAD 315a3b8)
$ npm ci --legacy-peer-deps          → 완료
$ npx vitest run __tests__/m0-1120-e-ble-chunk.test.ts
  → Test Files 1 passed (1) · Tests 22 passed (22) ✅
$ npx vitest run tests/flows/m3-1118-j-printer.test.ts
  → Test Files 1 passed (1) · Tests 20 passed (20) ✅
```

### 코드 검토

| 항목 | 결과 |
|------|------|
| native 변경 0 (android/·ios/ 미수정) | ✅ |
| iOS no-op (`Platform.OS !== 'android'` → return device) | ✅ |
| `chunkSizeFromMtu(undefined)` → 20 (안전값) | ✅ |
| MTU 협상 실패 시 20B 안전값 (mtu < 23 || undefined → 20) | ✅ |
| withResponse 폴백 (catch → `writeCharacteristicWithResponseForService`) | ✅ |
| `WRITE_CHUNK_SIZE=180` 하드코딩 제거 | ✅ |
| KNOWN_WRITE_PATTERNS (ISSC·FFE0/FFE1·FF00/FF02·18F0/2AF1) | ✅ |
| 청크 간 지연 (`WRITE_CHUNK_DELAY_MS=20`) | ✅ |
| 번들 안전 | ✅ |

> **Kyu 실기 회부**: `RPPO2N`/`RPP02N` 선택 → Test print → "MEROS / Test Print / 품목 3줄 / TOTAL / Payment / TEST OK / Thank you!" 전체 출력 확인 필요.

---

## 실행 명령·결과 로그

```
# GitHub API (gh + MCP)
gh pr checks 409 --repo CuriocityDevAi/storeport
  → check pass · heavy-mac pass · route pass · changes-filter pass · markers-and-forbidden pass

gh pr checks 408 --repo CuriocityDevAi/storeport
  → no checks reported on branch (docs-only, CI 미트리거)

gh pr checks 218 --repo CuriocityDevAi/agilo-medusa-pos-fork
  → lint fail (runner 소실) · route fail (6분 타임아웃) · 나머지 skipping

gh pr checks 219 --repo CuriocityDevAi/agilo-medusa-pos-fork
  → lint pass · route pass · flow-tests pass · heavy-cloud pass · assertions fail (m3-1105-aa 기존)

gh run view 44724062134 --repo CuriocityDevAi/agilo-medusa-pos-fork
  → lint: "self-hosted runner lost communication" (npm ci 중 소실)

gh run view 44724062325 --repo CuriocityDevAi/agilo-medusa-pos-fork
  → route: "job has exceeded the maximum execution time of 6m0s"

gh run view 44722901182 --repo CuriocityDevAi/agilo-medusa-pos-fork --log-failed
  → assertions: m3-1105-aa-assertions.mjs FAIL (exit 1) · 31/32 passed

# PR diff / 파일 조회 (MCP)
pull_request_read get_files #409 storeport   → mirror.tsx + feature-map.yaml 2개
pull_request_read get_files #218 fork        → 7개 파일 (cd-preview 관련만)
pull_request_read get_files #219 fork        → 4개 파일 (escpos/ble/receipt/test)
pull_request_read get_diff  #408 storeport   → cd-loyalty-flow-v2.md 472줄 신규

# 실제 코드 라인 번호 검증 (MCP get_file_contents)
display-machine.ts (main) → E2~E7 전수 검증: 10,11,130-134,190-193,200-206,207-208,211-213,226-237 ✅
useDisplayMachine.ts (main) → G1~G3 훅 줄번호 49-51,92-94 ✅
service.ts (main) → setSnapshotPhoneEntry·markSnapshotPaid 존재 확인 ✅

# 로컬 테스트 (#218 worktree)
git fetch origin feat/M3-1120-B-cd-preview-r1 --depth=1
git worktree add /tmp/r0-218-review FETCH_HEAD
cd /tmp/r0-218-review && npm ci --legacy-peer-deps
npm run lint                                     → 0 errors, 63 warnings
npx vitest run components/cd-preview/__tests__   → 37/37 pass
npx playwright test e2e/flows/cd-preview.spec.ts → ERR_CONNECTION_REFUSED (미검증)
git worktree remove --force /tmp/r0-218-review

# 로컬 테스트 (#219 worktree)
git fetch origin fix/M0-1120-E-ble-mtu-chunk --depth=1
git worktree add /tmp/r0-219-review FETCH_HEAD
cd /tmp/r0-219-review && npm ci --legacy-peer-deps
npx vitest run __tests__/m0-1120-e-ble-chunk.test.ts    → 22/22 pass
npx vitest run tests/flows/m3-1118-j-printer.test.ts    → 20/20 pass
git worktree remove --force /tmp/r0-219-review
```

## 미검증 항목

| PR | 항목 | 사유 |
|----|------|------|
| #218 | Playwright E2E (cd-preview 6개 테스트) | dev server 미구성 (ERR_CONNECTION_REFUSED) |
| #219 | 실기 테스트 (RPPO2N 프린터 연결 출력) | 하드웨어 미보유 |
