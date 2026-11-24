GREEN

# M3-1124-K — PR #251 CI 재실행 결과

## 개요

- **PR**: CuriocityDevAi/agilo-medusa-pos-fork#251
- **브랜치**: feat/M3-1124-I-multi-store-pos
- **커밋**: 5221021 (fix(pos-settings): M3-1124-J)
- **실패 원인**: Kyu 노트북 뚜껑 닫힘(sleep ~12분) — 코드 문제 아님
- **러너 상태**: Mac self-hosted 2대 모두 online (curiocity-mac-fork, curiocity-mac-fork-light)

## 재실행 명령

```
gh run rerun 45377957613 --failed --repo CuriocityDevAi/agilo-medusa-pos-fork  # Lint (취소됨)
gh run rerun 45377957610 --failed --repo CuriocityDevAi/agilo-medusa-pos-fork  # CI (playwright 실패)
```

재실행 시각: 2026-11-24T11:08:40Z (Lint) / 11:08:43Z (CI)

## 잡별 최종 결과표

### Lint workflow (run 45377957613) — Mac self-hosted

| 잡 | 결과 | 소요 | 러너 |
|----|------|------|------|
| route | ✅ SUCCESS | 10s | Mac (curiocity-mac-fork-light) |
| lint | ✅ SUCCESS | 54s | Mac (curiocity-mac-fork-light) |
| **workflow 전체** | **✅ SUCCESS** | **1m 4s** | |

**Lint 경고 목록** (에러 없음, 모두 `!` 경고):
- `components/orders/VoidRefundSheet.tsx#167`: useMemo 의존성 경고 (`orderItems`)
- `components/customer-display/CustomerPhoneStatus.tsx#15,16`: `loyalty-snapshot.ts` 중복 import
- `app/orders/[orderId].tsx#742`: `require()` 스타일 import 금지
- `app/checkout/split-tender/[draftOrderId].tsx#63,68`: `receipt-share.ts` 중복 import
- `app/(tabs)/orders.tsx#1`: `DRAFT_ORDER_DEFAULT_CUSTOMER_EMAIL` 미사용 변수

### CI workflow (run 45377957610) — Mac self-hosted

| 잡 | 결과 | 소요 | 러너 |
|----|------|------|------|
| route | ✅ SUCCESS | 7s | Mac (curiocity-mac-fork-light) |
| heavy-cloud | ⏭️ SKIPPED | — | — |
| assertions | ✅ SUCCESS | 1m 32s | Mac (curiocity-mac-fork-light) |
| flow-tests | ✅ SUCCESS | 58s | Mac (curiocity-mac-fork-light) |
| playwright | ✅ SUCCESS | 5m 33s | Mac (curiocity-mac-fork-light) |
| **workflow 전체** | **✅ SUCCESS** | **5m 39s** | |

## PR 최종 상태 체크

| check | 결론 | 완료 시각 |
|-------|------|----------|
| CI / route | SUCCESS | 10:46:41Z |
| Lint / route | SUCCESS | 10:46:45Z |
| CI / heavy-cloud | SKIPPED | — |
| CI / assertions | SUCCESS | 10:48:18Z |
| CI / flow-tests | SUCCESS | 10:49:22Z |
| Lint / lint | SUCCESS | 11:09:40Z |
| CI / playwright | SUCCESS | 11:14:21Z |

**전체 결과: 🟢 ALL GREEN** (heavy-cloud skipped은 정상 — Mac 러너 경로에서는 항상 skip)
