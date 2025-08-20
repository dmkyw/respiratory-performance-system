#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简单的HTTP服务器，用于提供静态文件服务
支持HTML、CSS、JavaScript等文件类型
"""

import http.server
import socketserver
import os
import sys
from urllib.parse import urlparse
import mimetypes

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """自定义HTTP请求处理器"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=os.getcwd(), **kwargs)
    
    def end_headers(self):
        # 添加CORS头
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
    
    def guess_type(self, path):
        """改进的MIME类型猜测"""
        mimetype, encoding = mimetypes.guess_type(path)
        
        # 特殊处理一些文件类型
        if path.endswith('.js'):
            return 'text/javascript'
        elif path.endswith('.css'):
            return 'text/css'
        elif path.endswith('.html'):
            return 'text/html; charset=utf-8'
        elif path.endswith('.json'):
            return 'application/json'
        
        return mimetype or 'application/octet-stream'
    
    def log_message(self, format, *args):
        """自定义日志格式"""
        print(f"[{self.log_date_time_string()}] {format % args}")

def start_server(port=8000):
    """启动HTTP服务器"""
    try:
        # 确保在正确的目录中
        if not os.path.exists('index.html'):
            print("警告: 当前目录中没有找到 index.html 文件")
            print(f"当前目录: {os.getcwd()}")
            print("目录内容:")
            for item in os.listdir('.'):
                print(f"  {item}")
        
        # 创建服务器
        with socketserver.TCPServer(("", port), CustomHTTPRequestHandler) as httpd:
            print(f"\n=== HTTP服务器启动成功 ===")
            print(f"服务器地址: http://localhost:{port}")
            print(f"服务目录: {os.getcwd()}")
            print(f"按 Ctrl+C 停止服务器\n")
            
            # 启动服务器
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n服务器已停止")
    except OSError as e:
        if e.errno == 10048:  # Windows端口被占用错误
            print(f"错误: 端口 {port} 已被占用")
            print(f"请尝试使用其他端口，例如: python server.py {port + 1}")
        else:
            print(f"启动服务器时出错: {e}")
    except Exception as e:
        print(f"未知错误: {e}")

if __name__ == '__main__':
    # 获取端口号
    port = 8000
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print("错误: 端口号必须是数字")
            sys.exit(1)
    
    # 启动服务器
    start_server(port)