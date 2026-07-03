# IP Checker

A private link-tracking web app. Each unique link
(`/check?agent_id=ABC123`) tracks how many times it has been
opened and whether each visiting IP address is new ("Unique")
or has been seen before ("Duplicate") for that specific agent ID.

## Project Structure

```
ip-checker/
├── config/
│   └── db.js              # MySQL connection pool
├── controllers/
│   └── checkController.js # Business logic for the check flow
├── middleware/
│   ├── validateAgent.js   # Validates agent_id query param
│   └── extractIp.js       # Extracts visitor's real IP
├── models/
│   ├── agentModel.js       # SQL for `agents` table
│   └── visitorModel.js     # SQL for `visitors` table
├── routes/
│   └── checkRoutes.js      # /api/check route definition
├── public/
│   ├── check.html           # Frontend page
│   ├── css/style.css
│   └── js/check.js          # Reads agent_id, calls API, renders result
├── schema.sql               # Database schema
├── server.js                # App entry point
├── package.json
├── .env.example
└── README.md
```

## Requirements

- Node.js 18+
- MySQL 8.0+ (or MariaDB 10.4+)

## 1. Install dependencies

```bash
cd ip-checker
npm install
```

## 2. Set up the database

Create the database and tables using the provided schema:

```bash
mysql -u root -p < schema.sql
```

This creates a database named `ip_checker` with two tables: `agents` and `visitors`.

It's recommended to create a dedicated MySQL user with limited privileges rather than using root:

```sql
CREATE USER 'ip_checker_user'@'localhost' IDENTIFIED BY 'a_strong_password';
GRANT SELECT, INSERT, UPDATE ON ip_checker.* TO 'ip_checker_user'@'localhost';
FLUSH PRIVILEGES;
```

## 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your database credentials:

```
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=ip_checker_user
DB_PASSWORD=a_strong_password
DB_NAME=ip_checker
```

## 4. Run the app

Development (auto-restart on file changes):

```bash
npm run dev
```

Production:

```bash
npm start
```

The server starts on `http://localhost:3000` by default.

## 5. Try it out

Open a browser to:

```
http://localhost:3000/check?agent_id=ABC123
```

Reload the page — the `Link Open Count` increases each time,
while `IP Status` stays `Duplicate` after the first load (since
your IP doesn't change). Visiting with a different `agent_id`
or from a different IP produces a fresh `Unique` result.

## API

### `GET /api/check?agent_id=<id>`

**Success response** `200 OK`:

```json
{
  "success": true,
  "data": {
    "agent_id": "ABC123",
    "open_count": 4,
    "ip_address": "203.0.113.42",
    "ip_status": "Duplicate"
  }
}
```

**Error responses**:

- `400 Bad Request` — missing or invalid `agent_id`
- `429 Too Many Requests` — rate limit exceeded
- `500 Internal Server Error` — unexpected server/database error

## Security notes

- **SQL injection**: every database query uses parameterized
  placeholders (`?`) via `mysql2`'s prepared statements. User
  input is never concatenated into SQL strings.
- **Input validation**: `agent_id` is validated against a strict
  allow-list pattern (`[A-Za-z0-9_-]{3,64}`) before it touches
  any business logic.
- **Race-condition safety**: the "Unique vs Duplicate" check
  uses `INSERT IGNORE` against a `UNIQUE(agent_id, ip_address)`
  key, so two simultaneous requests from the same IP can never
  both be recorded as unique.
- **Reverse proxy**: if deploying behind Nginx/Heroku/AWS/
  Cloudflare, keep `app.set('trust proxy', true)` in
  `server.js` so `req.ip` reflects the real client IP from
  `X-Forwarded-For` rather than the proxy's address. Make sure
  your proxy is configured to strip/overwrite any
  client-supplied `X-Forwarded-For` header so it can't be
  spoofed.
- **Rate limiting**: basic per-IP rate limiting is applied to
  `/api/*` via `express-rate-limit`; tune `windowMs`/`max` in
  `server.js` for your expected traffic.
- **Security headers**: `helmet` sets a set of sane default
  HTTP security headers.
- **HTTPS**: terminate TLS (e.g. via Nginx, Caddy, or your
  hosting provider) in front of this app in production — the
  app itself serves plain HTTP.

## Notes on IP detection

Determining a visitor's "true" public IP is only as reliable as
the network path allows:

- If deployed directly (no proxy), `req.ip` is the real socket
  peer address.
- If deployed behind a load balancer/CDN, the real IP typically
  arrives in `X-Forwarded-For`; Express derives `req.ip` from it
  automatically once `trust proxy` is enabled and configured to
  trust only your actual proxy hops.
- IPv6 addresses are supported (the `ip_address` column is
  `VARCHAR(45)`, wide enough for the longest possible IPv6
  representation).
