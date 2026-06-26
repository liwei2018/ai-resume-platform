@echo off
cd /d "D:\work\ai-resume-platform"
if exist ".next" rmdir /s /q ".next"
echo Starting build...
npm run build
echo Build exit code: %errorlevel%