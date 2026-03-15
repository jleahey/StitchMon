# 🖼️ StitchMon

[![Use the app](https://img.shields.io/badge/Live-App-brightgreen)](https://jleahey.github.io/StitchMon/)

**StitchMon** is an automated screenshot stitcher designed for creating long vertical images from multiple overlapping screenshots (like chat histories, articles, or spreadsheets). It uses intelligent computer vision techniques to auto-order and seamlessly composite your images locally in your browser.

## 🚀 Key Features

-   **Automated Image Ordering**: Simply drop a batch of screenshots; StitchMon detects their relationships and arranges them in the correct vertical sequence.
-   **Robust Overlap Detection**: Uses multi-row strip voting with Normalized Cross-Correlation (NCC) to find precise overlap points, even with noisy or repetitive backgrounds.
-   **Footer-Aware Compositing**: Automatically handles common mobile UI elements like status bars and footers to ensure smooth, gapless transitions.
-   **Privacy First**: All processing happens locally in your browser. Your images never leave your machine.

## 🛠️ Tech Stack

-   **Frontend**: React 19, TypeScript
-   **Build Tool**: Vite 8
-   **Styling**: Vanilla CSS (Modern, Dark-themed UI)
-   **Algorithms**: Custom browser-side computer vision (NCC-based strip matching)

## 📦 Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/) (Latest LTS recommended)
-   [pnpm](https://pnpm.io/) (Recommended) or npm

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/jleahey/StitchMon.git
    cd StitchMon
    ```

2.  Install dependencies:
    ```bash
    pnpm install
    ```

3.  Start the development server:
    ```bash
    pnpm dev
    ```

4.  Open your browser to `http://localhost:5173`.

## 📂 Project Structure

-   `src/components/`: React UI components (DropZone, ResultViewer, etc.)
-   `src/stitcher/`: Core logic for image processing.
    -   `stitcher.ts`: The main orchestration logic for ordering and compositing.
    -   `overlapDetector.ts`: Implementation of the NCC strip-voting algorithm.
-   `src/index.css`: Global styles and design system tokens.

## 📄 License

This project is licensed under the [MIT License](LICENSE).
