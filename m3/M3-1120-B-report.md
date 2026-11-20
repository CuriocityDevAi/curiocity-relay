fork #215 R1 버튼+배지 3단계 O · 떠 있는 창 이동·크기·저장 O · 설정 O · #214 갱신 O · tests 17/17 vitest + 4/4 playwright

## PR
https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/215

## 구현 항목
- `components/cd-preview/types.ts` — CdBadgeSize, CdWindowSize, CdPreviewState, CD_PREVIEW_DEFAULTS
- `components/cd-preview/useCdPreviewStore.ts` — 모듈 레벨 구독 패턴 + AsyncStorage @cd_preview_v1
- `components/cd-preview/CdStatusBadge.tsx` — testID=cd-preview-badge-button, 3단계 정보량
- `components/cd-preview/CdPreviewWindow.tsx` — position:absolute + PanResponder 드래그, S/M/L 크기
- `components/cd-preview/CdPreviewOverlay.tsx` — store만 보는 순수 overlay 컨테이너
- `app/_layout.tsx` — App() 함수 안 PosScreenEmitter 아래 CdPreviewOverlay 추가
- `app/(tabs)/_layout.tsx` — products 탭 headerShown:true + headerRight: CdHeaderRight
- `app/(tabs)/settings.tsx` — Customer display preview 섹션 (Switch + 3-way selector × 2)
- `docs/plans/cd-preview-on-pos.md` — 설계서 (#214 갱신)
- `e2e/flows/cd-preview.spec.ts` — 4개 테스트 (1024w·600w 뷰포트)

## 테스트 결과
- Vitest: 17/17 통과 (CdStatusBadge 9, useCdPreviewStore 8)
- Playwright: 4/4 통과 (badge visible 1024w·600w, window open, window close)

## 스크린샷
- e2e/screenshots/cd-preview-01-badge-1024w.png
- e2e/screenshots/cd-preview-02-window-open.png
- e2e/screenshots/cd-preview-03-window-closed.png
- e2e/screenshots/cd-preview-04-badge-600w.png

## TypeScript
- 신규 파일 에러 없음 (기존 프리 익시스팅 에러: global.css, FlashList estimatedItemSize 등 — 무관)

## 미검증 항목
- 실제 iPad/Android 기기에서 드래그 동작 확인 필요
- 앱 재시작 후 위치 복원 (AsyncStorage 로드) 실기 확인 필요
- R1은 state='offline' 고정 — M3-1120-C에서 classifyCustomerDisplay 연결 예정
