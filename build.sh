#!/bin/bash

# Render静态网站构建脚本
# 用于在Render平台上部署前端静态文件

echo "开始构建前端静态网站..."

# 创建构建目录
mkdir -p dist

# 复制所有静态文件到构建目录
echo "复制静态文件..."
cp -r assets/ dist/
cp -r css/ dist/
cp -r js/ dist/
cp -r icons/ dist/
cp *.html dist/
cp *.json dist/
cp *.xml dist/

# 检查是否存在favicon.ico
if [ -f "favicon.ico" ]; then
    cp favicon.ico dist/
fi

# 检查是否存在robots.txt
if [ -f "robots.txt" ]; then
    cp robots.txt dist/
fi

echo "构建完成！静态文件已准备就绪。"
echo "构建目录: ./dist"
ls -la dist/