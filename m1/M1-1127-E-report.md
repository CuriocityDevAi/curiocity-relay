# M1-1127-E · 통합 리허설 Case 1 마지막 구간 — PASS

**PASS** · 마지막 commit `1cce630` · `08` 판정 **(a) 실제 값 자동 prepend** · `storeport/apps/customer-display/src/screens/KeypadScreen.tsx:91,106` (`onDigitsChange?("08" + digits)` / `onOk?("08" + digits)` · 최대 11 자릿수 → 총 13).

## 결과

| 항목 | 상태 | 증거 |
|---|---|---|
| Case 1 정상 경로 | **GREEN** | run [45943373950](https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/45943373950) · job 1m56s · Playwright `1 passed (23.4s)` |
| mutation(skip-confirm) | **RED (= 기대)** | run [45943577437](https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/45943577437) · 같은 job 안에서 Case 1 다시 pass + mutation `1 failed` · earned-panel not visible (5s timeout) |
| 잡 1회 소요 시간 | 1m56s (Case 1 단독) | queue 제외. mutation 포함 run 은 ~9m 이지만 대부분 queue/setup — 실제 테스트 Case 1 23.4s + mutation 13.9s |

## 끝까지의 흐름 (명세·구현 교정 반영)

1. 상품 담기 → Cash → `payment-success` ✓
2. CD `left-receipt-mini` + `keypad-panel` ✓
3. **번호 입력**: PHONE(`0813804420000`) 에서 "08" 을 떼고 `13804420000` 만 press (키패드가 `08` auto-prefix)
4. POS 칩 aria-label `Customer entering phone 0813804420000` — **서버 스냅샷 == 손님 입력** ✓
5. OK → `first_visit` 분기 (test_meros 는 fresh → is_first_visit=true) · `cd-sync.tsx:82`
6. **`first-visit-panel`** · `first-visit-phone` last-4 == "0000" · `continue-button` · `change-number-button` ✓
7. Continue → `continue_first_visit` → state=`confirming` · `cd-sync.tsx:97`
8. **`confirm-panel`** · `confirm-phone` last-4 == "0000" · `confirm-yes-button` ✓
9. Yes → state=`confirmed` → `cd-screen-selector.ts:60` `confirmed+paid → earned`
10. **`earned-panel`** + `earned-amount` 숫자 존재 (`/\\d/`) ✓ · `loyalty-points.md §1.2` (paid ∧ confirmed → 적립)
11. POS 칩 `cd-phone-status-reenter` DOM 존재 — `CustomerPhoneStatus.tsx:322` 는 confirmed 분기에서만 reenter 렌더 → 자체가 "POS = confirmed" 증거 ✓
12. `phone-entry-chip` count == 0 (11-26 23:07 Kyu 결정) ✓

## `#N` 주문번호 칩 확인

CD 손님 화면 쪽 `#N` 은 `KeypadScreen.tsx:82` 의 `storeConfig.orderNumber` 기반 summary 에서 그려지며, CD 패널(FirstVisit/Confirm/Earned) 자체에는 별도 `#N` 구석 칩이 없음 (명세 `specs/screens/customer-display.md:35,36` 에서도 "일치" 로 분류된 testID 에 `#N` 는 없음). POS 쪽은 `CustomerPhoneStatus.tsx:93` 의 `numLabel = #${posOrderNum}` 로 칩 머리에 `#N · ` prefix. 스크린샷 4 종 (`M1-1127-E-case1-cd-typing.png` · `-cd-first-visit.png` · `-cd-confirm.png` · `-cd-earned.png` · `-pos-earned.png`) 는 upload-artifact 에 포함 — 녹색 run 아티팩트에서 Kyu 눈 확인 바람.

## 수정 범위 (제품 코드 무변경)

- `e2e/cd-pos/case1.spec.ts` — 타이핑 `PHONE.slice(2)` · aria-label 서버 스냅샷 검증 · first-visit→continue→confirm 2 단계 · earned amount `/\\d/` · reenter count>0 · 단계별 screenshot
- `e2e/cd-pos/case1-mutation-skip-confirm.spec.ts` — 동일 slice(2) 타이핑 (confirm-skip 이외 이유로 빨간 노이즈 방지)
- `scripts/start-test-env.sh` · `.github/workflows/e2e-cd-pos.yml` — 수정 없음 (M1-1127-D 때 이미 안정)
- storeport(customer-display/POS) · 명세 파일 — **무변경**

## 커밋

- `2e76595` M1-1127-E — CD 키패드 "08" auto-prefix 반영 · 서버 스냅샷 기반 어서션
- `a5dc854` M1-1127-E v2 — CD-FIRST-VISIT 경로 수용 (fresh test_meros)
- `ff08895` M1-1127-E v3 — first-visit → Continue → Confirm 2 단계 처리
- `d1eb242` M1-1127-E v4 — POS 칩 confirmed 전환 = reenter 버튼 노출로 검증
- `7364027` M1-1127-E v5 — reenter 셀렉터 `.first()` (headerRight 2 중 매치)
- `1cce630` M1-1127-E v6 — reenter visibility → count>0 (overlay hidden 1 개 처리)

실패 히스토리 (red→green 수렴 증거):

| run | 결과 | red 지점 |
|---|---|---|
| 45939773608 | FAIL | `cd-phone-status` chip `0808138044200` ≠ `0000` (⇒ "08" prefix 발견) |
| 45940144952 | FAIL | `confirm-panel` not visible (⇒ first_visit 분기 발견) |
| 45940603482 | FAIL | `earned-panel` not visible (⇒ first-visit→confirm 2 단계 필요) |
| 45942789459 | FAIL | aria-label `/confirmed|Phone saved/` 미매치 (⇒ POS poll lag) |
| 45943055112 | FAIL | `cd-phone-status-reenter.first()` hidden (⇒ overlay 2 중) |
| 45943373950 | **GREEN** | — |
| 45943577437 | **GREEN + mutation RED** | mutation Case 1 재통과 + Confirm 생략 시 earned 미출현 |

## PR 본문 Kyu 확인 항목 갱신

PR #281 body 의 "Kyu 확인 항목 (쉬운 말 3줄)" + "자기 검증 상태" + "Test plan" 모두 M1-1127-E 완료 상태로 갱신 (gh pr edit 281 완료).

## 검증의 검증 해석

mutation 로그 중요 라인:
```
✘  1 [cd-pos-chromium] › case1-mutation-skip-confirm.spec.ts:33:3 › Confirm 없이 earned 로 가면 테스트는 **빨간색**이어야 한다 (13.9s)
Error: expect(locator).toBeVisible() failed  Locator: getByTestId('earned-panel')  Timeout: 5000ms
Error: element(s) not found
1 failed
mutation spec 실패 (= 기대값, 로그 보존)
```
→ Confirm 안 누르면 서버가 `confirmed+paid` 로 못 가서 earned 안 뜸 = regression 가드 작동. (녹색이면 서버가 Confirm 없이도 적립 경보.)
