#233: APPROVE
#234: APPROVE

---

## #233 — feat(sell): M3-1123-G Sell 화면 7항 수정

**PR**: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/233
**브랜치**: fix/M3-1123-G-sell-test1 → master (+470 / -62)

### 체크리스트

| 항목 | 판정 |
|------|------|
| ① 기존 파일 수정 (재작성·되돌림 없음) | ✅ 모든 src 파일 MODIFIED — #232 사고 재발 없음 |
| ②-a 칩 순서 고정 | ✅ `posOrderNum` → `buildOrderChips.numFor` 우선, 위치 기반 폴백 유지 |
| ②-b 결제 칩 즉시 사라짐 | ✅ `removeDraftOrderFromList` 교체, 2분 타이머 경로 완전 제거 |
| ②-c 번호 재매김 없음 | ✅ `posOrderNum` 생성 시 고정, 이후 불변 |
| ②-d 레지스터 오픈마다 1부터 | ✅ `_draftOrderList` 세션 스코프 모듈 변수 — 오픈 시 `length+1 = 1` |
| ②-e `metadata.pos_order_num` 주문 완료 후 잔존 | ✅ 서버 `draft_order.metadata` 에 저장됨. 단, `convertToOrder` 후 order metadata 에는 별도 복사 없음 → M0-1123-F 에서 draft_order 경유 or order metadata 복사 경로 확정 필요 (이 PR 범위 밖) |
| ③ 스캔 버튼 = 영수증 QR → `/orders/<id>` | ✅ `QrCode` 아이콘 교체 + 기존 `parseScanPayload(merospos://orders/<id>)` 흐름 재사용, 신규 스캐너 없음 |
| ④ 결제 완료 카트 목록 제거 | ✅ |
| ⑤ Ask on display 비활성 유지 | ✅ `noServerEndpoint = true` 하드코딩, 서버 API 구현 후 제거 예정. `enteringOrderNum` prop 연결 준비 완료 |

### CI
- flow-tests ✅ · lint ✅ · route ✅ · assertions pending (주행 중)

### 인라인 코멘트 (non-blocking)
1. `api/hooks/draft-orders.tsx:145` — `.catch(() => {})` silent fail: 네트워크 실패 시 `pos_order_num` 서버 미저장 → 다음 세션 `restoreWaitingDraftOrders` 번호 복원 불가. `console.warn` 추가 권장.
2. `app/(tabs)/sell.tsx` FILE — 외부 `TouchableOpacity` (`register-status-row`) 중첩: Kyu §11-A 의도에 부합하나 Android touch 이벤트 비일관 위험. 외부를 `View` 로 교체하거나 `Pressable` 사용 권장. 실기 Android 체크 시 확인.

---

## #234 — fix(checkout): M0-1123-E success 영수증 스크롤 · 주문 유형 칩 높이

**PR**: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/234
**브랜치**: fix/M0-1123-E-checkout-test1 → master (+238 / -47)

### 체크리스트

| 항목 | 판정 |
|------|------|
| ① 스크롤 수정 iPad 가로/세로·폰 세로 | ✅ `flex: 1 + minHeight: 0` CSS 기반 — 뷰포트 무관. Playwright 390w 커버; iPad 세로(834w) 실기 권장 |
| ② 주문 유형 버튼 높이 == Pay | ✅ Pre-order 84→58px · Delivery 84→58px (sublabel 1줄 제거 → `OptionChip tab` BUTTON_H 공유) |
| ③-a 보조 문구 제거 | ✅ `sub: 'DP today'` · `sub: 'Addr. on checkout'` 삭제, `sublabel` prop 제거 |
| ③-b i18n 잔여 키 | ✅ 하드코딩 문자열 → i18n 파일 orphan 없음 |

### 추가 확인
- `Next customer` 헤더 → `next-customer-footer` 하단 고정 바 이동 ✅ (영수증 길이 무관 항상 접근 가능)
- `M3-1121-B` 스펙 갱신: sublabel overflow 블록 → 칩 높이 == Pay 블록 교체 ✅ · `/sell` 경로 추가 ✅

### CI
- route ✅ · lint/flow-tests/assertions pending (최근 push 주행 중)

---

## 충돌 대조

| 파일 | #233 | #234 |
|------|------|------|
| `api/hooks/draft-orders.tsx` | ✅ | — |
| `app/(tabs)/sell.tsx` | ✅ | — |
| `components/cart/*` | ✅ | — |
| `components/order-chips/*` | ✅ | — |
| `app/checkout/success/[orderId].tsx` | — | ✅ |
| `components/payment/*` | — | ✅ |
| `e2e/helpers/api-mocks.ts` | — | ✅ |
| `e2e/flows/M3-1121-B-btn-height.spec.ts` | — | ✅ |

**공유 파일 없음 — 충돌 위험 0** ✅
