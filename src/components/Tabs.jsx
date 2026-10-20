import { useRef } from 'react';

/**
 * @typedef {object} TabDefinition
 * @property {string} id
 * @property {string} label
 * @property {import('react').ReactNode} content
 * @property {import('react').ReactNode} [icon]
 * @property {number} [count] Items needing attention, shown as a badge.
 */

/** Keys that move between tabs, mapped to the index they move to. */
const KEY_TARGETS = {
  ArrowRight: (index, last) => (index === last ? 0 : index + 1),
  ArrowLeft: (index, last) => (index === 0 ? last : index - 1),
  Home: () => 0,
  End: (index, last) => last,
};

/**
 * WAI-ARIA tabs with automatic activation: arrow keys, Home and End move
 * between tabs and only the active tab is in the Tab order.
 * Inactive panels stay mounted but `hidden`, so printing can show every panel.
 * @param {object} props
 * @param {string} props.label Accessible name of the tab list.
 * @param {TabDefinition[]} props.tabs
 * @param {string} props.active
 * @param {(id: string) => void} props.onChange
 */
export function Tabs({ label, tabs, active, onChange }) {
  const refs = useRef(/** @type {(HTMLButtonElement | null)[]} */ ([]));

  /** @param {import('react').KeyboardEvent} event @param {number} index */
  function onKeyDown(event, index) {
    const target = KEY_TARGETS[event.key];
    if (!target) return;
    event.preventDefault();
    const next = target(index, tabs.length - 1);
    onChange(tabs[next].id);
    refs.current[next]?.focus();
  }

  return (
    <>
      <div role="tablist" aria-label={label} className="tabs">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={(el) => {
              refs.current[index] = el;
            }}
            role="tab"
            type="button"
            id={`tab-${tab.id}`}
            aria-selected={active === tab.id}
            aria-controls={`panel-${tab.id}`}
            tabIndex={active === tab.id ? 0 : -1}
            className="tabs__tab"
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => onKeyDown(e, index)}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count ? (
              <span className="tabs__count" aria-label={`${tab.count} need attention`}>
                {tab.count}
              </span>
            ) : null}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <section
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={active !== tab.id}
          tabIndex={0}
          className="tabpanel"
        >
          {tab.content}
        </section>
      ))}
    </>
  );
}
