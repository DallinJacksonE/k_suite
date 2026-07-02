import type { BlogArticle } from '../service/ClientTypes'

export interface BlogPresenterService {
  listBlogArticles(): Promise<BlogArticle[]>
}

export interface BlogViewModel {
  loading: boolean
  articles: BlogArticle[]
  selectedSlug?: string
  error?: string
}

export interface BlogPresenterView {
  renderBlog(model: BlogViewModel): void
}

export class BlogPresenter {
  private model: BlogViewModel = { loading: false, articles: [] }
  private readonly service: BlogPresenterService
  private readonly view: BlogPresenterView

  constructor(service: BlogPresenterService, view: BlogPresenterView) {
    this.service = service
    this.view = view
  }

  async load(): Promise<void> {
    this.update({ loading: true, error: undefined })
    try {
      const articles = await this.service.listBlogArticles()
      this.update({ loading: false, articles, selectedSlug: articles[0]?.slug })
    } catch (error) {
      this.update({ loading: false, error: readError(error) })
    }
  }

  selectArticle(slug: string): void {
    this.update({ selectedSlug: slug })
  }

  private update(patch: Partial<BlogViewModel>): void {
    this.model = { ...this.model, ...patch }
    this.view.renderBlog(this.model)
  }
}

function readError(error: unknown): string {
  return error instanceof Error ? error.message : 'Unable to load blog articles.'
}
