/**
 * PWA安装提示功能
 * 检测PWA安装条件并显示安装提示
 */

class PWAInstaller {
    constructor() {
        this.deferredPrompt = null;
        this.installButton = null;
        this.installBanner = null;
        this.init();
    }

    /**
     * 初始化PWA安装功能
     */
    init() {
        this.createInstallBanner();
        this.bindEvents();
        this.checkInstallability();
    }

    /**
     * 创建安装提示横幅
     */
    createInstallBanner() {
        // 创建安装提示横幅HTML
        const bannerHTML = `
            <div id="pwa-install-banner" class="pwa-install-banner" style="display: none;">
                <div class="pwa-banner-content">
                    <div class="pwa-banner-icon">
                        <img src="./icons/icon-72x72.png" alt="应用图标" width="48" height="48">
                    </div>
                    <div class="pwa-banner-text">
                        <h6 class="mb-1">安装科室绩效分配系统</h6>
                        <small class="text-muted">添加到主屏幕，获得更好的使用体验</small>
                    </div>
                    <div class="pwa-banner-actions">
                        <button id="pwa-install-btn" class="btn btn-primary btn-sm me-2">安装</button>
                        <button id="pwa-dismiss-btn" class="btn btn-outline-secondary btn-sm">稍后</button>
                    </div>
                </div>
            </div>
        `;

        // 将横幅添加到页面顶部
        document.body.insertAdjacentHTML('afterbegin', bannerHTML);
        
        this.installBanner = document.getElementById('pwa-install-banner');
        this.installButton = document.getElementById('pwa-install-btn');
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 监听beforeinstallprompt事件
        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('PWA安装提示事件触发');
            // 阻止默认的安装提示
            e.preventDefault();
            // 保存事件以便后续使用
            this.deferredPrompt = e;
            // 显示自定义安装横幅
            this.showInstallBanner();
        });

        // 监听应用安装事件
        window.addEventListener('appinstalled', (e) => {
            console.log('PWA应用已安装');
            this.hideInstallBanner();
            this.showInstallSuccess();
        });

        // 安装按钮点击事件
        if (this.installButton) {
            this.installButton.addEventListener('click', () => {
                this.installApp();
            });
        }

        // 稍后按钮点击事件
        const dismissButton = document.getElementById('pwa-dismiss-btn');
        if (dismissButton) {
            dismissButton.addEventListener('click', () => {
                this.hideInstallBanner();
                // 24小时后再次显示
                localStorage.setItem('pwa-install-dismissed', Date.now().toString());
            });
        }

        // 检查Service Worker注册状态
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(() => {
                console.log('Service Worker已就绪');
            });
        }
    }

    /**
     * 检查应用是否可安装
     */
    checkInstallability() {
        // 检查是否已经安装
        if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
            console.log('应用已在独立模式下运行');
            return;
        }

        // 检查是否在支持的浏览器中
        if (!('serviceWorker' in navigator)) {
            console.log('浏览器不支持Service Worker');
            return;
        }

        // 检查是否最近被用户拒绝
        const dismissedTime = localStorage.getItem('pwa-install-dismissed');
        if (dismissedTime) {
            const timeDiff = Date.now() - parseInt(dismissedTime);
            const twentyFourHours = 24 * 60 * 60 * 1000;
            if (timeDiff < twentyFourHours) {
                console.log('用户最近拒绝了安装提示');
                return;
            }
        }

        // 检查是否为移动设备
        if (this.isMobileDevice()) {
            // 延迟显示安装提示，让用户先体验应用
            setTimeout(() => {
                if (!this.deferredPrompt) {
                    this.showMobileInstallHint();
                }
            }, 30000); // 30秒后显示
        }
    }

    /**
     * 显示安装横幅
     */
    showInstallBanner() {
        if (this.installBanner) {
            this.installBanner.style.display = 'block';
            // 添加动画效果
            setTimeout(() => {
                this.installBanner.classList.add('show');
            }, 100);
        }
    }

    /**
     * 隐藏安装横幅
     */
    hideInstallBanner() {
        if (this.installBanner) {
            this.installBanner.classList.remove('show');
            setTimeout(() => {
                this.installBanner.style.display = 'none';
            }, 300);
        }
    }

    /**
     * 执行应用安装
     */
    async installApp() {
        if (!this.deferredPrompt) {
            console.log('没有可用的安装提示');
            return;
        }

        try {
            // 显示安装提示
            this.deferredPrompt.prompt();
            
            // 等待用户响应
            const { outcome } = await this.deferredPrompt.userChoice;
            
            console.log(`用户选择: ${outcome}`);
            
            if (outcome === 'accepted') {
                console.log('用户接受了安装');
            } else {
                console.log('用户拒绝了安装');
                localStorage.setItem('pwa-install-dismissed', Date.now().toString());
            }
            
            // 清除保存的提示
            this.deferredPrompt = null;
            this.hideInstallBanner();
            
        } catch (error) {
            console.error('安装过程中出错:', error);
        }
    }

    /**
     * 显示安装成功消息
     */
    showInstallSuccess() {
        // 创建成功提示
        const successHTML = `
            <div class="alert alert-success alert-dismissible fade show position-fixed" 
                 style="top: 20px; right: 20px; z-index: 9999; max-width: 300px;" 
                 role="alert">
                <strong>安装成功！</strong> 应用已添加到您的主屏幕。
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', successHTML);
        
        // 5秒后自动移除
        setTimeout(() => {
            const alert = document.querySelector('.alert-success');
            if (alert) {
                alert.remove();
            }
        }, 5000);
    }

    /**
     * 显示移动端安装提示
     */
    showMobileInstallHint() {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isAndroid = /Android/.test(navigator.userAgent);
        
        let message = '';
        
        if (isIOS) {
            message = '在Safari中，点击分享按钮 <i class="fas fa-share"></i>，然后选择"添加到主屏幕"';
        } else if (isAndroid) {
            message = '在Chrome中，点击菜单按钮 <i class="fas fa-ellipsis-v"></i>，然后选择"添加到主屏幕"';
        } else {
            return; // 不是移动设备
        }
        
        const hintHTML = `
            <div class="toast position-fixed bottom-0 end-0 m-3" 
                 style="z-index: 9999;" 
                 id="mobile-install-hint" 
                 data-bs-autohide="false">
                <div class="toast-header">
                    <img src="./icons/icon-72x72.png" class="rounded me-2" width="20" height="20">
                    <strong class="me-auto">安装应用</strong>
                    <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
                </div>
                <div class="toast-body">
                    ${message}
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', hintHTML);
        
        // 显示Toast
        const toast = new bootstrap.Toast(document.getElementById('mobile-install-hint'));
        toast.show();
    }

    /**
     * 检查是否为移动设备
     */
    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    /**
     * 检查网络状态
     */
    checkNetworkStatus() {
        if ('onLine' in navigator) {
            const updateOnlineStatus = () => {
                const status = navigator.onLine ? 'online' : 'offline';
                console.log(`网络状态: ${status}`);
                
                if (!navigator.onLine) {
                    this.showOfflineMessage();
                } else {
                    this.hideOfflineMessage();
                }
            };
            
            window.addEventListener('online', updateOnlineStatus);
            window.addEventListener('offline', updateOnlineStatus);
            
            updateOnlineStatus();
        }
    }

    /**
     * 显示离线消息
     */
    showOfflineMessage() {
        const offlineHTML = `
            <div id="offline-banner" class="alert alert-warning position-fixed w-100" 
                 style="top: 0; left: 0; z-index: 9998; margin: 0; border-radius: 0;">
                <div class="container text-center">
                    <i class="fas fa-wifi-slash me-2"></i>
                    您当前处于离线状态，部分功能可能受限
                </div>
            </div>
        `;
        
        if (!document.getElementById('offline-banner')) {
            document.body.insertAdjacentHTML('afterbegin', offlineHTML);
        }
    }

    /**
     * 隐藏离线消息
     */
    hideOfflineMessage() {
        const banner = document.getElementById('offline-banner');
        if (banner) {
            banner.remove();
        }
    }
}

// 页面加载完成后初始化PWA安装器
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new PWAInstaller();
    });
} else {
    new PWAInstaller();
}