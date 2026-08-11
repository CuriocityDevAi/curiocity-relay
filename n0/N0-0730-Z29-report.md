# N0-0730-Z29 · 리포트

**round**: `N0-0730-Z29`
**timestamp**: 2026-08-11
**branch**: `feat/roulette-z1-vertical-bingo`
**HEAD**: `269d1a1f`
**PR**: https://github.com/CuriocityDevAi/grownest/pull/288

---

## 요약

Kyu B-9-x 중간 판정 · ×2 시 합산 결과 카드가 프로필 (Z28-5 · z 80) 뒤로
가려짐 · 위치 상향 + z 위계 정정.

## 착수 · 결정 정리

### Z29-1 · 결과 카드 위치 상향

**Kyu 정본**: MultiSpinResultCard Y = wheel 그룹 세로 중앙 근처 · 하단 프로필
캐러셀 영역과 겹치지 않게. 전 배치 공통. 하드코딩 좌표 금지.

**Fix** (`MultiSpinResultCard.tsx` 컨테이너 style):
```typescript
alignItems: "center",  // 이전 flex-end · 하단 겹침 → center · 중앙.
```

viewport center = wheel 그룹 중앙 (Z20 그룹 중앙 정렬 정합) · 자연 정합 · 별도
autoScale groupHeight 계산 불필요.

### Z29-2 · z 위계 정정 (Kyu 번복)

**Fix**:
```typescript
zIndex: 85,  // 이전 62 · Z28-5 프로필 (z 80) 위로 상향.
```

**최종 위계**:
| z-index | 컴포넌트 |
|--------|---------|
| 5      | Modal dim overlay |
| 55     | 배경 wheel wrapper |
| 54     | MultiWheelExtras container |
| 58     | MultiSpinMergeFlash |
| 60     | MultiSpinBanner · JackpotBox · SavingsBox |
| 68     | Z28-3 sticky dim (순차 Reveal 활성 시) |
| 70     | RouletteResultReveal container |
| 80     | ParticipantCarousel (Z28-5) |
| **85** | **MultiSpinResultCard (Z29-2 · 최상위)** |

**정본 개정**: Z28-5 "프로필 최상위" 정본 → **"결과 카드 제외 최상위"** 로 개정.
- 프로필 은 wheel · Reveal · 배너 · box · sticky dim 위.
- 결과 카드 는 프로필 위 (담기 액션 우선 · 프로필은 참조).

### Z29-3 (유지)

- Z28 라쳇 · sticky dim · 스케일업 · Z28-1 증적 로그 · 전 정본. 변경 없음.

## [DOC] 정본 문서 반영

- `docs/epics/roulette-final-redesign.md` · § N0-0730-Z29 정본 편입 (Z29-1
  위치 상향 · Z29-2 z 정정 + Z28-5 서술 개정).
- `EPIC-STATE.md` · 룰렛 EPIC 라인 갱신:
  - `last_touched=2026-08-11 · last_verified=2026-08-11`.
  - `γ Z-1~Z29 PR #288 (auto-merge OFF · Kyu N0-0730-Z29 결과 카드 위치·z
    정정)`.

## QC

- **typecheck**: `tsc --noEmit` · 에러 0.
- **lint**: baseline 유지 (218 · 신규 없음).
- **test**: `jest` · 83 suites · 1102 pass · 5 skip · 0 fail · 11.9s.

## 커밋

```
269d1a1f feat(roulette): Z29 결과 카드 위치·z 정정 (N0-0730-Z29)
```

## 착지 상태

- PR #288 body 갱신 · B-9-y 실기 체크리스트 (Z29-1 카드 위치 · Z29-2 z 위계
  정합 · Z28 유지) · QC · EPIC-STATE 갱신.
- Kyu B-9-y 실기 대기.

## 다음 라운드 (Z30) 예약

Kyu B-9-y 실기 결과에 따라:

- **Z30-1** = Z28-1 증적 로그 캡처 후 · 정산 0 회귀 뿌리 확정 · fix.
- **Z30-2** = Z28-2 라쳇 UX 미세조정 (볼륨/interval/톤).
- **Z30-3** = Z28-3 sticky dim 시각 잔존 시 opacity 조정.
- **Z30-4** = Z28-4 스케일업 timing.
- 실기 이상 없으면 · PR #288 최종 도장 · Z 시퀀스 종결 · γ 후속.

## 이연 순증감

- **이연 신설**: 없음.
- **이연 해소**: **카드 프로필 겹침** (Z28-5 정본 부작용 · Z29-2 z 상향 + Z29-1
  위치 상향으로 해소).
