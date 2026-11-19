storeport #400 CHANGES · fork #211 APPROVE

# R0C-1119-AB — #400 재리뷰 · fork #211 리뷰 (2026-11-19)

PR 코멘트: storeport#400 issuecomment-7009060854 · fork#211 issuecomment-7009062761
금지 준수: 두 PR 모두 push·머지 없음 (코멘트만).

## A. storeport #400 (HEAD dfad959 · base e6a31fc) — CHANGES

| 대상 | 결과 |
|---|---|
| commerce-core tsc (전체 pnpm install) | 0 errors |
| customer-display tsc / vitest | 0 / 204/204 |
| IT (로컬 Postgres) cd-pos-screen-sync / checkout-snapshot / cd-snapshot-skip | 4/4 · 7/7 · 6/6 |
| CI run 44519715207 | changes-filter queued — core 잡 실행 여부 미확인 |

W 의 고칠 것 ①~⑤ 재현 확인 (nextScreen probe + IT)
| # | 결과 |
|---|---|
| ① migration import · DTO | O (tsc 0) |
| ② receipt 루프 | O — receipt→keypad-after 이후 pos_screen=paid 틱이 와도 keypad-after 유지 · done 도 유지 |
| ③ paid→idle | O — server expire(IT) + CD keypad-after/receipt → main |
| ④ Skip skipped_at | **부분** — 서버 OK. CD 는 PATCH 를 fire-and-forget 으로 보내므로 PATCH 반영 전 응답 1틱(skipped_at=null)에 cart→keypad 로 되튀고, 이후 skipped_at 이 와도 가드가 stay(currentScreen) 이라 keypad 에 멈춤 |
| ⑤ GlobeMenu 여백 | O (코드 판독) |

하위 호환 (fork #208 미머지 · master POS + #400):
- 회귀: success/[orderId].tsx L120-126 — 손님 화면 번호 입력(pre_entry) 후 POS 가 setPosScreenHint(null) 호출 → 빈 카트라 idle(더 큰 seq) emit → ③ 로직이 paid 를 expire → CD consent 화면 → main (probe 재현). skip/timeout 도 receipt/done 끊김. #208 도 같은 코드라 동일.
- 그 외 스키마는 하위 호환 OK (W 와 동일).
- nit: active snapshot 에 남은 skipped_at 때문에 같은 snapshot 에서 다시 요청(LateLink loyalty_entry)해도 keypad 미표시.

고칠 것: (1) CD 가 skip 한 snapshot 을 로컬에 기억해 무시, 또는 skipped_at && keypad → cart (2) consent/keypad-after 진행 중 idle 보류, 또는 paid expire 조건을 좁히기.

## B. fork #211 (HEAD 5ca3e18 · base 2649e09) — APPROVE

- `git diff --stat origin/master...pr211` 결과는 4파일 (adaptive-icon · adaptive-icon-mono · gen-icons.mjs 상수/가드 · docs 비교 PNG). #162 되돌림·cart 커밋 없음. 현재 master 1988258(#209) 와 merge-tree clean.
- fg: 투명 (모서리 alpha 0) · M bbox 315×252 · 중심 (512,506) · safe zone 625.8px 의 50.3% (이전 641px = 102%) · 꼭짓점 최대 205px < safe 반경 313px
- mono: bbox 동일 · 흰색 · 투명
- iOS icon.png md5 a97df5d0 = master (불변) · app.json bg #FFE58A 유지
- nit: monochromeImage 참조는 후속 PR 필요 · docs PNG 는 PR 첨부로 옮기는 것 권장
