PASS · PR: https://github.com/CuriocityDevAi/curiocity-devai-method/pull/2

## 커밋 목록

| 커밋 | 파일 | 요약 |
|---|---|---|
| 1849406 | 01-principles.md | P6 오케 Fable, P8 명세 선행 추가 |
| aba8c0e | 02-roles.md | 오케 Fable, R0 클라우드·명세대비, 허브 v8 규칙 |
| 85e4060 | 03-cycle.md | 11단계, v8 착지, 오케 머지, 스택PR 규칙 |
| 474f502 | 04-artifacts/prompt.md, templates/prompt.md | 모델줄, 보존요소, v8 착지 형식 |
| 8db660f | 05-tools.md | 러너 v8.3, ci-watch, 클라우드0, 요구원장색인 |
| 0447fd2 | 06-operating-rules.md | Fable, CI건강감시, 보존요소, ubuntu-latest 금지 |
| 0b16954 | 07-incidents.md | 11-11~11-26 사건 추가 (relay device-incidents 동기화) |
| 989eaee | 08-metrics.md | 4지표(토큰 추가), 11-10~11-26 기록 갱신 |
| 7cb686a | 09-new-project.md | specs뼈대, CI러너, 보존테스트, 이식손볼곳 |

## 파일별 변경 줄 수 (추가/삭제)

| 파일 | 변경 |
|---|---|
| 01-principles.md | +14 / -2 |
| 02-roles.md | +31 / -21 |
| 03-cycle.md | +44 / -24 |
| 04-artifacts/prompt.md | +35 / -17 |
| templates/prompt.md | +17 / -3 |
| 05-tools.md | +65 / -15 |
| 06-operating-rules.md | +29 / -29 |
| 07-incidents.md | +54 / -2 |
| 08-metrics.md | +31 / -9 |
| 09-new-project.md | +75 / -15 |
| **합계** | **+395 / -137** |

## 자기 검증

### (a) relay 파일 참조 확인

- `docs/hub-runner.md` → 05-tools.md "정본 문서" 링크 ✅
- `specs/screens/ci-watch.md` → 05-tools.md "정본 명세" 링크 ✅
- `ledger/requirements.yaml` → 05-tools.md, 09-new-project.md ✅
- `ledger/decision-*` 파일 참조 → 각 파일 이력 꼬리에 명시 ✅
- 상대 링크 없음 (방법론 리포 내 파일끼리만 상대 링크) ✅

### (b) 옛 규칙 잔존 검사

| 검사 항목 | 결과 |
|---|---|
| `Opus)` 오케 표기 (oｋe = Fable 이어야) | 02-roles.md 행에 `(11-27 변경 · 이전: Opus)` 이력으로만 존재. `Opus` 는 M0 허브·R0 돈PR 용도로 적절히 잔존 ✅ |
| "20분 일괄 감시" | 06-operating-rules.md 감시 규칙에 "전체 허브 20분 일괄 틱 폐지 (대체됨)" 명시 — 이력으로만 ✅ |
| "main 머지는 항상 Kyu" | 없음 ✅ |
| `/tmp/<ID>-report.md` 착지 경로 | 03-cycle.md 에 "v8 이전 착지 방식 … 더 이상 사용하지 않는다" 이력 꼬리로만 존재. prompt 템플릿에는 없음 ✅ |
| "3지표" 헤딩 | 08-metrics.md 제목이 "4지표"로 변경 ✅ |

## 확신이 없어 그대로 둔 곳

- `04-artifacts/` 하위 다른 파일들(`claim.md`, `report.md`, `ledger.md` 등): 내용이 현재 운영과 큰 차이 없어 보여 수정하지 않음. 필요 시 별도 라운드.
- `templates/` 하위 `claim.md`, `handoff.md`, `report.md` 등: 같은 이유로 보류.
- `07-incidents.md` 11-19 이후 (11-19 ~ 11-23) 사건: relay `device-incidents.md` 에 별도 절이 없고 `metrics.md` 에만 요약 기록. 별도 사건 행으로 추출하지 않음 — 미확인 상태로 명시.

## 오케 소유 파일에서 발견한 오류 목록

| 파일 | 오류 | 비고 |
|---|---|---|
| `README.md:8` | 모델 배치 설명에 "오케 메인 창 = 가장 좋은 모델(Fable)" 으로 이미 반영됨 — 본문 01~09 와 일관성 OK | — |
| `README.md:17` | "작업자 → 허브가 결과를 commit/push" 도식 — v8 에서 허브가 relay 에 직접 push 안 하는 흐름이지만 README 는 오케 소유이므로 수정 불가. 불일치 항목으로 기록. | 오케 직접 갱신 필요 |
| `10-sdd.md` | 현재 운영과 큰 충돌 없음 — 확인만 | — |
