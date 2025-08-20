/**
 * 系统设置页面逻辑
 * 负责系统配置管理、数据导入导出和系统维护
 */

class SettingsPageController {
    constructor() {
        this.storageManager = new StorageManager();
        this.config = null;
        
        this.init();
    }

    /**
     * 初始化页面
     */
    init() {
        this.loadConfig();
        this.setupEventListeners();
        this.renderConfigForm();
        this.updateStorageInfo();
    }

    /**
     * 加载系统配置
     */
    loadConfig() {
        this.config = this.storageManager.getSystemConfig();
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 保存配置
        document.getElementById('saveConfigBtn').addEventListener('click', () => this.saveConfig());
        
        // 重置配置
        document.getElementById('resetConfigBtn').addEventListener('click', () => this.resetConfig());
        
        // 职称系数管理
        document.getElementById('addTitleBtn').addEventListener('click', () => this.showAddTitleModal());
        document.getElementById('saveTitleBtn').addEventListener('click', () => this.saveTitle());
        
        // 数据管理
        document.getElementById('exportConfigBtn').addEventListener('click', () => this.exportConfig());
        document.getElementById('importConfigBtn').addEventListener('click', () => this.importConfig());
        document.getElementById('exportDataBtn').addEventListener('click', () => this.exportAllData());
        document.getElementById('importDataBtn').addEventListener('click', () => this.importAllData());
        document.getElementById('clearHistoryBtn').addEventListener('click', () => this.clearHistory());
        document.getElementById('resetSystemBtn').addEventListener('click', () => this.resetSystem());
        
        // 文件输入
        document.getElementById('configFileInput').addEventListener('change', (e) => this.handleConfigFileImport(e));
        document.getElementById('dataFileInput').addEventListener('change', (e) => this.handleDataFileImport(e));
        
        // 权重变更时实时验证
        ['baseWeight', 'dischargeWeight', 'bedDayWeight', 'attendanceWeight'].forEach(id => {
            document.getElementById(id).addEventListener('input', () => this.validateWeights());
        });
        
        // 模态框关闭
        document.getElementById('titleModal').addEventListener('hidden.bs.modal', () => this.resetTitleForm());
    }

    /**
     * 渲染配置表单
     */
    renderConfigForm() {
        // 绩效计算权重
        document.getElementById('baseWeight').value = (this.config.weights.baseWeight * 100).toFixed(0);
        document.getElementById('dischargeWeight').value = (this.config.weights.dischargeWeight * 100).toFixed(0);
        document.getElementById('bedDayWeight').value = (this.config.weights.bedDayWeight * 100).toFixed(0);
        document.getElementById('attendanceWeight').value = (this.config.weights.attendanceWeight * 100).toFixed(0);
        
        // 新入职人员系数
        document.getElementById('uncertifiedCoeff').value = this.config.newEmployeeCoefficients.uncertified;
        document.getElementById('withinThreeYearsCoeff').value = this.config.newEmployeeCoefficients.withinThreeYears;
        document.getElementById('normalCoeff').value = this.config.newEmployeeCoefficients.normal;
        
        // 系统选项
        document.getElementById('autoSave').checked = this.config.options.autoSave;
        document.getElementById('confirmDelete').checked = this.config.options.confirmDelete;
        document.getElementById('decimalPlaces').value = this.config.options.decimalPlaces;
        document.getElementById('maxHistoryRecords').value = this.config.options.maxHistoryRecords;
        
        // 渲染职称系数表格
        this.renderTitleCoefficients();
    }

