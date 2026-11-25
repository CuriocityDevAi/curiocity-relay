PASS

## PR

https://github.com/CuriocityDevAi/storeport/pull/431
베이스: `feat/M0-1125-F-pos-settings-folder-tab` (#430 먼저 머지 필요)

## 구현 요약

| 항목 | 결과 |
|---|---|
| view-model 공용화 | ✅ `packages/receipt-view-model` 신규 패키지. customer-display 재수출 |
| settingImpactRegistry | ✅ `store_address` / `store_nickname` 등록 |
| SettingImpactChips | ✅ General 탭 Store address · Store nickname 옆 영수증 아이콘 칩 |
| SettingImpactPreviewModal | ✅ FocusModal 2칸 (저장값 / 입력 중 값) |
| ReceiptPreview | ✅ 붉은 박스 (border-ui-fg-error semantic token) |
| 저장 버튼 옆 영향 한 줄 | ✅ General 탭에서만 표시 |
| 샘플 데이터 | ✅ 상품 2개 고정 샘플 (Croissant · Oat Latte) |

## 테스트 결과

- **단위 7개** (jest): `settingImpact.unit.spec.ts` — 모두 PASS
- **Playwright 4개** (admin-smoke): 모두 PASS
  - `06a-settings-impact-chip.png`: General 탭 chip 존재
  - `06b-settings-impact-modal-open.png`: 모달 · 두 칸 · 붉은 박스(storeAddress)
  - `06c-settings-impact-draft-updated.png`: 주소 변경 → 오른쪽 갱신
  - `06d-nickname-chip-modal.png`: 닉네임 chip → 주문번호 줄 붉은 박스
- **기존 테스트 회귀 없음**: commerce-core unit 681개 · customer-display 243개 모두 통과
- **typecheck**: 루트 tsc 오류 0 · admin tsconfig 기존 오류 5개(pre-existing) 그대로

## 스크린샷 경로

```
apps/commerce-core/e2e/screenshots/admin-smoke/06a-settings-impact-chip.png
apps/commerce-core/e2e/screenshots/admin-smoke/06b-settings-impact-modal-open.png
apps/commerce-core/e2e/screenshots/admin-smoke/06c-settings-impact-draft-updated.png
apps/commerce-core/e2e/screenshots/admin-smoke/06d-nickname-chip-modal.png
```

## view-model 공용화 경로

| 변경 | 경로 |
|---|---|
| 신규 패키지 | `packages/receipt-view-model/src/` |
| CD 재수출 | `apps/customer-display/src/screens/receipt-view.ts` |
| Admin import | `@storeport/receipt-view-model` |

## 주요 파일

- `packages/receipt-view-model/src/index.ts` — 패키지 진입점
- `apps/commerce-core/src/admin/routes/pos-settings/lib/settingImpactRegistry.ts` — 레지스트리
- `apps/commerce-core/src/admin/routes/pos-settings/lib/previewSnapshot.ts` — 샘플 OrderSnapshot 생성기
- `apps/commerce-core/src/admin/routes/pos-settings/components/ReceiptPreview.tsx` — 영수증 HTML + 붉은 박스
- `apps/commerce-core/src/admin/routes/pos-settings/components/SettingImpactChips.tsx` — 아이콘 칩
- `apps/commerce-core/src/admin/routes/pos-settings/components/SettingImpactPreviewModal.tsx` — FocusModal
- `docs/epics/admin-settings-impact-preview.md` — 붉은 박스 규칙 포함 계획서

## 커밋

```
f9581fd feat(admin): M3-1125-G — POS 설정 영향도 아이콘 칩 + 미리보기 모달 (§8-①)
dac8f49 test(receipt-view-model): M3-1125-G — 패키지 단독 vitest 추가 (pre-push hook 충족)
```
