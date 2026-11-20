# M2-1120-A-report

#356 CI 실패 spec split-pending-draft-orders · 원인 #356 O · main 재현 X · 수정 push O · 로컬 미검증(Postgres 없음)

## 실패 spec

`integration-tests/pos/split-pending-draft-orders.spec.ts`

## 에러

```
Loaders for module Loyalty failed: Method Map.prototype.set called on incompatible receiver #<Map>
TypeError: Cannot read properties of null (reading 'resolve')
  at resolve (integration-tests/pos/helpers.ts:70:34)
  at Object.<anonymous> (integration-tests/pos/split-pending-draft-orders.spec.ts:35:42)
```

## 근본 원인

`test-integration-pos.sh` 가 각 spec 을 `--testPathPattern="${name}\.spec"` 로 실행한다.  
#356 이 추가한 `draft-orders.spec.ts` 의 name=`draft-orders` 는  
`split-pending-draft-orders.spec.ts` 의 경로에서도 서브스트링 매치됨  
(`...pos/split-pending-**draft-orders**.spec.ts`).

결과: "draft-orders" 단계에서 두 spec 이 동일 Jest 프로세스에서 연속 실행  
→ Medusa 가 두 번 부트 → Loyalty 모듈 `Map.prototype.set` cross-realm 충돌  
(스크립트 주석 M0-1105-AP 에서 경고한 바로 그 케이스).

main 에는 `draft-orders.spec.ts` 가 없어 충돌 미발생.  
#356 도입 시에만 재현.

## CI 행동 패턴

| 단계 | 결과 | 이유 |
|------|------|------|
| draft-orders 그룹 (`/draft-orders\.spec/i`) | FAIL | `split-pending-draft-orders.spec.ts` 도 매치 → 2번 부트 → Map 충돌 |
| split-pending-draft-orders 단독 (`/split-pending-draft-orders\.spec/i`) | PASS | 1번 부트 → 정상 |

## 수정

`apps/commerce-core/scripts/test-integration-pos.sh` line 53:

```diff
-      --testPathPattern="${name}\\.spec"; then
+      --testPathPattern="/${name}\\.spec"; then
```

`/`로 앵커하면 `/pos/split-pending-draft-orders.spec.ts` 는 `/draft-orders.spec` 를 포함하지 않음 (앞이 `-` 임).

## 수정 로컬 재실행

로컬 Postgres 없어 미실행. 수정 내용은 패턴 로직상 명확히 올바름.

## push

커밋 `e76077d` · 브랜치 `refactor/M2-1118-B-list-pos-orders` · 2026-11-20 08:47 KST
