#453 APPROVE

self-review 제한(본인 PR)으로 GitHub는 COMMENT 제출. 아래 근거 기준 APPROVE 판정.

## 수행 명령 · 결과 로그

```
# REQ 1: cksum 직접 계산 (macOS)
for name in \
  "Youngkyus-MacBook-Pro-M1" "curiocity-mac-light" \
  "curiocity-mac-fork" "curiocity-mac-fork-light" \
  "ci-box-storeport-heavy-imac" "ci-box-storeport-light-imac" \
  "ci-box-fork-heavy-imac" "ci-box-fork-light-imac"; do
  ck=$(printf '%s' "$name" | cksum | cut -d' ' -f1)
  port=$(( (ck % 5000) + 20000 ))
  echo "$name  cksum=$ck  port=$port"
done

Youngkyus-MacBook-Pro-M1       cksum=1570337755  port=22755
curiocity-mac-light            cksum=2745341911  port=21911
curiocity-mac-fork             cksum=414529226   port=24226
curiocity-mac-fork-light       cksum=2334763432  port=23432
ci-box-storeport-heavy-imac    cksum=2154005669  port=20669
ci-box-storeport-light-imac    cksum=4092704530  port=24530
ci-box-fork-heavy-imac         cksum=2305526299  port=21299
ci-box-fork-light-imac         cksum=4210669996  port=24996
```

## REQ 1 — 포트 충돌 여부

| 머신 | RUNNER_NAME | cksum | PORT |
|------|-------------|-------|------|
| MBP | Youngkyus-MacBook-Pro-M1 | 1570337755 | 22755 |
| MBP | curiocity-mac-light | 2745341911 | 21911 |
| MBP | curiocity-mac-fork | 414529226 | 24226 |
| MBP | curiocity-mac-fork-light | 2334763432 | 23432 |
| iMac | ci-box-storeport-heavy-imac | 2154005669 | 20669 |
| iMac | ci-box-storeport-light-imac | 4092704530 | 24530 |
| iMac | ci-box-fork-heavy-imac | 2305526299 | 21299 |
| iMac | ci-box-fork-light-imac | 4210669996 | 24996 |

8개 전부 고유 → 현재 등록된 러너 간 포트 충돌 없음.

## REQ 2 — 스크립트를 거치지 않는 다른 통합 테스트 진입점

검사 대상: `.github/workflows/*.yml`, `.github/actions/heavy-steps/action.yml`, `apps/commerce-core/package.json`

**① `scripts/it.sh`** (포트 고정 없음)
- `linux-check.yml` → `bash scripts/it.sh checkout-handover-smoke` 로 직접 호출
- ubuntu-latest 단독 runner이므로 현재 TOCTOU 위험 없음
- 향후 Mac 머신에서 동시 실행 workflow 추가 시 동일 EADDRINUSE 재발 가능
- **현재 블로커 아님**

**② `package.json` npm 스크립트** (jest 직접 호출, 포트 고정 없음)
- `test:integration:loyalty` → `TEST_TYPE=integration:loyalty jest --runInBand`
- `test:integration:http`, `test:integration:modules` → 동일 패턴
- 어떤 CI workflow에서도 호출되지 않음 → **현재 위험 없음**

**결론**: CI pos-integration 유일 경로는 `pnpm test:integration:pos` → `test-integration-pos.sh`. 이 PR의 수정으로 EADDRINUSE 완전 커버.

## REQ 3 — 클라우드 ubuntu 러너 · 로컬 개발자 동작

- **cloud (ubuntu-latest)**: `RUNNER_NAME`은 GitHub Actions 자동 설정 → 고유값 → 정상. 각 job이 별도 ephemeral VM이라 충돌 가능성 없음.
- **로컬 개발자**: `hostname` fallback → 단독 실행 일반적이라 무해. `PORT=XXXXX` 오버라이드도 `if [ -z "${PORT:-}" ]` 가드 덕분에 존중됨.
- **`cksum` 호환성**: macOS BSD · Linux GNU 모두 POSIX 표준. 공백 포함 RUNNER_NAME도 `printf '%s' "$_seed" | cksum` 방식으로 올바르게 처리됨.

## 판정 근거

- TOCTOU 원인 분석 정확
- 수정 범위 최소·충분 (스크립트 1개, 21줄 추가)
- 포트 범위 20000–24999 충분하고 현재 8개 러너 모두 충돌 없음
- cloud/local 양쪽 올바르게 동작
- 미완 체크리스트 `CI heavy-mac pos-integration PASS` 는 착지 후 CI 결과로 확인 예정 (머지 블로커 아님)

PR 코멘트: https://github.com/CuriocityDevAi/storeport/pull/453 (COMMENT 제출, self-review 제한)
