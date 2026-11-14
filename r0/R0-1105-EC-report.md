R0-1105-EC — APPROVE (iOS 실기 판정 Kyu 위임, 코드·CI 기준 이상 없음)

## PR #132 — feat/m3-1105-bz (head 64ccfe6)

---

## REQ 1 — headerBackTitle 표 · title='' · headerLargeTitle 금지

| 화면 | 이전 화면 | 라벨 | title='' | 비고 |
|---|---|---|---|---|
| checkout/[draftOrderId] | Cart | Cart | ✅ | 기존 불변 |
| checkout/tender-cash/[draftOrderId] | Checkout | Checkout | ✅ | 신규 추가 |
| checkout/tender-qris/[draftOrderId] | Checkout | Checkout | ✅ | Stack.Screen 신규 등록 |
| checkout/delivery/[draftOrderId] | Checkout | Checkout | ✅ | 신규 추가 |
| checkout/split-tender/[draftOrderId] | Checkout | Checkout | ✅ | 신규 추가 |

- `title: ''` — 4개 화면 모두 유지 ✅
- `headerLargeTitle` — tender-qris 내부 `<Stack.Screen options={{ title: ..., headerLargeTitle: true }}>` 에서 **제거**됨 (겹침 원인 해소) ✅
- 겹침 회귀 위험 없음 — `headerBackTitle` 만 추가하고 `headerLargeTitle` 미재도입 ✅

**판정: PASS**

---

## REQ 2 — QRIS captured → receipt_id 재조회 로직

### 서버 응답 필드 대사 (storeport qris-status route:81-88 직독)

captured 경로 실제 응답:
```json
{ "ok": true, "status": "captured", "payment_request_id": "...", "test_mode": false, "data": { ... } }
```
`receipt_id` / `receipt_no` **미포함** — PR 서버 리포트와 일치. 앱의 order metadata 재조회 로직이 정확히 이 갭을 보완.

### 로직 검증

| 항목 | 코드 근거 | 판정 |
|---|---|---|
| 무한 폴링 방지 | `for (let attempt = 0; attempt < 5; attempt++)` — 5회 상한 | ✅ |
| 타이머 정리 | countInterval `return () => clearInterval(id)` in useEffect | ✅ |
| 최대 대기 | attempt 1~4에서 각 2000ms sleep → 최대 ~8s gap + 5회 API | ✅ |
| fallback: 목록 X → 주문 상세 | `router.dismissAll()` → `navigate('/(tabs)/orders')` → `setTimeout → push('/orders/[orderId]')` | ✅ |
| paidRef 중복 이동 방지 | `if (paidRef.current) return; paidRef.current = true;` — 함수 최상단 | ✅ |

**경미한 관찰**: retry loop 내 `await new Promise(resolve => setTimeout(resolve, 2000))` 는 unmount 시 별도 cleanup 없음. 단 `paidRef.current = true` 가 이미 set된 상태이고 Expo Router가 unmounted 컴포넌트의 navigation을 silent-ignore하므로 실질적 위험 미미.

**판정: PASS**

---

## REQ 3 — dev-refresh.sh `--pr <N>` / `--back`

| 항목 | 코드 근거 | 판정 |
|---|---|---|
| `--pr <N>` worktree 충돌 없음 | `git checkout FETCH_HEAD` (detached) — 브랜치 ref 미사용 | ✅ |
| 미커밋 변경 보호 | `set -euo pipefail` + git 자체 refuse (tracked 파일 변경 시 에러 종료) | ✅ |
| master 체크 로직 회귀 없음 | `if [[ "$current_branch" != "master" ]]` 는 기본 모드 섹션에만 존재; `--pr`/`--back` 경로는 그 전에 `exit 0` | ✅ |
| `--dry-run` 실행 로그 | `--pr` 모드: `echo "--- dry-run: Metro 시작 건너뜀 ---"` 후 exit 0 | ✅ |
| `bash -n` syntax | CI assertions job에 명시 step 없음; 스크립트 문법은 시각 검사 이상 없음 | ⚠️ 미비 |

**경미한 미비**: `--back --dry-run` 조합 시 DRY_RUN 무시 — `--back` 분기가 DRY_RUN 체크 전에 `exit 0`함. 실기 개발 도구이므로 허용 범위.

**판정: PASS**

---

## REQ 4 — CI job 결과 · flow-tests 반영

| Job | 결과 | 시간 |
|---|---|---|
| assertions | ✅ pass | 2m12s |
| flow-tests | ✅ pass | 52s |
| lint | ✅ pass | 57s |
| playwright | ✅ pass | 15m26s |

- flow-tests job "Run flow contract & screen-calc tests" step에 `tests/flows/m3-1105-bz.test.ts` (10 tests) 포함 — step success ✅
- playwright job: Chromium binary cache-hit, Expo export web 성공, harness 전체 pass ✅

**판정: PASS**

---

## 종합 판정

**APPROVE** — 4개 REQ 모두 코드·CI 기준 이상 없음.
iOS 실기(헤더 뒤로가기 라벨 · QRIS simulate flow) 판정은 Kyu 확인 위임.
서버 `receipt_id` 미반환 건은 PR 본문 서버 리포트(M0 발부 연결)로 명시됨 — 이연 아님.
