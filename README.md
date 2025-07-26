# FlashRead

A web-based application for speed-reading PDFs and Word documents using Rapid Serial Visual Presentation (RSVP) techniques. Display text word-by-word at a customizable speed to enhance reading efficiency and focus.

## Features

- Upload and parse PDFs and Word documents (.pdf, .docx).
- Adjustable reading speed (words per minute, WPM).
- Pause, resume, and skip functionality for flexible reading.
- Responsive design for desktop and mobile browsers.

## Installation

Follow these steps to run the app locally:

### Prerequisites

- Node.js (v16 or higher)
- npm (v8 or higher)
- A modern web browser (Chrome, Firefox, Safari)

### Steps

1. Clone the repository:

   ```bash
   git clone https://github.com/Zicross/FlashRead.git
   cd rsvp-app
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm start
   ```

4. Open `http://localhost:3000` in your browser.

## Usage

1. **Upload a File**: Click the "Upload" button and select a PDF or Word document.
2. **Set WPM**: Adjust the words-per-minute slider (default: 300 WPM).
3. **Start Reading**: Click "Start" to begin the RSVP display.
4. **Controls**:
   - **Pause/Resume**: Toggle to pause or resume reading.
   - **Skip**: Jump forward or backward by sentence or paragraph.
   - **Restart**: Return to the beginning of the document.

## Supported Formats

- PDF (.pdf)
- Word (.docx)
- *Note*: Large files (&gt;10MB) may take longer to process.

## Contributing

Contributions are welcome:

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/your-feature`).
3. Commit your changes (`git commit -m "Add your feature"`).
4. Push to the branch (`git push origin feature/your-feature`).
5. Open a Pull Request.

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Feedback

Report bugs or suggest features via GitHub Issues.