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

### AI Healthcare Assistant (Aura)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | /api/chat | Chat with Aura AI (supports Gemini/Groq, safe context, rate-limited) |
| GET    | /api/chat/status | Health check for AI provider status & model |

## Environment Variables
Create a `.env` file in the `backend/` directory (see `.env.example`):
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/doctor-booking
JWT_SECRET=your_jwt_secret_key

# Email
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# AI Healthcare Assistant
AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash

# Optional Groq fallback
GROQ_API_KEY=your_groq_key_here
GROQ_MODEL=llama-3.1-8b-instant
```

## Render Deployment Instructions
1. In your Render Dashboard, select **New Web Service** and connect this repository.
2. Set Root Directory to `backend`.
3. Build Command: `npm install`
4. Start Command: `node server.js`
5. In **Environment Variables**, add:
   - `PORT`: `5000` (or leave default Render port)
   - `MONGO_URI`: Your MongoDB Atlas URI
   - `JWT_SECRET`: A secure random string
   - `AI_PROVIDER`: `gemini`
   - `GEMINI_API_KEY`: Your Google Gemini API key from https://aistudio.google.com/
   - `GEMINI_MODEL`: `gemini-1.5-flash`
6. Deploy! The frontend will automatically route requests to `https://<your-render-app>.onrender.com/api`.
