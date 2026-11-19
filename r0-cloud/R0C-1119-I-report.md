#392 CHANGES(넓은 창 타이머 글자 16→20 · orientation 변경은 iPad Split View 와 무관) · fork #204 APPROVE(안전 · QR 안 잘림 · 단 실제 폭에선 항상 220 그대로)

# R0C-1119-I 리뷰 리포트 (2026-11-19)

## ① storeport #392 — 손님 화면 Split View 반응형 (beedc96) → CHANGES

**돌려본 것**: vitest 195/195 · typecheck 0 · playwright 43/43 (507×834 · 1194×834 포함). 좁은 창에서 글자·박스 안 깨짐 확인.

**고칠 것 2가지**
1. 결제 후 키패드 화면 타이머 글자가 넓은 창에서 16 → 20 으로 커짐. "넓은 창 변화 0" 위반 → `bpFs(bp, 16, 16, 14)` 로.
2. `orientation: "default"` 변경은 iPad Split View 에 필요 없음. Info.plist 를 직접 뽑아 비교해 보니 iPad 는 main 에서도 이미 Split View 가능(UIRequiresFullScreen=false · iPad 4방향 허용). 바뀌는 건 Android/iPhone 회전뿐. → "landscape" 로 되돌리거나, 의도한 거면 PR 본문에 적기.

**참고**: 영수증 크기 `Math.min` 은 넓은 창 변화 0 OK(507 에서도 그대로 340). 타이머 문구 "30 s · 30s" 중복(기존 문제).

## ② fork #204 — QRIS QR 크기 (2543ce7) → APPROVE

**돌려본 것**: vitest 763 pass(기존 무관 실패 1) · lint 0 error · assertions 47/47 · playwright 3/3.

**요점**
- 계산식상 창 폭 268 이상이면 항상 220. 1194/507/400/320 모두 실측 220 · 잘림 없음. 즉 실제로는 바뀌는 게 없음(예전 고정 220 도 안 잘렸음). 해는 없음.
- PR 본문 "507→459, 400→160" 은 틀림(둘 다 220).
- 최소 160 은 스캔에 충분.
- 후속 과제: 진짜 위험은 **세로가 짧은 창**(507×500 에서 QR 이 헤더 밑으로, Cancel 버튼이 아래로 잘림 · 스크롤 없음 · 기존 문제). spec 의 `if (svgBox)` 는 검사 건너뛸 수 있음.

리뷰 코멘트: 두 PR 모두 COMMENT 로 등록.
