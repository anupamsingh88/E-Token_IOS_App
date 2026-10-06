# E-Token App (KhaadSetu) 🌾

A comprehensive **Fertilizer Management System (SFMS)** designed to streamline the distribution of fertilizers to farmers. The ecosystem consists of a Farmer Mobile App, a Retailer Mobile App, and a robust PHP Backend.

## 🚀 Project Overview

The **E-Token App** addresses the challenges of fertilizer distribution by implementing a digital token and booking system. It ensures transparency, reduces long queues at retail centers, and helps in managing stock efficiently.

### Key Components:
*   **Farmer App (`New_SFMS_app`)**: Allows farmers to register, view available fertilizer stock, book slots (tokens), and track their booking history.
*   **Retailer App (`retailer`)**: Enables retailers to verify farmer tokens via QR code scanning, manage daily stock updates, and process sales.
*   **Backend (`backend`)**: A central PHP-based API system that manages the database, authentication (JWT), SMS notifications, and business logic.

---

## ✨ Features

### For Farmers:
- **Easy Registration**: Quick sign-up with OTP verification.
- **Real-time Stock**: Check fertilizer availability at nearby samitis/retailers.
- **Smart Booking**: Book specific time slots to collect fertilizer, avoiding long waits.
- **Digital Tokens**: QR-based tokens for secure and fast verification.

### For Retailers:
- **QR Scanner**: Integrated scanner to instantly verify farmer tokens.
- **Stock Management**: Update daily stock levels for Urea, DAP, NPK, and MOP.
- **Sales Logging**: Maintain digital records of all distributions.
- **Farmer Approval**: Verify and approve new farmer registrations in the area.

---

## 🛠️ Tech Stack

- **Frontend**: React Native, Expo, TypeScript.
- **Backend**: PHP (PDO), MySQL.
- **Security**: JWT (JSON Web Tokens) for API authentication.
- **Integrations**: SMS Gateway for OTPs and notifications.

---

## ⚙️ Setup Instructions

### Backend Setup:
1. Navigate to the `backend/` directory.
2. Import `retailer_schema.sql` into your MySQL database.
3. Create a `.env` file based on the environment requirements:
   ```env
   DB_HOST=localhost
   DB_NAME=your_db_name
   DB_USER=your_user
   DB_PASSWORD=your_password
   SMS_API_KEY=your_key
   JWT_SECRET=your_secret
   ```

### Mobile Apps (Farmer & Retailer):
1. Install dependencies in both `New_SFMS_app/` and `retailer/` folders:
   ```bash
   npm install
   ```
2. Start the Expo development server:
   ```bash
   npx expo start
   ```

---

## 🛡️ Security
- All API endpoints are protected via JWT.
- Sensitive configuration files and database backups are excluded from version control for security.

---

## 📄 License
This project is developed for the Fertilizer Management System. All rights reserved.
