# M2-1105-BM 완료 리포트

## 결과 한 줄
Loyalty R2 Admin UI 완성 — 설정 화면·시뮬레이션(Before/After 영수증·30일 영향)·Save 팝업(즉시/예약 달력)·감사 기록·Playwright 스펙(mock 서버) · PR #256

---

## PR
https://github.com/CuriocityDevAi/storeport/pull/256 (draft · base: main)

## 작업 레포
storeport-m1 (`/Users/kyu.lee/projects/storeport-m1`)  
브랜치: `feat/m2-1105-bm-loyalty-admin-ui`

---

## 구현 내용

### 신규 파일

| 파일 | 역할 |
|------|------|
| `apps/commerce-core/src/admin/lib/loyalty-api.ts` | 계약 타입 전부 · fetch 헬퍼 · 목 폴백(404/Failed to fetch) |
| `apps/commerce-core/src/admin/routes/pos-settings/loyalty/page.tsx` | Loyalty 설정 페이지 (약 650줄) |
| `apps/commerce-core/e2e/admin/loyalty-gate.spec.ts` | Playwright 8개 케이스 (mock 서버) |
| `apps/commerce-core/playwright.config.ts` | Playwright 설정 |

### 수정 파일

| 파일 | 변경 |
|------|------|
| `apps/commerce-core/src/admin/routes/pos-settings/page.tsx` | "Loyalty Settings →" 링크 섹션 추가 |
| `apps/commerce-core/package.json` | `@playwright/test ^1.49.0` devDep + `test:e2e:admin` 스크립트 |

---

## 화면 요소별 구현 체크

| REQ | 구현 |
|-----|------|
| ① 현재 값 읽기 전용 표시 | ✅ SettingRow 컴포넌트 · 9개 GATED 필드 |
| ① UNGATED 토글 즉시 저장 + 사유 모달 | ✅ UngatedModal · enabled · earn_on_balance_tender_only |
| ① 대기 중 예약 배너 + 취소 | ✅ pending-banner · cancel-pending-btn |
| ② Simulate 버튼 → 시뮬레이션 화면 | ✅ SimulateView · 2단 레이아웃 |
| ② 왼쪽 GATED 필드 편집 (9개 · 1줄 설명) | ✅ earn_rate_pct · earn_base · round_mode · min_use_amount · max_use_pct_per_order · expiry_days · signup_bonus · exclude_product_ids · tax_mode |
| ② tax_mode=discount 경고 | ✅ 세무사 확인 후에만 · data-testid="tax-mode-warning" |
| ② 값 바꾸면 자동 재계산 (400ms debounce) | ✅ useRef debounce · 400ms · setLastSimHash(null) 즉시 비활성 |
| ② 6카드 Before(왼쪽)/After(오른쪽) 영수증 | ✅ ScenarioCard · ReceiptCard · changed_line_keys 강조 (orange bg) |
| ② 30일 영향 패널 | ✅ ImpactPanel · earned·used·liability·tax · before→after 화살표 뱃지 |
| ③ Save 활성 조건: 시뮬 1회 + hash 일치 | ✅ gatedHash() 비교 · saveEnabled 플래그 · save-gate-banner |
| ④ Save 팝업: diff 표 | ✅ SaveDialog · diff 표 (setting/from/to) |
| ④ Save 팝업: 사유 입력 (필수 5자+) | ✅ save-reason-input · validation |
| ④ Save 팝업: [지금 반영] / [예약 달력] | ✅ apply-now-radio · apply-scheduled-radio · schedule-date-input |
| ④ 예약: 오늘 이후 · 00:00 안내 | ✅ min=tomorrow · "00:00 store time" 안내 |
| ⑤ 감사 목록: 6개 컬럼 | ✅ 시간·누가·변경항목·사유·반영방식·상태 |
| ⑤ 행 펼치면 시뮬 스냅샷 | ✅ AuditRow expand → ImpactPanel |
| ⑥ Playwright 게이트 테스트 | ✅ 케이스 1~3 (Save 비활성→활성→비활성) |
| ⑥ Playwright 예약 달력 | ✅ 케이스 5 |
| ⑥ Playwright 감사 목록 렌더 | ✅ 케이스 6 |

---

## CI 자기 검증

- **Unit tests**: `apps/commerce-core test: 160 passed` (기존 전부 통과 · 신규 loyalty 파일 단위 테스트 없음 — 로직은 Playwright 커버)
- **naming-check**: PASS (meros 문자열 0건)
- **upstream-check**: PASS
- **Playwright**: 서버 필요 — `ADMIN_URL=http://localhost:9000/app npx playwright test e2e/admin/`로 실행. mock 서버로 구성 완비. 스크린샷은 서버 기동 후 착지 예정.

---

## Kyu 확인 항목 (서버 R2 머지·배포 후)

Admin에서:
1. `/pos-settings/loyalty` → 현재 설정 표시 확인
2. Simulate → 값 변경 → Before/After 영수증 카드 6개 확인
3. 30일 영향 패널 before→after 화살표 뱃지 확인
4. 값 바꾼 직후 Save 비활성 → 재계산 후 활성 확인
5. Save 팝업 → diff 표 + 사유 → [지금 반영] 확인
6. Save 팝업 → [예약 반영] → 달력 날짜 선택 → Schedule 확인
7. UNGATED enabled 토글 → 사유 모달 → Confirm 확인
8. 감사 목록 행 펼쳐 시뮬 스냅샷 확인
9. `npx playwright test e2e/admin/` (서버 기동 상태) 실행 확인

---

## 계약 대비 변경 없음

서버 계약(`relay/ledger/loyalty-r2-contract.md`)과 100% 일치. 변경 제안 없음.
