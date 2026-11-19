R0 판정: CHANGES

# R0C-1119-S 리뷰 리포트 — storeport PR #398 (M3-1119-L · native-diff.sh · HEAD 106cc68 · 2026-11-19 클라우드 R0)

PR 코멘트: https://github.com/CuriocityDevAi/storeport/pull/398#issuecomment-7006498262

**근거** (PR head `106cc68` · base `e6a31fc` · 실측)
- ✅ 11-18 사고는 재현해서 잡음: `native-diff.sh 1e1bd3ec` / `cf3a2dd^` → `[+] expo-secure-store` (패키지 + 플러그인) · exit 1. JS-only 의존성 추가 (`date-fns`, `zod`, `@tanstack/react-query`) 는 오탐 없음 · exit 0.
- ❌ **위험한 놓침(false negative)**: 재빌드가 꼭 필요한데 "✅ OTA 가능 · exit 0" 이 나오는 경우들 — `react-native` 0.88.1→0.89.0, `expo` SDK ~58→~59, scoped 네이티브 패키지 (`@react-native-async-storage/async-storage`), 플러그인 옵션 변경 (splash `backgroundColor`). 정규식 `"(expo-|react-native-)…"` 가 `expo`/`react-native` 본체와 `@scope/` 패키지를 빼먹고, 플러그인은 이름만 비교함. `runtimeVersion: appVersion` 이라 SDK/RN 을 올렸는데 version 을 안 올리면 호환 안 되는 바이너리로 OTA 가 나가서 11-18 보다 더 큰 사고가 남.
- ❌ 커밋된 `HEAD` 만 비교함: 작업 트리에 `expo-camera` 를 추가하고 커밋하지 않으면 "OTA 가능" (exit 0). 그런데 OTA 는 보통 작업 트리에서 그대로 publish 됨.
- ⚠️ 비교 기준 = 손으로 넣는 SHA 인자. 레포에 커밋된 값이 아니라서 "갱신 누락" 위험은 없음. 대신 **틀린 SHA 를 넣을 위험**이 있음 (빌드 커밋을 기록해 두는 곳이 없음). 없는 SHA 를 넣으면 `fatal` + exit 1 이 나와서 "재빌드 필요" 와 구분이 안 됨.
- 기타: 파일 모드 100644 → 사용법대로 `./scripts/native-diff.sh` 를 실행하면 Permission denied (126). PR 본문 예시의 `[+] "qrcode"` 줄은 실제 출력에 없음 (정규식 범위 밖).
- 영향 없음: customer-display `tsc --noEmit` 0 에러 · vitest 12 files / 200 tests pass · naming-check PASS · feature-map `apps/customer-display/scripts/**` 로 이미 커버됨.

**고칠 것**
1. 네이티브 판별을 이름 접두어가 아니라 실제 근거로: `expo`·`react-native` 본체 포함 + `@scope/` 포함. 가장 좋은 방법은 `npx expo-modules-autolinking resolve` / `expo-doctor` 결과나 `ios/`·`android/` 디렉터리(또는 `expo-module.config.json`) 가 있는 패키지 목록을 비교하는 것. 그게 어려우면 `@expo/fingerprint` (`npx @expo/fingerprint`) 로 빌드 시점 지문과 비교하는 방식으로 바꾸기 (플러그인 옵션 · 네이티브 설정까지 커버).
2. HEAD 가 아니라 작업 트리 (`cat $APP/package.json`) 와 비교하거나, 미커밋 변경이 있으면 경고 + exit 1.
3. 플러그인 비교를 이름이 아니라 `plugins` 블록 전체 (옵션 포함) 로 비교. `ios`/`android`/`runtimeVersion`/`version` 블록 변경도 감지.
4. 기준 SHA 를 자동으로 가져오기: `eas build:list --platform ios --profile development --limit 1 --json` 의 `gitCommitHash` 를 기본값으로 쓰기 (인자는 override 용). 잘못된 SHA → exit 2 로 분리.
5. `git update-index --chmod=+x` 로 실행 비트 넣고, PR 본문 예시 출력을 실제 출력과 맞추기.

<details><summary>실행 로그 (요약)</summary>

```
(a) HEAD / origin/main          → ✅ OTA 가능 exit=0
    1e1bd3ec, cf3a2dd^           → [+] expo-secure-store (pkg+plugin) exit=1
(b1) expo-camera 추가·미커밋     → ✅ OTA 가능 exit=0   ← 놓침
(b2) expo-camera 추가·커밋       → [+] "expo-camera" exit=1
(b3) @react-native-async-storage → ✅ OTA 가능 exit=0   ← 놓침
(b4) react-native 0.88.1→0.89.0  → ✅ OTA 가능 exit=0   ← 놓침
(b5) expo ~58→~59                → ✅ OTA 가능 exit=0   ← 놓침
(b6) splash 플러그인 옵션 변경   → ✅ OTA 가능 exit=0   ← 놓침
(c1) date-fns / (c2) zod+react-query → ✅ exit=0 (오탐 없음)
(c3) react-native-web bump (JS-only) → 재빌드 필요 exit=1 (보수적 오탐 · 허용 가능)
bogus sha → fatal: invalid object name exit=1
./scripts/native-diff.sh → Permission denied exit=126
```
</details>

---

> ⚠️ 이 경로에는 같은 ID(R0C-1119-S)로 커밋된 이전 리포트(#385 · #397 리뷰)가 이미 있었다. 지우지 않으려고 아래에 그대로 남겨 둔다.

<details><summary>이전 R0C-1119-S 리포트 (#385 · #397)</summary>

#385 APPROVE · #397 APPROVE · (#385: eslint error 모드 실측 0 error·로직 이동만 / #397: 우회 3곳 제거·직접 단언·느슨해진 곳 없음)

# R0C-1119-S 리뷰 리포트 (2026-11-19 · 클라우드 R0)

## #385 (M2-1118-V R-B3 · HEAD 736ee00) — APPROVE
- 이전 CHANGES(경계 위반 3건) 해소: `eslint .` 실측 **0 error** (9 warning)
- 규칙 작동 확인: src/lib 에 POS 경로 import 임시 파일 → error 나옴
- 로직 변경 0: 이동한 두 파일은 주석만 다름, `_shared` 는 재수출만, 나머지는 import 경로 + 줄바꿈
- typecheck 0 · unit 539/539 · it tenders 96/96 · void-refund-restock 6/6
- 메모: PR 본문 "105 warnings" → 실측 9. 아직 draft.

## #397 (M3-1119-K · HEAD b0ff974) — APPROVE
- 리허설 spec 직접 실행 10/10
- 환불·반품·나중 연결 모두 앞에서 이행된 주문을 그대로 사용. 단언은 유지 또는 강화(나중 연결: 경고 허용 → 200 필수, loyalty-info 200 필수)
- 메모: #384 이전 return route 로 되돌려도 이 spec 은 통과 — #384 실제 수정점(`id` 필드)은 `fulfilled-order-after-sales #S-3` 이 담당. 리허설도 `{id}` 형식으로 보내면 실기와 같아짐(선택).
- 환불 단언이 `ok:true` 뿐인 점은 기존과 동일 — 후속 강화 고려.

CI: 두 PR 모두 리뷰 시점 unit/build 진행 중(실패 없음).

</details>
