/**
 * 结果展示页面逻辑
 * 负责显示绩效计算结果、图表展示和数据导出
 */

class ResultsPageController {
    constructor() {
        this.storageManager = new StorageManager();
        this.calculator = new PerformanceCalculator();
        this.resultsData = null;
        this.chart = null;
        
        this.init();
    }

    /**
     * 初始化页面
     */
    init() {
        console.log('=== Results页面初始化开始 ===');
        
        try {
            this.setupDiagnosticEventListeners();
            
            // 尝试加载数据
            const dataLoaded = this.loadResultsData();
            
            if (!dataLoaded) {
                console.error('=== 数据加载失败 ===');
                console.warn('数据加载失败，显示错误信息');
                this.showDiagnosticPanel();
                this.runDiagnostic();
                return;
            }
            
            console.log('=== 数据加载成功，开始渲染页面 ===');
            this.setupEventListeners();
            this.renderResults();
            this.renderChart();
            this.renderConfig();
            console.log('=== Results页面初始化完成 ===');
        } catch (error) {
            console.error('初始化结果页面失败:', error);
            this.showDiagnosticPanel();
            this.runDiagnostic();
        }
    }

    /**
     * 设置诊断面板事件监听器
     */
    setupDiagnosticEventListeners() {
        // 重新运行诊断按钮
        const runDiagnosticBtn = document.getElementById('runDiagnosticBtn');
        if (runDiagnosticBtn) {
            runDiagnosticBtn.addEventListener('click', () => {
                this.runDiagnostic();
            });
        }

        // 查看原始数据按钮
        const showRawDataBtn = document.getElementById('showRawDataBtn');
        if (showRawDataBtn) {
            showRawDataBtn.addEventListener('click', () => {
                this.showRawDataModal();
            });
        }

        // 清除数据按钮
        const clearDataBtn = document.getElementById('clearDataBtn');
        if (clearDataBtn) {
            clearDataBtn.addEventListener('click', () => {
                this.clearSessionData();
            });
        }
    }

