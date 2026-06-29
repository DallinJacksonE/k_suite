# views

Views are React components. They should hold local UI state, render forms/results, and forward user intent to presenters.

Keep backend calls and business rules out of these components; put those in `service/` and `presenter/`.
