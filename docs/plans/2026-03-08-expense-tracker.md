# Expense Tracker Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a complete, modern expense tracking web app with dashboard analytics, CRUD operations, filtering, and CSV export.

**Architecture:** Next.js 14 App Router with client components for interactivity. Custom `useExpenses` hook wrapping localStorage for persistence. Recharts for dashboard visualizations. Three main pages: Dashboard (/), Expenses (/expenses), Add/Edit Expense (/expenses/add, /expenses/[id]/edit).

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Recharts, React hooks, localStorage

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`, `next.config.ts`
- Create: `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`

**Step 1: Initialize Next.js project**

Run: `npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm`

**Step 2: Install dependencies**

Run: `npm install recharts date-fns uuid && npm install -D @types/uuid`

**Step 3: Verify project runs**

Run: `npm run dev` (verify no errors, then stop)

**Step 4: Commit**

```bash
git init && git add -A && git commit -m "chore: scaffold Next.js 14 project with dependencies"
```

---

### Task 2: Type Definitions & Constants

**Files:**
- Create: `src/types/expense.ts`
- Create: `src/lib/constants.ts`

**Step 1: Create expense types**

```typescript
// src/types/expense.ts
export type Category = 'Food' | 'Transportation' | 'Entertainment' | 'Shopping' | 'Bills' | 'Other';

export interface Expense {
  id: string;
  amount: number;
  category: Category;
  description: string;
  date: string; // ISO date string YYYY-MM-DD
  createdAt: string; // ISO datetime
}

export interface ExpenseFilters {
  search: string;
  category: Category | 'All';
  dateFrom: string;
  dateTo: string;
}
```

**Step 2: Create constants**

```typescript
// src/lib/constants.ts
import { Category } from '@/types/expense';

export const CATEGORIES: Category[] = ['Food', 'Transportation', 'Entertainment', 'Shopping', 'Bills', 'Other'];

export const CATEGORY_COLORS: Record<Category, string> = {
  Food: '#ef4444',
  Transportation: '#3b82f6',
  Entertainment: '#8b5cf6',
  Shopping: '#f59e0b',
  Bills: '#10b981',
  Other: '#6b7280',
};

export const CATEGORY_ICONS: Record<Category, string> = {
  Food: '🍔',
  Transportation: '🚗',
  Entertainment: '🎬',
  Shopping: '🛍️',
  Bills: '📄',
  Other: '📌',
};

export const STORAGE_KEY = 'expense-tracker-data';
```

**Step 3: Commit**

```bash
git add src/types src/lib && git commit -m "feat: add type definitions and constants"
```

---

### Task 3: useExpenses Custom Hook (Core State Management)

**Files:**
- Create: `src/hooks/useExpenses.ts`
- Create: `src/lib/storage.ts`

**Step 1: Create localStorage utilities**

```typescript
// src/lib/storage.ts
import { Expense } from '@/types/expense';
import { STORAGE_KEY } from './constants';

