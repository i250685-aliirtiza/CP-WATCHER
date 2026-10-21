# CP-WATCHER

One-shot Node.js watcher for competitive programming contests and registration deadlines. It uses Codeforces' documented contest API, SQLite via `sql.js`, conservative filtering, persistent notification deduplication, and Gmail SMTP.

## Local use

Requires Node.js 20+.

```bash
cp .env.example .env
npm install
npm run init
npm run dry-run
npm test
npm run scan
npm run status
npm run upcoming
npm run deadlines
```

Set `EMAIL_ENABLED=true`, SMTP credentials, and `ALERT_EMAIL` only after deployment. Never commit `.env` or database files. `dry-run` performs HTTP discovery without writing events or notifications.

The initial adapter is Codeforces and is verified against its public API. The adapter registry is intentionally small and failures are recorded in `source_health`; additional official feeds can be added without changing storage or notification code. Routine online contests are stored and only priority/major events queue immediate alerts; Pakistan locations receive higher priority. Unknown deadlines remain null and do not trigger reminders.

## Ubuntu manual deployment

These commands are documentation for a later manual SSH session; CP-WATCHER does not connect to Oracle and does not install units automatically.

```bash
node --version
sudo useradd --system --home /opt/cp-watcher --shell /usr/sbin/nologin cpwatcher
sudo mkdir -p /opt/cp-watcher /var/lib/cp-watcher
sudo chown -R cpwatcher:cpwatcher /opt/cp-watcher /var/lib/cp-watcher
git clone https://github.com/OWNER/CP-WATCHER.git /opt/cp-watcher
cd /opt/cp-watcher
npm ci
sudo install -o cpwatcher -g cpwatcher -m 600 /dev/null /etc/cp-watcher.env
sudoedit /etc/cp-watcher.env
sudo -u cpwatcher env $(cat /etc/cp-watcher.env | xargs) node src/index.js init
sudo -u cpwatcher env $(cat /etc/cp-watcher.env | xargs) node src/index.js dry-run
sudo cp deploy/cp-watcher.service deploy/cp-watcher.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now cp-watcher.timer
systemctl status cp-watcher.timer
journalctl -u cp-watcher.service -n 100 --no-pager
sudo -u cpwatcher node src/index.js upcoming
sudo -u cpwatcher node src/index.js deadlines
sudo systemctl status flex-watcher
sudo systemctl restart cp-watcher.timer
sudo systemctl disable --now cp-watcher.timer
cd /opt/cp-watcher && git pull --ff-only && npm ci
sudo cp /var/lib/cp-watcher/cp-watcher.sqlite /var/backups/cp-watcher-$(date +%F).sqlite
```

Use Gmail SMTP with an app password (`SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_SECURE=true`, `SMTP_USER`, `SMTP_PASSWORD`, `ALERT_EMAIL`). No public inbound port is needed. Keep FLEX-WATCHER in its existing directory and verify it after changes.

## Limitations

Public pages may change or block automated requests; unsupported sources are reported rather than guessed. No registration is ever submitted. Live SMTP delivery requires credentials and was not exercised locally.
