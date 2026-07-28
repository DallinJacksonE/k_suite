import type { FormEvent } from 'react'
import { useState } from 'react'
import { DEFAULT_BLOG_COLLECTION_TAG, type BlogArticleInput, type BlogArticleRecord, type BlogBlock, type BlogCollectionInput, type BlogCollectionRecord } from '../../service/AdminApiService'
import { Panel } from '../layout/Panel'

interface BlogDashboardProps {
  articles: BlogArticleRecord[]
  collections: BlogCollectionRecord[]
  busy: boolean
  onCreate(input: BlogArticleInput): Promise<boolean> | boolean
  onUpdate(articleId: string, input: Partial<BlogArticleInput>): void
  onDelete(articleId: string): void
  onCreateCollection(input: BlogCollectionInput): Promise<boolean> | boolean
  onUpdateCollection(tag: string, input: Partial<BlogCollectionInput>): void
  onDeleteCollection(tag: string): void
  onUploadImage(file: File | null): Promise<string>
  onRefresh(): void
}

export function BlogDashboard({ articles, collections, busy, onCreate, onUpdate, onDelete, onCreateCollection, onUpdateCollection, onDeleteCollection, onUploadImage, onRefresh }: BlogDashboardProps) {
  const availableCollections = ensureDefaultCollection(collections)
  const [draft, setDraft] = useState<BlogArticleInput>(emptyDraft())
  const [collectionDraft, setCollectionDraft] = useState<BlogCollectionInput>({ label: '', tag: '', description: '' })
  const [creatingCollection, setCreatingCollection] = useState(false)
  const [selectedCollectionTag, setSelectedCollectionTag] = useState<string | null>(null)
  const [creatingArticle, setCreatingArticle] = useState(false)
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null)

  const updateDraft = (patch: Partial<BlogArticleInput>) => setDraft((current) => ({ ...current, ...patch }))
  const addBlock = (type: BlogBlock['type']) => updateDraft({ blocks: [...draft.blocks, createBlock(type)] })
  const updateBlock = (index: number, block: BlogBlock) => updateDraft({ blocks: updateBlockAt(draft.blocks, index, block) })
  const removeBlock = (index: number) => updateDraft({ blocks: removeBlockAt(draft.blocks, index) })
  const saveDraft = async () => {
    const saved = await onCreate(withRequiredCollection(draft))
    if (saved) {
      setDraft(emptyDraft())
      setCreatingArticle(false)
    }
  }
  const saveCollection = async () => {
    const saved = await onCreateCollection(collectionDraft)
    if (saved) {
      setCollectionDraft({ label: '', tag: '', description: '' })
      setCreatingCollection(false)
    }
  }
  const toggleCollection = (tag: string) => { setSelectedCollectionTag((current) => current === tag ? null : tag); setCreatingCollection(false) }
  const toggleArticle = (articleId: string) => { setSelectedArticleId((current) => current === articleId ? null : articleId); setCreatingArticle(false) }

  return (
    <div className="category-stack">
      <Panel title="Collections" description="Manage blog collections. Kaylies Creations Updates is required and catches untagged articles.">
        <div className="button-row"><button type="button" onClick={() => { setCreatingCollection((current) => !current); setSelectedCollectionTag(null) }} disabled={busy}>{creatingCollection ? 'Close new collection form' : 'New collection'}</button></div>
        {creatingCollection ? (
          <div className="product-listing selected">
            <CollectionForm collection={collectionDraft} busy={busy} submitLabel="Add collection" onChange={(patch) => setCollectionDraft((current) => ({ ...current, ...patch }))} onSubmit={() => void saveCollection()} onCancel={() => { setCollectionDraft({ label: '', tag: '', description: '' }); setCreatingCollection(false) }} />
          </div>
        ) : null}
        <ul className="result-list product-result-list">
          {availableCollections.map((collection) => {
            const selected = selectedCollectionTag === collection.tag
            return <CollectionRow key={collection.tag} collection={collection} selected={selected} busy={busy} onToggle={() => toggleCollection(collection.tag)} onUpdate={onUpdateCollection} onDelete={onDeleteCollection} />
          })}
        </ul>
      </Panel>
      <Panel title="Articles" description="Add an article or click an existing article to edit it inline.">
        <div className="button-row">
          <button type="button" onClick={() => { setCreatingArticle((current) => !current); setSelectedArticleId(null) }} disabled={busy}>{creatingArticle ? 'Close new article form' : 'New article'}</button>
          <button type="button" onClick={onRefresh} disabled={busy}>Refresh articles</button>
        </div>
        {creatingArticle ? (
          <div className="product-listing selected">
            <BlogArticleForm
              article={draft}
              collections={availableCollections}
              busy={busy}
              submitLabel="Save draft"
              onChange={updateDraft}
              onAddBlock={addBlock}
              onUpdateBlock={updateBlock}
              onRemoveBlock={removeBlock}
              onUploadImage={onUploadImage}
              onSubmit={() => void saveDraft()}
              onCancel={() => { setDraft(emptyDraft()); setCreatingArticle(false) }}
            />
          </div>
        ) : null}
        {articles.length ? (
          <ul className="result-list product-result-list">
            {articles.map((article) => {
              const selected = selectedArticleId === article.articleId
              return (
                <li key={article.articleId} className={selected ? 'product-listing selected' : 'product-listing'}>
                  <button type="button" className="product-listing-summary" onClick={() => toggleArticle(article.articleId)} aria-expanded={selected}>
                    <span className="product-listing-main"><strong>{article.title}</strong><span>{article.slug}</span></span>
                    <span>{article.excerpt}</span>
                    <span>{article.published ? 'Published' : 'Draft'} · {article.blocks.length} blocks · {collectionLabels(article.collectionTags, availableCollections)}</span>
                    <span className="dropdown-indicator">{selected ? 'Close editor' : 'Edit article'}</span>
                  </button>
                  {selected ? <BlogInlineEditor article={article} collections={availableCollections} busy={busy} onUpdate={onUpdate} onDelete={onDelete} onUploadImage={onUploadImage} /> : null}
                </li>
              )
            })}
          </ul>
        ) : <p>No blog articles loaded.</p>}
      </Panel>
    </div>
  )
}

