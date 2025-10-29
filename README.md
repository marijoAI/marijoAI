# MarijoAI

A browser-based, no-code tool to build, train, and use custom neural networks entirely on your device. MarijoAI lets you:

- Clean and prepare tabular data (CSV)
- Define a neural network architecture
- Train a model in the browser with a custom JS neural network
- Make predictions and export results

All processing happens client-side in your browser. Your data never leaves your device.

## Features

- Clean data workflow with CSV parsing and validation
- Visual, step-by-step pages: Clean Data → Create → Train → Predict
- Custom neural network implementation with ReLU/Sigmoid/Tanh/Softmax (and more) and Adam optimizer
- Early stopping and live training history (loss/accuracy)
- Download trained model as JSON; reload later to predict
- For predictions (after training), accuracy evaluation when ground truth is available
- 8 exercises to familiarize yourself with Neural Networks
- A course on Neural Networks in the About page

## Quick Start

1. Clone or download this repository.
2. Open `index.html` in a web browser. No server required.

## Privacy

- Processing is fully in-browser. Files are not uploaded to any server.
- Close the tab to clear in-memory data. Exported files are saved locally to your machine.

## License

This project is licensed under the MIT License. See ./LICENSE.

## Acknowledgements

- PapaParse for CSV parsing.
- The Wisconsin Breast Cancer Dataset for example data (included for educational purposes).
