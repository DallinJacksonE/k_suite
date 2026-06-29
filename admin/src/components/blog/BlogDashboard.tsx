import { useState } from 'react'
import type { BlogArticleRecord, BlogBlock } from '../../service/AdminApiService'
import { Panel } from '../layout/Panel'

interface BlogDashboardProps { articles: BlogArticleRecord[]; busy: boolean; onCreate(input: { title: string; slug: string; excerpt: string; blocks: BlogBlock[]; published?: boolean }): void; onUploadImage(file: File | null): Promise<string>; onRefresh(): void }

export function BlogDashboard({ articles, busy, onCreate, onUploadImage, onRefresh }: BlogDashboardProps) {
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [blocks, setBlocks] = useState<BlogBlock[]>([])
  const addBlock = (type: BlogBlock['type']) => setBlocks((current) => [...current, createBlock(type)])
  const updateBlock = (index: number, block: BlogBlock) => setBlocks((current) => current.map((item, itemIndex) => itemIndex === index ? block : item))
  const removeBlock = (index: number) => setBlocks((current) => current.filter((_, itemIndex) => itemIndex !== index))
  return (
    <div className="category-stack">
      <Panel title="Write blog article" description="Compose an article from headings, paragraphs, images, and embedded YouTube videos.">
        <div className="form-grid"><label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} /></label><label>Slug<input value={slug} onChange={(event) => setSlug(event.target.value)} /></label><label>Excerpt<textarea value={excerpt} onChange={(event) => setExcerpt(event.target.value)} rows={3} /></label></div>
        <div className="button-row"><button type="button" onClick={() => addBlock('heading')}>Add heading</button><button type="button" onClick={() => addBlock('paragraph')}>Add paragraph</button><button type="button" onClick={() => addBlock('image')}>Add image</button><button type="button" onClick={() => addBlock('youtube')}>Add YouTube</button></div>
        <div className="block-stack">{blocks.map((block, index) => <BlockEditor key={index} block={block} onChange={(next) => updateBlock(index, next)} onRemove={() => removeBlock(index)} onUploadImage={onUploadImage} />)}</div>
        <button type="button" disabled={busy} onClick={() => onCreate({ title, slug, excerpt, blocks, published: false })}>Save draft</button>
      </Panel>
      <Panel title="Articles"><button type="button" onClick={onRefresh} disabled={busy}>Refresh articles</button>{articles.length ? <ul className="result-list">{articles.map((article) => <li key={article.articleId}><strong>{article.title}</strong><span>{article.slug}</span><span>{article.published ? 'Published' : 'Draft'} · {article.blocks.length} blocks</span></li>)}</ul> : <p>No blog articles loaded.</p>}</Panel>
    </div>
  )
}
function BlockEditor({ block, onChange, onRemove, onUploadImage }: { block: BlogBlock; onChange(block: BlogBlock): void; onRemove(): void; onUploadImage(file: File | null): Promise<string> }) {
  return <article className="block-editor"><strong>{block.type}</strong>{block.type === 'heading' ? <><select value={block.level} onChange={(event) => onChange({ ...block, level: Number(event.target.value) as 1 | 2 | 3 })}><option value={1}>H1</option><option value={2}>H2</option><option value={3}>H3</option></select><input value={block.text} onChange={(event) => onChange({ ...block, text: event.target.value })} /></> : null}{block.type === 'paragraph' ? <textarea value={block.text} rows={4} onChange={(event) => onChange({ ...block, text: event.target.value })} /> : null}{block.type === 'image' ? <><input value={block.url} placeholder="Image URL" onChange={(event) => onChange({ ...block, url: event.target.value })} /><input value={block.alt} placeholder="Alt text" onChange={(event) => onChange({ ...block, alt: event.target.value })} /><input type="file" accept="image/*" onChange={(event) => void onUploadImage(event.currentTarget.files?.[0] ?? null).then((url) => onChange({ ...block, url }))} /></> : null}{block.type === 'youtube' ? <><input value={block.videoId} placeholder="Video ID or URL" onChange={(event) => onChange({ ...block, videoId: event.target.value })} /><input value={block.title ?? ''} placeholder="Title" onChange={(event) => onChange({ ...block, title: event.target.value })} /></> : null}<button type="button" className="danger-button" onClick={onRemove}>Remove</button></article>
}
function createBlock(type: BlogBlock['type']): BlogBlock { if (type === 'heading') return { type, level: 2, text: '' }; if (type === 'paragraph') return { type, text: '' }; if (type === 'image') return { type, url: '', alt: '' }; return { type, videoId: '' } }
