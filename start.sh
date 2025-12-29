#!/bin/bash

# AI Comparator Hub - Start Script
# Runs both backend and frontend concurrently

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting AI Comparator Hub${NC}"
echo ""

# Check if required directories exist
if [ ! -d "backend" ]; then
    echo -e "${RED}Error: backend directory not found${NC}"
    exit 1
fi

if [ ! -d "ai-comparator-hub" ]; then
    echo -e "${RED}Error: ai-comparator-hub (frontend) directory not found${NC}"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "backend/node_modules" ]; then
    echo -e "${YELLOW}Installing backend dependencies...${NC}"
    npm install --prefix backend
fi

if [ ! -d "ai-comparator-hub/node_modules" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    npm install --prefix ai-comparator-hub
fi

# Check for .env file in backend
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}Warning: backend/.env not found. Copying from .env.example${NC}"
    if [ -f "backend/.env.example" ]; then
        cp backend/.env.example backend/.env
        echo -e "${YELLOW}Please update backend/.env with your actual configuration${NC}"
    fi
fi

echo ""
echo -e "${GREEN}Starting services...${NC}"
echo -e "  Backend:  http://localhost:3001"
echo -e "  Frontend: http://localhost:5173"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop both services${NC}"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down services...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start backend
echo -e "${GREEN}[Backend]${NC} Starting..."
npm run dev --prefix backend &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 2

# Start frontend
echo -e "${GREEN}[Frontend]${NC} Starting..."
npm run dev --prefix ai-comparator-hub &
FRONTEND_PID=$!

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
