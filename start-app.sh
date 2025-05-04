#!/bin/bash

# Display welcome message
echo "Starting MG Potdar Jewellers Management System..."

# Kill any existing process on port 5002
if command -v lsof > /dev/null; then
  PID=$(lsof -ti:5002)
  if [ ! -z "$PID" ]; then
    echo "Killing process on port 5002 (PID: $PID)"
    kill -9 $PID
  fi
fi

# Kill any existing process on port 3000
if command -v lsof > /dev/null; then
  PID=$(lsof -ti:3000)
  if [ ! -z "$PID" ]; then
    echo "Killing process on port 3000 (PID: $PID)"
    kill -9 $PID
  fi
fi

# Set environment variables
export PORT=5002
export REACT_APP_API_URL=http://localhost:5002

# Start the backend server in the background
echo "Starting backend server on port 5002..."
cd backend && npm run dev &
BACKEND_PID=$!

# Wait for backend to start
echo "Waiting for backend server to start..."
sleep 5

# Start the frontend
echo "Starting frontend on port 3000..."
cd ../frontend && npm start

# If the frontend is stopped, also stop the backend
kill $BACKEND_PID
echo "Application stopped." 