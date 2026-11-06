---
round: M2-1105-H
pr:
  fork: agilo-medusa-pos-fork#41
commit: 44b7154e9b53c99cc78548bbd13cb822a497fdb3
outcome: iOS 시뮬 네이티브 빌드 흐름 확립 · Maestro boot smoke 4/4 · CI green · 머지 가능
kyu_checks: 2 (Mac 에서 `npm run sim:run` + `npm run sim:test:boot` 실행 확인 · credentials 있을 때 cart flow 1회)
ci_run: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/42302916723
ci_duration_s: 212
---

# M2-1105-H · iOS 시뮬 네이티브 빌드 + Maestro smoke

**일자**: 2026-11-07 · **허브**: M2 · **상대 리포**: `agilo-medusa-pos-fork` · **base**: `master = 9e99354`

## 1. 안건 ↔ 상태

| # | 안건 | 상태 |
|---|------|------|
| 1 | Apple 승인 없이 iOS 시뮬 네이티브 빌드 뜨는지 | ✓ `expo run:ios` · BUILD SUCCEEDED · iPad Pro 11" (M5) 설치 |
| 2 | Maestro (또는 동등) smoke — 로그인 폼 렌더 | ✓ 4/4 PASS (loginEmail · loginPassword · "Sign In" · screenshot) |
| 3 | 전체 플로 (로그인 → 상품 → 담기 → Cart) | ✓ YAML 템플릿 (`sim-cart-flow.yaml`) · 실행은 자격 증명 필요 |
| 4 | 처음 하는 사람 런북 | ✓ `docs/testing/native-sim.md` |
| 5 | BLE 시뮬 불가 flag | ✓ 런북 §한계 + sim-cart-flow 주석 |
| 6 | `ios/` 커밋 금지 (.gitignore 확인) | ✓ `.gitignore` 에 `ios/` · `android/` 추가 (기존 누락 발견) |
| 7 | 제품 코드 미수정 | ✓ app/** · components/** · api/** · lib/** 전부 그대로 |
| 8 | 본 PR CI green | ✓ 3m32s · 20/20 테스트 |

## 2. 변경 파일 (owner 범위)

| 파일 | 변경 |
|------|------|
| `.gitignore` | `ios/` · `android/` 추가 |
| `package.json` | scripts 3개 추가 (`sim:run` · `sim:test:boot` · `sim:test:cart`) |
| `maestro/pos/sim-boot-smoke.yaml` | 신규 |
| `maestro/pos/sim-cart-flow.yaml` | 신규 (EMAIL/PASSWORD env) |
| `docs/testing/native-sim.md` | 신규 (120+ 라인 · 처음 하는 사람 런북) |
| `docs/M2-1105-H-sim-login.png` | 신규 (sim 로그인 스샷) |

## 3. 실행 로그

### 3-A. `expo run:ios --device "iPad Pro 11-inch (M5)"`

```
› Build Succeeded
› 0 error(s), and 2 warning(s)
Starting Metro Bundler
› Installing /Users/.../MerosPOS.app
› Installing on iPad Pro 11-inch (M5)
› Opening on iPad Pro 11-inch (M5) (id.meros.pos)
iOS Bundled 16050ms node_modules/expo-router/entry.js (4920 modules)
```

- 번들 ID: `id.meros.pos` (M2-1104-C)
- 빌드 시간: cold ~7 분 · 캐시 적중 ~1 분
- Metro dev server 자동 기동

### 3-B. `maestro test maestro/pos/sim-boot-smoke.yaml` (OpenJDK 17)

```
Running on iPad Pro 11-inch (M5) - iOS 26.2 - 14EE32C9-...
 > Flow sim-boot-smoke
Launch app "id.meros.pos" with clear state... COMPLETED
Wait for animation to end within 20000 ms... COMPLETED
Assert that id: loginEmail is visible... COMPLETED
Assert that id: loginPassword is visible... COMPLETED
Assert that "Sign In" is visible... COMPLETED
Take screenshot m2-1105-h-boot-login... COMPLETED
```

6/6 steps PASS.

### 3-C. Sim 스샷 (`docs/M2-1105-H-sim-login.png`)

MEROS 로고 (3-notch Receipt) + "POS" + Email Address / Password 입력 + Sign In 버튼. 네이티브 iPad 렌더 (SafeArea · iOS 상태바 포함).

### 3-D. 본 PR CI (fork CI from M2-1105-G)

- 런: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/42302916723
- **3m32s · PASS** (cache hit · M2-1105-G cold 4m48s 대비 1분 ↓)
- 어설션 10/10 · Playwright 10/10

### 3-E. Isolated `npm ci --legacy-peer-deps`

package.json scripts 만 변경 · lock 변동 없음 → `exit 0`.

## 4. 사전조건 (런북 §사전조건)

1. Xcode 15+ (현재 27.2)
2. CocoaPods (`brew install cocoapods`)
3. OpenJDK 17+ (`brew install openjdk@17`) — Maestro 전제
4. Maestro (`curl -fsSL https://get.maestro.mobile.dev | bash`)

## 5. 한계 (런북 §한계 발췌)

| 항목 | 시뮬 |
|------|------|
| JS · UI · 로그인 → Cart | ✅ |
| Sentry (JS 에러) | ✅ |
| SecureStore (Keychain) | ✅ |
| **BLE (프린터 BT-58D)** | **❌** CoreBluetooth 시뮬 비지원 — M2-1104-C runbook (Apple 승인 후 EAS dev-client) |
| 카메라 · 바코드 | ⚠️ Mac 웹캠 매핑 가능 |

## 6. Kyu 실기 (처음 하는 사람 · 10 분)

```bash
# 사전조건 (최초 1회)
brew install cocoapods openjdk@17
curl -fsSL https://get.maestro.mobile.dev | bash
echo 'export PATH=/opt/homebrew/opt/openjdk@17/bin:$PATH' >> ~/.zshrc && source ~/.zshrc

# 실행
npm run sim:run           # iPad Pro 11" (M5) 에 설치 (cold ~7분)
npm run sim:test:boot     # Maestro boot smoke
```

Credentials 있을 때 full E2E:
```bash
npm run sim:test:cart -- -e EMAIL=... -e PASSWORD=... -e PRODUCT_TITLE='Kopi Tubruk'
```

## 7. 스택 관계

- base = `master = 9e99354` (M2-1105-G CI 머지분)
- M2-1105-G 의 fork CI 가 본 PR 에서 자동 돌음 → 3m32s green
- 라운드 체인: M2-1105-E (뿌리 진단) → F (web single + 공용 하네스) → G (fork CI) → **H (네이티브 시뮬 확장)**

## 8. 범위 밖 (후속)

- Android 시뮬 (`expo run:android` · 별도 라운드)
- Maestro cart flow 를 CI 에 통합 (시뮬 띄우기 비용 때문에 로컬만 · fork CI 는 웹까지)
- 스냅샷 리그레션 (Sentry Snapshots)
- BLE 실측 (M2-1104-C runbook · Apple 승인 후)

## 9. 참고

- PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/41
- 브랜치: `chore/m2-1105-h-ios-sim` · 커밋 `44b7154`
- CI 런: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/42302916723 · 3m32s
- 선행 리포: `m2/M2-1104-C-report.md` (Apple 승인 후 EAS dev-client · BLE) · `m2/M2-1105-G-report.md` (fork CI)
