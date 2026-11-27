fork#295: 리뷰 완료(자기PR APPROVE 불가·오케위임) · CI 대기(playwright IN_PROGRESS) → 머지 보류 · #291/#294 CI 재시작: 아니오(#295 미머지) · #293 case1: FlashList 제품카드 DOM 존재하나 hidden — estimatedItemSize CI 환경 렌더링 문제로 checkout 미도달, #480 미배포 아닌 환경 이슈

## #295 리뷰 결과

| 항목 | 결과 |
|---|---|
| head | `69694bb` |
| storeport pull 최신 | `git pull --ff-only origin main` ✓ |
| 실패 graceful | `\|\| true` — 단계 실패 비전파 ✓ |
| 시크릿/토큰 노출 | 없음 ✓ |
| 기존 잡 보존 | unit-tests 직전 삽입만, 타 잡 변경 없음 ✓ |

APPROVE 시도 → `Can not approve your own pull request` (GitHub 정책) → 원장 "오케 위임" 조항 적용, 코드 검토는 완료.

## CI 상태 (확인 시점)

- route / lint / actionlint: SUCCESS
- flow-tests / assertions / unit-tests: SUCCESS
- heavy-cloud: SKIPPED
- **playwright: IN_PROGRESS** ← 머지 블록 사유
- 실패 없음

REQ 0 "CI running 이면 머지하지 말고 CI 대기 착지(기다리지 말 것)" 적용 → 머지 보류.

## #291 / #294 branch 업데이트

#295 미머지 상태이므로 `gh pr update-branch` 미실행 → CI 재시작 아니오.

## #293 case1 실서버 FAILURE 원인

```
Error: expect(locator).toBeVisible() failed
Locator:  locator('[data-testid^="product-handle_"][data-testid$="_card"]').first()
Received: hidden  (33회 resolve됨)
```

제품 카드가 DOM에는 33회 존재하나 `hidden` 상태 — FlashList/estimatedItemSize가 CI 러너(iMac-M1)에서 뷰포트 높이를 측정 못 해 아이템을 숨기는 렌더링 이슈. 백엔드(storeport mirror sha `20b824ccae`) 는 정상 기동 확인(`start commerce-core`, `seed-soopsok`, `ready` 출력). 제품이 API 미수신이면 DOM 미생성이어야 하나 33개 존재 → 백엔드/storeport#480 미배포가 아닌 **UI 렌더링 환경 문제**.

결과: checkout-pay-cash 버튼에 도달 불가 → 연쇄 실패.
