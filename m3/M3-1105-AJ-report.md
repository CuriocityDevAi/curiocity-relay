# M3-1105-AJ Report

## 원인 (1줄 · 근거)

`VoidRefundSheet.tsx:332–338`에서 `<ManagerPinSheet>` (= `BottomSheet` = React Native `Modal`)를 이미 열린 `BottomSheet` 외부에 형제로 렌더링 — iOS는 `Modal` 위에 두 번째 `Modal`을 표시하지 못하므로 Void 버튼을 눌러도 PIN 시트가 나타나지 않고 조용히 멈춤 (`BottomSheet.tsx:159: <Modal transparent ...>`).

**근거:** `VoidRefundSheet.tsx:212–217` `onPressConfirm`에서 `needsPin && !pendingPin` 조건 시 `setPinSheetOpen(true)`를 호출하고, `:332–338`에서 `<ManagerPinSheet visible={pinSheetOpen} ...>`를 렌더링. `ManagerPinSheet.tsx:143`이 자체 `BottomSheet`(= Modal)를 열어 중첩 발생. 웹에서는 DOM 요소라 Playwright가 못 잡음.

## 변경 요약

- `VoidRefundSheet.tsx`: PIN 입력을 별도 Modal 대신 같은 시트 안 단계(`SheetStep = 'confirm' | 'pin'`)로 인라인 처리. `ManagerPinSheet` import·렌더링 제거. `onPressConfirm` → `setStep('pin')`. 401 `N attempts left`·423 `Locked until HH:MM` 에러 표시, X 버튼으로 confirm 단계 복귀(`onCloseIconPress`), 조용한 실패 0.
- `scripts/m3-1105-aj-assertions.mjs`: 35개 어설션 (ManagerPinSheet 중첩 없음·조용한 return 0·인라인 PIN UI·401/423·기존 AD/AE/AI 호환) ✅ PASS
- `scripts/m3-1105-aj-screenshots.mjs`: 4장 Playwright 스샷

## 스샷

- `screenshots-m3-1105-aj/01-void-confirm.png`: Void 시트 confirm 단계 (Order #58, Cash, PIN 안내, Void 버튼)
- `screenshots-m3-1105-aj/02-void-pin-inline.png`: PIN 단계 — 같은 시트 안 인라인 (`Manager PIN` 헤더, 4칸 입력)
- `screenshots-m3-1105-aj/03-wrong-pin-error.png`: 틀린 PIN 오류 표시 (에러 텍스트 렌더링 확인)
- `screenshots-m3-1105-aj/04-void-success-toast.png`: PIN 검증 후 Void 성공 (시트 닫힘)

## PR

#86 — https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/86

## 이연 순증감

0 — ManagerPinSheet.tsx 파일 유지 (삭제 없음), 기존 AD/AE/AI 어설션 호환 유지.

## run-all assertions

AJ: ✅ 35/35 PASS  
AI: ✅ 52/52 PASS  
AD/AE/D: 기존 pre-existing 실패 (내 변경 전·후 동일)
