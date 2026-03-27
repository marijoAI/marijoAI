# marijoAI

This repo contains the code of the website "https://marijoai.com".

marijoAI is a browser-based, no-code tool that helps SaaS and subscription businesses predict customer churn using AI — entirely on your device. It lets you:

- Upload a CSV of customer data and automatically prepare it for training
- Train a neural network to predict which customers will churn
- Score customers with churn risk levels and export results

All processing happens client-side in your browser. Your customer data never leaves your device — no DPA, no vendor risk review, no data compliance concerns.

## Features

- Auto CSV detection (header row and delimiter)
- Integrated data cleaning: remove duplicate rows, impute missing values, normalize features
- Optional validation holdout (~20%) with downloadable validation CSV
- Visual step-by-step workflow: Train → Score (plus a Tutorial page)
- Fixed model architecture for simplicity:
  - Input layer: auto-detected feature count from CSV
  - Hidden layer: 64 neurons, ReLU
  - Output layer: 1 neuron, Sigmoid
- Live training feedback with loss and accuracy per epoch
- Churn risk summary: see how many customers are at risk at a glance
- Download trained model as JSON; reload later to score new customer lists
- Scoring reuses training-time preprocessing (feature order and scaling) saved with the model
- Evaluation metrics and confusion matrix when ground truth is available
- Step-by-step tutorial using the included SaaS customer churn sample dataset

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
- Sample SaaS customer churn dataset included for the tutorial.
