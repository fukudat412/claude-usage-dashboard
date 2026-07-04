# Claude Usage Dashboard

A web service for visualizing Claude Code usage data from local PC. This application reads Claude Code data locally and provides insights into usage patterns.

## Project Overview

### Architecture
- **Backend**: Node.js + Express (Modular architecture with services, routes, middleware)
- **Frontend**: React (Component-based with custom hooks)
- **Container**: Docker (Multi-stage build with Alpine Linux)
- **Data Sources**: Local Claude Code files (MCP logs, todos, VS Code extension data)

### Project Structure
```
claude-usage-dashboard/
├── package.json           # Unified package.json (Flat structure)
├── server.js             # Express server entry point
├── src/
│   ├── components/        # React components (TypeScript)
│   │   ├── Dashboard.tsx
│   │   ├── DataTable.tsx
│   │   ├── LogViewer.tsx
│   │   ├── SummaryCard.tsx
│   │   ├── UsageChart.tsx
│   │   ├── FilterPanel.tsx
│   │   ├── HourlyAnalysis.tsx
│   │   ├── DailyHourlyDetail.tsx
│   │   ├── McpToolUsage.tsx
│   │   └── charts/
│   │       └── InteractiveChart.tsx
│   ├── hooks/            # Custom hooks
│   │   ├── useUsageData.ts
│   │   └── useChartData.ts
│   ├── utils/            # Common utilities
│   │   └── formatters.ts
│   ├── routes/           # Express routes
│   │   └── api/          # API v2: summary, daily, monthly, hourly, mcp, projects, logs, models
│   ├── services/         # Business logic
│   │   ├── mcpService.js
│   │   ├── todoService.js
│   │   ├── vscodeService.js
│   │   ├── projectService.js
│   │   ├── pricingService.js
│   │   ├── cacheService.js
│   │   └── rustProcessor.js
│   ├── middleware/       # Express middleware
│   │   ├── errorHandler.js
│   │   └── security.js
│   ├── config/          # Configuration
│   │   └── paths.js
│   ├── App.tsx           # Main React component
│   └── index.tsx         # React entry point
├── public/              # React public files
├── build/               # React build output
├── docs/                # Project documentation
├── Dockerfile           # Production Docker config
├── Dockerfile.dev       # Development Docker config
└── docker-compose.yml   # Docker Compose config
```

## Development Setup

### Prerequisites
- Node.js 18+
- Docker (optional but recommended)
- npm

### Local Development
```bash
# Install dependencies
npm install

# Development mode (full: server + client auto-reload)
npm run dev

# Development mode (server only)
npm run dev:server

# Build production
npm run build

# Production mode
npm start
```

### Docker Development
```bash
# Production build and run
docker build -t claude-usage-dashboard .
docker run -d --name claude-dashboard \
  -p 30001:30001 \
  -v ~/.claude:/home/nodejs/.claude:ro \
  -v ~/Library/Caches/claude-cli-nodejs:/home/nodejs/Library/Caches/claude-cli-nodejs:ro \
  -v "$HOME/Library/Application Support/Code:/home/nodejs/Library/Application Support/Code:ro" \
  claude-usage-dashboard

# Development with Docker Compose
docker-compose --profile dev up -d

# Stop services
docker-compose down
```

## Data Sources

The application reads data from these Claude Code locations:
- **MCP Logs**: `~/Library/Caches/claude-cli-nodejs/*/mcp-logs-ide/`
- **Todo History**: `~/.claude/todos/`
- **VS Code Extension**: `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/tasks/`

## Key Components

### Backend Services
- **mcpService.js**: Processes MCP session logs
- **todoService.js**: Handles todo file management data
- **vscodeService.js**: Processes VS Code extension task data
- **projectService.js**: Aggregates usage data by project/date/model
- **pricingService.js**: Calculates costs based on Claude pricing
- **cacheService.js**: In-memory caching for performance

