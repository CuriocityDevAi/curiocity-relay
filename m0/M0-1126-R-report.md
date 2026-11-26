PASS · PR #466

# M0-1126-R · Phone entry OK → Confirm 카드 + 키패드 20초 타이머 디짓 재앵커

- PR: https://github.com/CuriocityDevAi/storeport/pull/466
- Branch: `fix/M0-1126-R-cd-phone-entry`
- Worktree: `~/projects/curiocity-relay-wts/M0-1126-R`
- Head: `8e4d5c7` on top of `origin/main@99bac21`

## 원장 대사 (닻)

- V4-8 6상태 (Skipped + Ask again 포함 · 11-24 승인)
- `decision-cd-pos-sync-flow-20261125` (적립 = 결제 성공 AND 손님 Correct · 20초 무입력 → 대기)
- `decision-success-single-phone-button-20261126` (결제 완료 화면 = Ask phone 하나 · 서버 phone-entry 판정 유지)
- Kyu 실기 11-26 23:05 🔴

## 원인 표 (증상 → 파일:줄 → 수정)

| # | 증상 (Kyu 실기) | 원인 (파일:줄) | 수정 |
|---|-----------------|-----------------|------|
| ④ | OK 누르니 초기화면 복귀 (Confirm 카드 없음) | `apps/customer-display/app/index.tsx:310-349` — `cdSnapshot` memo 가 `paid_at > 30s && (settled || !phoneEntryOpen)` 로 stalePaid=true. submit_phone 직후 서버가 state='confirming' + phone_entry_open=false 로 응답하는 찰나 !phoneEntryOpen 이 참 → nullify → MainScreen. | `inActiveFlow` (entering / first_visit / confirming) 가드로 흐름 중이면 nullify 금지. |
| ④' | mock keypad-after → consent 전환 시 digits 유실 | `apps/customer-display/app/keypad-after.tsx:24` — `onOk` 가 digits 를 버리고 `/consent` 로 이동. | `router.replace({pathname:"/consent", params:{digits}})` 로 digits 전달. |
| ③ | 재입력 중 20초 뒤 초기화면 복귀 | `apps/customer-display/src/screens/KeypadAfterScreen.tsx:40-58` — `startMs = useRef(mount 시각)` 고정. digits 변화와 무관하게 fire. | `handleDigitsChange` 에서 `startMs.current = Date.now()` + `firedRef.current = false` 로 재앵커. KeypadScreen 의 `onDigitsChange` 로 연결. |

## 의도적으로 미동봉 (별도 PR 로 회부)

| # | 증상 | 메모 |
|---|------|------|
| ② | 결제 후 20초 무입력 → POS 칩 "Skipped·Ask again" 대신 "Ask phone" | `isPostSettlementStale(skipped+paid_age>30s)` 가 `/admin/pos/registers/:id/snapshot` 폴링에서 snapshot:null 로 떨어뜨려 POS 가 기본값 "Ask phone" 으로 복귀. 서버 쪽 체계적 변경 (forPos 플래그 or stale 분리) 이 필요. 영향 범위 (14개+ 콜러) 와 CD 쪽 skipped→MainScreen 상호작용 재검증 후 별도 PR. 본 PR 은 손님 화면 ④/③ 회귀만 복원. |

## 지난 테스트가 못 잡은 이유

- 기존 e2e (`cd-pos-sync-v4-qris-none.spec.ts` 등) 는 submit_phone 응답이 `phone_entry_open=false` 로 변하는 "찰나" 를 재현하지 않았음.
- `cd-sync-flow.spec.ts` 의 keypad-after 는 mock 라우트 (no cdSnapshot memo) 만 봐 live 경로의 nullification 을 통과시킴.
- 신설 `cd-pos-sync-v4-phone-entry-ok.spec.ts` 는 `paid_at=now-45초` snapshot + submit_phone 응답 `state=confirming` 을 동시에 걸어 회귀를 결정론적으로 재현.

## 검증 (실행 · 모두 통과)

- `apps/customer-display`: `pnpm typecheck` ✓ · `pnpm test` ✓ (334/334, 17 test files).
- `apps/commerce-core`: `pnpm typecheck` ✓.
- `apps/customer-display`: `pnpm e2e cd-pos-sync-v4-phone-entry-ok` ✓
  - chromium 1180x820, 1 passed (3.3s).
  - 어설션: `keypad-panel` 보임 → 10자리 입력 → `ok-button` enabled → click → `confirm-panel` 보임 · `main-screen` 0개.
  - 스샷: `apps/customer-display/screenshots/cd-pos-sync-v4-phone-entry-ok/scenario-3-ok-confirm.png` (로컬 · screenshots/ 는 .gitignore).

### 미실행 (운영 책임)

- 🟡 실 iPad Safari 매장 CD + POS 웹 Kyu 실기 재검증 — 로컬 Playwright 로 ④ 시나리오는 결정론적으로 PASS. iPad Safari 특이 timing 은 운영 재검증 요청.
- 🟡 scenario (2) (19초 간격 3번 입력해도 안 끊김) 는 Playwright 로 20초 대기 비용이 커 포함 X. KeypadAfterScreen 의 재앵커는 코드 리뷰로 검증 (handleDigitsChange 호출 시 startMs.current 재세팅 + firedRef 리셋).

## 보존 요소 (영향 없음 확인)

- cd-pos-sync-v4 ①~⑧ · ⑦/⑦+ A→B 적립 이동 (#463 머지됨) — 서버 DTO/계약 미변경.
- 영수증 PB1 줄 · 계약 v1.4 응답 모양 (필드 추가·삭제·이름변경 없음).
- 기존 17 unit + 기존 e2e 스펙 미변경.
- POS fork (M3 몫) 미건드림.
- `register_session` short number (#465 리뷰 중) 미건드림.

## 산출물

- Diff: 5 files changed, 259 insertions(+), 2 deletions(-).
  - `apps/customer-display/app/index.tsx` (+10) — `inActiveFlow` 가드.
  - `apps/customer-display/app/keypad-after.tsx` (+5/-1) — digits 전달.
  - `apps/customer-display/src/screens/KeypadAfterScreen.tsx` (+18/-1) — handleDigitsChange 재앵커.
  - `apps/customer-display/e2e/cd-pos-sync-v4-phone-entry-ok.spec.ts` (+219 신규) — ④ 회귀 재현 + 어서션.
  - `docs/feature-map.yaml` (+1) — 새 e2e 스펙 등록 (cd-sync-flow).

## 선언

- 운영 DB · SSH · railway CLI 사용 안 함.
- 리포트는 `/Users/kyu.lee/.hub-runner/reports/m0/M0-1126-R/report.md` 에만 1회 저장. git repo 에 리포트 쓰지 않음.
- 작업 worktree: `~/projects/curiocity-relay-wts/M0-1126-R` — 러너 폴더 (`~/projects/curiocity-relay`) 는 건드리지 않음.
- 실행 시간: ~40분 (60분 한도 내 · ② 는 별도 PR 로 회부 결정).
- 커밋·push·PR 발의 = 본 지침 "승인 없이" 에 따라 자동 진행.
