#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/src/backend"
FRONTEND_DIR="$SCRIPT_DIR/src/frontend"

REDIS_PID=""

cleanup() {
    echo "Stopping services..."
    if [ -n "$REDIS_PID" ] && kill -0 "$REDIS_PID" 2>/dev/null; then
        kill "$REDIS_PID" 2>/dev/null || true
    fi
    if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
        kill "$BACKEND_PID" 2>/dev/null || true
    fi
    if [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
        kill "$FRONTEND_PID" 2>/dev/null || true
    fi
    exit 0
}

trap cleanup SIGINT SIGTERM

echo "Starting Redis..."
if pgrep -x redis-server > /dev/null; then
    echo "Redis is already running"
    REDIS_PID=""
else
    redis-server --daemonize no &
    REDIS_PID=$!

    sleep 1

    if ! kill -0 "$REDIS_PID" 2>/dev/null; then
        echo "Failed to start Redis. Make sure redis-server is installed: sudo apt install redis-server"
        exit 1
    fi
    echo "Redis started (PID: $REDIS_PID)"
fi

echo "Starting Backend (FastAPI)..."
cd "$BACKEND_DIR"
source .venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
echo "Backend started (PID: $BACKEND_PID)"

echo "Starting Frontend (Solid.js)..."
cd "$FRONTEND_DIR"
npm run dev &
FRONTEND_PID=$!
echo "Frontend started (PID: $FRONTEND_PID)"

echo ""
echo "All services started:"
echo "  - Redis:     http://localhost:6379"
echo "  - Backend:   http://localhost:8000"
echo "  - Frontend:  http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all services"

wait
