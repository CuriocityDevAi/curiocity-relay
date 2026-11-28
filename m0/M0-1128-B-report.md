# M0-1128-B — 러너에 storeport PR SHA 공급 + #480·#294·#291 리허설

**PASS · 경로 (c)** — storeport SHA GitHub 에서 직접 clone (fork secrets.FORK_DISPATCH_TOKEN).

## 토큰 확인 (REQ1)

**가능** — `FORK_DISPATCH_TOKEN` (storeport 쪽 기등록 PAT · classic `repo` scope) 로 storeport 읽기 OK. fork 쪽에는 미등록 상태였기에 동일 값으로 fork secrets 에 신규 등록(2026-11-28 00:53 UTC). 1차 등록(23:50) 은 `echo -n $(gh auth token) | gh secret set --body -` 가 토큰 끝에 LF 를 섞어 들어가 GitHub secret masking 이 `-` 를 모두 `***` 로 바꾸는 부작용 발생 → 재등록(`--body "$VAL"`) 후 정상. secret list 상태: `FORK_DISPATCH_TOKEN` 2026-11-27T23:53:02Z.

## 선택 경로 (c) 이유

- (a) 미러 2곳 주입 = ci-mirror 관리 지점 2배
- (b) 러너 라벨 제한 = ci-mirror 가 여전히 storeport main 고정, PR SHA fetch 단계 추가 필요
- (c) 워크플로 한 곳에서 clone + PR refs fetch + SHA 검증 = 러너 관리 지점 1곳, 양쪽 러너 동일 경로 `/tmp/storeport-sha-wt`

## 리허설 표 (REQ2·3·4)

| 런 | storeport | fork | case1 | case1b | 실제 체크아웃 storeport SHA | 비고 |
|---|---|---|---|---|---|---|
| [46084921297](https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/46084921297) | #480 cf89b55 | #296 1e0aab7 | ✓ | ✓ | `cf89b55146beef439352620b5b0b3980895d815f` | GREEN — 손님 화면 6건 수정 통과 |
| [46085391801](https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/46085391801) | #480 cf89b55 | #294 bc236af | ✘ | — | `cf89b55146beef439352620b5b0b3980895d815f` | case1 FAIL: aria-label `typing X` vs expected `entering phone X` (#294 범위 밖 의존성) |
| [46085830490](https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/46085830490) | #480 cf89b55 | #291 19e5b8e | ✘ | — | `cf89b55146beef439352620b5b0b3980895d815f` | case1 FAIL: 동일 aria-label 미스매치 (#291 범위 밖 의존성) |
| [46086125880](https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/46086125880) | main f33eef8 | #296 1e0aab7 | ✓ | ✘ | `f33eef821dad810de279c3851d0c6d13552712dd` | 검증의 검증 — case1b RED 기대값 적중 |

## 자기 검증 (로그 인용)

Run 46084921297 (REQ2) — fork#296 head · storeport#480 cf89b55:
```
cloning storeport (auth=token) ...
storeport 체크아웃: path=/tmp/storeport-sha-wt · 요청 sha=cf89b55146beef439352620b5b0b3980895d815f · 실제 체크아웃 sha=cf89b55146beef439352620b5b0b3980895d815f
```
```
✓  1 case1.spec.ts › Case 1 · 결제 후 번호 입력 → Confirm → 적립 (12.3s)
✓  2 case1b.spec.ts › Case 1b · Re-enter → CD 키패드 재오픈 (storeport#480 게이트) (11.2s)
✓  3~6 sequential.spec.ts 3-5 · 3-6a · 3-6b · 3-6c
6 passed (51.3s)
```

Run 46086125880 (REQ4) — storeport main f33eef8:
```
storeport 체크아웃: path=/tmp/storeport-sha-wt · 요청 sha=f33eef821dad810de279c3851d0c6d13552712dd · 실제 체크아웃 sha=f33eef821dad810de279c3851d0c6d13552712dd
```
```
✓  1 case1.spec.ts (22.4s)
✘  2 case1b.spec.ts (20.3s)   ← RED 기대값 (pre-#480 phone_already_linked 재현)
```

Run 46085391801 (REQ3 fork#294) — Checkout fork 로그:
```
HEAD is now at bc236af test(cd-preview): M3-1127-K ⑤⑧ (#291 전용) → #294 에서 제거
```
```
Error: expect(locator).toHaveAttribute(expected) failed
- unexpected value "typing 0813804420"
at e2e/cd-pos/case1.spec.ts:103:30
```

Run 46085830490 (REQ3 fork#291) — Checkout fork 로그:
```
HEAD is now at 19e5b8e Merge branch 'master' into feat/M3-1127-K-cd-preview-edge
unexpected value "typing 08138044200"
```

## REQ5 — #480 진짜 버그 없음

case1b @ storeport#480 (cf89b55) = **GREEN** (run 46084921297). RED 아님 → #480 자체 버그 지적 사항 없음. #294·#291 의 case1 FAIL 은 저 두 PR 가 fork#296 (M1-1127-L) 의 CustomerPhoneStatus aria-label `typing X` 로의 이동을 포함하지 않아 생긴 미스매치(두 브랜치 모두 master 기반 · fork#296 는 feat/M1-1127-I-rehearsal-gate 기반). 다음 라운드 범위 — 본 작업 비건드림.

## PR 본문 확인 항목

PR fork#296 본문에 M0-1128-B 섹션 append 완료 — 선택 경로 (c) 이유 3줄, 리허설 표(실제 storeport SHA 칸 포함), 보존 요소 4개, fork_sha 입력 추가 설명.

## 보존 요소 (변경 없음)

- fail-fast: clone 실패 or SHA 미발견 시 `::error` + `exit 1` (조용한 main 폴백 금지)
- case1·case1b 어설션 강도 그대로
- concurrency `heavy-curiocity-mac-fork` 1
- 비밀값 로그 노출 금지 (clone stderr `/tmp/clone-err` 리다이렉트)

## 커밋·푸시 상태

브랜치 `fix/M1-1127-L-flashlist-reenter` (fork#296):
- `1e0aab7` fix(e2e-cd-pos): M0-1128-B — storeport SHA GitHub 직접 clone (path c)
- `ff93522` fix(e2e-cd-pos): M0-1128-B — fork_sha 입력 추가 (타 PR 리허설용)

머지는 상시 조항 ⓒ — R0 리뷰 뒤 허브가 `gh pr merge`. 본 세션 비머지.

## 미머지 사항·뒤처리

- fork#294 head bc236af · fork#291 head 19e5b8e 의 case1 FAIL(`typing X` aria-label) = 각 track 소관 — fork#296 의 CustomerPhoneStatus 신 aria-label 이 master 로 착지하거나 각 PR 가 M1-1127-I-rehearsal-gate 기반으로 리베이스되어야 재리허설 GREEN 가능. 본 라운드 비건드림.
- 러너 credential helper 로 폴백 실패 (run 46084517566 · `auth_mode=credential-helper` · 자세한 cause 는 keychain 비노출 추정) — 토큰 경로가 1차. 폴백 경로는 앞으로 러너 재설정 시 참고.
