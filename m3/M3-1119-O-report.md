storeport PR #400 (+fork PR #208) · 원인 POS송신(qr_string 미저장/paid 미발신) + 손님수신(state machine receipt 누락) · 자동번호 O · Skip O · QR O · 단계동기화 O · NaN O · 주문번호 O · 겹침 O · 테스트 201/201(cd) + 539/539(core)

## 버그별 근본 원인 및 수정

| # | 증상 | 근본 원인 | 수정 위치 |
|---|------|-----------|-----------|
| 1 | 번호 입력 자동 미표시 | POS checkout 화면이 `checkout_review` emit → CD는 cart 화면 유지 | fork: `checkout/[draftOrderId].tsx` → `loyalty_entry` emit |
| 2 | Skip 버튼 없음 | `afterPay=false` 시 `keypad.cancel` 라벨 사용 | storeport: `KeypadScreen.tsx` → 항상 `keypad.skip` 사용 |
| 3 | QR 미렌더 | 서버가 `qr_string` body 필드 저장 안 함 (checkout-snapshot route 에서 무시) | storeport: route + model + service + lifecycle + migration |
| 4 | 결제 후 QR 화면 갇힘 | (a) state machine에 `receipt` 라우팅 누락; (b) POS success screen이 `paid` emit 안 함 | storeport: `display-machine.ts` + fork: `success/[orderId].tsx` |
| 5a | Rp NaN | 서버가 items JSON에 `line_total` key 사용, 클라이언트는 `total` 기대 | storeport: checkout-snapshot route `line_total` → `total` |
| 5b | 주문번호 내부 ID 노출 | 서버가 `display_id` 미전달, 클라이언트 `order_id.replace(/^ord_/, "")` 사용 | storeport: model/service/lifecycle + CD `index.tsx` |
| 5c | 제목·언어칩 겹침 | `headerRow` storeName `flex` 미설정 | storeport: `QrisScreen.tsx` storeName `flex:1` |

## storeport 변경 (`fix/M3-1119-O-cd-sync` → PR #400)

### Backend (apps/commerce-core)
- `checkout-snapshot/route.ts`: snapItems `line_total` → `total` · `qr_string`/`amount`/`display_id` body 파싱 및 upsert 전달
- `order_snapshot/model.ts`: `qr_string TEXT` · `amount bigNumber` · `display_id number` 컬럼 추가
- `service.ts`: `upsertSnapshotForRegister` / `startSnapshotForRegister` 신규 필드 지원
- `lifecycle.ts`: `serializeSnapshot` 반환에 `qr_string` · `amount` · `display_id` 추가
- `Migration20261119000002.ts`: `order_snapshot` 신규 컬럼 마이그레이션

### Frontend (apps/customer-display)
- `order-snapshot.ts`: `display_id?: number | null` 타입 추가
- `index.tsx`: `orderNumber` = `display_id` 우선, 폴백 `order_id` suffix
- `display-machine.ts`: pos_screen 라우팅 블록에 `receipt` 케이스 추가 (핵심 버그)
- `KeypadScreen.tsx`: `resolvedBackLabel` → 항상 `keypad.skip` (Lewati 등)
- `QrisScreen.tsx`: NaN guard `Number.isFinite` + storeName `flex:1` 겹침 수정
- `display-sync-scenarios.test.ts`: QRIS→receipt 전환 단위 테스트 추가

## fork 변경 (`fix/M3-1119-O-cd-emit` → PR #208)
- `checkout/[draftOrderId].tsx`: `checkout_review` → `loyalty_entry` (번호 입력 자동 표시)
- `success/[orderId].tsx`: 마운트 시 `pos_screen: 'paid'` 자동 emit (단계 동기화)
- `tender-qris/[draftOrderId].tsx`: `qrString` param → `currentQrString` state 사용 (QR 재발급 반영)
- `hooks/usePosScreen.ts`: NaN amount guard

## 검증
- 타입 체크: storeport 0 에러 · fork 기존 에러만 (신규 없음)
- 테스트: CD 201/201 pass · commerce-core 539/539 pass
- UI 검증: 미검증 (시뮬레이터 미구동) · Metro 재시작으로 확인 가능 · 네이티브 변경 없음
- **M2-1119-S 이후 연결 필요**: 결제 완료 화면 이후 "Next customer" 흐름은 M2-1119-S 소유 범위

## iPad Split View 실기 확인 항목 (Kyu)
1. Products → 카트 담기 → Checkout 탭 → 손님화면: 번호 입력 자동 표시
2. 번호 입력 화면: Skip(Lewati) 버튼 존재 · Batal 대신
3. QRIS 선택 → 손님화면: QR 코드 렌더링
4. QRIS 결제 완료 → 손님화면: QR 화면 → receipt 화면 전환
5. POS Products 복귀 → 손님화면: 대기 화면
6. 금액 표시: "Rp NaN" 대신 실제 금액
7. 주문번호: "ord_01M7SP..." 대신 "#156" 형태
8. 좁은 화면: 제목과 언어칩 겹침 없음
