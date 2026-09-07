/*
 * Self-hosted font faces. No runtime Google Fonts request; see
 * docs/decisions.md, "Self-hosted fonts supersede the runtime Google
 * Fonts import".
 *
 * `standard.css` is fontsource's combined-axis file: for Bricolage
 * Grotesque it carries both wght and wdth as live variable axes (the
 * `wght.css`/`wdth.css` entry points each pin the other axis), which the
 * type scale needs since it varies font-weight and font-stretch together.
 * Newsreader's `standard.css` combines wght and opsz the same way.
 */
import '@fontsource-variable/bricolage-grotesque/standard.css';
import '@fontsource-variable/newsreader/standard.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/ibm-plex-mono/600.css';
