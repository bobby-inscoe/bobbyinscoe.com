## Bobby Inscoe Site

Repository for the site at bobbyinscoe.com, built with React, TypeScript, and Vite.

## Local development

Install dependencies, then start the Vite development server:

```sh
npm install
npm run dev
```

Open http://localhost:5173. The page reloads automatically as source files change.

Other useful commands:

```sh
npm run build    # Create a production build in dist/
npm run preview  # Serve the production build at http://localhost:4173
npm run start    # Alias for npm run dev
npm run typecheck # Check TypeScript types
```

GitHub Pages hosts the deployed production build; it is not used for local development.
## Textile workshop experiment

The experimental portfolio opens at `/`; Duck Feed remains playable at
`/duck-feed`. The workshop's visual choices, project content, accessibility
behavior, and verification notes are in [docs/textile-workshop.md](docs/textile-workshop.md).

## UI components

Use [Mantine Core](https://mantine.dev/core/package/) for controls and layouts.
The provider is already installed for every route. Import components directly
from `@mantine/core` and hooks from `@mantine/hooks`.

- Theme and component defaults: `src/app/theme.ts`.
- Responsive dialog and layout example: `src/features/workshop/components/project-folio.tsx`.
- Radio groups, buttons, and a tooltip: `src/features/duck-feed/components/start-screen.tsx`.

Use component props for spacing, sizing, colours, and typography. Keep custom CSS
for the workshop's perspective, material treatment, and game motion. No additional
Mantine styles import is needed when using another core component.
