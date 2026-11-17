# Kyu 실기기 bisect — POS 기동 크래시 (2026-11-17)

증상: `[runtime not ready]: TypeError: property is not writable` ×2 → `AppRegistryBinding::startSurface failed. Global was not installed.` · 앱은 MEROS 로고 로딩 화면에서 멈춤

| 시각 | 커밋 | 포함 | 결과 |
|---|---|---|---|
| 11:14 | 4c6b588 (#170) | 오전분 | ✅ 정상 (Kyu 실기 OK) |
| 15:17 | e21c381 (#178 · master) | 전부 | ❌ 멈춤 |
| 15:20 | fba37d6 (#162) | #172 + #162 까지 | ❌ 멈춤 (6690 modules) |
| 15:26 | 15a941e (#172) | #172 까지 | ❌ 멈춤 (6690 modules) |

→ 범인 = #172(나눠결제 SlipMergeAnim) 또는 **환경 변화**(오전 정상 4c6b588 이 지금도 정상인지 확인 필요). 다음: 4c6b588 재확인
- 참고: 오전 09:2x 번들 6647 modules · 지금 6690 — #172 가 44 모듈 추가? 아니면 node_modules 변화?
