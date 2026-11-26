PASS a44eaad90 · changes-filter·markers-and-forbidden는 storeport ci 워크플로 filter/gate job(run_min≈0.4분, 실제 테스트 없음) — W2 원본 추가 필요 · M2 다음 라운드로

## 변경 내용

- `ci-watch-render.mjs`: `isCountableJob` 추가 export
- `ci-offload-impact.mjs`: 로컬 `MARKER_JOBS` / `isMarkerJob` / `isCountableJob` 복사본 삭제 → `ci-watch-render.mjs` 에서 re-export+import 로 교체

## changes-filter / markers-and-forbidden 판정 근거

`status/ci/2026-11-20.jsonl` 실측 데이터:
- `runner_kind: 'mac-light'`, `run_min: 0.4` (≈24초)
- `workflow: 'ci'` — `changes-filter`는 `dorny/paths-filter` 액션 (어느 파일 바뀌었는지 판별 → 후속 잡 조건부 실행 여부 결정)
- `markers-and-forbidden`는 금지 패턴/마커 체크 gate job
- M1-1119-Q 리포트: "markers-and-forbidden · changes-filter · route 세 job에 force_cloud 시 fallback 적용" — route 와 동급 인프라 잡으로 취급
- 결론: 실제 테스트 로직 없는 표시용(gate/filter) 잡 ✔

## MARKER_JOBS 불일치 처리

render MARKER_JOBS(4개)에 `changes-filter` · `markers-and-forbidden` 미포함 상태.
M2 PR #50이 `ci-watch-render.mjs` 편집 중 → **W2 원본 추가 필요 · M2 다음 라운드로**

## 테스트 로그

```
# tests 20
# pass 20
# fail 0
# duration_ms 120ms
```

relay 전체:
```
# tests 414
# pass 414
# fail 0
# duration_ms 20651ms
```