function CollectionRow({ collection, selected, busy, onToggle, onUpdate, onDelete }: { collection: BlogCollectionRecord; selected: boolean; busy: boolean; onToggle(): void; onUpdate(tag: string, input: Partial<BlogCollectionInput>): void; onDelete(tag: string): void }) {
  const [edit, setEdit] = useState<BlogCollectionInput>({ tag: collection.tag, label: collection.label, description: collection.description ?? '' })
  const isDefault = collection.tag === DEFAULT_BLOG_COLLECTION_TAG
  return (
    <li className={selected ? 'product-listing selected' : 'product-listing'}>
      <button type="button" className="product-listing-summary" onClick={onToggle} aria-expanded={selected}>
        <span className="product-listing-main"><strong>{collection.label}</strong><span>{collection.tag}</span></span>
        <span>{collection.description ?? 'No description'}</span>
        {isDefault ? <span>Required fallback collection</span> : null}
        <span className="dropdown-indicator">{selected ? 'Close editor' : 'Edit collection'}</span>
      </button>
      {selected ? <CollectionForm collection={edit} busy={busy} submitLabel="Save collection" isDefault={isDefault} onChange={(patch) => setEdit((current) => ({ ...current, ...patch }))} onSubmit={() => onUpdate(collection.tag, edit)} onDelete={() => window.confirm('Delete this collection? Articles will fall back to Kaylies Creations Updates if untagged.') && onDelete(collection.tag)} /> : null}
    </li>
  )
}

function CollectionForm({ collection, busy, submitLabel, isDefault = false, onChange, onSubmit, onDelete, onCancel }: { collection: BlogCollectionInput; busy: boolean; submitLabel: string; isDefault?: boolean; onChange(patch: Partial<BlogCollectionInput>): void; onSubmit(): void; onDelete?(): void; onCancel?(): void }) {
  return (
    <form className="form-grid" onSubmit={(event) => { event.preventDefault(); onSubmit() }}>
      <label>Label<input value={collection.label} onChange={(event) => onChange({ label: event.target.value })} /></label>
      <label>Tag<input value={collection.tag ?? ''} placeholder="auto-generated when blank" disabled={isDefault} onChange={(event) => onChange({ tag: event.target.value })} /></label>
      <label className="full-width">Description<textarea value={collection.description ?? ''} rows={2} onChange={(event) => onChange({ description: event.target.value })} /></label>
      <div className="button-row full-width"><button type="submit" disabled={busy}>{submitLabel}</button>{onCancel ? <button type="button" onClick={onCancel} disabled={busy}>Cancel</button> : null}{isDefault ? <span>Required fallback collection</span> : null}{onDelete && !isDefault ? <button type="button" className="danger-button" onClick={onDelete} disabled={busy}>Delete collection</button> : null}</div>
    </form>
  )
}

