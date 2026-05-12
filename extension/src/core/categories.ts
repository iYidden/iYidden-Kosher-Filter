/**
 * Category taxonomy.
 *
 * Source of truth: PLAN.md §2 (Category Taxonomy).
 *
 * Categories are split into three groups by *policy*, not just by name:
 *   - ALLOW: always pass through.
 *   - SOFT_BLOCK: blocked, but overridable with cooldown + reason log.
 *   - HARD_BLOCK: blocked, no override possible (per the locked-in principles
 *     in PLAN.md §10). The override UI must not present an "allow" button for
 *     these.
 *
 * Categorization is by content PURPOSE, not author identity (PLAN.md §1).
 * A goyishe-written technical blog is `Technical`. A Jewish-written political
 * opinion blog is `Opinion`.
 *
 * Adding a category:
 *   1. Add the literal to `Category`.
 *   2. Add an entry to `CATEGORY_POLICY` (TypeScript will error if you forget).
 *   3. Document the rationale in PLAN.md §2 first, not after.
 */

export const CATEGORY = {
  // ----- ALLOW -----
  Technical: 'Technical',
  Jewish: 'Jewish',
  Utility: 'Utility',
  ProductivityAI: 'ProductivityAI',

  // ----- SOFT_BLOCK (cooldown + reason) -----
  Lifestyle: 'Lifestyle',
  Opinion: 'Opinion',
  SecularIsraeliNews: 'SecularIsraeliNews',
  GoyisheNews: 'GoyisheNews',
  SocialForum: 'SocialForum',
  Entertainment: 'Entertainment',
  LashonHora: 'LashonHora',

  // ----- HARD_BLOCK (no override) -----
  Adult: 'Adult',
  Antisemitism: 'Antisemitism',
  AvodahZarah: 'AvodahZarah',
  AntiChassidus: 'AntiChassidus',
  Kefirah: 'Kefirah',
  CompanionAI: 'CompanionAI',

  // ----- META -----
  /** Domain has been seen but not yet classified. Triggers classification flow. */
  Unknown: 'Unknown',
} as const;

export type Category = (typeof CATEGORY)[keyof typeof CATEGORY];

export type PolicyAction = 'allow' | 'soft_block' | 'hard_block' | 'classify';

/**
 * Maps each Category to its enforcement policy.
 *
 * Using a Record<Category, ...> means TypeScript will error if a new category
 * is added without a policy decision — there is no silent default.
 */
export const CATEGORY_POLICY: Record<Category, PolicyAction> = {
  // ALLOW
  Technical: 'allow',
  Jewish: 'allow',
  Utility: 'allow',
  ProductivityAI: 'allow',

  // SOFT_BLOCK
  Lifestyle: 'soft_block',
  Opinion: 'soft_block',
  SecularIsraeliNews: 'soft_block',
  GoyisheNews: 'soft_block',
  SocialForum: 'soft_block',
  Entertainment: 'soft_block',
  LashonHora: 'soft_block',

  // HARD_BLOCK
  Adult: 'hard_block',
  Antisemitism: 'hard_block',
  AvodahZarah: 'hard_block',
  AntiChassidus: 'hard_block',
  Kefirah: 'hard_block',
  CompanionAI: 'hard_block',

  // META
  Unknown: 'classify',
};

/**
 * Cooldown duration (ms) before a soft-block override can be confirmed.
 * Breaks impulse-click cycle per PLAN.md §4.
 *
 * Per-category override is intentionally not exposed yet — one cooldown
 * value keeps the UX predictable. Revisit if data suggests otherwise.
 */
export const SOFT_BLOCK_COOLDOWN_MS = 60_000;

/**
 * Returns the policy for a category, with a clear failure mode for
 * unmapped inputs. Should be impossible to hit thanks to the Record typing,
 * but defends against runtime data (e.g. a category string read from
 * IndexedDB after a schema migration gap).
 */
export function policyFor(category: Category): PolicyAction {
  const policy = CATEGORY_POLICY[category];
  if (policy === undefined) {
    // Fail closed: unknown category data is treated as needing classification,
    // never as silently allowed.
    return 'classify';
  }
  return policy;
}
