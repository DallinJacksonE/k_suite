import type { FormEvent } from 'react'
import { useState } from 'react'
import type { BlogArticleInput, BlogArticleRecord, BlogBlock } from '../../service/AdminApiService'
import { Panel } from '../layout/Panel'

interface BlogDashboardProps {
  articles: BlogArticleRecord[]
  busy: boolean
  onCreate(input: BlogArticleInput): Promise<boolean> | boolean
  onUpdate(articleId: string, input: Partial<BlogArticleInput>): void
  onDelete(articleId: string): void
  onUploadImage(file: File | null): Promise<string>
  onRefresh(): void
}

export function BlogDashboard({ articles, busy, onCreate, onUpdate, onDelete, onUploadImage, onRefresh }: BlogDashboardProps) {
  const [draft, setDraft] = useState<BlogArticleInput>(emptyDraft())
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null)

  const updateDraft = (patch: Partial<BlogArticleInput>) => setDraft((current) => ({ ...current, ...patch }))
  const addBlock = (type: BlogBlock['type']) => updateDraft({ blocks: [...draft.blocks, createBlock(type)] })
  const updateBlock = (index: number, block: BlogBlock) => updateDraft({ blocks: updateBlockAt(draft.blocks, index, block) })
  const removeBlock = (index: number) => updateDraft({ blocks: removeBlockAt(draft.blocks, index) })
  const saveDraft = async () => {
    const saved = await onCreate(draft)
    if (saved) setDraft(emptyDraft())
  }
  const toggleArticle = (articleId: string) => setSelectedArticleId((current) => current === articleId ? null : articleId)

  return (
    <div className="category-stack">
      <Panel title="Write blog article" description="Compose an article from headings, paragraphs, images, and embedded YouTube videos.">
        <BlogArticleForm
          article={draft}
          busy={busy}
          submitLabel="Save draft"
          onChange={updateDraft}
          onAddBlock={addBlock}
          onUpdateBlock={updateBlock}
          onRemoveBlock={removeBlock}
          onUploadImage={onUploadImage}
          onSubmit={() => void saveDraft()}
        />
      </Panel>

      <Panel title="Articles" description="Click an article to edit it inline.">
        <button type="button" onClick={onRefresh} disabled={busy}>Refresh articles</button>
        {articles.length ? (
          <ul className="result-list product-result-list">
            {articles.map((article) => {
              const selected = selectedArticleId === article.articleId
              return (
                <li key={article.articleId} className={selected ? 'product-listing selected' : 'product-listing'}>
                  <button type="button" className="product-listing-summary" onClick={() => toggleArticle(article.articleId)} aria-expanded={selected}>
                    <span className="product-listing-main"><strong>{article.title}</strong><span>{article.slug}</span></span>
                    <span>{article.excerpt}</span>
                    <span>{article.published ? 'Published' : 'Draft'} · {article.blocks.length} blocks</span>
                    <span className="dropdown-indicator">{selected ? 'Close editor' : 'Edit article'}</span>
                  </button>
                  {selected ? <BlogInlineEditor article={article} busy={busy} onUpdate={onUpdate} onDelete={onDelete} onUploadImage={onUploadImage} /> : null}
                </li>
              )
            })}
          </ul>
        ) : <p>No blog articles loaded.</p>}
      </Panel>
    </div>
  )
}

function BlogInlineEditor({ article, busy, onUpdate, onDelete, onUploadImage }: {
  article: BlogArticleRecord
  busy: boolean
  onUpdate(articleId: string, input: Partial<BlogArticleInput>): void
  onDelete(articleId: string): void
  onUploadImage(file: File | null): Promise<string>
}) {
  const [edit, setEdit] = useState<BlogArticleInput>({ title: article.title, slug: article.slug, excerpt: article.excerpt, blocks: article.blocks, published: article.published })
  const updateEdit = (patch: Partial<BlogArticleInput>) => setEdit((current) => ({ ...current, ...patch }))
  const addBlock = (type: BlogBlock['type']) => updateEdit({ blocks: [...edit.blocks, createBlock(type)] })
  const updateBlock = (index: number, block: BlogBlock) => updateEdit({ blocks: updateBlockAt(edit.blocks, index, block) })
  const removeBlock = (index: number) => updateEdit({ blocks: removeBlockAt(edit.blocks, index) })

  return (
    <BlogArticleForm
      article={edit}
      busy={busy}
      submitLabel="Save article edits"
      onChange={updateEdit}
      onAddBlock={addBlock}
      onUpdateBlock={updateBlock}
      onRemoveBlock={removeBlock}
      onUploadImage={onUploadImage}
      onSubmit={() => onUpdate(article.articleId, edit)}
      onDelete={() => window.confirm('Delete this blog article?') && onDelete(article.articleId)}
    />
  )
}

