/** Page footer actions: layout, not content. Both work without JavaScript. */
import { editUrl, feedbackUrl, type Page } from '../lib/site';

export function PageActions({ page }: { page: Page }) {
  return (
    <div className="page-actions">
      <a href={editUrl(page.file)}>Edit this page</a>
      <div className="feedback">
        <span id="feedback-label">Was this page helpful?</span>
        <a href={feedbackUrl(page, true)} aria-describedby="feedback-label">
          Yes
        </a>
        <a href={feedbackUrl(page, false)} aria-describedby="feedback-label">
          No
        </a>
      </div>
    </div>
  );
}
