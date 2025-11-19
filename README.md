# marijoAI

This repo contains the code of the website "https://marijoai.com".

marijoAI is a browser-based, no-code tool to train and use a professional-grade neural network for binary classification, entirely on your device. It lets you:

- Upload a CSV and automatically prepare tabular data
- Train a fixed binary-classification neural network in the browser
- Make predictions and export results

All processing happens client-side in your browser. Your data never leaves your device.

## Features

- Auto CSV detection (header row and delimiter)
- Integrated cleaning in Train/Predict: remove duplicate rows, impute missing numeric values (mean), normalize numeric features to 0–1
- Optional validation holdout in Train (~20%) with downloadable Validation CSV (excluded from training)
- Visual, step-by-step pages: Train → Predict (plus a Tutorial page)
- Fixed model architecture for simplicity:
  - Input layer: auto-detected feature count from CSV
  - Hidden layer: 64 neurons, ReLU
  - Output layer: 1 neuron, Sigmoid
- Live training history (loss/accuracy)
- Download trained model as JSON; reload later to predict
- Predict reuses training-time preprocessing (feature order and scaling) saved with the model
- For predictions (after training), evaluation metrics when ground truth is available
- Step-by-step tutorial using the included Wisconsin Breast Cancer dataset

## To use the project without an internet connection

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
