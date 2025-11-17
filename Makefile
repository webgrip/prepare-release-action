.PHONY: default help start stop logs enter build-base build build-runtime test lint fix clean badge start-app dev run-npm docker-run images

IMAGE ?= prepare-release-action
DOCKERFILE ?= ops/action/Dockerfile
WORKDIR ?= /workspace
DOCKER ?= docker
COMPOSE ?= docker compose
# Set NO_CACHE=1 to force no-cache builds
NO_CACHE ?=

default: help

## Bring compose up, run lint, auto-fix on failure, and ensure stack is running
start:
	@echo "Tearing down any existing compose stack (remove orphans & volumes)..."
	@$(COMPOSE) down --remove-orphans --volumes || true
	@echo "Bringing up compose stack (build)..."
	@$(COMPOSE) up --build -d || true
	@echo "Running lint via compose..."
	@$(COMPOSE) run --rm prepare-release-action.lint || { echo "Lint failed, running make fix..."; $(MAKE) fix || { echo "make fix failed"; exit 1; }; echo "Rebuilding images and starting stack again..."; $(COMPOSE) up --build -d || { echo "Compose up failed after fixes"; exit 1; }; }
	@echo "Compose is up."

stop:
	@$(COMPOSE) down

logs:
	@$(COMPOSE) logs -f

enter:
	@$(COMPOSE) exec prepare-release-action.test /bin/sh || $(COMPOSE) exec prepare-release-action.lint /bin/sh

install:
	@$(DOCKER) image inspect $(IMAGE):base >/dev/null 2>&1 || $(MAKE) build-base
	@$(DOCKER) run --rm -v $(PWD):$(WORKDIR) -w $(WORKDIR) $(IMAGE):base npm install

build-base:
	@echo "Building base image '$(IMAGE):base'..."
	@$(DOCKER) build $(if $(NO_CACHE),--no-cache,) --target base -f $(DOCKERFILE) -t $(IMAGE):base .

build: build-base
	@echo "Building compiled artifacts (build stage)..."
	@$(DOCKER) build --target build -f $(DOCKERFILE) -t $(IMAGE):build .

build-runtime:
	@echo "Building runtime image '$(IMAGE):runtime'..."
	@$(DOCKER) build --target runtime -f $(DOCKERFILE) -t $(IMAGE):runtime .

test:
	@$(COMPOSE) run --rm prepare-release-action.test

lint:
	@$(COMPOSE) run --rm prepare-release-action.lint

fix: build-base
	@echo "Running eslint --fix inside '$(IMAGE):base'..."
	@$(DOCKER) run --rm -v $(PWD):$(WORKDIR) -w $(WORKDIR) $(IMAGE):base npm run fix

clean: build-base
	@echo "Cleaning project artifacts..."
	@$(DOCKER) run --rm -v $(PWD):$(WORKDIR) -w $(WORKDIR) $(IMAGE):base npm run clean

coverage:
	@echo "Ensuring base image exists and running coverage..."
	@$(DOCKER) image inspect $(IMAGE):base >/dev/null 2>&1 || $(MAKE) build-base
	@$(DOCKER) run --rm -v $(PWD):$(WORKDIR) -w $(WORKDIR) $(IMAGE):base sh -lc "npm ci --include=dev && npm run coverage"

badge: build-base
	@$(DOCKER) run --rm -v $(PWD):$(WORKDIR) -w $(WORKDIR) $(IMAGE):base npm run badge

start-app: build-runtime
	@$(DOCKER) run --rm -p 3000:3000 $(IMAGE):runtime

dev:
	@$(COMPOSE) run --rm dev

run-npm:
	@if [ -z "$(CMD)" ]; then echo "Usage: make run-npm CMD=script [ARGS='--flag']"; exit 1; fi
	@$(DOCKER) image inspect $(IMAGE):base >/dev/null 2>&1 || $(MAKE) build-base
	@$(DOCKER) run --rm -v $(PWD):$(WORKDIR) -w $(WORKDIR) $(IMAGE):base sh -lc "if [ -f package-lock.json ]; then npm ci --include=dev; else npm install; fi && npm run $(CMD) -- $(ARGS)"

docker-run:
	@if [ -z "$(CMD)" ]; then echo "Usage: make docker-run CMD='ls -al'"; exit 1; fi
	@$(DOCKER) image inspect $(IMAGE):base >/dev/null 2>&1 || $(MAKE) build-base
	@$(DOCKER) run --rm -v $(PWD):$(WORKDIR) -w $(WORKDIR) $(IMAGE):base sh -c '$(CMD)'

images:
	@$(DOCKER) images --filter=reference='$(IMAGE)*'

help:
	@echo "\nUsage: make <target> [VARIABLE=value]\n"
	@echo "Targets:"
	@echo "  start        Bring up compose stack, run lint, and auto-fix if needed"
	@echo "  stop         Stop docker-compose stack"
	@echo "  logs         Tail compose logs"
	@echo "  enter        Open shell in test or lint container"
	@echo "  build-base   Build base image (dev deps)"
	@echo "  build        Build compiled artifacts (build stage)"
	@echo "  build-runtime Build production runtime image"
	@echo "  test         Run test suite via compose"
	@echo "  lint         Run linter via compose"
	@echo "  fix          Run eslint --fix in container"
	@echo "  clean        Clean build artifacts"
	@echo "  start-app    Run runtime image locally on port 3000"
	@echo "  dev          Run dev service (mounted workspace)"
	@echo "  run-npm      Run an npm script inside container: CMD=test ARGS=..."
	@echo "  docker-run   Run arbitrary shell in container: CMD='ls -al'"
	@echo "  images       List docker images for this project"
	@echo "\nExamples:"
	@echo "  make test"
	@echo "  make coverage"
	@echo "  make run-npm CMD=build"
