# CP-WATCHER

CP-WATCHER is a one-shot Node.js 20+ service that discovers competitive-programming contests, stores normalized event data in SQLite, and sends Gmail notifications for important new events and verified registration deadlines. It never registers anyone automatically.

## Sources and limits

Live adapters include Codeforces, AtCoder, CodeChef, LeetCode, and best-effort public RSS adapters for ICPC, CALICO, IEEEXtreme, Meta Hacker Cup, plus `CP_WATCHER_EVENT_FEEDS` for trusted official RSS/Atom feeds. Source failures are isolated and recorded in `source_health`; feeds can change or block automation. Pakistani in-person events are supported through configured official feeds/pages when available. Unknown or ambiguous deadlines remain null.

Events are filtered to algorithmic programming opportunities. Islamabad/Rawalpindi receive highest priority, followed by nearby Pakistan locations, other Pakistan locations, and online events. Repeated events are deduplicated by stable source IDs.

## Local setup

```bash
cp .env.example .env
npm ci
npm run init
npm run dry-run
npm test
npm run scan
npm run status
npm run upcoming
npm run deadlines
```

`dry-run` performs live discovery without changing the database or notification state. Configure `EMAIL_ENABLED=true`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` (Gmail App Password), and `ALERT_EMAIL` before `npm run test-email`. Credentials are never logged or committed.

Discovery alerts are queued for major or high-priority events. Verified deadlines queue a threshold-based reminder between 24 and 120 hours before closing; a final 24-hour reminder may also be queued. Each `(event,type,deadline)` is sent at most once normally, and failures remain retryable with bounded attempts.

## Ubuntu 24.04 deployment

```bash
sudo apt update && sudo apt install -y git
sudo useradd --system --home /opt/cp-watcher --shell /usr/sbin/nologin cpwatcher
sudo mkdir -p /opt/cp-watcher /var/lib/cp-watcher
sudo chown -R cpwatcher:cpwatcher /opt/cp-watcher /var/lib/cp-watcher
git clone https://github.com/i250685-aliirtiza/CP-WATCHER.git /opt/cp-watcher
cd /opt/cp-watcher && npm ci
sudo install -o cpwatcher -g cpwatcher -m 600 /dev/null /etc/cp-watcher.env
sudoedit /etc/cp-watcher.env
sudo -u cpwatcher env $(sudo cat /etc/cp-watcher.env | tr '\n' ' ') /usr/bin/node src/index.js init
sudo -u cpwatcher env $(sudo cat /etc/cp-watcher.env | tr '\n' ' ') /usr/bin/node src/index.js dry-run
sudo cp deploy/cp-watcher.service deploy/cp-watcher.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now cp-watcher.timer
systemctl status cp-watcher.timer
journalctl -u cp-watcher.service -n 100 --no-pager
```

Set `DATABASE_PATH=/var/lib/cp-watcher/cp-watcher.sqlite` in `/etc/cp-watcher.env`. The service uses `/opt/cp-watcher`, user `cpwatcher`, and a four-hour timer; it opens no port and does not affect FLEX-WATCHER. For an explicit SMTP diagnostic use `sudo -u cpwatcher systemctl start cp-watcher.service` only after configuration, or run `node src/index.js test-email` with the environment loaded.

Update safely: back up `/var/lib/cp-watcher/cp-watcher.sqlite`, stop/disable only `cp-watcher.timer`, run `git pull --ff-only && npm ci`, then re-enable the timer. Restore by stopping the timer and replacing the database with a verified backup. Disable with `sudo systemctl disable --now cp-watcher.timer`; FLEX-WATCHER remains untouched.

Repository: https://github.com/i250685-aliirtiza/CP-WATCHER

