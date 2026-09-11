---
id: K0-0911-AQ-test
hub: k0
issued_at: 2026-09-11T22:55:00Z
status: pending
---

## 요지

K0-0911-AQ 자동 발부 v2 흐름 테스트 · 포털 카드 노출 · [투입]/[프롬프트 복사] · 데몬 dispatch 실측 대상.

## REQ

- 이 프롬프트는 test dispatcher 로 K0 자기 자신에게 전달됨.
- headless `claude -p` 방식 (K0-0911-AQ-C 실험 채택 · 근거 = 이 라운드 리포트 § AQ-C 실험 로그).
- 성공 시 = 데몬이 relay 파일 status pending → dispatched 커밋.

## DOC

- SPEC § AQ 정본 (K0-0911-AQ v1.58 · frontmatter · 상태 전이).

## BUILD/REPORT

- 착지 시 = k0/K0-0911-AQ-test-report.md 생성 (frontmatter round/pr/outcome/kyu_checks).
- 포털 = 착지 카드 자동 노출 (relay 폴링 · SWR 30초 fresh).
