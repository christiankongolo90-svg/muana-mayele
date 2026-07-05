# Muana Mayele Quiz - Backend API

PHP + MySQL backend for the Muana Mayele Quiz application.

## Requirements

- PHP 7.4 or higher
- MySQL 5.7 or higher
- Apache or Nginx web server

## Setup

### 1. Database Setup

Import the database schema:

```bash
mysql -u root -p < database.sql
```

Or run the SQL file in your MySQL client (phpMyAdmin, MySQL Workbench, etc.)

### 2. Configuration

Copy the environment example file:

```bash
cp .env.example .env
```

Edit `.env` with your database credentials:

```env
DB_HOST=localhost
DB_NAME=muana_mayele
DB_USER=root
DB_PASSWORD=your_password
ALLOWED_ORIGINS=http://localhost:4200
```

### 3. Running the API

#### Option A: PHP Built-in Server (Development)

```bash
cd backend
php -S localhost:8000
```

The API will be available at `http://localhost:8000`

#### Option B: Apache/Nginx (Production)

Point your web server to the `backend` directory and ensure:
- `mod_rewrite` is enabled (Apache)
- PHP is configured correctly

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/register` | Register a new user or login with phone |

**Request Body:**
```json
{
  "full_name": "John Doe",
  "phone": "+243123456789",
  "email": "john@example.com",
  "profession": "Developer",
  "neighborhood": "Gombe"
}
```

### Quiz

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/questions` | Get random quiz questions |
| POST | `/api/quiz/start` | Start a new quiz session |
| POST | `/api/quiz/answer` | Submit an answer |
| POST | `/api/quiz/complete` | Complete the quiz |
| GET | `/api/quiz/results?session_id=X` | Get quiz results |

**Start Quiz Request:**
```json
{
  "user_id": 1
}
```

**Submit Answer Request:**
```json
{
  "session_id": 1,
  "question_id": 5,
  "selected_answer": 2
}
```

### Leaderboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/leaderboard?limit=10` | Get top players |

## Response Format

All responses follow this format:

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message"
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message"
}
```

## File Structure

```
backend/
├── api/
│   ├── register.php       # User registration
│   ├── questions.php      # Get questions
│   ├── leaderboard.php    # Leaderboard
│   └── quiz/
│       ├── start.php      # Start quiz session
│       ├── answer.php     # Submit answer
│       ├── complete.php   # Complete quiz
│       └── results.php    # Get results
├── config/
│   ├── config.php         # App configuration
│   └── database.php       # Database connection
├── models/
│   ├── User.php           # User model
│   ├── Question.php       # Question model
│   └── QuizSession.php    # Quiz session model
├── utils/
│   └── cors.php           # CORS and helpers
├── .env.example           # Environment template
├── .htaccess              # Apache rewrite rules
├── database.sql           # Database schema
├── index.php              # Main router
└── README.md              # This file
```

## Security Notes

- All inputs are sanitized and validated
- Prepared statements prevent SQL injection
- CORS is configured for allowed origins
- Sensitive files (.env) are protected via .htaccess

## License

MIT
