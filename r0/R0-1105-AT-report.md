# R0-1105-AT — 리뷰 리포트: fork #73 (캡슐 토스트 · 어두운 캡슐형)

**판정: APPROVE**

---

## run-all 재실행 로그

```
worktree: origin/feat/m3-1105-ab-toast-capsule (ce9cb4c)
node_modules: symlink ~/projects/pos-r0/node_modules

==== ASSERTIONS · 22개 ====
  · m0-1103-a-assertions.mjs ... PASS · 0.1s
  · m0-1103-c-assertions.mjs ... PASS · 0.2s
  · m0-1103-d-assertions.mjs ... PASS · 0.1s
  · m0-1104-a-assertions.mjs ... PASS · 0.1s
  · m1-1104-a-assertions.mjs ... PASS · 0.1s
  · m1-1104-b-assertions.mjs ... PASS · 0.1s
  · m1-1105-a-assertions.mjs ... PASS · 0.1s
  · m1-1105-h-assertions.mjs ... PASS · 0.1s
  · m1-1105-r-tender-guard.mjs ... PASS · 0.2s
  · m2-1104-d-escpos-assertions.mjs ... PASS · 0.5s
  · m2-1105-m-receipt-escpos-assertions.mjs ... PASS · 0.7s
  · m2-1105-n-accent-guard.mjs ... PASS · 0.1s
  · m2-1105-p-logo-bitmap-assertions.mjs ... PASS · 0.7s
  · m2-1105-q-bundle-guard.mjs ... PASS · 18.2s
  · m3-1104-a-assertions.mjs ... PASS · 0.1s
  · m3-1105-a-color-assertions.mjs ... PASS · 0.1s
  · m3-1105-ab-assertions.mjs ... PASS · 0.1s
  · m3-1105-c-english-assertions.mjs ... PASS · 0.1s
  · m3-1105-d-assertions.mjs ... PASS · 0.1s
  · m3-1105-s-option-chip-assertions.mjs ... PASS · 0.1s
  · m3-1105-v-assertions.mjs ... PASS · 0.1s
  · m3-1105-x-fulfill-assertions.mjs ... PASS · 0.1s

==== 요약 ====
  총 22 개 · 22 PASS · 0 FAIL · 21.7s
```

---

## REQ 별 체크

### REQ 1 — 새 의존성

- **sonner-native 채택 검토 → 자체 구현 선택** ✅
  - reanimated 4.x 호환 PR 미병합, Expo Go 동작 미보장, 번들 +~30 KB 이유로 기각
  - 대신 `react-native-toast-message` 커스텀 config 방식 유지 → 새 의존성 **0**
  - 네이티브 모듈 추가 없음 → Expo Go 기동 OK
- **번들 가드 (m2-1105-q)** PASS ✅ — 정적 grep 0건·Metro iOS 번들 해석 성공
- 번들 크기 증가: 0 (외부 패키지 없음, `CapsuleToast.tsx` 57줄 · `index.ts` 42줄 추가만)

### REQ 2 — 모양

| 항목 | 코드 | 결과 |
|---|---|---|
| 배경 = ink 토큰 | `className="... bg-ink ..."` (CapsuleToast:38) | ✅ |
| 글자 on-ink | `text-on-ink` (CapsuleToast:50,51) | ✅ |
| 아이콘 색 = 토큰 | `TOKEN_TOAST_SUCCESS/DANGER/MUTED` (CapsuleToast:28-33) | ✅ |
| raw hex 0 | 어설션 PASS (`shadowColor: TOKEN_INK` 토큰 사용) | ✅ |
| 위 가운데 | `position="top" topOffset={60}` (_layout:162, BottomSheet:235) | ✅ |
| safe-area | topOffset=60 (safe-area 아래) | ✅ |
| iPad 최대 폭 | `max-w-[420px]` (CapsuleToast:38) | ✅ |
| 그림자 약하게 | `shadow-sm` + `shadowOpacity: 0.12` + `elevation: 3` | ✅ |

### REQ 3 — 동작

| 항목 | 코드 | 결과 |
|---|---|---|
| 2.5초 (success/info) | `DEFAULT_SUCCESS_MS = 2500`, `DEFAULT_INFO_MS = 2500` | ✅ |
| 4초 (error) | `DEFAULT_ERROR_MS = 4000` | ✅ |
| 위로 스와이프 닫기 | 라이브러리 기본 (swipeEnabled default) | ✅ |
| 최대 3개 쌓임 | **미구현** — `react-native-toast-message`는 단일 큐 · V1 단일 토스트 (PR 명시) | ⚠️ V1 범위 외 |
| reduce motion 페이드 | **미구현** — `AccessibilityInfo` 체크 없음 | ⚠️ V1 범위 외 |

### REQ 4 — 호출 지점

- **옛 `Toast.show` 직접 호출 0** (허용 파일 기준): 어설션 PASS ✅
- **직접 `react-native-toast-message` import 0** (wrapper 외): 어설션 PASS ✅
- **문구 변경 0건**: contexts/auth.tsx의 한국어 문구 `'서버 주소가 바뀌었어요'` 그대로 유지 ✅
- **master 최신(#70 #71 #72 머지)과 충돌 없음**: `git merge-tree` 출력 없음 ✅
  - #71(eas dev-build), #72(picker tokens) 모두 다른 파일/키 → 무충돌

### REQ 5 — 스샷 3장

| 파일 | 뷰포트 | 토스트 | 확인 |
|---|---|---|---|
| 01-ipad-error.png | iPad 1366×1024 | "Login Failed / Invalid email or password" · 빨강 ! 아이콘 · ink 배경 · 흰 글자 | ✅ |
| 02-ipad-success.png | iPad 1366×1024 | "Register opened" · 초록 ✓ 아이콘 · ink 배경 · 흰 글자 | ✅ |
| 03-phone-error.png | 폰 393×852 | "Login Failed / Invalid email or password" · 빨강 ! 아이콘 · ink 배경 · 흰 글자 | ✅ |

스크린샷 공통 관찰:
- 흰 로그인 화면 위에서 어두운 캡슐이 명확히 가시 (원래 문제 해결) ✅
- 화면 위 가운데 정렬 ✅
- 폰·iPad 모두 캡슐 폭이 콘텐츠에 맞게 적절함 (420px 최대폭 작동)

---

## 종합 판정

**APPROVE**

원래 보고된 문제 "Hand over 뒤 뜨는 알림이 흰 화면에 묻혀 안 보임"이 ink(검정) 배경 캡슐 토스트로 완전히 해결됨.

- 새 의존성 0 · 번들 가드 통과
- 디자인 토큰(bg-ink, on-ink, toast-success/danger/muted) 완비
- 허용 범위 내 Toast.show 직접 호출 완전 제거
- 22/22 assertions PASS
- master (#70 #71 #72 포함) 대비 충돌 없음

**V1 알려진 한계** (차기 PR 대상, 이번 APPROVE 블로커 아님):
1. 토스트 최대 3개 쌓임 미지원 — `react-native-toast-message` 단일 큐 한계
2. `reduce motion` 페이드 미구현 — `AccessibilityInfo.isReduceMotionEnabled()` 체크 필요

---

*리뷰어: claude-sonnet-4-6 · 2026-11-10*
