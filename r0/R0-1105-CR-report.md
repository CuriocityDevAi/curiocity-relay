# R0-1105-CR 리뷰 보고서 — fork #111 (M3-1105-BF)

**판정: APPROVE**
CI 실패 3건(m0-1105-at·m3-1105-aw·m3-1105-ba)·lint 실패 모두 master(82c0751) 사전 존재 — PR 고유 신규 실패 없음. F1/F2/F3 모두 통과.

## 검증 표

| 항목 | 결과 | 근거 |
|------|------|------|
| **[REQ1] 옛 dev client 안전** | ✅ PASS | `lucide-react-native` master package.json 기존 의존성(`^0.544.0`). `scan-barcode.tsx` master 사전 존재. `banknote.tsx`·`credit-card.tsx` 순수 JS 래퍼 — 새 네이티브 모듈/패키지 0. |
| **[REQ2] F1 아이콘 매핑** | ✅ PASS | Cash→Banknote, Card→CreditCard, QRIS→ScanBarcode 정확히 매핑. |
| **[REQ2] semantic 색 토큰** | ✅ PASS | `color={TOKEN_INK}` — 컴포넌트 내 raw hex 미사용. `TOKEN_INK='#0E1B18'`은 brand.ts 상수, 인라인 hex 아님. |
| **[REQ3] F2 toast BB 사고** | ✅ PASS | `showToast.success(...)` → `router.replace('/products')` 순서. 전역 싱글톤이므로 화면 전환 후 소멸 없음. 문구 "Delivery order paid · #N" / "Pre-order paid · #N" 확인. |
| **[REQ4] F3 Done back() 대상** | ✅ PASS | 모든 경로(Orders목록→detail, QR스캔→detail, checkout success→replace→detail)에서 back stack에 최소 1개 항목 보장. tab root가 stack 최하단에 항상 존재. |
| **[REQ4] isVoidedOrCanceled 제거** | ✅ PASS | 변수 자체는 유지, 다른 버튼(Collect Balance·Hand Over·Fulfill·Void/Refund) 모두 `!isVoidedOrCanceled` 가드 그대로. Done 조건부 블록만 제거 — 다른 버튼 가시성 영향 없음. |
| **[REQ5] master 충돌** | ✅ PASS | `mergeable: MERGEABLE`. PR 브랜치가 BE fix를 직접 포함하지만 GitHub 자동 병합 가능. |
| **[REQ5] CI** | ✅ PASS | assertions 3건·lint 실패 — master 82c0751 동일 실패 확인됨. PR 신규 실패 0. |

## 메모

- `m3-1105-aw` "(11) VOID banner text-ink" 실패 — PR 미변경 파일, master 사전 존재.
- `m3-1105-ba` MODULE_NOT_FOUND — lib/qr.js 컴파일 이슈, master 사전 존재.
- `m0-1105-at` prettier ReceiptCard.tsx — PR 미변경, master 사전 존재.
- Lint error `cart.tsx:494` — PR 변경 파일 아님, master 사전 존재.
