# 🖼️ StitchMon

<div align="center">

**The simplest way to stitch your screenshots into a single, seamless image.**

### 🚀 Stop Fiddling, Start Stitching
Ditch the manual cropping. **StitchMon** uses smart pattern matching to automatically align and merge your screenshots. Perfect for chat logs, articles, and long vertical captures.

[**Open the Live App ➜**](https://jleahey.github.io/StitchMon/)

</div>

---

## ✨ Why StitchMon?

-   **🤖 Simple Auto-Ordering**: Drop your images in any order; we'll figure out the vertical sequence for you.
-   **🎯 Clean Overlap Detection**: Our matching algorithm finds the precise join points for a seamless look.
-   **📱 Mobile-Friendly**: Automatically handles common status bars and footers for a gapless result.
-   **🔒 100% Private**: Your images never leave your browser. All processing happens locally on your device.

## 📦 Getting Started (For the Pros)

To run StitchMon locally or contribute to the project:

### Prerequisites

-   [Node.js](https://nodejs.org/) (Latest LTS)
-   [pnpm](https://pnpm.io/) (Recommended)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/jleahey/StitchMon.git
cd StitchMon

# 2. Install dependencies
pnpm install

# 3. Start the dev server
pnpm dev
```

The app will be available at `http://localhost:5173`.

## 🛠️ Tech Stack

-   **Frontend**: React 19 + TypeScript
-   **Build Tool**: Vite 8
-   **Logic**: Custom browser-side image matching (NCC-based strip matching)
-   **Style**: Modern, responsive Vanilla CSS

## 📂 Project Structure

-   `src/components/`: UI components like the DropZone and ResultViewer.
-   `src/stitcher/`: The core stitching and overlap detection logic.
-   `src/index.css`: Design tokens and global styles.

## 📄 License

This project is licensed under the [MIT License](LICENSE).

