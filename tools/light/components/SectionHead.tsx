// @ts-nocheck

const SectionHead = ({ title, subtitle, collapsible = false, collapsed = false, onToggle }) => (
  <div
    className="row pb-4"
    style={{ justifyContent: 'space-between', alignItems: 'center' }}
  >
    <div className="row" style={{ alignItems: 'center', gap: 8 }}>
      {collapsible && (
        <button
          type="button"
          className="collapse-btn"
          aria-label={collapsed ? `Expand ${title}` : `Collapse ${title}`}
          aria-expanded={collapsed ? 'false' : 'true'}
          onClick={onToggle}
        >
          <span className={`chev ${collapsed ? 'rot' : ''}`} aria-hidden="true">▾</span>
        </button>
      )}
      <h1 style={{ margin: 0 }}>{title}</h1>
    </div>
    {subtitle && <div>{subtitle}</div>}
  </div>
);

export default SectionHead;
