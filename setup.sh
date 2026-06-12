#!/usr/bin/env bash
# =============================================================================
# Image Analysis for Plant Phenotyping — one-shot environment setup
#
# Brings a participant's machine from "fresh laptop" to "ready for Day 1":
#   1. detects OS / architecture
#   2. installs Miniforge (conda + mamba) if no conda is found
#   3. creates/updates the `phenotyping` conda env from env/environment.yml
#      (or a pip virtualenv from env/requirements.txt with --use-venv)
#   4. runs notebooks/00_check_environment.py to verify the install
#   5. (optional) pre-downloads model weights (YOLO + SAM) for offline use
#   6. (optional, Apple Silicon) installs MLX as an alternative to PyTorch
#   7. (optional) installs/points to the GUI applications
#   8. (optional) fetches a small starter dataset
#
# Usage:
#   ./setup.sh                 # env + verify (offers MLX on Apple Silicon)
#   ./setup.sh --with-weights  # also pre-download YOLO + SAM weights
#   ./setup.sh --with-mlx      # also install MLX (Apple Silicon Macs only)
#   ./setup.sh --gui           # also try to install GUI apps via brew/apt
#   ./setup.sh --with-data     # also clone a small starter dataset
#   ./setup.sh --all           # env + weights + mlx + gui + data
#   ./setup.sh --use-venv      # use python venv + pip instead of conda
#   ./setup.sh --yes           # don't prompt; assume "yes" to installs
#   ./setup.sh --help
#
# Safe to re-run: every step checks for existing state before acting.
# Linux/macOS. On Windows use WSL2 or Git Bash, or follow setup.html manually.
# =============================================================================
set -euo pipefail

# --- locate repo root (this script's directory) ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

ENV_NAME="phenotyping"
ENV_FILE="env/environment.yml"
REQ_FILE="env/requirements.txt"
MLX_REQ="env/requirements-mac-mlx.txt"
CHECK_SCRIPT="notebooks/00_check_environment.py"
WEIGHTS_DIR="models"
DATA_DIR="data"

# --- flags ---
DO_WEIGHTS=0; DO_GUI=0; DO_DATA=0; USE_VENV=0; ASSUME_YES=0; DO_MLX=0
for arg in "$@"; do
  case "$arg" in
    --with-weights) DO_WEIGHTS=1 ;;
    --with-mlx)     DO_MLX=1 ;;
    --gui)          DO_GUI=1 ;;
    --with-data)    DO_DATA=1 ;;
    --all)          DO_WEIGHTS=1; DO_GUI=1; DO_DATA=1; DO_MLX=1 ;;
    --use-venv)     USE_VENV=1 ;;
    --yes|-y)       ASSUME_YES=1 ;;
    --help|-h)
      sed -n '2,40p' "$0" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *) echo "Unknown option: $arg (try --help)"; exit 2 ;;
  esac
done

# --- pretty output ---
if [ -t 1 ]; then
  BOLD="$(printf '\033[1m')"; GREEN="$(printf '\033[32m')"; YELLOW="$(printf '\033[33m')"
  RED="$(printf '\033[31m')"; BLUE="$(printf '\033[36m')"; RESET="$(printf '\033[0m')"
else
  BOLD=""; GREEN=""; YELLOW=""; RED=""; BLUE=""; RESET=""
fi
step() { echo; echo "${BOLD}${BLUE}==>${RESET} ${BOLD}$*${RESET}"; }
ok()   { echo "    ${GREEN}✓${RESET} $*"; }
warn() { echo "    ${YELLOW}!${RESET} $*"; }
err()  { echo "    ${RED}✗${RESET} $*" >&2; }
ask()  { # ask "question" -> returns 0 for yes
  [ "$ASSUME_YES" -eq 1 ] && return 0
  local reply; read -r -p "    ${BOLD}$1${RESET} [y/N] " reply || true
  [[ "$reply" =~ ^[Yy]$ ]]
}
have() { command -v "$1" >/dev/null 2>&1; }

# =============================================================================
step "1/8  Detecting platform"
OS="$(uname -s)"; ARCH="$(uname -m)"
case "$OS" in
  Darwin) PLATFORM="MacOSX" ;;
  Linux)  PLATFORM="Linux" ;;
  *) err "Unsupported OS: $OS. Use WSL2/Git Bash on Windows, or follow setup.html."; exit 1 ;;
esac
ok "OS: $OS ($ARCH)"
APPLE_SILICON=0
if [ "$OS" = "Darwin" ] && [ "$ARCH" = "arm64" ]; then
  APPLE_SILICON=1
  ok "Apple Silicon detected — native arm64; MLX is available as an alternative to PyTorch."
fi
[ -f "$ENV_FILE" ] || { err "Run this from the repo root (missing $ENV_FILE)."; exit 1; }

