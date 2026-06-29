import type { ReactNode } from 'react'

interface ResultListProps { title: string; emptyText: string; children: ReactNode }

export function ResultList({ title, emptyText, children }: ResultListProps) {
  const hasResults = Array.isArray(children) ? children.length > 0 : Boolean(children)
  return <div><h3>{title}</h3>{hasResults ? <ul className="result-list">{children}</ul> : <p>{emptyText}</p>}</div>
}
