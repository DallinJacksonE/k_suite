import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { BlogArticleGrid } from '../components/blog/BlogArticleGrid'
import { articlesForCollection } from '../components/blog/blogArticleFilters'
import { BlogCollectionList } from '../components/blog/BlogCollectionList'
import { BlogArticleReader } from '../components/blog/BlogArticleReader'
import { ClientShell } from '../components/layout/ClientShell'
import { BlogPresenter, type BlogViewModel } from '../presenters/BlogPresenter'
import { DEFAULT_BLOG_COLLECTION_TAG } from '../service/ClientTypes'
import { FetchClientApiService } from '../service/ClientApiService'

type BlogRouteMode = 'collections' | 'collection' | 'article'

interface BlogViewProps { mode?: BlogRouteMode }

export function BlogView({ mode = 'collections' }: BlogViewProps) {
  const params = useParams()
  const location = useLocation()
  const [model, setModel] = useState<BlogViewModel>({ loading: true, articles: [], collections: [] })
  const service = useMemo(() => new FetchClientApiService(), [])
  const presenter = useMemo(() => new BlogPresenter(service, { renderBlog: setModel }), [service])
  const collectionTag = params.collectionTag ? decodeURIComponent(params.collectionTag) : undefined
  const slug = params.slug ? decodeURIComponent(params.slug) : undefined
  const sourceCollection = readSourceCollection(location.state) ?? collectionTag ?? collectionForArticle(model.articles.find((article) => article.slug === slug))

  useEffect(() => { void presenter.load({ collectionTag, slug }) }, [presenter, collectionTag, slug])

  const selectedCollection = model.collections.find((collection) => collection.tag === collectionTag)
  const collectionArticles = collectionTag ? articlesForCollection(model.articles, collectionTag) : []
  const selectedArticle = model.articles.find((article) => article.slug === slug)

  return (
    <ClientShell>
      <section className="page-card blog-page">
        <p className="eyebrow">Blog</p>
        <h1>Read the latest from Kaylie&apos;s Suite.</h1>
        <p>Published articles, shop notes, and project updates live here.</p>
        {model.loading ? <p>Loading articles…</p> : null}
        {model.error ? <p role="alert" className="form-error">{model.error}</p> : null}
        {!model.loading && mode === 'collections' ? <BlogCollectionList collections={model.collections} articles={model.articles} /> : null}
        {!model.loading && mode === 'collection' ? (
          <div className="blog-route-stack">
            <Link to="/blog" className="blog-back-link">← Back to collections</Link>
            <h2>{selectedCollection?.label ?? labelForTag(collectionTag ?? DEFAULT_BLOG_COLLECTION_TAG)}</h2>
            <BlogArticleGrid articles={collectionArticles} collectionTag={collectionTag ?? DEFAULT_BLOG_COLLECTION_TAG} />
          </div>
        ) : null}
        {!model.loading && mode === 'article' ? (
          <div className="blog-route-stack">
            <Link to={sourceCollection ? `/blog/collections/${encodeURIComponent(sourceCollection)}` : '/blog'} className="blog-back-link">← Back to collection</Link>
            <BlogArticleReader article={selectedArticle} />
          </div>
        ) : null}
      </section>
    </ClientShell>
  )
}

function readSourceCollection(state: unknown): string | undefined {
  return state && typeof state === 'object' && 'collectionTag' in state && typeof state.collectionTag === 'string' ? state.collectionTag : undefined
}

function collectionForArticle(article?: { collectionTags?: string[] }): string | undefined {
  return article?.collectionTags?.[0] ?? DEFAULT_BLOG_COLLECTION_TAG
}

function labelForTag(tag: string): string {
  if (tag === DEFAULT_BLOG_COLLECTION_TAG) return 'Kaylies Creations Updates'
  return tag.split('-').filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}
