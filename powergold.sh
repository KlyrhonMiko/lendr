#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  ./powergold.sh [command]

Commands:
  help           Show this help
  db-up          Start shared Postgres + Adminer
  db-down        Stop shared DB stack
  db-ps          Show shared DB services
  db-logs        Tail shared DB logs
  lan-go         Build/start LAN stack and print URL
  lan-up         Build/start LAN stack
  lan-down       Stop LAN stack
  lan-ps         Show LAN services
  lan-logs       Tail LAN logs
  lan-bootstrap  Run one-shot bootstrap service
  lan-migrate    Run alembic upgrade head
  lan-seed       Seed configuration
  lan-cert       Generate LAN certificates if missing
  lan-url        Print LAN URL

Run without arguments to open the menu.
EOF
}

run_make() {
  make "$@"
}

if [[ $# -gt 0 ]]; then
  case "$1" in
    help|-h|--help) usage ;;
    db-up|db-down|db-ps|db-logs|lan-go|lan-up|lan-down|lan-ps|lan-logs|lan-bootstrap|lan-migrate|lan-seed|lan-cert|lan-url)
      run_make "$1"
      ;;
    *)
      usage
      exit 1
      ;;
  esac
  exit 0
fi

while true; do
  clear
  cat <<'EOF'
========================================
  PowerGold Launcher
========================================

  1. Start DB Stack
  2. Stop DB Stack
  3. DB Status
  4. DB Logs
  5. Start LAN Stack
  6. Stop LAN Stack
  7. LAN Status
  8. LAN Logs
  9. Bootstrap
  10. Run Migrations
  11. Seed Configuration
  12. Generate Certificates
  13. Show LAN URL
  14. Exit

EOF

  read -rp "Choose an option: " choice

  case "$choice" in
    1) run_make db-up ;;
    2) run_make db-down ;;
    3) run_make db-ps ;;
    4) run_make db-logs ;;
    5) run_make lan-go ;;
    6) run_make lan-down ;;
    7) run_make lan-ps ;;
    8) run_make lan-logs ;;
    9) run_make lan-bootstrap ;;
    10) run_make lan-migrate ;;
    11) run_make lan-seed ;;
    12) run_make lan-cert ;;
    13) run_make lan-url ;;
    14) exit 0 ;;
    *)
      printf 'Invalid selection.\n'
      ;;
  esac

  printf '\nPress Enter to continue...'
  read -r _
done
