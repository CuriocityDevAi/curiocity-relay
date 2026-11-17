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
- 오전에 정상이던 같은 코드가 지금은 멈춤 → 11:14~14:08 사이 Kyu 맥의 `~/projects/agilo-fork-test` node_modules·Metro·dev client 중 무엇인가가 바뀜
- 번들 모듈 수: 오전 09:2x 6647 → 지금 6689~6690 (+42~44) — node_modules 변화 의심(누군가 install 했거나 의존성 해석이 바뀜)
- 의심: 허브가 Kyu 폴더에서 install/빌드 실행? · 네이티브 dev client 와 JS(reanimated/worklets) 버전 불일치
- 다음: Kyu 폴더 읽기 전용 진단(git status · node_modules 변경 시각 · reanimated/worklets 버전) → `npm ci` 로 package-lock 기준 재설치
