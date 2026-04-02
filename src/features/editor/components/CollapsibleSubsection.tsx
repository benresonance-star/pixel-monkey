import type { ReactNode } from 'react'

type CollapsibleSubsectionProps = {
  title: string
  headerExtra?: ReactNode
  isExpanded: boolean
  onToggle: () => void
  children: ReactNode
}

export function CollapsibleSubsection({
  title,
  headerExtra,
  isExpanded,
  onToggle,
  children,
}: CollapsibleSubsectionProps) {
  return (
    <div className="collapsible-subsection">
      <button
        type="button"
        className="collapsible-subsection__trigger"
        onClick={onToggle}
        aria-expanded={isExpanded}
      >
        <div className="editor-section__title collapsible-subsection__title">
          <span
            className={`editor-section__chevron ${isExpanded ? 'is-expanded' : ''}`}
            aria-hidden="true"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 4l8 6-8 6" />
            </svg>
          </span>
          <div className="collapsible-subsection__heading">
            <strong>{title}</strong>
            {headerExtra ? <span className="collapsible-subsection__extra">{headerExtra}</span> : null}
          </div>
        </div>
      </button>

      {isExpanded ? <div className="collapsible-subsection__body">{children}</div> : null}
    </div>
  )
}
