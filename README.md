# fx-watchdog

This is the backend repo for the live currency rate check.

## Getting Started

1.  Clone the repository:
    ```
    git clone https://github.com/No0bmazt3r/fx-watchdog.git
    ```
2.  Install dependencies:
    ```
    npm install
    ```
3.  Create a `.env` file in the root directory and add your MongoDB connection string:
    ```
    PORT=3000
    MONGODB_URI=your_mongodb_connection_string
    ```
4.  Start the server:
    ```
    npm start
    ```

## Full Workflow

This project uses a local Python-based OCR service to extract data from images. The main Node.js application communicates with this local service.

### 1. Running the Local OCR Service

Before you can process images, you need to start the local OCR service.

1.  **Install Python and pip:** If you don't have them, download and install from [python.org](https://python.org).
2.  **Install Dependencies:** Open a terminal in the `services` directory and run:
    ```bash
    pip install -r requirements.txt
    ```
3.  **Run the Service:** In the same terminal, run:
    ```bash
    python ocr_service.py
    ```
    This will start a local server at `http://localhost:5000`.

### 2. Testing with Postman

Once the main server and the local OCR service are running, you can use the updated Postman collection to test the full workflow.

1.  **Import the New Collection:**
    *   Delete any old "FX Watchdog API" collection in Postman.
    *   Import the new collection from `Resources/postman/fx-watchdog-api.postman_collection.json`.
    *   Ensure "FX Watchdog - Local" environment is selected.

2.  **Test the Local OCR Service (Optional):**
    *   Go to the "Local OCR Service" folder -> "1. Test Local OCR" request.
    *   In the Body, replace `<base64_encoded_image_string>` with a base64 encoded image string.
    *   Click Send. You should see the JSON output from the OCR service.

3.  **Follow the User Workflow:**
    *   Follow the steps in the "Auth", "User Management", and "Ops User Workflow" folders to simulate the full process of creating users and uploading images for OCR processing.

## API Endpoints

*   `POST /api/rates`: Create a new currency rate.

    *   **Request Body:**
        ```json
        {
          "currencyPair": "USD/MYR",
          "rate": 4.75
        }
        ```

*   `GET /api/rates/latest?currencyPair=USD/MYR`: Get the latest rate for a specific currency pair.