function BlogInlineEditor({ article, collections, busy, onUpdate, onDelete, onUploadImage }: {
  article: BlogArticleRecord
  collections: BlogCollectionRecord[]
  busy: boolean
  onUpdate(articleId: string, input: Partial<BlogArticleInput>): void
  onDelete(articleId: string): void
  onUploadImage(file: File | null): Promise<string>
}) {
  const [edit, setEdit] = useState<BlogArticleInput>({ title: article.title, slug: article.slug, excerpt: article.excerpt, blocks: article.blocks, collectionTags: withRequiredCollectionTags(article.collectionTags), published: article.published })
  const updateEdit = (patch: Partial<BlogArticleInput>) => setEdit((current) => ({ ...current, ...patch }))
  const addBlock = (type: BlogBlock['type']) => updateEdit({ blocks: [...edit.blocks, createBlock(type)] })
  const updateBlock = (index: number, block: BlogBlock) => updateEdit({ blocks: updateBlockAt(edit.blocks, index, block) })
  const removeBlock = (index: number) => updateEdit({ blocks: removeBlockAt(edit.blocks, index) })

  return (
    <BlogArticleForm
      article={edit}
      collections={collections}
      busy={busy}
      submitLabel="Save article edits"
      onChange={updateEdit}
      onAddBlock={addBlock}
      onUpdateBlock={updateBlock}
      onRemoveBlock={removeBlock}
      onUploadImage={onUploadImage}
      onSubmit={() => onUpdate(article.articleId, withRequiredCollection(edit))}
      onDelete={() => window.confirm('Delete this blog article?') && onDelete(article.articleId)}
    />
  )
}

function BlogArticleForm({ article, collections, busy, submitLabel, onChange, onAddBlock, onUpdateBlock, onRemoveBlock, onUploadImage, onSubmit, onDelete, onCancel }: {
  article: BlogArticleInput
  collections: BlogCollectionRecord[]
  busy: boolean
  submitLabel: string
  onChange(patch: Partial<BlogArticleInput>): void
  onAddBlock(type: BlogBlock['type']): void
  onUpdateBlock(index: number, block: BlogBlock): void
  onRemoveBlock(index: number): void
  onUploadImage(file: File | null): Promise<string>
  onSubmit(): void
  onDelete?(): void
  onCancel?(): void
}) {
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); onSubmit() }
  return (
    <form onSubmit={submit} className="form-grid blog-article-form">
      <label>Title<input value={article.title} onChange={(event) => onChange({ title: event.target.value })} /></label>
      <label>Slug<input value={article.slug} onChange={(event) => onChange({ slug: event.target.value })} /></label>
      <fieldset className="full-width"><legend>Collections</legend>{collections.map((collection) => <label key={collection.tag} className="checkbox-label">{collection.label}<input type="checkbox" checked={withRequiredCollectionTags(article.collectionTags).includes(collection.tag)} onChange={(event) => onChange({ collectionTags: toggleTag(article.collectionTags, collection.tag, event.target.checked) })} /></label>)}</fieldset>
      <label className="full-width">Excerpt<textarea value={article.excerpt} onChange={(event) => onChange({ excerpt: event.target.value })} rows={3} /></label>
      <label className="checkbox-label">Published<input type="checkbox" checked={article.published ?? false} onChange={(event) => onChange({ published: event.target.checked })} /></label>
      <div className="button-row full-width"><button type="button" onClick={() => onAddBlock('heading')}>Add heading</button><button type="button" onClick={() => onAddBlock('paragraph')}>Add paragraph</button><button type="button" onClick={() => onAddBlock('image')}>Add image</button><button type="button" onClick={() => onAddBlock('youtube')}>Add YouTube</button></div>
      <div className="block-stack full-width">{article.blocks.map((block, index) => <BlockEditor key={index} block={block} onChange={(next) => onUpdateBlock(index, next)} onRemove={() => onRemoveBlock(index)} onUploadImage={onUploadImage} />)}</div>
      <div className="button-row full-width"><button type="submit" disabled={busy}>{submitLabel}</button>{onCancel ? <button type="button" onClick={onCancel} disabled={busy}>Cancel</button> : null}{onDelete ? <button type="button" className="danger-button" onClick={onDelete} disabled={busy}>Delete article</button> : null}</div>
    </form>
  )
}

