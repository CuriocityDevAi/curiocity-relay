## [feature-map 규약] (오케 신설 · 2026-09-16 · R030 "기능 지도")

**목적**: 프로젝트별 기능 구조도(지도 탭 · 트리맵/마인드맵). "지금 어디가 변경 중인가"를 열린 PR diff ↔ files 패턴 매칭으로 **포털이 계산**한다. 터미널은 지도의 구조·설명·planned/deprecated만 유지.

**파일 위치**: 각 리포 `docs/feature-map.yaml` (문서 정본 리포 · StorePort는 storeport 리포에 두고 포크 파일은 `fork:` 접두). build-index가 각 리포 main에서 fetch → `index.json.feature_maps[]`.

**스키마**:
```yaml
project: todoboss
version: 1
areas:
  - id: payroll
    name: 급여
    processes:
      - id: pcon-step4-judge          # 리포 내 유일 · kebab
        name: "4 판정"
        summary: "출퇴근 기록에 정상·지각·야근·조퇴·결근·판정불가를 매기는 단계"   # 처음 보는 사람 기준 한 문장 · 약어 0
        files: ["backend/src/pcon/judge*", "web-admin/src/lib/pcon/Step4*"]        # glob · 각 패턴 ≥1 파일 실측
        spec: docs/epics/pcon-engine.md#step4
        status: live | planned | deprecated     # building은 기입 금지 (포털 계산)
```

**규범**:
- `status`는 live|planned|deprecated만. **building = 포털이 계산**(열린 PR diff 파일 ↔ files 매칭). 이번 주 머지 = 머지 PR diff 매칭.
- **히스토리** = files 패턴 `git log` (별도 데이터 없음). 정확도용으로 커밋·PR 본문에 `processes: [<id>, ...]` 필드 필수.
- **CI `feature-map-check.yml`**: PR diff 중 어느 패턴에도 안 걸리는 파일 있으면 실패 + 목록 코멘트("지도 갱신 필요"). planned에 files가 생기면 live 승격 안내.
- `scripts/feature-map-check.mjs`: 패턴 매칭 검증 · 미분류 파일 목록 · 프로세스별 최근 커밋 3건 JSON.
- CLAUDE.md [DOC] 규약: "src 변경 시 feature-map.yaml 해당 프로세스 갱신 · 신규 파일은 등록 · PR 본문 processes 필드".
- 포털 지도 탭(K0) 색: 변화 없음 / 변경 중(열린 PR) / 신규 생성 중(지도에 없던 파일 → 미등록 빨강) / 이번 주 머지(보라) / planned(점선).
