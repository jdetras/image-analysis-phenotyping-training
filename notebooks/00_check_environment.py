#!/usr/bin/env python3
"""Verify the phenotyping training environment.

Run after creating the conda env (or installing requirements.txt):

    python 00_check_environment.py

It imports each required package, prints its version, and reports whether a
GPU is visible to PyTorch. Exit code is non-zero if any required import fails,
so it can also be used in CI.
"""
from __future__ import annotations

import importlib
import sys

# (import name, friendly name) — pip/conda names differ from import names.
REQUIRED = [
    ("numpy", "NumPy"),
    ("scipy", "SciPy"),
    ("pandas", "pandas"),
    ("matplotlib", "Matplotlib"),
    ("skimage", "scikit-image"),
    ("cv2", "OpenCV"),
    ("sklearn", "scikit-learn"),
    ("plantcv", "PlantCV"),
    ("torch", "PyTorch"),
    ("torchvision", "torchvision"),
    ("ultralytics", "Ultralytics (YOLO)"),
    ("open3d", "Open3D"),
]

# These are useful but the core practicals can proceed without them.
OPTIONAL = [
    ("napari", "napari"),
    ("segment_anything", "Segment Anything (SAM)"),
    ("seaborn", "seaborn"),
]


def _version(module) -> str:
    return getattr(module, "__version__", "unknown")


def check(packages, *, required: bool) -> list[str]:
    failures: list[str] = []
    for import_name, friendly in packages:
        try:
            module = importlib.import_module(import_name)
        except Exception as exc:  # noqa: BLE001 - report any import problem
            mark = "MISSING" if required else "skip"
            print(f"  [{mark}] {friendly} ({import_name}) — {exc}")
            if required:
                failures.append(friendly)
        else:
            print(f"  [ ok  ] {friendly} {_version(module)}")
    return failures


def main() -> int:
    print(f"Python {sys.version.split()[0]} at {sys.executable}\n")

    print("Required packages:")
    failures = check(REQUIRED, required=True)

    print("\nOptional packages:")
    check(OPTIONAL, required=False)

    print("\nGPU check:")
    try:
        import torch

        if torch.cuda.is_available():
            print(f"  [ ok  ] CUDA GPU: {torch.cuda.get_device_name(0)}")
        elif getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
            print("  [ ok  ] Apple MPS GPU available")
        else:
            print("  [ info] No GPU detected — CPU is fine for Days 1-3; "
                  "use Google Colab for the Day-4 deep-learning practical.")
    except Exception as exc:  # noqa: BLE001
        print(f"  [ info] Could not query PyTorch for a GPU: {exc}")

    if failures:
        print(f"\nFAILED: {len(failures)} required package(s) missing: "
              f"{', '.join(failures)}")
        print("See setup.html for installation help.")
        return 1

    print("\nAll required packages imported successfully. You're ready for Day 1.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
