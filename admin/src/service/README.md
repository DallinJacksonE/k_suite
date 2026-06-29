# service

Service classes hide transport details from the admin UI. React views and presenters should depend on the `AdminApiService` contract instead of calling `fetch` directly.

Current implementation:
- `FetchAdminApiService` calls relative `/api` endpoints through the admin frontend proxy.
- Cookie-based admin session calls use `credentials: 'include'`.
