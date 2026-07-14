import { DEFAULT_BLOG_COLLECTION_TAG, type BlogArticle, type BlogCollection } from '../service/ClientTypes'

export interface BlogPresenterService {
  listBlogArticles(): Promise<BlogArticle[]>
  listBlogCollections(): Promise<BlogCollection[]>
}

export interface BlogViewModel {
  loading: boolean
  articles: BlogArticle[]
  collections: BlogCollection[]
  selectedCollectionTag?: string
  selectedSlug?: string
  error?: string
}

export interface BlogPresenterView {
  renderBlog(model: BlogViewModel): void
}

export class BlogPresenter {
  private model: BlogViewModel = { loading: false, articles: [], collections: defaultCollections() }
  private readonly service: BlogPresenterService
  private readonly view: BlogPresenterView

  constructor(service: BlogPresenterService, view: BlogPresenterView) {
    this.service = service
    this.view = view
  }

  async load(selection: { collectionTag?: string; slug?: string } = {}): Promise<void> {
    this.update({ loading: true, error: undefined, ...selection })
    try {
      const [articles, collections] = await Promise.all([this.service.listBlogArticles(), this.service.listBlogCollections()])
      const sortedArticles = sortArticles(articles)
      this.update({ loading: false, articles: sortedArticles, collections: mergeCollections(collections, sortedArticles), ...selection })
    } catch (error) {
      this.update({ loading: false, error: readError(error) })
    }
  }

  selectCollection(collectionTag: string): void {
    this.update({ selectedCollectionTag: collectionTag, selectedSlug: undefined })
  }

  selectArticle(slug: string, collectionTag?: string): void {
    this.update({ selectedSlug: slug, selectedCollectionTag: collectionTag ?? this.model.selectedCollectionTag })
  }

  showCollections(): void {
    this.update({ selectedCollectionTag: undefined, selectedSlug: undefined })
  }

  private update(patch: Partial<BlogViewModel>): void {
    this.model = { ...this.model, ...patch }
    this.view.renderBlog(this.model)
  }
}

export function sortArticles(articles: BlogArticle[]): BlogArticle[] {
  return [...articles].sort((left, right) => dateValue(right.createdAt) - dateValue(left.createdAt) || left.title.localeCompare(right.title))
}

export function collectionsFromArticles(articles: BlogArticle[]): BlogCollection[] {
  const tags = new Set<string>([DEFAULT_BLOG_COLLECTION_TAG])
  for (const article of articles) for (const tag of article.collectionTags?.length ? article.collectionTags : [DEFAULT_BLOG_COLLECTION_TAG]) tags.add(tag)
  return [...tags].map((tag) => ({ tag, label: labelForTag(tag) })).sort((left, right) => left.tag === DEFAULT_BLOG_COLLECTION_TAG ? -1 : right.tag === DEFAULT_BLOG_COLLECTION_TAG ? 1 : left.label.localeCompare(right.label))
}

export function mergeCollections(collections: BlogCollection[], articles: BlogArticle[]): BlogCollection[] {
  const byTag = new Map<string, BlogCollection>()
  for (const collection of [{ tag: DEFAULT_BLOG_COLLECTION_TAG, label: 'Kaylies Creations Updates' }, ...collections, ...collectionsFromArticles(articles)]) byTag.set(collection.tag, collection)
  return [...byTag.values()].sort((left, right) => left.tag === DEFAULT_BLOG_COLLECTION_TAG ? -1 : right.tag === DEFAULT_BLOG_COLLECTION_TAG ? 1 : left.label.localeCompare(right.label))
}

function defaultCollections(): BlogCollection[] {
  return [{ tag: DEFAULT_BLOG_COLLECTION_TAG, label: 'Kaylies Creations Updates' }]
}

function labelForTag(tag: string): string {
  if (tag === DEFAULT_BLOG_COLLECTION_TAG) return 'Kaylies Creations Updates'
  return tag.split('-').filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}

function dateValue(value?: string): number {
  if (!value) return 0
  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? 0 : parsed
}

function readError(error: unknown): string {
  return error instanceof Error ? error.message : 'Unable to load blog articles.'
}
