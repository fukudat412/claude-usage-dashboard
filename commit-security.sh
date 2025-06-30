#!/bin/bash

# Stage all changes
git add -A

# Show status
echo "Git Status:"
git status

echo ""
echo "Staged changes:"
git diff --staged --name-only

# Commit with detailed message
git commit -m "Implement comprehensive security headers and middleware

- Add Helmet.js for security headers (CSP, HSTS, XSS protection)
- Implement rate limiting (1000 requests per 15 minutes)  
- Enhance CORS configuration with origin restrictions
- Add security middleware module for modular organization
- Configure Content Security Policy for WebSocket compatibility
- Update documentation with security features

Security improvements include:
- XSS filtering and clickjacking prevention
- MIME type sniffing protection
- Strict transport security (HSTS)
- Comprehensive CSP directives
- Rate limiting with custom headers

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

echo ""
echo "Commit completed successfully!"