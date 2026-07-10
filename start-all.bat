@echo off
echo ========================================================
echo Starting Decentralized Identity ^& Passwordless System
echo ========================================================

echo 1. Starting Local Hardhat Blockchain Node...
start cmd /k "cd didpass\contracts && npx hardhat node"

:: Give the node a few seconds to start before deploying contracts and starting the backend
timeout /t 5 /nobreak >nul

echo 2. Starting Backend Server...
start cmd /k "cd didpass\backend && npm run dev"

echo 3. Starting DIDPass Dashboard Frontend (Port 3000)...
start cmd /k "cd didpass\frontend && npm run dev"

echo 4. Starting Job Portal Relying Party (Port 3001)...
start cmd /k "cd didpass\job-portal && npm run dev -- -p 3001"

echo ========================================================
echo All services are starting in separate windows!
echo Please wait a moment for the Next.js and Express servers to boot up.
echo - DIDPass Dashboard: http://localhost:3000
echo - Job Portal: http://localhost:3001
echo ========================================================
pause
