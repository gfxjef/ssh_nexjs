# SSH NextJS Project

Full stack application with Next.js frontend and Python Flask backend with Kafka integration.

## Project Structure

```
/
├── frontend/              # Next.js frontend application
│   ├── app/               # App Router structure
│   │   ├── login/         # Login page
│   │   ├── dashboard/     # Dashboard structure with sidebar, header, and content
│   │   └── ...
│   └── ...
├── backend/               # Flask backend application
│   ├── app.py             # Main Flask application
│   ├── kafka_client.py    # Kafka producer/consumer
│   └── requirements.txt   # Python dependencies
└── ...
```

## Key Features

- User authentication with JWT tokens
- Modern dashboard with responsive sidebar navigation
- Nested menu structure for complex navigation
- Tailwind CSS for styling
- Python Flask backend with SQLite database
- Kafka integration for message processing

## Getting Started

1. Run `setup.bat` to set up the environment and install dependencies
2. Run `start.bat` to start both frontend and backend servers
3. Access the application at http://localhost:3000

## Default User

For testing purposes, a default user is created in the database:
- Username: admin
- Password: password123
