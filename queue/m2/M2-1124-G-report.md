M2-1124-G-report
판정: 충돌 해소 완료 · CI 트리거 확인 · pos_order_num 계약 불일치 해소

---

## 1. mergeable

**이전**: `mergeable_state=dirty` (충돌 7개 파일)
**현재**: `mergeable=MERGEABLE` · `mergeStateStatus=BLOCKED` (CI pending — 정상)

### 해소한 충돌 파일

| 파일 | 전략 |
|---|---|
| `.github/scripts/route-heavy.sh` | main 최신(M1-1119-V · M1-1120-C) 채택 |
| `.github/workflows/ci.yml` | timeout 6분 + PARTNER_REPO env 채택 |
| `order_snapshot/model.ts` | 양쪽 필드 병합 (phone_deferred + M2-1124-B) |
| `customer-display.ts` | 양쪽 필드 병합 |
| `lifecycle.ts` | 양쪽 직렬화 병합 |
| `service.ts` | M3-1119-R 단순화(skipped_at만) 채택 + phone_entry_state:"skipped" 추가 |
| `snapshot-api.ts` | 양쪽 주석 병합 (sendPhonePartial + skipPhoneOnServer) |
| `docs/feature-map.yaml` | 마이그레이션 목록 3건 모두 등재 |

추가 fix: `display-machine.ts` keypad 잠금 조건 `snapshot.id === prevSnapshot?.id` 추가
→ M0-1120-A Next customer 회귀 테스트 복원 (233/233 pass)

마이그레이션 충돌 없음:
- 이 브랜치: `register_session/Migration20261124000001.ts`
- PR #415: `order_number/Migration20261124000000.ts` (다른 모듈)

---

## 2. CI 결과

push 직후 `gh pr checks 416` 결과:

```
changes-filter    pending  https://…/job/138259937944
check             pending  https://…/job/138259937541
markers-and-forbidden  pending  https://…/job/138259937644
route             pending  https://…/job/138259937981
```

**CI 트리거 정상 확인** (이전에 한 번도 안 돌았던 원인: 충돌 상태 dirty → push 불가).

heavy-mac / heavy-cloud (pos-integration · 마이그레이션 적용) 는 route job 판정 후 시작.
단위 테스트(customer-display 233 · commerce-core 558)는 로컬 pre-push hook 에서 모두 pass.

---

## 3. pos_order_num 경로 판정

**계약 불일치 발견 → 해소 완료**

| | 경로 | 인증 |
|---|---|---|
| M1-1124-C (#247) POS 호출 | `PATCH /admin/pos/customer-display/snapshots/:id` | Medusa admin JWT |
| PR #416 기존 제공 경로 | `PATCH /customer-display/snapshots/:id` | X-Device-Token |

`/admin/pos/customer-display/snapshots/:id` 경로가 미존재 → 계약 불일치.

**해소**: `apps/commerce-core/src/api/admin/pos/customer-display/snapshots/[id]/route.ts` 신설.
- `PATCH body: { pos_order_num: number }` → `updateOrderSnapshots` 직접 호출
- admin JWT 인증 (Medusa 미들웨어 자동 적용)
- X-Device-Token 경로와 대칭 — 인증 주체만 다름
- commit: `cbf0fb7`

현재 두 경로 모두 `pos_order_num` 처리:
- `/admin/pos/customer-display/snapshots/:id` (POS · M1-1124-C 계약) ✓
- `/customer-display/snapshots/:id` (손님 화면 · X-Device-Token) ✓

---

## 4. 추가 커밋 목록

```
40b1cc0 fix: keypad 잠금 새 snapshot(Next customer) 에서 해제
cbf0fb7 feat: admin PATCH /admin/pos/customer-display/snapshots/:id (pos_order_num)
90832c8 merge: main → feat/M2-1124-B-cd-live-phone
```
