# Grabrush - Food Discovery & Vendor Mystery Box App

Grabrush now supports both customer food discovery and vendor management of products and mystery boxes. Includes secure authentication, email verification, vendor dashboards, order status workflow, and dynamic inventory features.

## Features

### Core (Customers)
- Email verification registration flow
- Secure login (bcrypt hashed passwords)
- Session-based auth
- Food / restaurant photo gallery
- Responsive design

### Vendor Capabilities
- Vendor registration & login
- Vendor dashboard with real-time metrics:
  - Today's orders
  - Ready for pickup orders
  - Completed orders
- Create and manage products (image, category, quantity, price, discount, premium flag, pickup window, enable today)
- Create mystery boxes composed of selected products with quantities (transaction + batch insert)
- View recent orders with inline status updates (in_progress → ready → completed)
- View product and mystery box listings

### Technical / Platform
- MySQL relational schema with tables: users, vendors, products, mystery_boxes, mystery_box_items, orders
- Input validation using `express-validator`
- Rate limiting (`express-rate-limit`) for login and vendor APIs
- Winston structured logging (JSON output, colorized console)
- Graceful shutdown handling
- Parameterized queries (mysql2) protecting against SQL injection

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Setup
Create a MySQL database and update the connection settings in `database.js` or set environment variables:
Install docker.
Then run:
```
docker run -d --name mysql-dev \
  -e MYSQL_ROOT_PASSWORD='M@nchester1995' \
  -e MYSQL_DATABASE='Practice' \
  -e MYSQL_USER='myapp_user' \
  -e MYSQL_PASSWORD='myapp_pass' \
  -p 3307:3306 \
  -v mysql-data:/var/lib/mysql \
  mysql:8.0
```
Your MySQL server is now running at localhost:3307, and you have a database ready with the name "Practice"

Now, if you use this environment variables:
```env
DB_HOST=localhost
DB_PORT=3307
DB_USER=myapp_user
DB_PASSWORD=myapp_pass
DB_NAME=Practice
```
You are now ready to run the application.

### 3. Email Configuration
For email verification to work, you need to configure email settings. Create a `.env` file:

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

**For Gmail:**
1. Enable 2-factor authentication
2. Generate an App Password
3. Use the App Password as EMAIL_PASS

### 4. Additional Environment Options

Optional environment variables:
```env
PORT=9000
NODE_ENV=development
LOG_LEVEL=info
```

### 5. Run the Application
```bash
npm start
```

The application will be available at `http://localhost:9000`

## User & Vendor Flow

1. **Login Page** (`/`) - Users can login with email/password
2. **Email Verification** (`/verify-email`) - New users enter email to receive verification link
3. **Registration** (`/register?token=...`) - Complete registration after email verification
4. **Food Photos** (`/food-photos`) - Authenticated customers see random food photos
5. **Vendor Dashboard** (`/vendor/dashboard`) - Vendor overview, metrics, products, boxes, orders
6. **Add Product** (`/vendor/products/new`) - Form to create product
7. **Create Mystery Box** (`/vendor/mystery-boxes/new`) - Compose product bundle

## Pages

- **Login**: Email and password fields with "Not a member yet?" link
- **Verify Email**: Email input to send verification link
- **Register**: Complete registration form with all user details
- **Food Photos**: Gallery of random food images for logged-in users
- **Vendor Dashboard**: Metrics, product & mystery box listing, recent orders, status actions
- **Add Product**: Product creation form
- **Create Mystery Box**: Product selection & batch creation form

All pages have "Grabush" as the centered title.

## Security Features

- Password hashing with bcrypt
- Email verification before registration
- Session-based authentication
- SQL injection protection with parameterized queries
- Rate limiting for brute-force mitigation
- Secure cookie (secure + httpOnly + sameSite) in production
- Input validation with `express-validator`

## API Endpoints (Vendor)

Base: `http://localhost:9000`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /vendor/products | Create product |
| GET  | /vendor/products | List vendor products |
| POST | /vendor/mystery-boxes | Create mystery box (transaction + batch insert) |
| GET  | /vendor/mystery-boxes | List vendor mystery boxes |
| GET  | /vendor/dashboard/metrics | Dashboard metrics (today, ready, completed) |
| GET  | /vendor/orders?limit=20 | Recent orders with item/mystery box details |
| PUT  | /vendor/orders/:id/status | Update order status (in_progress, ready, completed) |

### Product Create Request Body
```json
{
  "image_url": "https://example.com/a.jpg",
  "name": "Salad Bowl",
  "description": "Fresh mixed greens",
  "category": "Salads",
  "quantity": 50,
  "price": 8.99,
  "discount": 1.00,
  "is_premium": true,
  "pickup_start_time": "2025-11-02T15:00:00",
  "pickup_end_time": "2025-11-02T18:00:00",
  "enable_today": true
}
```

### Mystery Box Create Request Body
```json
{
  "title": "Evening Combo",
  "product_ids": [ { "id": 3, "quantity": 2 }, { "id": 7, "quantity": 1 } ],
  "price": 24.50,
  "quantity": 10,
  "pickup_start_time": "2025-11-02T19:00:00",
  "pickup_end_time": "2025-11-02T21:00:00"
}
```

### Order Status Update
```json
{ "status": "ready" }
```

### Example Metrics Response
```json
{
  "success": true,
  "data": {
    "todaysOrders": 5,
    "readyOrders": 2,
    "completedOrders": 11
  }
}
```

## Database Schema Overview

```
users(id, name, email UNIQUE, password, street, city, zip, phone, is_verified, verification_token, created_at)
vendors(id, business_name, email UNIQUE, password, location, business_contact, is_verified, verification_token, created_at)
products(id, vendor_id FK, image_url, name, description, category, quantity, price, discount, is_premium, pickup_start_time, pickup_end_time, enable_today, created_at, updated_at)
mystery_boxes(id, vendor_id FK, title, price, quantity, pickup_start_time, pickup_end_time, created_at, updated_at)
mystery_box_items(id, mystery_box_id FK, product_id FK, quantity, created_at)
orders(id, vendor_id FK, user_id FK, mystery_box_id FK NULL, product_id FK NULL, order_type ENUM('product','mystery_box'), price, description, pickup_start_time, pickup_end_time, status ENUM('in_progress','ready','completed'), created_at, updated_at)
```

## Development Tips
- Run `npm install express-validator express-rate-limit winston` if not already installed.
- Check logs: Winston prints structured logs to console.
- Adjust rate limits in `app.js` for different environments.
- Consider adding `helmet` for further HTTP header hardening.

## Future Improvements
- Edit/Delete for products and mystery boxes
- Paginated & filterable orders
- Customer ordering & payment integration
- Real-time updates (WebSockets) for order status changes
- OpenAPI / Swagger spec generation
- Unit & integration tests (Jest / Supertest)

## License
Proprietary - All rights reserved (adapt as needed).