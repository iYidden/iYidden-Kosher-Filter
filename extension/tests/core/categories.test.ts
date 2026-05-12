/**
 * Tests for category policy. These lock in the locked-in principles
 * from PLAN.md §10 — if anyone changes the policy by accident, these fail.
 */

import { describe, expect, it } from 'vitest';
import { CATEGORY, CATEGORY_POLICY, policyFor } from '../../src/core/categories';

describe('CATEGORY_POLICY (locked-in decisions from PLAN.md §10)', () => {
  it('marks all hard-block categories correctly', () => {
    expect(CATEGORY_POLICY.Adult).toBe('hard_block');
    expect(CATEGORY_POLICY.Antisemitism).toBe('hard_block');
    expect(CATEGORY_POLICY.AvodahZarah).toBe('hard_block');
    expect(CATEGORY_POLICY.AntiChassidus).toBe('hard_block');
    expect(CATEGORY_POLICY.Kefirah).toBe('hard_block');
    // CompanionAI is hard-blocked per the "Chassidim know what is real" principle.
    expect(CATEGORY_POLICY.CompanionAI).toBe('hard_block');
  });

  it('allows productivity AI but not companion AI', () => {
    expect(CATEGORY_POLICY.ProductivityAI).toBe('allow');
    expect(CATEGORY_POLICY.CompanionAI).toBe('hard_block');
  });

  it('soft-blocks lifestyle, opinion, secular news, social forums, entertainment', () => {
    expect(CATEGORY_POLICY.Lifestyle).toBe('soft_block');
    expect(CATEGORY_POLICY.Opinion).toBe('soft_block');
    expect(CATEGORY_POLICY.SecularIsraeliNews).toBe('soft_block');
    expect(CATEGORY_POLICY.GoyisheNews).toBe('soft_block');
    expect(CATEGORY_POLICY.SocialForum).toBe('soft_block');
    expect(CATEGORY_POLICY.Entertainment).toBe('soft_block');
  });

  it('allows technical, jewish, utility', () => {
    expect(CATEGORY_POLICY.Technical).toBe('allow');
    expect(CATEGORY_POLICY.Jewish).toBe('allow');
    expect(CATEGORY_POLICY.Utility).toBe('allow');
  });

  it('treats unknown as classify, not as silent allow', () => {
    expect(CATEGORY_POLICY.Unknown).toBe('classify');
  });
});

describe('policyFor', () => {
  it('returns the mapped policy for known categories', () => {
    expect(policyFor(CATEGORY.Technical)).toBe('allow');
    expect(policyFor(CATEGORY.Adult)).toBe('hard_block');
    expect(policyFor(CATEGORY.SocialForum)).toBe('soft_block');
  });

  it('fails closed (classify) for unmapped input', () => {
    // @ts-expect-error — intentionally passing a runtime-only invalid value
    expect(policyFor('NotARealCategory')).toBe('classify');
  });
});
