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