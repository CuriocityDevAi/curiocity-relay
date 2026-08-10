# N0-0730-Z16 · 리포트

**round**: `N0-0730-Z16`
**timestamp**: 2026-08-10
**branch**: `feat/roulette-z1-vertical-bingo`
**HEAD**: `4690774c`
**PR**: https://github.com/CuriocityDevAi/grownest/pull/288

---

## 요약

Kyu B-9-l 판정 반영 · Z16-2 (담기 fix · 핵심) + Z16-3 (slice O) concrete +
Z16-1 (overlay 폐기) MVP + 심문 회부 (배경 wheel 완전 실현).

## 착수 · 결정 정리

### Z16-2 · 담기 스트림 + 카운트업 복구

**뿌리 진단**:
- MultiSpin 완료 → `onAllComplete(results)` → Modal `handleAcceptToWallet(
  wrappedResult)` 재-dispatch.
- 재-dispatch 시 · `depositState` 는 아직 "pending" (첫 SPIN accept 진입 시
  세팅됨) · handleAcceptToWallet line 648 `if (depositState !== "idle") return`
  조기 return → 스트림/증감 발화 없이 종료.

**Fix**: SPIN 분기 진입 시 (line 831 · MultiSpinStage 활성 직전) ·
`setDepositState("idle")` 리셋. 재-dispatch 시 setState 반영 후 정상 flow
진입 · splitN/copyAll/single 스트림 + 카운트업 발화.

**결과**: 담기 → 하트 스트림 · 지갑 카운트업 · 음수 시 하강 사운드 · zero 시
회색 💔 + 툭 · 정상 정합.

### Z16-3 · slice 반짝 O 아이콘

**뿌리 진단**:
- Kyu 실기 B-9-l · Z15-2 미니 룰렛 원반 (MiniDiscSvg · 8-slice + hub) 이
  slice 폭 (7.5°) 안에 너무 작아 디테일·글씨 안 보임.

**Fix**:
- CanonicalSlice 안 `MiniDiscSvg` 렌더 폐기.
- `SparklingOGlyph` 신설 · SVG `<text>` "O" 문자 + SVG `<animate>` opacity
  0.55 → 1 → 0.55 · 1.6s · repeatCount indefinite · begin stagger (i × 0.15s
  · 반짝 효과).
- count 개 세로 스택 (midR = LABEL_R_OUTER/INNER 중간 · gap = fontSize ×
  0.85 · startY = -(midR + totalLen / 2)).
- `labelStyle.color` / `outline` 재사용 (배경 대비 자동).
- MiniDiscSvg + DISC_SLICE_COLORS 완전 삭제.

**결과**: 배경 wheel 회전 중 · SPIN×N slice 에 "O" ×N 반짝 텍스트 · 디테일
문제 해소.

### Z16-1 · MultiSpinStage overlay 폐기 (MVP)

**뿌리 진단**:
- Z15-1 · MultiSpinStage 가 `rgba(0,0,0,0.65)` 오버레이 + wheel N 개 → 배경
  wheel 이 안 보여서 "N 개 wheel 이 오버레이로 겹쳐 뜬다" 오독.

**Fix (MVP)**:
- MultiSpinStage overlay `background: transparent` · `pointerEvents: none`
  (자식 wheel cell · 결과 카드는 `auto` 재활성).
- Modal 배경 wheel wrapper · `multiSpinActive` 시 `opacity: 0.2` dim (0.35s
  transition · 시각 위계). 배경 wheel 이 참고용으로 남고 · MultiSpinStage 안
  N 개 wheel 이 위계 상 위.

**완전 실현 (심문 회부 · Q1)**:
- Kyu 정본 "기존 배경 룰렛(중앙) 그대로 유지 + N-1 개 추가 = 총 N 개" 완전
  실현은 배경 wheel 을 slot 0 로 활용 · 재-스핀 가능 · wheelStage refactor
  (press 이벤트 wheel 별 분리 · landing 재-계산 · handleSpinEnd 재-라우팅)
  필요. 예상 300~500 LOC · Z17 스코프.

**MVP 한계**:
- 배경 wheel 인터랙션 불가 (사용자 스핀 못함).
- 배경 wheel SPIN slice pin 상태 · MultiSpinStage wheel 과 시각적으로 완전
  통일 안 됨.
- Kyu "겹침 금지" 요구 = 시각 위계로 우회 · 실 위치는 겹칠 수 있음.

## QC

- **typecheck**: `tsc --noEmit` · 에러 0.
- **lint**: baseline 유지 (215 problems · 35 errors · 180 warnings · Z16
  신규 없음).
- **test**: `jest` · 83 suites · 1102 pass · 5 skip · 0 fail · 12.1s.

## 커밋

```
4690774c feat(roulette): Z16 overlay 폐기 + 담기 스트림 + 반짝 O (N0-0730-Z16)
```

## 착지 상태

- PR #288 body 갱신 완료 · `**round**: \`N0-0730-Z16\`` 첫 줄 · B-9-m 실기
  체크리스트 (Z16-2 담기 스트림 핵심 · Z16-3 slice O · Z16-1 overlay 폐기)
  · QC · EPIC-STATE 무변 근거.
- Kyu B-9-m 실기 대기 · approve 후 auto-merge.

## 다음 라운드 (Z17) 예약

Kyu B-9-m 실기 결과 + 심문 답변 후:

- **Z17-1** = Q1 판정 결과 반영 (배경 wheel = slot 0 refactor 착수 or MVP
  유지 or 별건 승인).
- **Z17-2** = Q2 판정 결과 반영 (배치 알고리즘 데스크톱).
- **Z17-3** = Q3 판정 결과 반영 (Z14-4 fadeout 시각).
- **Z17-4** = Z15-3 붉은 하트 로그 캡처 · 뿌리 확정 후 fix (B-9-l 로그
  캡처 유무 · Z15 라운드에서 대기 중).
- (기타 B-9-m 실기 fail 항목).
