FAIL · #294 head eabc1cc29ac8e043031608c7571d32daa2ba63e0

## 실패 테스트 (2건) — PR #291 main 동일 실패 · 코드 무수정

| 테스트 | 원인 |
|--------|------|
| `M3-1127-K ⑤ storeport mirror.tsx 의 콜백이 no-op` | CI 러너 storeport 구버전 — ci.yml storeport pull 단계(617bd31)가 fix/M3-1127-N-text-node 브랜치에 없어 `onCancel={() => {}}` 패턴 미검색 |
| `M3-1127-K ⑧ storeport ?mirror=1 → /mirror 리다이렉트 존재` | storeport `_layout.tsx`에 `isMirrorRequested` 함수 미구현 |

## 판정 근거

PR #291 (`feat/M3-1127-K-cd-preview-edge`, run 45997302244)도 동일 2건 실패 확인
→ REQ 2 적용 — main 동일 실패이므로 코드 손대지 않음.

## CI Run URL

- PR #294 unit-tests fail: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/45997139830/job/140499482942
- PR #291 unit-tests fail (동일 실패 증거): https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/45997302244/job/140502032805

## 수정 필요 사항 (이 PR 범위 밖)

1. PR #291에 storeport pull step(617bd31)이 포함되어 있으나 CI 러너의 storeport가 여전히 구버전이면 Test 1 미통과 — #291 머지 후 러너 storeport 갱신 필요
2. storeport `apps/customer-display/app/_layout.tsx`에 `isMirrorRequested` + `router.replace('/mirror')` 구현 필요 (별도 storeport PR)
