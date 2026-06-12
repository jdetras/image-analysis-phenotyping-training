// Build the participant-facing Word document for the
// "Image Analysis for Plant Phenotyping" 5-day intensive.
// Run: NODE_PATH=$(npm root -g) node build/build_docx.js
const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, LevelFormat, Header, Footer, PageNumber, PageBreak,
  HeadingLevel, BorderStyle, WidthType, ShadingType, VerticalAlign,
  TableOfContents, ExternalHyperlink,
} = require("docx");

// ---- layout constants (US Letter, 1" margins) ----
const CONTENT = 9360; // 12240 - 2*1440
const ACCENT = "1A7F37";
const ACCENT_DARK = "06210D";
const HEADER_FILL = "1A7F37";
const ZEBRA = "F1F5F2";

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const cellBorders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

// ---- helpers ----
function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)] });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] });
}
function h3(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(text)] });
}
function p(text, opts = {}) {
  return new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text, ...opts })] });
}
function bullet(text, level = 0) {
  return new Paragraph({ numbering: { reference: "bullets", level }, children: runs(text) });
}
function numbered(text, ref = "numbers") {
  return new Paragraph({ numbering: { reference: ref, level: 0 }, children: runs(text) });
}
function checkItem(text) {
  return new Paragraph({
    numbering: { reference: "checks", level: 0 },
    children: runs(text),
  });
}
// allow a leading **bold:** segment in list text
function runs(text) {
  const m = text.match(/^\*\*(.+?)\*\*\s*(.*)$/);
  if (m) {
    return [new TextRun({ text: m[1] + " ", bold: true }), new TextRun(m[2])];
  }
  return [new TextRun(text)];
}
function headerCell(text, width) {
  return new TableCell({
    borders: cellBorders, width: { size: width, type: WidthType.DXA },
    margins: cellMargins, verticalAlign: VerticalAlign.CENTER,
    shading: { fill: HEADER_FILL, type: ShadingType.CLEAR },
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: "FFFFFF" })] })],
  });
}
function dataCell(text, width, fill) {
  const children = Array.isArray(text)
    ? text.map((t) => new Paragraph({ children: [new TextRun(t)] }))
    : [new Paragraph({ children: runs(text) })];
  return new TableCell({
    borders: cellBorders, width: { size: width, type: WidthType.DXA },
    margins: cellMargins, verticalAlign: VerticalAlign.CENTER,
    shading: fill ? { fill, type: ShadingType.CLEAR } : undefined,
    children,
  });
}
// build a table from a header row + data rows, with zebra striping
function table(widths, headers, rows) {
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((t, i) => headerCell(t, widths[i])),
  });
  const dataRows = rows.map((r, ri) =>
    new TableRow({
      children: r.map((c, ci) => dataCell(c, widths[ci], ri % 2 ? ZEBRA : undefined)),
    })
  );
  return new Table({
    width: { size: CONTENT, type: WidthType.DXA },
    columnWidths: widths,
    rows: [headerRow, ...dataRows],
  });
}
function spacer() {
  return new Paragraph({ spacing: { after: 120 }, children: [] });
}

// ---- content ----
const children = [];

// Title block
children.push(
  new Paragraph({
    spacing: { before: 2400, after: 120 },
    children: [new TextRun({ text: "Image Analysis for Plant Phenotyping", bold: true, size: 56, color: ACCENT_DARK })],
  }),
  new Paragraph({
    spacing: { after: 360 },
    children: [new TextRun({ text: "A 5-Day Open-Source Intensive — Participant Guide", size: 30, color: ACCENT })],
  }),
  new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text: "From raw image acquisition to 3D reconstruction: acquisition, segmentation, classical machine learning, deep learning, and 3D vision — built on an open-source-first toolchain, deliverable in-person or hybrid.", italics: true, size: 24 })],
  }),
  new Paragraph({
    spacing: { before: 240, after: 60 },
    children: [
      new TextRun({ text: "Live course site: ", bold: true }),
      new ExternalHyperlink({
        children: [new TextRun({ text: "jdetras.github.io/image-analysis-phenotyping-training", style: "Hyperlink" })],
        link: "https://jdetras.github.io/image-analysis-phenotyping-training/",
      }),
    ],
  }),
  new Paragraph({
    spacing: { after: 60 },
    children: [new TextRun({ text: "Duration: 5 days (~35 hours)   ·   Format: in-person / hybrid   ·   Cohort: 16–24 participants", size: 22, color: "57606A" })],
  }),
  new Paragraph({
    spacing: { after: 60 },
    children: [new TextRun({ text: "Materials licensed CC BY 4.0   ·   Example code MIT", size: 22, color: "57606A" })],
  }),
  new Paragraph({ children: [new PageBreak()] }),
);

