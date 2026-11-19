#389 APPROVE · fork #201 APPROVE · 머지 순서 #389 → #201 · (Skip 하면 skipped_at 만 찍히고 paid 연결 창은 그대로 · 로컬 테스트 전부 초록 · 어느 쪽을 먼저 머지해도 최악은 60초 timeout)

# R0C-1119-K — 손님 Skip 즉시 알림 짝 PR 리뷰 (2026-11-19)

- storeport #389 HEAD `bdde5b6` · fork #201 HEAD `9216605`
- 두 PR 에 리뷰 COMMENT 를 남겼고, 둘 다 첫 줄은 "R0 판정: APPROVE" 입니다.

## ① 필드 계약
- 서버는 `skipped_at: string|null` 을 `toISOString()` 으로 보냅니다(UTC Z 형식). POS 타입은 `skipped_at?: string|null` 이라 서로 맞습니다.
- POS 는 `new Date(a) > new Date(b)` 로 Date 끼리 비교합니다. 문자열 비교가 아니라 안전합니다. 초기값 '' 는 Invalid Date 라 결과가 false 로 나와 이것도 안전합니다.
- 시계 차이(POS 기기 시계 vs 서버 시계):
  - POS 시계가 빠를 때: Skip 을 놓치고 60초 timeout 으로 끝납니다(안전).
  - POS 시계가 느릴 때: 같은 주문을 다시 누르면 예전 skipped_at 때문에 바로 Skipped 로 잘못 뜰 수 있습니다(드묾).
  - 개선안: 스냅샷의 `server_now` 로 시계 차이 보정 (비차단)

## ② storeport 통합 테스트
- `it.sh cd-snapshot-skip` 6/6 · `customer-display` 22/22 · `snapshot` 16/16 통과
- tsc 에러 0 (commerce-core · customer-display) · customer-display vitest 200/200 · register_session unit 32/32 통과 · naming-check PASS
- CI 잡은 리뷰 시점에 queued 상태 → 머지 전 확인 필요

## ③ fork 완결성 (M0 세션 끊김 후 직접 확인)
- vitest 768 pass (62 files) · 대상 테스트 13/13 통과
- assertions 47/47 PASS
- 최신 master 78b4e7a 와 충돌 없이 머지됨 · 머지 결과 `expo lint` 0 errors
- tsc 14개는 master 에도 똑같이 있음 · playwright 실패는 master 에서도 동일 → 이 PR 과 무관
- PR 은 완결 상태입니다.

## ④ Skip 후 Orders 에서 번호 연결
- 통합 테스트 "(a-link) paid skip 후 /admin/pos/orders/:id/customer → 200" 통과 → 409 없이 연결됩니다.

## ⑤ 머지 순서
- #389 먼저 → fork #201 바로 이어서. 어느 순서로 머지해도 최악은 60초 timeout 이라 안전합니다.

## 비차단 후속 후보
1. 같은 주문 재요청: customer-display 의 `_sent` Set 이 같은 스냅샷에 PATCH 를 1번만 보내서, 두 번째 Skip 은 POS 에 60초 timeout 으로 보입니다.
2. 결제 직후 레이스로 스냅샷이 아직 active 일 때 Skip 하면 expired 가 되는데, POS 는 이제 이걸 감지하지 않아 timeout 으로 끝나고 연결 창도 닫힙니다(드묾).
3. fork 테스트 파일 155행 prettier 경고 (expo lint 결과에는 안 걸림)
