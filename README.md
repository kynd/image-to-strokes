# Image to Strokes

A browser tool that turns any image into a 3D brushstroke painting. Upload a photo, wait a few seconds for analysis, then explore the result in 3D.

**Live demo:** [kynd.info/image-to-strokes](https://www.kynd.info/image-to-strokes/)

---

## What it does

1. **Analyzes the image** using a set of on-device models and pure-JS algorithms:
   - Depth estimation (DepthAnything v2) — positions strokes in Z
   - Person segmentation (MediaPipe) — identifies subject area for portraits
   - Face landmarks (MediaPipe) — concentrates detail strokes around eyes, mouth, nose
   - Edge saliency (Sobel, no model) — finds regions of visual detail
   - Color region detection (HSV analysis, no model) — identifies colorful subjects like flowers; works as a fallback when no face is detected

2. **Generates brushstrokes** along image flow lines, adapting density and direction to whatever analysis data is available. A report shows which analyses were used and which were skipped.

3. **Renders a 3D painting** in WebGL via Three.js. Strokes lie on a depth surface and can be viewed from any angle. Supports multiple stroke styles, cap shapes, render modes (flat / gradient / noise), and color controls.

---

## Privacy

All processing runs entirely in your browser. No image data, analysis results, or personal information is sent to any server. The AI models are downloaded once from public CDNs and cached locally.

---

## Running locally

A local server is required only if you want to save/load analysis data between sessions. GitHub Pages (and any static host) work for everything else.

```bash
# Install dependencies (Node.js required)
npm install

# Start local server with save/load API
./start.sh
# or: node server.js
```

Then open `http://localhost:3000`.

Without the local server, the Save/Load buttons are hidden automatically and the app works as a pure static page.

---

## Stack

- [Three.js](https://threejs.org/) — WebGL rendering
- [MediaPipe Tasks Vision](https://ai.google.dev/edge/mediapipe/solutions/vision/overview) — segmentation, face landmarks
- [Transformers.js](https://huggingface.co/docs/transformers.js) + [DepthAnything v2](https://huggingface.co/onnx-community/depth-anything-v2-small) — depth estimation
- Vanilla JS + canvas API for edge/color analysis

---

## License

MIT