// TOC
children.push(
  new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Contents")] }),
  new TableOfContents("Contents", { hyperlink: true, headingStyleRange: "1-2" }),
  new Paragraph({ children: [new PageBreak()] }),
);

// 1. Overview
children.push(h1("Course Overview"));
children.push(h2("Who this course is for"));
children.push(p("Researchers, technicians, graduate students, and breeding-program staff who collect plant images — from flatbed scans and growth-chamber cameras to field drones — and want to turn them into quantitative, analysis-ready traits. The course assumes:"));
children.push(bullet("**Basic Python literacy** — you can read a script, run a function, and edit variables. A pre-course primer notebook is provided for refreshers."));
children.push(bullet("**A scientific background in plant biology, agronomy, or breeding** — or a computational background working alongside plant scientists."));
children.push(bullet("**No prior computer-vision or deep-learning experience required.** We build it up from first principles."));
children.push(p("Cohort size is tuned for 16–24 participants with one instructor and one teaching assistant, so everyone gets hands-on support during practicals."));

children.push(h2("Learning outcomes"));
children.push(p("By the end of the week, participants will be able to:"));
[
  "**Acquire & manage** — design an imaging protocol, control for illumination and scale, and organise datasets with reproducible metadata.",
  "**Pre-process** — apply denoising, colour-space transforms, and calibration so downstream measurements are robust and comparable.",
  "**Segment** — separate plant from background using thresholding, classical, and learned segmentation — and know when each fails.",
  "**Quantify shape** — extract morphometric traits (area, length, convex hull, skeleton, colour indices) and validate them against ground truth.",
  "**Apply classical ML** — engineer features and train interpretable classifiers/regressors for trait prediction and quality control.",
  "**Train deep models** — fine-tune CNNs, detectors (YOLO), and promptable segmenters (SAM) for counting, detection, and pixel labelling.",
  "**Reconstruct in 3D** — build point clouds and meshes via photogrammetry and measure volumetric/architectural traits.",
  "**Work reproducibly** — package an analysis in a versioned environment with notebooks, so a colleague can re-run it end to end.",
].forEach((t) => children.push(bullet(t)));

children.push(h2("Programme at a glance"));
children.push(p("Seven topics, woven across five days, with a cross-cutting imaging, data & practicals thread running through every afternoon."));
children.push(table(
  [800, 2600, 3360, 2600],
  ["Day", "Theme", "Core topics", "Primary tools"],
  [
    ["1", "Acquisition & image fundamentals", "Imaging modalities, colour spaces, calibration, data management", "scikit-image, OpenCV, Fiji"],
    ["2", "Noise, segmentation & shape", "Denoising, thresholding, morphology, morphometrics", "scikit-image, PlantCV, napari"],
    ["3", "Classical machine learning", "Feature engineering, classification, regression, pixel classifiers", "scikit-learn, ilastik"],
    ["4", "Deep learning for phenotyping", "CNNs, transfer learning, detection, promptable segmentation", "PyTorch, YOLO, SAM"],
    ["5", "3D vision & capstone", "Photogrammetry, point clouds, meshes, mini-project", "COLMAP/Meshroom, Open3D, CloudCompare"],
  ],
));

children.push(h2("Format & logistics"));
children.push(bullet("**Daily rhythm** — mornings are concept + guided demo (~3 h); afternoons are hands-on practicals on your own data or provided datasets (~3.5 h), with TA support."));
children.push(bullet("**Delivery** — in-person computer lab or hybrid via video + shared notebooks. All compute can run locally or on free Google Colab GPUs."));
children.push(bullet("**Assessment** — daily practical checkpoints plus a Day-5 capstone applied to a real phenotyping question. Optional certificate on completion."));

