#!/bin/bash

# Kill any existing process on port 5002
if command -v lsof > /dev/null; then
  PID=$(lsof -ti:5002)
  if [ ! -z "$PID" ]; then
    echo "Killing process on port 5002 (PID: $PID)"
    kill -9 $PID
  else
    echo "No process found on port 5002"
  fi
fi

# Set environment variables
export PORT=5002
export NODE_ENV=development
export MONGODB_URI="mongodb://localhost:27017/mg-potdar-jewellers"

# Go to backend directory
cd backend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing backend dependencies..."
  npm install
fi

# Start the server in development mode
echo "Starting backend server on port 5002..."
echo "Using MongoDB URI: $(echo $MONGODB_URI | sed 's/\/\/[^:]*:[^@]*@/\/\/***:***@/')"
npm run dev

# Exit
exit 0 