가능 · 권장 도구: Maestro · 1회 소요: boot ~2분 / cart ~5분 / cash ~8분 · Kyu 할 일 2개

## 실측 현황

- **Xcode 27.2** (Build 27B52) · iPad 시뮬레이터 13대 available · 디스크 여유 ~66 GB
- **Maestro 설치됨** (`~/.maestro/bin/maestro`) — Java 8 → Java 17 업그레이드만 하면 즉시 활성화
- Detox/Appium 미설치
- **기존 자산 발견**: `maestro/pos/` 에 이미 6개 YAML 테스트 존재 + `docs/testing/native-sim.md` runbook 완비

## 권장 도구: Maestro

이미 설치·6개 테스트·runbook 완비. Java 17 한 단계만 추가하면 `sim:test:boot` 즉시 실행 가능.

## Kyu 할 일 2개

1. `brew install openjdk@17` → `.zshrc` PATH 추가 → `maestro --version` 확인
2. 테스트 계정 (EMAIL / PASSWORD / PRODUCT_TITLE) 준비 → 허브에 전달

## 빌드 경로

`npx expo run:ios` 로컬 권장 · 첫 빌드 ~8분 · JS-only 변경은 Metro hot reload → 재빌드 불필요
EAS `development.ios.simulator` = `false` (현재) → 클라우드 빌드 쓰려면 `true` 필요하나 로컬이 더 빠름

## 첫 테스트 3개 (설계)

- **(a) 장바구니 즉시 표시**: `waitForAnimationToEnd: 200` + `assertVisible` — `sim-cart-instant.yaml` 신규
- **(b) Checkout 버튼 높이**: Maestro 픽셀 측정 불가 → visibility 어설션 + takeScreenshot, 정밀은 Playwright M1-1117-D-measure.spec.ts 담당
- **(c) 손님 화면 짝짓기**: 두 시뮬 동시 제어 필요 → 아키텍처 확인 후 다음 라운드

## 한계

BLE 프린터 · 실제 결제 단말 · 성능 차이(Mac CPU ≠ A-series) · 카메라/바코드

## PR

agilo-medusa-pos-fork#171 — docs/plans/sim-e2e.md
