## [feature-map 규약] (오케 신설 2026-09-16 · 3단계 확장 2026-09-17 · R030/R032)

**목적**: 프로젝트별 기능 구조도(지도 탭). "지금 어디가 변경 중인가"를 열린 PR diff ↔ files 패턴 매칭으로 **포털이 계산**한다. 터미널은 지도의 구조·설명·planned/deprecated만 유지.

**3단계 (Kyu 09-17)**: L3 = area(하이레벨) · L2 = process(서브) · L1 = process.children(상세). 영향도는 L3부터 보여주고 클릭하면 확대되어 L2 → L1로 내려간다. "L3·L2·L1 보기" 토글로 한 번에 펼치기도 가능.

**파일 위치**: 각 리포 `docs/feature-map.yaml` (StorePort는 storeport 리포 · 포크 파일은 `fork:` 접두). build-index → `index.json.feature_maps[]`.

**스키마**:
```yaml
project: todoboss
version: 2
areas:                                   # L3
  - id: payroll
    name: 급여
    summary: "출퇴근 파일을 넣어 급여 집계까지 가는 흐름"
    processes:                           # L2
      - id: pcon-step4-judge
        name: "4 판정"
        summary: "출퇴근 기록에 정상·지각·야근·조퇴·결근·판정불가를 매기는 단계"
        files: ["backend/src/pcon/judge*", "web-admin/src/lib/pcon/Step4*"]
        spec: docs/epics/pcon-engine.md#step4
        status: live | planned | deprecated
        children:                        # L1 (선택 · 없으면 L2가 최하위)
          - id: judge-rules
            name: "판정 규칙"
            summary: "유예 10분·30분 기준으로 상태를 정하는 규칙"
            files: ["backend/src/pcon/judge.rules*"]
          - id: judge-adjust-modal
            name: "판정 조정 모달"
            files: ["web-admin/src/lib/pcon/JudgeAdjust*"]
```

**규범**:
- `status`는 live|planned|deprecated만. **building = 포털이 계산**(열린 PR diff ↔ files 매칭 · 자식이 맞으면 부모도 "변경 중" 승격). 이번 주 머지 = 머지 PR diff 매칭.
- files 패턴은 L1이 있으면 L1에, 없으면 L2에. 상위는 하위 합집합(중복 기입 금지).
- **히스토리** = files 패턴 `git log`. 커밋·PR 본문에 `processes: [<id>, ...]` 필드 필수(L1/L2 어느 id든).
- **CI `feature-map-check.yml`**: PR diff 중 어느 패턴에도 안 걸리는 파일 있으면 실패 + 목록 코멘트. planned에 files가 생기면 live 승격 안내.
- `scripts/feature-map-check.mjs`: 패턴 검증 · 미분류 목록 · 프로세스별 최근 커밋 3건 JSON · L1/L2/L3 개수.
- CLAUDE.md [DOC] 규약: "src 변경 시 feature-map.yaml 갱신 · 신규 파일 등록 · PR 본문 processes 필드".
- 포털 지도 탭(K0) 색: 변화 없음 / 변경 중(열린 PR) / 신규 생성 중(미등록 파일 → 빨강) / 이번 주 머지(보라) / planned(점선).
- **ImpactFlow(curiocity-kit)**: 영향 흐름 뷰 컴포넌트 정본은 kit `packages/impact-flow` · 입력 = {source(PR/task), files[], map(3단계)} · 출력 = 단계별 SVG(점 흐름·펄스·흐림) + L3→L2→L1 확대 + 레벨 토글 + 캡션.
