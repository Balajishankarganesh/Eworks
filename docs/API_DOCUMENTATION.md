# HomeWorks — REST & WebSocket API Specification

All REST endpoints are rooted at `/api/v1/`. Responses return standard JSON with RFC 7807 compliant error envelopes when applicable.

---

## 1. Authentication & Accounts (`/api/v1/auth/`)

| Method | Endpoint | Access | Description | Request Body |
|--------|----------|:------:|-------------|--------------|
| `POST` | `/register/customer/` | Public | Register new customer | `{ email, password, first_name, last_name, phone_number }` |
| `POST` | `/register/partner/` | Public | Register new service partner | `{ email, password, first_name, last_name, phone_number, business_name, experience_years }` |
| `POST` | `/login/` | Public | Obtain JWT token pair | `{ email, password }` |
| `POST` | `/token/refresh/` | Public | Refresh expired access token | `{ refresh }` |
| `GET` | `/profile/` | Authenticated | Retrieve authenticated user profile | None |
| `PATCH` | `/profile/` | Authenticated | Update user/profile attributes | Partial profile dict |
| `POST` | `/partner/documents/` | Partner | Upload KYC document | `multipart/form-data`: `{ document_type, document_file }` |
| `GET` | `/admin/partners/` | Admin | List partners pending verification | Query params: `?status=PENDING` |
| `POST` | `/admin/partners/<id>/verify/` | Admin | Approve or reject partner application | `{ action: "APPROVE"|"REJECT", rejection_reason }` |

---

## 2. Services (`/api/v1/services/`)

| Method | Endpoint | Access | Description |
|--------|----------|:------:|-------------|
| `GET` | `/categories/` | Public | List all active service categories (e.g. Plumbing, Electrical, Cleaning) |
| `GET` | `/categories/<slug>/` | Public | Retrieve detailed category info with base pricing and estimated durations |
| `GET` | `/partner-services/` | Partner | List the logged-in partner's offered services |
| `POST` | `/partner-services/` | Partner | Register a new service category for partner `{ category_id, custom_price }` |
| `DELETE`| `/partner-services/<id>/` | Partner | Deactivate or remove a offered service |

---

## 3. Locations & Geolocation (`/api/v1/locations/`)

| Method | Endpoint | Access | Description | Request Body / Query Params |
|--------|----------|:------:|-------------|-----------------------------|
| `GET` | `/addresses/` | Customer | List all saved addresses | None |
| `POST` | `/addresses/` | Customer | Save a new delivery / service address | `{ label, address_line_1, city, state, pincode, latitude, longitude, is_default }` |
| `PUT` | `/addresses/<id>/` | Customer | Update an existing address | Address payload |
| `DELETE`| `/addresses/<id>/` | Customer | Delete an address | None |
| `PUT` | `/partner/location/` | Partner | Transmit partner GPS ping | `{ latitude, longitude, accuracy_meters }` |
| `GET` | `/partner/availability/` | Partner | Retrieve partner weekly schedule | None |
| `POST` | `/partner/availability/bulk/` | Partner | Bulk update weekly schedule slots | Array of `{ day_of_week, start_time, end_time, is_available }` |
| `GET` | `/geo-search/partners/` | Public | Query nearby active & online partners | `?latitude=13.08&longitude=80.27&category_id=<uuid>&radius_km=15` |
| `GET` | `/service-area-check/` | Public | Check if location is in service zones | `?latitude=13.08&longitude=80.27` |

---

## 4. Bookings (`/api/v1/bookings/`)

| Method | Endpoint | Access | Description |
|--------|----------|:------:|-------------|
| `POST` | `/create/` | Customer | Create a new booking (instant or scheduled) |
| `GET` | `/list/` | Authenticated | List bookings (filtered by role: customer or partner) |
| `GET` | `/<id>/` | Authenticated | Retrieve booking status, partner ETA, and history |
| `POST` | `/<id>/cancel/` | Authenticated | Cancel booking with reason `{ cancellation_reason }` |
| `POST` | `/<id>/start/` | Partner | Validate 4-digit customer OTP to start job `{ otp: "1234" }` |
| `POST` | `/<id>/complete/` | Partner | Mark job completed and trigger invoice calculation |
| `GET` | `/<id>/status-history/` | Authenticated | View audit log of all status transitions |

---

## 5. Matching Engine (`/api/v1/matching/`)

| Method | Endpoint | Access | Description |
|--------|----------|:------:|-------------|
| `POST` | `/trigger/<booking_id>/` | Customer / Admin | Trigger matching cycle manually if needed |
| `GET` | `/offers/active/` | Partner | Retrieve current active offers awaiting response |
| `POST` | `/offers/<id>/accept/` | Partner | Atomically accept booking offer |
| `POST` | `/offers/<id>/reject/` | Partner | Decline offer with optional reason `{ reason }` |

---

## 6. Payments (`/api/v1/payments/`)

| Method | Endpoint | Access | Description |
|--------|----------|:------:|-------------|
| `POST` | `/orders/create/` | Customer | Create a Razorpay / gateway payment order for a booking `{ booking_id }` |
| `POST` | `/verify/` | Customer | Verify payment signature `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }` |
| `GET` | `/earnings/` | Partner | Retrieve partner gross earnings, platform commission, and payout status |
| `GET` | `/invoices/<booking_id>/`| Authenticated | Download / view breakdown of GST invoice and fees |

---

## 7. Reviews (`/api/v1/reviews/`)

| Method | Endpoint | Access | Description |
|--------|----------|:------:|-------------|
| `POST` | `/create/` | Customer | Leave 1–5 star rating and comment for completed booking `{ booking_id, rating, comment }` |
| `GET` | `/partner/<partner_id>/` | Public | List public customer reviews for a partner |
| `POST` | `/<review_id>/reply/` | Partner | Partner post-service response to a customer review `{ reply }` |

---

## 8. Support & Audit (`/api/v1/support/`)

| Method | Endpoint | Access | Description |
|--------|----------|:------:|-------------|
| `POST` | `/tickets/` | Authenticated | File a support ticket `{ booking_id, category, subject, description }` |
| `GET` | `/tickets/` | Authenticated | List tickets created by user |
| `PATCH`| `/tickets/<id>/resolve/` | Admin | Update status and add resolution notes |
| `GET` | `/admin/audit-logs/` | Admin | Query immutable administrative audit logs with filtering |

---

## 9. WebSockets (`/ws/`)

### 1. Booking Status Stream: `/ws/bookings/{booking_id}/`
- **Events Received**:
  - `BOOKING_SEARCHING`: Searching for nearby partners
  - `BOOKING_MATCHED`: Partner assigned (`partner_name`, `rating`, `eta_minutes`, `phone`)
  - `PARTNER_EN_ROUTE`: Partner started driving to location
  - `PARTNER_ARRIVED`: Partner arrived at premises
  - `JOB_STARTED`: OTP verified; work in progress
  - `JOB_COMPLETED`: Work finished; payment request dispatched
  - `BOOKING_CANCELLED`: Booking terminated

### 2. Partner Radar Stream: `/ws/partner/stream/`
- **Events Received**:
  - `NEW_OFFER`: `{ offer_id, booking_id, category, price, distance_km, expires_at }`
  - `OFFER_EXPIRED`: Offer expired or accepted by another partner
