---
round: M0-1103-A
pr:
  fork: agilo-medusa-pos-fork#9
outcome: stock-badge-fail-open-hotfix
kyu_checks: 3
---

# M0-1103-A · 재고 배지 fail-open 핫픽스 (R021 재진입)

**일자**: 2026-11-03 · **허브**: M0 · **성격**: Kyu iPad 실기 재현 (M0-1012-A stock-badge/soldout-block 재실기 ✗) 즉시 해소.

---

## 0. 뿌리 (3 가설 · (c) 확정 · (a) 포함 가능성 높음)

- **(c) 앱 집계 로직 버그** (파일:줄:커밋 = `app/(tabs)/products.tsx:77~84` M0-1012-A `2e97c9d`):
  - 이전: `Number(undefined ?? 0) = 0` → `hasManagedInventory=true` + `totalInventory=0` → `isSoldOut=true` → **모든 managed 상품 Sold out**.
- **(a) Medusa v2 variant.inventory_quantity 는 derived field** (remote query 전용) → `+variants.inventory_quantity` fields 요청해도 응답에 키 없음 → undefined. (c) 와 결합 → 뿌리.
- **(b) 재고 위치↔판매 채널 링크 미설정 = 반증**: Admin 에 Reserved 5·19 보유 → 링크 연결됨.

**실 서버 curl 미실행** (Admin 자격 미보유) · `docs/M0-1103-A-stock-badge-root.md §2.4` 에 Kyu 가 돌릴 curl 명령 등재.

---

## 1. 상태 실측

| 리포 | 브랜치 | tip | 상태 |
|------|--------|-----|------|
| fork master | master | `2e97c9d` (M0-1012-A merged) | - |
| fork 작업 | `fix/m0-1103-a-stock-badge` | `<본 commit>` | **PR #9 OPEN** |
| storeport | main | 변경 없음 | - |
| curiocity-relay | main | 본 리포트 push 대상 | - |

---

## 2. [REQ] 회수 매트릭스

| # | 요구 | 상태 | 비고 |
|---|------|------|------|
| 1 | 뿌리 확정 (a/b/c) | ✓ (c) 확정 · (a) 포함 | 서버 curl 미실행 · Kyu 명령 등재 |
| 2 | fail-open (unknown=배지 숨김·탭 허용 · 0=Sold out) | **완결** | `computeInventoryStatus` export · 13 어설션 pass |
| 3 | 유령 예약 원인 + 해제 제안 (실행 안 함) | **완결 (제안)** | `docs §4` A/B/C 선택 Kyu 승인 대기 |
| 4 | UX 소소 (opacity 25% · 배지 강조) | **등재만** | D 라운드 소소 마감 · 본 라운드 구현 금지 (지시 준수) |

---

## 3. 기계 판정 로그 (어설션 13건)

```
$ node scripts/m0-1103-a-assertions.mjs
  ✓ managed + inventory_quantity undefined → unknown (fail-open · 배지 숨김 · 탭 허용)
  ✓ managed + inventory_quantity null → unknown
  ✓ managed + inventory_quantity "15" (문자열) → unknown
  ✓ managed + inventory_quantity 15 → in-stock 15
  ✓ managed + inventory_quantity 0 → sold-out
  ✓ managed + inventory_quantity -5 (clip) → sold-out
  ✓ 여러 managed · 모두 숫자 · 합산
  ✓ 여러 managed · 하나라도 숫자 아니면 unknown (fail-open)
  ✓ manage_inventory=false (서비스 상품) → unknown (배지 숨김)
  ✓ 빈 변형 배열 → unknown
  ✓ 혼합: managed(5) + unmanaged(any) → in-stock 5
  ✓ total 5 (low-stock) → in-stock 5 (앰버)
  ✓ total 6 (not low) → in-stock 6 (초록)

13/13 passed · 0 failed
```

**TypeScript**: `npx tsc --noEmit` = 0 error.

**미실행 (명기)**: 실 브라우저/Expo 기동 (Admin 로그인 자격 미보유 + 아이패드 접근 없음) → **미검증**. Kyu iPad 실기 재실측 요청 (kyu_checks §4).

---

## 4. Kyu 아이패드 재실기 체크 (쉬운 말 · PR 본문 복제)

- **stock-badge-real**: Admin 재고 15 설정 → 앱 카드 "15 left" 초록 · 재고 0 → "Sold out" 회색.
- **tap-open**: 재고 있는 상품 (혹은 unmanaged) 터치 → 상세 열림.
- **unknown-open**: 서버가 inventory_quantity 안 돌려줘도 (현재 상태) 배지 없이 모든 상품 터치 허용.

---

## 5. 유령 예약 (Reserved Whole 5 · Slice 19) · 해제 Kyu 결정 요청

| 옵션 | 내용 | 리스크 |
|------|------|-------|
| **A** | 지금 Admin Dashboard Reservations 수동 해제 or `DELETE /admin/reservations/:id` | 수동 반복 · 재발 가능 |
| **B** | 24h 초과 open draft order 자동 삭제 cron (별건 M0-1104+) | 중간 상태 draft 손실 (낮은 리스크) |
| **C** | Z 리포트 마감 시점에 open draft 자동 drop | **M0 제안** · 세션 종료 = 거래 종료 정합 |

조회 명령: `docs/M0-1103-A-stock-badge-root.md §4`.

---

## 6. 규약 정합

| 규약 | 정합 |
|------|------|
| 변경 최소 (products.tsx 집계) | ✓ (서버 변경 없음) |
| TypeScript 0 error | ✓ |
| 기계 판정 어설션 | ✓ (13건 pass · scripts/m0-1103-a-assertions.mjs) |
| 미실행 = 미검증 명시 | ✓ (실 Expo · 실 curl) |
| D 라운드 등재만 · 구현 금지 | ✓ (UX 소소는 제안만) |
| 커밋 메시지 `!` 미사용 | ✓ |

---

## 7. 이연 순증감

| 카테고리 | 수 |
|---------|----|
| **해소** | +1 (R021 재고 배지 fail-open) |
| **제안** | +1 (유령 예약 A/B/C) · Kyu 결정 대기 |
| **등재만** | +1 (UX 소소 D 라운드) |
| **미완** | 1 (실 iPad 재실기 Kyu) |
| **총 순증감** | **-1** (Kyu 도장 시 -2) |

---

## 8. 다음 게이트

1. **PR #9 병합** → Kyu iPad 재실측 · kyu_checks 3 확진.
2. **유령 예약 A/B/C** Kyu 결정 → 선택 시 별건 라운드.
3. **서버 curl 확진** (Kyu 명령 실행) · (c)/(a) 가설 중 어느 쪽인지 명확히.
4. **다음 라운드 M0-1104+**: RMA · pickup slot · 등 M0-0918-I 라운드 B 로 복귀.

---

*M0-1103-A · 2026-11-03 · 재고 배지 fail-open hotfix · fork PR #9 · 어설션 13/13 pass · kyu_checks 3 · 이연 -1 (Kyu 도장 시 -2)*
