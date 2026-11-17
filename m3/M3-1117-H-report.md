PASS — CustomerBadge 번호 전용 손님 마스킹 번호 표시 수정 완료.

## 수정 내용
- `app/(tabs)/cart.tsx`: `maskE164` import 추가, `CustomerBadge` 로직 수정
  - 이름 있으면: 이름 + (email ?? maskedPhone)
  - 이름 없고 subtitle 있으면: "Customer" + subtitle (email 없으면 마스킹 번호)
  - 둘 다 없으면: "—"

## 테스트
- `__tests__/m3-1117-h.test.ts` 추가 (6개 케이스)
- 전체 테스트 44파일 528개 통과

## REQ 2 — 같은 패턴(email을 이름 대신 표시) 남은 곳 조사
| 파일 | 패턴 | 상태 |
|---|---|---|
| `app/checkout/[draftOrderId].tsx:257` | "E-Mail" 라벨 아래 `{customerEmail}` 표시 | 라벨 있음 → 의도적 |
| `app/orders/[orderId].tsx:79` | `{ label: 'Mail', value: customerEmail }` | 라벨 있음 → 의도적 |
| `lib/pos-order-adapter.ts:34` | 마스킹 번호를 email 필드에 주입하는 어댑터 | 의도적 workaround (기존 렌더러 재사용) |

이름 대신 email을 primary identifier로 표시하는 비의도적 패턴은 cart.tsx가 유일했음.
