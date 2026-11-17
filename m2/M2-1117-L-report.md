PR #328 · 테스트 통과

## 작업 요약
- branch: fix/phone-id-trunk-zero
- 변경 파일: phone-id.ts 2사본 + 테스트 2파일
- 테스트: commerce-core 31개 pass / customer-display 20개 pass (전체 371+140개 pre-push 통과)
- PR: https://github.com/CuriocityDevAi/storeport/pull/328

## 구현
phone-id.ts 에 2줄 추가 (IDD prefix 0062 제거 + 62 뒤 trunk-0 제거).
기존 케이스 전부 유지, 바이트-동일 단언 통과.
