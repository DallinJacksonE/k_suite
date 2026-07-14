import { Link } from 'react-router-dom'
import type { BlogArticle } from '../../service/ClientTypes'

interface BlogArticleGridProps {
  articles: BlogArticle[]
  collectionTag: string
}

export function BlogArticleGrid({ articles, collectionTag }: BlogArticleGridProps) {
  if (!articles.length) return <p>No published articles in this collection yet.</p>

  return (
    <div className="blog-article-grid" aria-label="Collection articles">
      {articles.map((article) => {
        const thumbnail = firstImage(article)
        return (
          <Link key={article.articleId} to={`/blog/${encodeURIComponent(article.slug)}`} state={{ collectionTag }} className="blog-article-card">
            {thumbnail ? <img src={thumbnail.url} alt={thumbnail.alt} loading="lazy" /> : <div className="blog-card-placeholder">Kaylie&apos;s Suite</div>}
            <span>{formatDate(article.createdAt)}</span>
            <strong>{article.title}</strong>
            <small>{article.excerpt}</small>
          </Link>
        )
      })}
    </div>
  )
}

function firstImage(article: BlogArticle) { return article.blocks.find((block) => block.type === 'image' && block.url.trim()) as { type: 'image'; url: string; alt: string } | undefined }
function formatDate(value?: string): string { if (!value) return 'Article'; return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)) }
