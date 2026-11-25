BLOCKER — #444 live mode 미연결 · #35 APPROVE

## 판정

| PR | 판정 | 사유 |
|----|------|------|
| #444 feat/M1-1125-T (CD 동기화) | **BLOCKER** | LiveIndexRoute 미연결 — `selectCdView`·`payment_phase`·`customer_flow` live mode에 없음, 버튼 → 서버 미호출 |
| #35 feat/M2-1125-Q (ci-watch Q/S/T/W) | **APPROVE** | R0-1125-AG CHANGES(`@(unknown)`) 정확히 해소, W-sha-1 추가, 332/332 ✓ |

---

## #444 — 상세

### 블로커: Live mode 미연결

**근거**
- `apps/customer-display/app/index.tsx` `LiveIndexRoute` (전체): `useDisplayMachine` 그대로 사용 — `selectCdView`, `payment_phase`, `customer_flow`, `OrderListScreen`, `PhoneFlowScreen` 단 하나도 없음
- 새 로직 전부 `apps/customer-display/app/cd-sync.tsx` 목 라우트에만 존재
  - `readCdSyncParams()` → URL 쿼리파라미터 읽기 (목 전용)
  - `handleAction` → `setSnapshot(local state)` 만 변경 — `POST /customer-display/customer-flow` 호출 없음
- `app/index.tsx:43-51`: 목 모드에서 `?flow=cd-sync` URL 파라미터가 있으면 `/cd-sync` 리다이렉트 (목 모드 한정)
- Kyu 실기 기기에서 아무것도 변경되지 않음 — 계약서 §4 CD 화면 선택 로직 완전 미적용

### §4 대조 (목 라우트 범위 내)

| 항목 | 계약서 §4 | 구현 | 판정 |
|------|-----------|------|------|
| `none + tendering` → 주문내역 + [Enter phone number] 활성 | ✓ | `selectCdView:83-84` → `order-list { enterPhoneEnabled: true }` | ✓ |
| `none + building/failed/cancelled` → 주문내역 버튼 비활성 | ✓ | `selectCdView:83` `enterPhoneEnabled=false` | ✓ |
| `none + paid` → 영수증 전체 → 3초 → 키패드 | ✓ | `cd-sync.tsx:52-62` useEffect 3s timer | ✓ |
| 레이아웃 좌 1/3 + 우 2/3 통일 | ✓ | `PhoneFlowScreen.tsx:154-157` flex:1 / flex:2 | ✓ |
| 품목 32px · TOTAL 64px | ✓ | `OrderListScreen.tsx:245,288` | ✓ |
| `skipped`/`unconfirmed` → 표시 후 대기 (버튼 없음) | ✓(§4: "표시 후→처음 화면") | `selectCdView:48-49` → SkippedPanel(버튼 없음) | ✓ |
| `start_entry` 허용: `none/skipped`→`entering` (§2) | — | 목 로컬 전이만, 서버 미호출 | 미구현 |
| 모든 문구 영어 | ✓ | SkippedPanel·ConfirmPanel 등 영어 | ✓ |

### 영수증 (목 라우트)

- `LeftPaymentPanel.tsx:217-252`: `snapshot.receipt` 데이터 → `resolveReceiptView()` (POS와 동일 렌더 경로) ✓
- `LeftPaymentPanel.tsx:252`: `taxRate: 10` ✓
- `OrderListScreen.tsx:34`: taxRate 기본값 `10` ✓
- `CdReceipt` 타입: `ReceiptStoreHeader·ReceiptItem·ReceiptTaxBlock·ReceiptTender` 임포트 (POS 타입 공유) ✓

### 하드코딩 taxRate:11 fallback (비블로커)

- `app/index.tsx:144` `DEFAULT_LIVE_STORE.taxRate: 11` — `app/index.tsx:228`에서 `liveConfig.tax_rate ?? DEFAULT_LIVE_STORE.taxRate` (서버값 우선, fallback 만 11)
- `app/mirror.tsx:21` `taxRate: 11` — 별도 사용처, 그대로 남아 있음
- 계약서 §4·디자인 문서에 "PB1 세율 미결"로 표시됨 → 비블로커, 지적만

### 스크린샷 11장

- `e2e/cd-sync-flow.spec.ts`에 11개 테스트·스크린샷 정의 ✓
  1. order-list-building-none · 2. order-list-tendering-none · 3. keypad-panel-tendering-entering · 4. first-visit-panel-tendering · 5. confirm-panel-tendering-confirming · 6. waiting-panel-tendering-confirmed · 7. earned-panel-paid-confirmed · 8. failed-panel-failed-confirmed · 9. qris-panel-tendering-entering · 10. receipt-full-paid-none · 11. remaining-panel-tendering-entering-split
- `apps/customer-display/screenshots/cd-sync/` 비어 있음(앱 빌드·playwright 실행 전) → 디자인 캔버스 직접 대조 불가
- PR 본문에는 9장만 나열 (receipt-full·remaining 누락)

---

## #35 — 상세

### R0-1125-AG CHANGES 해소 확인

| 항목 | R0-1125-AG 지적 | W 커밋 수정 | 판정 |
|------|-----------------|-------------|------|
| `--once` sha `@(unknown)` | `skipFetch:true` → `_fs.sha=null` | `ci-watch-v2.mjs:234` `readLocalOriginSha(REPO_ROOT)` 호출 → `git rev-parse origin/main` (~5ms) | ✓ 해소 |
| tickFastAsync 첫 화면 sha | 미지적 | `ci-watch-v2.mjs:97` 동일 호출 추가 | ✓ |

### 테스트

- W-sha-1 (`scripts/test/ci-watch-w.test.mjs`): `--once --width=100` 출력 머리 2줄에 `@<7자리sha>` = `git rev-parse origin/main` 슬라이스 포함 여부 검증 ✓
- 기존 331/331(R0-1125-AG) + W-sha-1 1건 = **332/332** ✓
- 스피너: R0-1125-AG에서 직접 측정 — 438회/20s, p95=125ms, 97.4% ∈[70,170]ms ✓

### 수정 범위

- `scripts/watch/sources-git.mjs` +18행 (`readLocalOriginSha` 함수)
- `scripts/ci-watch-v2.mjs` +4행 (import 1 + 호출 2 + 블록 1)
- `scripts/test/ci-watch-w.test.mjs` +42행 (W-sha-1 신규)
- 최소 범위·단순 fix → APPROVE