    /**
     * 渲染职称系数表格
     */
    renderTitleCoefficients() {
        const tbody = document.getElementById('titleCoeffTableBody');
        tbody.innerHTML = '';
        
        Object.entries(this.config.titleCoefficients).forEach(([title, coefficient]) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${title}</td>
                <td>${coefficient}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="settingsController.editTitle('${title}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="settingsController.deleteTitle('${title}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    /**
     * 验证权重总和
     */
    validateWeights() {
        const baseWeight = parseFloat(document.getElementById('baseWeight').value) || 0;
        const dischargeWeight = parseFloat(document.getElementById('dischargeWeight').value) || 0;
        const bedDayWeight = parseFloat(document.getElementById('bedDayWeight').value) || 0;
        const attendanceWeight = parseFloat(document.getElementById('attendanceWeight').value) || 0;
        
        const total = baseWeight + dischargeWeight + bedDayWeight + attendanceWeight;
        const weightSumElement = document.getElementById('weightSum');
        
        weightSumElement.textContent = `当前总和: ${total}%`;
        
        if (total === 100) {
            weightSumElement.className = 'text-success';
        } else {
            weightSumElement.className = 'text-danger';
        }
        
        return total === 100;
    }

    /**
     * 保存配置
     */
    saveConfig() {
        // 验证权重
        if (!this.validateWeights()) {
            this.showMessage('权重总和必须等于100%', 'danger');
            return;
        }
        
        try {
            // 更新权重
            this.config.weights = {
                baseWeight: parseFloat(document.getElementById('baseWeight').value) / 100,
                dischargeWeight: parseFloat(document.getElementById('dischargeWeight').value) / 100,
                bedDayWeight: parseFloat(document.getElementById('bedDayWeight').value) / 100,
                attendanceWeight: parseFloat(document.getElementById('attendanceWeight').value) / 100
            };
            
            // 更新新入职人员系数
            this.config.newEmployeeCoefficients = {
                uncertified: parseFloat(document.getElementById('uncertifiedCoeff').value),
                withinThreeYears: parseFloat(document.getElementById('withinThreeYearsCoeff').value),
                normal: parseFloat(document.getElementById('normalCoeff').value)
            };
            
            // 更新系统选项
            this.config.options = {
                autoSave: document.getElementById('autoSave').checked,
                confirmDelete: document.getElementById('confirmDelete').checked,
                decimalPlaces: parseInt(document.getElementById('decimalPlaces').value),
                maxHistoryRecords: parseInt(document.getElementById('maxHistoryRecords').value)
            };
            
            // 验证配置
            this.config.validateWeights();
            
            // 保存到存储
            this.storageManager.updateSystemConfig(this.config);
            
            this.showMessage('配置保存成功', 'success');
            
        } catch (error) {
            this.showMessage('保存失败：' + error.message, 'danger');
        }
    }

    /**
     * 重置配置
     */
    resetConfig() {
        if (!confirm('确定要重置所有配置到默认值吗？')) return;
        
        this.config = new SystemConfig();
        this.storageManager.updateSystemConfig(this.config);
        this.renderConfigForm();
        this.showMessage('配置已重置为默认值', 'success');
    }

    /**
     * 显示添加职称模态框
     */
    showAddTitleModal() {
        document.getElementById('titleModalTitle').textContent = '添加职称';
        document.getElementById('originalTitle').value = '';
        this.resetTitleForm();
        new bootstrap.Modal(document.getElementById('titleModal')).show();
    }

    /**
     * 编辑职称
     */
    editTitle(title) {
        document.getElementById('titleModalTitle').textContent = '编辑职称';
        document.getElementById('originalTitle').value = title;
        document.getElementById('titleName').value = title;
        document.getElementById('titleCoefficient').value = this.config.titleCoefficients[title];
        
        new bootstrap.Modal(document.getElementById('titleModal')).show();
    }

    /**
     * 删除职称
     */
    deleteTitle(title) {
        if (!confirm(`确定要删除职称"${title}"吗？`)) return;
        
        this.config.removeTitleCoefficient(title);
        this.storageManager.updateSystemConfig(this.config);
        this.renderTitleCoefficients();
        this.showMessage('职称删除成功', 'success');
    }

    /**
     * 保存职称
     */
    saveTitle() {
        const form = document.getElementById('titleForm');
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }
        
        const originalTitle = document.getElementById('originalTitle').value;
        const titleName = document.getElementById('titleName').value.trim();
        const coefficient = parseFloat(document.getElementById('titleCoefficient').value);
        
        try {
            if (originalTitle && originalTitle !== titleName) {
                // 删除原职称
                this.config.removeTitleCoefficient(originalTitle);
            }
            
            // 添加或更新职称
            this.config.addTitleCoefficient(titleName, coefficient);
            
            this.storageManager.updateSystemConfig(this.config);
            this.renderTitleCoefficients();
            
            bootstrap.Modal.getInstance(document.getElementById('titleModal')).hide();
            this.showMessage('职称保存成功', 'success');
            
        } catch (error) {
            this.showMessage('保存失败：' + error.message, 'danger');
        }
    }

    /**
     * 重置职称表单
     */
    resetTitleForm() {
        const form = document.getElementById('titleForm');
        form.reset();
        form.classList.remove('was-validated');
    }

    /**
     * 导出配置
     */
    exportConfig() {
        try {
            const configData = {
                config: this.config.toJSON(),
                exportTime: new Date().toISOString(),
                version: '1.0'
            };
            
            const blob = new Blob([JSON.stringify(configData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `系统配置_${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            URL.revokeObjectURL(url);
            this.showMessage('配置导出成功', 'success');
            
        } catch (error) {
            this.showMessage('导出失败：' + error.message, 'danger');
        }
    }

    /**
     * 导入配置
     */
    importConfig() {
        document.getElementById('configFileInput').click();
    }

    /**
     * 处理配置文件导入
     */
    handleConfigFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (!data.config) {
                    throw new Error('无效的配置文件格式');
                }
                
                this.config = new SystemConfig(data.config);
                this.storageManager.updateSystemConfig(this.config);
                this.renderConfigForm();
                
                this.showMessage('配置导入成功', 'success');
                
            } catch (error) {
                this.showMessage('导入失败：' + error.message, 'danger');
            }
        };
        
        reader.readAsText(file);
        event.target.value = ''; // 清空文件输入
    }

    /**
     * 导出所有数据
     */
    exportAllData() {
        try {
            const allData = {
                doctors: this.storageManager.getAllDoctors().map(d => d.toJSON()),
                performanceRecords: this.storageManager.getAllPerformanceRecords().map(r => r.toJSON()),
                systemConfig: this.storageManager.getSystemConfig().toJSON(),
                currentWorkData: this.storageManager.getAllCurrentWorkData(),
                exportTime: new Date().toISOString(),
                version: '1.0'
            };
            
            const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `绩效系统数据备份_${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            URL.revokeObjectURL(url);
            this.showMessage('数据导出成功', 'success');
            
        } catch (error) {
            this.showMessage('导出失败：' + error.message, 'danger');
        }
    }

    /**
     * 导入所有数据
     */
    importAllData() {
        if (!confirm('导入数据将覆盖现有所有数据，确定继续吗？')) return;
        
        document.getElementById('dataFileInput').click();
    }

    /**
     * 处理数据文件导入
     */
    handleDataFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (!data.doctors || !data.systemConfig) {
                    throw new Error('无效的数据文件格式');
                }
                
                // 清空现有数据
                this.storageManager.clearAllData();
                
                // 导入系统配置
                const config = new SystemConfig(data.systemConfig);
                this.storageManager.updateSystemConfig(config);
                
                // 导入医生数据
                data.doctors.forEach(doctorData => {
                    const doctor = new Doctor(doctorData);
                    this.storageManager.addDoctor(doctor);
                });
                
                // 导入绩效记录
                if (data.performanceRecords) {
                    data.performanceRecords.forEach(recordData => {
                        const record = new PerformanceRecord(recordData);
                        this.storageManager.addPerformanceRecord(record);
                    });
                }
                
                // 导入当前工作数据
                if (data.currentWorkData) {
                    Object.entries(data.currentWorkData).forEach(([key, value]) => {
                        this.storageManager.saveCurrentWorkData(key, value);
                    });
                }
                
                // 重新加载配置
                this.loadConfig();
                this.renderConfigForm();
                this.updateStorageInfo();
                
                this.showMessage('数据导入成功', 'success');
                
            } catch (error) {
                this.showMessage('导入失败：' + error.message, 'danger');
            }
        };
        
        reader.readAsText(file);
        event.target.value = ''; // 清空文件输入
    }

    /**
     * 清空历史记录
     */
    clearHistory() {
        if (!confirm('确定要清空所有历史记录吗？此操作不可恢复！')) return;
        
        try {
            this.storageManager.clearPerformanceRecords();
            this.updateStorageInfo();
            this.showMessage('历史记录清空成功', 'success');
        } catch (error) {
            this.showMessage('清空失败：' + error.message, 'danger');
        }
    }

    /**
     * 重置系统
     */
    resetSystem() {
        if (!confirm('确定要重置整个系统吗？这将删除所有数据和配置，此操作不可恢复！')) return;
        
        if (!confirm('请再次确认：这将删除所有医生信息、历史记录和系统配置！')) return;
        
        try {
            this.storageManager.clearAllData();
            this.config = new SystemConfig();
            this.storageManager.updateSystemConfig(this.config);
            
            this.renderConfigForm();
            this.updateStorageInfo();
            
            this.showMessage('系统重置成功', 'success');
        } catch (error) {
            this.showMessage('重置失败：' + error.message, 'danger');
        }
    }

    /**
     * 更新存储信息
     */
    updateStorageInfo() {
        const usage = this.storageManager.getStorageUsage();
        
        document.getElementById('storageInfo').innerHTML = `
            <div class="row">
                <div class="col-md-3">
                    <div class="card text-center">
                        <div class="card-body">
                            <h5 class="text-primary">${usage.doctors}</h5>
                            <p class="card-text">医生数量</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card text-center">
                        <div class="card-body">
                            <h5 class="text-success">${usage.performanceRecords}</h5>
                            <p class="card-text">历史记录</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card text-center">
                        <div class="card-body">
                            <h5 class="text-info">${usage.currentWorkData}</h5>
                            <p class="card-text">工作数据</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card text-center">
                        <div class="card-body">
                            <h5 class="text-warning">${(usage.totalSize / 1024).toFixed(2)} KB</h5>
                            <p class="card-text">存储大小</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 显示消息
     */
    showMessage(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        const container = document.getElementById('messageContainer');
        container.appendChild(alertDiv);
        
        // 自动移除消息
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }
}

// 页面加载完成后初始化
let settingsController;
document.addEventListener('DOMContentLoaded', () => {
    settingsController = new SettingsPageController();
});