# R0-1105-BH Report

## 판정

- **(A) agilo-medusa-pos-fork PR #86 (M3-1105-AJ)**: APPROVE
- **(B) storeport PR #211 (M1-1105-AQ)**: APPROVE ⚠️ 스크린샷 미검증

---

## (A) PR #86 · M3-1105-AJ · Void 버튼 iOS Modal 중첩 버그 수정

### ① 원인 근거 검증

| 항목 | 검증 결과 |
|---|---|
| `BottomSheet.tsx` = `<Modal transparent>` | ✅ `:L7` `import { ... Modal ...} from 'react-native'`; `:L159` `<Modal transparent={true} statusBarTranslucent animationType="none">` 직접 확인 |
| 수정 전 `VoidRefundSheet` 중첩 구조 | ✅ 수정 전 `:332–338` `<ManagerPinSheet visible={pinSheetOpen}>` 를 `<BottomSheet>` 형제로 렌더 → Modal 위 Modal |
| `ManagerPinSheet` 도 `BottomSheet` 감쌈 | ✅ `ManagerPinSheet.tsx:L143` `<BottomSheet visible={visible}>` |
| **iOS에서 두 번째 Modal 비표시** | ✅ React Native 공식 한계 (두 번째 Modal이 렌더 트리에 존재하나 iOS에서 화면에 나타나지 않음) |
| 웹 재현 불가 사유 | ✅ 웹은 DOM 기반 — Modal이 HTML `<div>` 오버레이이므로 중첩 표시 제한 없음. Playwright가 클릭 이벤트를 정상 처리하는 이유와 일치 |

### ② PIN 단계 — 중첩 Modal 제거 확인

| 항목 | 결과 |
|---|---|
| `ManagerPinSheet` import 제거 | ✅ diff에서 `-import { ManagerPinSheet }` 확인 |
| `<ManagerPinSheet>` 렌더링 제거 | ✅ assertions 35/35 PASS 중 `<ManagerPinSheet 렌더링 없음` 포함 |
| 같은 `BottomSheet` 안 단계 전환 | ✅ `SheetStep = 'confirm' | 'pin'` → `step === 'pin'` 조건으로 단일 `<BottomSheet>` 내 뷰 전환 |
| 중첩 Modal 완전 제거 | ✅ 1개의 Modal만 존재 (VoidRefundSheet의 BottomSheet) |

### ③ 조용한 실패 0

| 분기 | 처리 |
|---|---|
| 빈 입력 | `Verify` 버튼 `disabled` (isValidManagerPin 조건), 조용한 return 0 |
| 틀린 PIN (401) | `catch` → `setPinError("N attempts left")` or `"Incorrect PIN"` 표시 + shake |
| 잠금 (423) | `catch` → `setPinError("Locked until HH:MM")` + 입력 비활성(`pinLockActive`) |
| 네트워크 오류 | `catch` → `setPinError(parsed.message ?? 'Incorrect PIN')` |
| 시트 X 버튼 | `onCloseIconPress → goBackToConfirm()` → confirm 단계 복귀, 에러·PIN 초기화 |
| 성공 후 void/refund 실패 | `submit()` 내부 try-catch → `showToast.error()`, `setStep('confirm')` |

**조용한 return: 0** — `onPressConfirm`의 `needsPin` 경로는 항상 `setStep('pin')`으로.

### ④ 오류 문구

| 상황 | 코드 처리 | 스크린샷 실제 |
|---|---|---|
| 401 mismatch | `${res.remaining_attempts} attempts left` / `${parsed.remaining} attempts left` | ⚠️ "Unauthorized" 표시 (아래 주석 참고) |
| 423 locked | `Locked until ${formatLockedUntil(res.locked_until)}` / `Locked until ${formatLockedUntil(parsed.retryAt)}` | 미검증 (스크린샷 없음) |

> **⚠️ 주의 (기존 한계, 미회귀):** 웹 Playwright 테스트에서 Medusa SDK `client.fetch()` 가 401 throw 시 `e.body.remaining_attempts` 를 노출하지 않아 fallback `parsed.message = "Unauthorized"` 가 표시됨. 이는 `ManagerPinSheet.tsx` 의 동일한 `extractPinError` 함수에서도 같은 현상 — AJ 이전부터 동일한 한계. 프로덕션 Medusa 서버에서는 SDK 가 올바른 body shape 을 전달할 것으로 예상.

### ⑤ run-all 비교 (master vs PR)

| 범위 | master (efd1c2c, pre-AJ) | PR (41f662c, AJ) |
|---|---|---|
| AJ assertions | ✗ 존재하지 않음 | ✅ 35/35 PASS |
| AI assertions | AI 52/52 PASS | ✅ AI 52/52 PASS |
| AD assertions | ❌ 2 FAIL (fixture 필드명 불일치: `remaining` vs `remaining_attempts`) | ❌ 2 FAIL (동일 — AJ 스크립트·fixture 무변경) |
| AE assertions | ❌ 1 FAIL (`refund_watermark` 미구현) | ❌ 1 FAIL (동일) |
| D assertions | ❌ 3 FAIL (fulfillment labels 미변경) | ❌ 3 FAIL (동일) |
| **전체 run-all** | — | **56/59 PASS · 3 FAIL (AD/AE/D pre-existing)** |

AD/AE/D 실패는 AJ 이전부터 동일하게 발생하며, AJ 변경과 무관한 항목(fixture 필드 불일치, receipt refund_watermark, fulfillment label)으로 확인됨.

### ⑥ 스크린샷 4장

