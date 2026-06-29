import type { ReactNode } from 'react'

interface PanelProps { title: string; description?: string; className?: string; children: ReactNode }

export function Panel({ title, description, className = '', children }: PanelProps) {
  return (
    <section className={`panel ${className}`.trim()}>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {children}
    </section>
  )
}
