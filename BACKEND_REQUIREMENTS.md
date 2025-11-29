# Backend API Requirements - Ukraine Interactive Map Project

## Table of Contents
1. [Overview](#overview)
2. [Authentication System](#authentication-system)
3. [Tests & Certificate System](#tests--certificate-system)
4. [Donation System](#donation-system)
5. [User Adventures (Pins) System](#user-adventures-pins-system)
6. [Data Models](#data-models)
7. [API Endpoints Summary](#api-endpoints-summary)

---

## Overview

This document outlines the backend requirements for the Ukraine Interactive Map educational project. The frontend is built with React and requires a REST API backend to handle user authentication, test results, donations, certificate generation, and user-generated content (adventure pins).

**How Frontend-Backend Communication Works:**
Throughout this document, you'll see "**How it works:**" sections that explain what triggers each API call from the frontend and what the backend should do in response. The frontend sends HTTP requests to these endpoints and expects JSON responses in the specified formats.

**Tech Stack Requirements:**
- RESTful API
- JSON responses
- CORS enabled for frontend domain
- Secure password storage (bcrypt/argon2)
- File storage for PDF certificates

---

## Authentication System

### User Registration

**Endpoint:** `POST /api/auth/register`

**How it works:** When a user fills out the registration form and clicks "Підтвердити" (Confirm), the frontend sends a POST request to this endpoint with the user's name, password, and selected gender. The backend creates a new user account, generates a JWT token, and returns it to the frontend. The frontend automatically logs in the user after successful registration.

**Request Body:**
```json
{
  "name": "string (required, min: 3 chars, max: 50 chars)",
  "password": "string (required, min: 6 chars)",
  "gender": "string (required, enum: ['male', 'female'])"
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Реєстрація успішна",
  "data": {
    "userId": "string (UUID)",
    "name": "string",
    "gender": "string",
    "token": "string (JWT token)",
    "createdAt": "ISO 8601 timestamp"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Validation errors (missing fields, password too short, etc.)
- `409 Conflict` - Username already exists

### User Login

**Endpoint:** `POST /api/auth/login`

**How it works:** When a returning user enters their credentials and clicks "Увійти" (Login), the frontend sends a POST request to this endpoint. The backend verifies the credentials, generates a new JWT token, and returns the user's data including certificate status. The frontend stores the token and user data in localStorage.

**Request Body:**
```json
{
  "name": "string (required)",
  "password": "string (required)"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Вхід успішний",
  "data": {
    "userId": "string (UUID)",
    "name": "string",
    "gender": "string",
    "token": "string (JWT token)",
    "hasCertificate": "boolean",
    "certificateUrl": "string | null"
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid credentials
- `400 Bad Request` - Missing fields

### Token Verification

**Endpoint:** `GET /api/auth/verify`

**How it works:** The frontend can use this endpoint to verify if a stored JWT token is still valid (e.g., when the page is refreshed). The frontend sends the token in the Authorization header, and the backend validates it and returns the current user data if valid.

**Headers:**
```
Authorization: Bearer {token}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "userId": "string",
    "name": "string",
    "gender": "string",
    "hasCertificate": "boolean"
  }
}
```

---

## Tests & Certificate System

### Submit Test Results

**Important:** Frontend only sends data when user achieves **12/12 correct answers** for a specific region.

**Endpoint:** `POST /api/tests/submit`

**How it works:** After a user completes a test for a region, the frontend calculates the score locally. **Only if the user scores 12/12 (100%)**, the frontend sends a POST request to this endpoint with the test results. The backend records this passed test and checks if the user has now completed all 25 regions. If so, and the user has also donated, the backend should trigger certificate generation.

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "regionId": "string (e.g., 'Vinnytska', 'Volynska', etc.)",
  "regionName": "string (e.g., 'Вінницька область')",
  "score": 12,
  "totalQuestions": 12,
  "completedAt": "ISO 8601 timestamp"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Тест успішно пройдено!",
  "data": {
    "testId": "string (UUID)",
    "regionId": "string",
    "passedAllTests": "boolean (true if user passed all regions)",
    "totalRegionsPassed": "number",
    "certificateEligible": "boolean (true if passed all tests AND donated)"
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid/missing token
- `400 Bad Request` - Invalid data
- `409 Conflict` - Test already passed for this region

### Get User Test Progress

**Endpoint:** `GET /api/tests/progress`

**How it works:** The frontend can request this endpoint to retrieve which regions the user has already passed. This allows the frontend to show visual indicators on the map or display progress statistics (e.g., "You've passed 15 out of 25 regions").

**Headers:**
```
Authorization: Bearer {token}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "passedRegions": ["Vinnytska", "Volynska", ...],
    "totalPassed": "number",
    "totalRegions": 25,
    "allTestsCompleted": "boolean"
  }
}
```

---

## Donation System

### Submit Donation

**Endpoint:** `POST /api/donations/submit`

**How it works:** When a user completes a donation (via QR code or payment link), the frontend sends a POST request to record the donation. The backend marks this user as having donated. If the user has also passed all 25 tests, the backend should generate a certificate and return the certificate URL in the response.

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "amount": "number (optional, can be 0 for tracking purposes)",
  "transactionId": "string (optional, from payment provider)",
  "donatedAt": "ISO 8601 timestamp"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Дякуємо за ваш внесок!",
  "data": {
    "donationId": "string (UUID)",
    "certificateEligible": "boolean (true if also passed all tests)",
    "certificateUrl": "string | null (if eligible)"
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid/missing token
- `400 Bad Request` - Invalid data

### Check Donation Status

**Endpoint:** `GET /api/donations/status`

**How it works:** The frontend can use this endpoint to check if the current user has already made a donation. This helps the frontend decide whether to show donation prompts or certificate eligibility messages.

**Headers:**
```
Authorization: Bearer {token}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "hasDonated": "boolean",
    "donatedAt": "ISO 8601 timestamp | null"
  }
}
```

---

## Certificate System

### Generate Certificate

**Note:** This should be called automatically by backend when:
1. User has passed ALL tests (all regions with 12/12 score)
2. User has donated

**Backend Internal Process:**
- Generate PDF certificate with:
  - User name
  - Completion date
  - Unique certificate ID
  - QR code (optional, linking to verification page)
- Store PDF in file storage (S3, local storage, etc.)
- Return downloadable URL

### Get Certificate

**Endpoint:** `GET /api/certificates/my-certificate`

**How it works:** When a user clicks the "Сертифікат" (Certificate) button in the top right corner, the frontend sends a GET request to retrieve the user's certificate data. The backend checks if the user has a certificate and returns the URL where the PDF can be viewed/downloaded.

**Headers:**
```
Authorization: Bearer {token}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "hasCertificate": "boolean",
    "certificateUrl": "string (direct download link to PDF)",
    "certificateId": "string",
    "issuedAt": "ISO 8601 timestamp",
    "userName": "string"
  }
}
```

**Error Responses:**
- `404 Not Found` - Certificate not available (user hasn't met requirements)

**Certificate Download:**
- Direct link should allow PDF download
- URL format: `https://api.example.com/certificates/{certificateId}.pdf`
- Should be accessible without authentication (public link)
- Include proper headers:
  ```
  Content-Type: application/pdf
  Content-Disposition: attachment; filename="certificate_{userName}_{certificateId}.pdf"
  ```

---

## User Adventures (Pins) System

### Add New Pin

**Endpoint:** `POST /api/adventures/pins`

**How it works:** When a logged-in user clicks on a region in the "Your Adventures" tab and fills out their impression/experience, the frontend sends a POST request with the pin data. The backend stores the pin with the authenticated user's ID, the region information, and the user's text description.

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "regionId": "string (e.g., 'Kyivska')",
  "regionName": "string (e.g., 'Київська область')",
  "description": "string (max: 500 chars, required)",
  "displayName": "string (optional, if user wants different name on pin, max: 50 chars)"
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Враження успішно додано!",
  "data": {
    "pinId": "string (UUID)",
    "regionId": "string",
    "userName": "string (registered username, not displayName)",
    "displayName": "string (what appears on pin)",
    "description": "string",
    "createdAt": "ISO 8601 timestamp"
  }
}
```

**Error Responses:**
- `401 Unauthorized` - User not logged in
- `400 Bad Request` - Missing required fields or description too long

### Get Pins Summary (All Regions)

**Endpoint:** `GET /api/adventures/summary`

**How it works:** When the "Your Adventures" tab is opened, the frontend sends a GET request to retrieve a summary of how many pins exist for each region. This data is used to display numbers on the map showing community engagement per region. This is a public endpoint - no authentication required.

**No authentication required** - public endpoint

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "regions": [
      {
        "regionId": "Kyivska",
        "regionName": "Київська область",
        "pinCount": 15
      },
      {
        "regionId": "Lvivska",
        "regionName": "Львівська область",
        "pinCount": 23
      }
    ],
    "totalPins": 145
  }
}
```

**Use Case:** When user opens "Your Adventures" tab, frontend requests this to show how many pins each region has.

### Get Pins for Specific Region

**Endpoint:** `GET /api/adventures/pins/{regionId}`

**How it works:** When a user clicks "View all impressions" button for a specific region, the frontend sends a GET request to retrieve all pins (user experiences) for that region. The backend returns a paginated list of pins with user names and descriptions. This is a public endpoint - anyone can view the pins.

**No authentication required** - public endpoint

**Query Parameters:**
- `limit` (optional): Number of pins to return (default: 50)
- `offset` (optional): Pagination offset (default: 0)
- `sortBy` (optional): Sort order - "newest" | "oldest" (default: "newest")

**Example:** `GET /api/adventures/pins/Kyivska?limit=50&offset=0&sortBy=newest`

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "regionId": "Kyivska",
    "regionName": "Київська область",
    "pins": [
      {
        "pinId": "string (UUID)",
        "displayName": "string (user's display name)",
        "description": "string",
        "createdAt": "ISO 8601 timestamp"
      }
    ],
    "total": 15,
    "limit": 50,
    "offset": 0
  }
}
```

**Use Case:** When user clicks "View all impressions" for a region, frontend fetches all pins for that region.

### Delete Own Pin

**Endpoint:** `DELETE /api/adventures/pins/{pinId}`

**How it works:** If a user wants to remove their own pin/impression, the frontend sends a DELETE request with the pin ID. The backend verifies that the authenticated user owns this pin before deleting it. Users can only delete their own pins, not others'.

**Headers:**
```
Authorization: Bearer {token}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Враження видалено"
}
```

**Error Responses:**
- `401 Unauthorized` - Not logged in
- `403 Forbidden` - Trying to delete someone else's pin
- `404 Not Found` - Pin doesn't exist

---

## Data Models

### User Model
```javascript
{
  userId: UUID (primary key),
  name: String (unique, indexed),
  passwordHash: String,
  gender: Enum ('male', 'female'),
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### TestResult Model
```javascript
{
  testResultId: UUID (primary key),
  userId: UUID (foreign key -> User),
  regionId: String,
  regionName: String,
  score: Integer (always 12 for passed tests),
  totalQuestions: Integer (always 12),
  completedAt: Timestamp,
  createdAt: Timestamp
}
```
**Unique constraint:** (userId, regionId)

### Donation Model
```javascript
{
  donationId: UUID (primary key),
  userId: UUID (foreign key -> User),
  amount: Decimal (optional),
  transactionId: String (optional),
  donatedAt: Timestamp,
  createdAt: Timestamp
}
```

### Certificate Model
```javascript
{
  certificateId: UUID (primary key),
  userId: UUID (foreign key -> User, unique),
  certificateUrl: String (URL to PDF file),
  issuedAt: Timestamp,
  createdAt: Timestamp
}
```

### AdventurePin Model
```javascript
{
  pinId: UUID (primary key),
  userId: UUID (foreign key -> User),
  regionId: String (indexed),
  regionName: String,
  displayName: String (name shown on pin),
  description: Text (max 500 chars),
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```
**Indexes:** regionId, userId, createdAt

---

## API Endpoints Summary

### Authentication
| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/api/auth/register` | No | Register new user |
| POST | `/api/auth/login` | No | Login user |
| GET | `/api/auth/verify` | Yes | Verify JWT token |

### Tests
| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/api/tests/submit` | Yes | Submit test results (12/12 only) |
| GET | `/api/tests/progress` | Yes | Get user's test progress |

### Donations
| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/api/donations/submit` | Yes | Record donation |
| GET | `/api/donations/status` | Yes | Check if user donated |

### Certificates
| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/api/certificates/my-certificate` | Yes | Get user's certificate |
| GET | `/certificates/{certificateId}.pdf` | No | Download certificate PDF |

### Adventure Pins
| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/api/adventures/pins` | Yes | Add new pin |
| GET | `/api/adventures/summary` | No | Get pin counts per region |
| GET | `/api/adventures/pins/{regionId}` | No | Get all pins for region |
| DELETE | `/api/adventures/pins/{pinId}` | Yes | Delete own pin |

---

## Security Requirements

1. **Password Storage:**
   - Use bcrypt or argon2 for password hashing
   - Minimum 10 rounds for bcrypt

2. **JWT Tokens:**
   - Use secure secret key
   - Token expiration: 7 days recommended
   - Include userId, name in payload

3. **CORS:**
   - Allow frontend domain(s)
   - Credentials: true

4. **Rate Limiting:**
   - Login attempts: 5 per 15 minutes per IP
   - Registration: 3 per hour per IP
   - Pin creation: 10 per hour per user

5. **Input Validation:**
   - Sanitize all user inputs
   - Validate field lengths
   - Escape HTML/SQL in descriptions

6. **File Security:**
   - Certificate PDFs should be publicly accessible via direct link
   - Use UUIDs in filenames to prevent guessing
   - Validate file types

---

## Business Logic Rules

### Certificate Generation
Certificate should be automatically generated when:
```
User has donated === true
AND
User has passed all 25 regions (each with 12/12 score) === true
```

### Frontend Behavior After Backend Integration

1. **Non-registered users:**
   - Cannot access test functionality
   - Cannot add pins
   - Show message: "Будь ласка, зареєструйтеся, щоб пройти тести та отримати сертифікат" (for tests)
   - Show message: "Будь ласка, зареєструйтеся, щоб додати свої враження" (for pins)
   - Add "Зареєструватися" button that opens auth modal

2. **Certificate Modal:**
   - Show when backend returns certificate URL after donation or test completion
   - Title: "Вітаємо! Ви отримали сертифікат!"
   - Message: "Ви можете завантажити його нижче."
   - Download button linking to certificate URL

3. **Certificate Button (Top Right):**
   - Only show if `hasCertificate === true`
   - Button text: "Переглянути мій сертифікат"
   - Opens modal with embedded PDF or direct download link

---

## Error Handling

All error responses should follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "User-friendly error message in Ukrainian",
    "details": {} // optional additional info
  }
}
```

**Common Error Codes:**
- `VALIDATION_ERROR` - Invalid input data
- `UNAUTHORIZED` - Missing or invalid token
- `FORBIDDEN` - No permission for action
- `NOT_FOUND` - Resource not found
- `CONFLICT` - Resource already exists
- `INTERNAL_ERROR` - Server error

---

## Testing Recommendations

1. **Unit Tests:**
   - All authentication flows
   - Certificate generation logic
   - Pin CRUD operations

2. **Integration Tests:**
   - Complete user journey: register → login → test → donate → certificate
   - Pin creation and retrieval

3. **Load Tests:**
   - Multiple concurrent pin reads
   - Certificate generation under load

---

## Additional Notes

- **Regional IDs:** Use exact names as they appear in frontend (case-sensitive):
  - `Vinnytska`, `Volynska`, `Zhytomyrska`, `Dnipropetrovska`, `Donetska`, `Zakarpatska`, `Zaporizka`, `Kirovohradska`, `Avtonomna Respublika Krym`, `Mykolaivska`, `Odeska`, `Poltavska`, `Rivnenska`, `Sumska`, `Ternopilska`, `Kharkivska`, `Khersonska`, `Khmelnytska`, `Cherkaska`, `Chernivetska`, `Chernihivska`, `Kyivska`, `Lvivska`, `Ivano-Frankivska`, `Zakarpatska`

- **Certificate PDF Requirements:**
  - Include user's full name
  - Date of completion
  - Unique certificate ID
  - Professional design (template can be provided by frontend team)
  - Language: Ukrainian

- **Base URL:** Please provide the base API URL for frontend configuration (e.g., `https://api.ukraine-map.com` or `http://localhost:3001`)

---

## Questions for Backend Team

1. What will be the base API URL for development and production?
2. What authentication method do you prefer (JWT, sessions, etc.)?
3. Will you handle file storage (S3, local) or need frontend to provide storage?
4. Do you need any additional user fields (email, phone, etc.)?
5. Should certificates have expiration dates?
6. Do you need webhook endpoints for payment processing?

---

**Document Version:** 1.0
**Last Updated:** 2025-01-XX
**Contact:** Frontend Team Lead
