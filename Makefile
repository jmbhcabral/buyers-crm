.PHONY: up down logs rebuild migrate revision seed shell db-shell psql fmt lint test

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f backend

rebuild:
	docker compose up -d --build

migrate:
	docker compose exec backend alembic upgrade head

revision:
	docker compose exec backend alembic revision --autogenerate -m "$(m)"

seed:
	docker compose exec backend python -m scripts.seed

shell:
	docker compose exec backend bash

psql:
	docker compose exec db psql -U buyers -d buyers_crm

fmt:
	docker compose exec backend ruff format .
	docker compose exec backend ruff check --fix .

lint:
	docker compose exec backend ruff check .

test:
	docker compose exec backend pytest -v