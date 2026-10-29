# DocSpace Architecture

## Frontend

The React/Vite client is a single-page application. `client/src/App.jsx` manages registration and login, document navigation, title and content state, debounced autosaving, text imports, responsive UI, and sharing dialogs. TipTap extensions render structured rich text and expose the toolbar.

During development, Vite proxies `/api` to Express. Production clients send requests to the backend configured by `VITE_API_URL`; browser requests include credentials so the authentication cookie is available.

## Backend and authentication

Express is implemented in `server/server.js`. Users register or log in through `/api/auth/*`. The server issues a signed JWT in an HttpOnly, SameSite cookie named `docspace_token`. The JWT subject identifies the MongoDB user; document routes never trust a client-selected user ID or a legacy `x-user-id` header.

Credentialed CORS is configured through `CORS_ORIGIN`. JSON bodies are parsed by Express, and authentication middleware protects document, user, and sharing routes.

## Database

Mongoose connects to MongoDB Atlas. `server/database.js` defines User, Document, and DocumentShare models.

Documents store:

- `title`: string
- `content`: TipTap-compatible JSON object
- `owner_id`: numeric owner ID retained for compatibility
- timestamps
- sharing records keyed by document and numeric user IDs

User password values are bcrypt hashes; normal user queries exclude password hash fields.

## Permissions

Every document access check reads the authenticated user from the JWT rather than the request UI.

- Owners can read, edit, share, and delete documents.
- Editors can read and update shared documents.
- Viewers can read shared documents but cannot update them.
- Only owners can manage sharing or delete documents.
- The backend rejects unauthorized mutations with an appropriate HTTP error.

MongoDB is authoritative; browser state is not a source of truth and is not copied to localStorage as the only document copy.

## Saving and imports

Title and structured TipTap JSON are sent through debounced `PUT /api/documents/:id` requests. The UI displays Saving, Saved, and Save failed states. `.txt` and `.md` files are converted into editable paragraph JSON before the document is created. `.html` import is practical text import only and should be limited to sanitized editor content.

## Deployment boundaries

Vercel hosts the static frontend with `VITE_API_URL`. A compatible Node host runs the Express API. Production requires a separate MongoDB URI, JWT secret, configured production origin, and secure cookie settings.
