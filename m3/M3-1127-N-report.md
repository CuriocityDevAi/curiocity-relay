# M3-1127-N 리포트

text node: PR #294 `components/customer-display/CustomerPhoneStatus.tsx:106` · #291: ci.yml Sync storeport 단계 추가(617bd31)

## 작업 요약

### 1. text node 수정 (PR #294)

**원인**: `CustomerPhoneStatus.tsx` line 106 `ask` case 의 Text 컴포넌트에서 JSX 표현식 `{numLabel}`과 문자열 리터럴 ` · `가 별도 자식으로 분리됨. NativeWind CssInteropComponent 처리 중 View 안 텍스트 노드 유발 가능성.

**수정 파일**: `components/customer-display/CustomerPhoneStatus.tsx:106`

| Before | After |
|--------|-------|
| `{numLabel} · </Text>` | `{``${numLabel} · ``}</Text>` |

**신규 테스트**: `__tests__/m3-1127-n-text-node.test.ts` (3 tests)
- `{numLabel} · </Text>` 패턴 없음 검증
- View 직접 자식 `.` 텍스트 노드 없음 검증
- `{cond && "string"}` 조건식 없음 검증
- 검증의 검증: 고친 패턴 되돌리면 테스트 1 빨강

**브랜치**: `fix/M3-1127-N-text-node` → PR #294
**커밋**: `eabc1cc fix(text-node): CustomerPhoneStatus ask case...`

### 2. #291 unit-tests CI 수정 (617bd31)

**원인**: `__tests__/m3-1127-k-cd-preview-edge.test.ts` 의 테스트 ⑤·⑧가 `../storeport/` 파일을 직접 읽어 M3-1127-K 변경사항(`?mirror=1`·`no-op callback`)을 검증함. CI 러너의 storeport 체크아웃이 구버전(merge #476 이전)이어서 2건 빨강.

**수정**: `.github/workflows/ci.yml` `unit-tests` job에 `Sync storeport` 단계 추가.

```yaml
- name: Sync storeport (cross-repo unit tests)
  run: |
    SP="$(dirname "$GITHUB_WORKSPACE")/storeport"
    if [ -d "$SP/.git" ]; then git -C "$SP" pull --ff-only origin main || true; fi
```

- `GITHUB_WORKSPACE` 형제 디렉토리의 storeport를 `origin main` pull
- storeport가 없는 환경(github-hosted 등)에서도 `|| true`로 무해 처리
- CI rebase 불필요: 브랜치 merge-base가 이미 master `369b475`

**커밋**: `617bd31 fix(ci): unit-tests 전 storeport pull — cross-repo 테스트 갱신 (M3-1127-N)`
**push**: `c69a0d4..617bd31 feat/M3-1127-K-cd-preview-edge` → #291

## CI 상태

| Job | #291 이전 | #291 이후(예상) |
|-----|-----------|----------------|
| assertions | ✅ pass | ✅ pass |
| lint | ✅ pass | ✅ pass |
| unit-tests | ❌ 2 failed | ✅ pass (storeport pull) |
| flow-tests | ✅ pass | ✅ pass |
| playwright | ✅ pass | ✅ pass |
