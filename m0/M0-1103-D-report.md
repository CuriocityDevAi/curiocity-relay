---
round: M0-1103-D
pr:
  fork: agilo-medusa-pos-fork#12
outcome: stale-draft-order-id-self-recovery-hotfix
kyu_checks: 2
---

# M0-1103-D · 옛 draft order ID 자가 복구 (Not a draft order 재발)

**일자**: 2026-11-03 · **허브**: M0 · **성격**: Kyu 11-03 iPad 실기 재현 (M0-1012-A sequential-orders 재실기 ✗) 즉시 해소 핫픽스.

---

## 0. 뿌리

Kyu iPad 재현: Add to cart → `Order order_01M4QPYQR3WMRFKHDAJ64PA7FJ is not a draft order` 반복 + "Something went wrong". ID = 10-12 완료 주문. M0-1012-A 는 결제 완료 시점 폐기만 넣고 **기존 저장 ID 자가 복구 경로 없음** → 재발.

유령 예약 축적과도 연계 (M0-1103-A §4.1): 옛 ID 가 가리키는 cart/draft 가 서버에 남고 reservation 유지 → 재고 점유.

---

## 1. 상태 실측

| 리포 | 브랜치 | 상태 |
|------|--------|------|
| fork master | master `3b295d5` (M0-1103-B #10 merged) | base |
| 작업 | `fix/m0-1103-d-stale-draft` | **PR #12 OPEN** |
| storeport | - | 변경 없음 |

---

## 2. 산출물 (fork PR #12 · base master · 변경 최소)

| 파일 | 변경 |
|------|------|
| `utils/errors.ts` | `isStaleDraftOrderError` 유틸 + Toast "Cart was reset · Try again" 분기 |
| `api/hooks/draft-orders.tsx` | `useResetAndCreateDraftOrderId` · `useWithStaleDraftRecovery` · `validateStoredDraftOrderId` · `useBootstrapDraftOrderValidator` 신설 · 5개 mutation + useCurrentDraftOrder 래핑 |
| `app/_layout.tsx` | 로그인 직후 1회 저장 ID 검증 hook 호출 |
| `docs/M0-1103-A-stock-badge-root.md` §4.1 | 유령 예약과의 연계 메모 추가 |
| `scripts/m0-1103-d-assertions.mjs` | 19건 어설션 |

**서버 변경 없음** · storeport PR 없음.

---

## 3. 검증

### 어설션 19/19 pass
```
--- (a) 저장 ID 404 → 새 ID 생성 · 1회 재시도 ---    ✓ 4건
--- (b) status=completed → 폐기 + 재생성 ---         ✓ 3건
--- (c) 정상 draft → 그대로 ---                      ✓ 2건
--- (d) "is not a draft order" 메시지 → stale 감지 ─ ✓ 4건 (Kyu 재현 ID 사용)
--- (e) 재시도도 실패 → stale 에러 그대로 throw ---  ✓ 1건
--- (f) 네트워크 에러 → stale 로 오인 금지 ---       ✓ 5건
19/19 passed · 0 failed
```

### TypeScript 0 error
```
$ npx tsc --noEmit  → exit 0
```

### 미실행 (명기)
- **실 서버 + iPad 재현** → **미검증** (Admin 자격 + 아이패드 없음). 로직 복제 어설션으로 보완 (Kyu 재현 ID `order_01M4QPYQR3WMRFKHDAJ64PA7FJ` 를 Case (d) 입력으로 사용).

---

## 4. Kyu 아이패드 재실기 체크 (쉬운 말)

- **stale-recover**: 옛 ID 저장된 상태에서 상품 Add to cart → 빨간 토스트 없이 성공 · 카트에 담김 (예전처럼 "is not a draft order" 반복 금지).
- **sequential-orders**: 결제 완료 → 즉시 다른 상품 Add to cart → 반복 10회 성공 (M0-1012-A sequential-orders 재검).

재시도도 실패 시 토스트 "Cart was reset · Try again" (전엔 "Something went wrong").

---

## 5. 규약 정합

| 규약 | 정합 |
|------|------|
| 변경 최소 | ✓ (5 파일 · hooks + 유틸 + layout 지점) |
| TypeScript 0 error | ✓ |
| 어설션 19건 (케이스 a-f) | ✓ |
| 미실행 = 미검증 명시 | ✓ (실 서버 + iPad) |
| 사람 문장 ("Something went wrong" 금지) | ✓ |
| 커밋 메시지 `!` 미사용 | ✓ |

---

## 6. 이연 순증감

| 카테고리 | 수 |
|---------|----|
| 해소 | +1 (stale draft 자가 복구) |
| 재검 | +1 (sequential-orders M0-1012-A 재검) |
| 연계 명시 | +1 (유령 예약 §4.1 cross-ref) |
| 미완 (Kyu 실기) | 1 |
| **총 순증감** | **-1** (Kyu 도장 2건 시 -2) |

---

## 7. 다음 게이트

1. **fork PR #12 Kyu 리뷰 → 머지** (base master · PR #11 M0-1103-C 와 독립).
2. **Kyu iPad 실측**: Admin 에 옛 draft 가 남아있는 상태에서 Add to cart → 성공 재현 → kyu_checks 2건 확진.
3. **유령 예약 해제** (M0-1103-A §4 A/B/C) Kyu 결정 → 별건 라운드. 신규 유입은 본 PR 로 차단되므로 기존 분만 정리.
4. **다음 라운드 M0-1104+**:
   - storeport "Meros Admin" (브라우저 탭 + 로고)
   - Z 리포트 텍스트 header "Meros POS"
   - 유령 예약 §4 B/C (24h cron or Z 마감 drop) 구현

---

*M0-1103-D · 2026-11-03 · 옛 draft order ID 자가 복구 핫픽스 · fork PR #12 · 어설션 19/19 pass · kyu_checks 2 · 이연 -1 (Kyu 도장 시 -2)*
