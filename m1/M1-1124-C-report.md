M1-1124-C · 판정: 완료 — assertions·flow-tests 초록 · playwright 실행 도달(22/27 pass · 5건 pre-existing · M1-1124-B spec harness 미등록).

## 실패 원인 2건

1. **assertions `m2-1105-n-accent-guard`**: `CustomerPhoneStatus.tsx:88` typing 상태에서 `border-accent bg-accent-soft` 사용 → D1 팔레트 로고 점 외 accent 금지 규칙 위반.
2. **flow-tests `m3-1105-bw`**: `checkout/tender-cash/[draftOrderId].tsx` 에 `import { Stack, ... } from 'expo-router'` 잔존 → "Stack.Screen 제거 후 Stack import 없음" 테스트 실패.

## 수정 내용

| 파일 | 변경 |
|------|------|
| `components/customer-display/CustomerPhoneStatus.tsx` | typing 상태 `border-accent bg-accent-soft` → `border-line bg-surface-muted` |
| `app/checkout/tender-cash/[draftOrderId].tsx` | `Stack` import 제거 · `useNavigation` + `useLayoutEffect.setOptions` 로 headerRight 교체 |
| `api/hooks/pos-loyalty.ts` | `usePatchSnapshotOrderNum` 추가 (`PATCH /admin/pos/customer-display/snapshots/:id`) |
| `app/checkout/[draftOrderId].tsx` | 주문 매핑 시점 1회 `pos_order_num` PATCH (snapshot.order_id === draftOrderId · 1회 guard ref) |

## pos_order_num 추가 여부

**추가함.** storeport #416 계약대로 `usePatchSnapshotOrderNum` 구현 + checkout 진입 화면에서 1회 fire. 실패 시 `console.warn` 삼킴 (결제 흐름 무관).

## 필드명 맞춤 확인

| 필드 | #247 읽기 위치 | 판정 |
|------|---------------|------|
| `phone_entry_state` (waiting\|typing\|done\|skipped) | `classifyPhoneStatus` + `refetchInterval` | ✓ 일치 |
| `phone_partial` | `classifyPhoneStatus` typing 분기 | ✓ 일치 |
| `pos_order_num` | 이번 커밋에서 PATCH 전송 추가 | ✓ 추가 완료 |

## playwright 결과

27개 중 22 PASS · 5 FAIL. 실패 5건은 모두 pre-existing (`m1-1105-ao` quick-round 버튼, `m3-1105-d` cash-quick-round 타임아웃, `m3-1105-m` preorder summary, `m3-1105-p` payment-method-tabs, `m3-1105-n` quote-receipt) — M1-1124-C 수정 범위와 무관. `M1-1124-B-phone-status.spec.ts` 는 scripts/ 에 harness 미등록으로 이번 CI 미실행.

커밋: `aaee978` · PR #247 · 브랜치 `feat/M1-1124-B-phone-status`
