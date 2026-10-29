# 🏥 NeuroCare AI - Healthcare Booking System

A modern, AI-powered doctor appointment booking platform with intelligent chatbot assistance powered by Google Gemini AI.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/node-%3E%3D%2014.0.0-brightgreen)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green)

## ✨ Features

### 🤖 AI-Powered Healthcare Assistant
- **Gemini AI Integration**: Intelligent chatbot for healthcare guidance
- **Real-time Doctor Information**: Access to live doctor database
- **Emergency Detection**: Automatic identification of urgent medical situations
- **24/7 Availability**: Always-on healthcare support

### 👥 User Management
- **Multi-role System**: Patients, Doctors, and Administrators
- **Secure Authentication**: JWT-based authentication with bcrypt password hashing
- **Profile Management**: Complete user profile customization

### 📅 Appointment System
- **Easy Booking**: Simple and intuitive appointment booking process
- **Doctor Search**: Filter by specialty, location, and availability
- **Appointment Management**: View, reschedule, and cancel appointments
- **Real-time Availability**: Up-to-date doctor schedules

### 👨‍⚕️ Doctor Dashboard
- **Appointment Overview**: Complete view of all appointments
- **Patient Management**: Access patient history and medical records
- **Schedule Management**: Set availability and time slots
- **Prescription Management**: Create and manage prescriptions digitally

### 🔐 Admin Panel
- **User Management**: Full control over users and doctors
- **Analytics Dashboard**: Insights into bookings and platform usage
- **Doctor Verification**: Approve and manage doctor registrations
- **System Monitoring**: Track platform health and performance

### 🎨 Modern UI/UX
- **Responsive Design**: Works seamlessly on all devices
- **Animated Landing Page**: Beautiful splash screen with Caduceus animation
- **Specialty Cards**: Visual representation of medical specialties
- **Dark Mode Support**: Eye-friendly interface options

## 🚀 Tech Stack

### Frontend
- **HTML5, CSS3, JavaScript**: Core web technologies
- **Responsive Design**: Mobile-first approach
- **Custom Animations**: Smooth transitions and effects
- **Modern UI Components**: Interactive cards and modals

### Backend
- **Node.js**: Runtime environment
- **Express.js**: Web application framework
- **MongoDB Atlas**: Cloud database
- **JWT**: Secure authentication tokens
- **bcryptjs**: Password hashing

### AI & APIs
- **Google Gemini AI**: Natural language processing
- **REST API**: RESTful architecture
- **Real-time Updates**: Live data synchronization

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v14.0.0 or higher)
- **npm** (comes with Node.js)
- **MongoDB Atlas Account** (free tier available)
- **Google Gemini API Key** (free tier available)

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone https://github.com/pathananas2007/neurocare-ai.git
cd neurocare-ai
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file from example
copy .env.example .env  # Windows
# or
cp .env.example .env    # macOS/Linux
```

### 3. Configure Environment Variables

Edit `backend/.env` with your credentials:

```env
PORT=5000

# MongoDB Atlas Connection String
MONGO_URI=your_mongodb_atlas_connection_string

# JWT Secret (generate a random string)
JWT_SECRET=your_super_secure_jwt_secret_key

# Email Configuration (Optional - for notifications)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password

# Google Gemini AI Configuration
AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash
```

### 4. Get Your API Keys

#### MongoDB Atlas:
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free account and cluster
3. Click "Connect" → "Connect your application"
4. Copy the connection string and replace `<password>` with your database password

#### Google Gemini API:
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key (free tier available)
3. Copy the API key to your `.env` file

### 5. Start the Application

#### Start Backend Server:
```bash
cd backend
npm start
```

The backend will run on `http://localhost:5000`

#### Start Frontend:
```bash
# Open a new terminal
cd doctor-booking

# Using Python (if installed)
python -m http.server 8080

# Or using Node.js http-server
npx http-server -p 8080
```

The frontend will run on `http://localhost:8080`

## 🌐 Usage

### Access the Application

Open your browser and navigate to:
```
http://localhost:8080
```

### Available Pages

| Page | URL | Description |
|------|-----|-------------|
| 🏠 Home | `/index.html` | Landing page with specialties |
| 👤 Patient Login | `/login-patient.html` | Patient authentication |
| 👨‍⚕️ Doctor Login | `/login-doctor.html` | Doctor authentication |
| 🔐 Admin Login | `/login-admin.html` | Administrator access |
| 📅 Book Appointment | `/book.html` | Search and book doctors |
| 📋 Appointments | `/appointments.html` | View your appointments |
| 🩺 Doctor Dashboard | `/doctor-dashboard.html` | Doctor's control panel |
| ⚙️ Admin Panel | `/admin.html` | Admin management |

### Default Credentials

After running the seed script, you can login with:

**Admin:**
- Email: `admin@wellness.com`
- Password: `admin123`

**Doctor:**
- Email: `dr.smith@wellness.com`
- Password: `doctor123`

**Patient:**
- Email: `patient@test.com`
- Password: `patient123`

