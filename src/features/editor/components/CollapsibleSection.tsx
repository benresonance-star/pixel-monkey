import type { ReactNode } from 'react'

type CollapsibleSectionProps = {
  title: string
  description?: string
  isExpanded: boolean
  onToggle: () => void
  children: ReactNode
}

export function CollapsibleSection({
  title,
  description,
  isExpanded,
  onToggle,
  children,
}: CollapsibleSectionProps) {
  return (
    <section className="editor-section panel editor-section--collapsible">
      <button
        type="button"
        className="editor-section__header editor-section__header--button"
        onClick={onToggle}
        aria-expanded={isExpanded}
      >
        <div className="editor-section__title">
          <span className={`editor-section__chevron ${isExpanded ? 'is-expanded' : ''}`} aria-hidden="true">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 4l8 6-8 6" />
            </svg>
          </span>

          <div className="editor-section__copy">
            <h2>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
        </div>
      </button>

      {isExpanded ? <div className="editor-section__body">{children}</div> : null}
    </section>
  )
}
