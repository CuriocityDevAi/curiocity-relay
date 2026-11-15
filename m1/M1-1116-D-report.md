# M1-1116-D 착지 보고

**PR #291** · https://github.com/CuriocityDevAi/storeport/pull/291

## 화면 요소 대사 (시안 ①② 항목별)

### ① Theme 탭
- ✅ 노란 띠 배너: "N unapplied changes · 변경된 필드명" + [Discard] [Apply to stores]
- ✅ 우상단: "Live" 배지 · "applied X ago" · "– iPads online" + [Restore previous]
- ✅ 왼쪽: Applies to 뱃지(All stores · scope placeholder) · 20종 그리드(CHANGED 배지) · 매장 이미지 업로드/교체/제거 · 읽기 전용(가게 이름·세금·적립률 — 서버 연동 pending)
- ✅ 오른쪽(sticky): "DRAFT" 배지 · View as date · 화면 탭 5개(Idle·Paying·Keypad·First visit·Done) · iPad 4:3 프레임 · 샘플 카트(2×Coffee Latte)

### ② Events 탭
- ✅ 연도 달력: 12칸 · 전체 scope=파랑 · 이 scope=이벤트 고유색 · 범례
- ✅ 목록: 이벤트·날짜·메시지·상태(예정/진행중/완료) · [Preview][Edit][Delete]
- ✅ Add/Edit 패널: 이벤트 7종 · From/To · 이슬람력 3종 [Fill estimated dates]
- ✅ 겹침 경고 + 하루별 우선순위 라디오 (미선택 시 저장 불가)
- ✅ 화면 문구 30자 편집 + Reset to default + 글자수/30 뱃지
- ✅ 날짜 기준 미리보기 (그리팅·화면 탭)

### 서버 대기
- ⏳ draft/apply/revert/discard (M0-1116-C): 404 → direct PUT 폴백
- ⏳ message·overrides 필드: 클라이언트에서 보내나 서버 현재 무시/거부 가능

## CI
- tsc --noEmit: ✅ 0 errors
- Jest unit (overlap·30자): ✅ 16/16
- 전체 테스트: ✅ 326 passes
- feature-map: ✅ 0 unmatched
- naming-check: ✅ PASS

## 착지 스샷
미실행 — 로컬 Admin Playwright 미구성. UI 미검증 명시.
