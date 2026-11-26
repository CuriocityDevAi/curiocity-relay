# M3-1126-R 착지 보고

착지 (POS 증상 1 수정) · 부분 착지 (증상 2~4 CD/서버 책임, 원인 리포트만)

## 원인 표 요약

| # | 증상 (Kyu 실기 2026-11-26 23:05) | 원인 (파일:줄) | 레포 | 조치 |
|---|-----------------------------------|----------------|------|------|
| 1 | 상품 시트 이미지가 오른쪽 끝에 붙어 잘림 (왼쪽 회색 영역) | `app/product-details.tsx:26,34-44` — `ProductImagesCarousel` initial `width = useSafeAreaFrame().width` (최대 1200px+) 가 부모 `max-w-xl` (576px) 보다 넓게 렌더 → `overflow-hidden` 내부에서 contain 이미지가 중심 밖 | agilo-medusa-pos-fork (POS) | **✅ 수정: PR #279** — initial width=0 + `onLayout.nativeEvent.layout.width` 측정 뒤에만 Carousel 렌더. placeholder = `aspectRatio 4/3` View. |
| 2 | 결제 후 20초 뒤 POS 칩이 "Skipped·Ask again" 대신 "Ask phone" 복귀 (+ Phone entry 칩 동시) | 서버가 keypad timeout 후 `customer_flow.state` 를 `none` 으로 reset. "Ask phone" 과 "Phone entry" 가 같은 action='start_entry' 를 유발 → 중복 여부는 명세 결정 사항 | storeport commerce-core (서버 #463 진행 중, 수정 금지) | ❌ 서버 PR 이관 · PR 본문 근거만 | 
| 3 | 재입력 중 20초 뒤 초기화 — 마지막 키 입력으로 리셋 안됨 | `storeport apps/customer-display/src/screens/KeypadAfterScreen.tsx:40-58` — `startMs = useRef(server_now ?? Date.now())` 로 mount 시점 고정. `digits` 와 무관하게 `timeoutSec` 초 뒤 fire. (CD-sync 경로의 `KeypadPanel.tsx:74-78` 은 digits effect 로 reset 하므로 OK — 운영이 어떤 경로를 타는지 서버 응답에 좌우) | storeport apps/customer-display | ❌ 별도 CD PR 필요. 수정안: digits 변경 시 `startMs.current = Date.now()` 재앵커 |
| 4 | OK 누르면 Confirm 카드 없이 초기화면 복귀, 적립 흐름 끊김 | 두 코드 경로: (a) mock: `apps/customer-display/app/keypad-after.tsx:24` `onOk={()=>router.replace("/consent")}` 가 digits 를 버림. (b) live: `index.tsx:285-316` `cdSnapshot nullification` 이 `paid_at > 30s` + `(settled||!phoneEntryOpen)` 이면 `cdSnapshot=null` → MainScreen 복귀 → 응답 반영 전에 초기화면으로 떨어짐 | storeport apps/customer-display + commerce-core | ❌ CD PR + 서버 ack 필요. 응답 실물 확보(운영 DB·SSH·railway 금지 — Kyu 실기 재검증) |

## 수정/산출물 (이번 PR)

- **PR #279**: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/279
- 변경: `app/product-details.tsx` (-11/+13), `e2e/flows/M3-1126-R-pos-fixes.spec.ts` (+86 신규), `e2e/screenshots/M3-1126-R-product-image-fit.png` (+192KB 캡처).
- 커밋: `4b06e71 fix(product-details): 상품 시트 이미지 오른쪽 치우침 해소 (M3-1126-R)`.
- 브랜치: `feat/M3-1126-R` (origin 푸시 완료).

## 자기 검증 (Playwright)

- ✅ `e2e/flows/M3-1126-R-pos-fixes.spec.ts` 1 passed (3.2s, chromium 1180x820).
  - 어설션: 이미지 right ≤ 컨테이너 right + 1px · 좌우 여백 차 ≤ 24px.
  - 스크린샷: `e2e/screenshots/M3-1126-R-product-image-fit.png` — Iced Tea 이미지가 왼쪽 반 영역에 정확히 꽉 차 contain 렌더됨 (오른쪽 치우침 소실).
- 🟡 증상 2/3/4 는 실 서버 + CD iPad Safari 필요 — **미실행 명시**. Kyu 실기 재검증 요청.

## 지난 fixture 테스트가 못 잡은 이유

`spec-guard` 의 `SELL-PRODUCT-SHEET-IMG` 테스트 (`object-fit: contain` 만 확인) 는 CSS 속성만 검사하고 실제 bbox 위치는 보지 않음 → 컨테이너 밖으로 밀려 잘려도 통과. 이번 추가 테스트는 pixel bbox 로 보완.

## 보존 요소 확인 (M3-1126-R PR 본문 체크)

- POS-HDR-PHONE 6상태 칩: 미변경 (components/customer-display/CustomerPhoneStatus.tsx).
- Payment successful Phone entry 칩: 미변경 (components/customer-display/PhoneEntryButton.tsx).
- Next customer · 영수증 (Cashier/PB1/영수증 번호/긴 번호): 미변경.

## 선언

- 운영 DB 접근·SSH·railway CLI 사용 안 함.
- 리포트는 `/Users/kyu.lee/.hub-runner/reports/m3/M3-1126-R/report.md` 에만 1회 저장. 어떤 git repo 에도 리포트 쓰지 않음.
- relay 작업 아님 — pos-m3 worktree 의 agilo-medusa-pos-fork 에서 feat/M3-1126-R 브랜치로 작업.
- 실행 시간: ~35분 (60분 한도 내).