    /**
     * 显示诊断面板
     */
    showDiagnosticPanel() {
        const diagnosticPanel = document.getElementById('diagnosticPanel');
        if (diagnosticPanel) {
            diagnosticPanel.style.display = 'block';
        }

        // 隐藏其他内容区域
        const contentAreas = [
            'monthInfo',
            'statisticsOverview', 
            'performanceChart',
            'currentConfig',
            'resultsTable',
            'summarySection'
        ];
        
        contentAreas.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = 'none';
            }
        });
    }

    /**
     * 运行诊断检查
     */
    runDiagnostic() {
        console.log('开始运行诊断检查...');
        
        // 重置状态
        this.updateDiagnosticStatus('sessionStorageStatus', 'checking', '检查中');
        this.updateDiagnosticStatus('dataExistenceStatus', 'checking', '检查中');
        this.updateDiagnosticStatus('dataStructureStatus', 'checking', '检查中');
        this.updateDiagnosticStatus('calculationStatus', 'checking', '检查中');
        
        const errorDetails = document.getElementById('errorDetails');
        const suggestionsList = document.getElementById('suggestionsList');
        
        let errors = [];
        let suggestions = [];
        
        // 1. 检查 SessionStorage 可用性
        try {
            if (typeof(Storage) === "undefined" || !window.sessionStorage) {
                this.updateDiagnosticStatus('sessionStorageStatus', 'error', '不可用');
                errors.push('浏览器不支持 SessionStorage 或已被禁用');
                suggestions.push('请检查浏览器设置，确保允许本地存储');
            } else {
                this.updateDiagnosticStatus('sessionStorageStatus', 'success', '可用');
            }
        } catch (e) {
            this.updateDiagnosticStatus('sessionStorageStatus', 'error', '错误');
            errors.push('SessionStorage 访问错误: ' + e.message);
        }
        
        // 2. 检查数据存在性
        const rawData = sessionStorage.getItem('performanceResults');
        if (!rawData) {
            this.updateDiagnosticStatus('dataExistenceStatus', 'error', '无数据');
            errors.push('SessionStorage 中没有找到绩效计算结果数据');
            suggestions.push('请返回数据录入页面，确保所有数据录入完整后重新计算');
        } else {
            this.updateDiagnosticStatus('dataExistenceStatus', 'success', '存在');
        }
        
        // 3. 检查数据结构
        if (rawData) {
            try {
                const data = JSON.parse(rawData);
                const structureValid = this.validateDataStructure(data);
                
                if (structureValid.isValid) {
                    this.updateDiagnosticStatus('dataStructureStatus', 'success', '完整');
                } else {
                    this.updateDiagnosticStatus('dataStructureStatus', 'error', '不完整');
                    errors.push('数据结构不完整: ' + structureValid.errors.join(', '));
                    suggestions.push('数据可能在传输过程中损坏，请重新计算');
                }
            } catch (e) {
                this.updateDiagnosticStatus('dataStructureStatus', 'error', '解析失败');
                errors.push('数据解析失败: ' + e.message);
                suggestions.push('数据格式可能损坏，请清除数据后重新计算');
            }
        } else {
            this.updateDiagnosticStatus('dataStructureStatus', 'warning', '无法检查');
        }
        
        // 4. 检查计算状态
        if (rawData) {
            try {
                const data = JSON.parse(rawData);
                if (data.dataIntegrity && data.dataIntegrity.calculationSuccessful) {
                    this.updateDiagnosticStatus('calculationStatus', 'success', '成功');
                } else {
                    this.updateDiagnosticStatus('calculationStatus', 'warning', '未确认');
                    errors.push('计算状态未确认或计算可能未完成');
                    suggestions.push('请确保在数据录入页面完成所有计算步骤');
                }
            } catch (e) {
                this.updateDiagnosticStatus('calculationStatus', 'error', '检查失败');
            }
        } else {
            this.updateDiagnosticStatus('calculationStatus', 'error', '无数据');
        }
        
        // 更新错误详情
        if (errors.length > 0) {
            errorDetails.innerHTML = '<div class="alert alert-danger"><strong>发现以下问题:</strong><ul class="mb-0">' + 
                errors.map(error => '<li>' + error + '</li>').join('') + '</ul></div>';
        } else {
            errorDetails.innerHTML = '<div class="alert alert-success">所有检查项目都通过了！</div>';
        }
        
        // 更新修复建议
        if (suggestions.length > 0) {
            suggestionsList.innerHTML = suggestions.map(suggestion => '<li>' + suggestion + '</li>').join('');
        } else {
            suggestionsList.innerHTML = '<li class="text-success">暂无需要修复的问题</li>';
        }
        
        console.log('诊断检查完成');
    }
    
    /**
     * 更新诊断状态徽章
     */
    updateDiagnosticStatus(elementId, status, text) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        // 清除所有状态类
        element.className = 'badge me-2';
        
        // 根据状态添加对应的类
        switch (status) {
            case 'success':
                element.classList.add('bg-success');
                break;
            case 'error':
                element.classList.add('bg-danger');
                break;
            case 'warning':
                element.classList.add('bg-warning', 'text-dark');
                break;
            case 'checking':
            default:
                element.classList.add('bg-secondary');
                break;
        }
        
        element.textContent = text;
    }
    
    /**
     * 显示原始数据模态框
     */
    showRawDataModal() {
        const rawDataContent = document.getElementById('rawDataContent');
        const modal = new bootstrap.Modal(document.getElementById('rawDataModal'));
        
        // 获取所有相关的 sessionStorage 数据
        const allData = {
            performanceResults: sessionStorage.getItem('performanceResults'),
            doctorsData: sessionStorage.getItem('doctorsData'),
            workData: sessionStorage.getItem('workData'),
            totalBonus: sessionStorage.getItem('totalBonus'),
            selectedMonth: sessionStorage.getItem('selectedMonth')
        };
        
        // 格式化显示
        let formattedData = 'SessionStorage 内容:\n\n';
        for (const [key, value] of Object.entries(allData)) {
            formattedData += `${key}:\n`;
            if (value) {
                try {
                    const parsed = JSON.parse(value);
                    formattedData += JSON.stringify(parsed, null, 2);
                } catch (e) {
                    formattedData += value;
                }
            } else {
                formattedData += '(空)';
            }
            formattedData += '\n\n---\n\n';
        }
        
        rawDataContent.textContent = formattedData;
        modal.show();
    }
    
    /**
     * 清除 SessionStorage 数据
     */
    clearSessionData() {
        if (confirm('确定要清除所有存储的数据吗？这将删除所有计算结果和录入数据。')) {
            const keysToRemove = [
                'performanceResults',
                'doctorsData', 
                'workData',
                'totalBonus',
                'selectedMonth'
            ];
            
            keysToRemove.forEach(key => {
                sessionStorage.removeItem(key);
            });
            
            alert('数据已清除，请返回数据录入页面重新开始。');
            
            // 重新运行诊断
            this.runDiagnostic();
        }
    }

    /**
     * 从sessionStorage加载结果数据 - 增强版本
     */
    loadResultsData() {
        console.log('=== Results: 开始从sessionStorage加载结果数据 ===');
        
        try {
            // 检查sessionStorage是否可用
            console.log('Results: 检查sessionStorage可用性...');
            if (typeof(Storage) === "undefined") {
                console.error('Results: 浏览器不支持sessionStorage');
                throw new Error('浏览器不支持sessionStorage');
            }
            
            console.log('Results: 从sessionStorage获取数据...');
            const data = sessionStorage.getItem('performanceResults');
            console.log('Results: 原始数据长度:', data ? data.length : 0);
            console.log('Results: 原始数据前500字符:', data?.substring(0, 500) || '无数据');
            
            if (!data) {
                console.warn('Results: sessionStorage中没有找到performanceResults数据');
                console.log('Results: sessionStorage中的所有键:', Object.keys(sessionStorage));
                this.showDataDiagnostics({
                    error: 'NO_DATA',
                    message: 'sessionStorage中没有找到计算结果数据',
                    suggestions: [
                        '请确保已在主页面完成计算',
                        '检查是否从主页面正确跳转到此页面',
                        '尝试返回主页面重新计算'
                    ]
                });
                return false;
            }
            
            let parsedData;
            try {
                console.log('Results: 开始解析JSON数据...');
                parsedData = JSON.parse(data);
                console.log('Results: JSON解析成功');
                console.log('Results: 解析后的数据结构:', parsedData);
                console.log('Results: individualResults数量:', parsedData?.results?.individualResults?.length || 0);
            } catch (parseError) {
                console.error('Results: JSON解析失败:', parseError);
                this.showDataDiagnostics({
                    error: 'PARSE_ERROR',
                    message: 'sessionStorage数据格式错误',
                    details: parseError.message,
                    suggestions: [
                        '数据可能已损坏，请重新计算',
                        '清理浏览器缓存后重试',
                        '检查浏览器兼容性'
                    ]
                });
                return false;
            }
            
            // 详细的数据结构验证
            console.log('Results: 开始验证数据结构...');
            const validation = this.validateDataStructure(parsedData);
            if (!validation.isValid) {
                console.error('Results: 数据结构验证失败:', validation.errors);
                this.showDataDiagnostics({
                    error: 'STRUCTURE_ERROR',
                    message: '数据结构不完整',
                    details: validation.errors.join('; '),
                    suggestions: [
                        '请返回主页面重新计算',
                        '确保所有必要数据都已正确录入',
                        '检查计算过程是否完整'
                    ]
                });
                return false;
            }
            
            // 检查数据完整性
            if (parsedData.dataIntegrity) {
                console.log('Results: 数据完整性检查:', parsedData.dataIntegrity);
                if (!parsedData.dataIntegrity.calculationSuccessful) {
                    this.showDataDiagnostics({
                        error: 'CALCULATION_INCOMPLETE',
                        message: '计算过程未完成',
                        suggestions: [
                            '请返回主页面重新进行完整计算',
                            '确保所有数据录入完整后再计算'
                        ]
                    });
                    return false;
                }
            }
            
            this.resultsData = parsedData;
            
            // 确保teamStats存在
            if (!this.resultsData.results.teamStats) {
                this.resultsData.results.teamStats = {
                    totalDoctors: this.resultsData.results.individualResults.length,
                    averageScore: 0,
                    maxScore: 0,
                    minScore: 0
                };
            }
            
            console.log('Results: 绩效计算结果加载成功:', this.resultsData);
            console.log('Results: 数据完整性检查通过');
            console.log('=== Results: 数据验证通过，individualResults数量:', parsedData.results.individualResults.length, ' ===');
            return true;
            
        } catch (error) {
            console.error('=== Results: 加载sessionStorage数据时出现严重错误 ===');
            console.error('Results: 错误信息:', error.message);
            console.error('Results: 错误堆栈:', error.stack);
            console.error('Results: sessionStorage状态:', {
                available: typeof(Storage) !== "undefined",
                keys: Object.keys(sessionStorage),
                performanceResultsExists: sessionStorage.getItem('performanceResults') !== null
            });
            this.showDataDiagnostics({
                error: 'SYSTEM_ERROR',
                message: '系统错误',
                details: error.message,
                suggestions: [
                    '刷新页面重试',
                    '清理浏览器缓存',
                    '使用其他浏览器尝试',
                    '联系技术支持'
                ]
            });
            return false;
        }
    }

    /**
     * 验证数据结构的完整性
     */
    validateDataStructure(data) {
        console.log('Results: 开始验证数据结构...');
        console.log('Results: 待验证的数据:', data);
        
        const errors = [];
        
        if (!data) {
            console.error('Results: 验证失败 - 数据为空');
            errors.push('数据为空');
            return { isValid: false, errors };
        }
        
        if (!data.results) {
            console.error('Results: 验证失败 - 缺少results字段');
            console.log('Results: 当前数据中的字段:', Object.keys(data));
            errors.push('缺少results字段');
        } else {
            console.log('Results: results字段存在，值:', data.results);
        }
        
        if (!data.results?.individualResults) {
            console.error('Results: 验证失败 - 缺少individualResults字段');
            console.log('Results: results中的字段:', Object.keys(data.results || {}));
            errors.push('缺少individualResults字段');
        } else {
            console.log('Results: individualResults字段存在，值:', data.results.individualResults);
        }
        
        if (!Array.isArray(data.results?.individualResults)) {
            console.error('Results: 验证失败 - individualResults不是数组');
            console.log('Results: individualResults类型:', typeof data.results?.individualResults);
            errors.push('individualResults不是数组');
        } else {
            console.log('Results: individualResults是数组，长度:', data.results.individualResults.length);
        }
        
        if (data.results?.individualResults?.length === 0) {
            console.error('Results: 验证失败 - individualResults数组为空');
            errors.push('individualResults数组为空');
        }
        
        if (!data.year || !data.month) {
            console.error('Results: 验证失败 - 缺少年份或月份信息');
            console.log('Results: year:', data.year, 'month:', data.month);
            errors.push('缺少年份或月份信息');
        } else {
            console.log('Results: 年月信息验证通过 - year:', data.year, 'month:', data.month);
        }
        
        if (typeof data.totalBonus !== 'number') {
            console.error('Results: 验证失败 - 总奖金数据格式错误');
            console.log('Results: totalBonus类型:', typeof data.totalBonus, '值:', data.totalBonus);
            errors.push('总奖金数据格式错误');
        } else {
            console.log('Results: totalBonus验证通过:', data.totalBonus);
        }
        
        const isValid = errors.length === 0;
        console.log('Results: 数据结构验证结果:', isValid ? '通过' : '失败');
        if (!isValid) {
            console.log('Results: 验证错误列表:', errors);
        }
        
        return {
            isValid,
            errors
        };
    }

    /**
     * 显示数据诊断信息
     */
    showDataDiagnostics(diagnostics) {
        console.error('=== 数据诊断 ===');
        console.error('错误类型:', diagnostics.error);
        console.error('错误信息:', diagnostics.message);
        if (diagnostics.details) {
            console.error('详细信息:', diagnostics.details);
        }
        console.error('建议解决方案:', diagnostics.suggestions);
        
        // 在页面上显示诊断信息
        const container = document.querySelector('.container');
        if (container) {
            container.innerHTML = `
                <div class="alert alert-danger" style="margin-top: 50px;">
                    <h4><i class="fas fa-exclamation-triangle"></i> 数据加载失败</h4>
                    <p><strong>错误:</strong> ${diagnostics.message}</p>
                    ${diagnostics.details ? `<p><strong>详细信息:</strong> ${diagnostics.details}</p>` : ''}
                    <hr>
                    <h6>建议解决方案:</h6>
                    <ul>
                        ${diagnostics.suggestions.map(s => `<li>${s}</li>`).join('')}
                    </ul>
                    <div class="mt-3">
                        <a href="index.html" class="btn btn-primary">
                            <i class="fas fa-arrow-left"></i> 返回主页面
                        </a>
                        <button class="btn btn-secondary ms-2" onclick="location.reload()">
                            <i class="fas fa-refresh"></i> 刷新页面
                        </button>
                    </div>
                </div>
            `;
        }
    }

    /**
     * 显示无数据消息
     */
    showNoDataMessage() {
        const container = document.querySelector('.container');
        if (container) {
            container.innerHTML = `
                <div class="alert alert-warning text-center" style="margin-top: 50px;">
                    <h4><i class="fas fa-exclamation-triangle"></i> 未找到计算结果</h4>
                    <p>请先进行绩效计算，然后查看结果。</p>
                    <a href="index.html" class="btn btn-primary">
                        <i class="fas fa-arrow-left"></i> 返回首页
                    </a>
                </div>
            `;
        }
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 返回按钮在HTML中是链接，不需要事件监听器
        
        document.getElementById('saveResultsBtn').addEventListener('click', () => this.saveResults());
        document.getElementById('exportResultsBtn').addEventListener('click', () => this.exportToExcel());
        
        // 绩效明细模态框和编辑功能
        document.getElementById('resultsTable').addEventListener('click', (e) => {
            if (e.target.classList.contains('detail-btn')) {
                const doctorId = e.target.dataset.doctorId;
                this.showPerformanceDetail(doctorId);
            } else if (e.target.classList.contains('edit-btn')) {
                const doctorId = e.target.dataset.doctorId;
                this.showEditModal(doctorId);
            }
        });
        
        // 保存编辑按钮事件
        document.getElementById('saveEditBtn').addEventListener('click', () => {
            this.saveEdit();
        });
    }

    /**
     * 渲染结果表格
     */
    renderResults() {
        console.log('=== Results: 开始渲染结果表格 ===');
        console.log('Results: 当前resultsData:', this.resultsData);
        
        if (!this.resultsData) {
            console.warn('Results: 渲染失败 - 没有结果数据可渲染');
            console.log('Results: resultsData存在:', !!this.resultsData);
            return;
        }
        
        const { year, month, results } = this.resultsData;
        console.log('Results: 渲染数据源:', { year, month, resultsCount: results?.individualResults?.length });
        console.log('Results: results对象:', results);
        
        if (!results) {
            console.error('Results: 渲染失败 - results对象不存在');
            return;
        }
        
        // 更新标题
        const monthInfoEl = document.getElementById('monthInfo');
        if (monthInfoEl) {
            monthInfoEl.textContent = `${year}年${month}月绩效分配结果`;
            console.log('Results: 更新标题完成');
        }
        
        // 显示月份信息
        const monthDisplay = document.getElementById('currentMonthDisplay');
        if (monthDisplay) {
            monthDisplay.textContent = `${year}年${month}月`;
            console.log('Results: 更新月份显示完成');
        }
        
        // 更新分配金额表头
        const allocationHeader = document.getElementById('allocationHeader');
        if (allocationHeader && this.resultsData.totalBonus) {
            allocationHeader.textContent = `绩效（总额：${Math.round(this.resultsData.totalBonus)}元）`;
            console.log('Results: 更新分配金额表头完成');
        }
        
        // 渲染结果表格
        const tbody = document.getElementById('resultsTableBody');
        if (!tbody) {
            console.error('Results: 未找到结果表格tbody元素');
            return;
        }
        
        console.log('Results: 找到表格tbody元素');
        tbody.innerHTML = '';
        
        if (!results.individualResults) {
            console.error('Results: individualResults不存在');
            tbody.innerHTML = '<tr><td colspan="11" class="text-center">数据结构错误</td></tr>';
            return;
        }
        
        // 按最终分数排序
        const sortedResults = [...results.individualResults].sort((a, b) => b.finalScore - a.finalScore);
        console.log('Results: 准备渲染的结果数据:', sortedResults);
        console.log('Results: 结果数量:', sortedResults.length);
        
        if (!sortedResults || sortedResults.length === 0) {
            console.warn('Results: 没有结果数据可渲染');
            tbody.innerHTML = '<tr><td colspan="11" class="text-center">暂无数据</td></tr>';
            return;
        }
        
        sortedResults.forEach((result, index) => {
            console.log(`Results: 渲染第${index + 1}行数据:`, result);
            
            const row = document.createElement('tr');
            // 获取医生的职称系数，优先从doctorInfo中获取，如果没有则从workData中获取
            const titleCoefficient = result.doctorInfo?.titleCoefficient || result.workData?.titleCoefficient || 1.0;
            const doctorNameWithCoeff = result.doctorName || '未知医生';
            
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${result.doctorName || '未知医生'}</td>
                <td class="text-warning fw-bold">${result.workData?.dischargeCount || 0}</td>
                <td class="text-warning fw-bold">${result.workData?.attendanceDays || 0}</td>
                <td class="text-warning fw-bold">${result.workData?.bedDays || 0}</td>
                <td>${(result.finalScore || 0).toFixed(2)}</td>
                <td>${((result.allocationRatio || 0) * 100).toFixed(2)}%</td>
                <td>
                    <input type="number" class="form-control form-control-sm final-allocation-input" 
                           value="${Math.round(result.finalAllocation || 0)}" 
                           data-doctor-id="${result.doctorId || ''}"
                           onchange="resultsController.updateFinalAllocation('${result.doctorId || ''}', this.value)"
                           step="1" min="0">
                </td>
                <td class="text-center fw-bold">
                    ${result.doctorName || '未知医生'}
                </td>
            `;
            tbody.appendChild(row);
        });
        
        console.log('=== Results: 表格渲染完成，共渲染', sortedResults.length, '行数据 ===');
        
        // 更新统计概览
        console.log('Results: 开始更新统计概览...');
        this.renderStatistics();
        
        // 渲染图表
        console.log('Results: 开始渲染图表...');
        this.renderChart();
        
        // 更新汇总金额显示
        console.log('Results: 开始更新汇总金额显示...');
        this.updateSummaryAmount();
        
        console.log('Results: 结果渲染完成');
    }

    /**
     * 渲染统计概览
     */
    renderStatistics() {
        console.log('开始渲染统计概览...');
        
        if (!this.resultsData) {
            console.warn('没有结果数据，无法渲染统计概览');
            return;
        }
        
        const { results } = this.resultsData;
        console.log('统计数据源:', results);
        
        if (!results || !results.individualResults || results.individualResults.length === 0) {
            console.warn('没有个人结果数据，无法计算统计');
            return;
        }
        
        // 计算统计数据
        const totalDoctors = results.individualResults.length;
        const totalFinalAllocation = results.individualResults.reduce((sum, result) => {
            const allocation = result.finalAllocation || 0;
            console.log(`医生 ${result.doctorName} 分配金额: ${allocation}`);
            return sum + allocation;
        }, 0);
        const averageScore = results.individualResults.reduce((sum, result) => sum + (result.finalScore || 0), 0) / totalDoctors;
        
        // 医疗业务总额不再显示，但仍用于计算
        
        console.log('统计计算结果:', {
            totalDoctors,
            totalFinalAllocation,
            averageScore
        });
        
        // 更新统计显示 - 使用正确的DOM元素ID
        const totalDoctorsEl = document.getElementById('totalDoctorsCount');
        const totalBonusEl = document.getElementById('totalBonusAmount');
        const totalAllocationEl = document.getElementById('totalAllocationAmount');
        const differenceEl = document.getElementById('differenceAmount');
        
        if (totalDoctorsEl) totalDoctorsEl.textContent = totalDoctors;
        if (totalBonusEl) totalBonusEl.textContent = `¥${Math.round(this.resultsData.totalBonus)}`;
        if (totalAllocationEl) totalAllocationEl.textContent = `¥${Math.round(totalFinalAllocation)}`;
        
        // 计算差额
        const difference = totalFinalAllocation - this.resultsData.totalBonus;
        if (differenceEl) {
            differenceEl.textContent = `¥${Math.round(difference)}`;
            differenceEl.className = difference >= 0 ? 'text-success' : 'text-danger';
        }
        
        // 显示权重配置信息
        if (results.config && results.config.performanceWeights) {
            const weights = results.config.performanceWeights;
            const baseSalaryRatioEl = document.getElementById('baseSalaryRatio');
            const dischargeRatioEl = document.getElementById('dischargeRatio');
            const bedDaysRatioEl = document.getElementById('bedDaysRatio');
            const attendanceRatioEl = document.getElementById('attendanceRatio');
            
            // 使用新的权重字段名
            if (baseSalaryRatioEl) baseSalaryRatioEl.textContent = `${(weights.medicalRevenue || 50)}%`;
            if (dischargeRatioEl) dischargeRatioEl.textContent = `${(weights.discharge || 20)}%`;
            if (bedDaysRatioEl) bedDaysRatioEl.textContent = `${(weights.bedDays || 20)}%`;
            if (attendanceRatioEl) attendanceRatioEl.textContent = `${(weights.attendance || 10)}%`;
        }
        
        console.log('统计概览渲染完成');
    }

    /**
     * 渲染绩效构成图表
     */
    renderChart() {
        if (!this.resultsData) return;
        
        // 如果已存在图表实例，先销毁它
        if (this.chart) {
            console.log('Results: 销毁已存在的图表实例');
            this.chart.destroy();
            this.chart = null;
        }
        
        const ctx = document.getElementById('performanceChart').getContext('2d');
        const { results } = this.resultsData;
        
        // 准备图表数据
        const labels = results.individualResults.map(r => r.doctorName);
        const totalScores = results.individualResults.map(r => r.finalScore);
        const medicalRevenueScores = results.individualResults.map(r => r.scores.medicalRevenue || 0);
        const dischargeScores = results.individualResults.map(r => r.scores.discharge);
        const bedDayScores = results.individualResults.map(r => r.scores.bedDays);
        const attendanceScores = results.individualResults.map(r => r.scores.attendance);
        
        console.log('Results: 开始创建新的图表实例');
        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: '出院人数分',
                        data: dischargeScores,
                        backgroundColor: 'rgba(255, 99, 132, 0.8)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1
                    },
                    {
                        label: '床日数分',
                        data: bedDayScores,
                        backgroundColor: 'rgba(255, 205, 86, 0.8)',
                        borderColor: 'rgba(255, 205, 86, 1)',
                        borderWidth: 1
                    },
                    {
                        label: '出勤分',
                        data: attendanceScores,
                        backgroundColor: 'rgba(75, 192, 192, 0.8)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: '绩效构成分析'
                    },
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    x: {
                        stacked: true
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true
                    }
                }
            }
        });
    }

    /**
     * 渲染当前配置信息
     */
    renderConfig() {
        const config = this.storageManager.getSystemConfig();
        
        // 提供默认配置以防止错误
        const defaultConfig = {
            weights: {
                medicalRevenue: 0.50,
                discharge: 0.25,
                bedDays: 0.15,
                attendance: 0.10
            }
        };
        
        const finalConfig = {
            weights: config?.weights || defaultConfig.weights
        };
        
        // 更新右侧配置显示卡片
        const baseSalaryRatio = document.getElementById('baseSalaryRatio');
        const dischargeRatio = document.getElementById('dischargeRatio');
        const bedDaysRatio = document.getElementById('bedDaysRatio');
        const attendanceRatio = document.getElementById('attendanceRatio');
        
        if (baseSalaryRatio) baseSalaryRatio.textContent = `${((finalConfig.weights.medicalRevenue || finalConfig.weights.baseWeight || 0.50) * 100).toFixed(0)}%`;
        if (dischargeRatio) dischargeRatio.textContent = `${((finalConfig.weights.discharge || finalConfig.weights.dischargeWeight || 0.25) * 100).toFixed(0)}%`;
        if (bedDaysRatio) bedDaysRatio.textContent = `${((finalConfig.weights.bedDays || finalConfig.weights.bedDayWeight || 0.15) * 100).toFixed(0)}%`;
        if (attendanceRatio) attendanceRatio.textContent = `${((finalConfig.weights.attendance || finalConfig.weights.attendanceWeight || 0.10) * 100).toFixed(0)}%`;
    }

    /**
     * 显示编辑模态框
     * @param {string} doctorId - 医生ID
     */
    showEditModal(doctorId) {
        const result = this.resultsData.results.individualResults.find(r => r.doctorInfo.id === doctorId);
        if (!result) return;
        
        // 填充编辑表单
        document.getElementById('editDoctorName').value = result.doctorName;
        document.getElementById('editFinalScore').value = result.finalScore.toFixed(2);
        document.getElementById('editAllocationRatio').value = ((result.finalScore / this.resultsData.results.teamStats.maxScore) * 100).toFixed(2);
        document.getElementById('editFinalCoefficient').value = result.newEmployeeCoefficient.toFixed(3);
        
        // 存储当前编辑的医生ID
        this.currentEditDoctorId = doctorId;
        
        // 显示模态框
        const modal = new bootstrap.Modal(document.getElementById('editModal'));
        modal.show();
    }
    
    /**
     * 保存编辑
     */
    saveEdit() {
        if (!this.currentEditDoctorId) return;
        
        const newScore = parseFloat(document.getElementById('editFinalScore').value);
        const newCoefficient = parseFloat(document.getElementById('editFinalCoefficient').value);
        
        if (isNaN(newScore) || isNaN(newCoefficient)) {
            this.showMessage('请输入有效的数值', 'danger');
            return;
        }
        
        // 更新结果数据
        const result = this.resultsData.results.individualResults.find(r => r.doctorInfo.id === this.currentEditDoctorId);
        if (result) {
            result.finalScore = newScore;
            result.newEmployeeCoefficient = newCoefficient;
            
            // 重新计算团队统计
            this.recalculateTeamStats();
            
            // 重新渲染结果
            this.renderResults();
            
            // 关闭模态框
            const modal = bootstrap.Modal.getInstance(document.getElementById('editModal'));
            modal.hide();
            
            this.showMessage('编辑保存成功', 'success');
        }
    }
    
    /**
      * 重新计算团队统计
      */
    recalculateTeamStats() {
        const results = this.resultsData.results.individualResults;
        const scores = results.map(r => r.finalScore);
        
        this.resultsData.results.teamStats = {
            totalDoctors: results.length,
            averageScore: scores.reduce((sum, score) => sum + score, 0) / scores.length,
            maxScore: Math.max(...scores),
            minScore: Math.min(...scores)
        };
    }
    
    /**
     * 更新最终分配核算
     */
    updateFinalAllocation(doctorId, newAmount) {
        const result = this.resultsData.results.individualResults.find(r => 
            r.doctorId === doctorId || r.doctorInfo?.id === doctorId || r.doctor?.id === doctorId
        );
        if (!result) {
            console.warn('未找到医生ID为', doctorId, '的结果数据');
            return;
        }
        
        const amount = parseFloat(newAmount) || 0;
        result.finalAllocation = amount;
        
        // 重新计算分配比例
        if (this.resultsData.totalBonus > 0) {
            result.allocationRatio = amount / this.resultsData.totalBonus;
        }
        
        // 更新sessionStorage
        sessionStorage.setItem('performanceResults', JSON.stringify(this.resultsData));
        
        // 更新汇总显示
        this.updateSummaryAmount();
        
        console.log('已更新医生', result.doctorName, '的分配金额为', amount);
    }
    
    /**
     * 更新汇总金额显示
     */
    updateSummaryAmount() {
        const totalBonus = this.resultsData.totalBonus || 0;
        
        // 计算分配汇总（实际分配的金额）
        const finalTotal = this.resultsData.results.individualResults.reduce((sum, result) => {
            return sum + (result.finalAllocation || 0);
        }, 0);
        
        // 计算分配与总额的差额
        const difference = totalBonus - finalTotal;
        
        // 更新显示
        const totalBonusEl = document.getElementById('totalBonusAmount');
        const totalAllocationEl = document.getElementById('totalAllocationAmount');
        const differenceEl = document.getElementById('differenceAmount');
        
        if (totalBonusEl) totalBonusEl.textContent = `¥${Math.round(totalBonus)}`;
        if (totalAllocationEl) totalAllocationEl.textContent = `¥${Math.round(finalTotal)}`;
        if (differenceEl) {
            differenceEl.textContent = `¥${Math.round(difference)}`;
            
            // 根据差额设置样式
            if (Math.abs(difference) < 0.01) {
                differenceEl.className = 'text-success';
            } else if (difference > 0) {
                differenceEl.className = 'text-warning';
            } else {
                differenceEl.className = 'text-danger';
            }
        }
        
        console.log('汇总金额更新:', {
            totalBonus: totalBonus.toFixed(2),
            finalTotal: finalTotal.toFixed(2),
            difference: difference.toFixed(2)
        });
    }
    
    /**
     * 显示绩效明细
     */
    showPerformanceDetail(doctorId) {
        const result = this.resultsData.results.individualResults.find(r => r.doctorInfo.id === doctorId);
        if (!result) return;
        
        const { doctorInfo, workData } = result;
        
        // 设置模态框标题为医生姓名
        document.getElementById('detailModalTitle').textContent = result.doctorName;
        document.getElementById('detailDoctorName').textContent = result.doctorName;
        document.getElementById('detailContent').innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h6>基本信息</h6>
                    <table class="table table-sm">
                        <tr><td>姓名</td><td>${result.doctorName}</td></tr>
                        <tr><td>职称</td><td>${doctorInfo.title}</td></tr>
                        <tr><td>工作年限</td><td>${doctorInfo.workYears}年</td></tr>
                        <tr><td>是否取证</td><td>${doctorInfo.isCertified ? '是' : '否'}</td></tr>
                        <tr><td>医疗业务分</td><td>${(result.scores.medicalRevenue || 0).toFixed(2)}</td></tr>
                    </table>
                </div>
                <div class="col-md-6">
                    <h6>工作数据</h6>
                    <table class="table table-sm">
                        <tr><td>出勤天数</td><td>${workData.attendanceDays}天</td></tr>
                        <tr><td>出院人数</td><td>${workData.dischargeCount}人</td></tr>
                        <tr><td>床日数</td><td>${workData.bedDays}天</td></tr>
                    </table>
                </div>
            </div>
            <div class="row mt-3">
                <div class="col-md-6">
                    <h6>系数信息</h6>
                    <table class="table table-sm">
                        <tr><td>新入职系数</td><td>${result.newEmployeeCoefficient}</td></tr>
                    </table>
                </div>
                <div class="col-md-6">
                    <h6>绩效分数</h6>
                    <table class="table table-sm">

                        <tr><td>出院人数分</td><td>${result.scores.discharge.toFixed(2)}</td></tr>
                        <tr><td>床日数分</td><td>${result.scores.bedDays.toFixed(2)}</td></tr>
                        <tr><td>出勤分</td><td>${result.scores.attendance.toFixed(2)}</td></tr>
                        <tr><td><strong>最终分数</strong></td><td><strong>${result.finalScore.toFixed(2)}</strong></td></tr>
                    </table>
                </div>
            </div>
        `;
        
        new bootstrap.Modal(document.getElementById('detailModal')).show();
    }

    /**
     * 保存结果
     */
    saveResults() {
        if (!this.resultsData) {
            this.showMessage('没有结果数据可保存', 'warning');
            return;
        }
        
        try {
            const { year, month, results } = this.resultsData;
            
            // 创建绩效记录
            const record = new PerformanceRecord({
                year,
                month,
                results: results.individualResults,
                teamStats: results.teamStats,
                config: this.storageManager.getSystemConfig()
            });
            
            this.storageManager.addPerformanceRecord(record);
            this.showMessage('结果保存成功', 'success');
            
            // 清除临时数据
            sessionStorage.removeItem('performanceResults');
            
        } catch (error) {
            this.showMessage('保存失败：' + error.message, 'danger');
        }
    }

    /**
     * 导出到Excel
     */
    exportToExcel() {
        if (!this.resultsData) {
            this.showMessage('没有数据可导出', 'warning');
            return;
        }
        
        try {
            const { year, month, results } = this.resultsData;
            const csvContent = this.calculator.exportToCSV(results.individualResults, year, month);
            
            // 创建下载链接
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.setAttribute('href', url);
            link.setAttribute('download', `绩效分配结果_${year}年${month}月.csv`);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showMessage('导出成功', 'success');
            
        } catch (error) {
            this.showMessage('导出失败：' + error.message, 'danger');
        }
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
        
        const container = document.getElementById('messageArea');
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
let resultsController;
document.addEventListener('DOMContentLoaded', () => {
    resultsController = new ResultsPageController();
});