### Frontend Components
- **Dashboard.tsx**: Main overview with summary cards and charts
- **DataTable.tsx**: Reusable table component with sorting/formatting
- **LogViewer.tsx**: Modal for viewing log file contents
- **UsageChart.tsx**: Recharts-based visualization
- **useUsageData.ts**: Custom hook for data fetching

### Security Features
- Path traversal prevention in log content endpoint
- Input validation and sanitization
- Non-root Docker user execution
- Read-only volume mounts
- CORS configuration

## API Endpoints

- `GET /api/v2/summary` - Usage summary
- `GET /api/v2/daily`, `/api/v2/monthly`, `/api/v2/hourly` - Aggregations by period
- `GET /api/v2/projects`, `/api/v2/models` - Aggregations by project / model
- `GET /api/v2/mcp` - MCP session data
- `GET /api/v2/logs` - Log listing and content (secure)

## Build & Deployment

### Docker Specifications
- **Base Image**: Node.js 18 Alpine Linux
- **Security**: Non-root user (nodejs:1001)
- **Port**: 30001 (React dev server: 30000)
- **Health Check**: `/api/health` endpoint (note: not implemented in the API — the container healthcheck currently always fails)
- **Signal Handling**: dumb-init for proper process management

### Volume Mounts
```bash
# Required volume mounts for data access
-v ~/.claude:/home/nodejs/.claude:ro
-v ~/Library/Caches/claude-cli-nodejs:/home/nodejs/Library/Caches/claude-cli-nodejs:ro
-v "$HOME/Library/Application Support/Code:/home/nodejs/Library/Application Support/Code:ro"
```

## Development Guidelines

### Coding Standards
- Use modern JavaScript (ES6+)
- Follow React functional component patterns
- Implement proper error handling with custom error classes
- Use meaningful variable and function names
- Maintain consistent code formatting

### CSS Architecture
- Use BEM-like naming convention
- Responsive design with mobile-first approach
- CSS custom properties for theming
- Component-scoped styles

### Performance Considerations
- Implement caching for expensive data operations
- Use React.memo for component optimization
- Lazy loading for large datasets
- Efficient data processing in services

## Testing

### Current Test Coverage
- Basic functionality tests needed
- Integration tests for API endpoints
- Component tests for React components

### Testing Commands
```bash
# Run tests
npm test

# Test coverage
npm run test:coverage
```

## Common Development Tasks

### Adding New Data Source
1. Create service file in `src/services/`
2. Implement data processing logic
3. Add route in `src/routes/usage.js`
4. Update frontend components as needed

### Modifying UI Components
1. Update component in `src/components/`
2. Update corresponding CSS in `src/App.css`
3. Test responsive design
4. Rebuild Docker image if needed

### Performance Optimization
1. Check caching implementation in services
2. Optimize data processing algorithms
3. Consider pagination for large datasets
4. Monitor memory usage

## Troubleshooting

### Common Issues
1. **CSS not updating in Docker**: Rebuild image after CSS changes
2. **Volume mount issues**: Ensure correct path escaping for spaces
3. **Permission errors**: Check file permissions on mounted volumes
4. **Port conflicts**: Ensure ports 30000 (React dev) and 30001 (Express) are available

### Debug Commands
```bash
# Check container logs
docker logs claude-dashboard

# Check container health
docker exec claude-dashboard ls -la /app/

# Test API directly
curl http://localhost:30001/api/v2/summary
```

## Security Notes

- Application only reads local data, no external network access
- Data is not stored or transmitted outside local environment
- All file access is read-only
- Path validation prevents directory traversal

## Performance Notes

- In-memory caching reduces file I/O
- Data is processed once and cached
- Efficient sorting and filtering algorithms
- Responsive design minimizes data transfer

---

**Access the dashboard**: http://localhost:30001 (production) / http://localhost:30000 (development frontend)

For detailed improvement suggestions, see `docs/improvement-suggestions.md`