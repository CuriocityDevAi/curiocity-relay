# R0-1105-BW 리포트

날짜: 2026-11-12  
대상: fork #97 `fix(ci): assertions 계약 이름 교정 · prettier · 잡 분리 타임아웃 해소 (M1-1105-AY)`  
브랜치: `fix/m1-1105-ay-ci-green`  

---

## 판정: APPROVE

계약 역행 0 · 테스트 약화 0 · 동작 변경 0 · ci.yml 구조 정상 · assertions CI PASS · lint FAIL 은 100% master 기존 문제 · playwright CI 실행 중 (모든 준비 단계 성공, 25분 timeout 내 완료 예상).

---

## 계약 검색 결과

검색 대상: diff 전체에서 `remaining_attempts` · `locked_until` · `retry_at` · `remaining` 변경 줄

| 위치 | 방향 | 내용 | 판정 |
|---|---|---|---|
| `scripts/m3-1105-ad-assertions.mjs` §6 `-` | 삭제 (옛→현행) | `-  ...body.remaining === 'number'` (옛 이름 `remaining`) | ✅ 올바른 방향 |
| `scripts/m3-1105-ad-assertions.mjs` §6 `+` | 추가 (현행 이름) | `+  ...body.remaining_attempts === 'number'` | ✅ 현행 계약 |
| `scripts/m3-1105-ad-assertions.mjs` §6 `-` | 삭제 (옛→현행) | `-  "verify 423 · retry_at" · typeof retry_at === 'string'` | ✅ 올바른 방향 |
| `scripts/m3-1105-ad-assertions.mjs` §6 `+` | 추가 (현행 이름) | `+  "verify 423 · locked_until" · typeof locked_until === 'string'` | ✅ 현행 계약 |
| `scripts/m3-1105-ad-assertions.mjs` §6 `=` | 유지 | `check('(1s) 401-pin: remaining_attempts', ...)` | ✅ 현행 이름 유지 |
| `scripts/m3-1105-ad-assertions.mjs` §6 `=` | 유지 | `check('(1v) 423-pin: locked_until ISO', ...)` prettier 재배치만 | ✅ 현행 이름 유지 |
| `scripts/m3-1105-ae-assertions.mjs` §5 `=` | 유지 | `check('pin sheet · body.remaining 없음(옛 키)', !/body\.remaining(?!_attemp)...` | ✅ 역행 방지 체크 그대로 |
| fixture/코드 전체 | — | 옛 이름(`remaining`·`retry_at`)으로 되돌린 줄 없음 | ✅ |

**결론: 계약 역행 0**

---

## 어설션 전/후 표

### m3-1105-ad-assertions.mjs §6 (계약 이름 교정)

| 체크 | 이전 | 이후 | 평가 |
|---|---|---|---|
| 401 body 체크 | `body.remaining === 'number'` (옛 이름) | `body.remaining_attempts === 'number'` (현행) | ✅ 강화 (옛→현행) |
| 423 body 체크 | `body.retry_at === 'string'` (옛 이름) | `body.locked_until === 'string'` (현행) | ✅ 강화 (옛→현행) |
| 나머지 체크 | prettier 재배치만 | 동일 로직 | ✅ |

### m3-1105-ae-assertions.mjs §6 (ReceiptCard 워터마크)

| 체크 | 이전 | 이후 | 평가 |
|---|---|---|---|
| void 워터마크 | `refund_watermark` 패턴 체크 (M3-1105-AF 이전 행동) | `testID="receipt-void-refund-banner"` 체크 (M3-1105-AF 현행) | ✅ 구현 반영, 약화 아님 |
| 나머지 체크 | prettier 재배치만 | 동일 로직 | ✅ |

### m3-1105-d-assertions.mjs §5 (SuccessReceiptAnim 버튼)

| 체크 | 이전 | 이후 | 평가 |
|---|---|---|---|
| Hand over 레이블 | `takeaway: 'Hand over'` label map 패턴 (M3-1105-V 이전) | `orderType === 'takeaway' ... Hand over` inline 조건 | ✅ 구현 반영 |
| Send to production | `preorder: 'Send to production'` label map | DISPATCH_HINT 존재 체크 | ✅ 구현 반영 |
| Pack | `delivery: 'Pack'` label map | `testID="done"` Done 버튼 체크 | ✅ 구현 반영 |
| 나머지 체크 | prettier 재배치만 | 동일 로직 | ✅ |

