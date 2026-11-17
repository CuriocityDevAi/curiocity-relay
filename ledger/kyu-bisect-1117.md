# Kyu 실기기 bisect — POS 기동 크래시 (2026-11-17)

증상: `[runtime not ready]: TypeError: property is not writable` ×2 → `AppRegistryBinding::startSurface failed. Global was not installed.` · 앱은 MEROS 로고 로딩 화면에서 멈춤

| 시각 | 커밋 | 포함 | 결과 |
|---|---|---|---|
| 11:14 | 4c6b588 (#170) | 오전분 | ✅ 정상 (Kyu 실기 OK) |
| 15:17 | e21c381 (#178 · master) | 전부 | ❌ 멈춤 |
| 15:20 | fba37d6 (#162) | #172 + #162 까지 | ❌ 멈춤 (6690 modules) |

→ 범인 = #172(15a941e · 나눠결제 SlipMergeAnim) 또는 #162(fba37d6 · POS 시작 화면 애니) · 다음: 15a941e 확인
