/**
 * One generated reference page per public symbol. Everything on
 * the page comes from reference/{Symbol}.schema.json (structure) and .strings.json
 * (prose); nothing is typed by hand.
 */
import { PageActions } from '../components/PageActions';
import type { Heading } from '../lib/props';
import { inlineHtml, structureHeading, titles, type Page } from '../lib/site';
import { DocsLayout, type Assets } from './DocsLayout';

const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const code = (text: string | number | boolean | null | undefined) => (text === undefined || text === null || text === '' ? null : String(text));
const KIND: Record<string, string> = { component: 'Component', function: 'Function', type: 'Type', 'setting-group': 'Constant' };

/** The right rail lists the sections this template renders, in the order it renders them. */
export function referenceHeadings(page: Page): Heading[] {
  const { schema } = page.reference!;
  const structure = structureHeading(page.reference!);
  return [
    { depth: 2, slug: 'used-by', text: 'Used by' },
    { depth: 2, slug: 'import', text: 'Import' },
    ...(schema.inheritance ? [{ depth: 2, slug: 'extends', text: 'Extends' }] : []),
    ...(schema.signature ? [{ depth: 2, slug: 'signature', text: 'Signature' }] : []),
    { depth: 2, slug: slug(structure), text: structure },
    ...(schema.returns ? [{ depth: 2, slug: 'returns', text: 'Returns' }] : []),
    ...(Object.keys(schema.events ?? {}).length ? [{ depth: 2, slug: 'events', text: 'Events' }] : []),
    ...(schema.tokens?.length ? [{ depth: 2, slug: 'tokens', text: 'Tokens' }] : []),
    { depth: 2, slug: 'source', text: 'Source' },
  ];
}

export function ReferencePage({ page, headings, site, assets }: { page: Page; headings: Heading[]; site: URL; assets: Assets }) {
  const { schema, strings } = page.reference!;
  const structure = structureHeading(page.reference!);
  const options = Object.entries(schema.options ?? {});
  const events = Object.entries(schema.events ?? {});
  const definition = `${schema.kind === 'type' ? `type ${schema.name} = ` : `const ${schema.name}: `}${schema.definition ?? 'unknown'}`;

  return (
    <DocsLayout page={page} headings={headings} site={site} assets={assets}>
      <article className="article reference">
        <header className="page-header">
          <h1>{page.heading}</h1>
          <p className="page-subtitle">{page.description}</p>
          <p className="reference-kind">{KIND[schema.kind] ?? schema.kind}</p>
        </header>

        <h2 id="used-by">Used by</h2>
        {schema.usedBy.length > 0 ? (
          <ul>
            {schema.usedBy.map((path) => (
              <li key={path}>
                <a href={path}>{titles[path] ?? path}</a>
              </li>
            ))}
          </ul>
        ) : (
          <p>Not used by any documentation page.</p>
        )}

        <h2 id="import">Import</h2>
        <pre>
          <code>{schema.imports.join('\n')}</code>
        </pre>

        {schema.inheritance && (
          <>
            <h2 id="extends">Extends</h2>
            <p>
              <a href={schema.inheritance.pathname}>
                <code>{schema.inheritance.symbol}</code>
              </a>
            </p>
          </>
        )}

        {schema.signature && (
          <>
            <h2 id="signature">Signature</h2>
            {/* The indent and trailing line break are what the published page shows; inside <pre> they are content. */}
            <pre>
              {'\n            '}
              <code>{schema.signature}</code>
              {'\n          '}
            </pre>
          </>
        )}

        <h2 id={slug(structure)}>{structure}</h2>
        {structure === 'Definition' ? (
          <pre>
            {'\n          '}
            <code>{definition}</code>
            {'\n        '}
          </pre>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Type</th>
                  <th scope="col">Default</th>
                  <th scope="col">Required</th>
                  <th scope="col">Description</th>
                </tr>
              </thead>
              <tbody>
                {options.map(([name, option]) => (
                  <tr id={`option-${name}`} className={option.deprecated ? 'deprecated' : undefined} key={name}>
                    <th scope="row">
                      <code>{name}</code>
                    </th>
                    <td>
                      <code>{option.type.name}</code>
                    </td>
                    <td>{code(option.default) ? <code>{code(option.default)}</code> : '—'}</td>
                    <td>{option.required ? 'Yes' : 'No'}</td>
                    <td dangerouslySetInnerHTML={{ __html: inlineHtml(strings.optionDescriptions?.[name]) }} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {schema.returns && (
          <>
            <h2 id="returns">Returns</h2>
            <p>
              <code>{schema.returns}</code>
            </p>
          </>
        )}

        {events.length > 0 && (
          <>
            <h2 id="events">Events</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Type</th>
                    <th scope="col">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map(([name, event]) => (
                    <tr id={`event-${name}`} key={name}>
                      <th scope="row">
                        <code>{name}</code>
                      </th>
                      <td>
                        <code>{event.type.name}</code>
                      </td>
                      <td dangerouslySetInnerHTML={{ __html: inlineHtml(strings.eventDescriptions?.[name]) }} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {schema.tokens && schema.tokens.length > 0 && (
          <>
            <h2 id="tokens">Tokens</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Token</th>
                    <th scope="col">Element</th>
                    <th scope="col">Property</th>
                    <th scope="col">Fallback</th>
                  </tr>
                </thead>
                <tbody>
                  {schema.tokens.flatMap((token) =>
                    token.usages.map((usage, i) => (
                      <tr key={`${token.name}-${i}`}>
                        {i === 0 && (
                          <th scope="rowgroup" rowSpan={token.usages.length}>
                            <code>{token.name}</code>
                            <span
                              className="token-description"
                              dangerouslySetInnerHTML={{ __html: inlineHtml(strings.tokenDescriptions?.[token.name]) }}
                            />
                          </th>
                        )}
                        <td>{usage.element}</td>
                        <td>
                          <code>{usage.property}</code>
                        </td>
                        <td>
                          <code>{usage.fallback}</code>
                        </td>
                      </tr>
                    )),
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        <h2 id="source">Source</h2>
        <p>
          <a href={schema.sourceUrl}>
            <code>{schema.filename}</code>
          </a>
        </p>

        <PageActions page={page} />
      </article>
    </DocsLayout>
  );
}
