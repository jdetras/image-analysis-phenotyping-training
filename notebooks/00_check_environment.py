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
import platform
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


def check_apple_silicon() -> None:
    """On Apple Silicon, report MPS and the optional MLX alternative."""
    is_mac = platform.system() == "Darwin"
    is_arm = platform.machine() == "arm64"
    if not (is_mac and is_arm):
        return  # nothing Apple-Silicon-specific to report

    print("\nApple Silicon check:")
    print("  [ ok  ] Apple Silicon (arm64) detected — packages run natively.")
    try:
        import mlx.core as mx

        # tiny compute to confirm MLX actually works, and report its device
        result = mx.add(mx.array([1.0, 2.0]), mx.array([3.0, 4.0]))
        mx.eval(result)
        version = getattr(mx, "__version__", None)
        if version is None:
            import importlib.metadata as _md
            try:
                version = _md.version("mlx")
            except Exception:  # noqa: BLE001
                version = "unknown"
        print(f"  [ ok  ] MLX {version} works (default device: {mx.default_device()}).")
        print("          Optional alternative to PyTorch for Day-4 CNN training.")
    except ImportError:
        print("  [ info] MLX not installed (optional). For a Metal-accelerated "
              "alternative to")
        print("          PyTorch on Day 4, run:  ./setup.sh --with-mlx")
    except Exception as exc:  # noqa: BLE001 - MLX present but misbehaving
        print(f"  [ info] MLX is installed but a smoke test failed: {exc}")


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

    check_apple_silicon()

    if failures:
        print(f"\nFAILED: {len(failures)} required package(s) missing: "
              f"{', '.join(failures)}")
        print("See setup.html for installation help.")
        return 1

    print("\nAll required packages imported successfully. You're ready for Day 1.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
