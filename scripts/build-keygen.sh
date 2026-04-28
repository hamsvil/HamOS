#!/bin/bash
echo "Building Keygen Project..."
cd src/Keygen
npx -y pnpm@latest install --no-frozen-lockfile
export PORT=3000
export BASE_PATH="/"
npx -y pnpm@latest run build
echo "Keygen Build Complete!"
