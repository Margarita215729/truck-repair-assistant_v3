/**
 * AdminDashboard — Integration tests
 *
 * Covers: tab rendering, Business Metrics inputs, User Activity table,
 * businessMetrics memoised computation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// ─── Mocks ────────────────────────────────────────────────────────────

// Recharts: skip SVG rendering
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  BarChart: ({ children }) => <div>{children}</div>,
  LineChart: ({ children }) => <div>{children}</div>,
  Bar: () => null,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// Stub out heavy UI primitives to simple HTML
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }) => <div className={className}>{children}</div>,
}));
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));
vi.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder, type, className }) => (
    <input value={value} onChange={onChange} placeholder={placeholder} type={type} className={className} />
  ),
}));
vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }) => <div className={className} />,
}));
vi.mock('@/components/ui/select', () => ({
  Select: ({ children }) => <div>{children}</div>,
  SelectContent: ({ children }) => <div>{children}</div>,
  SelectItem: ({ value, children }) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }) => <div>{children}</div>,
  SelectValue: () => null,
}));

// Language: t(key) → key
vi.mock('@/lib/LanguageContext', () => ({
  useLanguage: () => ({ t: (key) => key }),
}));

// TanStack Query — provide an injectable mock per test
let queryMocks = {};

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: ({ queryKey }) => {
      const key = Array.isArray(queryKey) ? queryKey[0] : queryKey;
      return queryMocks[key] ?? { data: undefined, isLoading: false, isFetching: false };
    },
    useMutation: () => ({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
      isError: false,
    }),
    useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  };
});

vi.mock('@/services/marketingService', () => ({
  marketingService: {
    getRecentEvents: vi.fn().mockResolvedValue([]),
    getSubscriptionStats: vi.fn().mockResolvedValue({ paying: 0, trialing: 0, free_plan: 0, canceled: 0, past_due: 0 }),
    getUserActivitySummary: vi.fn().mockResolvedValue([]),
    getUserEvents: vi.fn().mockResolvedValue([]),
    listStrategies: vi.fn().mockResolvedValue([]),
    listSegments: vi.fn().mockResolvedValue([]),
    listCampaigns: vi.fn().mockResolvedValue([]),
    listExperiments: vi.fn().mockResolvedValue([]),
    listAlerts: vi.fn().mockResolvedValue([]),
    createStrategy: vi.fn().mockResolvedValue({}),
    createSegment: vi.fn().mockResolvedValue({}),
    createCampaign: vi.fn().mockResolvedValue({}),
    createExperiment: vi.fn().mockResolvedValue({}),
    createAlert: vi.fn().mockResolvedValue({}),
  },
}));

const AdminDashboard = (await import('@/pages/AdminDashboard')).default;

// ─── Helpers ─────────────────────────────────────────────────────────

function setup(mockOverrides = {}) {
  queryMocks = {
    'marketing-events-recent': { data: [], isLoading: false },
    'subscription-stats': { data: { paying: 10, trialing: 5, free_plan: 20, canceled: 2, past_due: 0 }, isLoading: false },
    'user-activity-summary': {
      data: [
        { user_id: 'uid-1', email: 'alice@example.com', event_count: 42, last_active: '2025-01-15T10:00:00Z' },
        { user_id: 'uid-2', email: null, event_count: 3, last_active: null },
      ],
      isLoading: false,
    },
    'marketing-strategies': { data: [], isLoading: false },
    'marketing-segments': { data: [], isLoading: false },
    'marketing-campaigns': { data: [], isLoading: false },
    'marketing-experiments': { data: [], isLoading: false },
    'marketing-alerts': { data: [], isLoading: false },
    ...mockOverrides,
  };
  return render(<AdminDashboard />);
}

function clickTab(label) {
  const btn = screen.getByText(label);
  fireEvent.click(btn);
}

// ─── Tests ────────────────────────────────────────────────────────────

describe('AdminDashboard', () => {
  beforeEach(() => {
    queryMocks = {};
  });

  describe('Overview tab', () => {
    it('renders tab buttons and overview metrics on mount', () => {
      setup();
      // DAU/WAU/MAU metric keys should appear
      expect(screen.getByText('admin.metrics.wau')).toBeTruthy();
      expect(screen.getByText('admin.metrics.mau')).toBeTruthy();
    });

    it('tab buttons are all rendered', () => {
      setup();
      [
        'admin.tabs.overview',
        'admin.tabs.metrics',
        'admin.tabs.users',
        'admin.tabs.strategies',
        'admin.tabs.segments',
        'admin.tabs.campaigns',
        'admin.tabs.experiments',
        'admin.tabs.alerts',
      ].forEach((key) => {
        expect(screen.getByText(key)).toBeTruthy();
      });
    });
  });

  describe('Business Metrics tab', () => {
    it('switches to the metrics tab on click', () => {
      setup();
      clickTab('admin.tabs.metrics');
      expect(screen.getByText('admin.bizMetrics.inputsTitle')).toBeTruthy();
    });

    it('renders all 3 inputs', () => {
      setup();
      clickTab('admin.tabs.metrics');
      expect(screen.getByText('admin.bizMetrics.marketingSpend')).toBeTruthy();
      expect(screen.getByText('admin.bizMetrics.monthlyPrice')).toBeTruthy();
      expect(screen.getByText('admin.bizMetrics.infraCost')).toBeTruthy();
    });

    it('shows subscription count cards', () => {
      setup();
      clickTab('admin.tabs.metrics');
      expect(screen.getByText('admin.bizMetrics.payingUsers')).toBeTruthy();
      expect(screen.getByText('admin.bizMetrics.trialingUsers')).toBeTruthy();
      expect(screen.getByText('admin.bizMetrics.canceledUsers')).toBeTruthy();
    });

    it('shows paying user count from subStats', () => {
      setup();
      clickTab('admin.tabs.metrics');
      // subStats.paying = 10 → displayed somewhere as "10"
      const cells = screen.getAllByText('10');
      expect(cells.length).toBeGreaterThan(0);
    });

    it('MRR card is rendered', () => {
      setup();
      clickTab('admin.tabs.metrics');
      expect(screen.getByText('admin.bizMetrics.mrrLabel')).toBeTruthy();
    });

    it('updates MRR when monthly price input changes', () => {
      setup();
      clickTab('admin.tabs.metrics');
      // Find the monthlyPrice input by placeholder
      const inputs = screen.getAllByPlaceholderText('0');
      // second input is monthlyPrice
      fireEvent.change(inputs[1], { target: { value: '50' } });
      // paying=10, price=50 → MRR should show $500 (may appear in multiple cards)
      const mrrElements = screen.getAllByText('$500');
      expect(mrrElements.length).toBeGreaterThan(0);
    });
  });

  describe('User Activity tab', () => {
    it('switches to the users tab on click', () => {
      setup();
      clickTab('admin.tabs.users');
      expect(screen.getByText('admin.userActivity.listTitle')).toBeTruthy();
    });

    it('renders user rows with email and event count', () => {
      setup();
      clickTab('admin.tabs.users');
      expect(screen.getByText('alice@example.com')).toBeTruthy();
      expect(screen.getByText('42')).toBeTruthy();
    });

    it('renders fallback for user without email', () => {
      setup();
      clickTab('admin.tabs.users');
      expect(screen.getByText('uid-2…')).toBeTruthy();
    });

    it('shows empty message when no users', () => {
      setup({ 'user-activity-summary': { data: [], isLoading: false } });
      clickTab('admin.tabs.users');
      expect(screen.getByText('admin.userActivity.empty')).toBeTruthy();
    });

    it('shows timeline prompt until a user is selected', () => {
      setup();
      clickTab('admin.tabs.users');
      // selectPrompt appears in h3 (no user selected) AND in the paragraph fallback — both are correct
      const prompts = screen.getAllByText('admin.userActivity.selectPrompt');
      expect(prompts.length).toBeGreaterThan(0);
    });

    it('selects a user on row click and updates timeline header', () => {
      queryMocks = {
        'marketing-events-recent': { data: [], isLoading: false },
        'subscription-stats': { data: { paying: 0, trialing: 0, free_plan: 0, canceled: 0, past_due: 0 }, isLoading: false },
        'user-activity-summary': {
          data: [{ user_id: 'uid-1', email: 'alice@example.com', event_count: 5, last_active: null }],
          isLoading: false,
        },
        'user-events': { data: [], isFetching: false },
        'marketing-strategies': { data: [], isLoading: false },
        'marketing-segments': { data: [], isLoading: false },
        'marketing-campaigns': { data: [], isLoading: false },
        'marketing-experiments': { data: [], isLoading: false },
        'marketing-alerts': { data: [], isLoading: false },
      };
      render(<AdminDashboard />);
      clickTab('admin.tabs.users');

      const row = screen.getByText('alice@example.com').closest('tr');
      fireEvent.click(row);

      // Timeline header shows user email after selection
      expect(screen.getAllByText(/alice@example\.com/).length).toBeGreaterThan(0);
    });
  });

  describe('businessMetrics computation', () => {
    it('computes MRR = paying * monthlyPrice', () => {
      // paying=10, price input = 30 → MRR = $300
      setup();
      clickTab('admin.tabs.metrics');
      const inputs = screen.getAllByPlaceholderText('0');
      fireEvent.change(inputs[1], { target: { value: '30' } });
      const matches = screen.getAllByText('$300');
      expect(matches.length).toBeGreaterThan(0);
    });

    it('CAC is 0 when marketing spend is empty', () => {
      setup();
      clickTab('admin.tabs.metrics');
      // No spend entered → CAC = 0 → $0.00 may appear multiple times (CAC, LTV, etc.)
      const matches = screen.getAllByText('$0.00');
      expect(matches.length).toBeGreaterThan(0);
    });
  });
});
