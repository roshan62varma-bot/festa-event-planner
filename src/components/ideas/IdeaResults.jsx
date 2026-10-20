import { CopyButton } from './CopyButton.jsx';

/**
 * A set of generated ideas, each with a copy button.
 * @param {{ result: import('../../../shared/types.js').Ideas }} props
 */
export function IdeaResults({ result }) {
  return (
    <section className="stack" aria-label={result.title}>
      <div>
        <h3 className="h3">{result.title}</h3>
        <p className="muted">{result.intro}</p>
      </div>
      <ul className="idea-list">
        {result.items.map((item, i) => (
          <li key={`${item.heading}-${i}`} className="idea">
            <div className="idea__head">
              <h4 className="idea__title">{item.heading}</h4>
              <CopyButton text={`${item.heading}\n\n${item.body}`} label={item.heading} />
            </div>
            <p className="idea__body">{item.body}</p>
            {item.tags.length > 0 && (
              <ul className="tags" aria-label="Tags">
                {item.tags.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