children.push(new Paragraph({ children: [new PageBreak()] }));

// 2. Programme (day by day)
children.push(h1("5-Day Programme"));
children.push(p("Each day runs roughly 09:00–16:30 with a morning lecture/demo block, a long lunch, and an afternoon practical. Times are indicative — adjust to your timezone and breaks."));

const days = [
  {
    title: "Day 1 — Acquisition & image fundamentals",
    tools: "scikit-image · OpenCV · Fiji",
    morning: [
      "**Why imaging for phenotyping:** traits, throughput, and the measurement chain from sensor to number.",
      "**Imaging modalities:** RGB, multispectral, thermal, chlorophyll fluorescence, depth — what each measures and its artefacts.",
      "**How a digital image works:** pixels, bit depth, channels, raw vs. compressed, EXIF metadata.",
      "**Colour spaces:** RGB to HSV, Lab, and excess-green (ExG) indices; why colour space choice makes or breaks segmentation.",
      "**Calibration:** colour cards, scale bars, flat-field correction, and fixing geometric distortion.",
    ],
    afternoon: [
      "Load, inspect, and convert images with scikit-image and OpenCV; read pixel statistics and histograms.",
      "Build a tidy dataset folder with a metadata CSV (plant ID, date, treatment, scale).",
      "Open the same images in Fiji/ImageJ for interactive inspection and measurement.",
      "**Checkpoint:** convert a batch of raw images to a calibrated, scale-annotated working set.",
    ],
  },
  {
    title: "Day 2 — Noise filtering, segmentation & shape",
    tools: "scikit-image · PlantCV · napari",
    morning: [
      "**Noise & denoising:** Gaussian, median, bilateral, non-local means, and total-variation filters; when smoothing destroys signal.",
      "**Thresholding:** global (Otsu), adaptive/local, and multi-channel colour thresholding.",
      "**Morphological operations:** erosion, dilation, opening, closing, watershed for touching objects.",
      "**Shape & morphometrics:** area, perimeter, convex hull, solidity, eccentricity, skeleton length, leaf count.",
    ],
    afternoon: [
      "Build a classical segmentation pipeline in PlantCV for a rosette or seedling image set.",
      "Interactively label and correct masks in napari.",
      "Extract a morphometric trait table and plot trait distributions across treatments.",
      "**Checkpoint:** a reproducible mask-to-traits pipeline with a QC visual overlay.",
    ],
  },
  {
    title: "Day 3 — Classical machine learning",
    tools: "scikit-learn · ilastik",
    morning: [
      "**From pixels to features:** colour, texture (GLCM, LBP), and shape descriptors as model inputs.",
      "**Supervised learning basics:** train/validation/test splits, leakage, cross-validation, class imbalance.",
      "**Models:** logistic regression, SVM, random forests, gradient boosting — strengths and interpretability.",
      "**Evaluation:** accuracy vs. precision/recall/F1, confusion matrices, regression error metrics, calibration.",
      "**Pixel classification:** random-forest segmentation as a bridge to deep learning.",
    ],
    afternoon: [
      "Engineer features from Day-2 masks and train a scikit-learn classifier (e.g. healthy vs. stressed).",
      "Train an interactive pixel classifier in ilastik and compare it to threshold-based segmentation.",
      "Run cross-validation and read the confusion matrix critically.",
      "**Checkpoint:** a validated trait classifier with an honest performance report.",
    ],
  },
  {
    title: "Day 4 — Deep learning for phenotyping",
    tools: "PyTorch · YOLO · SAM",
    morning: [
      "**Neural network intuition:** convolutions, feature maps, loss, backprop, overfitting — visually, not just mathematically.",
      "**Transfer learning:** why fine-tuning a pretrained CNN beats training from scratch on small phenotyping datasets.",
      "**Task families:** classification, object detection & counting (YOLO), semantic/instance segmentation.",
      "**Foundation models:** the Segment Anything Model (SAM) for promptable, label-efficient segmentation.",
      "**Annotation & data:** how much labelled data you really need, and augmentation strategies.",
    ],
    afternoon: [
      "Fine-tune a pretrained CNN in PyTorch for a phenotyping classification task.",
      "Train/run a YOLO detector to count organs (e.g. spikes, fruits, leaves).",
      "Use SAM to generate segmentation masks with minimal manual labelling.",
      "**Checkpoint:** a trained model with metrics, plus inference on held-out images.",
      "**No GPU?** The full afternoon runs on free Google Colab GPUs — see Setup → Hardware.",
    ],
  },
  {
    title: "Day 5 — 3D vision & capstone",
    tools: "COLMAP/Meshroom · Open3D · CloudCompare",
    morning: [
      "**3D phenotyping motivation:** traits you can't get from 2D — volume, canopy architecture, self-occlusion.",
      "**Photogrammetry / structure-from-motion:** from a turntable image set to a point cloud with COLMAP or Meshroom.",
      "**Point-cloud processing:** registration, downsampling, normals, meshing in Open3D.",
      "**Measurement & QC:** volume, height, leaf-area estimates and visual inspection in CloudCompare.",
      "**Field scale:** a brief look at drone orthomosaics and plot extraction in QGIS (commercial equivalents noted).",
    ],
    afternoon: [
      "Apply any part of the week's toolkit to a phenotyping question on your own or a provided dataset.",
      "Package the analysis as a reproducible notebook + environment.",
      "Short show-and-tell: each participant presents one result and one thing that surprised them.",
      "**Checkpoint:** capstone notebook submitted for the optional certificate.",
    ],
  },
];

