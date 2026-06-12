# =============================================================================
# Image Analysis for Plant Phenotyping — training container
#
# Ships the full Python / command-line stack (scikit-image, OpenCV, PlantCV,
# scikit-learn, PyTorch, Ultralytics YOLO, SAM, Open3D, JupyterLab) so a
# participant needs only Docker — no local conda or pip. Built from the same
# env/environment.yml as the native install, so the two stay in sync.
#
# Build:  docker build -t phenotyping-training .
# Run:    docker run --rm -p 127.0.0.1:8888:8888 \
#                 -e JUPYTER_TOKEN=phenotyping \
#                 -v "$PWD":/home/mambauser/work phenotyping-training
# Then open http://localhost:8888/lab?token=phenotyping
#
# Or just use docker-compose.yml: `docker compose up`.
#
# CPU by default (portable, matches the course's no-GPU path). For GPU training
# on Day 4, use Google Colab, or see the GPU note in the Docker section of the
# README to rebuild against a CUDA PyTorch build.
# =============================================================================
FROM mambaorg/micromamba:1.5.8

# --- system libraries needed by OpenCV / Open3D / Qt at runtime ---
# DL3008 ignored deliberately: these are stable base-OS libs; pinning exact
# versions across Debian point releases breaks reproducible rebuilds more than
# it helps. The Python stack itself is pinned via env/environment.yml.
USER root
# hadolint ignore=DL3008
RUN apt-get update && apt-get install -y --no-install-recommends \
        libgl1 \
        libglib2.0-0 \
        libsm6 \
        libxext6 \
        libxrender1 \
        git \
        tini \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*
USER $MAMBA_USER

# --- build the environment from the shared spec into base ---
COPY --chown=$MAMBA_USER:$MAMBA_USER env/environment.yml /tmp/environment.yml
RUN micromamba install -y -n base -f /tmp/environment.yml \
    && micromamba clean --all --yes

# activate the base env for any subsequent RUN/CMD steps
ARG MAMBA_DOCKERFILE_ACTIVATE_ENV=1

# --- copy the verification script + notebooks (repo is also mounted at runtime) ---
WORKDIR /home/mambauser/work
COPY --chown=$MAMBA_USER:$MAMBA_USER notebooks/ ./notebooks/

# Fail the build early if a REQUIRED package didn't import cleanly. The checker
# exits non-zero only on required imports; optional ones (napari, SAM) just warn,
# so a headless build won't fail on them.
RUN python notebooks/00_check_environment.py

EXPOSE 8888

# tini reaps zombie processes from JupyterLab kernels
ENTRYPOINT ["/usr/local/bin/_entrypoint.sh", "tini", "--"]
CMD ["jupyter", "lab", \
     "--ip=0.0.0.0", \
     "--port=8888", \
     "--no-browser", \
     "--notebook-dir=/home/mambauser/work"]
