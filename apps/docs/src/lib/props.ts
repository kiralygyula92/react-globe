/**
 * Props the hydrated components receive. Types only: this module is imported by code
 * that runs in the browser, which cannot read the data files the site is built from.
 */

export type { Badge } from '../../../../scripts/docs/model.mjs';

export type Heading = { depth: number; slug: string; text: string };

export type HeaderProps = {
  /** Product name, shown as the brand. */
  name: string;
  repo: string;
  versions: { label: string; href: string }[];
  currentVersion: string;
  /** Where "All versions" goes. */
  versionsHref: string;
};

/** What the browser needs to take over the parts of the page that react to the reader. */
export type PageData = {
  header: HeaderProps;
  headings: Heading[];
};
