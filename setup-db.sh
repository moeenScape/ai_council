#!/bin/bash

# AI Comparator Hub - Database Setup Script
# Sets up PostgreSQL database and Redis

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🗄️  AI Comparator Hub - Database Setup${NC}"
echo ""

# Default configuration
DB_NAME="${DB_NAME:-ai_comparator}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --db-name)
            DB_NAME="$2"
            shift 2
            ;;
        --db-user)
            DB_USER="$2"
            shift 2
            ;;
        --db-password)
            DB_PASSWORD="$2"
            shift 2
            ;;
        --db-host)
            DB_HOST="$2"
            shift 2
            ;;
        --db-port)
            DB_PORT="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --db-name      Database name (default: ai_comparator)"
            echo "  --db-user      Database user (default: postgres)"
            echo "  --db-password  Database password (default: postgres)"
            echo "  --db-host      Database host (default: localhost)"
            echo "  --db-port      Database port (default: 5432)"
            echo "  --help         Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}Configuration:${NC}"
echo "  Database: $DB_NAME"
echo "  User:     $DB_USER"
echo "  Host:     $DB_HOST:$DB_PORT"
echo ""

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}Error: PostgreSQL (psql) is not installed${NC}"
    echo "Please install PostgreSQL first:"
    echo "  Ubuntu/Debian: sudo apt install postgresql postgresql-contrib"
    echo "  macOS:         brew install postgresql"
    echo "  Arch:          sudo pacman -S postgresql"
    exit 1
fi

# Check if Redis is installed
if ! command -v redis-cli &> /dev/null; then
    echo -e "${YELLOW}Warning: Redis is not installed${NC}"
    echo "Redis is required for rate limiting and caching."
    echo "Install Redis:"
    echo "  Ubuntu/Debian: sudo apt install redis-server"
    echo "  macOS:         brew install redis"
    echo "  Arch:          sudo pacman -S redis"
    echo ""
fi

# Check if schema file exists
SCHEMA_FILE="backend/src/db/schema.sql"
if [ ! -f "$SCHEMA_FILE" ]; then
    echo -e "${RED}Error: Schema file not found at $SCHEMA_FILE${NC}"
    exit 1
fi

echo -e "${GREEN}Step 1: Creating database...${NC}"

# Create database if it doesn't exist
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "CREATE DATABASE $DB_NAME"

echo -e "${GREEN}✓ Database '$DB_NAME' ready${NC}"

echo -e "${GREEN}Step 2: Running schema migrations...${NC}"

# Run schema
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$SCHEMA_FILE"

echo -e "${GREEN}✓ Schema applied successfully${NC}"

echo -e "${GREEN}Step 3: Verifying tables...${NC}"

# Verify tables were created
TABLES=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -tc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'")
echo -e "  Found ${TABLES// /} tables in database"

# List tables
echo -e "${BLUE}Tables created:${NC}"
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "\dt"

echo ""
echo -e "${GREEN}Step 4: Testing Redis connection...${NC}"

if command -v redis-cli &> /dev/null; then
    if redis-cli ping > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Redis is running${NC}"
    else
        echo -e "${YELLOW}⚠ Redis is installed but not running${NC}"
        echo "  Start Redis with: redis-server"
    fi
else
    echo -e "${YELLOW}⚠ Redis not installed - skipping${NC}"
fi

echo ""
echo -e "${GREEN}Step 5: Updating .env file...${NC}"

# Create or update .env file
ENV_FILE="backend/.env"
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"

if [ -f "$ENV_FILE" ]; then
    # Update existing DATABASE_URL
    if grep -q "^DATABASE_URL=" "$ENV_FILE"; then
        sed -i "s|^DATABASE_URL=.*|DATABASE_URL=$DATABASE_URL|" "$ENV_FILE"
    else
        echo "DATABASE_URL=$DATABASE_URL" >> "$ENV_FILE"
    fi
    echo -e "${GREEN}✓ Updated $ENV_FILE${NC}"
else
    # Create new .env from example
    if [ -f "backend/.env.example" ]; then
        cp backend/.env.example "$ENV_FILE"
        sed -i "s|^DATABASE_URL=.*|DATABASE_URL=$DATABASE_URL|" "$ENV_FILE"
        echo -e "${GREEN}✓ Created $ENV_FILE from .env.example${NC}"
    else
        echo "DATABASE_URL=$DATABASE_URL" > "$ENV_FILE"
        echo "REDIS_URL=redis://localhost:6379" >> "$ENV_FILE"
        echo "JWT_SECRET=your-secret-key-change-in-production" >> "$ENV_FILE"
        echo -e "${GREEN}✓ Created $ENV_FILE${NC}"
    fi
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Database setup complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Connection string:"
echo -e "  ${BLUE}$DATABASE_URL${NC}"
echo ""
echo -e "Next steps:"
echo -e "  1. Update ${YELLOW}backend/.env${NC} with your API keys:"
echo -e "     - OPENAI_API_KEY"
echo -e "     - ANTHROPIC_API_KEY"
echo -e "     - XAI_API_KEY"
echo -e "  2. Start Redis: ${YELLOW}redis-server${NC}"
echo -e "  3. Run the app: ${YELLOW}./start.sh${NC}"
echo ""
