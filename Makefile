SHELL := /bin/bash

LAN_COMPOSE := docker compose -f docker-compose.lan.yml

.PHONY: help
help:
	@echo "Lendr LAN helpers"
	@echo ""
	@echo "Targets:"
	@echo "  make lan-up           # Build/start LAN stack (single command)"
	@echo "  make lan-go           # Start stack and print access URL"
	@echo "  make lan-ps           # Show LAN stack services"
	@echo "  make lan-logs         # Tail LAN stack logs"
	@echo "  make lan-migrate      # Run alembic upgrade head"
	@echo "  make lan-seed         # Seed configuration"
	@echo "  make lan-bootstrap    # One-shot bootstrap (postgres + migrate + init)"
	@echo "  make lan-url          # Print access URL for other devices"
	@echo "  make lan-adminer-up   # Start Adminer on localhost:8080 (optional)"
	@echo "  make lan-adminer-down # Stop optional Adminer"
	@echo "  make lan-adminer-url  # Print Adminer access URL"
	@echo "  make lan-down         # Stop LAN stack"

.PHONY: lan-up
lan-up:
	$(LAN_COMPOSE) up --build -d --remove-orphans

.PHONY: lan-go
lan-go: lan-up lan-url

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
lan-bootstrap:
	$(LAN_COMPOSE) up -d postgres
	$(LAN_COMPOSE) run --rm --build backend python data/bootstrap_system.py

.PHONY: lan-url
lan-url:
	@LAN_IP=$$(ip -4 route get 1.1.1.1 2>/dev/null | awk '/src/ {for (i=1; i<=NF; i++) if ($$i=="src") {print $$(i+1); exit}}'); \
	if [[ -z "$$LAN_IP" ]]; then \
		LAN_IP=$$(hostname -I 2>/dev/null | awk '{print $$1}'); \
	fi; \
	if [[ -z "$$LAN_IP" ]]; then \
		LAN_IP=$$(ip -4 addr show scope global 2>/dev/null | awk '/inet / {sub("/.*", "", $$2); print $$2; exit}'); \
	fi; \
	if [[ -z "$$LAN_IP" ]]; then \
		echo "Could not determine LAN IP automatically."; \
		echo "Run: ip -4 addr show"; \
		exit 1; \
	fi; \
	echo "Open from other devices on the same network:"; \
	echo "  http://$$LAN_IP"

.PHONY: lan-adminer-up
lan-adminer-up:
	$(LAN_COMPOSE) --profile adminer up -d adminer

.PHONY: lan-adminer-down
lan-adminer-down:
	$(LAN_COMPOSE) --profile adminer stop adminer

.PHONY: lan-adminer-url
lan-adminer-url:
	@echo "Adminer (host machine only):"
	@echo "  http://localhost:8080"

.PHONY: lan-down
lan-down:
	$(LAN_COMPOSE) --profile adminer down --remove-orphans
