import { useState } from 'react';
import { formatDate } from '../lib/format.js';
import { actions } from '../state/actions.js';
import { Badge, SectionHeading } from './ui.jsx';

/** @typedef {import('../../shared/types.js').ScheduledMilestone} ScheduledMilestone */

/** @type {{ id: string, label: string, show: (task: ScheduledMilestone, done: Record<string, boolean>) => boolean }[]} */
const FILTERS = [
  { id: 'open', label: 'To do', show: (task, done) => !done[task.id] },
  { id: 'high', label: 'High priority', show: (task) => task.priority === 'high' },
  { id: 'all', label: 'Everything', show: () => true },
];

/**
 * @param {object} props
 * @param {ScheduledMilestone} props.task
 * @param {boolean} props.done
 * @param {() => void} props.onToggle
 */
function TaskItem({ task, done, onToggle }) {
  const inputId = `task-${task.id}`;
  return (
    <li className={`checklist__item ${done ? 'is-done' : ''}`}>
      <input type="checkbox" id={inputId} checked={done} onChange={onToggle} />
      <div className="checklist__body">
        <label htmlFor={inputId} className="checklist__title">
          {task.title}
        </label>
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
  );
}

/**
 * Preparation checklist with filters and progress, plus the day-of run of show.
 * @param {object} props
 * @param {ScheduledMilestone[]} props.scheduled
 * @param {{ total: number, complete: number }} props.progress
 * @param {import('../../shared/types.js').RunOfShowItem[]} props.runOfShow
 * @param {Record<string, boolean>} props.done
 * @param {import('../state/actions.js').Dispatch} props.dispatch
 */
export function TimelinePanel({ scheduled, progress, runOfShow, done, dispatch }) {
  const [filterId, setFilterId] = useState('open');
  const filter = FILTERS.find((f) => f.id === filterId) ?? FILTERS[0];
  const visible = scheduled.filter((task) => filter.show(task, done));

  return (
    <div className="stack-lg">
      <SectionHeading
        title="Preparation timeline"
        description="Due dates count back from your event day. Tick tasks off as you go."
      />

      <div className="progress">
        <progress
          max={progress.total}
          value={progress.complete}
          aria-label={`${progress.complete} of ${progress.total} tasks done`}
        />
        <span>
          {progress.complete} of {progress.total} done
        </span>
      </div>

      <fieldset className="chips plain-fieldset">
        <legend className="visually-hidden">Show tasks</legend>
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className="chip"
            aria-pressed={filterId === f.id}
            onClick={() => setFilterId(f.id)}
          >
            {f.label}
          </button>
        ))}
      </fieldset>

      {visible.length === 0 ? (
        <p className="muted">Nothing here. Every task in this view is done.</p>
      ) : (
        <ol className="checklist">
          {visible.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              done={Boolean(done[task.id])}
              onToggle={() => dispatch(actions.taskToggled(task.id))}
            />
          ))}
        </ol>
      )}

      <section aria-label="Run of show">
        <SectionHeading
          title="On the day"
          description="Your run of show. Share it with vendors and your MC."
          level={3}
        />
        <ol className="run-of-show">
          {runOfShow.map((item, i) => (
            // Times can repeat, so the position keeps keys unique.
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
