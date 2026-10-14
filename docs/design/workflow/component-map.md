# Component map

Baseline: 2f4f8cb980fe46de3d25f688e422e753d490005d. Direct build; there
are no Figma nodes to map.

| Element | Implementation | Decision |
| --- | --- | --- |
| App shell | app/app.vue, DashboardNav.vue | Keep reader shell; add dashboard rail and mobile bar |
| Today | app/pages/index.vue | Derive next learning and counts from existing APIs |
| Library | app/pages/library.vue | Preserve the former root shelf |
| Work / Ideas / Studio | WorkBoard.vue, WorkComposer.vue | Share source components and local work-item API |
| Journal | LearningCapture.vue, app/pages/journal.vue | Save explanation and show attempt history |
| Forms and surfaces | app/components/ui | shadcn-vue Button, Input, Textarea, Badge, Card, Sheet |
| Reader context | ChapterNav.vue | Preserve notebook navigation; change shelf link |
| Theme | app/app.vue, app/assets/css/tailwind.css | Keep Kimo tokens; isolate colliding shadcn tokens |