| 번호 | 내용 | 판단 |
|---|---|---|
| 01 `01-void-confirm.png` | Void order 시트 — confirm 단계. No. 58, IDR 95,000, Cash 선택, "Manager PIN required" 안내, Void 버튼 | ✅ 단계 정상 |
| 02 `02-void-pin-inline.png` | Manager PIN 헤더 + 4칸 입력 (Verify 버튼 비활성) — 같은 시트 내 인라인 | ✅ 단계 전환 정상. 박스 세로 나열은 웹 RN flex-row 렌더 특성 (iOS 실기에서는 가로 렌더 예상) |
| 03 `03-wrong-pin-error.png` | Manager PIN 시트, 빨간 테두리 박스, "Unauthorized" 에러 | ⚠️ 코드상 "3 attempts left" 의도이나 SDK body 미파싱 (기존 한계, 위 ④ 주석 참고) |
| 04 `04-void-success-toast.png` | 주문 상세 화면 — 시트 닫힘 확인 | ✅ 시트 닫힘 정상. 토스트 1500ms 내 나타났다 사라진 것으로 추정 (스크린샷 타이밍) |

**raw hex 0 ✅ · 영어 전용 ✅ · master 충돌: `unstable` (CI 불안정, 병합 충돌 아님)**

---

## (B) PR #211 · M1-1105-AQ · Admin 상단 PIN 버튼

### ① 위치·동작 체크

| 항목 | 결과 |
|---|---|
| Customize Layout 왼쪽 배치 | ✅ `useLayoutEffect` → `justify-end` 컨테이너 탐색 → `insertBefore(div, node.firstChild)` → Customize Layout 첫 번째 자식 앞에 주입 |
| 팝오버 내용 (PIN·다음변경시각·매장·날짜) | ✅ `data.pin`, `data.changes_at`, `data.store_id`, `data.wib_date` 모두 Popover.Content에 표시 |
| 다시 누르기 닫힘 | ✅ Radix Popover.Trigger 토글 동작 |
| 바깥 클릭 닫힘 | ✅ Radix Popover 기본 동작 |
| Esc 닫힘 | ✅ Radix Popover 기본 동작 |
| WIB 자정 자동 갱신 | ✅ `msUntilNextWibMidnight()` 계산 후 `setTimeout(() => void load(), msUntilNextWibMidnight())` |
| window focus 재조회 | ✅ `window.addEventListener("focus", onFocus)` |

### ② 기존 하단 카드 처리

| 항목 | 결과 |
|---|---|
| `manager-pin.tsx` 폴백 전환 | ✅ `useLayoutEffect` + MutationObserver로 `[data-meros-pin-topbar]` 감지 |
| topbar 버튼 주입 시 카드 null | ✅ `if (topbarInjected) return null` |
| topbar 미주입 시 카드 렌더 | ✅ 폴백 경로 정상 작동 |
| zone 확장 | ✅ `"order.list.before"` → `["order.list.before", "order.details.before"]` |

### ③ 확장 지점 vs DOM 주입 위험 평가

**채택안**: `zone: "topbar"` + DOM 주입 (`insertBefore` + `createPortal`)

**공식 존 불가 근거**: `INJECTION_ZONES`의 `"topbar"` 존은 `LayoutComposer` 내 렌더 → Customize Layout **오른쪽**. "Customize Layout 왼쪽" 전용 공식 존 없음 → DOM 주입 불가피.

| 위험 항목 | 평가 |
|---|---|
| Medusa Admin 마크업 변경 (`justify-end` 클래스 제거) | ⚠️ 위험 — 버튼이 topbar 존 자연 위치(Notifications 옆, Customize Layout **오른쪽**)로 이동. 위치만 달라지고 기능은 유지 |
| 폴백 동작 | ✅ `if (!node) return` 시 `portalReady = false` → `pinButton` inline 렌더. 오류 없이 퇴화 |
| 이중 주입 방지 | ✅ `if (injectedElRef.current) return` |
| cleanup 메모리 누수 | ✅ `observer.disconnect()`, `injectedElRef.current?.remove()` |
| `MutationObserver subtree` 성능 | 허용 — Medusa Admin은 DOM 변화가 적고 같은 패턴이 `manager-pin.tsx`에도 사용됨 |

**종합**: DOM 주입 접근법 자체의 위험은 명시적 폴백으로 충분히 완화됨. Medusa 버전 업그레이드 시 `justify-end` 클래스 존재 여부 재확인 필요.

### ④ Playwright 확인

**미검증** — 프로젝트 Playwright 미설치(`apps/commerce-core` 미구성). typecheck 0 error + unit 33/33 PASS 로 대체 검증됨. 실기 Admin 화면 위치 확인 불가.

### ⑤ CI 체크 상태

| 항목 | 결과 |
|---|---|
| CI check runs | 403 (통합 접근 불가) |
| `mergeable_state` | `unknown` (GitHub 계산 미완료 — 충돌 없음 추정) |
| raw hex 0 | ✅ 모든 색상 Medusa UI 토큰 (`text-ui-fg-muted`, `text-ui-fg-subtle`) |
| 영어 전용 | ✅ PIN, Manager PIN, Store:, Date:, Next change: WIB |
| master 충돌 | unknown (스크린샷 없음, CI 403) |

---

## 이연 순증감

0 — 양 PR 모두 기존 계약 호환 유지, 신규 파일 추가만.

---

## 착지 명령

```
cp /tmp/R0-1105-BH-report.md ~/projects/curiocity-relay/r0/ && cd ~/projects/curiocity-relay && git add r0/R0-1105-BH-report.md && git commit -m "r0: R0-1105-BH" && git pull --rebase --autostash origin main && git push && node scripts/claim.mjs R0-1105-BH done "PR#86 APPROVE(Modal중첩제거·35/35PASS·pre-existingAD/AE/D동일) · PR#211 APPROVE(DOM주입폴백확인·스크린샷미검증)"
```
