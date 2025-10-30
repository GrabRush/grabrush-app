# Grabrush - Food Discovery App

A complete authentication system with email verification and food photo gallery.

## Features

- User registration with email verification
- Secure login with password hashing
- Session management
- Food photo gallery for authenticated users
- Responsive design

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Setup
Create a MySQL database and update the connection settings in `database.js` or set environment variables:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=grabush
DB_PORT=3306
```

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

### 4. Run the Application
```bash
npm start
```

The application will be available at `http://localhost:3000`

## User Flow

1. **Login Page** (`/`) - Users can login with email/password
2. **Email Verification** (`/verify-email`) - New users enter email to receive verification link
3. **Registration** (`/register?token=...`) - Complete registration after email verification
4. **Food Photos** (`/food-photos`) - Authenticated users see random food photos

## Pages

- **Login**: Email and password fields with "Not a member yet?" link
- **Verify Email**: Email input to send verification link
- **Register**: Complete registration form with all user details
- **Food Photos**: Gallery of random food images for logged-in users

All pages have "Grabush" as the centered title.

## Security Features

- Password hashing with bcrypt
- Email verification before registration
- Session-based authentication
- SQL injection protection with parameterized queries



