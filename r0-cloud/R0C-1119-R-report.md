relay #7 APPROVE · CI 조회 5분 간격·호출 상한·겹침 0·/tmp 고정 모두 코드로 확인 · 러너 본체 영향 없음 · 154/154

# R0C-1119-R · relay PR #7 최종 확인 (M0-1119-J · hub-runner v7.5)

- 대상: PR #7 HEAD `d380823b` · 2026-11-19 · R0 클라우드 · 이전 R0C-1119-P (CHANGES)
- 판정: **APPROVE** (PR 에 COMMENT 로 남김 · 머지·코드 수정 안 함)

## 직전 지적 → 결과

| # | 지적 | 결과 |
|---|---|---|
| ① | CI 조회 30초마다 → 시간당 ~4,000 | ✅ 5분 간격 막음 · 모든 gh 호출이 budget(40) 거침 → **최대 480/h** 맞음 · 완료 run 캐시 |
| ② | 마감이 inFlight 먼저 풂 → 겹침 | ✅ 실제 조회 끝나야 풂 · gh 호출마다 10초 timeout → 최악 400초 뒤엔 반드시 끝남 · 겹침 0 |
| ③ | suspect_done `os.tmpdir()` | ✅ `/tmp` 고정 |
| 정확성 | queued 분류 · fork · 옛 jsonl | ✅ labels 로 분류 · fork = `CuriocityDevAi/agilo-medusa-pos-fork` (실제 있음 확인) · 옛 jsonl 빠짐 |
| 정확성 | created→updated | ⚠️ 바꿨지만 **GitHub 가 `updated` 필터를 무시함** (아래 메모 1) |

## 직접 실행한 것

- `node --test scripts/test/*.test.mjs` (Node 22.23) → **154 pass / 0 fail**
- **safePull 실제 git 재현** (임시 origin+clone · v7.5 원문 함수 실행)
  - 스코프 밖 status/ci 파일(새·staged·수정) + 로컬 ahead 커밋 → v7.5 `recovered` → pull 성공 · 새 큐 파일 받음 ✅
  - 분기 없는 경우 → autostash 로 jsonl 지키며 pull 성공 ✅
  - 대조 v7.4 → `manual` 로 멈춤 (예상대로)
- v7.4 대비 diff = **추가만** ✅ · install.sh = TARGET/FALLBACK **두 줄만** ✅
- GitHub API 실측: `status=completed&updated=>=2099-01-01` → 1730개 (필터 없음과 같음) · `created=>=2099…` → 0개

## 메모 (비차단)

1. `updated=>=` 는 없는 필터라 무시 → 실제로는 "최근 완료 100개" 를 봄. 캐시·budget·중복 제거로 해는 없지만 주석·J-7 과 다름. 러너 재시작 직후 1~3회는 옛 run 채우느라 fork·runners 조회가 빠짐. → 필터 빼거나 `created=>=24시간 전`.
2. `ci-health.mjs` 끝 `--once` 검사가 러너를 `--once` 로 수동 실행해도 켜짐 → 조회 1번 더 · stdout 에 JSON · 종료 늦음. launchd 는 `--all` 이라 운영 영향 없음. → `import.meta.url` 비교로.
3. 마감 뒤 늦게 성공한 결과는 버려짐 (다음 조회까지 error 표시).
4. 분기 복구 때 커밋 안 된 jsonl 줄 사라짐 (이전과 같음).
5. run id 캐시가 계속 커짐 (무시 가능).

## Kyu 할 일

머지 후 PR 본문의 재설치 1줄 실행. 되돌릴 땐 `status/ci` 먼저 커밋/정리 (v7.4 는 이걸 스코프 밖으로 봄).
