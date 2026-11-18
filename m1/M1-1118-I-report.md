PR #373 · 라운드 6개 · Android 위험 5건 · 프린터 권장 라이브러리 react-native-ble-plx · Kyu 결정 6건

## 결과 요약

- **PR**: https://github.com/CuriocityDevAi/storeport/pull/373 (draft · 머지 금지)
- **파일**: `docs/plans/meros-golive.md` (브랜치 `docs/M1-1118-I-golive-plan`)

## Android 위험 5건

1. BLUETOOTH_SCAN 권한 누락 (Android 12+ 필수) — app.json 수정 필요
2. portrait 고정 (Redmi Pad 2 태블릿 가로 UX 미검증)
3. ColorOS/HyperOS 배터리 최적화 → BLE 연결 끊김
4. BT-58D BLE/Classic Android 실측 없음
5. EAS Android APK 미빌드 (경로 있지만 실 생성·설치 미검증)

## 프린터 권장: react-native-ble-plx (이미 설치됨 · iOS/Android 동일 경로)

## 라운드 6개

| R | 제목 | 시간 | 허브 |
|---|------|------|------|
| R1 | Android APK 빌드 + Oppo 기초 실측 | 45분 | pos-m1 fork |
| R2 | BLUETOOTH_SCAN 권한 추가 + 재빌드 | 30분 | pos-m1 fork |
| R3 | 프린터 Android 실측 (BT-58D + Redmi) | 45분 | pos-m1 fork |
| R4 | 영수증 헤더 Admin 설정 + 오프라인 배너 | 35분 | storeport |
| R5 | 매장 초기 데이터 입력 가이드 runbook | 30분 | storeport docs |
| R6 | Kyu 최종 실기 체크 (end-to-end) | 60분 | — |

## Kyu 결정 6건

1. Redmi Pad 2 구매 시기 (권장: 지금)
2. BT-58D 구매 시기 (권장: 지금)
3. 태블릿 화면 방향 portrait/landscape (권장: portrait 먼저)
4. QRIS 1차 = 정적 QR 스탠드 수기 확인 OK 여부 (권장: OK)
5. Xendit KYC 신청 타이밍 (권장: 지금 병렬 신청)
6. BCA/BRI 은행 파트너 신청 타이밍 (권장: 이연)
