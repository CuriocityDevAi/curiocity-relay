# R0-1105-EH — 리뷰 리포트

**APPROVE — 재빌드 전 머지 안전: 예**

PR #135 · feat(offline): M2-1105-BK — 오프라인 감지 배너 (NetInfo + onlineManager)  
head c9b1517 · 검토일 2026-11-14

---

## REQ 1: 네이티브 모듈 안전성 (RNCNetInfo)

**결론: 현재 dev client에서 앱 crash 발생 — EAS 재빌드 필수.**

`hooks/use-network-status.ts` 모듈 최상위에서 `import NetInfo from '@react-native-community/netinfo'` 선언.  
RNCNetInfo 네이티브 모듈이 dev client 번들에 없으면 모듈 로드 시점에 즉시 throw → 앱 black screen으로 사망.

Guard 부재 확인:
- `try/catch require()` 패턴 없음
- `NativeModules.RNCNetInfo` null 체크 없음
- Platform.select 분기 없음

**웹은 안전**: `.web.ts` 파일이 Metro 플랫폼 분기로 선택됨 → `window.addEventListener` 기반, 네이티브 모듈 비의존.

권고 가드 패턴 (옵션):
```ts
let NetInfoModule: typeof import('@react-native-community/netinfo').default | null = null;
try { NetInfoModule = require('@react-native-community/netinfo').default; } catch {}
// NetInfoModule이 null이면 배너 비활성 처리
```

현재 코드는 guard 없어도 EAS 정식 빌드에는 netinfo가 포함되므로 **머지 자체는 안전**. 단 현재 dev client로 native 기기 테스트 불가 → **EAS 재빌드 완료 후 QA 진행 필수**.

---

## REQ 2: onlineManager 연결 · mutation 재시도 정책

**결론: 중복 전송·silent drop 위험 없음.**

`onlineManager.setEventListener` 모듈 로드 시 1회 등록 — react-query 공식 권장 패턴.

react-query 기본 `networkMode: 'online'` 동작:
- 오프라인 상태에서 발화된 mutation → `paused` 상태로 메모리 큐잉 (drop 아님)
- 재연결 시 `onlineManager`가 `setOnline(true)` 호출 → queued mutations 순서대로 재시작
- react-query 내부 상태 머신이 중복 전송 차단

부가 확인:
- web hook에서 `_setOnline` + `setOnline` 두 경로 모두 갱신 → 배너 state와 react-query state 동기
- Playwright `page.context().setOffline(true)` → `offline` DOM 이벤트 → 양쪽 경로 트리거 → e2e 통과

주의사항 (이 PR 범위 외): 앱 강제 종료/새로고침 시 메모리 내 paused mutations 소실 — react-query 기본 동작이며 영구 큐가 필요하다면 별도 작업 필요.

---

## REQ 3: 배너 위치 · _layout.tsx · #132 headerBackTitle

**결론: 비접촉 · 안전.**

`_layout.tsx` 변경 3줄만 추가:
1. `import { OfflineBanner }` 1줄
2. 주석 1줄
3. `<OfflineBanner />` 렌더 1줄

`Stack.Screen` options 완전 미변경 → `headerBackTitle` (#132) 비접촉 확인.

`OfflineBanner` 위치 특성:
- `position: 'absolute'` → 레이아웃 플로우 무영향 (다른 컴포넌트 밀어내기 없음)
- `zIndex: 200` → Toast(topOffset 60) 위에 오버레이
- `top: insets.top` → safe-area 아래 정확히 고정

semantic 토큰: `InfoBanner colorScheme="warning"/"success"` 위임 — 하드코딩 색상 없음. 11 changed files 범위 내, 범위 초과 없음.

---

## REQ 4: CI 결과

| job | workflow | 결과 |
|---|---|---|
| lint | Lint | ✅ SUCCESS |
| assertions | CI | ✅ SUCCESS |
| flow-tests | CI | ✅ SUCCESS |
| playwright | CI | ✅ SUCCESS |

전 job 그린. playwright 약 14분 소요 (run #43568244190).  
e2e Flow 8: 오프라인 전환→배너 표시→재연결→2초 후 소멸 3-shot 검증 통과.

---

## 종합

| 항목 | 판정 |
|---|---|
| 코드 품질 | 양호 |
| 네이티브 crash 위험 | EAS 재빌드 전 dev client에서 crash — 머지 후 rebuild 필수 |
| mutation 안전성 | 중복·drop 없음 |
| 레이아웃 충돌 | 없음 |
| CI | 전 job 통과 |

**APPROVE. 재빌드 전 머지 안전: 예** — 코드 자체는 올바름. 현재 dev client로 native QA 불가이므로 EAS rebuild 후 iPad 실기 확인 권장.