# =============================================================================
# venv path (alternative to conda)
# =============================================================================
if [ "$USE_VENV" -eq 1 ]; then
  step "2/8  Creating a Python virtualenv (pip path)"
  have python3 || { err "python3 not found. Install Python 3.10+ first."; exit 1; }
  PYV="$(python3 -c 'import sys;print("%d.%d"%sys.version_info[:2])')"
  ok "python3 $PYV"
  if [ ! -d ".venv" ]; then
    python3 -m venv .venv; ok "created .venv"
  else
    ok ".venv already exists"
  fi
  # shellcheck disable=SC1091
  source .venv/bin/activate
  step "3/8  Installing requirements (this can take several minutes)"
  python -m pip install --upgrade pip >/dev/null
  python -m pip install -r "$REQ_FILE"
  ok "pip install complete"
  step "4/8  Verifying the environment"
  python "$CHECK_SCRIPT" || warn "Some packages failed to import — see messages above."
  ACTIVATE_HINT="source .venv/bin/activate"
  PYRUN=(python)
else
  # ===========================================================================
  step "2/8  Ensuring conda / mamba is available"
  if ! have conda; then
    warn "No conda found."
    if ask "Install Miniforge (conda + mamba) into \$HOME/miniforge3?"; then
      INSTALLER="Miniforge3-${PLATFORM}-${ARCH}.sh"
      URL="https://github.com/conda-forge/miniforge/releases/latest/download/${INSTALLER}"
      TMP="$(mktemp -d)"
      step "    Downloading $INSTALLER"
      if have curl; then curl -fL "$URL" -o "$TMP/$INSTALLER"
      elif have wget; then wget -O "$TMP/$INSTALLER" "$URL"
      else err "Need curl or wget to download Miniforge."; exit 1; fi
      bash "$TMP/$INSTALLER" -b -p "$HOME/miniforge3"
      rm -rf "$TMP"
      # shellcheck disable=SC1091
      source "$HOME/miniforge3/etc/profile.d/conda.sh"
      ok "Miniforge installed. (Run 'conda init' later to load it in new shells.)"
    else
      err "conda is required without --use-venv. Re-run with --use-venv to use pip instead."
      exit 1
    fi
  fi
  # make `conda activate` usable inside this script
  CONDA_BASE="$(conda info --base)"
  # shellcheck disable=SC1091
  source "$CONDA_BASE/etc/profile.d/conda.sh"
  SOLVER="conda"; have mamba && SOLVER="mamba"
  ok "Using $SOLVER ($(conda --version))"

  # ===========================================================================
  step "3/8  Creating/updating the '$ENV_NAME' environment (several minutes)"
  if conda env list | awk '{print $1}' | grep -qx "$ENV_NAME"; then
    warn "Env '$ENV_NAME' exists — updating it to match $ENV_FILE."
    "$SOLVER" env update -n "$ENV_NAME" -f "$ENV_FILE" --prune
  else
    "$SOLVER" env create -n "$ENV_NAME" -f "$ENV_FILE"
  fi
  ok "Environment ready."
  conda activate "$ENV_NAME"

  # ===========================================================================
  step "4/8  Verifying the environment"
  python "$CHECK_SCRIPT" || warn "Some packages failed to import — see messages above."
  ACTIVATE_HINT="conda activate $ENV_NAME"
  PYRUN=(python)
fi

# =============================================================================
step "5/8  Optional model weights"
if [ "$DO_WEIGHTS" -eq 1 ]; then
  mkdir -p "$WEIGHTS_DIR"
  # YOLO — let ultralytics fetch + cache its own checkpoint, then copy it here
  step "    YOLO (yolov8n.pt)"
  if "${PYRUN[@]}" - <<'PY'
import sys
try:
    from ultralytics import YOLO
    YOLO("yolov8n.pt")  # downloads to the ultralytics cache on first call
    print("ok")
except Exception as e:
    print("FAILED:", e); sys.exit(1)
PY
  then ok "YOLO weights cached (ultralytics will reuse them)."
  else warn "Could not pre-fetch YOLO weights — they'll download on first use."
  fi
  # SAM — ViT-B checkpoint (~375 MB), the smallest official SAM model
  SAM_FILE="$WEIGHTS_DIR/sam_vit_b_01ec64.pth"
  SAM_URL="https://dl.fbaipublicfiles.com/segment_anything/sam_vit_b_01ec64.pth"
  step "    SAM (sam_vit_b, ~375 MB)"
  if [ -f "$SAM_FILE" ]; then
    ok "SAM checkpoint already present ($SAM_FILE)."
  elif ask "Download the SAM ViT-B checkpoint (~375 MB) now?"; then
    if have curl; then curl -fL "$SAM_URL" -o "$SAM_FILE"
    elif have wget; then wget -O "$SAM_FILE" "$SAM_URL"
    fi
    ok "Saved $SAM_FILE"
  else
    warn "Skipped SAM download."
  fi
