# 🚗 RoadRescue - Vehicle Breakdown Assistance System
Road Rescue is a full-stack web application developed to provide real-time vehicle breakdown assistance. The system allows users to raise emergency requests and connect with nearby mechanics through interactive dashboards, live status updates, and request management features. Built using HTML, CSS, JavaScript, PHP, and MySQL.

**BTech 2nd Year Project **

---

## 📁 Project Structure
```
breakdown-assist/
├── index.html                 ← Login / Register Page
├── user-dashboard.html        ← User Dashboard
├── provider-dashboard.html    ← Provider Dashboard
├── css/
│   ├── style.css              ← Main styles (auth + global)
│   └── dashboard.css          ← Dashboard-specific styles
├── js/
│   ├── auth.js                ← Login/Register logic
│   ├── dashboard-user.js      ← User dashboard logic
│   └── dashboard-provider.js  ← Provider dashboard logic
├── php/
│   ├── config.php             ← DB connection
│   ├── auth.php               ← Login, Register, Session
│   └── requests.php           ← All request operations
└── sql/
    └── schema.sql             ← Database schema + sample data
```

---

## ⚙️ Setup Instructions

### Step 1: Install XAMPP / WAMP / LAMP
Download XAMPP: https://www.apachefriends.org/
Start **Apache** and **MySQL** from the control panel.

### Step 2: Copy project files
Copy the entire `breakdown-assist` folder to:
- **XAMPP (Windows):** `C:/xampp/htdocs/breakdown-assist/`
- **XAMPP (Mac/Linux):** `/Applications/XAMPP/htdocs/breakdown-assist/`

### Step 3: Create the database
1. Open browser → go to http://localhost/phpmyadmin
2. Click **"New"** → database name: `roadrescue` → click **Create**
3. Click the `roadrescue` database → click **SQL** tab
4. Copy contents of `sql/schema.sql` and paste → click **Go**

### Step 4: Configure database (if needed)
Edit `php/config.php`:
```php
define('DB_USER', 'root');   // Your MySQL username
define('DB_PASS', '');        // Your MySQL password (empty by default in XAMPP)
```

### Step 5: Run the project
Open browser → http://localhost/breakdown-assist/

---

## 🔑 Demo Accounts (pre-loaded)
| Name         | Email              | Password  | Role     |
|-------------|---------------------|-----------|----------|
| Rahul Sharma | rahul@email.com    | password  | Provider |
| Priya Mehta  | priya@email.com    | password  | Provider |
| Amit Singh   | amit@email.com     | password  | Provider |

*Create your own user account via the registration form.*

---

## 🌟 Features

### User Side
- Register / Login as **User** or **Provider** (same email works for both!)
- Raise a breakdown request with issue type, description, location
- Auto-detect GPS location
- See all available providers (pending → accepted)
- Real-time live status updates from provider
- Cancel pending request
- Rate & review provider after completion

### Provider Side
- View all pending breakdown requests
- Accept a request (auto-notifies user)
- Send custom status updates to user
- Mark job as "Arrived" → "In Progress" → "Completed"
- Quick message templates
- View job history & statistics
- Toggle availability status

### Technical Features
- Session-based authentication (PHP sessions)
- Password hashing (bcrypt)
- Auto-polling every 7-8 seconds for real-time updates
- Responsive design (mobile friendly)
- Clean REST-like PHP API (POST/GET with action parameter)

---

## 🎨 Tech Stack
| Layer      | Technology           |
|-----------|---------------------|
| Frontend  | HTML5, CSS3, JS (ES6+) |
| Backend   | PHP 8.x             |
| Database  | MySQL 8.x           |
| Server    | Apache (XAMPP)      |
| Fonts     | Google Fonts (Syne + DM Sans) |

---

## 📝 Database Tables
1. **users** — Stores all users (user + provider roles on same account)
2. **requests** — Breakdown requests raised by users
3. **request_updates** — Provider status messages per request
4. **ratings** — User ratings for providers

---

## 🚀 How It Works (Flow)

```
User Registers/Logs in
        ↓
User raises a Breakdown Request (issue + location)
        ↓
All Providers can see the Pending Request
        ↓
Provider accepts → Request status: "accepted"
        ↓
User sees Provider info + Live Updates panel
        ↓
Provider sends updates (On the way / Arrived / Working...)
        ↓
Provider marks job "In Progress" → "Completed"
        ↓
User rates the Provider (1-5 stars + review)
```

---

*Developed as a BTech 2nd Year project demonstrating full-stack web development.*
