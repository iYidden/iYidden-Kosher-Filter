/**
 * Tests for the DNR rule generator.
 *
 * These are the most critical pure-function tests in the project: a bug here
 * means either the filter silently lets blocked sites through, or it blocks
 * sites it shouldn't. Both are real harms.
 */

import { describe, expect, it } from 'vitest';
import { generateDnrRules, MAX_DYNAMIC_RULES } from '../../src/core/dnr-rules';
import { CATEGORY } from '../../src/core/categories';
import type { CategoryEntry } from '../../src/core/schema';

const EXT_URL = 'chrome-extension://test/block.html';

function entry(domain: string, category: CategoryEntry['category']): CategoryEntry {
  return {
    domain,
    category,
    source: 'seed',
    timestamp: 0,
    syncVersion: 0,
  };
}

describe('generateDnrRules', () => {
  it('emits no rule for allow categories', () => {
    const { rules, stats } = generateDnrRules(
      [
        entry('github.com', CATEGORY.Technical),
        entry('chabad.org', CATEGORY.Jewish),
        entry('amazon.com', CATEGORY.Utility),
        entry('claude.ai', CATEGORY.ProductivityAI),
      ],
      EXT_URL,
    );
    expect(rules).toHaveLength(0);
    expect(stats.allowed).toBe(4);
    expect(stats.blocked).toBe(0);
  });

  it('emits rules for soft-block categories at priority 1', () => {
    const { rules, stats } = generateDnrRules(
      [entry('reddit.com', CATEGORY.SocialForum)],
      EXT_URL,
    );
    expect(rules).toHaveLength(1);
    const rule = rules[0]!;
    expect(rule.priority).toBe(1);
    expect(rule.action.type).toBe('redirect');
    expect(stats.softBlock).toBe(1);
    expect(stats.hardBlock).toBe(0);
  });

  it('emits rules for hard-block categories at higher priority than soft-block', () => {
    const { rules } = generateDnrRules(
      [
        entry('example-soft.test', CATEGORY.SocialForum),
        entry('example-hard.test', CATEGORY.Adult),
      ],
      EXT_URL,
    );
    const soft = rules.find((r) =>
      JSON.stringify(r.condition.requestDomains).includes('soft'),
    );
    const hard = rules.find((r) =>
      JSON.stringify(r.condition.requestDomains).includes('hard'),
    );
    expect(soft).toBeDefined();
    expect(hard).toBeDefined();
    expect(hard!.priority!).toBeGreaterThan(soft!.priority!);
  });

  it('skips Unknown categories (classification flow handles them, not DNR)', () => {
    const { rules, stats } = generateDnrRules(
      [entry('some-new-site.test', CATEGORY.Unknown)],
      EXT_URL,
    );
    expect(rules).toHaveLength(0);
    expect(stats.unknown).toBe(1);
  });

  it('only redirects main_frame, not sub-resources', () => {
    const { rules } = generateDnrRules(
      [entry('blocked.test', CATEGORY.Entertainment)],
      EXT_URL,
    );
    expect(rules[0]!.condition.resourceTypes).toEqual(['main_frame']);
  });

  it('passes the category through the redirect URL', () => {
    const { rules } = generateDnrRules(
      [entry('blocked.test', CATEGORY.Entertainment)],
      EXT_URL,
    );
    const redirectUrl = (rules[0]!.action.redirect as { url: string }).url;
    expect(redirectUrl).toContain('category=Entertainment');
  });

  it('does NOT include the blocked URL in the redirect (privacy)', () => {
    const { rules } = generateDnrRules(
      [entry('blocked.test', CATEGORY.Entertainment)],
      EXT_URL,
    );
    const redirectUrl = (rules[0]!.action.redirect as { url: string }).url;
    expect(redirectUrl).not.toContain('blocked.test');
  });

  it('produces deterministic rule IDs for the same domain', () => {
    const a = generateDnrRules([entry('youtube.com', CATEGORY.Entertainment)], EXT_URL);
    const b = generateDnrRules([entry('youtube.com', CATEGORY.Entertainment)], EXT_URL);
    expect(a.rules[0]!.id).toBe(b.rules[0]!.id);
  });

  it('produces distinct rule IDs for different domains (collision check on a real batch)', () => {
    const domains = Array.from({ length: 1000 }, (_, i) => `domain-${i}.test`);
    const entries = domains.map((d) => entry(d, CATEGORY.SocialForum));
    const { rules } = generateDnrRules(entries, EXT_URL);
    const ids = new Set(rules.map((r) => r.id));
    // Allow up to a couple of collisions in 1000; FNV-1a should give zero here.
    expect(ids.size).toBeGreaterThanOrEqual(998);
  });

  it('respects MAX_DYNAMIC_RULES and reports truncation', () => {
    const entries = Array.from({ length: MAX_DYNAMIC_RULES + 100 }, (_, i) =>
      entry(`d${i}.test`, CATEGORY.SocialForum),
    );
    const { rules, stats } = generateDnrRules(entries, EXT_URL);
    expect(rules.length).toBeLessThanOrEqual(MAX_DYNAMIC_RULES);
    expect(stats.truncated).toBe(true);
  });
});
