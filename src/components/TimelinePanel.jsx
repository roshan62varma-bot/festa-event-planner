import { useState } from 'react';
import { Badge, SectionHeading } from './ui.jsx';

const FILTERS = [
  { id: 'open', label: 'To do' },
  { id: 'high', label: 'High priority' },
  { id: 'all', label: 'Everything' },
];

const dateFormat = new Intl.DateTimeFormat('en', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
export const formatDate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return dateFormat.format(new Date(y, m - 1, d));
};

export function TimelinePanel({ scheduled, progress, runOfShow, done, dispatch }) {
  const [filter, setFilter] = useState('open');
  const visible = scheduled.filter((m) => (filter === 'all' ? true : filter === 'high' ? m.priority === 'high' : !done[m.id]));

  return (
    <div className="stack-lg">
      <SectionHeading
        title="Preparation timeline"
        description="Due dates count back from your event day. Tick tasks off as you go."
      />

      <div className="progress">
        <progress max={progress.total} value={progress.complete} aria-label={`${progress.complete} of ${progress.total} tasks done`} />
        <span>{progress.complete} of {progress.total} done</span>
      </div>

      <fieldset className="chips plain-fieldset">
        <legend className="visually-hidden">Show tasks</legend>
        {FILTERS.map((f) => (
          <button key={f.id} type="button" className="chip" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}</button>
        ))}
      </fieldset>

      {visible.length === 0 ? (
        <p className="muted">Nothing here. Every task in this view is done.</p>
      ) : (
        <ol className="checklist">
          {visible.map((task) => (
            <li key={task.id} className={`checklist__item ${done[task.id] ? 'is-done' : ''}`}>
              <input
                type="checkbox"
                id={`task-${task.id}`}
                checked={Boolean(done[task.id])}
                onChange={() => dispatch({ type: 'task/toggled', id: task.id })}
              />
              <div className="checklist__body">
                <label htmlFor={`task-${task.id}`} className="checklist__title">{task.title}</label>
                <p className="checklist__detail">{task.detail}</p>
                <p className="checklist__meta">
                  <time dateTime={task.due}>Due {formatDate(task.due)}</time>
                  {task.compressed && <span className="muted"> (ideal date passed, do it now)</span>}
                </p>
              </div>
              <div className="checklist__badges">
                <Badge tone={task.priority} />
                {task.status !== 'upcoming' && <Badge tone={task.status} />}
              </div>
            </li>
          ))}
        </ol>
      )}

      <section aria-label="Run of show">
        <SectionHeading title="On the day" description="Your run of show. Share it with vendors and your MC." level={3} />
        <ol className="run-of-show">
          {runOfShow.map((item, i) => (
            <li key={`${item.time}-${i}`}>
              <time className="run-of-show__time">{item.time || '--:--'}</time>
              <span className="run-of-show__activity">{item.activity}</span>
              <span className="run-of-show__owner">{item.owner}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