else
  warn "Skipped (pass --with-weights to pre-download YOLO + SAM)."
fi

# =============================================================================
step "6/8  Apple Silicon / MLX (optional alternative to PyTorch)"
if [ "$APPLE_SILICON" -eq 1 ]; then
  RUN_MLX=0
  if [ "$DO_MLX" -eq 1 ]; then
    RUN_MLX=1
  elif [ "$ASSUME_YES" -eq 0 ] && ask "Install MLX, a Metal-accelerated alternative to PyTorch for Day 4?"; then
    RUN_MLX=1
  fi
  if [ "$RUN_MLX" -eq 1 ]; then
    if "${PYRUN[@]}" -m pip install -r "$MLX_REQ"; then
      ok "MLX installed. The verifier will confirm it runs on the Metal GPU."
    else
      warn "MLX install failed — see messages above. PyTorch (MPS) still works."
    fi
  else
    warn "Skipped MLX (install later with: ./setup.sh --with-mlx)."
  fi
elif [ "$DO_MLX" -eq 1 ]; then
  warn "MLX is Apple-Silicon-only; skipping on $OS ($ARCH). Use PyTorch here."
else
  warn "Not an Apple Silicon Mac — MLX not applicable; PyTorch is your DL framework."
fi

# =============================================================================
step "7/8  GUI applications"
GUI_LINKS=(
  "Fiji/ImageJ      https://fiji.sc/"
  "ilastik          https://www.ilastik.org/download"
  "CloudCompare     https://www.cloudcompare.org/  (source: https://github.com/CloudCompare/CloudCompare)"
  "Meshroom         https://alicevision.org/#meshroom"
  "COLMAP           https://colmap.github.io/"
  "QGIS             https://qgis.org/download/"
)
if [ "$DO_GUI" -eq 1 ]; then
  if [ "$OS" = "Darwin" ] && have brew; then
    step "    Installing GUI apps via Homebrew (best-effort; failures are non-fatal)"
    # Only well-known, verified cask/formula names are attempted automatically.
    for pkg in fiji qgis cloudcompare; do
      if brew list --cask "$pkg" >/dev/null 2>&1 || brew list "$pkg" >/dev/null 2>&1; then
        ok "$pkg already installed"
      else
        brew install --cask "$pkg" 2>/dev/null && ok "installed $pkg" || warn "brew could not install '$pkg' — use the download link below."
      fi
    done
    have colmap || { brew install colmap 2>/dev/null && ok "installed colmap" || warn "install COLMAP from colmap.github.io"; }
    warn "ilastik and Meshroom have no reliable cask — download them manually:"
  elif [ "$OS" = "Linux" ] && have apt-get; then
    step "    Installing GUI apps via apt (needs sudo; best-effort)"
    sudo apt-get update -qq || true
    for pkg in qgis colmap; do
      sudo apt-get install -y "$pkg" 2>/dev/null && ok "installed $pkg" || warn "apt could not install '$pkg' — use the download link below."
    done
    warn "Fiji, ilastik, CloudCompare, Meshroom: download manually (AppImage/tarball):"
  else
    warn "No supported package manager detected — download the GUI apps manually:"
  fi
  printf '       %s\n' "${GUI_LINKS[@]}"
else
  warn "Skipped GUI install (pass --gui to attempt it). Download pages:"
  printf '       %s\n' "${GUI_LINKS[@]}"
fi

# =============================================================================
step "8/8  Starter dataset"
if [ "$DO_DATA" -eq 1 ]; then
  mkdir -p "$DATA_DIR"
  if [ -d "$DATA_DIR/PlantVillage-Dataset" ]; then
    ok "PlantVillage dataset already cloned."
  elif have git && ask "Clone the PlantVillage dataset (~2 GB) into $DATA_DIR/?"; then
    git clone --depth 1 https://github.com/spMohanty/PlantVillage-Dataset.git "$DATA_DIR/PlantVillage-Dataset" \
      && ok "Cloned PlantVillage into $DATA_DIR/PlantVillage-Dataset"
  else
    warn "Skipped. Other datasets (CVPPP, GWHD, Pheno4D) require registration — see resources.html."
  fi
else
  warn "Skipped (pass --with-data to clone the PlantVillage starter dataset)."
fi

# =============================================================================
echo
echo "${BOLD}${GREEN}Setup complete.${RESET}"
echo "  Activate your environment for each session with:"
echo "      ${BOLD}${ACTIVATE_HINT}${RESET}"
echo "  Then launch the practicals with:"
echo "      ${BOLD}jupyter lab${RESET}"
echo "  Re-run the verifier any time with:"
echo "      ${BOLD}python ${CHECK_SCRIPT}${RESET}"
echo
