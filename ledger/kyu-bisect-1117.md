# Kyu 실기기 bisect — POS 기동 크래시 (2026-11-17)

증상: `[runtime not ready]: TypeError: property is not writable` ×2 → `AppRegistryBinding::startSurface failed. Global was not installed.` · 앱은 MEROS 로고 로딩 화면에서 멈춤

| 시각 | 커밋 | 포함 | 결과 |
|---|---|---|---|
| 11:14 | 4c6b588 (#170) | 오전분 | ✅ 정상 (Kyu 실기 OK) |
| 15:17 | e21c381 (#178 · master) | 전부 | ❌ 멈춤 |
| 15:20 | fba37d6 (#162) | #172 + #162 까지 | ❌ 멈춤 (6690 modules) |
| 15:26 | 15a941e (#172) | #172 까지 | ❌ 멈춤 (6690 modules) |
| 15:27 | **4c6b588 (#170 · 오전 정상 코드)** | 오전분 | ❌ **멈춤 (6689 modules)** |

## 결론: 코드가 아니라 환경 문제
- 15:32 Kyu 진단: `git status` 깨끗 · **`node_modules` 디렉터리 최종 변경 = 2026-11-17 12:49 WIB**(Kyu 식사 중 · 자동 진행 시간대) · reanimated/worklets 폴더 자체는 11-12 그대로(4.7.1 / 0.13.0)
- 즉 12:49 에 누군가 Kyu 폴더(`~/projects/agilo-fork-test`)에서 패키지 설치/삭제를 실행 → 최상위 모듈 구성이 바뀜(번들 6647 → 6689)
- 조치: Kyu 가 `npm ci`(package-lock 기준 재설치) → `--clear` 재시작
- 재발 방지: 어느 허브가 12:49 에 Kyu 폴더에서 install 했는지 추적(허브 로그) · 러너/프롬프트에 Kyu 폴더 쓰기 차단 강화
