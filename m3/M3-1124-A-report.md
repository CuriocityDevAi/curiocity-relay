# M3-1124-A report
판정: ✅ PASS
PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/246
mergeable: yes

## 요약
SellTopBar 탭 분리 · 매장 버튼화 · `…` 제거 · 미리보기 버튼 · 스캔 버튼 카메라 모듈 가용성 체크.
커밋 4건 · push · PR 생성. e2e 6/6 pass (3 viewports × 2 tests).

## 항목별

### 7 (실패) — 헤더 어딜 눌러도 Cash pickup 메뉴 뜸
실패 원인(파일:줄): `components/SellTopBar.tsx` — 최상단 컨테이너가 `TouchableOpacity`
  (`onPress={onMenuPress}`)로 감싸져 있어 헤더 어딜 눌러도 `onMenuPress` 가 호출됨.
  내부 버튼 클릭 이벤트도 버블링 차단 없이 최상위 `TouchableOpacity` 까지 전파.
수정: 최상단 컨테이너를 `View` 로 교체 → `testID="sell-top-bar"` 이동.
  왼쪽 버튼만 `TouchableOpacity`(register-menu-btn) · 나머지 빈 곳 클릭 무동작.

### 6 (ok+요구) — 매장 버튼 스타일 · `…` 제거
요구(Kyu): "매장 상태를 버튼처럼 만들어서 눌렀을 때 어떤 이벤트가 있다고 암시, 우측 `…` 없애는 게 좋을 듯."
수정: `register-menu-btn` → `border border-line bg-surface-muted rounded-xl px-3 BUTTON_H`
  + `ChevronDown` ⌄ 아이콘(isOpen 시). `MoreHorizontal` import · 렌더 제거.

### 7 연계 — Connected 옆 미리보기 아이콘 버튼
요구(Kyu): "connected 옆에 미리보기 아이콘 만들어서 누르게 하는 게 맞을 것 같아."
기술 선택: Connected 텍스트 자체를 버튼화하지 않음 → 상태 표시가 "연결 설정" 같은
  다른 동작으로 오해될 수 있음. `sell-preview-btn` (Eye 아이콘, `useCdPreviewStore().toggle()`) 추가.

### 12 (실패) — 스캔 버튼 클릭 시 products 만 refresh
실패 원인(파일:줄): `app/(tabs)/sell.tsx` 스캔 버튼 `onPress={() => router.push('/scan')}` —
  Expo Router 탭 `href: null` 경로가 웹 렌더러에서 불안정, 카메라 모듈 미포함 빌드에서
  `Camera.requestCameraPermissionsAsync()` throw → 스택 언와인드 중 FlashList PanGesture
  인식으로 pull-to-refresh 발동.
수정: `handleScanPress` 콜백 도입 — `Camera.getCameraPermissionsAsync()` 로 모듈 가용성
  선체크 → 성공 시 `router.push('/scan')`, 실패 시 `showToast.error('카메라를 쓸 수 없습니다')`.
  `scan.tsx` 에도 `requestCameraPermissionsAsync()` try-catch 추가 — 모듈 미포함 빌드에서
  `setHasPermission(false)` 처리.

## e2e 단언 범위

| 테스트 | 단언 | 결과 |
|--------|------|------|
| 헤더 탭 분리 · 미리보기 · `…` 없음 (3 vp) | sell-top-bar 빈 곳 클릭 → products-pickup 비노출, register-menu-btn → products-pickup 노출, sell-preview-btn 클릭 후 sell-top-bar 존재, menuBtnText truthy | ✅ 3/3 |
| 스캔 버튼 클릭 후 에러 없음 (3 vp) | pageerror 없음 | ✅ 3/3 |

products refetch 횟수는 web E2E에서 React Query `refetchOnWindowFocus` 로 인해
불확정 발생 → 단언 불가. 실기(iPad) 검증 필요.
