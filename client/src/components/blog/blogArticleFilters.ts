import { DEFAULT_BLOG_COLLECTION_TAG, type BlogArticle } from '../../service/ClientTypes'

export function articlesForCollection(articles: BlogArticle[], collectionTag: string): BlogArticle[] {
  return articles.filter((article) => (article.collectionTags?.length ? article.collectionTags : [DEFAULT_BLOG_COLLECTION_TAG]).includes(collectionTag))
}
