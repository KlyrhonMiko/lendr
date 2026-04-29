SHELL := /bin/bash

LAN_HOSTNAME ?= powergold.home.arpa
DB_COMPOSE := docker compose -f docker-compose.yml
LAN_COMPOSE := docker compose --env-file .env.deploy -f docker-compose.deploy.yml
LAN_BUILD_SERVICES := bootstrap backend frontend

.PHONY: help
help:
	@echo "PowerGold Docker helpers"
	@echo ""
	@echo "Targets:"
	@echo "  make db-up            # Start shared Postgres + Adminer"
	@echo "  make db-ps            # Show shared DB stack services"
	@echo "  make db-logs          # Tail shared DB stack logs"
	@echo "  make db-adminer-url   # Print Adminer access URL"
	@echo "  make db-down          # Stop shared DB stack"
	@echo "  make lan-up           # Build/start LAN app stack"
	@echo "  make lan-go           # lan-up + print access URL"
	@echo "  make lan-validate     # Validate LAN compose config"
	@echo "  make lan-build        # Build LAN app images"
	@echo "  make lan-ps           # Show LAN stack services"
	@echo "  make lan-logs         # Tail LAN stack logs"
	@echo "  make lan-migrate      # Run alembic upgrade head"
	@echo "  make lan-seed         # Seed configuration"
	@echo "  make lan-bootstrap    # Run one-shot bootstrap service"
	@echo "  make lan-cert         # Generate self-signed certificates for $(LAN_HOSTNAME)"
	@echo "  make lan-url          # Print hostname and fallback IP URL"
	@echo "  make lan-down         # Stop LAN stack"
	@echo "  make dev-up           # Alias for db-up"
	@echo "  make dev-down         # Alias for db-down"

.PHONY: db-up
db-up:
	$(DB_COMPOSE) up -d --remove-orphans

.PHONY: db-ps
db-ps:
	$(DB_COMPOSE) ps

.PHONY: db-logs
db-logs:
	$(DB_COMPOSE) logs -f --tail=200

.PHONY: db-adminer-url
db-adminer-url:
	@echo "Adminer (host machine only):"
	@echo "  http://localhost:8080"

.PHONY: db-down
db-down:
	$(DB_COMPOSE) down --remove-orphans

.PHONY: lan-up
lan-up: db-up lan-cert lan-build
	$(LAN_COMPOSE) up -d --remove-orphans --wait

.PHONY: lan-init
lan-init: db-up lan-build
	$(LAN_COMPOSE) run --rm bootstrap

.PHONY: lan-go
lan-go: lan-up lan-url

.PHONY: lan-validate
lan-validate:
	@$(LAN_COMPOSE) config >/dev/null

.PHONY: lan-build
lan-build: lan-validate
	$(LAN_COMPOSE) build $(LAN_BUILD_SERVICES)

.PHONY: lan-ps
lan-ps:
	$(LAN_COMPOSE) ps

.PHONY: lan-logs
lan-logs:
	$(LAN_COMPOSE) logs -f --tail=200

.PHONY: lan-migrate
lan-migrate:
	$(LAN_COMPOSE) exec backend alembic upgrade head

.PHONY: lan-seed
lan-seed:
	$(LAN_COMPOSE) exec backend python data/seed_configuration.py

.PHONY: lan-bootstrap
lan-bootstrap: db-up lan-cert lan-build
	$(LAN_COMPOSE) run --rm bootstrap

.PHONY: lan-cert
lan-cert:
	@if [ ! -f frontend/certificates/localhost.pem ] || [ ! -f frontend/certificates/localhost-key.pem ]; then \
		LAN_IP=$$(ip -4 route get 1.1.1.1 2>/dev/null | awk '/src/ {for (i=1; i<=NF; i++) if ($$i=="src") {print $$(i+1); exit}}'); \
		if [ -z "$$LAN_IP" ] || [[ "$$LAN_IP" =~ ^169\.254\. ]] || [ "$$LAN_IP" = "127.0.0.1" ]; then \
			LAN_IP=$$(ip -4 addr show scope global 2>/dev/null | awk '/inet / {sub("/.*", "", $$2); if ($$2 !~ /^169\.254\./ && $$2 != "127.0.0.1") {print $$2; exit}}'); \
		fi; \
		if [ -z "$$LAN_IP" ]; then \
			echo "Could not determine a usable LAN IPv4 address automatically."; \
			exit 1; \
		fi; \
		echo "Generating certificates for $(LAN_HOSTNAME) and $$LAN_IP..."; \
		mkdir -p frontend/certificates; \
		openssl req -x509 -newkey rsa:2048 -keyout frontend/certificates/localhost-key.pem -out frontend/certificates/localhost.pem -days 365 -nodes -subj "/CN=$(LAN_HOSTNAME)" -addext "subjectAltName=DNS:$(LAN_HOSTNAME),DNS:localhost,IP:127.0.0.1,IP:$$LAN_IP"; \
	else \
		echo "Certificates already exist in frontend/certificates/"; \
	fi

.PHONY: lan-url
lan-url:
	@LAN_IP=$$(ip -4 route get 1.1.1.1 2>/dev/null | awk '/src/ {for (i=1; i<=NF; i++) if ($$i=="src") {print $$(i+1); exit}}'); \
	if [[ -z "$$LAN_IP" || "$$LAN_IP" =~ ^169\.254\. || "$$LAN_IP" == 127.0.0.1 ]]; then \
		LAN_IP=$$(ip -4 addr show scope global 2>/dev/null | awk '/inet / {sub("/.*", "", $$2); if ($$2 !~ /^169\.254\./ && $$2 != "127.0.0.1") {print $$2; exit}}'); \
	fi; \
	if [[ -z "$$LAN_IP" ]]; then \
		echo "Could not determine a usable LAN IPv4 address automatically."; \
		echo "Run: ip -4 addr show"; \
		exit 1; \
	fi; \
	echo "Open from other devices on the same network:"; \
	echo "  https://$(LAN_HOSTNAME)"; \
	echo "Fallback while DNS is not configured:"; \
	echo "  https://$$LAN_IP"

.PHONY: lan-down
lan-down:
	$(LAN_COMPOSE) down --remove-orphans

.PHONY: dev-up
dev-up:
	$(MAKE) db-up

.PHONY: dev-down
dev-down:
	$(MAKE) db-down
