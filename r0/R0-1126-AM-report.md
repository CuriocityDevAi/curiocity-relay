relay#55 APPROVE · 3081564ca · fail 0

## 변경 요약

PR #55 `feat/M2-1126-P` — `scripts/watch/ci-watch-render.mjs` 2줄 수정

```diff
-      if (!online) return { status: 'offline', job: null, partial: false };
+      if (!online) return { status: 'offline', job: null, partial: isPoolPartial };
```

## [REQ 1] 두 경우 판정

| 경우 | isPoolPartial | partial 반환 | 렌더 |
|------|--------------|-------------|------|
| (ㄱ) 조회 정상 + 러너 offline | false | false | 빨강 **OFF** ✓ |
| (ㄴ) 조회 일부 실패 + offline | true | true | 회색 **?** ✓ |

W5fix가 `partial: false`를 하드코딩해 (ㄴ) 경우에도 OFF를 단정하던 버그.
`isPoolPartial` 조건부로 변경해 W6(CI 데이터 일부 실패 시 `?`) 보존.

## 실제 heartbeat 렌더 확인

```
all.json  ci.data.partial = true
          ci.data.repos_failed = []
ci_runners: Youngkyus-MacBook-Pro-M1  status=offline
```

→ `isPoolPartial = true`  
→ `buildMachineState` 반환: `{ status:'offline', job:null, partial:true }`  
→ 현재 MBP 칸 렌더: **?** (OFF 아님 · 올바른 동작)

## [REQ 2] 테스트 결과

```
# tests 49
# pass  49
# fail   0
```

| 케이스 | 내용 | 결과 |
|--------|------|------|
| P-2a | ci.data.partial=true → offline 러너 partial 플래그 true | ✓ pass |
| P-2c | repos_failed에 fork repo → fork 풀 partial=true | ✓ pass |
| P-3a | partial=true 且 offline → ? 표시 (빨강 OFF 금지) | ✓ pass |
| 전체 49건 | | 0 fail |

## 판정 근거

- 한 줄 변경(partial: false → isPoolPartial)이 두 경우를 정확히 분기
- W6 보존 확인
- 보존 요소(v1.13 4줄 · v1.14 heavy-cloud · MBP 실제 꺼졌을 때 OFF) 모두 유지
- 테스트 49/49 통과
