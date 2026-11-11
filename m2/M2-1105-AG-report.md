---
name: M2-1105-AG · CurioCity AI 개발 방법론 리포 생성 + v1.0 초안
description: CuriocityDevAi/curiocity-devai-method 리포 신설 · 29개 파일 · Human-in-the-loop 프레임워크 문서화
author: M2
dated: 2026-11-11
---

# M2-1105-AG · 개발 방법론 리포 v1.0 초안

## 리포 URL
https://github.com/CuriocityDevAi/curiocity-devai-method (private)

## 파일 목록 (29개)

| 파일 | 줄 수 |
|---|---|
| README.md | 68 |
| 01-principles.md | 65 |
| 02-roles.md | 92 |
| 03-cycle.md | 104 |
| 04-artifacts/prompt.md | 61 |
| 04-artifacts/report.md | 54 |
| 04-artifacts/claim.md | 65 |
| 04-artifacts/ledger.md | 72 |
| 04-artifacts/work-queue.md | 56 |
| 04-artifacts/handoff.md | 65 |
| 04-artifacts/kyu-task-card.md | 53 |
| 05-tools.md | 83 |
| 06-operating-rules.md | 103 |
| 07-incidents.md | 72 |
| 08-metrics.md | 62 |
| 09-new-project.md | 72 |
| CHANGELOG.md | 61 |
| templates/prompt.md | 36 |
| templates/report.md | 32 |
| templates/ledger.md | 44 |
| templates/handoff.md | 46 |
| templates/kyu-task-card.md | 54 |
| proposals/README.md | 44 |
| proposals/_template.md | 55 |
| proposals/MP-001-orchestrator-worker-split.md | 65 |
| proposals/MP-002-status-board-kyu-panel.md | 61 |
| proposals/MP-003-railway-block.md | 72 |
| proposals/MP-004-manual-landing-block.md | 62 |
| proposals/MP-005-proposals-system.md | 59 |

**합계**: 29개 파일 · 1,645줄

## 커밋 sha
4567df4

## 발견한 모순 / MP-006~ 제안

**모순 없음**: 현재 관행과 §핵심 규칙이 일치하는 것으로 확인. 아래는 Kyu 결정이 필요한 미확정 항목입니다.

**MP-006 후보 (Kyu 결정 필요) — 제안됨 상태로 proposals 에 추가 권장**:
1. **metrics.md 주간 집계 절차**: 현재 "하루 마감 때 줄 추가"만 있고, 주·월 집계 방법이 없음. 집계 주기·형식 결정 필요.
2. **R0 가 APPROVE 후 오케가 squash 머지 vs Kyu 가 직접 머지**: CHANGELOG 에 대체됨으로 기록했으나, Kyu 가 명시적으로 "오케 머지 허용"을 확인했는지 불확실. 명시적 승인 권장.

## 착지 명령
relay 커밋 m2: M2-1105-AG → push → claim done
