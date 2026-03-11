/**
 * Repair Parts — Unit Tests: domainTrust.js
 *
 * Tests the shared domain classification system used across the app
 * including by the parts module for trust tier assignment.
 */
import { describe, it, expect } from 'vitest';
import {
  classifyDomain,
  isOEMDomain,
  isTruckCommunity,
  getTrustTierLabel,
  TRUST_TIERS,
  TRUST_TIER_LABELS,
  SOURCE_CLASSES,
} from '@/utils/domainTrust';

describe('domainTrust — classifyDomain', () => {
  // Tier 1: OEM
  it.each([
    ['https://parts.freightliner.com/product/123', 'Freightliner (Daimler)', 1],
    ['https://www.peterbiltparts.com/catalog', 'Peterbilt', 1],
    ['https://www.kenworth.com/parts', 'Kenworth', 1],
    ['https://www.volvotrucks.us/parts', 'Volvo Trucks', 1],
    ['https://www.macktrucks.com/parts', 'Mack Trucks', 1],
    ['https://parts.cummins.com/egr', 'Cummins', 1],
    ['https://www.bendix.com/product', 'Bendix', 1],
    ['https://www.nhtsa.gov/recalls', 'NHTSA (Recall/Safety)', 1],
  ])('tier 1: %s → %s', (url, label, tier) => {
    const result = classifyDomain(url);
    expect(result.trustTier).toBe(tier);
    expect(result.label).toBe(label);
    expect(result.isKnown).toBe(true);
  });

  // Tier 2: Authorized Dealers
  it.each([
    ['https://www.fleetpride.com/part/abc', 'FleetPride', 2],
    ['https://www.truckpro.com/product', 'TruckPro', 2],
    ['https://www.finditparts.com/item', 'FinditParts', 2],
  ])('tier 2: %s → %s', (url, label, tier) => {
    const result = classifyDomain(url);
    expect(result.trustTier).toBe(tier);
    expect(result.label).toBe(label);
  });

  // Tier 3: Aftermarket / Community
  it.each([
    ['https://www.rockauto.com/catalog', 'RockAuto', 3],
    ['https://www.thetruckersreport.com/thread/123', 'TruckersReport', 3],
    ['https://mechanics.stackexchange.com/q/456', 'Mechanics SE', 3],
  ])('tier 3: %s → %s', (url, label, tier) => {
    const result = classifyDomain(url);
    expect(result.trustTier).toBe(tier);
    expect(result.label).toBe(label);
  });

  // Tier 4: Marketplace
  it.each([
    ['https://www.ebay.com/itm/123', 'eBay', 4],
    ['https://www.amazon.com/dp/B001', 'Amazon', 4],
  ])('tier 4: %s → %s', (url, label, tier) => {
    const result = classifyDomain(url);
    expect(result.trustTier).toBe(tier);
    expect(result.label).toBe(label);
  });

  it('returns tier 4 for unknown domains', () => {
    const result = classifyDomain('https://www.unknownparts.shop/item');
    expect(result.trustTier).toBe(4);
    expect(result.isKnown).toBe(false);
  });

  it('handles null/empty input', () => {
    expect(classifyDomain(null).trustTier).toBe(4);
    expect(classifyDomain('').trustTier).toBe(4);
    expect(classifyDomain(undefined).trustTier).toBe(4);
  });

  it('matches case-insensitively', () => {
    const result = classifyDomain('https://WWW.FLEETPRIDE.COM/part');
    expect(result.trustTier).toBe(2);
  });
});

describe('domainTrust — isOEMDomain', () => {
  it('true for OEM domains', () => {
    expect(isOEMDomain('https://parts.cummins.com/x')).toBe(true);
    expect(isOEMDomain('https://www.kenworth.com/x')).toBe(true);
  });

  it('false for non-OEM', () => {
    expect(isOEMDomain('https://www.ebay.com/x')).toBe(false);
    expect(isOEMDomain('https://www.fleetpride.com/x')).toBe(false);
  });
});

describe('domainTrust — isTruckCommunity', () => {
  it('true for truck forums', () => {
    expect(isTruckCommunity('https://www.thetruckersreport.com/x')).toBe(true);
    expect(isTruckCommunity('https://mechanics.stackexchange.com/x')).toBe(true);
  });

  it('false for vendors', () => {
    expect(isTruckCommunity('https://www.ebay.com/x')).toBe(false);
  });
});

describe('domainTrust — getTrustTierLabel', () => {
  it('returns labels for all tiers', () => {
    expect(getTrustTierLabel(1)).toContain('Official');
    expect(getTrustTierLabel(2)).toContain('Authorized');
    expect(getTrustTierLabel(3)).toContain('Community');
    expect(getTrustTierLabel(4)).toContain('Marketplace');
  });

  it('returns Unknown for invalid tier', () => {
    expect(getTrustTierLabel(99)).toBe('Unknown');
  });
});

describe('domainTrust — constants', () => {
  it('TRUST_TIERS has all 4 tiers', () => {
    expect(TRUST_TIERS.VERIFIED_OFFICIAL).toBe(1);
    expect(TRUST_TIERS.AUTHORIZED).toBe(2);
    expect(TRUST_TIERS.COMMUNITY).toBe(3);
    expect(TRUST_TIERS.GENERAL).toBe(4);
  });

  it('SOURCE_CLASSES has expected values', () => {
    expect(SOURCE_CLASSES.OEM_MANUFACTURER).toBe('oem_manufacturer');
    expect(SOURCE_CLASSES.MARKETPLACE).toBe('marketplace');
    expect(SOURCE_CLASSES.TRUCK_FORUM).toBe('truck_forum');
  });
});
