# 인수인계 · 2026-11-09 22:06 WIB (오케 세션 마감 · 감시 OFF)

새 오케 세션 첫 줄: `CurioCity 오케. relay ledger/open-requirements.md · work-queue.md · 최신 handoff 읽고 현황판부터.`
정본: open-requirements(요구·결정) · 이 파일(당일 스냅샷) · 상태판 https://claude.ai/artifact/Fpm1UFYvxX4mzCJYHtnBGE
※ work-queue.md 는 오늘 갱신 못 함 → 아래 §3 표가 최신. 다음 세션이 work-queue.md 에 반영할 것.

## 0. 오늘 끝난 것 (11-09)
- ✅ **운영 장애 종료**(11-07 22:50~ → 11-09 21:00): storeport #200(W: 삭제 경로 제거·sku·조회) + #203(X: repair 가 링크 테이블 직조회) 머지 · Kyu repair 6/6 · Admin Orders 정상.
- ✅ Z Report 가림(#64) Kyu 실기 정상 · 프린터 로고 1.83×(#63) 머지(실기는 프린터 도착 뒤).
- ✅ 결제 화면(#62 칩·피커·로고·토스트 → #66 시간 버그·터치 44pt·success 2열/하단 바) Kyu 실기 정상×3.
- ✅ 러너: v4(가짜 완료 차단) → v5(대화형 탭) → **v6 가동(pid 28782 · display=cmux-split · Hubs 탭 5칸)**. relay `.gitignore`(.expo/ · *.bak) — Kyu 가 relay 작업트리를 더럽히면 러너 pull 이 멈춤(오늘 2회).
- 토큰: 아침 Fable 오케 창이 주간 4% 중 ~2.5% → 오케는 Opus 고정. 중복 오케 창 2개 사고 → 1창 원칙.

## 1. 진행 중 (마감 시점 · 러너가 끝까지 돌림 · 새 발부 없음)
| ID | 허브 | 내용 | 다음 |
|---|---|---|---|
| M3-1105-X | m3 | Fulfill 시트 1/2(주문 상세 · Pickup/Delivery · 택배사만 필수 · 1단계 완료) · 새 브랜치 feat/m3-1105-x-fulfill-sheet | 착지 → R0 리뷰 → 머지 → Kyu 실기(선주문 paid_full 주문 상세 Fulfill) |
| M1-1105-AC | m1 | 선택 칩 = 차콜 채움+흰 글자(Pay 계열·더 가볍게) · 피커 머리줄 동일 크기 · Kyu 11-09 22:00 결정(11-07 연회색 규칙 대체) | 착지 → **스샷 먼저 Kyu 에게(칩+Pay 함께)** → R0 → 머지 |

## 2. 다음 (우선순위)
1. 위 두 건 착지 확인(v6 첫 실전: Hubs 탭 칸 안에서 돌았는지 claim note 확인).
2. **M3 Fulfill 2/2**: Checkout Delivery 칩 활성 + 결제 때 배송지·받는 사람 연락처 단계(Kyu Q1=A) — 서버 저장 위치(shipping_address vs metadata) 먼저 대사표 · 필요 시 M0.
3. R0 리포트 경로: R0 는 pos-r0 에서 돌아 relay 리포트를 놓침 → 프롬프트에 relay 절대경로 + push 명령 명시(AK·AL 에서 효과 확인).
4. 러너 수정 작업은 relay 별도 worktree(~/projects/relay-m1)에서만 · relay-m1 에 rebase 잔재 있으면 `git -C ~/projects/relay-m1 rebase --abort`.
5. M2 유휴 · Reprint/BLE(프린터 도착) · Xendit · EAS(Apple) 대기.

## 3. 작업 큐 스냅샷
| # | 의뢰 | 상태 |
|---|---|---|
| 0 | 운영 장애 주문 목록 500 | ✅ 완료 |
| 2c/2e | 결제 탭+칩·피커·로고·Hand over | ✅ 완료(실기 정상) |
| 2d | Z Report 가림 | ✅ 완료 |
| 2g | 선택 칩 디자인 통일+피커 머리줄 | M1-AC 진행 |
| 2f | Fulfill 시트 + Delivery | 1/2 M3-X 진행 · 2/2 대기 |
| 5 | 프린터 로고 | 머지 · 실기 대기(프린터) |
| 7e/7f | 러너 가시성·분할 | v6 설치 · 실전 확인 대기 |
| 14 | 토큰 절감 | 적용 · 일일 사용량 % 추적 시작(11-09 오전 4%) |
