#!/bin/bash

# HAL Setup Script
# Run this script to set up HAL for the first time

set -e  # Exit on error

echo "🤖 HAL Setup Script"
echo "===================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "ecosystem.config.js" ]; then
    echo -e "${RED}Error: Must run from HAL root directory${NC}"
    exit 1
fi

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

command -v node >/dev/null 2>&1 || { echo -e "${RED}Node.js is required but not installed${NC}"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo -e "${RED}npm is required but not installed${NC}"; exit 1; }
command -v psql >/dev/null 2>&1 || { echo -e "${RED}PostgreSQL is required but not installed${NC}"; exit 1; }
command -v redis-cli >/dev/null 2>&1 || { echo -e "${RED}Redis is required but not installed${NC}"; exit 1; }

echo -e "${GREEN}✓ All prerequisites met${NC}"
echo ""

# Create logs directory
echo -e "${YELLOW}Creating logs directory...${NC}"
mkdir -p logs
echo -e "${GREEN}✓ Logs directory created${NC}"
echo ""

# Install dependencies
echo -e "${YELLOW}Installing Node.js dependencies...${NC}"
cd server
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Check for .env file
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating .env file from template...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✓ .env file created${NC}"
    echo -e "${RED}⚠ IMPORTANT: Edit server/.env and update:${NC}"
    echo "  - DATABASE_URL (change password)"
    echo "  - JWT_SECRET (generate random string)"
    echo "  - SESSION_SECRET (generate random string)"
    echo ""
    read -p "Press enter when you've updated .env file..."
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi
echo ""

# Database setup prompt
echo -e "${YELLOW}Database setup${NC}"
echo "Have you run the database/init.sql script? (y/n)"
read -r response
if [[ ! "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo ""
    echo -e "${YELLOW}Run these commands first:${NC}"
    echo "  sudo -u postgres psql"
    echo "  \\i $(pwd)/../database/init.sql"
    echo "  \\q"
    echo ""
    exit 1
fi

# Push Prisma schema
echo -e "${YELLOW}Pushing database schema...${NC}"
npx prisma db push
echo -e "${GREEN}✓ Database schema created${NC}"
echo ""

# Test Ollama connection
echo -e "${YELLOW}Testing Ollama connection...${NC}"
if curl -s http://localhost:11434/api/tags > /dev/null; then
    echo -e "${GREEN}✓ Ollama is running${NC}"
else
    echo -e "${RED}⚠ Warning: Ollama doesn't appear to be running${NC}"
    echo "Start it with: systemctl start ollama"
fi
echo ""

# Test Redis connection
echo -e "${YELLOW}Testing Redis connection...${NC}"
if redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Redis is running${NC}"
else
    echo -e "${RED}⚠ Warning: Redis doesn't appear to be running${NC}"
    echo "Start it with: sudo systemctl start redis"
fi
echo ""

# PM2 setup
if command -v pm2 >/dev/null 2>&1; then
    echo -e "${YELLOW}Setting up PM2...${NC}"
    cd ..
    pm2 start ecosystem.config.js
    pm2 save
    echo -e "${GREEN}✓ HAL started with PM2${NC}"
    echo ""
    echo -e "${GREEN}View logs:${NC} pm2 logs hal"
    echo -e "${GREEN}Restart:${NC} pm2 restart hal"
    echo -e "${GREEN}Stop:${NC} pm2 stop hal"
else
    echo -e "${YELLOW}PM2 not installed. Starting in development mode...${NC}"
    npm run dev
fi
echo ""

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}HAL setup complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "🌐 Local: http://localhost:3000"
echo "🔒 SSL: https://mini-claude.pcowens.com"
echo ""
echo "Next steps:"
echo "1. Visit the website and create your parent account"
echo "2. Add family members"
echo "3. Start chatting!"
echo ""
echo "Need help? Check README.md for documentation"