function BlogArticleForm({ article, busy, submitLabel, onChange, onAddBlock, onUpdateBlock, onRemoveBlock, onUploadImage, onSubmit, onDelete }: {
  article: BlogArticleInput
  busy: boolean
  submitLabel: string
  onChange(patch: Partial<BlogArticleInput>): void
  onAddBlock(type: BlogBlock['type']): void
  onUpdateBlock(index: number, block: BlogBlock): void
  onRemoveBlock(index: number): void
  onUploadImage(file: File | null): Promise<string>
  onSubmit(): void
  onDelete?(): void
}) {
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); onSubmit() }
  return (
    <form onSubmit={submit} className="form-grid blog-article-form">
      <label>Title<input value={article.title} onChange={(event) => onChange({ title: event.target.value })} /></label>
      <label>Slug<input value={article.slug} onChange={(event) => onChange({ slug: event.target.value })} /></label>
      <label className="full-width">Excerpt<textarea value={article.excerpt} onChange={(event) => onChange({ excerpt: event.target.value })} rows={3} /></label>
      <label className="checkbox-label"><input type="checkbox" checked={article.published ?? false} onChange={(event) => onChange({ published: event.target.checked })} />Published</label>
      <div className="button-row full-width"><button type="button" onClick={() => onAddBlock('heading')}>Add heading</button><button type="button" onClick={() => onAddBlock('paragraph')}>Add paragraph</button><button type="button" onClick={() => onAddBlock('image')}>Add image</button><button type="button" onClick={() => onAddBlock('youtube')}>Add YouTube</button></div>
      <div className="block-stack full-width">{article.blocks.map((block, index) => <BlockEditor key={index} block={block} onChange={(next) => onUpdateBlock(index, next)} onRemove={() => onRemoveBlock(index)} onUploadImage={onUploadImage} />)}</div>
      <div className="button-row full-width"><button type="submit" disabled={busy}>{submitLabel}</button>{onDelete ? <button type="button" className="danger-button" onClick={onDelete} disabled={busy}>Delete article</button> : null}</div>
    </form>
  )
}

function BlockEditor({ block, onChange, onRemove, onUploadImage }: { block: BlogBlock; onChange(block: BlogBlock): void; onRemove(): void; onUploadImage(file: File | null): Promise<string> }) {
  return <article className="block-editor"><strong>{block.type}</strong>{block.type === 'heading' ? <><select value={block.level} onChange={(event) => onChange({ ...block, level: Number(event.target.value) as 1 | 2 | 3 })}><option value={1}>H1</option><option value={2}>H2</option><option value={3}>H3</option></select><input value={block.text} onChange={(event) => onChange({ ...block, text: event.target.value })} /></> : null}{block.type === 'paragraph' ? <textarea value={block.text} rows={4} onChange={(event) => onChange({ ...block, text: event.target.value })} /> : null}{block.type === 'image' ? <><input value={block.url} placeholder="Image URL" onChange={(event) => onChange({ ...block, url: event.target.value })} /><input value={block.alt} placeholder="Alt text" onChange={(event) => onChange({ ...block, alt: event.target.value })} /><input type="file" accept="image/*" onChange={(event) => void onUploadImage(event.currentTarget.files?.[0] ?? null).then((url) => onChange({ ...block, url }))} /></> : null}{block.type === 'youtube' ? <><input value={block.videoId} placeholder="Video ID or URL" onChange={(event) => onChange({ ...block, videoId: event.target.value })} /><input value={block.title ?? ''} placeholder="Title" onChange={(event) => onChange({ ...block, title: event.target.value })} /></> : null}<button type="button" className="danger-button" onClick={onRemove}>Remove</button></article>
}
function emptyDraft(): BlogArticleInput { return { title: '', slug: '', excerpt: '', blocks: [], published: false } }
function createBlock(type: BlogBlock['type']): BlogBlock { if (type === 'heading') return { type, level: 2, text: '' }; if (type === 'paragraph') return { type, text: '' }; if (type === 'image') return { type, url: '', alt: '' }; return { type, videoId: '' } }
function updateBlockAt(blocks: BlogBlock[], index: number, block: BlogBlock): BlogBlock[] { return blocks.map((item, itemIndex) => itemIndex === index ? block : item) }
function removeBlockAt(blocks: BlogBlock[], index: number): BlogBlock[] { return blocks.filter((_, itemIndex) => itemIndex !== index) }
