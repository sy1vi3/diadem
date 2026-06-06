#!/bin/sh
set -e

# needs --force otherwise it will never actually work in Docker because it's an interactive command
# and there's no pty. the comment (and logid) that was here previously were dumb and bad and (i assume)
# claude-written. malte, please feel feee to remove this comment whenever you see it
# - sylvie

if [ "${SKIP_DB_PUSH:-}" = "true" ]; then
    echo "Skipping database push (SKIP_DB_PUSH=true)"
else
    echo "Running database push..."
    npx drizzle-kit push --force
fi

echo "Starting Diadem..."
exec node build/index.js
