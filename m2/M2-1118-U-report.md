#384 rebase · 충돌 2파일 · mergeable O · it O

## 충돌 해결 내역

| 파일 | 충돌 원인 | 해결 방식 |
|------|-----------|-----------|
| `.github/workflows/linux-check.yml` | `630db1d` (M2-1118-Q 신설) vs `4c946e9` (main #380 머지분) add/add | `630db1d` 스킵 — 이미 main에 동일 커밋 포함 |
| `docs/feature-map.yaml` + 3개 소스 파일 | `7e013dd` (R-B2b order-snapshot) vs `2c94e46` (main #382 머지분) add/add | `7e013dd` 스킵 — 이미 main에 동일 커밋 포함 |

> 실질 충돌 커밋 2개 모두 "이미 main에 착지된 커밋 재적용" 패턴 → `git rebase --skip` 처리.
> 최종 브랜치: M2-1118-S 커밋 1개 + 임시 CI 커밋 2개(push 트리거 추가/제거 — net-zero).

## 통합 테스트 결과

```
bash scripts/it.sh fulfilled-order-after-sales
  ✓ #S-1 BUG-C 환불: 현금 결제 → Hand over → refund(cash+pin) → 200
  ✓ #S-2 반품 (line_item_id 필드): fulfilled → return({line_item_id}) → 200
  ✓ #S-3 반품 (id 필드 — POS 앱 형식): fulfilled → return({id}) → 200
  ✓ #S-4 나중 연결: fulfilled (receipt_no 있음) → customer link → 200
  통과: 1 / 1

bash scripts/it.sh checkout-handover-smoke
  ✓ cash: pos-complete → fulfill → Fulfilled · 재고 1 감소
  ✓ qris (invoice_number 6자리): 같은 흐름으로 Fulfilled · 재고 1 감소
  통과: 1 / 1
```

## commerce-core 빌드

```
Backend build completed successfully (5.51s)
Frontend build completed successfully (18.23s)
```

## PR 상태

```json
{"mergeable":"MERGEABLE","mergeStateStatus":"BLOCKED"}
```

> MERGEABLE = git 충돌 없음. BLOCKED = force-push 후 CI 실행 중 (정상).
> HEAD: d38af3ec8b3001ff407d78ca2494beb4cbc82314

## force-push

```
fix/M2-1118-S-fulfilled-refund: ddbbd02...d38af3e (forced update)
```
