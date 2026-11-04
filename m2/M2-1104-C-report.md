---
round: M2-1104-C
pr:
  fork: agilo-medusa-pos-fork#18
commit: 418e19f2e920c1ea02d7aee593a3dac8b90a819b
outcome: EAS dev-client 빌드 1 명령 실행 가능 상태 · bundleId=id.meros.pos · BT-58D 라이브러리 3 비교 (코드 변경 0) · 머지 가능
kyu_checks: 3 (bundleId 승인 · 하드웨어 1안/2안 지정 · Apple 승인 후 runbook 5단계 진행)
---

# M2-1104-C · EAS dev build 준비 · 하드웨어 선행 조사

**일자**: 2026-11-04 · **허브**: M2 · **상대 리포**: `agilo-medusa-pos-fork` · **base**: `origin/master = 3f6b671` (M2-1104-A/B merged)

## 1. 안건 ↔ 상태

| # | 안건 | 상태 |
|---|------|------|
| 1 | eas.json development 프로파일 점검 | ✓ resourceClass · env secret · android.buildType apk 추가 |
| 2 | app.json bundleIdentifier · id.meros.pos 제안 | ✓ iOS + Android 둘 다 |
| 3 | `eas build --profile development --platform ios` 요구 입력 Kyu 절차 | ✓ `docs/runbooks/eas-dev-build.md` 5 단계 |
| 4 | **빌드 실행 안 함** | ✓ 금지 지침 준수 |
| 5 | BT-58D BLE 라이브러리 2~3개 비교 | ✓ `docs/plans/M2-1104-C-hardware.md` (ble-plx · esc-pos-printer · bluetooth-escpos-printer) |
| 6 | iOS BLE 권한 · Expo Go 불가 이유 1줄 | ✓ hardware plan §3 |
| 7 | **코드 변경 0** (하드웨어 조사만) | ✓ |

## 2. 변경 파일

| 파일 | 변경 | 라인 |
|------|------|------|
| `app.json` | bundleIdentifier + package 변경 | 2 |
| `eas.json` | resourceClass · env secret · android.buildType · 전 profile env | 25 |
| `docs/runbooks/eas-dev-build.md` | 신규 | 125 |
| `docs/plans/M2-1104-C-hardware.md` | 신규 | 140 |

**owner 범위 100% 준수**. 그 외 파일 미수정.

## 3. 핵심 결정

### 3-A. bundleId `id.meros.pos`

- 백엔드 `api.meros.id` · 어드민 `admin.meros.id` 와 역방향 DNS 정합.
- Apple/Play 아직 미등록 → 교체 비용 0.
- 과거 placeholder `com.curiocity.meros.pos` 는 agency → 발주 이관 흔적.
- **Kyu 거부권 열려 있음** (PR 코멘트).

### 3-B. BT-58D 권장안: `react-native-ble-plx` + 얇은 ESC/POS wrapper

- 중국산 thermal printer 는 EPSON ePOS 호환이 **부분적** 가능성 높음 → 저수준 바이트 작성 가능해야 디버깅.
- 미래 다른 중국산 프린터 · 바코드 스캐너 · 캐시 드로어 재사용.
- 대안 2안 (`react-native-esc-pos-printer`) 은 턴키 1시간 실측 → 실패 시 1안 전환.

### 3-C. Expo Go 불가 이유

**1줄**: Expo Go 는 고정 native module 셋 → `react-native-ble-plx` 네이티브 코드 부재 → scan 호출 즉시 fail → dev-client 필수.

## 4. 자동 검증

### 4-A. Playwright (Expo 웹 · SDK 58 · DSN 미설정)

```
--- (1) 미인증 상태 index.html (DSN 미설정) → 기동 ---
  ✓ (1) pageerror 0건
--- (2) 로그인 화면 DOM 도달 ---
  ✓ (2) 로그인 화면 요소 존재
--- (3) console.error 0건 ---
  ✓ (3) console.error 0건
--- (4) Sentry 심볼 흔적 (번들 포함 확인) ---
  ✓ (4) 엔트리 번들 로드됨

4/4 passed · 0 failed
```

### 4-B. clean-clone `npm ci --legacy-peer-deps`

```
added 973 packages, and audited 974 packages
exit 0
```

### 4-C. tsc

```
$ npx tsc --noEmit
app/_layout.tsx(6,8): error TS2882: Cannot find module or type declarations for side-effect import of '../global.css'.
```

기존 CSS side-effect import 선언 누락 1건만 (M2-1104-A 때부터 · 범위 밖).

## 5. Kyu 실기 체크리스트

- [ ] `id.meros.pos` 번들ID 승인 (대안 있으면 PR 코멘트)
- [ ] BT-58D 라이브러리 1안 (ble-plx 자작) / 2안 (esc-pos-printer 턴키) 중 하나 지정
- [ ] Apple Developer 승인 확인 → 완료 시 `docs/runbooks/eas-dev-build.md` 5 단계 진행

## 6. 후속 라운드 예정

- **M2-1104-D**: Android dev build 프로파일 (프린터 실측용)
- **M2-1104-E**: BT-58D 라이브러리 구현 · dev-client 재빌드 · 실측
- **M2-1104-F**: Sentry source map 자동 업로드

## 7. 참고

- PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/18
- 브랜치: `feat/m2-1104-c-eas-dev-prep` · base `master` (`3f6b671`)
- 커밋: `418e19f`
