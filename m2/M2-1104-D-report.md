---
round: M2-1104-D
pr:
  fork: agilo-medusa-pos-fork#19 (stacked on PR #18)
commit: 7e2cb621f6bfa2d91c64ceceacceb48472ae5a73
outcome: BT-58D 블루투스 영수증 인쇄 1 안 (ble-plx + ESC/POS) ship · 실측은 dev-client 뒤 · 결제 흐름 blocking 0
kyu_checks: 5 (페어링 · test print · 주문 영수증 · 프린터 OFF 시 결제 안 깨짐 · 자동 재연결)
---

# M2-1104-D · BT-58D BLE 영수증 인쇄 1안 구현

**일자**: 2026-11-04 · **허브**: M2 · **상대 리포**: `agilo-medusa-pos-fork` · **base**: `feat/m2-1104-c-eas-dev-prep` (PR #18 · stacked)

## 1. 안건 ↔ 상태

| # | 안건 | 상태 |
|---|------|------|
| 1 | BLE 스캔·페어링·저장 (last printer 기억) | ✓ `lib/printer/ble.ts` · SecureStore `meros.printer.lastId.v1` |
| 2 | 테스트 인쇄 (MEROS 헤더 · 날짜 · "TEST OK") | ✓ `buildTestReceipt` + settings 화면 버튼 |
| 3 | 주문 완료 후 영수증 (품목·수량·금액·합계·결제수단 · 58mm 32자) | ✓ `buildOrderReceipt` + `onSuccess` 훅 1 줄 |
| 4 | 프린터 없으면 조용히 스킵 (결제 흐름 blocking X) | ✓ fail-open · dynamic require · `try/catch` 전부 |
| 5 | 웹/Expo Go 기동 crash 없음 | ✓ Playwright 4/4 PASS · ble-plx 동적 로드 |

## 2. 변경 파일 (owner 100%)

| 파일 | 변경 | 라인 |
|------|------|------|
| `package.json` | +2 dep | 2 |
| `package-lock.json` | regen | 큼 |
| `app.json` | BLE plugin + iOS 권한 2 | 11 |
| `lib/printer/escpos.ts` | 신규 (pure 바이트 빌더) | 121 |
| `lib/printer/receipt.ts` | 신규 (레이아웃) | 120 |
| `lib/printer/ble.ts` | 신규 (동적 require · 저장 · fail-open) | 211 |
| `lib/printer/index.ts` | 신규 (공개 API) | 42 |
| `app/settings/printer.tsx` | 신규 (scan/pair/test UI) | 135 |
| `app/checkout/[draftOrderId].tsx` | **1 훅** (onSuccess → printOrderReceipt) | 24 |
| `scripts/m2-1104-d-escpos-assertions.mjs` | 신규 (29 assertions) | 172 |
| `docs/runbooks/printer.md` | 신규 | 107 |

금지 파일 (`login.tsx` · `contexts/auth.tsx` · `(tabs)/products.tsx` · `setup-wizard/*`) **미수정**.

## 3. 자동 검증

### 3-A. Playwright (Expo 웹 · BLE 모듈 부재 환경)

```
--- (1) 미인증 상태 index.html (DSN 미설정) → 기동 ---
  ✓ pageerror 0건
--- (2) 로그인 화면 DOM 도달 ---
  ✓ 로그인 화면 요소 존재
--- (3) console.error 0건 ---
  ✓ 0건
--- (4) Sentry 심볼 흔적 (번들 포함 확인) ---
  ✓ 엔트리 번들 로드

4/4 passed · 0 failed
```

**프린터 모듈 없는 환경 (= Expo Go 와 동일한 조건) 에서도 기동 · 로그인 도달 · console.error 0**. `ble.ts` 의 dynamic require + Platform.OS==='web' 분기가 작동.

### 3-B. ESC/POS 단위 어설션 (29 개)

```
(1) EscPosBuilder 원자 명령 — INIT · LF · CUT: 3/3
(2) 정렬·볼드 — ESC a / ESC E: 4/4
(3) kv 너비 정렬 (32col): 3/3
(4) chunkBytes 분할 180: 4/4
(5) buildTestReceipt — MEROS · Test Print · TEST OK · 컷: 5/5
(6) buildOrderReceipt — 품목·합계·결제수단·푸터·컷: 10/10

29/29 passed · 0 failed
```

tsx → cjs 트랜스파일 후 createRequire 로 로드 — `escpos.ts` / `receipt.ts` pure 보장을 검증 (RN import 가 있었다면 node 실행 즉시 깨짐).

### 3-C. clean-clone `npm ci --legacy-peer-deps`

```
added 975 packages, and audited 976 packages in 15s
exit 0
```

### 3-D. tsc · expo lint (M2 소유 파일)

```
error 0
기존 global.css side-effect import 1건 (범위 밖 · M2-1104-A 때부터)
```

## 4. 설계 핵심

### 4-A. fail-open 전체

- `printBytes` · `printTestReceipt` · `printOrderReceipt` 전부 `try/catch` 후 boolean 반환.
- 결제 완료 후 프린터 실패해도 다이얼로그 정상 노출. **주문은 성공한 상태** 이므로 인쇄 실패가 흐름을 깨면 안 됨.

### 4-B. Expo Go / 웹 호환

- `Platform.OS === 'web'` → BLE 즉시 null.
- 그 외: `require('react-native-ble-plx')` 를 try/catch · 모듈 없어도 통과.
- 화면: `bleAvailability().reason` 으로 "Bluetooth unavailable (web/expo-go/module-missing/unauthorized/off)" 배너.

### 4-C. pure 분리

- `escpos.ts` · `receipt.ts` 는 RN import 0 → Node 어설션 가능.
- `ble.ts` 만 RN · SecureStore · Platform 참조.
- 미래 영수증 레이아웃 변경은 `receipt.ts` 만 건드리면 됨.

### 4-D. onSuccess 훅 (1 integration point)

```tsx
completeOrder.mutate(
  { payment_method: paymentMethod, invoice_number: invoiceNumber },
  { onSuccess: () => void printOrderReceipt({ ...ReceiptInput... }) },
)
```

- 1 개 호출 지점. draftOrder.data 는 완료 직전 snapshot 이지만 items/prices/total 은 완료 후와 동일.
- `void` 로 Promise 삼키기 → 결제 완료 흐름 non-blocking.

## 5. Kyu 실측 체크 5개

- [ ] **1. 페어링**: Settings → Printer (deep link `/settings/printer`) → Scan → BT-58D 터치 → "Paired"
- [ ] **2. Test print**: 영수증 1매 (MEROS · Test Print · TEST OK · 컷)
- [ ] **3. 주문 완료 영수증**: 주문 완료 다이얼로그와 동시에 영수증 1매 (품목·수량·단가·합계·결제수단)
- [ ] **4. 프린터 OFF 시**: 결제 흐름 안 깨짐 · 다이얼로그 정상
- [ ] **5. 재시작 후 자동 재연결**: 앱 완전 종료 → 재실행 → 저장된 프린터로 자동

상세 · troubleshooting: `docs/runbooks/printer.md`.

## 6. 범위 밖 (후속 M2-1104-E+)

- `app/(tabs)/settings.tsx` 에 "Printer" row 1 줄 (현 라운드 owner 밖)
- 한글 코드페이지 (ESC t)
- QR 코드 / 바코드
- Sentry breadcrumb (print 실패 시 context)
- 다중 프린터
- Android 실측

## 7. 참고

- PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/19
- 브랜치: `feat/m2-1104-d-printer` · base `feat/m2-1104-c-eas-dev-prep`
- 커밋: `7e2cb62`