days.forEach((d) => {
  children.push(h2(d.title));
  children.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: d.tools, italics: true, color: ACCENT })] }));
  children.push(h3("Morning — concepts & demo"));
  d.morning.forEach((t) => children.push(bullet(t)));
  children.push(h3("Afternoon — practical"));
  d.afternoon.forEach((t) => children.push(bullet(t)));
});

children.push(h2("Mapping to the seven topics"));
children.push(table(
  [700, 4660, 4000],
  ["#", "Topic", "Where it lives"],
  [
    ["1", "Image acquisition", "Day 1"],
    ["2", "Noise filtering", "Day 2 (morning)"],
    ["3", "Segmentation", "Day 2–3 (classical → learned)"],
    ["4", "Shape analysis / morphometrics", "Day 2 (afternoon)"],
    ["5", "Classical machine learning", "Day 3"],
    ["6", "Deep learning", "Day 4"],
    ["7", "3D vision", "Day 5"],
    ["—", "Imaging, data & practicals (cross-cutting)", "Every afternoon"],
  ],
));

children.push(h2("Assessment & certification"));
children.push(bullet("**Daily checkpoints (60%)** — one short practical deliverable per day, reviewed by the TA."));
children.push(bullet("**Capstone (40%)** — a reproducible notebook answering a phenotyping question, presented on Day 5."));
children.push(bullet("**Certificate of completion** issued to participants who attend ≥80% and submit the capstone."));

children.push(new Paragraph({ children: [new PageBreak()] }));

// 3. Setup
children.push(h1("Setup & Pre-Arrival Checklist"));
children.push(new Paragraph({
  shading: { fill: "FFF8E1", type: ShadingType.CLEAR },
  border: { left: { style: BorderStyle.SINGLE, size: 18, color: "9A6700", space: 6 } },
  spacing: { after: 160 }, indent: { left: 120 },
  children: [new TextRun({ text: "Do this at least 3 days before Day 1. ", bold: true }), new TextRun("Installing on conference Wi-Fi on the morning of the course never ends well.")],
}));
[
  "Install Miniforge (conda + the conda-forge channel; includes the fast mamba solver).",
  "Download the course repository (git clone or “Download ZIP”).",
  "Create the environment: conda env create -f env/environment.yml",
  "Activate it: conda activate phenotyping",
  "Run the verifier: python notebooks/00_check_environment.py — every required line should read [ ok ].",
  "Install the GUI apps you'll use (Fiji, ilastik — see the table below).",
  "Create a free Google Colab account as the Day-4 GPU fallback.",
  "(Optional) Bring a small set of your own plant images to use in the practicals.",
].forEach((t) => children.push(checkItem(t)));

