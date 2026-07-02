import type { BlogArticle } from '../../service/ClientTypes'

interface BlogArticleListProps {
  articles: BlogArticle[]
  selectedSlug?: string
  onSelect(slug: string): void
}

export function BlogArticleList({ articles, selectedSlug, onSelect }: BlogArticleListProps) {
  if (!articles.length) return <p>No published articles yet. Check back soon.</p>

  return (
    <aside className="blog-list" aria-label="Published blog articles">
      {articles.map((article) => (
        <button
          type="button"
          key={article.articleId}
          className={article.slug === selectedSlug ? 'blog-list__item blog-list__item--selected' : 'blog-list__item'}
          onClick={() => onSelect(article.slug)}
        >
          <span>{formatDate(article.createdAt)}</span>
          <strong>{article.title}</strong>
          <small>{article.excerpt}</small>
        </button>
      ))}
    </aside>
  )
}

function formatDate(value?: string): string {
  if (!value) return 'Article'
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}
