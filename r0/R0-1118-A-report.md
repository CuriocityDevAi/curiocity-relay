#151 닫기 · #153 닫기

## #151 `ci(savings): M2-1116-H`

**변경 내용**: ci.yml — `paths-ignore`(md/docs), `ready_for_review` 타입, job별 `if: !draft` 추가. lint.yml — `concurrency cancel-in-progress`, `timeout-minutes: 10`, `if: !draft` 추가. 총 2파일 17줄 변경.

**11-13 "CI 비용 절감 안 함" 결정과 충돌 여부**:
- draft skip: ✅ 충돌 (비용 절약 목적)
- paths-ignore: ✅ 충돌 (비용 절약 목적)
- lint concurrency cancel-in-progress: ✅ 충돌 (비용 절약 목적)
- timeout-minutes: ⬜ 충돌 없음 (품질 보호 목적)

**master 충돌**: 없음. PR base SHA(`2e98794` ci.yml, `cb39d52` lint.yml)가 현재 master와 동일.

**판정: 닫기**. PR 전체 취지(CI 비용 절감)가 11-13 Kyu 종결 결정과 충돌. timeout-minutes만 독립적 가치이나 단독 머지 규모 미흡. 11-16 M2-1116-H PR은 종결 결정 이후 재발의이며 Kyu 재승인 근거 없음.

---

## #153 `docs(customer-display): M1-1116-L`

**변경 내용**: 3개 docs 파일 추가 (559줄). `customer-display-plan.md`(353줄 · v7 설계서), `loyalty-phase1-plan.md`(54줄 · 이관 포인터), `customer-display-native-app-plan.md`(152줄 · Expo EAS 전환 계획).

**storeport 진행 현황과 비교**:
- storeport #351 `fix(customer-display): M2-1117-AA` 2026-11-17 머지. 워드마크 PNG·iOS 번들 오류 수정으로 customer-display가 빌드/테스트 단계 진입 확인.
- `customer-display-plan.md`, `loyalty-phase1-plan.md` 2개 파일은 이미 master에 존재 (다른 경로 머지). 머지 시 충돌 발생.
- `customer-display-native-app-plan.md`는 master에 없음 — 유일한 신규 콘텐츠이나, 기술 대상(`apps/customer-display/`)은 storeport 소속으로 위치 불일치.

**판정: 닫기**. 3개 파일 중 2개 충돌, 나머지 1개(native app plan)는 storeport 소속 콘텐츠. 작업이 계획서를 앞질러 진행 중. native app plan이 여전히 유효하면 storeport `docs/plans/`에 직접 추가 권고.

---

*생성: 2026-11-18 · R0-1118-A*
