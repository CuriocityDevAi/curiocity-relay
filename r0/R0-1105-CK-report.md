# R0-1105-CK 리포트 — fork #106 리뷰 (M3-1105-AZ cleanup)

**판정: APPROVE**

작성: 2026-11-12 · 리뷰어 R0 · 코드 수정 0. 머지는 Kyu 결정.

---

## 검증 표 (file:line)

| REQ | 검증 지점 | 결과 |
|-----|-----------|------|
| 1 · ManagerPinSheet 삭제 안전 — 운영 import 0 | `git grep ManagerPinSheet origin/chore/m3-1105-az-cleanup -- '*.tsx' '*.ts'` → 결과 없음 (스크립트 주석만) | ✓ |
| 1 · 삭제 후 VoidRefundSheet 에 검사 내용 유지 | `components/orders/VoidRefundSheet.tsx:488` `secureTextEntry` · `:491` `manager-pin-digits` testID · `:496` `manager-pin-error` testID · `:313-316` `remaining_attempts` / `locked_until` / `res.reason` 처리 | ✓ |
| 1 · AE(5): remaining_attempts/locked_until VoidRefundSheet 로 리다이렉트 | `scripts/m3-1105-ae-assertions.mjs` — `ManagerPinSheet` 대신 `vrSrc` 대상으로 동일 6개 체크 유지 | ✓ 약화 아님 |
| 1 · AR(3)(4)(5a): ManagerPinSheet DigitsInput·displayBoxes·manager-pin-digit 검사 | AR diff — `(3a)(3c)(4a)(4b)(4c)(5a)(8e)(11c)(11d)` 삭제, 대응 `(3b)(3d)(5b)(8d)(11a)(11b)` VoidRefundSheet 체크 유지 | ✓ 약화 아님 |
| 1 · AW(9)(10): Verify 없음 · handedOver OR 반영 | `scripts/m3-1105-aw-assertions.mjs:143-150` — `(9)` 삭제 확인, `(10)` `'handedOver:'` + `"fulfillment_stage === 'hand_over'"` + `'order.fulfillments'` 세 조건 AND | ✓ |
| 2 · handedOver OR 조건 | `app/orders/[orderId].tsx:873-875` `md.fulfillment_stage === 'hand_over' \|\| (Array.isArray(order.fulfillments) && order.fulfillments.length > 0)` | ✓ |
| 2 · 서버 restock_required 400 차단 | 서버 `hadFulfillment = pendingFulfills.length > 0` ↔ 앱 OR 두 번째 절 `fulfillments.length > 0` 대응. 출고 기록 존재 시 반드시 handedOver=true → restock 포함 → 400 없음 | ✓ |
| 2 · 미건넨 주문 false-positive 없음 | `fulfillment_stage !== 'hand_over'` AND `fulfillments.length === 0` → handedOver=false → restock 단계 미노출 | ✓ |
| 2 · Array.isArray 가드 | `Array.isArray(order.fulfillments)` — 옛 주문 fulfillments=undefined/null 경우 TypeError 없음 | ✓ |
| 3 · prettier 서식만 | `git show bd8cf30 -w -- app/orders/[orderId].tsx` diff 결과: 한 줄 OR → 멀티라인 reformatting 뿐, 로직 변경 0 | ✓ |
| 3 · 스샷 5장 커밋 | `git ls-tree origin/chore/m3-1105-az-cleanup docs/testing/screenshots-20261112/` → 5 PNG (01~04) 확인 | ✓ |
| 3 · #105/#107/BA 충돌 없음 | `git merge-tree` 각 쌍 — CONFLICT 0 | ✓ |

---

## 비 블로커 지적

### ⚠️ 02·03 스샷 동일 파일 (문서 결함)

```
02-payments-type-table.png       blob baaf388  59310B
03-void-buttons-done-reprint-share.png  blob baaf388  59310B  ← 동일
```

`03`은 Void 뒤 Done/Reprint/Share 버튼 화면이어야 하나 `02`와 완전히 같은 PNG. 스크립트 복사 시 덮어쓴 것으로 추정. 기능·로직 무관 · assertion PASS에 영향 없음 — 다음 라운드 재캡처 권장.

---

## assertions

`node scripts/run-all.mjs assertions` → 44개 · 44 PASS · 0 FAIL (M3-1105-AZ 리포트 기준)

---

## 이연 순증감

- **해소**: R0-1105-CB §5 지적 3건 (ManagerPinSheet dead code · handedOver 불일치 · 스샷 누락) 모두 처리
- **신규**: 02·03 스샷 중복 (non-blocker · 재캡처 후보)

---

## 착지 명령

```bash
cp /tmp/R0-1105-CK-report.md ~/projects/curiocity-relay/r0/ && cd ~/projects/curiocity-relay && git add r0/R0-1105-CK-report.md && git commit -m "r0: R0-1105-CK" && git pull --rebase --autostash origin main && git push && node scripts/claim.mjs R0-1105-CK done "fork #106 APPROVE — REQ1·2·3 ✓ · 02/03 스샷 중복 non-blocker"
```
