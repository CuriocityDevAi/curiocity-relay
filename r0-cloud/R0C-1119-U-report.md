R0 판정: APPROVE

# R0C-1119-U 재리뷰 리포트 — storeport PR #398 (native-diff · HEAD 8e8f17e · 2026-11-19 클라우드 R0)

PR 코멘트: https://github.com/CuriocityDevAi/storeport/pull/398#issuecomment-7007277739
직전 판정: R0C-1119-S = CHANGES (`r0-cloud/R0C-1119-S-report.md`) → 수정: M0-1119-L (`m0/M0-1119-L-report.md`)

## 1. 직전 CHANGES 5건 — 직접 다시 돌려 확인

| # | 직전에 지적한 것 | 확인 결과 |
|---|---|---|
| 1 | expo/react-native 본체 · @scope 패키지를 놓침 | ✅ RN 0.88.1→0.89.0 · expo ~58→~59 · `@react-native-async-storage/async-storage` 추가 → 모두 exit 1 |
| 2 | HEAD 만 비교함 | ✅ 작업 트리와 비교. 커밋 안 한 `expo-camera` 추가 → exit 1 + 미커밋 경고 |
| 3 | 플러그인을 이름만 비교 | ✅ splash `backgroundColor` 변경 → `[~] plugins` exit 1 · `ios.infoPlist` 추가 → `[~] ios` exit 1 |
| 4 | 기준 SHA 를 손으로 넣음 · 잘못된 SHA 와 재빌드가 구분 안 됨 | ✅ 기본값을 `eas build:list` 에서 가져옴 · 없는 SHA → exit 2 · 인자 없음 + eas 없음 → exit 2 |
| 5 | 실행 비트 없음 | ✅ `.sh` · `.mjs` 둘 다 100755 · `./scripts/native-diff.sh` 바로 실행됨 |

오탐 없음: `date-fns` → exit 0 · `zod` + `@tanstack/react-query` → exit 0. 11-18 사고 커밋 `1e1bd3ec` → `[+] expo-secure-store` exit 1.

## 2. 알려진 한계 (이름 목록 방식 vs @expo/fingerprint) — 직접 확인

| # | 경우 | 결과 |
|---|---|---|
| L1 | 이름 규칙에 안 맞는 네이티브 패키지: `lottie-react-native` · `@shopify/react-native-skia` · `@sentry/react-native` | ❌ "OTA 가능" exit 0 (놓침) |
| L2 | 루트 `patches/` + `pnpm.patchedDependencies` 로 expo-updates 네이티브 패치 | ❌ exit 0 (놓침) |
| L3 | app.config `ios.infoPlist` 추가 | ✅ exit 1 (잡힘) |
| L4 | `assets/splash.png` 를 같은 경로에서 내용만 교체 | ❌ exit 0 (놓침) |

이 도구로는 안 보이는 것 (코드를 읽어서 확인): `pnpm-lock` 안에서 `~` 범위 버전이 올라가는 경우 · app.config 밖 변수(예: `ios: IOS`)만 바꾼 경우 · 미커밋 경고는 package.json·app.config.ts 두 파일만 봄.

**치명적이라고 보지 않은 이유**: 현재 의존성은 모두 expo-/react-native- 접두어 → 지금 바로 놓칠 위험은 낮음. 직전에 요구한 5건은 전부 해결됨. fingerprint 대신 이 방식을 고른 근거(node_modules 없이 동작)가 있음.

**후속 권장** (별도 티켓): ① 판별 규칙을 `/(^|[/-])react-native($|-)/` 로 넓히기 ② `patches/` · `assets/` 경로가 바뀌면 exit 1 ③ 길게는 `@expo/fingerprint` 로 바꾸는 것 검토.

## 3. 다른 곳 영향 없음
- customer-display `tsc --noEmit` exit 0
- vitest Test Files 12 passed · Tests 200 passed (native-diff.test.mjs 는 vitest 대상 아님 · `node --test` 로 따로 돌림 11/11 pass)
- naming-check PASS · `src/`·`app/` 수정 없음

## 4. 실행 로그

```
1 RN 0.88.1->0.89.0          → [~] "react-native" exit=1
2 expo ~58->~59              → [~] "expo" exit=1
3 +@react-native-async-storage/async-storage → [+] exit=1
4 splash backgroundColor     → [~] plugins exit=1
5 expo-camera 미커밋          → [+] "expo-camera" + ⚠️ 미커밋 M package.json exit=1
6 date-fns                   → ✅ OTA 가능 exit=0
7 zod + @tanstack/react-query → ✅ OTA 가능 exit=0
8 deadbeefdeadbeef           → ❌ 잘못된 SHA exit=2
9 인자 없음 (eas 없음)        → Usage … exit=2
incident 1e1bd3ec            → [+] expo-secure-store · [~] plugins · [~] android exit=1
mode: native-diff.sh 100755 · native-diff.mjs 100755
L1a lottie-react-native      → ✅ OTA 가능 exit=0  ← 놓침
L1b @shopify/react-native-skia → ✅ OTA 가능 exit=0 ← 놓침
L1c @sentry/react-native     → ✅ OTA 가능 exit=0  ← 놓침
L2 patches/ + patchedDependencies → exit=0        ← 놓침
L3 ios.infoPlist 추가         → [~] ios exit=1
L4 splash.png 내용만 교체     → exit=0             ← 놓침
node --test native-diff.test.mjs → tests 11 · pass 11 · fail 0
```

방법: 분리된 git worktree(detached `8e8f17e`) 에서 파일을 고치고(필요하면 임시 커밋) `./scripts/native-diff.sh 8e8f17e` 실행 → 매번 reset 으로 되돌림.

## 5. 하지 않은 것
storeport push · 머지 안 함.
