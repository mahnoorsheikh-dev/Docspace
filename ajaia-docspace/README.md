# DocSpace

DocSpace is a responsive, MongoDB-backed collaborative document editor. It supports structured rich text, document ownership, sharing permissions, file imports, account authentication, and autosaving.

## Highlights

- Account registration, login, logout, and protected API routes
- Rich-text editing with headings, paragraphs, bold, italic, underline, and lists
- TipTap structured JSON persisted in MongoDB
- Create, rename, duplicate, open, search, download, and delete documents
- Debounced autosaving with visible save states
- `.txt`, `.md`, and `.html` imports with a maximum file size of 2 MB
- Owner, editor, and viewer document permissions
- Persistent sharing and pending email invitations
- Copy, cut, paste, undo, and redo controls
- Responsive desktop and mobile layouts

## Technology

| Layer | Technology |
| --- | --- |
| Frontend | React, Vite, TipTap |
| Backend | Node.js, Express |
| Database | MongoDB Atlas, Mongoose |
| Authentication | JWT in an HttpOnly cookie, bcrypt password hashing |
| Testing | Node.js test runner |

## Project Structure

```text
ajaia-docspace/
├── client/
│   ├── src/
│   │   ├── components/       # Editor, dialogs, navigation, and loading UI
│   │   ├── services/         # HTTP API client
│   │   ├── utils/            # Import, export, and text conversion helpers
│   │   ├── App.jsx           # Main application workflow
│   │   └── App.css           # Application styles
│   └── vite.config.js        # Development proxy configuration
└── server/
    ├── middleware/           # Authentication middleware
    ├── database.js           # Mongoose models and database connection
    ├── document-utils.js     # Shared title and content validation
    └── server.js             # Express application and API routes
```

## Prerequisites

- Node.js 18 or newer
- npm
- A MongoDB Atlas database
- A long random value for the JWT secret

## Local Setup

From the repository root:

```powershell
# Backend
cd server
npm install
Copy-Item .env.example .env
npm run dev

# Client (open a second terminal)
cd client
npm install
npm run dev
```

Development URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`
- API health check: `http://localhost:3001/api/health`

Vite proxies `/api` requests to the local Express server during development.

## Environment Configuration

### Backend: `server/.env`

```env
PORT=3001
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-host>/docspace
JWT_SECRET=<long-random-secret>
DEMO_PASSWORD=<reviewer-password>
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
NODE_ENV=development
APP_URL=http://localhost:5173
```

### Frontend: `client/.env`

```env
VITE_API_URL=http://localhost:3001
```

For a Vite-only setup, `VITE_API_URL` may be left empty to use the `/api` development proxy.

Never commit `.env` files, database credentials, or authentication secrets.

## Demo Accounts

The backend preserves the Mahnoor and Alex demo identities:

- `mahnoor@example.com`
- `alex@example.com`

To create them, configure `DEMO_PASSWORD` and run:

```powershell
cd server
npm run seed:demo
```

You may also register a new account directly through the application. Never publish real or confidential credentials in documentation.

## Core Usage

1. Register or log in.
2. Create a document or import a TXT, Markdown, or HTML text file.
3. Edit the title and rich-text content; changes autosave after 800 ms.
4. Open a document from My Documents or Shared with Me.
5. As an owner, share it by email with viewer or editor permission.
6. Copy the generated invitation link or remove access from the Share dialog.
7. Refresh the page to confirm document content and formatting persist.

## Permissions

| Action | Owner | Editor | Viewer |
| --- | --- | --- | --- |
| Read document | Yes | Yes | Yes |
| Edit title and content | Yes | Yes | No |
| Share or remove collaborators | Yes | No | No |
| Delete document | Yes | No | No |

Access decisions are enforced by the Express API rather than trusted to the browser.

## File Imports

Supported imports:

- `.txt`
- `.md`
- `.html`

The maximum file size is 2 MB. Markdown headings, bullet lists, ordered lists, and paragraphs are converted to editable TipTap JSON. HTML imports are converted to safe plain text because formatting preservation for HTML is not currently guaranteed.

DOCX and PDF imports are not supported.

## Email Sharing

A document owner can invite an email address that does not yet have a DocSpace account. The invitation is stored in MongoDB.

When the recipient registers with the matching email, the pending share is claimed automatically and the document appears under Shared with Me.

Automatic Gmail delivery is not enabled. SendGrid, Resend, Mailgun, Gmail SMTP, or another email provider must be configured before DocSpace can send email automatically. Until then, use the Share dialog's Copy link action and send the link manually.

## API Summary

All document routes require authentication.

### Authentication

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Register an account |
| POST | `/api/auth/login` | Create a session |
| GET | `/api/auth/me` | Read the current user |
| POST | `/api/auth/logout` | End the session |

### Documents and Sharing

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/health` | API health check |
| GET | `/api/documents` | List owned and shared documents |
| POST | `/api/documents` | Create a document |
| GET | `/api/documents/:id` | Read an accessible document |
| PUT | `/api/documents/:id` | Update title or structured content |
| DELETE | `/api/documents/:id` | Delete an owned document |
| GET | `/api/documents/:id/shares` | List collaborators |
| POST | `/api/documents/:id/shares` | Add or update a collaborator |
| DELETE | `/api/documents/:id/shares/:shareId` | Remove collaborator access |

## Testing

Run the server tests:

```powershell
cd server
npm test
```

Run frontend and backend checks:

```powershell
cd client
npm run build
npm run lint

cd ../server
node --check server.js
node --check database.js
npm test
```

Current automated coverage verifies structured TipTap content and document title normalization. It does not replace manual browser testing of permissions, sharing, imports, refresh persistence, or clipboard behavior.

## Deployment

### Frontend on Vercel

1. Import the repository.
2. Set the project root directory to `client`.
3. Set `VITE_API_URL` to the deployed Express API origin.
4. Build with `npm run build` and deploy the Vite output.

### Backend

Use a Node-compatible host such as Render or Railway with `server` as the service root.

Configure:

```text
PORT=<provided by host>
MONGODB_URI=<MongoDB Atlas connection string>
JWT_SECRET=<production secret>
DEMO_PASSWORD=<reviewer password>
CORS_ORIGIN=<exact deployed frontend origin>
NODE_ENV=production
APP_URL=<deployed frontend URL>
```

Run:

```powershell
npm install
npm start
```

Cross-origin production deployments require credentials enabled and `SameSite=None; Secure` cookies. Verify the frontend origin appears exactly in `CORS_ORIGIN`.

No live URL is included until an actual deployment has been created.

## Security Notes

- Keep `.env` files out of Git.
- Store MongoDB credentials and JWT secrets only in environment variables.
- Do not expose authentication secrets to the React client.
- Document mutations are restricted by server-side permission checks.
- Imported HTML text is stripped before it enters the editor.

## Additional Documentation

- Architecture: `docs/ARCHITECTURE.md`
- Submission template: `SUBMISSION.md`
- AI workflow: `docs/AI_WORKFLOW.md`
