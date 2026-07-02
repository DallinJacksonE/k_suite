import { useEffect, useMemo, useState } from 'react'
import { BlogArticleList } from '../components/blog/BlogArticleList'
import { BlogArticleReader } from '../components/blog/BlogArticleReader'
import { ClientShell } from '../components/layout/ClientShell'
import { BlogPresenter, type BlogViewModel } from '../presenters/BlogPresenter'
import { FetchClientApiService } from '../service/ClientApiService'

export function BlogView() {
  const [model, setModel] = useState<BlogViewModel>({ loading: true, articles: [] })
  const service = useMemo(() => new FetchClientApiService(), [])
  const presenter = useMemo(() => new BlogPresenter(service, { renderBlog: setModel }), [service])

  useEffect(() => { void presenter.load() }, [presenter])

  const selectedArticle = model.articles.find((article) => article.slug === model.selectedSlug) ?? model.articles[0]

  return (
    <ClientShell>
      <section className="page-card blog-page">
        <p className="eyebrow">Blog</p>
        <h1>Read the latest from Kaylie&apos;s Suite.</h1>
        <p>Published articles, shop notes, and project updates live here.</p>
        {model.loading ? <p>Loading articles…</p> : null}
        {model.error ? <p role="alert" className="form-error">{model.error}</p> : null}
        <div className="blog-layout">
          <BlogArticleList articles={model.articles} selectedSlug={selectedArticle?.slug} onSelect={(slug) => presenter.selectArticle(slug)} />
          <BlogArticleReader article={selectedArticle} />
        </div>
      </section>
    </ClientShell>
  )
}
