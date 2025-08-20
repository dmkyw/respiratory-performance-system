@echo off
echo Starting build process...

REM Remove existing dist directory
if exist "dist" (
    echo Removing existing dist directory...
    rmdir /s /q "dist"
)

REM Create dist directory
echo Creating dist directory...
mkdir "dist"

REM Copy directories
echo Copying directories...
xcopy "assets" "dist\assets\" /e /i /y
xcopy "css" "dist\css\" /e /i /y
xcopy "js" "dist\js\" /e /i /y
xcopy "icons" "dist\icons\" /e /i /y

REM Copy HTML files
echo Copying HTML files...
copy "*.html" "dist\" /y

REM Copy JSON and XML files
echo Copying JSON and XML files...
copy "*.json" "dist\" /y
copy "*.xml" "dist\" /y

REM Copy optional files
if exist "favicon.ico" (
    echo Copying favicon.ico...
    copy "favicon.ico" "dist\" /y
)

if exist "robots.txt" (
    echo Copying robots.txt...
    copy "robots.txt" "dist\" /y
)

echo Build completed successfully!