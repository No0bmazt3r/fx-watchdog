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

## How to Test with Postman

First, ensure your server is running.

### 1. Import the New Collection:
* Delete any old "FX Watchdog API" collection in Postman.
* Import the new collection from `Resources/postman/fx-watchdog-api.postman_collection.json`.
* Ensure "FX Watchdog - Local" environment is selected.

### 2. Login as SuperAdmin:
* Go to the Auth folder -> 1. Login request.
* In the Body, use username: `SuperAdmin`, password: `Password123`.
* Click Send. The `authToken` and `isTemporaryPassword` variables will be set automatically.

### 3. SuperAdmin Creates an Admin:
* Go to User Management folder -> 1. SuperAdmin - Create Admin request.
* Click Send. (You can change the username/password in the body if you wish).

### 4. Login as the New Admin:
* Go back to Auth folder -> 1. Login request.
* Change the Body to the username and password of the Admin you just created (e.g., username: `newadmin`, password: `admin_temp_pass`).
* Click Send. The `authToken` will now be for the Admin.

### 5. Admin Changes Password (Optional but Recommended):
* Go to Auth folder -> 2. Change Password request.
* In the Body, set a `newPassword`.
* Click Send.

### 6. Admin Creates an Ops User:
* Go to User Management folder -> 2. Admin - Create Ops User request.
* Click Send. (You can change the username/password in the body if you wish).

### 7. Login as the New Ops User:
* Go back to Auth folder -> 1. Login request.
* Change the Body to the username and password of the Ops User you just created (e.g., username: `opsuser1`, password: `ops_temp_pass`).
* Click Send. The `authToken` will now be for the Ops User, and `isTemporaryPassword` will be true.

### 8. Ops User Changes Password (Mandatory for Uploads):
* Go to Auth folder -> 2. Change Password request.
* In the Body, set a `newPassword`.
* Click Send.

### 9. Ops User Uploads Image (OCR+AI Simulation):
* Go to Ops User Workflow folder -> 1. Upload Image (Protected) request.
* Go to the Body tab, select a file for the `image` key.
* Click Send. You will see the detailed JSON output from the simulated OCR+AI.

### 10. Test Delete Functionalities:
* To delete an Ops User: Log in as an Admin (or SuperAdmin), then use User Management -> 4. Admin - Delete Ops User. Remember to replace `:id` in the URL with the actual ID of the Ops User you want to delete (you can get this ID from the response when you created the Ops User).
* To delete an Admin: Log in as a SuperAdmin, then use User Management -> 3. SuperAdmin - Delete Admin. Replace `:id` with the Admin's ID.