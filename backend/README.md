# Doctor Booking – Backend API

Node.js + Express + MongoDB backend for the Doctor Booking App.

## Requirements
- Node.js v18+
- MongoDB (local or Atlas)

## Setup

### 1. Install MongoDB
Download from: https://www.mongodb.com/try/download/community
Or use MongoDB Atlas (free cloud): https://www.mongodb.com/atlas

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment
Edit `.env` file:
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/doctor-booking
JWT_SECRET=your_secret_key_here
```

For MongoDB Atlas, replace MONGO_URI with your Atlas connection string:
```
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/doctor-booking
```

### 4. Seed the database (import doctors from JSON)
```bash
node seed.js
```
This will:
- Import all 9 doctors from doctors.json into MongoDB
- Create an admin account: admin@wellnessforever.in / admin123

### 5. Start the server
```bash
# Development (auto-restart)
npm run dev

# Production
npm start
```

Server runs at: http://localhost:5000

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register patient |
| POST | /api/auth/login | Login |
| GET  | /api/auth/me | Get current user |

### Doctors
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | /api/doctors | Get all doctors |
| GET    | /api/doctors/:id | Get one doctor |
| POST   | /api/doctors | Add doctor (admin) |
| PUT    | /api/doctors/:id | Update doctor |
| DELETE | /api/doctors/:id | Delete doctor (admin) |

### Appointments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | /api/appointments | Book appointment |
| GET    | /api/appointments/my | My appointments |
| GET    | /api/appointments/doctor/:id | Doctor's appointments |
| PATCH  | /api/appointments/:id/status | Update status |
| PATCH  | /api/appointments/:id/rate | Rate appointment |
| DELETE | /api/appointments/:id | Delete appointment |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | /api/admin/stats | Dashboard stats |
| GET    | /api/admin/appointments | All appointments |
| DELETE | /api/admin/appointments/all | Clear all |
| GET    | /api/admin/patients | All patients |
