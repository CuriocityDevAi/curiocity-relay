# M3-1128-D 리포트

**결과: FAIL**

---

## 1. Rebase 충돌 해결

두 브랜치 모두 `git rebase origin/master` (`3629bd5`) 완료.

| 브랜치 | 충돌 파일 | 충돌 내용 | 해결 방법 |
|--------|-----------|-----------|-----------|
| #294 · #291 공통 | `components/order-chips/types.ts` | `50248db` (draft-duplicate 브랜치 커밋) vs master(`f10dbe0` #289 머지): `mergeActiveId` 함수 시그니처 single-line vs multi-line 포매팅 차이 | HEAD(master, single-line) 채택 — `50248db`는 이미 #289로 master에 머지된 동일 fix |

---

## 2. check:pr 결과 (두 브랜치 공통)

| 항목 | 결과 | 비고 |
|------|------|------|
| 머지 여부 | ✓ PASS | |
| origin/master 충돌·뒤처짐 | ✓ PASS | |
| lint | ✓ PASS | |
| typecheck | ✗ FAIL | 16개 에러 — master 기준 동일한 기존 에러, 브랜치 신규 에러 없음 |
| 단위 테스트 | ✓ PASS | storeport local pull(`9cd3bc55`) 후 통과 — `isMirrorRequested` 테스트 통과 |

**push:** `git push --force-with-lease` 완료 (typecheck FAIL은 master 기존 에러와 동일하여 진행)

---

## 3. 리허설 결과

| PR | 브랜치 | storeport SHA | case1 | case1b | sequential | run URL |
|----|--------|---------------|-------|--------|------------|---------|
| #294 | `fix/M3-1127-N-text-node` | `9cd3bc55` | ✘ FAIL | ✘ FAIL | ✓ PASS | https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/46092599753 |
| #291 | `feat/M3-1127-K-cd-preview-edge` | `9cd3bc55` | ✘ FAIL | ✘ FAIL | ✓ PASS | https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/46092515988 |

**storeport 체크아웃 로그 인용 (두 run 동일):**
`storeport 체크아웃: path=/tmp/storeport-sha-wt · 요청 sha=9cd3bc5541191e6d81804628e96da81dc914acdd · 실제 체크아웃 sha=9cd3bc5541191e6d81804628e96da81dc914acdd`

---

## 4. 실패 원인 (고치지 않음)

**case1 실패 줄:** `e2e/cd-pos/case1.spec.ts:107`

```
Error: expect(locator).toHaveAttribute(expected) failed
Expected pattern: /entering phone 0813804420000\b/
Received string:  "typing 0813804420000"
```

**원인:** `components/customer-display/CustomerPhoneStatus.tsx:269` aria-label이 `` `${prefix}typing ${partial}` `` 으로 반환 — #296이 case1 테스트를 `entering phone X` 기대값으로 업데이트했으나 해당 코드(`entering` 상태 렌더링 경로)는 미수정.

**case1b 실패 원인:** case1의 `typing` aria-label로 인한 flow 실패가 선행 → `TimeoutError: locator.click: Timeout 5000ms exceeded` (Re-enter 버튼 미노출).

---

## 5. #296 CI e2e-cd-pos 실패 (run `46090422776`)

- run URL: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/46090422776
- **원인:** 동일 — `CustomerPhoneStatus.tsx:269` aria-label `typing 0813804420000` vs 기대 `entering phone 0813804420000` (case1 · case1b FAIL, sequential PASS).

---

ⓒ 상시 조항: 이 리포트는 러너가 push하며 작업 중 git 리포 내에 작성되지 않았음.