## 🤖 AI Chatbot Usage

The AI chatbot is available on all pages. Click the chat icon (💬) in the bottom-right corner to:

- Find doctors by specialty
- Get booking assistance
- Learn about available services
- Ask healthcare-related questions
- Get emergency guidance

### Example Queries:
- "Help me find a cardiologist"
- "How do I book an appointment?"
- "What specialties are available?"
- "I need urgent care advice"

## 📁 Project Structure

```
neurocare-ai/
├── backend/
│   ├── models/              # MongoDB schemas
│   │   ├── User.js
│   │   ├── Doctor.js
│   │   ├── Appointment.js
│   │   ├── Prescription.js
│   │   └── MedicalHistory.js
│   ├── routes/              # API routes
│   │   ├── auth.js
│   │   ├── doctors.js
│   │   ├── appointments.js
│   │   ├── chat.js
│   │   └── admin.js
│   ├── services/            # Business logic
│   │   └── aiService.js
│   ├── middleware/          # Custom middleware
│   │   └── auth.js
│   ├── utils/               # Utility functions
│   │   └── mailer.js
│   ├── .env.example         # Environment template
│   ├── server.js            # Main server file
│   ├── seed.js              # Database seeder
│   └── package.json
│
├── doctor-booking/
│   ├── css/                 # Stylesheets
│   │   ├── style.css
│   │   ├── chatbot.css
│   │   └── landing-redesign.css
│   ├── js/                  # JavaScript files
│   │   ├── api.js
│   │   ├── auth.js
│   │   ├── chatbot.js
│   │   ├── doctor.js
│   │   ├── admin.js
│   │   └── landing.js
│   ├── images/              # Assets
│   │   ├── specialties/
│   │   └── caduceus-logo.png
│   ├── index.html           # Landing page
│   ├── login-patient.html
│   ├── book.html
│   └── [other HTML files]
│
├── .gitignore
└── README.md
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Doctors
- `GET /api/doctors` - Get all doctors
- `GET /api/doctors/:id` - Get doctor by ID
- `GET /api/doctors/specialty/:specialty` - Get doctors by specialty

### Appointments
- `POST /api/appointments` - Create appointment
- `GET /api/appointments/user/:userId` - Get user appointments
- `GET /api/appointments/doctor/:doctorId` - Get doctor appointments
- `PUT /api/appointments/:id` - Update appointment
- `DELETE /api/appointments/:id` - Cancel appointment

### AI Chatbot
- `POST /api/chat` - Send message to AI assistant
- `GET /api/chat/status` - Check chatbot status

### Admin
- `GET /api/admin/users` - Get all users
- `GET /api/admin/stats` - Get platform statistics
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user

## 🔒 Security Features

- ✅ JWT Authentication
- ✅ Password Hashing (bcrypt)
- ✅ Environment Variables Protection
- ✅ Rate Limiting on Chat API
- ✅ CORS Configuration
- ✅ Input Validation
- ✅ XSS Protection
- ✅ Emergency Keyword Detection

## 🚀 Deployment

### Deploy to Heroku

```bash
# Install Heroku CLI
# Login to Heroku
heroku login

# Create new app
heroku create your-app-name

# Set environment variables
heroku config:set MONGO_URI=your_mongodb_uri
heroku config:set JWT_SECRET=your_jwt_secret
heroku config:set GEMINI_API_KEY=your_gemini_key

# Deploy
git push heroku main
```

### Deploy to Vercel (Frontend)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd doctor-booking
vercel
```

### Deploy to Render (Backend)

1. Connect your GitHub repository
2. Create a new Web Service
3. Set environment variables in Render dashboard
4. Deploy automatically on push

## 🧪 Testing

```bash
# Run backend tests (if configured)
cd backend
npm test

# Test chatbot endpoint
node testChatbot.js
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Your Name**
- GitHub: [@pathananas2007](https://github.com/pathananas2007)
- Repository: [neurocare-ai](https://github.com/pathananas2007/neurocare-ai)

## 🙏 Acknowledgments

- Google Gemini AI for intelligent chatbot capabilities
- MongoDB Atlas for cloud database hosting
- Express.js community for excellent documentation
- All contributors who help improve this project

## 📞 Support

For support, please:
- Open an issue in the GitHub repository
- Contact: [your-email@example.com]

## 🗺️ Roadmap

- [ ] Add video consultation feature
- [ ] Implement prescription OCR
- [ ] Add health tracking dashboard
- [ ] Multi-language support
- [ ] Mobile app (React Native)
- [ ] Payment gateway integration
- [ ] Advanced analytics for doctors
- [ ] SMS notifications
- [ ] Telemedicine integration

## ⚠️ Disclaimer

This is a demo/educational project. For production use in healthcare:
- Ensure HIPAA compliance (if in the US)
- Implement proper data encryption
- Get proper medical certifications
- Consult with healthcare legal experts
- Implement comprehensive audit logging

---

Made with ❤️ for better healthcare accessibility

**Star ⭐ this repository if you find it helpful!**
