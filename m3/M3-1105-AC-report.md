# M3-1105-AC Report — Delivery Checkout (Fulfill 2/2 앱 몫)

**브랜치**: `feat/m3-1105-ac-delivery-checkout`
**PR**: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/75
**Base**: pos-m3 `master` (cad7446 · M3-1105-AB #73)
**Commit**: `459386b` — `feat(m3-1105-ac): Delivery Checkout 단계 — 받는 사람·전화·주소·메모 → tenders body.delivery`
**Agent**: claude-opus-4-7
**완료 시각**: 2026-11-10

> ⚠️ **#206 (M0-1105-Z storeport) 배포와 함께 가야 함.** 본 PR 는 서버 계약과 1:1 shape 으로 요청/화면만 완성 — 서버 미배포 상태에선 실 결제가 400 로 반려된다 (디자인 의도).

---

## §0 대사표 — 건드리는 파일 목록 (확정)

| 파일 | 이유 |
| --- | --- |
| `components/payment/OrderTypePicker.tsx` | Delivery 활성 (disabled:true 제거 · sub 라벨 교체) |
| **NEW** `components/payment/DeliveryInputs.tsx` | 받는 사람·전화·주소 1~6줄·메모 입력 + `isDeliveryValid` · `toDeliveryBody` 규약 |
| **NEW** `app/checkout/delivery/[draftOrderId].tsx` | Delivery 1 화면 (Fulfill 2/2 · Next 가드) |
| `app/checkout/[draftOrderId].tsx` | Pay 분기: delivery → `/checkout/delivery/...`, else 기존 tender-cash |
| `app/checkout/tender-cash/[draftOrderId].tsx` | route param `delivery` (JSON) 받아 body 에 전개 · cash + card 두 경로 공통 |
| `api/hooks/pos-payments.ts` | `PosTenderInput.delivery?` 필드 추가 (#206 shape) |
| `app/orders/[orderId].tsx` | Delivery 블록 (recipient/phone/address/note) — `order.metadata.delivery` 읽음 |
| `components/receipt/ReceiptCard.tsx` | 영수증 Delivery 블록 (MONO · snapshot.delivery) |
| `types/receipt.ts` | `ReceiptSnapshot.delivery?` 타입 추가 |
| `lib/printer/receipt-escpos.ts` | ESC/POS 영수증 Delivery 블록 (32자 wrap · `centerLinesAsLeft` 재사용) |
| **NEW** `scripts/m3-1105-ac-assertions.mjs` | deep-equal fixture · 필수 가드 · raw hex 0 체크 |
| **NEW** `scripts/m3-1105-ac-screenshots.mjs` | Playwright 스샷 3장 |

**꼭 필요한 줄만**: #73 (toast)는 `showToast.error` 호출 1곳만 재사용 (미건드림) · #72 (OptionChip)는 그대로 · #70 (success) 는 미건드림.

---

## §1 Delivery 입력 화면 (결제 전 1 화면)

**경로**: `/checkout/delivery/[draftOrderId]` · Checkout 에서 Delivery 선택 + Pay 로 진입.

| 필드 | 규칙 |
| --- | --- |
| Recipient name | 필수 · trim · "Recipient name is required" |
| Phone | 필수 · `+62\|0` 로 시작 · 숫자 8~15 자리 · 공백·하이픈·괄호 허용(strip 후 검사) · "Enter a valid phone (starts with +62 or 0, 8–15 digits)" |
| Address line 1 | 필수 · "Address line 1 is required" |
| Address line 2~6 | 선택 · `+ Add address line` 버튼 · 삭제 가능 · ≤6 하드룰 |
| Note | 선택 · multiline |

- Next 버튼은 `isDeliveryValid(delivery)` 가 true 일 때만 활성.
- `LayoutWithKeyboardAvoidingScroll` (`react-native-keyboard-controller`) 로 키보드가 칸을 가리지 않음.
- iPad 가로/세로 · 폰 모두에서 안전영역 보존.

---

## §2 tenders 요청 body (서버 계약 #206 과 동일)

```ts
{
  provider_id: 'pp_cash_default' | 'pp_edc_manual_default',
  order_type: 'delivery',
  input: { ... },
  delivery: {
    recipient_name: 'Siti Rahmawati',
    phone: '+628111222333',
    address_lines: [
      'Jl. Sudirman Kav. 25',
      'Apartemen Taman Rasuna Tower 3 Lt. 12',
      'Jakarta Selatan 12960',
    ],
    note: 'Simpan di meja resepsionis',
  },
}
```

- `toDeliveryBody` 는 recipient_name/phone 을 `.trim()` · address_lines 는 공백 trim 후 빈 줄 제거 (서버 400 규칙 보수적 미러).
- Takeaway/Pre-order 는 `order_type !== 'delivery'` 가드로 `delivery` 키를 **보내지 않음** (회귀 0).
- 서버 400 (영어) 는 캡슐 토스트 error 로 그대로 노출 (#73 `showToast.error`).

---

## §3 주문 상세·영수증 Delivery 블록

**주문 상세** (`app/orders/[orderId].tsx`):
- `order.metadata.delivery` 를 읽음 (Medusa SDK 응답에선 top-level `delivery` 가 사라지므로 metadata 가 실질 SoT — M0-1105-Z report §0 "metadata.delivery 는 stage 운영 상태 + M3 fixture 호환 미러" 의 설계 그대로).
- Recipient · Phone · 주소줄 (배열 다중행) · Note (있으면) — Customer 섹션 아래에 별도 "Delivery" 블록.

**영수증** (`components/receipt/ReceiptCard.tsx` + `lib/printer/receipt-escpos.ts`):
- `snapshot.delivery` 를 그대로 렌더 (서버 미배포 — 실 snapshot 에 delivery 필드 나오는 시점부터 보임).
- 58mm 32자 wrap 은 `centerLinesAsLeft` 재사용.

---

## §4 서버 400 — 화면/요청 모양 검증

로컬에 서버 (#206) 가 없어 실 400 재현은 불가. 대신 어설션 (`scripts/m3-1105-ac-assertions.mjs`) 이 요청 모양을 정적으로 검증:

```
✅ (a) toDeliveryBody deep-equal #206 fixture · trim + 빈라인 제거
✅ (b) cash · card body 둘 다 resolvedType==="delivery" 때만 delivery 포함
✅ (c) delivery route Next = disabled when !isDeliveryValid
✅ (c) isDeliveryValid 규약: 필수/phone/주소줄 수 가드 OK
✅ (d) 신규/수정 파일 raw hex 0
✅ (e) OrderTypePicker: delivery 활성화 (disabled 없음)
✅ (f) ReceiptCard delivery 블록 렌더 경로 OK
✅ (f) Order details Delivery 블록 렌더 (metadata.delivery 읽음)
✅ (g) PosTenderInput.delivery? 선언 존재 · #206 shape

M3-1105-AC assertions PASS ✓
```

`node scripts/m3-1105-ac-assertions.mjs` 실시간 PASS.

---

## §5 Playwright (실 브라우저 확인)

`node scripts/m3-1105-ac-screenshots.mjs` 로 web dist (`npx expo export -p web`) 를 띄워 chromium 헤드리스에서 확인. 스샷 3장 `screenshots-m3-1105-ac/`:

- `01-ipad-delivery-empty.png` — iPad 가로 (1366×1024) · Delivery 입력 빈칸 · Next disabled · 각 칸 밑 영어 안내 ("Recipient name is required" · "Phone is required" · "Address line 1 is required").
- `02-ipad-delivery-filled.png` — 같은 화면 · 받는 사람/전화/주소 3줄/메모 모두 채움 · Next: Payment 활성 (ink 배경).
- `03-ipad-order-delivery-block.png` — 주문 상세 모달 · **Delivery 블록 Recipient=Siti Rahmawati · Phone=+628111222333 · Address 3줄 · Note=Simpan di meja resepsionis** · 하단 Payments 섹션에 Delivery 칩 + Awaiting dispatch 배지 (이미 M3-1105-X 작업으로 노출됨 · 회귀 0).

Playwright 수행: 로그인 → 셋업 자동 → 라우트 pushState → 채움/스크롤. tenders 실 POST 는 서버 미배포로 검증 안 함.

---

## §6 Kyu 실기 항목 (PR 본문)

Kyu 11-09 PR #65 Q1=A ("배송지·받는 사람 연락처 = 결제할 때(Checkout 주소 단계)") · Q2=A (Fulfill 필수 = 택배사만) · Q3=A ("Delivery = 1단계") 완전 반영:

1. **Delivery 활성** → OrderTypePicker 에서 Delivery 가 "Coming soon" 없이 선택 가능.
2. **결제 전 주소 단계** → Pay 누르면 `/checkout/delivery/...` 로 분기, 받는 사람·전화·주소·메모 입력.
3. **결제 바로 뒤 → 주문 상세에 배송지 보임** (실기 핵심) → Delivery 블록 자동 노출.
4. **Delivery = 1단계** → tenders body 1회 · 서버가 metadata.delivery.stage='awaiting_dispatch' 를 선셋 (M0-1105-Z 쪽 책임).

---

## §7 운영 영향 · 롤아웃 노트

- **"#206 과 함께 배포 필요"** (storeport M0-1105-Z) — 이 PR 단독 배포 시 Delivery 결제는 서버가 모를 수 있어 400 반환 가능 (방어적으로는 safe · 기존 Takeaway/Pre-order 는 완전 무영향).
- 하드룰 준수: raw hex 0 (토큰만) · 결정 버튼 ink · 선택 상태 #3F3F3F 는 OptionChip 토큰 그대로.
- 영어 문구만 (칸 아래 안내 · placeholder · heading).

---

## §8 바꿀 파일 요약

```
 api/hooks/pos-payments.ts                   |  9 +++
 app/checkout/[draftOrderId].tsx             | 14 ++++-
 app/checkout/delivery/[draftOrderId].tsx    | NEW (42)
 app/checkout/tender-cash/[draftOrderId].tsx | 40 +++++++++++--
 app/orders/[orderId].tsx                    | 88 +++++++++++++++++++++++++++++
 components/payment/DeliveryInputs.tsx       | NEW (179)
 components/payment/OrderTypePicker.tsx      |  6 +-
 components/receipt/ReceiptCard.tsx          | 22 ++++++++
 lib/printer/receipt-escpos.ts               | 15 +++++
 scripts/m3-1105-ac-assertions.mjs           | NEW (139)
 scripts/m3-1105-ac-screenshots.mjs          | NEW (144)
 types/receipt.ts                            |  8 +++
```

**Typecheck**: 사전 `app/_layout.tsx · global.css` 한 건 외 0 신규 에러.

---

## 다음 단계

- storeport #206 CI pass → 양쪽 동시 배포.
- 실 400 (phone 형식 불량 등) 재현은 서버 up 되면 Kyu 실기로 즉시 확인 가능 (영어 캡슐 토스트).
- M3-1105-X 의 Fulfill 시트 (Delivery courier) 와 함께 완결 — 본 PR 는 awaiting_dispatch 까지만 유도.
