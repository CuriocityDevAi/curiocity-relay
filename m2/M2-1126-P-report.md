PASS #55 3081564ca · fail 0

## 3건 판정 표

| 테스트 | 의도 | 판정 | 조치 |
|--------|------|------|------|
| P-2a | `ci.data.partial=true` + 명시적 offline 러너 → `partial: true` | (ㄴ) CI 조회 실패 → `?` 맞음 | 코드 수정 |
| P-2c | `repos_failed` fork repo + 명시적 offline → `partial: true` | (ㄴ) CI 조회 실패 → `?` 맞음 | 코드 수정 |
| P-3a | `partial=true` + offline → `?` 표시, OFF 금지 | (ㄴ) CI 조회 실패 → `?` 맞음 | 코드 수정 |

## 원인 & 수정

`buildMachineState` 내 `machineStatus` 함수의 W5fix (line 422)가
명시적 offline 러너에 `partial: false` 하드코딩 → `isPoolPartial` 무시.

```diff
- if (!online) return { status: 'offline', job: null, partial: false };
+ if (!online) return { status: 'offline', job: null, partial: isPoolPartial };
```

- `ci.data.partial=false` + offline → `isPoolPartial=false` → `OFF` ✓ (W5fix 의도 보존)
- `ci.data.partial=true` + offline → `isPoolPartial=true` → `?` ✓ (W6 보존)

## 결과

전체 49/49 pass, fail 0. PR: https://github.com/CuriocityDevAi/curiocity-relay/pull/55
