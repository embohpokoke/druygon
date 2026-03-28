ROOT_DIR := /root/druygon.my.id
APP_DIR := $(ROOT_DIR)/api
PM2_APP := druygon-ai

.PHONY: up down restart status logs smoke deploy

up:
	@pm2 restart $(PM2_APP) >/dev/null 2>&1 || (cd $(APP_DIR) && pm2 start ecosystem.config.js --only $(PM2_APP))
	@echo "PASS $(PM2_APP) running"

down:
	@pm2 stop $(PM2_APP)
	@echo "PASS $(PM2_APP) stopped"

restart:
	@pm2 restart $(PM2_APP)
	@echo "PASS $(PM2_APP) restarted"

status:
	@pm2 describe $(PM2_APP)

logs:
	@pm2 logs $(PM2_APP)

smoke:
	@/root/scripts/smoke-test.sh druygon

deploy:
	@git -C $(ROOT_DIR) pull --ff-only
	@pm2 restart $(PM2_APP)
	@sleep 3
	@$(MAKE) smoke
