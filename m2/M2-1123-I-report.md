APPROVE · mergeable

## 작업 개요
- **대상 브랜치**: `test/M3-1123-K-fix-legacy-harness` (#242)
- **rebase 베이스**: `origin/master` (HEAD `91a4ae2` · M1-1123-M 포함)
- **조작**: rebase + 충돌 해결 → force-push

## 충돌 파일 및 해결 방식

| 파일 | 충돌 내용 | 해결 방식 |
|------|-----------|-----------|
| `scripts/_harness.mjs` | `loginAndReachProducts` 의 `waitForFunction` 조건 · 주석 블록 | 양쪽 보존: master(#241)의 주석 블록 유지 + K 브랜치(#242)의 4-조건(`includes('products')` \| `endsWith('/products')` \| `includes('sell')` \| `endsWith('/sell')`) 채택 (master 2-조건의 superset) |

- 비충돌 파일: `scripts/m3-1105-{b,d,f,m,q}-playwright.mjs` 5건 — 충돌 없이 자동 적용

## 하네스 결과

```
총 27 개 · 27 PASS · 0 FAIL · wall 202.0s
```

전체 FAIL 0.

## 커밋

- rebase 후 HEAD: `e97502a`
- force-push 완료: `origin/test/M3-1123-K-fix-legacy-harness`
