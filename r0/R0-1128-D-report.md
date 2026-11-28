# R0-1128-D 리뷰 리포트 — fork#298 (환불 주문 Phone entry 토스트)

**판정: APPROVE · #294·#291 충돌 없음**

---

## 1. diff 확인

- `api/hooks/customer-flow.ts`: `PhoneEntryIneligibleReason` 유니온에 `| 'order_refunded'` 한 줄 추가만
- `components/customer-display/PhoneEntryButton.tsx`: `REASON_TOAST` Record에 `order_refunded` 엔트리 한 줄 추가만
- 기존 reason 모두 미터치, `Record<PhoneEntryIneligibleReason, ...>` 선언으로 tsc 가드 유지

## 2. 충돌 체크 (git merge-tree)

| 비교 대상 | PhoneEntryButton.tsx | customer-flow.ts | 결과 |
|-----------|----------------------|------------------|------|
| #294 `fix/M3-1127-N-text-node` | 미터치 | 미터치 | **충돌 없음** |
| #291 `feat/M3-1127-K-cd-preview-edge` | 미터치 | 미터치 | **충돌 없음** |

merge-tree 출력: 양쪽 모두 `__tests__` 신규 파일 "added in remote" 외 충돌 마커 없음.

## 3. 테스트 평가

6/6 테스트 전부 `readFileSync` + regex 패턴 체크 (소스 기반). 테스트 파일 주석에 "RN JSX 포함 — 직접 import 불가" 제약 명시.  
런타임 toast mock 호출 횟수 검증은 없으나, `Record<PhoneEntryIneligibleReason, ...>` 타입 선언이 컴파일 타임 안전망 역할.  
웹 빌드 스샷 미실행.

## 4. 발부문 자기 보고 불일치 (선택 지적)

storeport#480 체크리스트 5번이 `components/customer-display/**` "미터치"라고 기재했으나 실제로 `PhoneEntryButton.tsx` 수정 — 충돌·기능 영향 없음, 선택 지적으로 PR 코멘트에 기재.

## 5. 조치

- fork#298 PR 코멘트(COMMENT 판정·근거) 제출 완료
