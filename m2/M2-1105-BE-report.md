# M2-1105-BE Report

**완료일시**: 2026-11-13  
**PR**: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/124  
**브랜치**: docs/m2-1105-be-eas-plan → base: master

---

## 대사표 요약

| 분류 | 기능 | 개수 |
|------|------|------|
| 넣음 | Share PNG(react-native-view-shot + expo-sharing) · 바코드 카메라(expo-camera) · 햅틱(expo-haptics) · Sentry 네이티브 | **4** |
| 이연 | BLE 프린터 dynamic require 정리(R3) | **1** |
| 범위 밖 | 현금 서랍 하드웨어 제어 | **1** |

BLE 프린터는 `react-native-ble-plx` 플러그인이 이미 `app.json` 에 등록되어 있어, 새 빌드에 자동 포함됨(우회 코드 정리는 R3 이연).

---

## 권장 프로필

**`development`** 프로필로 빌드 — `developmentClient: true` · `distribution: internal` · hot-reload 흐름 그대로 유지.

---

## Kyu 손작업 단계 수

**5단계**: EAS 로그인 확인 → iPad UDID 확인 → 빌드 실행 → iPad 설치 → 동작 확인(Share PNG 토스트 없음).

---

## 후속 라운드 수

**4라운드**: R1(app.json expo-camera plugin 추가 → EAS 빌드) → R2(Share PNG 우회 로직 제거) → R3(BLE dynamic require 정리) → R4(프린터 UI + BT-58D 실기).

---

## 열린 질문 (Kyu 결정)

1. **R2 타이밍**: 새 dev client 설치 확인 후 즉시 vs 며칠 사용 후 (권장: 며칠 후)
2. **preview 빌드 필요 여부**: 지금은 development만 / 나중에 preview (권장: development만)
3. **EAS 플랜**: 무료 30빌드/월 충분 여부 (권장: 무료 유지)

---

## 자기 검증

```
git diff --stat origin/master
docs/eas-build-plan.md | 232 ++++++++++++++++++++++++
 1 file changed, 232 insertions(+)
```

docs 1파일만 ✓ · 7절 모두 있음 ✓ · 파일:줄 근거 ✓ · 손작업 단계 번호 ✓
