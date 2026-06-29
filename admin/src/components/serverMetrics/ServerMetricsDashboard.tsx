import type { ApiEndpointDoc, ServiceHealthReport } from '../../service/AdminApiService'
import { Panel } from '../layout/Panel'

interface ServerMetricsDashboardProps { backendStatus: string; endpoints: ApiEndpointDoc[]; health: ServiceHealthReport | null; busy: boolean; onRefresh(): void }

export function ServerMetricsDashboard({ backendStatus, endpoints, health, busy, onRefresh }: ServerMetricsDashboardProps) {
  return (
    <div className="category-stack">
      <Panel title="Service health" description="Health of the backend and dependent services."><button type="button" onClick={onRefresh} disabled={busy}>Refresh health</button><p><strong>Backend:</strong> {backendStatus}</p>{health ? <><p><strong>Overall:</strong> {health.status} at {health.checkedAt}</p><div className="metric-grid">{health.services.map((service) => <div className="metric-card" key={service.name}><span>{service.name}</span><strong>{service.status}</strong>{service.message ? <small>{service.message}</small> : null}</div>)}</div></> : <p>Service health not loaded.</p>}</Panel>
      <Panel title="API surface" description="Loaded from /api/docs."><p>{endpoints.length} endpoints exposed.</p><div className="endpoint-list">{endpoints.map((endpoint) => <article key={`${endpoint.method}-${endpoint.path}`}><code>{endpoint.method}</code><span>{endpoint.path}</span><p>{endpoint.summary}</p></article>)}</div></Panel>
    </div>
  )
}
