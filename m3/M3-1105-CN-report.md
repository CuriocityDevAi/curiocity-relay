# M3-1105-CN 리포트

## PR
https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/141

## 완료 항목
- `hooks/use-network-status.ts` 신규 — NativeModules.RNCNetInfo 가드 + lazy require + onlineManager 연동
- `components/OfflineBanner.tsx` 신규 — 안전 렌더
- `app/_layout.tsx` — `<OfflineBanner />` 1줄 추가
- `__tests__/use-network-status.test.ts` — 2 tests (RNCNetInfo=undefined import/호출 모두 안전)

## vitest 결과
25 test files · 286 tests passed | 6 expected fail | 2 todo — 전부 통과

## lint/tsc
- eslint: 신규 파일 경고 없음
- tsc: 기존 에러(FlashList estimatedItemSize, toast props 등) 그대로 — 신규 파일로 인한 추가 에러 없음

## 다른 네이티브 모듈 static import (grep 결과)
- components/ui/BottomSheet.tsx:5 — `useKeyboard` from `@react-native-community/hooks` (static)
- components/ui/Dialog.tsx:4 — `useKeyboard` from `@react-native-community/hooks` (static)
→ keyboard 네이티브 모듈도 동일 패턴 위험. 별도 티켓 권장.

## 확인(실기)
기존 dev client 아이패드에서 앱이 열리고 빨간 에러 없음 · 배너는 안 보여도 정상 — Kyu 직접 확인 필요
