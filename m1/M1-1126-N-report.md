PASS https://github.com/CuriocityDevAi/curiocity-relay/pull/49

## 작업 요약

### REQ 1 — mem-log.ndjson 충돌 마커 제거
- 충돌 위치: 원본 16~25행 (`<<<<<<< Updated upstream` / `=======` / `>>>>>>> Stashed changes`)
- 양측 JSON 줄 모두 보존, `at` 시각순 정렬 → 161행(마커 3포함) → 158행 clean
- 근본 원인: 구 러너의 `pull --rebase --autostash` 경로에서 `git stash pop` 충돌. 현재는 `safe-push.mjs` 가 `merge -X ours` 방식으로 교체돼 stash 없음
- 재발 방지 (1곳): `scripts/hub-runner-v8.3.mjs` `appendMemLog` 함수에 마커 감지→정리 로직 추가 — 파일 읽을 때 마커 패턴(`/^(<{7}|={7}|>{7})/`) 감지 시 JSON 줄만 추출·재정렬 후 쓰기

### REQ 2 — scripts/metrics/ci-offload-impact.mjs (신규)

```
node scripts/metrics/ci-offload-impact.mjs --cutover 2026-11-26T08:01:00Z --before-from 2026-11-25T00:00:00Z
```

**실제 실행 결과:**

## CI 아이맥 오프로드 임팩트 비교

- 전 구간: 2026-11-25T00:00:00.000Z → 2026-11-26T08:01:00.000Z (32.02h)
- 후 구간: 2026-11-26T08:01:00.000Z → 2026-11-26T08:20:57.526Z (0.33h)

> ⚠️  **표본 부족 — 판단 보류** (후 구간 20분 < 2시간 · 수치는 참고용)

### 맥북 자원 (mem-log)

| 항목                             | 전(맥북 CI 포함)        | 후(iMac 전용)         |
|--------------------------------|--------------------|--------------------|
| used_gb                        | avg 15.41GB / max 15.85GB (n=27) | N/A                |
| swap_used_gb                   | avg 3.83GB / max 6.30GB (n=27) | N/A                |
| compressed_gb                  | avg 4.08GB / max 6.23GB (n=27) | N/A                |

### CI (status/ci/*.jsonl)
> marker·skipped·cancelled 제외 (W2 규칙) · 전 564잡 / 후 8잡

| 항목                             | 전(맥북 CI 포함)        | 후(iMac 전용)         |
|--------------------------------|--------------------|--------------------|
| 대기시간 평균 (queued→started)       | 1.5min             | 0.8min             |
| 대기시간 p90                       | 4.0min             | 3.0min             |
| 잡 실행시간 평균                      | 2.0min             | 1.2min             |
| MBP 처리 수                       | 442                | 0                  |
| iMac 처리 수                      | 56                 | 7                  |
| cloud overflow 수               | 66                 | 1                  |

### 프롬프트 처리량 (status/claims + pipeline)
> 전 157건 완료 / 후 1건 완료

| 항목                             | 전(맥북 CI 포함)        | 후(iMac 전용)         |
|--------------------------------|--------------------|--------------------|
| started→done 평균                | 13.2min            | 11.7min            |
| started→done 중앙값               | 9.9min             | 11.7min            |
| 시간당 완료 프롬프트 (PT/h)             | 4.90               | 3.01               |

### REQ 3 — 테스트 로그

```
$ node --test scripts/test/ci-offload-impact.test.mjs

TAP version 13
ok 1 - OI-1a: route → marker → not countable
ok 2 - OI-1b: heavy-cloud → not countable
ok 3 - OI-1c: ci-summary → not countable
ok 4 - OI-1d: skipped → not countable
ok 5 - OI-1e: cancelled → not countable
ok 6 - OI-1f: success normal job → countable
ok 7 - OI-1g: null/undefined → not countable
ok 8 - OI-2a: avg — 빈 배열 null
ok 9 - OI-2b: avg — [1, 3, 5] = 3
ok 10 - OI-2c: median — 홀수 배열
ok 11 - OI-2d: median — 짝수 배열
ok 12 - OI-2e: p90 — 10개 배열
ok 13 - OI-2f: p90 — 빈 배열 null
ok 14 - OI-3: 후 구간 < 2시간 → 경고 포함
ok 15 - OI-3b: 후 구간 ≥ 2시간 → 경고 없음
ok 16 - OI-4: CI 잡이 cutover 기준 전/후로 분리됨
ok 17 - OI-4b: mem-log 가 cutover 로 분리됨
ok 18 - OI-5: 전/후 평균 수치가 fixture 와 일치
ok 19 - OI-5b: CI 대기시간 p90 fixture 검증
ok 20 - OI-5c: renderMarkdown — 경고 텍스트 포함 확인
1..20
# tests 20
# pass 20
# fail 0
# duration_ms 105.298959
```
