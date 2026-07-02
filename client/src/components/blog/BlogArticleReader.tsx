import type { BlogArticle, BlogArticleBlock } from '../../service/ClientTypes'

interface BlogArticleReaderProps {
  article?: BlogArticle
}

export function BlogArticleReader({ article }: BlogArticleReaderProps) {
  if (!article) {
    return (
      <article className="blog-reader blog-reader--empty">
        <h2>Select an article</h2>
        <p>Published articles will appear here.</p>
      </article>
    )
  }

  return (
    <article className="blog-reader">
      <p className="eyebrow">{formatDate(article.createdAt)}</p>
      <h2>{article.title}</h2>
      <p className="blog-reader__excerpt">{article.excerpt}</p>
      <div className="blog-reader__blocks">
        {article.blocks.map((block, index) => <BlogBlockRenderer key={`${block.type}-${index}`} block={block} />)}
      </div>
    </article>
  )
}

function BlogBlockRenderer({ block }: { block: BlogArticleBlock }) {
  if (block.type === 'heading') {
    const HeadingTag = `h${block.level}` as 'h1' | 'h2' | 'h3'
    return <HeadingTag>{block.text}</HeadingTag>
  }

  if (block.type === 'paragraph') return <p>{block.text}</p>

  if (block.type === 'image') {
    return <img className="blog-reader__image" src={block.url} alt={block.alt} loading="lazy" />
  }

  return (
    <iframe
      className="blog-reader__video"
      src={`https://www.youtube.com/embed/${toYouTubeId(block.videoId)}`}
      title={block.title ?? 'Embedded YouTube video'}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
    />
  )
}

function formatDate(value?: string): string {
  if (!value) return 'Published article'
  return new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

function toYouTubeId(value: string): string {
  const trimmed = value.trim()
  try {
    const url = new URL(trimmed)
    if (url.hostname.includes('youtu.be')) return url.pathname.replace('/', '')
    return url.searchParams.get('v') ?? trimmed
  } catch {
    return trimmed
  }
}
