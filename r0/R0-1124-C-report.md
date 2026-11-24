CHANGES — e2e CI 하네스 누락 (스크롤 가드 12개 테스트 CI 미실행)

## ① 칩 번호 규칙 (D1)

| 규칙 | 보장 여부 | 근거 |
|------|-----------|------|
| 레지스터 오픈마다 #1 | ✅ | `useOpenRegisterSession.onSuccess` → `resetSessionOrderCounter()` → `_sessionOrderCounter=0` → 첫 `++_sessionOrderCounter` = 1 |
| 세션 내 재사용 안 함 | ✅ | 단조 증가 카운터 — 칩 삭제 후에도 되돌아가지 않음 |
| 앱 재시작 후 복원 | ✅ | `restoreWaitingDraftOrders` 끝에서 `max(posOrderNum)` → `_sessionOrderCounter` 갱신 → 다음 주문은 max+1 |

**다중 POS 충돌 위험 (기록만):**
`_sessionOrderCounter`는 모듈 수준 메모리 변수. 두 POS 기기가 같은 레지스터를 각자 오픈하면 각각 counter=0에서 시작 → #1 중복 발급 가능. 현재 매장은 1대라 실해 없지만, 추후 2대 운용 시 서버 단 max 조회 또는 UUID 채번으로 전환 필요.

## ② 영수증 스크롤 가드 e2e (D3)

**스펙 내용:** `e2e/flows/M3-1124-C-receipt-scroll.spec.ts` — Cash / Card / QRIS / 나눠결제 × 3 뷰포트 = 12개 테스트. 로컬 12/12 pass 기록.

**CI 연결 상태: ❌ 미실행**

CI `playwright` 잡은 `node scripts/run-all.mjs playwright --workers 4` 를 통해 `scripts/*-playwright.mjs` 패턴을 glob 발견(`PATTERNS.playwright = /^[a-z0-9-]+-playwright\.mjs$/`). 새 스펙 파일에 대응하는 하네스 `scripts/m3-1124-c-*-playwright.mjs` 가 존재하지 않아 CI 가 이 스펙을 한 번도 실행하지 않음.

CI playwright 잡이 `pass` 로 표시되는 것은 기존 하네스들만 돌았기 때문. 새 12개 테스트는 CI에서 ⏭ 건너뜀 상태.

**필요 조치:** `scripts/m3-1124-c-receipt-scroll-playwright.mjs` 하네스 추가 (기존 `m3-1117-a-playwright.mjs` 패턴 참조), 또는 `npx playwright test e2e/flows/M3-1124-C-receipt-scroll.spec.ts` 를 CI 단계에 직접 추가.

## ③ 파일 주인 범위 · lint

| 파일 | 범위 | 비고 |
|------|------|------|
| `api/hooks/draft-orders.tsx` | M3-1124-C D1 ✅ | `AdminAddDraftOrderItems` import 제거 — 파일 내 미사용이므로 clean |
| `api/hooks/register-session.ts` | M3-1124-C D1 ✅ | |
| `components/payment/SuccessReceiptAnim.tsx` | M3-1124-C D3 ✅ | `eslint-disable-next-line @typescript-eslint/no-require-imports` 추가 — `require()` 억제로 필요 |
| `e2e/flows/M3-1124-C-receipt-scroll.spec.ts` | M3-1124-C D3 ✅ | 신규 스펙 |

lint CI pass ✅. 파일 범위 초과 없음.

## 판정 요약

- D1 칩 번호: **APPROVE** — 세 가지 규칙 모두 코드로 보장됨.
- D3 e2e: **CHANGES** — 스펙 파일은 완비(12개)이나 CI 하네스 누락으로 미실행.
- lint: **APPROVE**
