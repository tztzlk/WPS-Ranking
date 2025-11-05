#!/bin/bash

# WPS Ranking Setup Script
echo "🚀 Setting up WPS Ranking Platform..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are installed"

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
cd ..

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

echo "✅ All dependencies installed successfully!"

# Create environment file for backend
if [ ! -f "backend/.env" ]; then
    echo "📝 Creating backend environment file..."
    cp backend/env.example backend/.env
    echo "⚠️  Please edit backend/.env with your configuration"
fi

echo ""
echo "🎉 Setup complete! To start the development servers:"
echo "   npm run dev"
echo ""
echo "📚 Documentation:"
echo "   - Backend API: ./backend/README.md"
echo "   - Frontend App: ./frontend/README.md"
echo ""
echo "🌐 URLs:"
echo "   - Frontend: http://localhost:3000"
echo "   - Backend API: http://localhost:5000"
