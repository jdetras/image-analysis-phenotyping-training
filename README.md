# Image Analysis for Plant Phenotyping — 5-Day Intensive

A complete, runnable training course in image analysis for high-throughput plant
phenotyping, packaged as a static [GitHub Pages](https://pages.github.com/) site.
It takes participants from raw image acquisition to 3D reconstruction on an
open-source-first toolchain, deliverable in-person or hybrid.

**Live site:** <https://jdetras.github.io/image-analysis-phenotyping-training/>

## What's here

| Path | Purpose |
|------|---------|
| `index.html` | Course overview — audience, outcomes, programme at a glance |
| `syllabus.html` | Full day-by-day 5-day schedule and assessment |
| `setup.html` | Software/hardware stack, install steps, pre-arrival checklist |
| `resources.html` | Datasets, references, licensing, hosting notes |
| `assets/style.css` | Shared stylesheet (light/dark aware) |
| `env/environment.yml` | Conda environment for all practicals |
| `env/requirements.txt` | pip fallback (virtualenv / Google Colab) |
| `notebooks/00_check_environment.py` | Verifies the install; usable in CI |
| `.nojekyll` | Tells GitHub Pages to serve HTML as-is (no Jekyll build) |
| `setup.sh` | One-shot installer: Miniforge → env → verify → (opt) weights/GUI/data |
| `dist/…Participant-Guide.pdf` / `.docx` | Formal, printable participant guide (PDF + Word) |
| `build/` | Sources that generate the guide (`build_docx.js`, `print-guide.html`) |

## Course structure

Five days mapping seven topics, with a cross-cutting *imaging, data & practicals*
thread every afternoon:

1. **Day 1** — Acquisition & image fundamentals (scikit-image, OpenCV, Fiji)
2. **Day 2** — Noise, segmentation & shape (scikit-image, PlantCV, napari)
3. **Day 3** — Classical machine learning (scikit-learn, ilastik)
4. **Day 4** — Deep learning (PyTorch, YOLO, SAM)
5. **Day 5** — 3D vision & capstone (COLMAP/Meshroom, Open3D, CloudCompare)

## Quick start (for participants)

**Automated (macOS / Linux)** — one command does everything: installs Miniforge
if needed, builds the env, and verifies it.

```bash
git clone https://github.com/jdetras/image-analysis-phenotyping-training.git
cd image-analysis-phenotyping-training
./setup.sh                 # env + verify
# ./setup.sh --all         # also pre-download YOLO+SAM weights, GUI apps, starter data
# ./setup.sh --use-venv    # pip/virtualenv instead of conda
# ./setup.sh --help        # all options
```

**Manual (any OS)**

```bash
conda env create -f env/environment.yml      # or: mamba env create -f env/environment.yml
conda activate phenotyping
python notebooks/00_check_environment.py      # every required line should read [ ok ]
```

No conda? Use a virtualenv with `env/requirements.txt` (or `./setup.sh --use-venv`),
or run on free Google Colab GPUs. Full instructions are on the **Setup** page.
On Windows, run `setup.sh` under WSL2 or Git Bash, or follow the manual steps.

## Publish on GitHub Pages

```bash
# from this folder, after creating an empty GitHub repo
git init
git add .
git commit -m "Initial course site"
git branch -M main
git remote add origin https://github.com/jdetras/image-analysis-phenotyping-training.git
git push -u origin main
```

Then in the repo: **Settings → Pages → Source: Deploy from a branch → `main` / `/ (root)` → Save.**
The site goes live at `https://jdetras.github.io/image-analysis-phenotyping-training/`.

> Preview locally with any static server, e.g. `python -m http.server 8000`
> then open <http://localhost:8000>.

## License

- **Course materials** (text, site, notebooks): [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- **Example code** in this repo: [MIT](LICENSE)
- **Referenced software**: each tool keeps its own license — see `setup.html` and
  `resources.html`. Note in particular that **Ultralytics YOLO is AGPL-3.0**;
  fine for teaching/research, but review before use in closed-source products.
