# M1-1116-F 보고서

PR #294 · `bash scripts/admin-smoke.sh` (repo 루트 한 명령) · 스모크: Screen1 2✅ Screen2 1⏭(M0-1116-B 미머지) Screen3 2✅ · Docker 없음 → Vite 하니스 방식 사용

---

## 환경

- **Docker**: 미설치 → Vite 하니스(page.route() mock) 방식 채택 (기존 `e2e-admin-loyalty` 패턴 동일)
- **Postgres / medusa dev**: 불필요
- **전제**: Node + pnpm + Chromium (스크립트 자동 설치)

## 스모크 결과

| Screen | 결과 | 스샷 |
|--------|------|------|
| 1 · POS Orders List (M1-1116-B) | ✅ 2 passed | `e2e/screenshots/admin-smoke/01-orders-list.png` · `01b-orders-search.png` |
| 2 · Order Detail 위젯 (M0-1116-B) | ⏭ SKIP | M0-1116-B 미머지 — `order-loyalty.tsx` · `order-pos-timeline.tsx` 없음 |
| 3 · Customer Display (M1-1116-D) | ✅ 2 passed | `e2e/screenshots/admin-smoke/03-customer-display.png` · `03b-cd-theme-changed.png` |

**합계**: 4 passed · 1 skipped · 0 failed

## 스모크 상세

### Screen 1 · POS Orders List
- `data-testid="pos-orders-table"` 존재 ✅
- thead 8칸(Order #·Date/Time·Customer·Method·Payment·Fulfillment·Order Total·Loyalty) ✅
- `data-testid="pos-orders-search"` 존재 ✅
- 행 `pos-order-row-1001`·`pos-order-row-1002` 존재 ✅
- 적립 칸 "+4.750" (loyalty_earn=4750 · id-ID locale) ✅
- 검색 입력 350ms 디바운스 후 API 재요청 ✅

### Screen 2 · Order Detail 위젯 (M0-1116-B)
- `feat/m0-1116-b-loyalty-card-timeline` 브랜치에만 파일 존재 (현재 브랜치 미머지)
- `test.skip(true, ...)` 으로 표시. 머지 후 활성화 경로:
  1. harness-smoke/main.tsx 에 위젯 렌더 추가
  2. admin-smoke.spec.ts SKIP 제거 + 위젯 testID 어서션

### Screen 3 · Customer Display
- ThemeGrid 20종 버튼(`data-testid="theme-btn-*"`) 20개 ✅
- `data-testid="preview-ipad-frame"` 존재 ✅
- `data-testid="preview-screen-idle"` / `preview-screen-paying"` 존재 ✅
- 탭 `tab-theme`·`tab-events` 존재 ✅
- Forest 클릭 → `theme-btn-forest .absolute`(CHANGED 배지)·`changes-banner` 노출 ✅

## 막힌 것

1. **page.route() 등록 순서 버그**: `**/settings**` 후등록이 `/settings/events`도 덮어씀 → `savedEvents.length` TypeError → 단일 핸들러(URL.includes("/events") 분기)로 수정
2. **Screen 2 SKIP**: M0-1116-B 미머지

## 신규 파일

```
storeport/
  apps/commerce-core/
    e2e/admin/harness-smoke/index.html      # Vite 하니스 HTML
    e2e/admin/harness-smoke/main.tsx        # MemoryRouter ?page=orders|cd
    e2e/admin/admin-smoke.spec.ts           # 스모크 5개
    e2e/vite.smoke.config.ts                # port 5174
    playwright.smoke.config.ts              # 스모크 전용 Playwright 설정
  docs/runbooks/admin-smoke.md              # 5줄 사용법
  scripts/admin-smoke.sh                    # 한 명령 엔트리
```
