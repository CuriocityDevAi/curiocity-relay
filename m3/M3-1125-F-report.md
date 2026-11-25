PASS

## 대사표 요약
- Admin UI에 편집 칸 노출된 설정 필드: **16개**
- 사용처 없는 Admin-노출 칸: **0개** (모든 칸에 사용처 하나 이상 존재)
- API 타입에만 있고 UI 미노출인 필드 6개(`tax_label`, `tax_rate_pct`, `logo_file_id`, `wa_default_target`, `ui_language`, `rounding`)는 계획서에 별도 표기

## 권장 UX
**FocusModal 팝업 (옵션 A)** — 칩 클릭 → `@medusajs/ui FocusModal` 로 영수증 미리보기 열림 · 2-column(현재 저장값 / 입력 중 변경 후). 충분한 공간·전체 영수증 렌더 가능. Tooltip hover 보완 병행.

## 1차 작업 범위
General 탭 `store_address`·`nickname` 2칸 + 공통 모듈 골격 (약 30~45분):
- `ReceiptPreviewCard` HTML 컴포넌트 (신규)
- `settingImpactRegistry` 초기화 (2개 엔트리)
- `SettingImpactChips` / `SettingImpactPreviewModal` (신규)
- `page.tsx` General 탭 칩 삽입 + save footer 영향 텍스트 추가

## 문서 PR
https://github.com/CuriocityDevAi/storeport/pull/429  
브랜치: `docs/M3-1125-F-admin-settings-impact-preview`  
파일: `docs/epics/admin-settings-impact-preview.md`
