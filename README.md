# MarijoAI

This repo contains the code of the website "https://marijoai.com".

MarijoAI is a browser-based, no-code tool to build, train, and use custom neural networks entirely on your device. It lets you:

- Clean and prepare tabular data (CSV)
- Define a neural network architecture
- Train a model in the browser with a custom JS neural network
- Make predictions and export results

All processing happens client-side in your browser. Your data never leaves your device.

## Features

- Clean data workflow with CSV parsing and validation
- Automatic cleaning: remove duplicate rows, drop rows with missing values, normalize numeric features
- Optional split into training/validation with fixed validation ratio 0.2
- Visual, step-by-step pages: Clean Data → Create → Train → Predict
- Custom neural network implementation with ReLU/Sigmoid/Tanh/Softmax (and more) and Adam optimizer
- Live training history (loss/accuracy)
- Download trained model as JSON; reload later to predict
- For predictions (after training), accuracy evaluation when ground truth is available
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
