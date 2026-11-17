#180 rebase · 충돌 N파일=2 · mergeable

## 충돌 해소 내역

| 파일 | 위치 | 해소 방식 |
|------|------|-----------|
| `api/hooks/draft-orders.tsx` | L449 — `onMutate` 함수 내 | HEAD(master)의 `__DEV__` 디버그 로그 보존 (양쪽 보존) |
| `components/SplashReceiptAnim.tsx` | L3 — 파일 상단 주석 | HEAD(M1-1117-I 상세 설명) + 커밋(M3-1117-M 요약) 모두 보존 |

## 결과
- rebase: `origin/master` (154a673) 위로 성공
- 중복 커밋 5개 자동 drop(already upstream): M3-1117-G, H, I, J, K
- tsc 신규 오류: 0 (master 기준 16줄, 브랜치 16줄 동일)
- push: `--force-with-lease` 성공 → `cfd347d`
- PR 코멘트: "rebase only" 추가
