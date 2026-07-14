import { Link } from 'react-router-dom'
import { DEFAULT_BLOG_COLLECTION_TAG, type BlogArticle, type BlogCollection } from '../../service/ClientTypes'

interface BlogCollectionListProps {
  collections: BlogCollection[]
  articles: BlogArticle[]
}

export function BlogCollectionList({ collections, articles }: BlogCollectionListProps) {
  return (
    <div className="blog-collection-grid" aria-label="Blog collections">
      {collections.map((collection) => {
        const collectionArticles = articles.filter((article) => articleTags(article).includes(collection.tag))
        const latest = collectionArticles[0]
        const thumbnail = latest ? firstImage(latest) : undefined
        return (
          <Link key={collection.tag} to={`/blog/collections/${encodeURIComponent(collection.tag)}`} className="blog-collection-card">
            {thumbnail ? <img src={thumbnail.url} alt={thumbnail.alt} loading="lazy" /> : <div className="blog-card-placeholder">Kaylie&apos;s Suite</div>}
            <span className="eyebrow">{collectionArticles.length} article{collectionArticles.length === 1 ? '' : 's'}</span>
            <strong>{collection.label}</strong>
            {latest ? <small>Latest: {latest.title}</small> : <small>No published articles yet.</small>}
          </Link>
        )
      })}
    </div>
  )
}

function articleTags(article: BlogArticle): string[] { return article.collectionTags?.length ? article.collectionTags : [DEFAULT_BLOG_COLLECTION_TAG] }
function firstImage(article: BlogArticle) { return article.blocks.find((block) => block.type === 'image' && block.url.trim()) as { type: 'image'; url: string; alt: string } | undefined }
