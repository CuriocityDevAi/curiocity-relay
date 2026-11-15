# M1-1105-CG 리포트

## PR

https://github.com/CuriocityDevAi/storeport/pull/270 (draft)

**첫 줄 결과:** `.github/workflows/ci-summary.yml` 신규 1파일 · `workflow_run`(ci 완료) + `workflow_dispatch(run_id)` 트리거 · fork PR skip · 외부 액션 없음(gh CLI + jq 로 완결)

## 머지 뒤 확인 항목

- [ ] 다음 PR의 ci 완료 직후 `<!-- ci-summary -->` 마커 코멘트 생성 확인
- [ ] 같은 PR에서 ci 재실행 시 코멘트 갱신(upsert) 확인
- [ ] 실패 job 이름이 클릭 가능 링크로 표시되는지 확인
- [ ] fork PR (있는 경우) 에서 코멘트가 올라오지 않는지 확인

## 이연 순증감

없음 (신규 파일만 추가 · 제품 코드·ci.yml 미수정)

## 실제 run 검증 로그

대상 run: `43685848067` (conclusion=failure · PR #268 M2-BQ)

```
<!-- ci-summary -->
## CI 결과 ❌ 실패 — `551f014`

| Job | 결과 | 소요 |
|-----|:----:|-----:|
| unit-commerce-core | ✅ | 1m 7s |
| changes-filter | ✅ | 5s |
| markers-and-forbidden | ✅ | 8s |
| customer-display | ✅ | 2m 26s |
| [pos-integration](https://github.com/CuriocityDevAi/storeport/actions/runs/43685848067/job/132726063312) | ❌ | 4m 31s |
| docker-smoke-anchor | ⏭ | 0s |
| wrangler-check-care-agent | ⏭ | 0s |
| docker-smoke-commerce-core | ⏭ | 0s |
| docker-smoke-wing | ⏭ | 0s |

> [전체 run →](https://github.com/CuriocityDevAi/storeport/actions/runs/43685848067)
```

검증 결과:
- ✅/❌/⏭ 아이콘 정상
- 실패 job(`pos-integration`) 에 클릭 링크 첨부 확인
- 소요 시간 "Xm Ys" 포맷 정상
- `strptime` + `gsub` (소수점 초 대응) 정상 동작

`workflow_run` 실 트리거는 main 머지 후 첫 PR에서 확인 예정.
