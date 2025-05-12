@echo off
echo Starting the application...

:: Start the backend server with virtual environment
start cmd /k "cd backend && .\venv\Scripts\activate && python app.py"

:: Start the frontend server
start cmd /k "cd frontend && npm run dev"

echo Both servers are starting. You should be able to access:
echo - Frontend: http://localhost:3000
echo - Backend: http://localhost:5000