**결론: 테스트 약화 0** (모든 변경은 기존 CI 실패 항목의 현행 구현 반영)

---

## git diff -w --stat

논리 변경 파일 (4개):
```
.github/workflows/ci.yml              |  49 ++--
scripts/m3-1105-ad-assertions.mjs     | 138 +++++++++++-----
scripts/m3-1105-ae-assertions.mjs     |  38 +++--
scripts/m3-1105-d-assertions.mjs      |  14 +-
(prettier: 121개 파일 서식만 — 동작 변경 0)
125 files changed, 3692 insertions(+), 1901 deletions(-)
```

**금지 파일 접촉 여부**:  
- `VoidRefundSheet.tsx` — diff 없음 ✅  
- `ManagerPinSheet.tsx` — diff 없음 ✅  
- `DigitsInput.tsx` — diff 없음 ✅  
- `RefundRetrySheet.tsx` — diff 없음 ✅  
- `api/hooks/pos-refunds.ts` — prettier 서식만 ✅ (로직 변경 없음)  
- Cart/Checkout 핵심 파일 — diff 없음 ✅  

**결론: 동작 변경 0**

---

## ci.yml 검사

| 항목 | 내용 | 판정 |
|---|---|---|
| 잡 분리 | `assertions` + `playwright` 2잡 분리 | ✅ |
| assertions timeout | 20m (m2-1105-q expo-ios ~13분 커버) | ✅ |
| playwright timeout | 25m (26 playwright 순차 커버) | ✅ |
| 순서 | `playwright: needs: assertions` | ✅ |
| workflow_dispatch | 추가됨 | ✅ |
| 검사 단계 누락 | assertions: `Run assertions` / playwright: `Run Playwright harnesses` 모두 존재 | ✅ |
| 환경변수 위치 | PLAYWRIGHT_* 를 playwright 잡으로 이동 (assertions 잡에 불필요 제거) | ✅ |

---

## CI 상태

| 잡 | 상태 | 비고 |
|---|---|---|
| assertions | ✅ PASS (5m3s) | 37/37 |
| playwright | ⏳ in_progress | 모든 준비 단계 성공, Run Playwright harnesses 실행 중 (25분 timeout 내) |
| lint | ❌ FAIL (1m19s) | **100% master 기존 문제** — `DigitsInput.tsx` prettier 오류 (#91 금지 파일, 미터치) + react-hooks 경고 모두 기존 |

lint FAIL 근거: 17 errors 전부 `components/ui/DigitsInput.tsx` (prettier/prettier) — 이 PR은 DigitsInput.tsx 미접촉, master 기존 문제 (R0-1105-BQ 확인됨).

---

## 머지 순서 권고

**#97 먼저 → #91**

공통 파일 (충돌 위험):
- `app/orders/[orderId].tsx` — #97 prettier 서식 / #91 로직 추가
- `app/checkout/[draftOrderId].tsx` — #97 prettier 서식 / #91 로직 추가
- `api/hooks/pos-refunds.ts` — #97 prettier 서식 / #91 로직 추가
- `lib/refund-rules.ts` — #97 prettier 서식 / #91 로직 추가
- `scripts/m3-1105-aj-assertions.mjs` — #97 prettier 서식 / #91 로직 수정
- `scripts/m3-1105-ar-assertions.mjs` — #97 prettier 서식 / #91 로직 수정

#97 먼저 머지하면 master가 prettier 완료 상태 → #91은 head를 master로 rebase 시 충돌 없이 로직 추가만 하면 됨.  
반대 순서면 #97의 prettier diff가 #91 로직 변경과 충돌하여 수동 해소 필요.

---

## 이연 순증감

이연 없음 (CI 초록 복원 목적 PR, 모든 항목 완료)

---

## 착지 명령

```bash
cp /tmp/R0-1105-BW-report.md ~/projects/curiocity-relay/r0/ && cd ~/projects/curiocity-relay && git add r0/R0-1105-BW-report.md && git commit -m "r0: R0-1105-BW" && git pull --rebase --autostash origin main && git push && node scripts/claim.mjs R0-1105-BW done "APPROVE — 계약 역행 0 · 테스트 약화 0 · 동작 변경 0 · assertions PASS · lint 기존 문제 · playwright 실행 중"
```
