/**
 * Internationalization (i18n) Module
 *
 * Provides a lightweight translation layer for marijoAI.
 * - Supported languages: English (en, default), French (fr), Spanish (es).
 * - The selected language is persisted in localStorage under `marijoai.lang`.
 * - Translations are applied declaratively via `data-i18n` attributes on DOM
 *   elements and imperatively via `window.i18n.t(key, params)`.
 *
 * Supported element attributes:
 *   data-i18n="<key>"             → sets element.innerHTML to the translation
 *                                   (translations are author-controlled so
 *                                   safe HTML like <b>, <code>, <a> is allowed)
 *   data-i18n-text="<key>"        → sets element.textContent (no HTML)
 *   data-i18n-placeholder="<key>" → sets the `placeholder` attribute
 *   data-i18n-title="<key>"       → sets the `title` attribute
 *   data-i18n-aria-label="<key>"  → sets the `aria-label` attribute
 *
 * Placeholders in a translation string follow the `{name}` syntax and are
 * substituted by `t(key, { name: value })`.
 */

(function () {
    'use strict';

    var DEFAULT_LANG = 'en';
    var SUPPORTED = ['en', 'fr', 'es'];
    var STORAGE_KEY = 'marijoai.lang';

    var translations = {
        en: {
            /* ===== Header / navigation ===== */
            'nav.toggle_aria': 'Toggle navigation',
            'nav.train': 'Train',
            'nav.score': 'Score',
            'nav.tutorial': 'Tutorial',
            'nav.documentation': 'Documentation',
            'nav.language_label': 'Language',

            /* ===== Homepage ===== */
            'home.meta_description': 'Predict which customers will churn — no coding, no data team, no data leaving your browser.',
            'home.page_title': 'marijoAI - Predict Customer Churn with AI',
            'home.hero.title_line1': 'Predict Customer Churn',
            'home.hero.title_line2': 'Before It Happens',
            'home.hero.subtitle': 'Upload your customer data, train an AI model, and identify who\u2019s about to leave — no coding required, no data team needed, and your data never leaves your browser.',
            'home.hero.btn_train': 'Train a Churn Model',
            'home.hero.btn_score': 'Score Customers',
            'home.features.title': 'How It Works',
            'home.features.train.title': 'Train a Churn Model',
            'home.features.train.body': 'Export a CSV from your CRM or billing tool, upload it here, select the churn column, and train an AI model with live progress — all in your browser.',
            'home.features.train.cta': 'Train Model →',
            'home.features.score.title': 'Score Your Customers',
            'home.features.score.body': 'Load your trained model and a customer list to get instant churn risk scores, confidence levels, and see exactly who needs attention now.',
            'home.features.score.cta': 'Score Customers →',
            'home.benefits.title': 'Why Customer Success Teams Use marijoAI',
            'home.benefits.noteam.title': '🎯 No Data Team Required',
            'home.benefits.noteam.body': 'Train a professional-grade churn model through a visual interface — no Python, no SQL, no data scientists',
            'home.benefits.privacy.title': '🔒 Your Data Stays on Your Device',
            'home.benefits.privacy.body': 'All processing runs in your browser. Customer data never touches a server — no DPA, no vendor risk review',
            'home.benefits.live.title': '📊 Live Training Feedback',
            'home.benefits.live.body': 'Watch the model learn in real time with loss and accuracy metrics updated every epoch',
            'home.benefits.csv.title': '⚡ Works with Any CSV',
            'home.benefits.csv.body': 'Export from Stripe, HubSpot, Intercom, or any tool — if it\u2019s a CSV with customer metrics, it works',
            'home.benefits.save.title': '💾 Save and Reuse Models',
            'home.benefits.save.body': 'Download your trained model as JSON and reload it anytime to score new customer lists',
            'home.benefits.quick.title': '🎨 Get Started in 2 Minutes',
            'home.benefits.quick.body': 'Follow the <a href="#/tutorial">step-by-step tutorial</a> — you\u2019ll have a working model almost instantly',
            'home.usecases.title': 'What You Can Predict',
            'home.usecases.intro': '<b>marijoAI uses AI-powered binary classification to score each customer as "will churn" or "will stay." Feed it any numeric customer metrics:</b>',
            'home.usecases.subscription': '<b>Subscription churn</b> — which customers will cancel this month?',
            'home.usecases.revenue': '<b>Revenue churn</b> — which accounts are likely to downgrade?',
            'home.usecases.trial': '<b>Trial conversion</b> — which free users will convert to paid?',
            'home.usecases.engagement': '<b>Engagement drop-off</b> — which users are going inactive?',
            'home.usecases.renewal': '<b>Renewal risk</b> — which annual contracts won\u2019t renew?',
            'home.usecases.expansion': '<b>Expansion likelihood</b> — which customers are ready to upgrade?',
            'home.usecases.outro': '<b>Any yes/no customer outcome you can export as a CSV with numeric data.</b>',
            'home.opensource.title': 'We are open-source!',
            'home.opensource.body': 'marijoAI is released under the MIT license. Read the code, fork it, self-host it, or contribute — every line that runs in your browser is public.',
            'home.opensource.cta': 'View on GitHub →',

            /* ===== Footer ===== */
            'footer.copyright': '© 2025 - 2026 marijoAI',
            'footer.linkedin': 'Our LinkedIn',
            'footer.legal': 'Legal Mentions',
            'footer.privacy': 'Privacy Policy',
            'footer.cookies': 'Cookies Policy',

            /* ===== No-cookies banner ===== */
            'banner.text': 'No cookies are used on this website.',
            'banner.learn_more': 'Learn more',
            'banner.dismiss': 'Got it',
            'banner.dismiss_aria': 'Dismiss notification',

            /* ===== Legal / Privacy / Cookies ===== */
            'legal.title': 'Legal Mentions',
            'legal.subtitle': 'Information about the website',
            'legal.org_name': 'Organization Name:',
            'legal.owner': 'Owner:',
            'legal.host': 'Host:',
            'legal.contact': 'Contact:',
            'legal.linkedin_text': 'Linkedin',

            'privacy.title': 'Privacy Policy',
            'privacy.subtitle': 'How we handle your data',
            'privacy.processing.title': 'Data Processing',
            'privacy.processing.body': 'No data is transmitted to our servers. All processing happens in your browser on your device.',
            'privacy.personal.title': 'Personal Data',
            'privacy.personal.body': 'We do not collect or store personal data. Files you upload are processed locally and never sent to a remote server by this application.',
            'privacy.contact.title': 'Contact',
            'privacy.contact.body': 'For any questions, contact us on <a href="https://www.linkedin.com/company/marijoai">our LinkedIn page</a>.',

            'cookies.title': 'Cookies Policy',
            'cookies.subtitle': 'Information about cookies usage',
            'cookies.usage.title': 'Cookies Usage',
            'cookies.usage.body': 'No cookies are used on this website.',

            /* ===== Train page ===== */
            'train.title': 'Train Churn Model',
            'train.data_file': 'Customer Data (CSV file)',
            'train.create_validation': 'Hold out a validation set (excluded from training)',
            'train.create_validation_hint': 'Check this to create a separate CSV for validating model accuracy with predictions.',
            'train.has_id': 'Dataset contains an ID column',
            'train.has_id_hint': 'Check this if a column holds customer or row identifiers. That column will be excluded from training (not used as a feature).',
            'train.id_column': 'ID column',
            'train.id_column_hint': 'Choose which column is the identifier. It must not be the churn column.',
            'train.target_column': 'Churn column (the outcome to predict)',
            'train.target_column_hint': 'Select the column that indicates whether a customer churned.',
            'train.dataset_summary': 'Dataset Summary',
            'train.customers': 'Customers:',
            'train.features': 'Features:',
            'train.btn_start': 'Train Churn Model',
            'train.btn_reset': 'Reset',
            'train.progress.title': 'Training Progress',
            'train.progress.history_title': 'Training History',
            'train.progress.col_epoch': 'Epoch',
            'train.progress.col_loss': 'Loss',
            'train.progress.col_accuracy': 'Accuracy',
            'train.progress.epoch_of': 'Epoch {current} of {total}',
            'train.complete.title': 'Training Complete',
            'train.complete.body': 'Your churn model is ready! Download it and head to Score Customers to identify at-risk accounts.',
            'train.complete.download_model': 'Download Churn Model',
            'train.complete.download_validation': 'Download Validation CSV',

            /* ===== Car-game easter egg ===== */
            'car_game.banner': 'Find training too long? Play our little car game while waiting!',
            'car_game.banner_desktop_only': '(playable on Desktop only)',
            'car_game.hint': 'Use the arrow keys to drive — collect the stars. Multiple arrows can be pressed at once.',
            'car_game.hud.stars': 'Stars: {n}',
            'car_game.training_complete': 'Training complete, you can close the game!',
            'car_game.close_aria': 'Close game and return to training',

            /* Select placeholders */
            'select.upload_first': '-- Upload CSV first --',
            'select.pick_target': '-- Select target column --',
            'select.pick_id': '-- Select ID column --',

            /* ===== Train dynamic messages ===== */
            'train.msg.loaded': 'Successfully loaded {rows} rows of training data (delimiter "{delimiter}", header: {header}).',
            'train.msg.yes': 'yes',
            'train.msg.no': 'no',
            'train.msg.err_parse': 'Error parsing CSV file: {error}',
            'train.msg.err_read': 'Error reading file: {error}',
            'train.msg.err_detect': 'Failed to detect CSV format: {error}',
            'train.msg.err_no_valid': 'No valid data found in CSV file',
            'train.msg.err_upload_first': 'Please upload data first',
            'train.msg.err_pick_target': 'Please select the target column to predict.',
            'train.msg.err_pick_id': 'Please select which column is the ID column.',
            'train.msg.err_id_equals_target': 'The ID column cannot be the same as the churn column.',
            'train.msg.err_invalid_feature': 'Invalid feature data format',
            'train.msg.err_prepare': 'Error preparing data: {error}',
            'train.msg.err_detect_features': 'Could not detect input features from the CSV.',
            'train.msg.err_empty_training': 'Invalid training data: features or labels are empty',
            'train.msg.starting': 'Starting the Neural Network...',
            'train.msg.training_complete': 'Model training completed successfully!',
            'train.msg.err_training': 'Training error: {error}',
            'train.msg.err_no_model': 'No trained model to download',
            'train.msg.model_downloaded': 'Trained model downloaded successfully!',
            'train.msg.err_download_model': 'Error downloading model: {error}',
            'train.msg.err_no_validation': 'No validation data to download',
            'train.msg.validation_downloaded': 'Validation CSV downloaded successfully!',
            'train.msg.err_download_validation': 'Error downloading validation CSV: {error}',

            /* Label mapping display */
            'labels.mappings_title': 'Label Mappings',
            'labels.mappings_train_note': 'These mappings are used during training and prediction.',
            'labels.mappings_predict_note': 'Predictions will use these mappings to show meaningful class names.',
            'labels.mappings_predict_hint': 'These mappings show how original values were converted to numbers during training.',
            'labels.col_original': 'Original Value',
            'labels.col_mapped': 'Mapped To',

            /* ===== Predict (Score) page ===== */
            'predict.title': 'Score Customers',
            'predict.model_file': 'Churn Model (JSON)',
            'predict.customer_list': 'Customer List (CSV file)',
            'predict.customer_list_hint': 'Upload a CSV with the same columns as your training data.',
            'predict.has_id': 'Dataset contains an ID column',
            'predict.has_id_hint': 'Check this to exclude a customer or row ID column from scoring (same column as in training, if you used one).',
            'predict.id_column': 'ID column',
            'predict.id_column_hint': 'Choose which column is the identifier. It is not fed into the model.',
            'predict.has_target': 'CSV still contains the churn column',
            'predict.has_target_hint': 'Check this to calculate accuracy against known outcomes.',
            'predict.target_column': 'Churn column',
            'predict.loading_model': 'Loading model...',
            'predict.btn_score': 'Score Customers',
            'predict.btn_reset': 'Reset',
            'predict.btn_download': 'Download Results',

            'predict.results.title': 'Churn Risk Results',
            'predict.risk_tiers.title': 'Risk Tier Breakdown',
            'predict.risk_tiers.subtitle': 'Customers are grouped into tiers based on their churn score (0 = will stay, 1 = will churn).',
            'predict.risk_tiers.safe': 'Safe',
            'predict.risk_tiers.watch': 'Watch',
            'predict.risk_tiers.atrisk': 'At risk',
            'predict.risk_tiers.critical': 'Critical',
            'predict.risk_tiers.range_safe': 'Score 0.00 – 0.20',
            'predict.risk_tiers.range_watch': 'Score 0.20 – 0.50',
            'predict.risk_tiers.range_atrisk': 'Score 0.50 – 0.80',
            'predict.risk_tiers.range_critical': 'Score 0.80 – 1.00',

            'predict.drivers.title': 'Top Churn Drivers',
            'predict.drivers.intro': 'Across the whole customer list, these are the parameters that influence the churn score the most.',
            'predict.drivers.analyzing': 'Analyzing what drives churn in your dataset…',
            'predict.drivers.footnote': 'The value on the right is how much the churn score moves, on average, when that parameter is scrambled across customers. Bigger = more important.',

            'predict.metrics.title': 'Model Accuracy (vs. known outcomes)',
            'predict.metrics.accuracy': 'Accuracy:',
            'predict.metrics.predicted_stayed': 'Predicted Stayed',
            'predict.metrics.predicted_churned': 'Predicted Churned',
            'predict.metrics.actual_stayed': 'Actually Stayed',
            'predict.metrics.actual_churned': 'Actually Churned',

            'predict.filter.label': 'Churn score filter',
            'predict.filter.all': 'Show all customers',
            'predict.filter.gt': 'Score greater than',
            'predict.filter.lt': 'Score less than',
            'predict.filter.threshold': 'Threshold',
            'predict.filter.threshold_hint': '(0–1)',

            'predict.sort.label': 'Sort results',
            'predict.sort.dataset_asc': 'Dataset order',
            'predict.sort.dataset_desc': 'Dataset order (reverse)',
            'predict.sort.score_desc': 'Churn score (high to low)',
            'predict.sort.score_asc': 'Churn score (low to high)',
            'predict.page_size.label': 'Rows per page',
            'predict.page.prev': 'Previous',
            'predict.page.next': 'Next',

            'predict.col.customer': 'Customer',
            'predict.col.score': 'Churn Score',
            'predict.col.confidence': 'Confidence',
            'predict.col.risk_level': 'Risk Level',
            'predict.col.risk_tier': 'Risk Tier',

            /* ===== Predict dynamic messages ===== */
            'predict.msg.model_loaded': 'Trained model loaded successfully!',
            'predict.msg.err_load_model': 'Error loading model: {error}',
            'predict.msg.err_parse': 'Error parsing CSV file: {error}',
            'predict.msg.err_read': 'Error reading file: {error}',
            'predict.msg.err_detect': 'Failed to detect CSV format: {error}',
            'predict.msg.csv_loaded': 'Successfully loaded {rows} rows of test data (delimiter "{delimiter}", header: {header}).',
            'predict.msg.err_upload_both': 'Please upload both trained model and test data',
            'predict.msg.err_pick_id': 'Please select which column is the ID column.',
            'predict.msg.err_id_equals_target': 'The ID column cannot be the same as the churn column.',
            'predict.msg.scored': 'Predictions completed for {count} samples.',
            'predict.msg.err_predict': 'Prediction error: {error}',
            'predict.msg.err_no_predictions': 'No predictions to download',
            'predict.msg.err_no_filter_match': 'No rows match the current churn score filter. Adjust the threshold or choose Show all customers.',
            'predict.msg.downloaded_one': 'Downloaded {count} row (current sort and filter).',
            'predict.msg.downloaded_many': 'Downloaded {count} rows (current sort and filter).',
            'predict.msg.at_risk_headline_one': '{count} of {total} customer ({pct}%) is at risk of churning.',
            'predict.msg.at_risk_headline_many': '{count} of {total} customers ({pct}%) are at risk of churning.',
            'predict.msg.at_risk_detail': 'Review the table below to identify which accounts need immediate attention.',
            'predict.msg.no_risk_detail': 'No customers were flagged as high churn risk by the model.',
            'predict.msg.empty_filtered': 'No rows match the current churn score filter. Try another threshold or choose Show all customers.',
            'predict.msg.analyzing_drivers': 'Analyzing top churn drivers…',
            'predict.msg.drivers_none': 'Not enough information to identify churn drivers in this dataset.',
            'predict.msg.drivers_top': 'Across all customers, changes in {feature} move churn score the most.',
            'predict.msg.drivers_flat': 'All parameters look equally (un)important for this model. The score barely changes when any single parameter is scrambled.',
            'predict.msg.page_no_match': 'No matches ({total} scored)',
            'predict.msg.page_info': 'Page {page} of {pages} ({start}–{end} of {total})',
            'predict.msg.note_filtered': 'Showing {shown} of {total} customers after the score filter.',
            'predict.msg.note_browse': 'Use Previous / Next to browse.',
            'predict.msg.note_adjust_filter': 'Adjust or clear the filter to export rows.',
            'predict.msg.note_download_scope': 'Download Results exports only the rows selected by the applied filters, and in the sorting order selected.',

            /* ===== Tutorial ===== */
            'tutorial.title': 'Step-by-Step Tutorial',
            'tutorial.subtitle': 'Build a working churn prediction model in under 5 minutes.',
            'tutorial.step1.title': '1) Get the Data',
            'tutorial.step1.body': '<a href="data\\customer_churn_dataset-testing-master.csv" download>Download the SaaS churn dataset</a> (64 thousand customers with subscription metrics and churn outcomes).',
            'tutorial.step2.title': '2) Train the Model',
            'tutorial.step2.li1': 'Open <a href="#/train" target="_blank">Train</a> in a new tab and upload the CSV.',
            'tutorial.step2.li2': 'As the dataset has a customer ID column, check \u201CDataset contains an ID column\u201D.',
            'tutorial.step2.li3': 'Pick the "CustomerID" column so it is not used as a feature.',
            'tutorial.step2.li4': 'Check \u201CHold out a validation set\u201D so you can test accuracy after training.',
            'tutorial.step2.li5': 'Select the \u201CChurn\u201D column as the churn column.',
            'tutorial.step2.li6': 'Click "Train Churn Model" and watch the AI learn.',
            'tutorial.step2.li7': 'Download the trained model and the validation CSV.',
            'tutorial.step3.title': '3) Score Customers',
            'tutorial.step3.li1': 'Open <a href="#/predict" target="_blank">Score Customers</a> in a new tab.',
            'tutorial.step3.li2': 'Upload the churn model and the validation CSV you just downloaded.',
            'tutorial.step3.li3': 'Check \u201CDataset contains an ID column\u201D and select the "CustomerID" column.',
            'tutorial.step3.li4': 'Check "CSV still contains the churn column".',
            'tutorial.step3.li5': 'Select the "Churn" column as the churn column.',
            'tutorial.step3.li6': 'Click "Score Customers" to see churn risk predictions.',
            'tutorial.done': '<b>That\u2019s it! You\u2019ve built a customer churn predictor end-to-end.</b>',

            /* ===== Documentation ===== */
            'doc.title': 'Documentation',
            'doc.subtitle': 'What marijoAI is, and what powers it under the hood.',
            'doc.what.title': 'What is marijoAI?',
            'doc.what.p1': 'marijoAI is a browser-based, no-code application that helps SaaS and subscription businesses predict <b>customer churn</b> using a neural network — entirely on your device.',
            'doc.what.p2': 'You upload a CSV exported from your CRM, billing tool, or analytics platform. The app detects the format, cleans the data, trains a binary classifier, and lets you score new customer lists. Every step runs locally in your browser: no accounts, no servers, no data leaving your machine.',
            'doc.what.p3': 'It is designed for customer success, revenue, and product teams that need actionable churn predictions without a data science team, a vendor review, or a data processing agreement.',
            'doc.workflow.title': 'The Workflow',
            'doc.workflow.intro': 'marijoAI is structured around three simple pages:',
            'doc.workflow.li1': '<b><a href="#/train">Train</a></b> — upload a CSV, pick the churn column, and train a neural network. The model learns from historical customers you already know churned or stayed.',
            'doc.workflow.li2': '<b><a href="#/predict">Score</a></b> — load a trained model and a new customer list to get a churn score, a risk tier, and the top drivers of churn across the dataset.',
            'doc.workflow.li3': '<b><a href="#/tutorial">Tutorial</a></b> — a step-by-step walk-through using an included public SaaS churn dataset so you can get a working model in under five minutes.',
            'doc.arch.title': 'Browser-First, Privacy-First Architecture',
            'doc.arch.p1': 'marijoAI is a single-page static web application. The entire stack — data parsing, model training, scoring, and visualization — executes in your browser tab. There is no backend, no database, and no telemetry.',
            'doc.arch.p2': 'Concretely, this means:',
            'doc.arch.li1': 'Your CSV files are read with the browser\'s <code>File</code> API and parsed in memory.',
            'doc.arch.li2': 'Training runs on your CPU, in the same tab, using WebAssembly when available.',
            'doc.arch.li3': 'Trained models are downloaded as plain JSON files to your local disk.',
            'doc.arch.li4': 'Closing the tab clears all in-memory data.',
            'doc.arch.li5': 'No cookies, no tracking scripts, no analytics.',
            'doc.stack.title': 'Technology Stack',
            'doc.stack.intro': 'The entire application is built with a deliberately minimal, dependency-light stack:',
            'doc.stack.frontend.title': 'Front-end',
            'doc.stack.frontend.body': '<b>Vanilla HTML, CSS, and JavaScript (ES6+).</b> No React, Vue, Svelte, or build step for the UI. The app is a single <code>index.html</code> with page templates rendered by a small hash-based SPA router.',
            'doc.stack.styling.title': 'Styling',
            'doc.stack.styling.body': '<b>Hand-written CSS with custom properties</b> for the design system (primary indigo, accent pink, glassmorphic cards). Typography uses <b>Inter</b> from Google Fonts.',
            'doc.stack.csv.title': 'CSV parsing',
            'doc.stack.csv.body': '<b><a href="https://www.papaparse.com/" target="_blank" rel="noopener">PapaParse 5.4</a></b> handles CSV reading, tolerant of messy real-world exports. Delimiter and header presence are auto-detected from the first few lines.',
            'doc.stack.nn.title': 'Neural network core',
            'doc.stack.nn.body': '<b><a href="https://www.assemblyscript.org/" target="_blank" rel="noopener">AssemblyScript</a></b> compiled to <b>WebAssembly</b> (<code>wasm/nn.wasm</code>) for fast training, with a pure-JavaScript fallback when WebAssembly is unavailable.',
            'doc.stack.routing.title': 'Routing',
            'doc.stack.routing.body': 'A ~80-line <b>hash-based SPA router</b> (<code>js/router.js</code>) that swaps <code>&lt;template&gt;</code> contents into the DOM and invokes page initialization hooks.',
            'doc.stack.hosting.title': 'Hosting',
            'doc.stack.hosting.body': 'Fully static. The app can be served from any static host, or opened directly from disk as a local <code>index.html</code> file — no server required.',
            'doc.nn.title': 'The Neural Network',
            'doc.nn.p1': 'marijoAI uses a small, fixed <b>feed-forward neural network</b> for binary classification. The architecture is intentionally simple so it trains quickly on a laptop and generalizes well on typical tabular customer data:',
            'doc.nn.li1': '<b>Input layer</b> — one neuron per numeric feature detected in your CSV (the churn column and any ID column are excluded automatically).',
            'doc.nn.li2': '<b>Hidden layer</b> — 64 neurons with <b>ReLU</b> activation.',
            'doc.nn.li3': '<b>Output layer</b> — 1 neuron with <b>sigmoid</b> activation, producing a churn probability in <code>[0, 1]</code>.',
            'doc.nn.p2': 'Weights are initialized with <b>Xavier / Glorot uniform</b> initialization. The loss function is <b>binary cross-entropy</b>, which is the standard choice for sigmoid-output classifiers.',
            'doc.nn.p3': 'Optimization uses <b>Adam</b> (adaptive moment estimation) with default hyper-parameters <code>β₁ = 0.9</code>, <code>β₂ = 0.999</code>, <code>ε = 1e-8</code>, a learning rate of <code>0.001</code>, a batch size of <code>32</code>, and <code>100</code> epochs. These values are tuned to work well out-of-the-box on typical subscription-business datasets.',
            'doc.wasm.title': 'WebAssembly Training Engine',
            'doc.wasm.p1': 'The performance-critical inner loop — forward pass, back-propagation, Adam updates, epoch-level training — is implemented in <b>AssemblyScript</b> and compiled ahead of time to a compact <code>wasm/nn.wasm</code> module. The source lives in <code>assembly/index.ts</code>.',
            'doc.wasm.p2': 'The WebAssembly module manages its own linear memory: weights, biases, Adam first- and second-moment estimates, gradient accumulators, and the training dataset are all stored as flat <code>f64</code> arrays at fixed pointer offsets. JavaScript uploads features and labels once, then drives training one epoch at a time, reading back loss and accuracy after each epoch to power the live progress UI.',
            'doc.wasm.p3': 'When WebAssembly is unavailable — for example on very old browsers or certain locked-down environments — the same network is trained by an equivalent <b>pure-JavaScript implementation</b> in <code>js/neural-network.js</code>. The model produced by either path is numerically compatible: weights can be exported from one and loaded into the other.',
            'doc.pipeline.title': 'Data Pipeline',
            'doc.pipeline.intro': 'Before any neuron sees your data, marijoAI performs an automatic, deterministic preprocessing pipeline:',
            'doc.pipeline.li1': '<b>Format auto-detection.</b> A sample of the first few lines is scanned to pick the most likely delimiter (<code>,</code>, <code>;</code>, tab, or <code>|</code>) and to decide whether the first row is a header, using a numeric-ratio heuristic.',
            'doc.pipeline.li2': '<b>Row validation.</b> Empty rows and rows with no usable values are dropped.',
            'doc.pipeline.li3': '<b>Column selection.</b> The churn column and optional ID column are excluded. Among the remaining columns, only those that contain at least one parseable number are kept as features.',
            'doc.pipeline.li4': '<b>Deduplication.</b> Exact duplicate feature + label combinations are removed so they do not bias training.',
            'doc.pipeline.li5': '<b>Missing-value imputation.</b> Non-numeric or empty cells in a feature column are replaced by the <b>column mean</b> computed from the valid values.',
            'doc.pipeline.li6': '<b>Validation holdout.</b> If requested, a random <b>20%</b> of the data is held out as a validation set and exported as a separate CSV so you can measure real-world accuracy later.',
            'doc.pipeline.li7': '<b>Min–max normalization.</b> Each feature is rescaled to <code>[0, 1]</code> using the min and max from the training rows only (to avoid leakage). These stats are saved with the model so scoring uses the exact same scaling.',
            'doc.pipeline.li8': '<b>Label mapping.</b> Common textual churn labels — <code>yes</code>/<code>no</code>, <code>true</code>/<code>false</code>, <code>churned</code>/<code>retained</code>, <code>left</code>/<code>stayed</code>, <code>inactive</code>/<code>active</code> — are automatically mapped to <code>1</code>/<code>0</code>. The mapping is surfaced in the UI so you can verify it before training.',
            'doc.scoring.title': 'Scoring and Interpretation',
            'doc.scoring.p1': 'On the Score page, the trained model outputs a <b>churn score</b> between <code>0</code> (will stay) and <code>1</code> (will churn) for each customer. marijoAI turns that raw probability into actionable views:',
            'doc.scoring.li1': '<b>Risk tiers.</b> Scores are bucketed into <b>Safe</b> (0.00–0.20), <b>Watch</b> (0.20–0.50), <b>At risk</b> (0.50–0.80), and <b>Critical</b> (0.80–1.00).',
            'doc.scoring.li2': '<b>Confidence.</b> How far the score is from the 0.5 decision boundary, so you can distinguish strong predictions from uncertain ones.',
            'doc.scoring.li3': '<b>Accuracy evaluation.</b> If the scored CSV still contains the true churn column, the app computes overall accuracy and a full <b>confusion matrix</b> (predicted vs. actual).',
            'doc.scoring.li4': '<b>Top churn drivers.</b> Global feature importance is estimated via <b>permutation importance</b>: for each feature, its values are shuffled across customers and the average change in the churn score is measured. Features whose shuffling changes predictions the most are the strongest drivers.',
            'doc.scoring.p2': 'Results can be sorted, filtered by score threshold, paginated, and exported to CSV for follow-up in your CRM or customer success tool.',
            'doc.persist.title': 'Model Persistence',
            'doc.persist.p1': 'A trained model is saved as a single, human-readable <b>JSON file</b>. It contains:',
            'doc.persist.li1': 'The network <b>architecture</b> (layer sizes and activations).',
            'doc.persist.li2': 'All <b>weights and biases</b>.',
            'doc.persist.li3': 'The <b>preprocessing metadata</b>: the ordered list of feature column names, per-column min/max for normalization, the churn column name, the ID column (if any), and the label-to-number mapping.',
            'doc.persist.p2': 'Because preprocessing travels with the model, you can close the tab, come back a month later, re-upload the JSON with any CSV that has the same columns, and get perfectly consistent scoring. The model file is also small enough to check into version control or attach to an email.',
            'doc.req.title': 'Requirements and Compatibility',
            'doc.req.li1': '<b>Any modern browser</b> — recent Chrome, Edge, Firefox, Safari... WebAssembly is used automatically when present.',
            'doc.req.li2': '<b>No internet connection required</b> after the page is loaded. The app also runs from a local file for fully offline use.',
            'doc.req.li3': '<b>Any CSV</b> with at least one numeric feature column and a binary churn column. Datasets with tens of thousands of rows train in seconds on a typical laptop.',
            'doc.oss.title': 'Open Source',
            'doc.oss.body': 'marijoAI is released under the <b>MIT license</b>. The source code lives on <a href="https://github.com/marijoai/marijoai" target="_blank">GitHub</a>.'
        },

        fr: {
            /* ===== Header / navigation ===== */
            'nav.toggle_aria': 'Afficher le menu',
            'nav.train': 'Entraîner',
            'nav.score': 'Scorer',
            'nav.tutorial': 'Tutoriel',
            'nav.documentation': 'Documentation',
            'nav.language_label': 'Langue',

            /* ===== Homepage ===== */
            'home.meta_description': 'Prédisez quels clients vont partir — sans code, sans équipe data, et sans que vos données ne quittent votre navigateur.',
            'home.page_title': 'marijoAI - Prédiction de churn client par IA',
            'home.hero.title_line1': 'Prédisez le churn de vos clients',
            'home.hero.title_line2': 'Avant qu\u2019il n\u2019arrive',
            'home.hero.subtitle': 'Importez vos données clients, entraînez un modèle d\u2019IA et identifiez qui s\u2019apprête à partir — sans coder, sans équipe data, et vos données ne quittent jamais votre navigateur.',
            'home.hero.btn_train': 'Entraîner un modèle de churn',
            'home.hero.btn_score': 'Scorer mes clients',
            'home.features.title': 'Comment ça marche',
            'home.features.train.title': 'Entraîner un modèle de churn',
            'home.features.train.body': 'Exportez un CSV depuis votre CRM ou votre outil de facturation, importez-le ici, sélectionnez la colonne de churn et entraînez un modèle d\u2019IA avec un suivi en direct — le tout dans votre navigateur.',
            'home.features.train.cta': 'Entraîner le modèle →',
            'home.features.score.title': 'Scorer vos clients',
            'home.features.score.body': 'Chargez votre modèle entraîné et une liste de clients pour obtenir instantanément des scores de risque de churn, des niveaux de confiance et identifier qui demande une attention immédiate.',
            'home.features.score.cta': 'Scorer les clients →',
            'home.benefits.title': 'Pourquoi les équipes Customer Success utilisent marijoAI',
            'home.benefits.noteam.title': '🎯 Aucune équipe data nécessaire',
            'home.benefits.noteam.body': 'Entraînez un modèle de churn de qualité professionnelle via une interface visuelle — sans Python, sans SQL, sans data scientist.',
            'home.benefits.privacy.title': '🔒 Vos données restent sur votre appareil',
            'home.benefits.privacy.body': 'Tout le traitement s\u2019effectue dans votre navigateur. Les données clients ne touchent aucun serveur — aucun DPA, aucune revue de sécurité fournisseur.',
            'home.benefits.live.title': '📊 Retour d\u2019entraînement en direct',
            'home.benefits.live.body': 'Observez le modèle apprendre en temps réel avec les métriques de perte et de précision mises à jour à chaque époque.',
            'home.benefits.csv.title': '⚡ Compatible avec n\u2019importe quel CSV',
            'home.benefits.csv.body': 'Exportez depuis Stripe, HubSpot, Intercom ou n\u2019importe quel outil — si c\u2019est un CSV avec des métriques clients, ça fonctionne.',
            'home.benefits.save.title': '💾 Sauvegarde et réutilisation des modèles',
            'home.benefits.save.body': 'Téléchargez votre modèle entraîné au format JSON et rechargez-le à tout moment pour scorer de nouvelles listes de clients.',
            'home.benefits.quick.title': '🎨 Démarrez en 2 minutes',
            'home.benefits.quick.body': 'Suivez le <a href="#/tutorial">tutoriel pas à pas</a> — vous aurez un modèle fonctionnel quasi instantanément.',
            'home.usecases.title': 'Ce que vous pouvez prédire',
            'home.usecases.intro': '<b>marijoAI utilise une classification binaire par IA pour déterminer si chaque client « va partir » ou « va rester ». Alimentez-le avec n\u2019importe quelles métriques clients numériques :</b>',
            'home.usecases.subscription': '<b>Churn d\u2019abonnement</b> — quels clients vont résilier ce mois-ci ?',
            'home.usecases.revenue': '<b>Churn de revenu</b> — quels comptes risquent de passer à une offre inférieure ?',
            'home.usecases.trial': '<b>Conversion d\u2019essai</b> — quels utilisateurs gratuits vont passer au payant ?',
            'home.usecases.engagement': '<b>Baisse d\u2019engagement</b> — quels utilisateurs deviennent inactifs ?',
            'home.usecases.renewal': '<b>Risque de non-renouvellement</b> — quels contrats annuels ne seront pas renouvelés ?',
            'home.usecases.expansion': '<b>Probabilité d\u2019upsell</b> — quels clients sont prêts à monter en gamme ?',
            'home.usecases.outro': '<b>Tout résultat client binaire (oui/non) exportable en CSV avec des données numériques.</b>',
            'home.opensource.title': 'Nous sommes open-source !',
            'home.opensource.body': 'marijoAI est distribué sous licence MIT. Lisez le code, forkez-le, auto-hébergez-le ou contribuez — chaque ligne qui tourne dans votre navigateur est publique.',
            'home.opensource.cta': 'Voir sur GitHub →',

            /* ===== Footer ===== */
            'footer.copyright': '© 2025 - 2026 marijoAI',
            'footer.linkedin': 'Notre LinkedIn',
            'footer.legal': 'Mentions légales',
            'footer.privacy': 'Politique de confidentialité',
            'footer.cookies': 'Politique de cookies',

            /* ===== No-cookies banner ===== */
            'banner.text': 'Aucun cookie n\u2019est utilisé sur ce site.',
            'banner.learn_more': 'En savoir plus',
            'banner.dismiss': 'J\u2019ai compris',
            'banner.dismiss_aria': 'Fermer la notification',

            /* ===== Legal / Privacy / Cookies ===== */
            'legal.title': 'Mentions légales',
            'legal.subtitle': 'Informations sur le site',
            'legal.org_name': 'Nom de l\u2019organisation :',
            'legal.owner': 'Propriétaire :',
            'legal.host': 'Hébergeur :',
            'legal.contact': 'Contact :',
            'legal.linkedin_text': 'LinkedIn',

            'privacy.title': 'Politique de confidentialité',
            'privacy.subtitle': 'Comment nous traitons vos données',
            'privacy.processing.title': 'Traitement des données',
            'privacy.processing.body': 'Aucune donnée n\u2019est transmise à nos serveurs. Tout le traitement a lieu dans votre navigateur, sur votre appareil.',
            'privacy.personal.title': 'Données personnelles',
            'privacy.personal.body': 'Nous ne collectons ni ne stockons de données personnelles. Les fichiers que vous importez sont traités localement et ne sont jamais envoyés à un serveur distant par cette application.',
            'privacy.contact.title': 'Contact',
            'privacy.contact.body': 'Pour toute question, contactez-nous sur <a href="https://www.linkedin.com/company/marijoai">notre page LinkedIn</a>.',

            'cookies.title': 'Politique de cookies',
            'cookies.subtitle': 'Informations sur l\u2019utilisation des cookies',
            'cookies.usage.title': 'Utilisation des cookies',
            'cookies.usage.body': 'Aucun cookie n\u2019est utilisé sur ce site.',

            /* ===== Train page ===== */
            'train.title': 'Entraîner un modèle de churn',
            'train.data_file': 'Données clients (fichier CSV)',
            'train.create_validation': 'Conserver un jeu de validation (exclu de l\u2019entraînement)',
            'train.create_validation_hint': 'Cochez cette case pour créer un CSV séparé permettant de mesurer la précision du modèle avec des prédictions.',
            'train.has_id': 'Le jeu de données contient une colonne d\u2019identifiant',
            'train.has_id_hint': 'Cochez si une colonne contient des identifiants clients ou de ligne. Cette colonne sera exclue de l\u2019entraînement (non utilisée comme variable).',
            'train.id_column': 'Colonne d\u2019identifiant',
            'train.id_column_hint': 'Choisissez la colonne qui sert d\u2019identifiant. Elle ne peut pas être la colonne de churn.',
            'train.target_column': 'Colonne de churn (résultat à prédire)',
            'train.target_column_hint': 'Sélectionnez la colonne qui indique si un client a churné.',
            'train.dataset_summary': 'Résumé du jeu de données',
            'train.customers': 'Clients :',
            'train.features': 'Variables :',
            'train.btn_start': 'Entraîner le modèle de churn',
            'train.btn_reset': 'Réinitialiser',
            'train.progress.title': 'Progression de l\u2019entraînement',
            'train.progress.history_title': 'Historique d\u2019entraînement',
            'train.progress.col_epoch': 'Époque',
            'train.progress.col_loss': 'Perte',
            'train.progress.col_accuracy': 'Précision',
            'train.progress.epoch_of': 'Époque {current} sur {total}',
            'train.complete.title': 'Entraînement terminé',
            'train.complete.body': 'Votre modèle de churn est prêt ! Téléchargez-le et rendez-vous sur la page Scorer pour identifier les comptes à risque.',
            'train.complete.download_model': 'Télécharger le modèle de churn',
            'train.complete.download_validation': 'Télécharger le CSV de validation',

            /* ===== Easter-egg jeu de voiture ===== */
            'car_game.banner': 'L\u2019entraînement est trop long ? Jouez à notre petit jeu de voiture en attendant !',
            'car_game.banner_desktop_only': '(jouable sur ordinateur uniquement)',
            'car_game.hint': 'Utilisez les flèches du clavier pour conduire — attrapez les étoiles. Plusieurs flèches peuvent être pressées en même temps.',
            'car_game.hud.stars': 'Étoiles : {n}',
            'car_game.training_complete': 'Entraînement terminé, vous pouvez fermer le jeu !',
            'car_game.close_aria': 'Fermer le jeu et revenir à l\u2019entraînement',

            'select.upload_first': '-- Importez un CSV d\u2019abord --',
            'select.pick_target': '-- Choisir la colonne cible --',
            'select.pick_id': '-- Choisir la colonne d\u2019identifiant --',

            /* ===== Train dynamic messages ===== */
            'train.msg.loaded': '{rows} lignes de données d\u2019entraînement chargées avec succès (séparateur « {delimiter} », en-tête : {header}).',
            'train.msg.yes': 'oui',
            'train.msg.no': 'non',
            'train.msg.err_parse': 'Erreur lors de l\u2019analyse du CSV : {error}',
            'train.msg.err_read': 'Erreur de lecture du fichier : {error}',
            'train.msg.err_detect': 'Impossible de détecter le format du CSV : {error}',
            'train.msg.err_no_valid': 'Aucune donnée valide trouvée dans le fichier CSV',
            'train.msg.err_upload_first': 'Veuillez d\u2019abord importer un fichier de données',
            'train.msg.err_pick_target': 'Veuillez sélectionner la colonne cible à prédire.',
            'train.msg.err_pick_id': 'Veuillez indiquer quelle colonne est la colonne d\u2019identifiant.',
            'train.msg.err_id_equals_target': 'La colonne d\u2019identifiant ne peut pas être identique à la colonne de churn.',
            'train.msg.err_invalid_feature': 'Format de variables invalide',
            'train.msg.err_prepare': 'Erreur lors de la préparation des données : {error}',
            'train.msg.err_detect_features': 'Impossible de détecter les variables d\u2019entrée dans le CSV.',
            'train.msg.err_empty_training': 'Données d\u2019entraînement invalides : les variables ou les étiquettes sont vides',
            'train.msg.starting': 'Démarrage du réseau de neurones…',
            'train.msg.training_complete': 'Entraînement du modèle terminé avec succès !',
            'train.msg.err_training': 'Erreur d\u2019entraînement : {error}',
            'train.msg.err_no_model': 'Aucun modèle entraîné à télécharger',
            'train.msg.model_downloaded': 'Modèle entraîné téléchargé avec succès !',
            'train.msg.err_download_model': 'Erreur lors du téléchargement du modèle : {error}',
            'train.msg.err_no_validation': 'Aucune donnée de validation à télécharger',
            'train.msg.validation_downloaded': 'CSV de validation téléchargé avec succès !',
            'train.msg.err_download_validation': 'Erreur lors du téléchargement du CSV de validation : {error}',

            'labels.mappings_title': 'Correspondances d\u2019étiquettes',
            'labels.mappings_train_note': 'Ces correspondances sont utilisées pendant l\u2019entraînement et la prédiction.',
            'labels.mappings_predict_note': 'Les prédictions utiliseront ces correspondances pour afficher des noms de classes lisibles.',
            'labels.mappings_predict_hint': 'Ces correspondances montrent comment les valeurs d\u2019origine ont été converties en nombres pendant l\u2019entraînement.',
            'labels.col_original': 'Valeur d\u2019origine',
            'labels.col_mapped': 'Convertie en',

            /* ===== Predict (Score) page ===== */
            'predict.title': 'Scorer les clients',
            'predict.model_file': 'Modèle de churn (JSON)',
            'predict.customer_list': 'Liste de clients (fichier CSV)',
            'predict.customer_list_hint': 'Importez un CSV avec les mêmes colonnes que vos données d\u2019entraînement.',
            'predict.has_id': 'Le jeu de données contient une colonne d\u2019identifiant',
            'predict.has_id_hint': 'Cochez pour exclure une colonne d\u2019identifiant client ou de ligne du scoring (la même que lors de l\u2019entraînement, si vous en aviez une).',
            'predict.id_column': 'Colonne d\u2019identifiant',
            'predict.id_column_hint': 'Choisissez la colonne qui sert d\u2019identifiant. Elle n\u2019est pas fournie au modèle.',
            'predict.has_target': 'Le CSV contient encore la colonne de churn',
            'predict.has_target_hint': 'Cochez pour calculer la précision par rapport aux résultats réels connus.',
            'predict.target_column': 'Colonne de churn',
            'predict.loading_model': 'Chargement du modèle…',
            'predict.btn_score': 'Scorer les clients',
            'predict.btn_reset': 'Réinitialiser',
            'predict.btn_download': 'Télécharger les résultats',

            'predict.results.title': 'Résultats de risque de churn',
            'predict.risk_tiers.title': 'Répartition par niveau de risque',
            'predict.risk_tiers.subtitle': 'Les clients sont répartis par tranches selon leur score de churn (0 = va rester, 1 = va partir).',
            'predict.risk_tiers.safe': 'Sûr',
            'predict.risk_tiers.watch': 'À surveiller',
            'predict.risk_tiers.atrisk': 'À risque',
            'predict.risk_tiers.critical': 'Critique',
            'predict.risk_tiers.range_safe': 'Score 0,00 – 0,20',
            'predict.risk_tiers.range_watch': 'Score 0,20 – 0,50',
            'predict.risk_tiers.range_atrisk': 'Score 0,50 – 0,80',
            'predict.risk_tiers.range_critical': 'Score 0,80 – 1,00',

            'predict.drivers.title': 'Principaux facteurs de churn',
            'predict.drivers.intro': 'Sur l\u2019ensemble de la liste de clients, voici les paramètres qui influencent le plus le score de churn.',
            'predict.drivers.analyzing': 'Analyse des facteurs de churn dans votre jeu de données…',
            'predict.drivers.footnote': 'La valeur de droite correspond à l\u2019ampleur moyenne de variation du score de churn lorsque ce paramètre est mélangé entre les clients. Plus c\u2019est grand, plus c\u2019est important.',

            'predict.metrics.title': 'Précision du modèle (vs. résultats connus)',
            'predict.metrics.accuracy': 'Précision :',
            'predict.metrics.predicted_stayed': 'Prédit : est resté',
            'predict.metrics.predicted_churned': 'Prédit : a churné',
            'predict.metrics.actual_stayed': 'Réellement resté',
            'predict.metrics.actual_churned': 'Réellement churné',

            'predict.filter.label': 'Filtre par score de churn',
            'predict.filter.all': 'Afficher tous les clients',
            'predict.filter.gt': 'Score supérieur à',
            'predict.filter.lt': 'Score inférieur à',
            'predict.filter.threshold': 'Seuil',
            'predict.filter.threshold_hint': '(0–1)',

            'predict.sort.label': 'Trier les résultats',
            'predict.sort.dataset_asc': 'Ordre du jeu de données',
            'predict.sort.dataset_desc': 'Ordre du jeu de données (inverse)',
            'predict.sort.score_desc': 'Score de churn (décroissant)',
            'predict.sort.score_asc': 'Score de churn (croissant)',
            'predict.page_size.label': 'Lignes par page',
            'predict.page.prev': 'Précédent',
            'predict.page.next': 'Suivant',

            'predict.col.customer': 'Client',
            'predict.col.score': 'Score de churn',
            'predict.col.confidence': 'Confiance',
            'predict.col.risk_level': 'Niveau de risque',
            'predict.col.risk_tier': 'Tranche de risque',

            'predict.msg.model_loaded': 'Modèle entraîné chargé avec succès !',
            'predict.msg.err_load_model': 'Erreur de chargement du modèle : {error}',
            'predict.msg.err_parse': 'Erreur lors de l\u2019analyse du CSV : {error}',
            'predict.msg.err_read': 'Erreur de lecture du fichier : {error}',
            'predict.msg.err_detect': 'Impossible de détecter le format du CSV : {error}',
            'predict.msg.csv_loaded': '{rows} lignes de données chargées avec succès (séparateur « {delimiter} », en-tête : {header}).',
            'predict.msg.err_upload_both': 'Veuillez importer à la fois le modèle entraîné et les données de test.',
            'predict.msg.err_pick_id': 'Veuillez indiquer quelle colonne est la colonne d\u2019identifiant.',
            'predict.msg.err_id_equals_target': 'La colonne d\u2019identifiant ne peut pas être identique à la colonne de churn.',
            'predict.msg.scored': 'Prédictions effectuées pour {count} échantillons.',
            'predict.msg.err_predict': 'Erreur de prédiction : {error}',
            'predict.msg.err_no_predictions': 'Aucune prédiction à télécharger',
            'predict.msg.err_no_filter_match': 'Aucune ligne ne correspond au filtre de score actuel. Ajustez le seuil ou choisissez « Afficher tous les clients ».',
            'predict.msg.downloaded_one': '{count} ligne téléchargée (avec le tri et le filtre actuels).',
            'predict.msg.downloaded_many': '{count} lignes téléchargées (avec le tri et le filtre actuels).',
            'predict.msg.at_risk_headline_one': '{count} client sur {total} ({pct} %) est à risque de churn.',
            'predict.msg.at_risk_headline_many': '{count} clients sur {total} ({pct} %) sont à risque de churn.',
            'predict.msg.at_risk_detail': 'Consultez le tableau ci-dessous pour identifier les comptes qui nécessitent une attention immédiate.',
            'predict.msg.no_risk_detail': 'Aucun client n\u2019a été signalé comme étant à risque élevé de churn par le modèle.',
            'predict.msg.empty_filtered': 'Aucune ligne ne correspond au filtre de score actuel. Essayez un autre seuil ou choisissez « Afficher tous les clients ».',
            'predict.msg.analyzing_drivers': 'Analyse des principaux facteurs de churn…',
            'predict.msg.drivers_none': 'Informations insuffisantes pour identifier les facteurs de churn dans ce jeu de données.',
            'predict.msg.drivers_top': 'Sur l\u2019ensemble des clients, les variations de {feature} sont celles qui déplacent le plus le score de churn.',
            'predict.msg.drivers_flat': 'Tous les paramètres semblent (aussi) peu importants pour ce modèle. Le score ne change presque pas lorsqu\u2019un paramètre est mélangé.',
            'predict.msg.page_no_match': 'Aucune correspondance ({total} scorés)',
            'predict.msg.page_info': 'Page {page} sur {pages} ({start}–{end} sur {total})',
            'predict.msg.note_filtered': 'Affichage de {shown} clients sur {total} après application du filtre de score.',
            'predict.msg.note_browse': 'Utilisez Précédent / Suivant pour naviguer.',
            'predict.msg.note_adjust_filter': 'Ajustez ou effacez le filtre pour exporter des lignes.',
            'predict.msg.note_download_scope': '« Télécharger les résultats » n\u2019exporte que les lignes sélectionnées par les filtres actifs, et dans l\u2019ordre de tri choisi.',

            /* ===== Tutorial ===== */
            'tutorial.title': 'Tutoriel pas à pas',
            'tutorial.subtitle': 'Construisez un modèle de prédiction de churn fonctionnel en moins de 5 minutes.',
            'tutorial.step1.title': '1) Obtenez les données',
            'tutorial.step1.body': '<a href="data\\customer_churn_dataset-testing-master.csv" download>Téléchargez le jeu de données SaaS de churn</a> (64 000 clients avec des métriques d\u2019abonnement et leur issue de churn).',
            'tutorial.step2.title': '2) Entraînez le modèle',
            'tutorial.step2.li1': 'Ouvrez <a href="#/train" target="_blank">Entraîner</a> dans un nouvel onglet et importez le CSV.',
            'tutorial.step2.li2': 'Puisque le jeu de données contient une colonne d\u2019identifiant client, cochez « Le jeu de données contient une colonne d\u2019identifiant ».',
            'tutorial.step2.li3': 'Choisissez la colonne « CustomerID » afin qu\u2019elle ne soit pas utilisée comme variable.',
            'tutorial.step2.li4': 'Cochez « Conserver un jeu de validation » pour pouvoir tester la précision après l\u2019entraînement.',
            'tutorial.step2.li5': 'Sélectionnez la colonne « Churn » comme colonne de churn.',
            'tutorial.step2.li6': 'Cliquez sur « Entraîner le modèle de churn » et observez l\u2019IA apprendre.',
            'tutorial.step2.li7': 'Téléchargez le modèle entraîné et le CSV de validation.',
            'tutorial.step3.title': '3) Scorez les clients',
            'tutorial.step3.li1': 'Ouvrez <a href="#/predict" target="_blank">Scorer les clients</a> dans un nouvel onglet.',
            'tutorial.step3.li2': 'Importez le modèle de churn et le CSV de validation que vous venez de télécharger.',
            'tutorial.step3.li3': 'Cochez « Le jeu de données contient une colonne d\u2019identifiant » et sélectionnez la colonne « CustomerID ».',
            'tutorial.step3.li4': 'Cochez « Le CSV contient encore la colonne de churn ».',
            'tutorial.step3.li5': 'Sélectionnez la colonne « Churn » comme colonne de churn.',
            'tutorial.step3.li6': 'Cliquez sur « Scorer les clients » pour voir les prédictions de risque de churn.',
            'tutorial.done': '<b>Et voilà ! Vous avez construit un prédicteur de churn client de bout en bout.</b>',

            /* ===== Documentation ===== */
            'doc.title': 'Documentation',
            'doc.subtitle': 'Ce qu\u2019est marijoAI, et ce qui le fait fonctionner.',
            'doc.what.title': 'Qu\u2019est-ce que marijoAI ?',
            'doc.what.p1': 'marijoAI est une application no-code, exécutée dans le navigateur, qui aide les entreprises SaaS et par abonnement à prédire le <b>churn client</b> grâce à un réseau de neurones — entièrement sur votre appareil.',
            'doc.what.p2': 'Vous importez un CSV exporté depuis votre CRM, votre outil de facturation ou votre plateforme d\u2019analytics. L\u2019application détecte le format, nettoie les données, entraîne un classificateur binaire, et vous permet de scorer de nouvelles listes de clients. Chaque étape s\u2019exécute localement dans votre navigateur : aucun compte, aucun serveur, aucune donnée ne quitte votre machine.',
            'doc.what.p3': 'marijoAI est conçu pour les équipes Customer Success, Revenue et Produit qui ont besoin de prédictions de churn actionnables sans équipe de data science, sans revue fournisseur et sans accord de traitement des données.',
            'doc.workflow.title': 'Le workflow',
            'doc.workflow.intro': 'marijoAI s\u2019articule autour de trois pages simples :',
            'doc.workflow.li1': '<b><a href="#/train">Entraîner</a></b> — importez un CSV, choisissez la colonne de churn et entraînez un réseau de neurones. Le modèle apprend à partir de clients historiques dont vous connaissez déjà le résultat (churn ou non).',
            'doc.workflow.li2': '<b><a href="#/predict">Scorer</a></b> — chargez un modèle entraîné et une nouvelle liste de clients pour obtenir un score de churn, une tranche de risque et les principaux facteurs de churn sur l\u2019ensemble du jeu de données.',
            'doc.workflow.li3': '<b><a href="#/tutorial">Tutoriel</a></b> — une visite guidée pas à pas utilisant un jeu de données SaaS public inclus, pour obtenir un modèle fonctionnel en moins de cinq minutes.',
            'doc.arch.title': 'Architecture centrée navigateur et vie privée',
            'doc.arch.p1': 'marijoAI est une application web statique monopage. Toute la pile — analyse des données, entraînement du modèle, scoring et visualisation — s\u2019exécute dans l\u2019onglet de votre navigateur. Aucun backend, aucune base de données, aucune télémétrie.',
            'doc.arch.p2': 'Concrètement, cela signifie :',
            'doc.arch.li1': 'Vos fichiers CSV sont lus via l\u2019API <code>File</code> du navigateur et analysés en mémoire.',
            'doc.arch.li2': 'L\u2019entraînement s\u2019exécute sur votre CPU, dans le même onglet, en utilisant WebAssembly lorsque c\u2019est disponible.',
            'doc.arch.li3': 'Les modèles entraînés sont téléchargés sous forme de fichiers JSON simples sur votre disque local.',
            'doc.arch.li4': 'Fermer l\u2019onglet efface toutes les données en mémoire.',
            'doc.arch.li5': 'Aucun cookie, aucun script de tracking, aucun outil d\u2019analytics.',
            'doc.stack.title': 'Stack technique',
            'doc.stack.intro': 'L\u2019ensemble de l\u2019application repose sur une pile volontairement minimale et peu dépendante :',
            'doc.stack.frontend.title': 'Front-end',
            'doc.stack.frontend.body': '<b>HTML, CSS et JavaScript purs (ES6+).</b> Ni React, ni Vue, ni Svelte, ni étape de build pour l\u2019UI. L\u2019application est un seul <code>index.html</code> avec des templates de page rendus par un petit routeur SPA basé sur les hash.',
            'doc.stack.styling.title': 'Style',
            'doc.stack.styling.body': '<b>CSS écrit à la main avec des propriétés personnalisées</b> pour le design system (indigo primaire, rose accent, cartes glassmorphiques). La typographie utilise <b>Inter</b> depuis Google Fonts.',
            'doc.stack.csv.title': 'Analyse CSV',
            'doc.stack.csv.body': '<b><a href="https://www.papaparse.com/" target="_blank" rel="noopener">PapaParse 5.4</a></b> gère la lecture de CSV, tolérante aux exports du monde réel. Le séparateur et la présence d\u2019en-tête sont détectés automatiquement à partir des premières lignes.',
            'doc.stack.nn.title': 'Cœur du réseau de neurones',
            'doc.stack.nn.body': '<b><a href="https://www.assemblyscript.org/" target="_blank" rel="noopener">AssemblyScript</a></b> compilé en <b>WebAssembly</b> (<code>wasm/nn.wasm</code>) pour un entraînement rapide, avec un repli en JavaScript pur lorsque WebAssembly n\u2019est pas disponible.',
            'doc.stack.routing.title': 'Routage',
            'doc.stack.routing.body': 'Un <b>routeur SPA basé sur les hash</b> d\u2019environ 80 lignes (<code>js/router.js</code>) qui injecte le contenu des <code>&lt;template&gt;</code> dans le DOM et invoque les hooks d\u2019initialisation de page.',
            'doc.stack.hosting.title': 'Hébergement',
            'doc.stack.hosting.body': 'Entièrement statique. L\u2019application peut être servie depuis n\u2019importe quel hébergeur statique, ou ouverte directement depuis le disque en tant que fichier local <code>index.html</code> — aucun serveur requis.',
            'doc.nn.title': 'Le réseau de neurones',
            'doc.nn.p1': 'marijoAI utilise un petit <b>réseau de neurones feed-forward</b> fixe pour la classification binaire. L\u2019architecture est volontairement simple afin de s\u2019entraîner rapidement sur un ordinateur portable tout en généralisant bien sur des données tabulaires client typiques :',
            'doc.nn.li1': '<b>Couche d\u2019entrée</b> — un neurone par variable numérique détectée dans votre CSV (la colonne de churn et toute colonne d\u2019identifiant sont exclues automatiquement).',
            'doc.nn.li2': '<b>Couche cachée</b> — 64 neurones avec activation <b>ReLU</b>.',
            'doc.nn.li3': '<b>Couche de sortie</b> — 1 neurone avec activation <b>sigmoïde</b>, produisant une probabilité de churn dans <code>[0, 1]</code>.',
            'doc.nn.p2': 'Les poids sont initialisés selon <b>Xavier / Glorot uniforme</b>. La fonction de perte est l\u2019<b>entropie croisée binaire</b>, le choix standard pour les classificateurs à sortie sigmoïde.',
            'doc.nn.p3': 'L\u2019optimisation utilise <b>Adam</b> (adaptive moment estimation) avec les hyper-paramètres par défaut <code>β₁ = 0,9</code>, <code>β₂ = 0,999</code>, <code>ε = 1e-8</code>, un taux d\u2019apprentissage de <code>0,001</code>, une taille de batch de <code>32</code> et <code>100</code> époques. Ces valeurs sont réglées pour fonctionner dès le départ sur des jeux de données typiques d\u2019entreprises par abonnement.',
            'doc.wasm.title': 'Moteur d\u2019entraînement WebAssembly',
            'doc.wasm.p1': 'La boucle critique en performance — passe avant, rétropropagation, mises à jour Adam, entraînement époque par époque — est implémentée en <b>AssemblyScript</b> et compilée à l\u2019avance en un module compact <code>wasm/nn.wasm</code>. Le code source se trouve dans <code>assembly/index.ts</code>.',
            'doc.wasm.p2': 'Le module WebAssembly gère sa propre mémoire linéaire : poids, biais, estimations de premier et second moment d\u2019Adam, accumulateurs de gradient et jeu de données d\u2019entraînement sont tous stockés sous forme de tableaux plats <code>f64</code> à des offsets de pointeur fixes. JavaScript téléverse les variables et les étiquettes une fois, puis pilote l\u2019entraînement une époque à la fois, relisant la perte et la précision après chaque époque pour alimenter l\u2019UI de progression en direct.',
            'doc.wasm.p3': 'Lorsque WebAssembly n\u2019est pas disponible — par exemple sur des navigateurs très anciens ou certains environnements verrouillés — le même réseau est entraîné par une <b>implémentation JavaScript pure</b> équivalente dans <code>js/neural-network.js</code>. Le modèle produit par l\u2019un ou l\u2019autre chemin est numériquement compatible : les poids peuvent être exportés de l\u2019un et chargés dans l\u2019autre.',
            'doc.pipeline.title': 'Pipeline de données',
            'doc.pipeline.intro': 'Avant qu\u2019aucun neurone ne voie vos données, marijoAI exécute un pipeline de prétraitement automatique et déterministe :',
            'doc.pipeline.li1': '<b>Détection automatique du format.</b> Un échantillon des premières lignes est analysé pour déterminer le séparateur le plus probable (<code>,</code>, <code>;</code>, tabulation ou <code>|</code>) et pour décider si la première ligne est un en-tête, à l\u2019aide d\u2019une heuristique basée sur la proportion de valeurs numériques.',
            'doc.pipeline.li2': '<b>Validation des lignes.</b> Les lignes vides et celles sans valeurs exploitables sont supprimées.',
            'doc.pipeline.li3': '<b>Sélection des colonnes.</b> La colonne de churn et la colonne d\u2019identifiant optionnelle sont exclues. Parmi les colonnes restantes, seules celles contenant au moins un nombre exploitable sont conservées comme variables.',
            'doc.pipeline.li4': '<b>Déduplication.</b> Les combinaisons variables + étiquettes exactement identiques sont supprimées pour ne pas biaiser l\u2019entraînement.',
            'doc.pipeline.li5': '<b>Imputation des valeurs manquantes.</b> Les cellules non numériques ou vides d\u2019une colonne de variable sont remplacées par la <b>moyenne de la colonne</b> calculée sur les valeurs valides.',
            'doc.pipeline.li6': '<b>Jeu de validation.</b> Si demandé, un <b>20 %</b> aléatoire des données est conservé en jeu de validation et exporté en CSV séparé pour pouvoir mesurer la précision en conditions réelles par la suite.',
            'doc.pipeline.li7': '<b>Normalisation min–max.</b> Chaque variable est ramenée à <code>[0, 1]</code> en utilisant les min et max des seules lignes d\u2019entraînement (pour éviter les fuites). Ces statistiques sont sauvegardées avec le modèle afin que le scoring utilise exactement la même mise à l\u2019échelle.',
            'doc.pipeline.li8': '<b>Correspondance des étiquettes.</b> Les étiquettes textuelles courantes de churn — <code>yes</code>/<code>no</code>, <code>true</code>/<code>false</code>, <code>churned</code>/<code>retained</code>, <code>left</code>/<code>stayed</code>, <code>inactive</code>/<code>active</code> — sont automatiquement mappées sur <code>1</code>/<code>0</code>. La correspondance est affichée dans l\u2019UI pour que vous puissiez la vérifier avant l\u2019entraînement.',
            'doc.scoring.title': 'Scoring et interprétation',
            'doc.scoring.p1': 'Sur la page Scorer, le modèle entraîné produit pour chaque client un <b>score de churn</b> compris entre <code>0</code> (va rester) et <code>1</code> (va partir). marijoAI transforme cette probabilité brute en vues actionnables :',
            'doc.scoring.li1': '<b>Tranches de risque.</b> Les scores sont regroupés en <b>Sûr</b> (0,00–0,20), <b>À surveiller</b> (0,20–0,50), <b>À risque</b> (0,50–0,80) et <b>Critique</b> (0,80–1,00).',
            'doc.scoring.li2': '<b>Confiance.</b> À quel point le score est éloigné de la frontière de décision à 0,5, afin de distinguer les prédictions solides des prédictions incertaines.',
            'doc.scoring.li3': '<b>Évaluation de la précision.</b> Si le CSV scoré contient encore la vraie colonne de churn, l\u2019application calcule la précision globale et une <b>matrice de confusion</b> complète (prédit vs. réel).',
            'doc.scoring.li4': '<b>Principaux facteurs de churn.</b> L\u2019importance globale des variables est estimée via la <b>permutation importance</b> : pour chaque variable, ses valeurs sont mélangées entre les clients et la variation moyenne du score de churn est mesurée. Les variables dont le mélange modifie le plus les prédictions sont les facteurs les plus puissants.',
            'doc.scoring.p2': 'Les résultats peuvent être triés, filtrés par seuil de score, paginés et exportés en CSV pour un suivi dans votre CRM ou votre outil Customer Success.',
            'doc.persist.title': 'Persistance du modèle',
            'doc.persist.p1': 'Un modèle entraîné est sauvegardé sous la forme d\u2019un unique <b>fichier JSON</b> lisible par un humain. Il contient :',
            'doc.persist.li1': 'L\u2019<b>architecture</b> du réseau (tailles des couches et activations).',
            'doc.persist.li2': 'L\u2019ensemble des <b>poids et biais</b>.',
            'doc.persist.li3': 'Les <b>métadonnées de prétraitement</b> : la liste ordonnée des noms de colonnes de variables, les min/max par colonne pour la normalisation, le nom de la colonne de churn, la colonne d\u2019identifiant (le cas échéant) et la correspondance étiquette → nombre.',
            'doc.persist.p2': 'Comme le prétraitement voyage avec le modèle, vous pouvez fermer l\u2019onglet, revenir un mois plus tard, ré-importer le JSON avec n\u2019importe quel CSV ayant les mêmes colonnes, et obtenir un scoring parfaitement cohérent. Le fichier de modèle est aussi suffisamment petit pour être versionné ou envoyé par e-mail.',
            'doc.req.title': 'Configuration requise et compatibilité',
            'doc.req.li1': '<b>Tout navigateur moderne</b> — une version récente de Chrome, Edge, Firefox, Safari... WebAssembly est utilisé automatiquement quand il est présent.',
            'doc.req.li2': '<b>Aucune connexion Internet requise</b> une fois la page chargée. L\u2019application fonctionne aussi depuis un fichier local pour un usage totalement hors-ligne.',
            'doc.req.li3': '<b>Tout CSV</b> avec au moins une colonne de variable numérique et une colonne de churn binaire. Des jeux de données de plusieurs dizaines de milliers de lignes s\u2019entraînent en quelques secondes sur un ordinateur portable classique.',
            'doc.oss.title': 'Open source',
            'doc.oss.body': 'marijoAI est distribué sous <b>licence MIT</b>. Le code source se trouve sur <a href="https://github.com/marijoai/marijoai" target="_blank">GitHub</a>.'
        },

        es: {
            /* ===== Header / navigation ===== */
            'nav.toggle_aria': 'Mostrar el menú',
            'nav.train': 'Entrenar',
            'nav.score': 'Puntuar',
            'nav.tutorial': 'Tutorial',
            'nav.documentation': 'Documentación',
            'nav.language_label': 'Idioma',

            /* ===== Homepage ===== */
            'home.meta_description': 'Predice qué clientes se irán — sin código, sin equipo de datos y sin que tus datos salgan de tu navegador.',
            'home.page_title': 'marijoAI - Predicción de abandono de clientes con IA',
            'home.hero.title_line1': 'Predice el abandono de clientes',
            'home.hero.title_line2': 'antes de que ocurra',
            'home.hero.subtitle': 'Sube los datos de tus clientes, entrena un modelo de IA e identifica quién está a punto de irse — sin programar, sin equipo de datos y sin que tus datos salgan de tu navegador.',
            'home.hero.btn_train': 'Entrenar un modelo de churn',
            'home.hero.btn_score': 'Puntuar clientes',
            'home.features.title': 'Cómo funciona',
            'home.features.train.title': 'Entrenar un modelo de churn',
            'home.features.train.body': 'Exporta un CSV desde tu CRM o tu herramienta de facturación, súbelo aquí, selecciona la columna de churn y entrena un modelo de IA con seguimiento en vivo — todo en tu navegador.',
            'home.features.train.cta': 'Entrenar modelo →',
            'home.features.score.title': 'Puntuar a tus clientes',
            'home.features.score.body': 'Carga tu modelo entrenado y una lista de clientes para obtener al instante puntuaciones de riesgo de churn, niveles de confianza y ver exactamente a quién atender ahora.',
            'home.features.score.cta': 'Puntuar clientes →',
            'home.benefits.title': 'Por qué los equipos de Customer Success usan marijoAI',
            'home.benefits.noteam.title': '🎯 Sin equipo de datos',
            'home.benefits.noteam.body': 'Entrena un modelo de churn de nivel profesional mediante una interfaz visual — sin Python, sin SQL, sin científicos de datos.',
            'home.benefits.privacy.title': '🔒 Tus datos se quedan en tu equipo',
            'home.benefits.privacy.body': 'Todo el procesamiento ocurre en tu navegador. Los datos de clientes no pasan por ningún servidor — sin DPA, sin revisión de proveedores.',
            'home.benefits.live.title': '📊 Retroalimentación en tiempo real',
            'home.benefits.live.body': 'Observa cómo el modelo aprende en tiempo real con métricas de pérdida y precisión actualizadas en cada época.',
            'home.benefits.csv.title': '⚡ Compatible con cualquier CSV',
            'home.benefits.csv.body': 'Exporta desde Stripe, HubSpot, Intercom o cualquier herramienta — si es un CSV con métricas de clientes, funciona.',
            'home.benefits.save.title': '💾 Guarda y reutiliza modelos',
            'home.benefits.save.body': 'Descarga tu modelo entrenado como JSON y vuelve a cargarlo cuando quieras para puntuar nuevas listas de clientes.',
            'home.benefits.quick.title': '🎨 Empieza en 2 minutos',
            'home.benefits.quick.body': 'Sigue el <a href="#/tutorial">tutorial paso a paso</a> — tendrás un modelo funcional casi al instante.',
            'home.usecases.title': 'Qué puedes predecir',
            'home.usecases.intro': '<b>marijoAI usa clasificación binaria con IA para predecir si cada cliente «se va a ir» o «va a quedarse». Dale cualquier métrica numérica de cliente:</b>',
            'home.usecases.subscription': '<b>Churn de suscripción</b> — ¿qué clientes cancelarán este mes?',
            'home.usecases.revenue': '<b>Churn de ingresos</b> — ¿qué cuentas es probable que bajen de plan?',
            'home.usecases.trial': '<b>Conversión de prueba</b> — ¿qué usuarios gratuitos se pasarán al de pago?',
            'home.usecases.engagement': '<b>Caída de engagement</b> — ¿qué usuarios se están volviendo inactivos?',
            'home.usecases.renewal': '<b>Riesgo de no renovar</b> — ¿qué contratos anuales no se renovarán?',
            'home.usecases.expansion': '<b>Probabilidad de upsell</b> — ¿qué clientes están listos para mejorar?',
            'home.usecases.outro': '<b>Cualquier resultado binario de cliente (sí/no) exportable como CSV con datos numéricos.</b>',
            'home.opensource.title': '¡Somos open-source!',
            'home.opensource.body': 'marijoAI se distribuye bajo licencia MIT. Lee el código, haz un fork, aloja tu propia copia o contribuye — cada línea que corre en tu navegador es pública.',
            'home.opensource.cta': 'Ver en GitHub →',

            /* ===== Footer ===== */
            'footer.copyright': '© 2025 - 2026 marijoAI',
            'footer.linkedin': 'Nuestro LinkedIn',
            'footer.legal': 'Aviso legal',
            'footer.privacy': 'Política de privacidad',
            'footer.cookies': 'Política de cookies',

            /* ===== No-cookies banner ===== */
            'banner.text': 'Este sitio no utiliza cookies.',
            'banner.learn_more': 'Más información',
            'banner.dismiss': 'Entendido',
            'banner.dismiss_aria': 'Cerrar notificación',

            /* ===== Legal / Privacy / Cookies ===== */
            'legal.title': 'Aviso legal',
            'legal.subtitle': 'Información sobre el sitio',
            'legal.org_name': 'Nombre de la organización:',
            'legal.owner': 'Propietario:',
            'legal.host': 'Alojamiento:',
            'legal.contact': 'Contacto:',
            'legal.linkedin_text': 'LinkedIn',

            'privacy.title': 'Política de privacidad',
            'privacy.subtitle': 'Cómo tratamos tus datos',
            'privacy.processing.title': 'Tratamiento de datos',
            'privacy.processing.body': 'No se transmite ningún dato a nuestros servidores. Todo el procesamiento ocurre en tu navegador, en tu dispositivo.',
            'privacy.personal.title': 'Datos personales',
            'privacy.personal.body': 'No recopilamos ni almacenamos datos personales. Los archivos que subes se procesan localmente y esta aplicación nunca los envía a un servidor remoto.',
            'privacy.contact.title': 'Contacto',
            'privacy.contact.body': 'Para cualquier consulta, contáctanos en <a href="https://www.linkedin.com/company/marijoai">nuestra página de LinkedIn</a>.',

            'cookies.title': 'Política de cookies',
            'cookies.subtitle': 'Información sobre el uso de cookies',
            'cookies.usage.title': 'Uso de cookies',
            'cookies.usage.body': 'Este sitio no utiliza cookies.',

            /* ===== Train page ===== */
            'train.title': 'Entrenar modelo de churn',
            'train.data_file': 'Datos de clientes (archivo CSV)',
            'train.create_validation': 'Reservar un conjunto de validación (excluido del entrenamiento)',
            'train.create_validation_hint': 'Marca esta casilla para crear un CSV aparte y validar la precisión del modelo con predicciones.',
            'train.has_id': 'El conjunto de datos contiene una columna de ID',
            'train.has_id_hint': 'Marca si alguna columna contiene identificadores de cliente o de fila. Esa columna se excluirá del entrenamiento (no se usará como variable).',
            'train.id_column': 'Columna de ID',
            'train.id_column_hint': 'Elige qué columna es el identificador. No puede ser la columna de churn.',
            'train.target_column': 'Columna de churn (resultado a predecir)',
            'train.target_column_hint': 'Selecciona la columna que indica si un cliente se ha ido.',
            'train.dataset_summary': 'Resumen del conjunto de datos',
            'train.customers': 'Clientes:',
            'train.features': 'Variables:',
            'train.btn_start': 'Entrenar modelo de churn',
            'train.btn_reset': 'Restablecer',
            'train.progress.title': 'Progreso del entrenamiento',
            'train.progress.history_title': 'Historial de entrenamiento',
            'train.progress.col_epoch': 'Época',
            'train.progress.col_loss': 'Pérdida',
            'train.progress.col_accuracy': 'Precisión',
            'train.progress.epoch_of': 'Época {current} de {total}',
            'train.complete.title': 'Entrenamiento completado',
            'train.complete.body': '¡Tu modelo de churn está listo! Descárgalo y ve a Puntuar clientes para identificar las cuentas en riesgo.',
            'train.complete.download_model': 'Descargar modelo de churn',
            'train.complete.download_validation': 'Descargar CSV de validación',

            /* ===== Easter-egg juego de coche ===== */
            'car_game.banner': '¿El entrenamiento te parece largo? ¡Juega a nuestro pequeño juego de coches mientras esperas!',
            'car_game.banner_desktop_only': '(jugable solo en ordenador)',
            'car_game.hint': 'Usa las flechas del teclado para conducir — recoge las estrellas. Se pueden pulsar varias flechas a la vez.',
            'car_game.hud.stars': 'Estrellas: {n}',
            'car_game.training_complete': 'Entrenamiento completado, ¡puedes cerrar el juego!',
            'car_game.close_aria': 'Cerrar el juego y volver al entrenamiento',

            'select.upload_first': '-- Sube un CSV primero --',
            'select.pick_target': '-- Selecciona la columna objetivo --',
            'select.pick_id': '-- Selecciona la columna de ID --',

            'train.msg.loaded': 'Se cargaron {rows} filas de datos de entrenamiento (separador «{delimiter}», encabezado: {header}).',
            'train.msg.yes': 'sí',
            'train.msg.no': 'no',
            'train.msg.err_parse': 'Error al analizar el archivo CSV: {error}',
            'train.msg.err_read': 'Error al leer el archivo: {error}',
            'train.msg.err_detect': 'No se pudo detectar el formato del CSV: {error}',
            'train.msg.err_no_valid': 'No se encontraron datos válidos en el archivo CSV',
            'train.msg.err_upload_first': 'Primero sube un archivo de datos',
            'train.msg.err_pick_target': 'Selecciona la columna objetivo a predecir.',
            'train.msg.err_pick_id': 'Selecciona qué columna es la columna de ID.',
            'train.msg.err_id_equals_target': 'La columna de ID no puede ser la misma que la columna de churn.',
            'train.msg.err_invalid_feature': 'Formato de variables no válido',
            'train.msg.err_prepare': 'Error al preparar los datos: {error}',
            'train.msg.err_detect_features': 'No se pudieron detectar variables de entrada en el CSV.',
            'train.msg.err_empty_training': 'Datos de entrenamiento no válidos: las variables o etiquetas están vacías',
            'train.msg.starting': 'Iniciando la red neuronal…',
            'train.msg.training_complete': '¡Entrenamiento del modelo completado con éxito!',
            'train.msg.err_training': 'Error de entrenamiento: {error}',
            'train.msg.err_no_model': 'No hay modelo entrenado para descargar',
            'train.msg.model_downloaded': '¡Modelo entrenado descargado con éxito!',
            'train.msg.err_download_model': 'Error al descargar el modelo: {error}',
            'train.msg.err_no_validation': 'No hay datos de validación para descargar',
            'train.msg.validation_downloaded': '¡CSV de validación descargado con éxito!',
            'train.msg.err_download_validation': 'Error al descargar el CSV de validación: {error}',

            'labels.mappings_title': 'Correspondencias de etiquetas',
            'labels.mappings_train_note': 'Estas correspondencias se utilizan durante el entrenamiento y la predicción.',
            'labels.mappings_predict_note': 'Las predicciones usarán estas correspondencias para mostrar nombres de clase legibles.',
            'labels.mappings_predict_hint': 'Estas correspondencias muestran cómo se convirtieron los valores originales a números durante el entrenamiento.',
            'labels.col_original': 'Valor original',
            'labels.col_mapped': 'Asignado a',

            /* ===== Predict (Score) page ===== */
            'predict.title': 'Puntuar clientes',
            'predict.model_file': 'Modelo de churn (JSON)',
            'predict.customer_list': 'Lista de clientes (archivo CSV)',
            'predict.customer_list_hint': 'Sube un CSV con las mismas columnas que tus datos de entrenamiento.',
            'predict.has_id': 'El conjunto de datos contiene una columna de ID',
            'predict.has_id_hint': 'Marca para excluir del scoring una columna de ID de cliente o de fila (la misma que usaste en el entrenamiento, si la tenías).',
            'predict.id_column': 'Columna de ID',
            'predict.id_column_hint': 'Elige qué columna es el identificador. No se pasa al modelo.',
            'predict.has_target': 'El CSV aún contiene la columna de churn',
            'predict.has_target_hint': 'Marca para calcular la precisión comparando con resultados reales conocidos.',
            'predict.target_column': 'Columna de churn',
            'predict.loading_model': 'Cargando modelo…',
            'predict.btn_score': 'Puntuar clientes',
            'predict.btn_reset': 'Restablecer',
            'predict.btn_download': 'Descargar resultados',

            'predict.results.title': 'Resultados de riesgo de churn',
            'predict.risk_tiers.title': 'Desglose por nivel de riesgo',
            'predict.risk_tiers.subtitle': 'Los clientes se agrupan en niveles según su puntuación de churn (0 = se queda, 1 = se va).',
            'predict.risk_tiers.safe': 'Seguro',
            'predict.risk_tiers.watch': 'Vigilar',
            'predict.risk_tiers.atrisk': 'En riesgo',
            'predict.risk_tiers.critical': 'Crítico',
            'predict.risk_tiers.range_safe': 'Puntuación 0,00 – 0,20',
            'predict.risk_tiers.range_watch': 'Puntuación 0,20 – 0,50',
            'predict.risk_tiers.range_atrisk': 'Puntuación 0,50 – 0,80',
            'predict.risk_tiers.range_critical': 'Puntuación 0,80 – 1,00',

            'predict.drivers.title': 'Principales factores de churn',
            'predict.drivers.intro': 'En toda la lista de clientes, estos son los parámetros que más influyen en la puntuación de churn.',
            'predict.drivers.analyzing': 'Analizando los factores de churn de tu conjunto de datos…',
            'predict.drivers.footnote': 'El valor de la derecha es cuánto se mueve la puntuación de churn, en promedio, cuando ese parámetro se mezcla entre clientes. Cuanto más grande, más importante.',

            'predict.metrics.title': 'Precisión del modelo (vs. resultados conocidos)',
            'predict.metrics.accuracy': 'Precisión:',
            'predict.metrics.predicted_stayed': 'Predicho: se quedó',
            'predict.metrics.predicted_churned': 'Predicho: se fue',
            'predict.metrics.actual_stayed': 'Realmente se quedó',
            'predict.metrics.actual_churned': 'Realmente se fue',

            'predict.filter.label': 'Filtro por puntuación de churn',
            'predict.filter.all': 'Mostrar todos los clientes',
            'predict.filter.gt': 'Puntuación mayor que',
            'predict.filter.lt': 'Puntuación menor que',
            'predict.filter.threshold': 'Umbral',
            'predict.filter.threshold_hint': '(0–1)',

            'predict.sort.label': 'Ordenar resultados',
            'predict.sort.dataset_asc': 'Orden del conjunto',
            'predict.sort.dataset_desc': 'Orden del conjunto (inverso)',
            'predict.sort.score_desc': 'Puntuación de churn (mayor a menor)',
            'predict.sort.score_asc': 'Puntuación de churn (menor a mayor)',
            'predict.page_size.label': 'Filas por página',
            'predict.page.prev': 'Anterior',
            'predict.page.next': 'Siguiente',

            'predict.col.customer': 'Cliente',
            'predict.col.score': 'Puntuación de churn',
            'predict.col.confidence': 'Confianza',
            'predict.col.risk_level': 'Nivel de riesgo',
            'predict.col.risk_tier': 'Tramo de riesgo',

            'predict.msg.model_loaded': '¡Modelo entrenado cargado con éxito!',
            'predict.msg.err_load_model': 'Error al cargar el modelo: {error}',
            'predict.msg.err_parse': 'Error al analizar el archivo CSV: {error}',
            'predict.msg.err_read': 'Error al leer el archivo: {error}',
            'predict.msg.err_detect': 'No se pudo detectar el formato del CSV: {error}',
            'predict.msg.csv_loaded': 'Se cargaron {rows} filas de datos de prueba (separador «{delimiter}», encabezado: {header}).',
            'predict.msg.err_upload_both': 'Sube tanto el modelo entrenado como los datos de prueba.',
            'predict.msg.err_pick_id': 'Selecciona qué columna es la columna de ID.',
            'predict.msg.err_id_equals_target': 'La columna de ID no puede ser la misma que la columna de churn.',
            'predict.msg.scored': 'Predicciones completadas para {count} muestras.',
            'predict.msg.err_predict': 'Error de predicción: {error}',
            'predict.msg.err_no_predictions': 'No hay predicciones para descargar',
            'predict.msg.err_no_filter_match': 'Ninguna fila coincide con el filtro actual de puntuación. Ajusta el umbral o elige «Mostrar todos los clientes».',
            'predict.msg.downloaded_one': '{count} fila descargada (con el orden y filtro actuales).',
            'predict.msg.downloaded_many': '{count} filas descargadas (con el orden y filtro actuales).',
            'predict.msg.at_risk_headline_one': '{count} de {total} cliente ({pct} %) está en riesgo de churn.',
            'predict.msg.at_risk_headline_many': '{count} de {total} clientes ({pct} %) están en riesgo de churn.',
            'predict.msg.at_risk_detail': 'Revisa la tabla de abajo para identificar qué cuentas requieren atención inmediata.',
            'predict.msg.no_risk_detail': 'El modelo no marcó a ningún cliente como de alto riesgo de churn.',
            'predict.msg.empty_filtered': 'Ninguna fila coincide con el filtro actual de puntuación. Prueba otro umbral o elige «Mostrar todos los clientes».',
            'predict.msg.analyzing_drivers': 'Analizando los principales factores de churn…',
            'predict.msg.drivers_none': 'Información insuficiente para identificar factores de churn en este conjunto de datos.',
            'predict.msg.drivers_top': 'En todos los clientes, los cambios en {feature} son los que más mueven la puntuación de churn.',
            'predict.msg.drivers_flat': 'Todos los parámetros parecen igual de (poco) importantes para este modelo. La puntuación apenas cambia cuando se mezcla un parámetro cualquiera.',
            'predict.msg.page_no_match': 'Sin coincidencias ({total} puntuadas)',
            'predict.msg.page_info': 'Página {page} de {pages} ({start}–{end} de {total})',
            'predict.msg.note_filtered': 'Mostrando {shown} de {total} clientes tras el filtro por puntuación.',
            'predict.msg.note_browse': 'Usa Anterior / Siguiente para navegar.',
            'predict.msg.note_adjust_filter': 'Ajusta o quita el filtro para exportar filas.',
            'predict.msg.note_download_scope': '«Descargar resultados» exporta solo las filas seleccionadas por los filtros aplicados y en el orden elegido.',

            /* ===== Tutorial ===== */
            'tutorial.title': 'Tutorial paso a paso',
            'tutorial.subtitle': 'Construye un modelo de predicción de churn funcional en menos de 5 minutos.',
            'tutorial.step1.title': '1) Consigue los datos',
            'tutorial.step1.body': '<a href="data\\customer_churn_dataset-testing-master.csv" download>Descarga el conjunto de datos de churn SaaS</a> (64 000 clientes con métricas de suscripción y resultados de churn).',
            'tutorial.step2.title': '2) Entrena el modelo',
            'tutorial.step2.li1': 'Abre <a href="#/train" target="_blank">Entrenar</a> en una pestaña nueva y sube el CSV.',
            'tutorial.step2.li2': 'Como el conjunto de datos tiene una columna de ID de cliente, marca «El conjunto de datos contiene una columna de ID».',
            'tutorial.step2.li3': 'Elige la columna «CustomerID» para que no se use como variable.',
            'tutorial.step2.li4': 'Marca «Reservar un conjunto de validación» para poder probar la precisión después del entrenamiento.',
            'tutorial.step2.li5': 'Selecciona la columna «Churn» como columna de churn.',
            'tutorial.step2.li6': 'Haz clic en «Entrenar modelo de churn» y observa cómo aprende la IA.',
            'tutorial.step2.li7': 'Descarga el modelo entrenado y el CSV de validación.',
            'tutorial.step3.title': '3) Puntuar clientes',
            'tutorial.step3.li1': 'Abre <a href="#/predict" target="_blank">Puntuar clientes</a> en una pestaña nueva.',
            'tutorial.step3.li2': 'Sube el modelo de churn y el CSV de validación que acabas de descargar.',
            'tutorial.step3.li3': 'Marca «El conjunto de datos contiene una columna de ID» y selecciona la columna «CustomerID».',
            'tutorial.step3.li4': 'Marca «El CSV aún contiene la columna de churn».',
            'tutorial.step3.li5': 'Selecciona la columna «Churn» como columna de churn.',
            'tutorial.step3.li6': 'Haz clic en «Puntuar clientes» para ver las predicciones de riesgo de churn.',
            'tutorial.done': '<b>¡Eso es todo! Has creado un predictor de churn de clientes de principio a fin.</b>',

            /* ===== Documentation ===== */
            'doc.title': 'Documentación',
            'doc.subtitle': 'Qué es marijoAI y qué lo impulsa por dentro.',
            'doc.what.title': '¿Qué es marijoAI?',
            'doc.what.p1': 'marijoAI es una aplicación no-code que se ejecuta en el navegador y ayuda a empresas SaaS y de suscripción a predecir el <b>churn de clientes</b> mediante una red neuronal — íntegramente en tu dispositivo.',
            'doc.what.p2': 'Subes un CSV exportado desde tu CRM, tu herramienta de facturación o tu plataforma de analítica. La aplicación detecta el formato, limpia los datos, entrena un clasificador binario y te deja puntuar nuevas listas de clientes. Cada paso se ejecuta localmente en tu navegador: sin cuentas, sin servidores, sin que los datos salgan de tu equipo.',
            'doc.what.p3': 'Está pensado para equipos de Customer Success, Revenue y Producto que necesitan predicciones de churn accionables sin un equipo de ciencia de datos, sin revisión de proveedor y sin acuerdo de tratamiento de datos.',
            'doc.workflow.title': 'El flujo de trabajo',
            'doc.workflow.intro': 'marijoAI se estructura en tres páginas sencillas:',
            'doc.workflow.li1': '<b><a href="#/train">Entrenar</a></b> — sube un CSV, elige la columna de churn y entrena una red neuronal. El modelo aprende a partir de clientes históricos cuyo resultado (churn o permanencia) ya conoces.',
            'doc.workflow.li2': '<b><a href="#/predict">Puntuar</a></b> — carga un modelo entrenado y una nueva lista de clientes para obtener una puntuación de churn, un tramo de riesgo y los principales factores de churn en todo el conjunto.',
            'doc.workflow.li3': '<b><a href="#/tutorial">Tutorial</a></b> — un recorrido paso a paso con un conjunto público de churn SaaS incluido para tener un modelo funcional en menos de cinco minutos.',
            'doc.arch.title': 'Arquitectura centrada en el navegador y la privacidad',
            'doc.arch.p1': 'marijoAI es una aplicación web estática de una sola página. Toda la pila — análisis de datos, entrenamiento del modelo, scoring y visualización — se ejecuta en tu pestaña del navegador. No hay backend, ni base de datos, ni telemetría.',
            'doc.arch.p2': 'En concreto, esto significa:',
            'doc.arch.li1': 'Tus archivos CSV se leen con la API <code>File</code> del navegador y se analizan en memoria.',
            'doc.arch.li2': 'El entrenamiento se ejecuta en tu CPU, en la misma pestaña, usando WebAssembly cuando está disponible.',
            'doc.arch.li3': 'Los modelos entrenados se descargan como archivos JSON simples a tu disco local.',
            'doc.arch.li4': 'Cerrar la pestaña elimina todos los datos en memoria.',
            'doc.arch.li5': 'Sin cookies, sin scripts de seguimiento, sin analítica.',
            'doc.stack.title': 'Stack tecnológico',
            'doc.stack.intro': 'Toda la aplicación se construye con una pila deliberadamente mínima y con pocas dependencias:',
            'doc.stack.frontend.title': 'Front-end',
            'doc.stack.frontend.body': '<b>HTML, CSS y JavaScript puros (ES6+).</b> Sin React, Vue, Svelte ni paso de build para la UI. La aplicación es un único <code>index.html</code> con plantillas de página renderizadas por un pequeño router SPA basado en hashes.',
            'doc.stack.styling.title': 'Estilos',
            'doc.stack.styling.body': '<b>CSS escrito a mano con propiedades personalizadas</b> para el sistema de diseño (índigo primario, rosa de acento, tarjetas glassmorphic). La tipografía usa <b>Inter</b> de Google Fonts.',
            'doc.stack.csv.title': 'Análisis de CSV',
            'doc.stack.csv.body': '<b><a href="https://www.papaparse.com/" target="_blank" rel="noopener">PapaParse 5.4</a></b> se encarga de leer los CSV y tolera exportaciones del mundo real. El separador y la presencia de cabecera se detectan automáticamente a partir de las primeras líneas.',
            'doc.stack.nn.title': 'Núcleo de la red neuronal',
            'doc.stack.nn.body': '<b><a href="https://www.assemblyscript.org/" target="_blank" rel="noopener">AssemblyScript</a></b> compilado a <b>WebAssembly</b> (<code>wasm/nn.wasm</code>) para un entrenamiento rápido, con un fallback en JavaScript puro cuando WebAssembly no está disponible.',
            'doc.stack.routing.title': 'Enrutado',
            'doc.stack.routing.body': 'Un <b>router SPA basado en hashes</b> de unas 80 líneas (<code>js/router.js</code>) que intercambia el contenido de los <code>&lt;template&gt;</code> en el DOM e invoca los hooks de inicialización de cada página.',
            'doc.stack.hosting.title': 'Alojamiento',
            'doc.stack.hosting.body': 'Totalmente estático. La aplicación puede servirse desde cualquier alojamiento estático o abrirse directamente desde disco como archivo local <code>index.html</code> — sin servidor.',
            'doc.nn.title': 'La red neuronal',
            'doc.nn.p1': 'marijoAI usa una <b>red neuronal feed-forward</b> pequeña y fija para clasificación binaria. La arquitectura es intencionadamente sencilla para entrenarse rápido en un portátil y generalizar bien sobre datos tabulares típicos de clientes:',
            'doc.nn.li1': '<b>Capa de entrada</b> — una neurona por cada variable numérica detectada en tu CSV (la columna de churn y cualquier columna de ID se excluyen automáticamente).',
            'doc.nn.li2': '<b>Capa oculta</b> — 64 neuronas con activación <b>ReLU</b>.',
            'doc.nn.li3': '<b>Capa de salida</b> — 1 neurona con activación <b>sigmoide</b>, que produce una probabilidad de churn en <code>[0, 1]</code>.',
            'doc.nn.p2': 'Los pesos se inicializan con <b>Xavier / Glorot uniforme</b>. La función de pérdida es la <b>entropía cruzada binaria</b>, la elección estándar para clasificadores con salida sigmoide.',
            'doc.nn.p3': 'La optimización usa <b>Adam</b> (adaptive moment estimation) con los hiper-parámetros por defecto <code>β₁ = 0,9</code>, <code>β₂ = 0,999</code>, <code>ε = 1e-8</code>, una tasa de aprendizaje de <code>0,001</code>, un tamaño de batch de <code>32</code> y <code>100</code> épocas. Estos valores están ajustados para funcionar bien de serie con conjuntos típicos de negocios por suscripción.',
            'doc.wasm.title': 'Motor de entrenamiento en WebAssembly',
            'doc.wasm.p1': 'El bucle crítico en rendimiento — pasada hacia adelante, retropropagación, actualizaciones Adam, entrenamiento por épocas — está implementado en <b>AssemblyScript</b> y compilado a un módulo compacto <code>wasm/nn.wasm</code>. El código fuente está en <code>assembly/index.ts</code>.',
            'doc.wasm.p2': 'El módulo WebAssembly gestiona su propia memoria lineal: pesos, sesgos, estimaciones de primer y segundo momento de Adam, acumuladores de gradiente y el conjunto de entrenamiento se guardan como arrays planos <code>f64</code> en offsets de puntero fijos. JavaScript sube variables y etiquetas una sola vez y después dirige el entrenamiento época a época, leyendo la pérdida y la precisión tras cada época para alimentar la UI de progreso en vivo.',
            'doc.wasm.p3': 'Cuando WebAssembly no está disponible — por ejemplo en navegadores muy antiguos o en entornos muy restringidos — la misma red se entrena con una <b>implementación equivalente en JavaScript puro</b> en <code>js/neural-network.js</code>. El modelo producido por cualquiera de los dos caminos es numéricamente compatible: los pesos pueden exportarse desde uno y cargarse en el otro.',
            'doc.pipeline.title': 'Pipeline de datos',
            'doc.pipeline.intro': 'Antes de que ninguna neurona vea tus datos, marijoAI ejecuta un pipeline de preprocesamiento automático y determinista:',
            'doc.pipeline.li1': '<b>Detección automática del formato.</b> Se analiza una muestra de las primeras líneas para elegir el separador más probable (<code>,</code>, <code>;</code>, tabulador o <code>|</code>) y decidir si la primera fila es cabecera, mediante una heurística basada en la proporción de valores numéricos.',
            'doc.pipeline.li2': '<b>Validación de filas.</b> Se descartan las filas vacías y las que no contienen valores utilizables.',
            'doc.pipeline.li3': '<b>Selección de columnas.</b> La columna de churn y la columna de ID opcional se excluyen. De las columnas restantes, solo se conservan como variables las que contienen al menos un número analizable.',
            'doc.pipeline.li4': '<b>Deduplicación.</b> Se eliminan las combinaciones exactamente duplicadas de variables + etiqueta para que no sesguen el entrenamiento.',
            'doc.pipeline.li5': '<b>Imputación de valores ausentes.</b> Las celdas no numéricas o vacías en una columna de variable se reemplazan por la <b>media de la columna</b> calculada sobre los valores válidos.',
            'doc.pipeline.li6': '<b>Conjunto de validación.</b> Si se solicita, se reserva un <b>20 %</b> aleatorio de los datos como conjunto de validación y se exporta como un CSV aparte para poder medir la precisión en condiciones reales después.',
            'doc.pipeline.li7': '<b>Normalización min–máx.</b> Cada variable se reescala a <code>[0, 1]</code> usando los min y máx solo de las filas de entrenamiento (para evitar fugas). Estas estadísticas se guardan con el modelo para que el scoring use exactamente la misma escala.',
            'doc.pipeline.li8': '<b>Mapeo de etiquetas.</b> Las etiquetas textuales típicas de churn — <code>yes</code>/<code>no</code>, <code>true</code>/<code>false</code>, <code>churned</code>/<code>retained</code>, <code>left</code>/<code>stayed</code>, <code>inactive</code>/<code>active</code> — se asignan automáticamente a <code>1</code>/<code>0</code>. El mapeo se muestra en la UI para que puedas verificarlo antes de entrenar.',
            'doc.scoring.title': 'Scoring e interpretación',
            'doc.scoring.p1': 'En la página Puntuar, el modelo entrenado produce para cada cliente una <b>puntuación de churn</b> entre <code>0</code> (se queda) y <code>1</code> (se va). marijoAI convierte esa probabilidad cruda en vistas accionables:',
            'doc.scoring.li1': '<b>Niveles de riesgo.</b> Las puntuaciones se agrupan en <b>Seguro</b> (0,00–0,20), <b>Vigilar</b> (0,20–0,50), <b>En riesgo</b> (0,50–0,80) y <b>Crítico</b> (0,80–1,00).',
            'doc.scoring.li2': '<b>Confianza.</b> Distancia de la puntuación respecto al umbral de decisión de 0,5, para distinguir predicciones sólidas de predicciones dudosas.',
            'doc.scoring.li3': '<b>Evaluación de precisión.</b> Si el CSV puntuado aún contiene la columna de churn real, la aplicación calcula la precisión global y una <b>matriz de confusión</b> completa (predicho vs. real).',
            'doc.scoring.li4': '<b>Principales factores de churn.</b> La importancia global de las variables se estima mediante <b>permutation importance</b>: para cada variable se barajan sus valores entre los clientes y se mide el cambio medio en la puntuación de churn. Las variables cuya permutación más altera las predicciones son los factores más fuertes.',
            'doc.scoring.p2': 'Los resultados se pueden ordenar, filtrar por umbral de puntuación, paginar y exportar a CSV para seguirlos en tu CRM o tu herramienta de Customer Success.',
            'doc.persist.title': 'Persistencia del modelo',
            'doc.persist.p1': 'Un modelo entrenado se guarda como un único <b>archivo JSON</b> legible por humanos. Contiene:',
            'doc.persist.li1': 'La <b>arquitectura</b> de la red (tamaños de las capas y activaciones).',
            'doc.persist.li2': 'Todos los <b>pesos y sesgos</b>.',
            'doc.persist.li3': 'Los <b>metadatos de preprocesamiento</b>: la lista ordenada de nombres de columnas de variables, los min/máx por columna para la normalización, el nombre de la columna de churn, la columna de ID (si la hay) y el mapeo de etiqueta a número.',
            'doc.persist.p2': 'Como el preprocesamiento viaja con el modelo, puedes cerrar la pestaña, volver un mes después, re-subir el JSON con cualquier CSV que tenga las mismas columnas y obtener un scoring perfectamente consistente. El archivo de modelo también es lo bastante pequeño como para versionarlo o enviarlo por correo.',
            'doc.req.title': 'Requisitos y compatibilidad',
            'doc.req.li1': '<b>Cualquier navegador moderno</b> — versión reciente de Chrome, Edge, Firefox, Safari... WebAssembly se usa automáticamente cuando está presente.',
            'doc.req.li2': '<b>No se necesita conexión a Internet</b> una vez cargada la página. La aplicación también funciona desde un archivo local para uso totalmente offline.',
            'doc.req.li3': '<b>Cualquier CSV</b> con al menos una columna de variable numérica y una columna de churn binaria. Conjuntos con decenas de miles de filas se entrenan en segundos en un portátil típico.',
            'doc.oss.title': 'Open source',
            'doc.oss.body': 'marijoAI se distribuye bajo <b>licencia MIT</b>. El código fuente está en <a href="https://github.com/marijoai/marijoai" target="_blank">GitHub</a>.'
        }
    };

    function isSupported(lang) {
        return SUPPORTED.indexOf(lang) !== -1;
    }

    function readStoredLanguage() {
        try {
            var stored = localStorage.getItem(STORAGE_KEY);
            if (stored && isSupported(stored)) return stored;
        } catch (e) {}
        return null;
    }

    function persistLanguage(lang) {
        try {
            localStorage.setItem(STORAGE_KEY, lang);
        } catch (e) {}
    }

    var currentLang = readStoredLanguage() || DEFAULT_LANG;

    function format(template, params) {
        if (!params) return template;
        return template.replace(/\{(\w+)\}/g, function (_, name) {
            return Object.prototype.hasOwnProperty.call(params, name)
                ? String(params[name])
                : '{' + name + '}';
        });
    }

    function translate(key, params) {
        var dict = translations[currentLang] || translations[DEFAULT_LANG];
        var value = dict[key];
        if (value === undefined) {
            // Fallback to default language if the current one does not define the key.
            var fallback = translations[DEFAULT_LANG];
            value = fallback ? fallback[key] : undefined;
        }
        if (value === undefined) return key;
        return format(value, params);
    }

    function applyAttr(el, attrName, docAttr, useText) {
        var key = el.getAttribute(attrName);
        if (!key) return;
        var value = translate(key);
        if (docAttr) {
            el.setAttribute(docAttr, value);
        } else if (useText) {
            el.textContent = value;
        } else {
            el.innerHTML = value;
        }
    }

    function translatePage(root) {
        root = root || document;
        var els;

        els = root.querySelectorAll('[data-i18n]');
        for (var i = 0; i < els.length; i++) applyAttr(els[i], 'data-i18n', null, false);

        els = root.querySelectorAll('[data-i18n-text]');
        for (var j = 0; j < els.length; j++) applyAttr(els[j], 'data-i18n-text', null, true);

        els = root.querySelectorAll('[data-i18n-placeholder]');
        for (var k = 0; k < els.length; k++) applyAttr(els[k], 'data-i18n-placeholder', 'placeholder', false);

        els = root.querySelectorAll('[data-i18n-title]');
        for (var m = 0; m < els.length; m++) applyAttr(els[m], 'data-i18n-title', 'title', false);

        els = root.querySelectorAll('[data-i18n-aria-label]');
        for (var n = 0; n < els.length; n++) applyAttr(els[n], 'data-i18n-aria-label', 'aria-label', false);
    }

    function updateHtmlLang() {
        try {
            document.documentElement.setAttribute('lang', currentLang);
        } catch (e) {}
    }

    function updateDocumentTitle() {
        try {
            var title = translate('home.page_title');
            if (title) document.title = title;
            var metaDesc = document.querySelector('meta[name="description"]');
            if (metaDesc) metaDesc.setAttribute('content', translate('home.meta_description'));
        } catch (e) {}
    }

    function updateSwitcherState() {
        var buttons = document.querySelectorAll('[data-lang-option]');
        for (var i = 0; i < buttons.length; i++) {
            var btn = buttons[i];
            var lang = btn.getAttribute('data-lang-option');
            if (lang === currentLang) {
                btn.classList.add('active');
                btn.setAttribute('aria-pressed', 'true');
            } else {
                btn.classList.remove('active');
                btn.setAttribute('aria-pressed', 'false');
            }
        }
    }

    function setLanguage(lang) {
        if (!isSupported(lang) || lang === currentLang) {
            if (isSupported(lang)) {
                // Even if unchanged, keep UI in sync.
                updateSwitcherState();
            }
            return;
        }
        currentLang = lang;
        persistLanguage(lang);
        updateHtmlLang();
        updateDocumentTitle();
        translatePage();
        updateSwitcherState();
        try {
            document.dispatchEvent(new CustomEvent('marijoai:language-changed', {
                detail: { lang: lang }
            }));
        } catch (e) {}
    }

    function getLanguage() {
        return currentLang;
    }

    function initSwitcher() {
        var container = document.querySelector('[data-language-switcher]');
        if (!container) return;
        container.addEventListener('click', function (e) {
            var btn = e.target.closest ? e.target.closest('[data-lang-option]') : null;
            if (!btn) return;
            e.preventDefault();
            var lang = btn.getAttribute('data-lang-option');
            if (lang) setLanguage(lang);
        });
        updateSwitcherState();
    }

    function onReady() {
        updateHtmlLang();
        updateDocumentTitle();
        translatePage();
        initSwitcher();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onReady);
    } else {
        onReady();
    }

    window.i18n = {
        t: translate,
        setLanguage: setLanguage,
        getLanguage: getLanguage,
        translatePage: translatePage,
        SUPPORTED: SUPPORTED.slice(),
        DEFAULT: DEFAULT_LANG
    };
})();
