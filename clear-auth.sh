#!/bin/bash

# Script to clear authentication state and restart dev server

echo "🧹 Clearing authentication state..."

# Kill any running Next.js dev servers
echo "Stopping dev server..."
pkill -f "next dev" 2>/dev/null || true

echo "✅ Dev server stopped"
echo ""
echo "📝 Next steps:"
echo "1. Clear your browser cookies for localhost:3000"
echo "   - Chrome: DevTools → Application → Cookies → http://localhost:3000 → Delete all"
echo "   - Firefox: DevTools → Storage → Cookies → Delete all"
echo ""
echo "2. Start the dev server:"
echo "   npm run dev"
echo ""
echo "3. Try visiting: http://localhost:3000"
echo "4. Click the login button"
echo ""
