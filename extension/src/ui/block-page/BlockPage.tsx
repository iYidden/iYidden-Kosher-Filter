/**
 * Placeholder block-page component.
 *
 * Reads the `category` query parameter that DNR set when redirecting here.
 * The real implementation will use this to choose between hard-block UI,
 * soft-block (cooldown + reason) UI, and unknown-classification UI.
 *
 * Design work is deferred — when we get to it, run through the
 * frontend-design skill for the visual direction. The block page is the
 * single most-seen surface of the whole filter; it deserves a dedicated
 * design pass.
 */

export function BlockPage() {
  const params = new URLSearchParams(window.location.search);
  const category = params.get('category') ?? 'Unknown';

  return (
    <main>
      <h1>Blocked</h1>
      <p>
        Category: <code>{category}</code>
      </p>
      <p>
        <em>Placeholder block page — UI to be designed.</em>
      </p>
    </main>
  );
}
