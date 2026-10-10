# Draft only (Brief 40, 2026-10-10). Not built here: the sandbox has no Docker
# daemon, so the sizes in ANALYSIS.md come from a venv measured with pip.
#
# Two variants from one file: the default has no torch (the deterministic
# engine, FTS5 search, an Ollama embedder on the host); --build-arg
# WITH_EMBEDDER=1 adds sentence-transformers and CPU torch (about +1.1 GB).
FROM python:3.13-slim AS build
ARG WITH_EMBEDDER=0
ENV PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /app
COPY requirements.txt pyproject.toml ./
# requirements.txt lists sentence-transformers, which pulls torch. The default
# image filters it out; the embedder build keeps it and takes the CPU wheels.
RUN python -m venv /venv \
 && if [ "$WITH_EMBEDDER" = "1" ]; then \
      /venv/bin/pip install --extra-index-url https://download.pytorch.org/whl/cpu torch \
      && /venv/bin/pip install -r requirements.txt; \
    else \
      grep -vE '^(sentence-transformers|pytest|httpx|torch)' requirements.txt > /tmp/req.txt \
      && /venv/bin/pip install -r /tmp/req.txt; \
    fi
COPY src ./src
COPY frontend ./frontend
COPY migrations ./migrations
COPY alembic.ini ./
RUN /venv/bin/pip install --no-deps -e .

FROM python:3.13-slim
RUN useradd --create-home --uid 1000 mm
COPY --from=build /venv /venv
COPY --from=build /app /app
WORKDIR /app
# One volume holds everything the person owns: the database, attachments, the
# LAN certificate, backups. Models live in a second volume so an upgrade or a
# reset of the notebook never re-downloads gigabytes.
ENV PATH=/venv/bin:$PATH \
    PYTHONPATH=/app/src \
    MEMORYMAP_DATA_DIR=/data \
    HF_HOME=/models/hf \
    SENTENCE_TRANSFORMERS_HOME=/models/hf \
    OLLAMA_URL=http://host.docker.internal:11434
VOLUME ["/data", "/models"]
EXPOSE 8000 8443
USER mm
# __main__.py binds 127.0.0.1 by design (HOST constant, line 32), and
# netbind.bind_host only widens it when the LAN preference is on and a
# password exists. Inside a container the browser reaches the app through
# Docker's bridge, so every request is "from the network" and an app with no
# password yet answers 403 (SEC-01). Until the app grows MEMORYMAP_BIND and a
# first-password environment variable (the plan row), this image cannot be
# used without a seeded preferences.json; see compose.yaml.
CMD ["python", "-m", "memorymap"]
