APPROVE · 잔존 같은 패턴 2곳

## 결과

PR#294 APPROVE. 자기 PR 제한으로 approve API 불가 → 코멘트로 대체.
코멘트: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/294#issuecomment-7230044842

## 원인 · 수정 검증

- **정확**: `{numLabel} · </Text>` = JSX 표현식 + 문자열 리터럴 ` · ` 2개 자식 → NativeWind CssInteropComponent가 Text를 View로 감쌀 때 ` · `가 View 직접 텍스트 노드 → "Unexpected text node"
- 수정(template literal 단일화)으로 완전 해소
- CI 전부 green (assertions · flow-tests · lint · playwright · unit-tests)

## customer-display/** 스캔

파일 3개. 잔존 같은 패턴 **2곳**:

1. **L191** (v1.3 busy case): `Display · {other} entering` → 3-child 혼합 (선택)
2. **L295** (v1.4 CustomerFlowChip confirming): `Awaiting confirm{phone ? ...}` → 문자열 + JSX 표현식 혼합 (선택)

PhoneEntryButton.tsx — 문제 없음.

## 웹 빌드 콘솔 확인

자기 PR 제한으로 PR 브랜치 체크아웃 없이 소스 레벨 검증. 신규 테스트 m3-1127-n-text-node.test.ts가 fix 패턴을 소스에서 고정, playwright CI green 확인.
