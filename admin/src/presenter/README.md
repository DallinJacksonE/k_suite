# presenter

Presenters own interaction behavior for admin workflows:
- validate form input
- call service interfaces
- convert backend failures into view state
- keep React components thin and render-focused

Avoid importing React here so presenter behavior stays unit-testable without the DOM.
