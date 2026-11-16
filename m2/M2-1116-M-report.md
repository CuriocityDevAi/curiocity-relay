# M2-1116-M report

#300 MERGEABLE · diff 8파일(admin+e2e/admin 전용, 서버0) · pos-integration ✅ · 내용 변경 없음 확인

## 충돌 원인
#298(M0-1116-G squash-merge) 이후 브랜치에 원본 커밋 3개(scaffold·service·test)가 남아 main과 겹침.

## 처리 내용
1. `origin/main`(5f32e3f) 위에서 M2-1116-K + M2-1116-L만 cherry-pick
   - 이전: `485d7a1 … 7baf26d` (5커밋) → 이후: `6b4c8f7 aaf32b6` (2커밋)
2. `--force-with-lease` force-push → PR MERGEABLE 확인

## 변경 파일 (8개, admin/e2e 전용)
```
apps/commerce-core/e2e/admin/admin-smoke.spec.ts
apps/commerce-core/src/admin/components/customer-display/EventCalendar.tsx
apps/commerce-core/src/admin/components/customer-display/EventForm.tsx
apps/commerce-core/src/admin/components/customer-display/PreviewPanel.tsx
apps/commerce-core/src/admin/components/customer-display/tokens.ts
apps/commerce-core/src/admin/lib/customer-display-api.ts
apps/commerce-core/src/admin/routes/pos-settings/customer-display/__tests__/overlap.unit.spec.ts
apps/commerce-core/src/admin/routes/pos-settings/customer-display/page.tsx
```
서버 파일: 0

## CI 결과
| 체크 | 결과 |
|---|---|
| unit-commerce-core | ✅ pass |
| customer-display | ✅ pass |
| e2e-admin-loyalty | ✅ pass |
| pos-integration | ✅ pass |
| docker-smoke-commerce-core | ❌ 불합격 (pre-existing — main #303 직후 CI에서도 동일 failure 확인, 내 변경 무관) |
| check / markers-and-forbidden | ✅ pass |

## R0 승인 상태
force-push는 브랜치 커밋만 교체; PR 타이틀·설명·리뷰(R0 APPROVE) 유지.
