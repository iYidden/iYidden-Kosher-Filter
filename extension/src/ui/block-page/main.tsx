/**
 * Block page entry point.
 *
 * Phase 1.3 will replace this placeholder with the real override UI:
 *   - Different rendering per category policy (hard_block: no override;
 *     soft_block: cooldown timer + reason field; unknown: classification form).
 *   - Reads ?category= from the URL.
 *   - Logs the interaction to the override log via the service worker.
 *
 * This is intentionally a stub so the scaffold compiles and the DNR redirect
 * has somewhere to land.
 */

import { render } from 'preact';
import { BlockPage } from './BlockPage';

const root = document.getElementById('root');
if (root) render(<BlockPage />, root);
