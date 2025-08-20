/**
 * 历史查询页面逻辑
 * 负责历史记录查询、统计分析和数据对比
 */

class HistoryPageController {
    constructor() {
        this.storageManager = new StorageManager();
        this.allRecords = [];
        this.filteredRecords = [];
        this.trendChart = null;
        
        this.init();
    }

    /**
     * 初始化页面
     */
    init() {
        this.loadHistoryRecords();
        this.setupEventListeners();
        this.initializeFilters();
        this.renderHistoryList();
        this.renderTrendChart();
        this.renderStatistics();
    }

    /**
     * 加载历史记录
     */
    loadHistoryRecords() {
        this.allRecords = this.storageManager.getAllPerformanceRecords();
        this.filteredRecords = [...this.allRecords];
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 查询条件变更
        document.getElementById('yearSelect').addEventListener('change', () => this.applyFilters());
        document.getElementById('monthSelect').addEventListener('change', () => this.applyFilters());
        document.getElementById('doctorSelect').addEventListener('change', () => this.applyFilters());
        
        // 重置按钮
        document.getElementById('resetBtn').addEventListener('click', () => this.resetFilters());
        
        // 历史记录列表点击事件
        document.getElementById('historyTableBody').addEventListener('click', (e) => {
            if (e.target.classList.contains('view-detail-btn')) {
                const recordId = e.target.dataset.recordId;
                this.showRecordDetail(recordId);
            } else if (e.target.classList.contains('compare-btn')) {
                const recordId = e.target.dataset.recordId;
                this.addToComparison(recordId);
            }
        });
        
        // 对比分析按钮
        document.getElementById('compareAnalysisBtn').addEventListener('click', () => this.showComparisonModal());
    }

    /**
     * 初始化筛选器
     */
    initializeFilters() {
        // 获取所有年份
        const years = [...new Set(this.allRecords.map(r => r.year))].sort((a, b) => b - a);
        const yearSelect = document.getElementById('yearFilter');
        yearSelect.innerHTML = '<option value="">全部年份</option>';
        years.forEach(year => {
            yearSelect.innerHTML += `<option value="${year}">${year}年</option>`;
        });
        
        // 获取所有医生
        const doctors = this.storageManager.getAllDoctors();
        const doctorSelect = document.getElementById('doctorFilter');
        doctorSelect.innerHTML = '<option value="">全部医生</option>';
        doctors.forEach(doctor => {
            doctorSelect.innerHTML += `<option value="${doctor.id}">${doctor.name}</option>`;
        });
    }

    /**
     * 应用筛选条件
     */
    applyFilters() {
        const yearFilter = document.getElementById('yearFilter').value;
        const monthFilter = document.getElementById('monthFilter').value;
        const doctorFilter = document.getElementById('doctorFilter').value;
        
        this.filteredRecords = this.allRecords.filter(record => {
            // 年份筛选
            if (yearFilter && record.year !== parseInt(yearFilter)) {
                return false;
            }
            
            // 月份筛选
            if (monthFilter && record.month !== parseInt(monthFilter)) {
                return false;
            }
            
            // 医生筛选
            if (doctorFilter) {
                const hasDoctor = record.results.some(result => result.doctor.id === doctorFilter);
                if (!hasDoctor) {
                    return false;
                }
            }
            
            return true;
        });
        
        this.renderHistoryList();
        this.renderTrendChart();
        this.renderStatistics();
    }

    /**
     * 重置筛选条件
     */
    resetFilters() {
        document.getElementById('yearFilter').value = '';
        document.getElementById('monthFilter').value = '';
        document.getElementById('doctorFilter').value = '';
        
        this.filteredRecords = [...this.allRecords];
        this.renderHistoryList();
        this.renderTrendChart();
        this.renderStatistics();
    }

