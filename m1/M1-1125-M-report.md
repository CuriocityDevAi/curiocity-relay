PASS

## M1-1125-M — POS Settings Customer Display 탭 분리

### PR
https://github.com/CuriocityDevAi/storeport/pull/435
(base: main · ⚠ #433 먼저 머지 필요)

### 커밋
`866ef05` feat(commerce-core): M1-1125-M — POS Settings Customer Display 탭 분리 (Receipt 오른쪽 6번째)
브랜치: `feat/M1-1125-M` (based on `feat/M1-1125-L` / #433)

### 작업 내용
- `TABS` 배열에 `"customer-display"` 추가 → `?tab=customer-display` URL 지원
- General 탭 Customer Display 블록 제거
- Receipt 오른쪽에 6번째 탭 Trigger + Content 추가
- Per-store override 모드: "Customer display settings are brand-wide. Switch to Brand (all stores) to edit." 안내
- 탭 순서: General · Tax · Payments · Pre-order · Receipt · Customer Display

### Playwright 테스트 결과
```
Running 10 tests using 1 worker

  ✓  탭 6개 · Receipt 활성 · Advanced 섹션 (930ms)
  ✓  General 탭 · 매장 선택 시 nickname 편집기 (475ms)
  ✓  Receipt 탭 트리거 활성 강조 (shadow + 배경) (424ms)
  ✓  R1' 알약 탭 · 패널·토큰·ARIA 구조 (484ms)
  ✓  R1 폴더 탭 · ←/→ 방향키로 탭 이동 (436ms)
  ✓  R2 닉네임 영숫자 · PIM3 허용 · pim3 자동 대문자 (505ms)
  ✓  Customer Display 탭 클릭 → 버튼 존재 (472ms)
  ✓  General 탭에 Customer Display 블록 없음 (403ms)
  ✓  ?tab=customer-display 직접 진입 → 활성 + 버튼 존재 (479ms)
  ✓  R2 닉네임 영숫자 · 3PIM 은 클라이언트 regex 로 거절 (847ms)

  10 passed (6.2s)
```

### 스크린샷 (로컬)
- `04e-pos-settings-customer-display-tab.png` — CD탭 클릭 후 버튼 확인
- `04f-pos-settings-customer-display-url.png` — `?tab=customer-display` 직접 진입

### 옮길 후보 목록 (손님화면 설정 항목 — 이번 범위 아님)
현재 `/pos-settings/customer-display` 페이지에 있는 항목 중 Customer Display 탭으로 통합 후보:
1. `color_theme_key` — ThemeGrid 20종 테마 선택
2. `store_image_url` / `store_image_file_id` — 매장 이미지
3. 타이머 설정: `receipt_display_sec`, `keypad_timeout_sec`, `done_to_idle_sec`, `post_pay_link_grace_sec`
4. Event schedule — EventCalendar (일정 등록)
5. Live preview (PreviewPanel) — 탭 내부에 임베드 가능

### 변경 파일
- `apps/commerce-core/src/admin/routes/pos-settings/page.tsx`
- `apps/commerce-core/e2e/admin/admin-smoke.spec.ts`