children.push(h2("Install the Python environment"));
children.push(p("The repository ships a conda environment.yml for a one-command setup (use mamba in place of conda for a faster solve):"));
children.push(new Paragraph({
  shading: { fill: "F1F5F2", type: ShadingType.CLEAR }, spacing: { after: 60 }, indent: { left: 120 },
  children: [new TextRun({ text: "git clone https://github.com/jdetras/image-analysis-phenotyping-training.git", font: "Consolas", size: 20 })],
}));
["cd image-analysis-phenotyping-training", "conda env create -f env/environment.yml", "conda activate phenotyping", "python notebooks/00_check_environment.py"].forEach((line) =>
  children.push(new Paragraph({
    shading: { fill: "F1F5F2", type: ShadingType.CLEAR }, spacing: { after: 0 }, indent: { left: 120 },
    children: [new TextRun({ text: line, font: "Consolas", size: 20 })],
  })));
children.push(spacer());
children.push(p("NVIDIA GPU users: the environment installs the CPU build of PyTorch so it works everywhere. After creating the env, install the CUDA build matching your driver from pytorch.org/get-started/locally. No conda? A requirements.txt is provided for a plain virtualenv or Colab — always create a virtualenv first."));

children.push(h2("Software stack — Python / command-line"));
children.push(p("These install via the environment file above. Licenses summarised; confirm against each project before redistribution."));
children.push(table(
  [2100, 4360, 1400, 1500],
  ["Tool", "Role in the course", "License", "Source"],
  [
    ["scikit-image", "Core image processing — filters, segmentation, morphometrics", "BSD-3", "scikit-image.org"],
    ["OpenCV", "Fast image I/O, transforms, classical CV ops", "Apache-2.0", "opencv.org"],
    ["PlantCV", "Plant-specific phenotyping pipelines & trait extraction", "MIT", "plantcv.org"],
    ["scikit-learn", "Classical ML — classifiers, regressors, cross-validation", "BSD-3", "scikit-learn.org"],
    ["PyTorch", "Deep learning framework (CNNs, transfer learning)", "BSD-3", "pytorch.org"],
    ["torchvision", "Pretrained models, datasets, image transforms", "BSD-3", "pytorch.org/vision"],
    ["Ultralytics (YOLO)", "Object detection & counting of plant organs", "AGPL-3.0", "github.com/ultralytics"],
    ["Segment Anything (SAM)", "Promptable, label-efficient segmentation", "Apache-2.0", "github.com/facebookresearch/segment-anything"],
    ["Open3D", "Point-cloud & mesh processing for 3D phenotyping", "MIT", "open3d.org"],
    ["JupyterLab", "Notebook environment for all practicals", "BSD-3", "jupyter.org"],
  ],
));

children.push(h2("Software stack — GUI applications"));
children.push(p("Install these manually from the official download pages. They cover interactive inspection, labelling, and 3D work where a point-and-click tool beats a script."));
children.push(table(
  [1900, 4560, 1400, 1500],
  ["App", "Role in the course", "License", "Download"],
  [
    ["Fiji / ImageJ", "Interactive image inspection & measurement (Day 1–2)", "GPL / PD", "fiji.sc"],
    ["napari", "n-D image viewer & manual mask correction (Day 2)", "BSD-3", "napari.org"],
    ["ilastik", "Interactive random-forest pixel classification (Day 3)", "GPL-2.0+", "ilastik.org"],
    ["CloudCompare", "Point-cloud inspection & measurement (Day 5)", "GPL", "cloudcompare.org"],
    ["Meshroom", "GUI photogrammetry / structure-from-motion (Day 5)", "MPL-2.0", "alicevision.org"],
    ["COLMAP", "Structure-from-motion / multi-view stereo (Day 5)", "BSD-3", "colmap.github.io"],
    ["QGIS", "Drone orthomosaics & plot extraction (Day 5)", "GPL-2.0+", "qgis.org"],
  ],
));
children.push(p("Open-source-first: where teams already license commercial tools, the common equivalents are Pix4D / Agisoft Metashape (→ COLMAP/Meshroom + QGIS) and MATLAB + Image Processing Toolbox (→ scikit-image / OpenCV). These are noted but not used in practicals.", { italics: true }));

