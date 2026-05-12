/**
 * Settings popup entry point.
 *
 * Phase 1.4 will build the real settings UI:
 *   - Category DB browser (filter by category, edit, delete).
 *   - Override log viewer.
 *   - "Rebuild DNR rules" button (already wired in the service worker).
 *   - Export/import JSON for the category DB.
 */

import { render } from 'preact';

function Settings() {
  return (
    <main style={{ minWidth: 320, padding: 16, fontFamily: 'sans-serif' }}>
      <h1>Jewish Filter</h1>
      <p>
        <em>Settings UI placeholder.</em>
      </p>
    </main>
  );
}

const root = document.getElementById('root');
if (root) render(<Settings />, root);
