/**
 * Repair Parts — Component Tests: PartCard.jsx
 *
 * Tests rendering in both "recommended" and "vendor" variants,
 * badge display, delete button, find-prices interaction.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// ─── Mock framer-motion (avoid animation issues in tests) ────────────
vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }, ref) => {
      // Strip motion-specific props
      const { whileHover, transition, initial, animate, exit, ...htmlProps } = props;
      return <div ref={ref} {...htmlProps}>{children}</div>;
    }),
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

// Mock vendorService
vi.mock('@/services/vendorService', () => ({
  searchVendorsForPart: vi.fn(),
  aggregateListings: vi.fn((r) => r?.listings || []),
  SOURCE_TIER_LABELS: { 1: 'OEM', 2: 'Dealer', 3: 'Aftermarket', 4: 'Marketplace' },
}));

const { searchVendorsForPart } = await import('@/services/vendorService');

const PartCard = (await import('@/components/parts/PartCard')).default;

// ─── Fixtures ────────────────────────────────────────────────────────

const recommendedPart = {
  id: 'rec-1',
  name: 'EGR Valve',
  part_number: 'CUM-4352857',
  oem_part_number: 'CUM-4352857',
  description: 'Exhaust gas recirculation valve',
  category: 'exhaust',
  importance: 'required',
  installation_difficulty: 'moderate',
  urgency: 'critical',
  driveability: 'do_not_drive',
  action_type: 'replace',
  roadside_possible: false,
  shop_required: true,
  programming_required: true,
  compatible_makes: ['Freightliner', 'Peterbilt'],
  related_error_codes: ['P2425', 'P0401'],
  pair_with_parts: ['EGR Cooler', 'EGR Pipe'],
  bundle_label: 'EGR Kit',
};

const vendorListing = {
  title: 'EGR Valve — Cummins OEM',
  price: 345.99,
  vendor: 'FleetPride',
  condition: 'New',
  availability: 'In Stock',
  partNumber: 'CUM-4352857',
  imageUrl: 'https://img.example.com/egr.jpg',
  itemUrl: 'https://www.fleetpride.com/egr-valve',
  sourceTier: 2,
  sourceType: 'cse_ai',
};

// ─── Tests: Recommended variant ──────────────────────────────────────

describe('PartCard — recommended variant', () => {
  it('renders part name and part number', () => {
    render(<PartCard part={recommendedPart} variant="recommended" />);
    expect(screen.getByText('EGR Valve')).toBeInTheDocument();
    expect(screen.getByText('CUM-4352857')).toBeInTheDocument();
  });

  it('renders category icon area', () => {
    const { container } = render(<PartCard part={recommendedPart} variant="recommended" />);
    // Exhaust category icon 💨 should appear
    expect(container.textContent).toContain('💨');
  });

  it('renders urgency badge for critical', () => {
    render(<PartCard part={recommendedPart} variant="recommended" />);
    expect(screen.getByText('critical')).toBeInTheDocument();
  });

  it('renders driveability badge', () => {
    render(<PartCard part={recommendedPart} variant="recommended" />);
    expect(screen.getByText('do not drive')).toBeInTheDocument();
  });

  it('renders difficulty badge', () => {
    render(<PartCard part={recommendedPart} variant="recommended" />);
    expect(screen.getByText('moderate')).toBeInTheDocument();
  });

  it('renders importance badge for "required"', () => {
    render(<PartCard part={recommendedPart} variant="recommended" />);
    expect(screen.getByText('required')).toBeInTheDocument();
  });

  it('renders roadside/shop/programming badges', () => {
    render(<PartCard part={recommendedPart} variant="recommended" />);
    expect(screen.getByText('Shop Required')).toBeInTheDocument();
    expect(screen.getByText('Needs Programming')).toBeInTheDocument();
  });

  it('renders error codes', () => {
    render(<PartCard part={recommendedPart} variant="recommended" />);
    expect(screen.getByText('P2425')).toBeInTheDocument();
    expect(screen.getByText('P0401')).toBeInTheDocument();
  });

  it('renders compatible makes', () => {
    render(<PartCard part={recommendedPart} variant="recommended" />);
    expect(screen.getByText(/Freightliner/)).toBeInTheDocument();
  });

  it('renders paired parts', () => {
    render(<PartCard part={recommendedPart} variant="recommended" />);
    expect(screen.getByText(/EGR Cooler/)).toBeInTheDocument();
    expect(screen.getByText(/EGR Kit/)).toBeInTheDocument();
  });

  it('shows "Search External Sources" button', () => {
    render(<PartCard part={recommendedPart} variant="recommended" />);
    expect(screen.getByText('Search External Sources')).toBeInTheDocument();
  });

  it('calls onClick when card clicked', () => {
    const onClick = vi.fn();
    render(<PartCard part={recommendedPart} variant="recommended" onClick={onClick} />);
    fireEvent.click(screen.getByText('EGR Valve'));
    expect(onClick).toHaveBeenCalled();
  });

  it('renders delete button and calls onDelete', () => {
    const onDelete = vi.fn();
    render(<PartCard part={recommendedPart} variant="recommended" onDelete={onDelete} />);
    // Find the delete button (Trash2 icon button)
    const deleteBtn = document.querySelector('button.hover\\:bg-red-500\\/20') ||
                      screen.getByRole('button', { name: '' });
    // Click the button with stopPropagation
    fireEvent.click(deleteBtn);
    expect(onDelete).toHaveBeenCalled();
  });

  it('hides urgency badge when urgency is low', () => {
    const part = { ...recommendedPart, urgency: 'low' };
    render(<PartCard part={part} variant="recommended" />);
    expect(screen.queryByText('low')).not.toBeInTheDocument();
  });

  it('hides driveability badge when safe_to_drive', () => {
    const part = { ...recommendedPart, driveability: 'safe_to_drive' };
    render(<PartCard part={part} variant="recommended" />);
    expect(screen.queryByText('safe to drive')).not.toBeInTheDocument();
  });
});

// ─── Tests: Vendor variant ───────────────────────────────────────────

describe('PartCard — vendor variant', () => {
  it('renders title, vendor, price', () => {
    render(<PartCard part={vendorListing} variant="vendor" />);
    expect(screen.getByText('EGR Valve — Cummins OEM')).toBeInTheDocument();
    expect(screen.getByText('FleetPride')).toBeInTheDocument();
    expect(screen.getByText('$345.99')).toBeInTheDocument();
  });

  it('shows "See listing" when price is 0', () => {
    render(<PartCard part={{ ...vendorListing, price: 0 }} variant="vendor" />);
    expect(screen.getByText('See listing')).toBeInTheDocument();
  });

  it('renders image when imageUrl provided', () => {
    render(<PartCard part={vendorListing} variant="vendor" />);
    const img = screen.getByAltText('EGR Valve — Cummins OEM');
    expect(img).toBeInTheDocument();
    expect(img.src).toContain('egr.jpg');
  });

  it('renders tier badge', () => {
    render(<PartCard part={vendorListing} variant="vendor" />);
    expect(screen.getByText('T2')).toBeInTheDocument();
  });

  it('renders condition badge', () => {
    render(<PartCard part={vendorListing} variant="vendor" />);
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('renders external link to vendor', () => {
    render(<PartCard part={vendorListing} variant="vendor" />);
    const link = screen.getByText(/View on FleetPride/);
    expect(link.closest('a')).toHaveAttribute('href', 'https://www.fleetpride.com/egr-valve');
    expect(link.closest('a')).toHaveAttribute('target', '_blank');
    expect(link.closest('a')).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('shows checkbox in compare mode', () => {
    render(<PartCard part={vendorListing} variant="vendor" compareMode isSelected={false} />);
    // Checkbox rendered by Radix
    expect(document.querySelector('[role="checkbox"]')).toBeInTheDocument();
  });

  it('shows selected ring when isSelected', () => {
    const { container } = render(
      <PartCard part={vendorListing} variant="vendor" compareMode isSelected />
    );
    // The card should have ring-2 class
    const card = container.querySelector('.ring-2');
    expect(card).toBeInTheDocument();
  });
});

// ─── Tests: Find Prices interaction ──────────────────────────────────

describe('PartCard — Find Prices flow', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches vendor prices on button click', async () => {
    searchVendorsForPart.mockResolvedValue({
      listings: [
        { title: 'Listed Part', price: 199, vendor: 'eBay', itemUrl: 'https://ebay.com/1', sourceTier: 4 },
      ],
    });

    render(<PartCard part={recommendedPart} variant="recommended" />);

    fireEvent.click(screen.getByText('Search External Sources'));

    // Should show loading
    await waitFor(() => {
      expect(searchVendorsForPart).toHaveBeenCalledWith(recommendedPart);
    });
  });

  it('handles search error gracefully', async () => {
    searchVendorsForPart.mockRejectedValue(new Error('API down'));

    render(<PartCard part={recommendedPart} variant="recommended" />);
    fireEvent.click(screen.getByText('Search External Sources'));

    await waitFor(() => {
      expect(searchVendorsForPart).toHaveBeenCalled();
    });
    // Should not crash — component handles error internally
  });
});