export function loadExpenses(): Expense[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = window.localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveExpenses(expenses: Expense[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}
```

**Step 2: Create useExpenses hook**

The hook provides: expenses, addExpense, updateExpense, deleteExpense, getExpense, getFilteredExpenses, getSummary.

**Step 3: Commit**

```bash
git add src/hooks src/lib/storage.ts && git commit -m "feat: add useExpenses hook with localStorage persistence"
```

---

### Task 4: Shared Layout & Navigation

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`
- Create: `src/components/layout/Sidebar.tsx`
- Create: `src/components/layout/MobileNav.tsx`

**Step 1: Set up globals.css with Tailwind and custom styles**

**Step 2: Create Sidebar component (desktop nav)**

Links: Dashboard (/), Expenses (/expenses), Add Expense (/expenses/add). Active state highlighting using usePathname().

**Step 3: Create MobileNav component (bottom nav bar)**

Same links, shown only on mobile (md:hidden), fixed to bottom.

**Step 4: Update layout.tsx**

Root layout with sidebar on left (hidden on mobile), main content area, mobile nav at bottom.

**Step 5: Verify layout renders**

Run: `npm run dev` — check desktop shows sidebar, mobile shows bottom nav.

**Step 6: Commit**

```bash
git add src/app src/components && git commit -m "feat: add responsive layout with sidebar and mobile nav"
```

---

### Task 5: Expense Form Component

**Files:**
- Create: `src/components/expenses/ExpenseForm.tsx`

**Step 1: Build ExpenseForm**

Props: `onSubmit(data)`, optional `initialData` for edit mode. Fields: amount (number input with currency formatting), category (select), description (text), date (date input). Client-side validation: amount > 0, description required, date required. Visual error states on invalid fields. Submit button with loading state.

**Step 2: Commit**

```bash
git add src/components/expenses && git commit -m "feat: add ExpenseForm component with validation"
```

---

### Task 6: Add Expense Page

**Files:**
- Create: `src/app/expenses/add/page.tsx`

**Step 1: Create add expense page**

Uses ExpenseForm, calls addExpense from useExpenses, redirects to /expenses on success with a toast/notification.

**Step 2: Commit**

```bash
git add src/app/expenses && git commit -m "feat: add expense creation page"
```

---

### Task 7: Expense List & Expenses Page

**Files:**
- Create: `src/components/expenses/ExpenseList.tsx`
- Create: `src/components/expenses/FilterBar.tsx`
- Create: `src/components/expenses/ExpenseRow.tsx`
- Create: `src/app/expenses/page.tsx`

**Step 1: Create FilterBar**

Search input, category dropdown (All + each category), date from/to inputs. Emits filter changes via callback.

**Step 2: Create ExpenseRow**

Single expense display with category icon/color, formatted amount, date, description. Edit and Delete action buttons.

**Step 3: Create ExpenseList**

Maps filtered expenses to ExpenseRow components. Empty state when no expenses. Sorted by date descending.

**Step 4: Create Expenses page**

Combines FilterBar + ExpenseList. Delete confirmation modal. Links edit button to /expenses/[id]/edit.

**Step 5: Commit**

```bash
git add src/components/expenses src/app/expenses && git commit -m "feat: add expenses list page with filtering"
```

---

### Task 8: Edit Expense Page

**Files:**
- Create: `src/app/expenses/[id]/edit/page.tsx`

**Step 1: Create edit page**

Loads expense by ID from useExpenses, pre-fills ExpenseForm, calls updateExpense on submit, redirects back to /expenses. Shows 404 state if expense not found.

**Step 2: Commit**

```bash
git add src/app/expenses && git commit -m "feat: add expense editing page"
```

---

### Task 9: Dashboard Summary Cards

**Files:**
- Create: `src/components/dashboard/SummaryCards.tsx`

**Step 1: Create SummaryCards**

Four cards: Total Spending (all time), This Month, Daily Average (this month), Top Category. Each card with icon, label, formatted currency value. Responsive grid: 2 cols mobile, 4 cols desktop.

**Step 2: Commit**

```bash
git add src/components/dashboard && git commit -m "feat: add dashboard summary cards"
```

---

### Task 10: Dashboard Charts

**Files:**
- Create: `src/components/dashboard/CategoryPieChart.tsx`
- Create: `src/components/dashboard/MonthlyBarChart.tsx`

**Step 1: Create CategoryPieChart**

Recharts PieChart showing spending breakdown by category. Uses CATEGORY_COLORS. Custom tooltip with amount and percentage. Responsive container.

**Step 2: Create MonthlyBarChart**

Recharts BarChart showing spending per month for last 6 months. X-axis: month names, Y-axis: dollar amounts. Tooltip with exact amounts.

**Step 3: Commit**

```bash
git add src/components/dashboard && git commit -m "feat: add dashboard charts with Recharts"
```

---

### Task 11: Dashboard Page (Assemble)

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Build dashboard page**

Assembles SummaryCards + CategoryPieChart + MonthlyBarChart + recent expenses (last 5). "View all" link to /expenses. Empty state when no expenses exist with CTA to add first expense.

**Step 2: Commit**

```bash
git add src/app/page.tsx && git commit -m "feat: assemble dashboard page with all widgets"
```

---

### Task 12: CSV Export

**Files:**
- Create: `src/lib/export.ts`
- Create: `src/components/expenses/ExportButton.tsx`

**Step 1: Create export utility**

Function that takes Expense[] and generates CSV string with headers: Date, Category, Description, Amount. Triggers browser download.

**Step 2: Create ExportButton component**

Button that calls export with current (filtered) expenses.

**Step 3: Add ExportButton to expenses page**

**Step 4: Commit**

```bash
git add src/lib/export.ts src/components/expenses && git commit -m "feat: add CSV export functionality"
```

---

### Task 13: Toast Notification System

**Files:**
- Create: `src/components/ui/Toast.tsx`
- Create: `src/hooks/useToast.ts`

**Step 1: Create toast system**

Simple toast notification for success/error messages. Auto-dismiss after 3 seconds. Positioned top-right. Types: success, error, info.

**Step 2: Integrate toasts into add/edit/delete flows**

**Step 3: Commit**

```bash
git add src/components/ui src/hooks/useToast.ts && git commit -m "feat: add toast notification system"
```

---

### Task 14: Delete Confirmation Modal

**Files:**
- Create: `src/components/ui/Modal.tsx`

**Step 1: Create reusable Modal component**

Overlay + centered content. Close on backdrop click or Escape key. Accessible with focus trap.

**Step 2: Wire into expense delete flow**

**Step 3: Commit**

```bash
git add src/components/ui/Modal.tsx && git commit -m "feat: add delete confirmation modal"
```

---

### Task 15: Polish & Final Integration

**Step 1: Add loading states** — skeleton loaders for dashboard and expense list while localStorage hydrates.

**Step 2: Add empty states** — friendly messages when no expenses exist on each page.

**Step 3: Responsive testing** — verify all pages work on mobile viewport.

**Step 4: Build verification**

Run: `npm run build` — must pass with zero errors.

**Step 5: Final commit**

```bash
git add -A && git commit -m "feat: polish UI with loading states, empty states, responsive fixes"
```

---

## Execution Notes

- Tasks 1-3 are sequential (project setup, types, then hooks)
- Tasks 4-5 can be parallel (layout + form)
- Tasks 6-8 depend on 5 (form) and 3 (hook)
- Tasks 9-10 can be parallel (cards + charts)
- Task 11 depends on 9+10
- Tasks 12-14 are independent enhancements
- Task 15 is final polish