    /**
     * 渲染历史记录列表
     */
    renderHistoryList() {
        const container = document.getElementById('historyList');
        container.innerHTML = '';
        
        if (this.filteredRecords.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                    <p class="text-muted">暂无历史记录</p>
                </div>
            `;
            return;
        }
        
        // 按时间倒序排列
        const sortedRecords = this.filteredRecords.sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year;
            return b.month - a.month;
        });
        
        sortedRecords.forEach(record => {
            const card = document.createElement('div');
            card.className = 'col-md-6 col-lg-4 mb-3';
            
            const stats = record.getStatistics();
            
            card.innerHTML = `
                <div class="card h-100">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h6 class="mb-0">${record.year}年${record.month}月</h6>
                        <small class="text-muted">${new Date(record.timestamp).toLocaleDateString()}</small>
                    </div>
                    <div class="card-body">
                        <div class="row text-center">
                            <div class="col-6">
                                <div class="border-end">
                                    <h5 class="text-primary mb-1">${stats.participantCount}</h5>
                                    <small class="text-muted">参与人数</small>
                                </div>
                            </div>
                            <div class="col-6">
                                <h5 class="text-success mb-1">${stats.averageScore.toFixed(1)}</h5>
                                <small class="text-muted">平均绩效</small>
                            </div>
                        </div>
                        <hr>
                        <div class="row text-center">
                            <div class="col-6">
                                <small class="text-muted">最高: ${stats.maxScore.toFixed(1)}</small>
                            </div>
                            <div class="col-6">
                                <small class="text-muted">最低: ${stats.minScore.toFixed(1)}</small>
                            </div>
                        </div>
                    </div>
                    <div class="card-footer">
                        <div class="btn-group w-100" role="group">
                            <button class="btn btn-outline-primary btn-sm view-detail-btn" data-record-id="${record.id}">
                                <i class="fas fa-eye"></i> 详情
                            </button>
                            <button class="btn btn-outline-secondary btn-sm compare-btn" data-record-id="${record.id}">
                                <i class="fas fa-balance-scale"></i> 对比
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            container.appendChild(card);
        });
    }

    /**
     * 渲染趋势图表
     */
    renderTrendChart() {
        const ctx = document.getElementById('trendChart').getContext('2d');
        
        if (this.trendChart) {
            this.trendChart.destroy();
        }
        
        if (this.filteredRecords.length === 0) {
            return;
        }
        
        // 准备图表数据
        const sortedRecords = this.filteredRecords.sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            return a.month - b.month;
        });
        
        const labels = sortedRecords.map(r => `${r.year}年${r.month}月`);
        const avgScores = sortedRecords.map(r => r.getStatistics().averageScore);
        const maxScores = sortedRecords.map(r => r.getStatistics().maxScore);
        const minScores = sortedRecords.map(r => r.getStatistics().minScore);
        const participantCounts = sortedRecords.map(r => r.getStatistics().participantCount);
        
        this.trendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: '平均绩效',
                        data: avgScores,
                        borderColor: 'rgba(54, 162, 235, 1)',
                        backgroundColor: 'rgba(54, 162, 235, 0.1)',
                        tension: 0.4,
                        yAxisID: 'y'
                    },
                    {
                        label: '最高绩效',
                        data: maxScores,
                        borderColor: 'rgba(255, 99, 132, 1)',
                        backgroundColor: 'rgba(255, 99, 132, 0.1)',
                        tension: 0.4,
                        yAxisID: 'y'
                    },
                    {
                        label: '最低绩效',
                        data: minScores,
                        borderColor: 'rgba(255, 205, 86, 1)',
                        backgroundColor: 'rgba(255, 205, 86, 0.1)',
                        tension: 0.4,
                        yAxisID: 'y'
                    },
                    {
                        label: '参与人数',
                        data: participantCounts,
                        borderColor: 'rgba(75, 192, 192, 1)',
                        backgroundColor: 'rgba(75, 192, 192, 0.1)',
                        tension: 0.4,
                        yAxisID: 'y1',
                        type: 'bar'
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: '绩效趋势分析'
                    },
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: '绩效'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: '参与人数'
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                }
            }
        });
    }

    /**
     * 渲染统计概览
     */
    renderStatistics() {
        if (this.filteredRecords.length === 0) {
            document.getElementById('statisticsOverview').innerHTML = `
                <div class="text-center py-3">
                    <p class="text-muted">暂无统计数据</p>
                </div>
            `;
            return;
        }
        
        // 计算总体统计
        const totalRecords = this.filteredRecords.length;
        const totalParticipants = this.filteredRecords.reduce((sum, r) => sum + r.getStatistics().participantCount, 0);
        const avgParticipants = (totalParticipants / totalRecords).toFixed(1);
        
        const allScores = this.filteredRecords.flatMap(r => r.results.map(result => result.totalScore));
        const overallAvg = (allScores.reduce((sum, score) => sum + score, 0) / allScores.length).toFixed(2);
        const overallMax = Math.max(...allScores).toFixed(2);
        const overallMin = Math.min(...allScores).toFixed(2);
        
        document.getElementById('statisticsOverview').innerHTML = `
            <div class="row">
                <div class="col-md-3">
                    <div class="card text-center">
                        <div class="card-body">
                            <h4 class="text-primary">${totalRecords}</h4>
                            <p class="card-text">总记录数</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card text-center">
                        <div class="card-body">
                            <h4 class="text-success">${avgParticipants}</h4>
                            <p class="card-text">平均参与人数</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card text-center">
                        <div class="card-body">
                            <h4 class="text-info">${overallAvg}</h4>
                            <p class="card-text">总体平均绩效</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card text-center">
                        <div class="card-body">
                            <h4 class="text-warning">${overallMax}</h4>
                            <p class="card-text">历史最高绩效</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 显示记录详情
     */
    showRecordDetail(recordId) {
        const record = this.allRecords.find(r => r.id === recordId);
        if (!record) return;
        
        document.getElementById('detailTitle').textContent = `${record.year}年${record.month}月绩效详情`;
        
        // 渲染详情表格
        const tbody = document.getElementById('detailTableBody');
        tbody.innerHTML = '';
        
        record.results.forEach((result, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${result.doctor.name}</td>
                <td>${result.doctor.title}</td>
                <td>${result.totalScore.toFixed(2)}</td>
                <td>${result.percentage.toFixed(2)}%</td>
                <td>${result.finalCoefficient.toFixed(3)}</td>
            `;
            tbody.appendChild(row);
        });
        
        new bootstrap.Modal(document.getElementById('detailModal')).show();
    }

    /**
     * 添加到对比列表
     */
    addToComparison(recordId) {
        const record = this.allRecords.find(r => r.id === recordId);
        if (!record) return;
        
        // 获取当前对比列表
        let comparisonList = JSON.parse(sessionStorage.getItem('comparisonList') || '[]');
        
        // 检查是否已存在
        if (comparisonList.some(item => item.id === recordId)) {
            this.showMessage('该记录已在对比列表中', 'warning');
            return;
        }
        
        // 限制对比数量
        if (comparisonList.length >= 3) {
            this.showMessage('最多只能对比3个记录', 'warning');
            return;
        }
        
        comparisonList.push({
            id: record.id,
            year: record.year,
            month: record.month,
            title: `${record.year}年${record.month}月`
        });
        
        sessionStorage.setItem('comparisonList', JSON.stringify(comparisonList));
        this.updateComparisonButton();
        this.showMessage('已添加到对比列表', 'success');
    }

    /**
     * 更新对比按钮状态
     */
    updateComparisonButton() {
        const comparisonList = JSON.parse(sessionStorage.getItem('comparisonList') || '[]');
        const btn = document.getElementById('compareAnalysisBtn');
        
        if (comparisonList.length >= 2) {
            btn.disabled = false;
            btn.innerHTML = `<i class="fas fa-chart-line"></i> 对比分析 (${comparisonList.length})`;
        } else {
            btn.disabled = true;
            btn.innerHTML = `<i class="fas fa-chart-line"></i> 对比分析 (需要至少2个记录)`;
        }
    }

    /**
     * 显示对比分析模态框
     */
    showComparisonModal() {
        const comparisonList = JSON.parse(sessionStorage.getItem('comparisonList') || '[]');
        if (comparisonList.length < 2) {
            this.showMessage('需要至少2个记录才能进行对比', 'warning');
            return;
        }
        
        // 获取对比记录
        const records = comparisonList.map(item => 
            this.allRecords.find(r => r.id === item.id)
        ).filter(r => r);
        
        // 渲染对比内容
        this.renderComparisonContent(records);
        
        new bootstrap.Modal(document.getElementById('comparisonModal')).show();
    }

    /**
     * 渲染对比内容
     */
    renderComparisonContent(records) {
        const container = document.getElementById('comparisonContent');
        
        // 创建对比表格
        let tableHTML = `
            <table class="table table-bordered">
                <thead>
                    <tr>
                        <th>指标</th>
                        ${records.map(r => `<th>${r.year}年${r.month}月</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
        `;
        
        // 参与人数对比
        tableHTML += `
            <tr>
                <td>参与人数</td>
                ${records.map(r => `<td>${r.getStatistics().participantCount}</td>`).join('')}
            </tr>
        `;
        
        // 平均绩效对比
        tableHTML += `
            <tr>
                <td>平均绩效</td>
                ${records.map(r => `<td>${r.getStatistics().averageScore.toFixed(2)}</td>`).join('')}
            </tr>
        `;
        
        // 最高绩效对比
        tableHTML += `
            <tr>
                <td>最高绩效</td>
                ${records.map(r => `<td>${r.getStatistics().maxScore.toFixed(2)}</td>`).join('')}
            </tr>
        `;
        
        // 最低绩效对比
        tableHTML += `
            <tr>
                <td>最低绩效</td>
                ${records.map(r => `<td>${r.getStatistics().minScore.toFixed(2)}</td>`).join('')}
            </tr>
        `;
        
        tableHTML += '</tbody></table>';
        
        // 清空对比列表按钮
        tableHTML += `
            <div class="text-end mt-3">
                <button class="btn btn-outline-secondary" onclick="historyController.clearComparisonList()">
                    <i class="fas fa-trash"></i> 清空对比列表
                </button>
            </div>
        `;
        
        container.innerHTML = tableHTML;
    }

    /**
     * 清空对比列表
     */
    clearComparisonList() {
        sessionStorage.removeItem('comparisonList');
        this.updateComparisonButton();
        bootstrap.Modal.getInstance(document.getElementById('comparisonModal')).hide();
        this.showMessage('对比列表已清空', 'success');
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
let historyController;
document.addEventListener('DOMContentLoaded', () => {
    historyController = new HistoryPageController();
    historyController.updateComparisonButton();
});