children.push(h2("Apple Silicon & MLX (Mac alternative to PyTorch)"));
children.push(p("On Apple Silicon (M-series) Macs the whole stack installs and runs natively as arm64, and PyTorch automatically uses the Metal (MPS) GPU — the Day-4 practical works out of the box."));
children.push(p("Optionally, add MLX, Apple's array/ML framework. On Apple Silicon it runs on the GPU via Metal with unified memory and is often faster than PyTorch-MPS for training small CNNs from scratch — a good alternative for the Day-4 classification task. YOLO and SAM stay on PyTorch (which uses MPS), so MLX is an alternative for the CNN-training portion, not a whole-stack replacement. Install it with:"));
[
  "./setup.sh --with-mlx   (offered automatically on Apple Silicon)",
  "pip install -r env/requirements-mac-mlx.txt   (into your activated env)",
].forEach((line) =>
  children.push(new Paragraph({
    shading: { fill: "F1F5F2", type: ShadingType.CLEAR }, spacing: { after: 0 }, indent: { left: 120 },
    children: [new TextRun({ text: line, font: "Consolas", size: 20 })],
  })));
children.push(spacer());
children.push(p("Apple Silicon only — there are no MLX wheels for Intel Macs, and MLX has no Metal GPU inside Docker on a Mac, so use the native install. The verifier confirms it with a line like “[ ok ] MLX works (default device: Device(gpu, 0))”.", { italics: true }));

children.push(h2("Hardware requirements"));
children.push(table(
  [2360, 3500, 3500],
  ["Component", "Minimum", "Recommended"],
  [
    ["CPU", "4 cores", "8+ cores"],
    ["RAM", "8 GB", "16–32 GB (3D & large images)"],
    ["Disk", "20 GB free", "50 GB free (datasets + models)"],
    ["GPU", "None — use Colab for Day 4", "NVIDIA GPU ≥6 GB VRAM for local DL"],
    ["OS", "Windows 10+, macOS 12+, or Linux", "Linux or macOS for smoothest 3D tooling"],
  ],
));
children.push(p("No-GPU path: Days 1–3 and the Day-5 3D work run comfortably on CPU. Only the Day-4 deep-learning practical benefits from a GPU — and that runs end-to-end on free Google Colab GPUs, so a modest laptop is enough to complete the whole course.", { italics: true }));

children.push(new Paragraph({ children: [new PageBreak()] }));

// 4. Resources
children.push(h1("Datasets, References & Licensing"));
children.push(h2("Datasets"));
children.push(p("Open phenotyping datasets used in demos and available for practicals. Always check each dataset's own license and citation requirements before reuse or redistribution."));
children.push(table(
  [3600, 2760, 3000],
  ["Dataset", "Used for", "Source"],
  [
    ["CVPPP — leaf segmentation & counting", "Day 2–4: segmentation, counting", "plant-phenotyping.org/datasets"],
    ["PlantVillage — leaf disease images", "Day 3–4: classification", "github.com/spMohanty/PlantVillage-Dataset"],
    ["Global Wheat Head Detection (GWHD)", "Day 4: detection & counting", "global-wheat.com"],
    ["PlantCV tutorial datasets", "Day 2: classical pipelines", "plantcv.readthedocs.io"],
    ["Pheno4D — 4D plant point clouds", "Day 5: 3D processing", "ipb.uni-bonn.de/data/pheno4d"],
    ["Your own images", "Capstone", "Bring a small set on Day 1"],
  ],
));
children.push(p("Bandwidth tip: hosts should mirror the chosen datasets to a local drive before the course — several are multi-GB and venue Wi-Fi rarely copes with 20 people downloading at once.", { italics: true }));

