#343 rebase · 충돌 1파일 · mergeable · 테스트 461

## 충돌 해소
- 파일: `docs/feature-map.yaml` (1개)
- 위치: `pos-void-refund` 항목 `files:` 목록
- 해소 방식: 양쪽 보존 (HEAD: `pos-void/**` + `_shared/**` / 브랜치: `refund/route.ts` + `pos-refund/**` 모두 유지)

## QC 결과
- tsc 신규 에러: 0 (pos-refund·pos-void·_shared 워크플로 파일 에러 없음 · Anchor JSX 에러는 pre-existing)
- 테스트: 38 suites · 461 tests · 전체 통과
- push: `--force-with-lease` 성공 (b4cc5a8 → a0b19c8)
- PR 코멘트: "rebase only" 추가 (#343)
