PASS · PR #295 · head 69694bb

## 작업 내용

- 브랜치: `ci/M3-1127-P-storeport-sync` (master 기준)
- 변경 파일: `.github/workflows/ci.yml` — unit-tests job 에 **Sync storeport** 단계 삽입 (617bd31 과 동일한 5줄)
- PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/295

## REQ 확인

1. **617bd31 sync 단계 적용** — master 기준 새 PR 로 동일 내용 적용 완료.
2. **M3-1127-K ⑤·⑧ 테스트 여부** — 테스트는 #291 에만 있음 (`__tests__/m3-1127-k-cd-preview-edge.test.ts` master 미포함).
3. **#291 의 617bd31 처리** — 이 PR 머지 후 #291 rebase 시 617bd31 이 upstream 에 이미 존재해 자동 drop되므로 사전 revert 불필요. 순서: 이 PR 머지 → #291 rebase.
