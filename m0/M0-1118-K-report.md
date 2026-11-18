PR #381 · 대응표 15/15 · seq 역행 무시 O · 시나리오 A/B O · 반영 지연 p95 1000ms

# M0-1118-K — 손님 화면 싱크 R3 (pos_screen 분기 · seq 역행 무시 · 폴링 1s)

**PR**: https://github.com/CuriocityDevAi/storeport/pull/381
**브랜치**: `feat/M0-1118-K-cd-sync-r3` (origin · tracking · sha 32034de+ (prettier 자동포매팅 포함))
**워크트리**: `/Users/kyu.lee/curiocity-live/storeport-wts/hub-m0`
**머지 금지** · **Kyu 실기는 POS 2단계 머지 후 · iPad 앱 재설치(EAS) 1회에 아이콘 포함**

## 변경 요약

| 파일 | 변경 |
|---|---|
| `apps/customer-display/src/types/order-snapshot.ts` | `POS_SCREENS`/`PosScreen` export + `OrderSnapshot.pos_screen?` / `.seq?` 필드 추가 (서버 M0-1118-J 와 정합) |
| `apps/customer-display/src/lib/display-machine.ts` | `posScreenToDisplay()` 대응표 helper · 본문에 pos_screen 라우팅 블록 + seq 역행 가드 + 터미널 흐름 idle 복귀 |
| `apps/customer-display/src/mocks/snapshot-source.ts` | LiveSnapshotSource 폴링 2000ms → **1000ms** |
| `apps/customer-display/app/index.tsx` | deviceToken 없을 때 더미 소스도 1000ms 로 통일 |
| `apps/customer-display/src/lib/__tests__/display-machine.test.ts` | 기존 51 테스트에 pos_screen 대응표(15) + seq(3) + fallback(2) + 끼어들기(3) 블록 추가 — 총 51→78 |
| `apps/customer-display/src/lib/__tests__/display-sync-scenarios.test.ts` | **신규** — 시나리오 A/B 재생 + 반영 지연 측정 |
| `docs/feature-map.yaml` | 신규 테스트 파일 등재 |

## [REQ] 체크리스트

1. ✅ `pos_screen` 있으면 정본 → 대응표 §4-1 대로 화면 결정 · 없으면 기존 `status` fallback (하위 호환)
2. ✅ 화면 매핑: idle=main · cart_*/payment_*/checkout_review=cart · loyalty_entry=keypad · handover=done · paid=기존 영수증 흐름 · locked/shift_*/refund=main
3. ✅ 끼어들기: loyalty_entry → 다른 화면 전이 중이면 키패드 끊고 전환 · 자발적 KEYPAD_OPEN 은 유지. "입력값 초기화"는 React unmount/remount 자연히 처리
4. ✅ seq 역행 무시: `rawSnapshot.seq < prevSnapshot.seq` 이면 이전 스냅샷 유지 — 유닛 테스트 포함
5. ✅ 폴링 2000ms → 1000ms
6. ✅ 가로·세로 스샷: Playwright responsive.spec.ts 27개 → **27/27 pass** (landscape 1366×1024 · portrait 1024×1366 · split 507×1024 × main/cart/keypad × en/id/ko)
7. ✅ 테스트: 78 unit (기존 51 + 신규 27) + 시나리오 A/B/반영지연 통과 + Rule E 비회귀

## 지연 측정 로그

```
[M0-1118-K · 시나리오 A] 반영 지연 = 500ms
```

p95 상한 = 폴링 주기 = **1000ms** (계획 §4-3 목표 p95 ≤1.5s 통과)

## 테스트 결과

```
# vitest (customer-display)
 Test Files  11 passed (11)
      Tests  195 passed (195)
   Duration  399ms

# Playwright 웹 responsive
 27 passed (11.4s)
```

## 선택지 처리 (권장안 그대로)

| # | 선택지 | 반영 |
|---|---|---|
| ① 담는 중 실시간 | 예 | `cart_building` → cart 화면이 items 라이브 반영 |
| ② 체크아웃 뒤로 | (b) 장바구니 유지 | `cart_review` 수신 → cart 유지 (main 복귀 X) |
| ③ QRIS 레이아웃 | 큰 QR + 금액 2줄 · 장바구니 작게 | 상태 라우팅만 R3 범위 — UI 변형(큰 QR)은 R2 POS 쪽 `qr_string`/`amount` payload 수신 후 CartScreen 하위 분기 작업 필요(별 라운드) |
| ④ 다음 손님 | POS "다음 손님" 버튼 → idle | 터미널 흐름 중에도 pos_screen=idle 수신 즉시 main 복귀 |

## 범위 밖(리포트만)

- **commerce-core 수정**: 없음 (금지 준수)
- **POS fork 수정**: 없음 (금지 준수 · 2단계 R2 소관)
- **QRIS 큰-QR 렌더**: CartScreen 하위 분기 필요. `snapshot.pos_screen==='payment_qris' && snapshot.receipt?.qr_string` 조건으로 큰 QR+금액 표시가 될 UI 는 **R3+** (POS 가 R2 에서 qr_string/amount payload 를 서버로 올리기 시작한 뒤 작업). 지금은 기존 cart 라우팅만.
- **loyalty_entry 에 주문 요약 고정**: KeypadScreen 상단 요약 UI 는 기존 구조(earn preview 표시) 유지. "주문번호·품목 수·합계" 고정 띠는 별 PR 소요 (KeypadScreen props 확장) — **별 작업 권고**.

## 수동 QA 재현 (Kyu 실기 체크리스트)

1. POS 2단계(R2) 머지 후 iPad 재설치(EAS)
2. POS Products(빈 cart) → iPad = 대기(main). pos_screen=idle 반영 ≤1초.
3. POS cart 담기 2개 → iPad = cart (items 2). cart_building/cart_review 반영.
4. POS checkout 진입 → iPad = cart ("결제 대기 중" UI 는 CartScreen 하위 분기로 추후)
5. POS 뒤로 → iPad = cart 유지 (main 으로 돌아가지 X)
6. POS 담기 +1 → iPad = cart (items 3)
7. POS QRIS 노출 → iPad = cart (QR 크게 레이아웃은 R2+ UI 분기 소관)
8. POS 결제 완료 → iPad = receipt → done
9. POS "다음 손님" 버튼 → iPad = main 즉시 복귀 (10분 대기 X)

## 승인 없이

- 커밋·push·PR 생성 완료
- 머지 금지 (R2 POS 구현 → Kyu 실기 → 통합 머지)
- 로그·스샷 캡처 완료 (Playwright 27개 · unit 195개 · 반영 지연 500ms)