function BlockEditor({ block, onChange, onRemove, onUploadImage }: { block: BlogBlock; onChange(block: BlogBlock): void; onRemove(): void; onUploadImage(file: File | null): Promise<string> }) {
  return <article className="block-editor"><strong>{block.type}</strong>{block.type === 'heading' ? <><select value={block.level} onChange={(event) => onChange({ ...block, level: Number(event.target.value) as 1 | 2 | 3 })}><option value={1}>H1</option><option value={2}>H2</option><option value={3}>H3</option></select><input value={block.text} onChange={(event) => onChange({ ...block, text: event.target.value })} /></> : null}{block.type === 'paragraph' ? <textarea value={block.text} rows={4} onChange={(event) => onChange({ ...block, text: event.target.value })} /> : null}{block.type === 'image' ? <><input value={block.url} placeholder="Image URL" onChange={(event) => onChange({ ...block, url: event.target.value })} /><input value={block.alt} placeholder="Alt text" onChange={(event) => onChange({ ...block, alt: event.target.value })} /><input type="file" accept="image/*" onChange={(event) => void onUploadImage(event.currentTarget.files?.[0] ?? null).then((url) => onChange({ ...block, url }))} /></> : null}{block.type === 'youtube' ? <><input value={block.videoId} placeholder="Video ID or URL" onChange={(event) => onChange({ ...block, videoId: event.target.value })} /><input value={block.title ?? ''} placeholder="Title" onChange={(event) => onChange({ ...block, title: event.target.value })} /></> : null}<button type="button" className="danger-button" onClick={onRemove}>Remove</button></article>
}
function emptyDraft(): BlogArticleInput { return { title: '', slug: '', excerpt: '', blocks: [], collectionTags: [DEFAULT_BLOG_COLLECTION_TAG], published: false } }
function createBlock(type: BlogBlock['type']): BlogBlock { if (type === 'heading') return { type, level: 2, text: '' }; if (type === 'paragraph') return { type, text: '' }; if (type === 'image') return { type, url: '', alt: '' }; return { type, videoId: '' } }
function updateBlockAt(blocks: BlogBlock[], index: number, block: BlogBlock): BlogBlock[] { return blocks.map((item, itemIndex) => itemIndex === index ? block : item) }
function removeBlockAt(blocks: BlogBlock[], index: number): BlogBlock[] { return blocks.filter((_, itemIndex) => itemIndex !== index) }
function ensureDefaultCollection(collections: BlogCollectionRecord[]): BlogCollectionRecord[] { return collections.some((collection) => collection.tag === DEFAULT_BLOG_COLLECTION_TAG) ? collections : [{ tag: DEFAULT_BLOG_COLLECTION_TAG, label: 'Kaylies Creations Updates' }, ...collections] }
function withRequiredCollection(article: BlogArticleInput): BlogArticleInput { return { ...article, collectionTags: withRequiredCollectionTags(article.collectionTags) } }
function withRequiredCollectionTags(tags: string[] | undefined): string[] { return tags?.length ? tags : [DEFAULT_BLOG_COLLECTION_TAG] }
function toggleTag(tags: string[] | undefined, tag: string, checked: boolean): string[] { const current = new Set(withRequiredCollectionTags(tags)); if (checked) current.add(tag); else current.delete(tag); return current.size ? [...current] : [DEFAULT_BLOG_COLLECTION_TAG] }
function collectionLabels(tags: string[] | undefined, collections: BlogCollectionRecord[]): string { const labels = withRequiredCollectionTags(tags).map((tag) => collections.find((collection) => collection.tag === tag)?.label ?? tag); return labels.join(', ') }