children.push(h2("Key references"));
[
  "Gehan et al. (2017). PlantCV v2: Image analysis software for high-throughput plant phenotyping. PeerJ. doi:10.7717/peerj.4088",
  "van der Walt et al. (2014). scikit-image: image processing in Python. PeerJ. doi:10.7717/peerj.453",
  "Kirillov et al. (2023). Segment Anything. ICCV. arXiv:2304.02643",
  "David et al. (2020). Global Wheat Head Detection (GWHD) dataset. Plant Phenomics. doi:10.34133/2020/3521852",
  "Minervini et al. (2016). Finely-grained annotated datasets for image-based plant phenotyping. Pattern Recognition Letters. doi:10.1016/j.patrec.2015.10.013",
  "Paulus (2019). Measuring crops in 3D: using geometry for plant phenotyping. Plant Methods. doi:10.1186/s13007-019-0490-0",
].forEach((t) => children.push(bullet(t)));

children.push(h2("Licensing"));
children.push(p("Course materials (text, slides, notebooks, and the website) are released under Creative Commons Attribution 4.0 (CC BY 4.0); the example code is additionally available under the MIT License. Every referenced tool retains its own license. Two points warrant attention for organisations:"));
children.push(bullet("**Ultralytics YOLO is AGPL-3.0.** Fine for training, research, and teaching, but using it inside a closed-source product can trigger copyleft obligations — evaluate before embedding it in proprietary pipelines."));
children.push(bullet("**Fiji, ilastik, CloudCompare, QGIS** are GPL-family — free to use and share; distributed modifications must stay open. SAM, Open3D, PlantCV, scikit-image, scikit-learn, PyTorch, and OpenCV are permissive (Apache-2.0 / BSD / MIT)."));
children.push(p("Not legal advice. License summaries are provided in good faith for planning; confirm current terms on each project's site before redistributing software or building commercial products.", { italics: true }));

children.push(h2("Host / instructor checklist"));
[
  "Test the full environment install on each target OS one week ahead.",
  "Pre-download model weights (YOLO, SAM) and datasets onto a shared drive as a Wi-Fi fallback.",
  "Confirm Colab access works on the venue network (some institutional firewalls block it).",
  "Share the pre-arrival checklist with participants 1–2 weeks ahead.",
  "Reserve a room with reliable power outlets at every seat.",
  "Recruit one TA per ~12 participants for afternoon practicals.",
].forEach((t) => children.push(checkItem(t)));

// ---- assemble ----
const doc = new Document({
  creator: "Image Analysis for Plant Phenotyping course",
  title: "Image Analysis for Plant Phenotyping — Participant Guide",
  description: "5-day open-source intensive participant guide",
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 34, bold: true, font: "Arial", color: ACCENT_DARK },
        paragraph: { spacing: { before: 320, after: 200 }, outlineLevel: 0,
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: ACCENT, space: 4 } } } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 27, bold: true, font: "Arial", color: ACCENT_DARK },
        paragraph: { spacing: { before: 260, after: 140 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 23, bold: true, font: "Arial", color: ACCENT },
        paragraph: { spacing: { before: 180, after: 100 }, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [
      { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 280 } } } }] },
      { reference: "numbers", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 280 } } } }] },
      { reference: "checks", levels: [{ level: 0, format: LevelFormat.BULLET, text: "☐", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 280 } } } }] },
    ],
  },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    headers: { default: new Header({ children: [new Paragraph({
      alignment: AlignmentType.RIGHT,
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC", space: 2 } },
      children: [new TextRun({ text: "Image Analysis for Plant Phenotyping — Participant Guide", size: 16, color: "888888" })],
    })] }) },
    footers: { default: new Footer({ children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC", space: 2 } },
      children: [
        new TextRun({ text: "CC BY 4.0   ·   jdetras.github.io/image-analysis-phenotyping-training   ·   Page ", size: 16, color: "888888" }),
        new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "888888" }),
        new TextRun({ text: " of ", size: 16, color: "888888" }),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: "888888" }),
      ],
    })] }) },
    children,
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync("dist/Image-Analysis-for-Plant-Phenotyping-Participant-Guide.docx", buf);
  console.log("Wrote dist/Image-Analysis-for-Plant-Phenotyping-Participant-Guide.docx", buf.length, "bytes");
});
