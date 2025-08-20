/**
 * Service Worker注册
 * 注册PWA服务工作者以支持离线功能
 */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then((registration) => {
                console.log('Service Worker注册成功:', registration.scope);
                
                // 检查更新
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // 有新版本可用
                            console.log('发现新版本，准备更新');
                            if (confirm('发现新版本，是否立即更新？')) {
                                window.location.reload();
                            }
                        }
                    });
                });
            })
            .catch((error) => {
                console.log('Service Worker注册失败:', error);
            });
    });
}

/**
 * 主页面控制器
 * 负责数据录入、医生管理和绩效计算
 */
class MainPageController {
    constructor() {
        this.storageManager = new StorageManager();
        this.calculator = new PerformanceCalculator();
        this.doctors = [];
        this.workData = {};
        this.currentMonth = null;
        this.totalBonus = 0;
        
        this.init();
    }

    /**
     * 初始化页面
     */
    async init() {
        console.log('开始初始化页面...');
        
        // 首先清理无效医生数据
        await this.cleanupInvalidDoctors();
        
        await this.loadDoctors();
        this.setupEventListeners();
        
        // 恢复月份和总奖金设置
        this.restoreSettings();
        
        this.renderCombinedTable();
        this.updateDataSummary();
        
        console.log('页面初始化完成');
    }

    /**
     * 恢复月份和总奖金设置
     */
    restoreSettings() {
        // 从localStorage恢复月份设置
        const savedMonth = localStorage.getItem('performance_system_current_month');
        const monthInput = document.getElementById('currentMonth');
        
        if (savedMonth) {
            this.currentMonth = savedMonth;
            monthInput.value = savedMonth;
        } else {
            // 设置默认月份为当前月份
            const currentDate = new Date();
            const defaultMonth = currentDate.toISOString().slice(0, 7); // YYYY-MM格式
            this.currentMonth = defaultMonth;
            monthInput.value = defaultMonth;
            localStorage.setItem('performance_system_current_month', defaultMonth);
        }
        
        // 从localStorage恢复总奖金设置
        const savedBonus = localStorage.getItem('performance_system_total_bonus');
        const bonusInput = document.getElementById('totalBonus');
        
        if (savedBonus) {
            this.totalBonus = parseFloat(savedBonus);
            bonusInput.value = savedBonus;
        } else {
            // 设置默认总奖金
            const defaultBonus = 50000;
            this.totalBonus = defaultBonus;
            bonusInput.value = defaultBonus;
            localStorage.setItem('performance_system_total_bonus', defaultBonus.toString());
        }
        
        console.log('设置恢复完成 - 月份:', this.currentMonth, '总奖金:', this.totalBonus);
    }

    /**
     * 加载医生数据
     */
    async loadDoctors() {
        this.doctors = await this.storageManager.getAllDoctors() || [];
        
        // 如果没有医生数据，创建默认示例数据
        if (this.doctors.length === 0) {
            console.log('🔧 [DEBUG] 没有找到医生数据，创建默认示例数据');
            await this.initializeDefaultDoctors();
        }
    }

    /**
     * 初始化默认医生数据
     */
    async initializeDefaultDoctors() {
        console.log('🔧 [DEBUG] 开始创建默认医生数据');
        
        const defaultDoctors = [
            new Doctor(null, '张医生', '主治医师', 1.2, 5, true),
            new Doctor(null, '李医生', '副主任医师', 1.5, 8, true),
            new Doctor(null, '王医生', '住院医师', 1.0, 2, true),
            new Doctor(null, '刘医生', '主任医师', 1.8, 12, true),
            new Doctor(null, '陈医生', '住院医师', 1.0, 1, false)
        ];
        
        console.log('🔧 [DEBUG] 创建的默认医生数据:', defaultDoctors);
        
        // 保存到存储
        try {
            for (const doctor of defaultDoctors) {
                await this.storageManager.addDoctor(doctor);
                this.doctors.push(doctor);
            }
            
            console.log('🔧 [DEBUG] 默认医生数据保存成功，当前医生数量:', this.doctors.length);
            
            // 创建默认工作数据
            await this.initializeDefaultWorkData();
            
            // 刷新页面显示
            this.renderCombinedTable();
            this.updateDataSummary();
            
        } catch (error) {
            console.error('🔧 [DEBUG] 保存默认医生数据失败:', error);
        }
    }

    /**
     * 初始化默认工作数据
     */
    async initializeDefaultWorkData() {
        console.log('🔧 [DEBUG] 开始创建默认工作数据');
        
        const defaultWorkData = {
            [this.doctors[0].id]: { attendanceDays: 22, dischargeCount: 15, bedDays: 180, medicalRevenue: 50000, rewardPenalty: 0 },
            [this.doctors[1].id]: { attendanceDays: 20, dischargeCount: 20, bedDays: 220, medicalRevenue: 80000, rewardPenalty: 0 },
            [this.doctors[2].id]: { attendanceDays: 25, dischargeCount: 12, bedDays: 150, medicalRevenue: 35000, rewardPenalty: 0 },
            [this.doctors[3].id]: { attendanceDays: 18, dischargeCount: 25, bedDays: 280, medicalRevenue: 120000, rewardPenalty: 0 },
            [this.doctors[4].id]: { attendanceDays: 24, dischargeCount: 8, bedDays: 100, medicalRevenue: 25000, rewardPenalty: 0 }
        };
        
        console.log('🔧 [DEBUG] 创建的默认工作数据:', defaultWorkData);
        
        // 保存工作数据到存储
        const currentKey = this.currentMonth; // 已经是YYYY-MM格式
        try {
            await this.storageManager.saveCurrentWorkData(currentKey, defaultWorkData);
            console.log('🔧 [DEBUG] 默认工作数据保存成功');
        } catch (error) {
            console.error('🔧 [DEBUG] 保存默认工作数据失败:', error);
        }
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 添加医生按钮
        document.getElementById('addDoctorBtn').addEventListener('click', () => {
            this.showDoctorModal();
        });

        // 保存医生按钮
        document.getElementById('saveDoctorBtn').addEventListener('click', async () => {
            await this.saveDoctor();
        });

        // 月份设置按钮
        document.getElementById('setMonthBtn').addEventListener('click', () => {
            this.setCurrentMonth();
        });

        // 总奖金输入
        document.getElementById('totalBonus').addEventListener('input', (e) => {
            this.updateTotalBonus(e.target.value);
        });

        // 计算按钮
        document.getElementById('calculateBtn').addEventListener('click', () => {
            this.calculatePerformance();
        });

        // 保存数据按钮
        document.getElementById('saveDataBtn').addEventListener('click', async () => {
            await this.saveCurrentData();
        });

        // 加载历史按钮
        document.getElementById('loadHistoryBtn').addEventListener('click', () => {
            this.showHistoryModal();
        });

        // 预览数据按钮
        document.getElementById('previewDataBtn').addEventListener('click', () => {
            this.previewData();
        });

        // 清理无效数据按钮
        const cleanupBtn = document.getElementById('cleanupInvalidBtn');
        if (cleanupBtn) {
            cleanupBtn.addEventListener('click', async () => {
                await this.cleanupInvalidDoctors();
            });
        }

        // 职称选择变化
        document.getElementById('doctorTitle').addEventListener('change', (e) => {
            this.updateTitleCoefficient(e.target.value);
        });
    }

    /**
     * 添加新医生
     */
    addNewDoctor() {
        this.showDoctorModal();
    }

    /**
     * 显示医生添加/编辑模态框
     */
    showDoctorModal(doctorId = null) {
        const modal = new bootstrap.Modal(document.getElementById('doctorModal'));
        const form = document.getElementById('doctorForm');
        const title = document.getElementById('doctorModalTitle');
        const deleteBtn = document.getElementById('deleteDoctorBtn');
        
        // 重置表单
        form.reset();
        
        if (doctorId) {
            // 编辑模式
            const doctor = this.doctors.find(d => d.id === doctorId);
            if (doctor) {
                title.textContent = '编辑医生信息';
                document.getElementById('doctorId').value = doctor.id;
                document.getElementById('doctorName').value = doctor.name;
                document.getElementById('doctorTitle').value = doctor.title;
                document.getElementById('titleCoefficient').value = doctor.titleCoefficient;
                
                // 显示删除按钮
                deleteBtn.style.display = 'inline-block';
                deleteBtn.onclick = async () => await this.confirmDeleteDoctor(doctorId);
            }
        } else {
            // 添加模式
            title.textContent = '添加医生';
            document.getElementById('doctorId').value = '';
            
            // 隐藏删除按钮
            deleteBtn.style.display = 'none';
        }
        
        modal.show();
    }

    /**
     * 保存医生信息
     */
    async saveDoctor() {
        const form = document.getElementById('doctorForm');
        
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const doctorId = document.getElementById('doctorId').value;
        const name = document.getElementById('doctorName').value.trim();
        const title = document.getElementById('doctorTitle').value;
        const titleCoefficient = parseFloat(document.getElementById('titleCoefficient').value);

        // 验证医生数据
        const doctorData = { name, title, titleCoefficient };
        const validation = this.validateDoctorData(doctorData);
        
        if (!validation.valid) {
            this.showMessage('数据验证失败：' + validation.message, 'danger');
            return;
        }

        try {
            if (doctorId) {
                // 更新现有医生
                const doctor = this.doctors.find(d => d.id === doctorId);
                if (doctor) {
                    doctor.name = name;
                    doctor.title = title;
                    doctor.titleCoefficient = titleCoefficient;
                    // 修复调用方式：传递doctorId和updateData
                    await this.storageManager.updateDoctor(doctorId, {
                        name: name,
                        title: title,
                        titleCoefficient: titleCoefficient
                    });
                }
            } else {
                // 添加新医生
                const newDoctor = new Doctor(
                    null, // ID will be auto-generated
                    name,
                    title,
                    titleCoefficient,
                    0, // workYears
                    true, // isCertified
                    0 // baseSalary
                );
                
                await this.storageManager.addDoctor(newDoctor);
                this.doctors.push(newDoctor);
            }

            // 关闭模态框
            const modal = bootstrap.Modal.getInstance(document.getElementById('doctorModal'));
            modal.hide();

            // 重新渲染表格
            this.renderCombinedTable();
            this.updateDataSummary();
            
            this.showMessage('医生信息保存成功', 'success');
            
        } catch (error) {
            console.error('保存医生信息失败:', error);
            this.showMessage('保存失败：' + error.message, 'danger');
        }
    }

    /**
     * 更新职称系数
     */
    updateTitleCoefficient(title) {
        const coefficientMap = {
            '住院医师': 1.0,
            '主治医师': 1.2,
            '副主任医师': 1.5,
            '主任医师': 1.8
        };
        
        const coefficient = coefficientMap[title] || 1.0;
        document.getElementById('titleCoefficient').value = coefficient;
    }

    /**
     * 渲染综合表格
     */
    renderCombinedTable() {
        const tbody = document.getElementById('combinedTableBody');
        tbody.innerHTML = '';

        if (this.doctors.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="8" class="text-center text-muted py-4">
                    <i class="fas fa-user-plus fa-2x mb-2"></i><br>
                    暂无医生信息，请点击"添加医生"按钮添加
                </td>
            `;
            tbody.appendChild(row);
            return;
        }

        // 获取当月总天数
        const currentMonth = document.getElementById('currentMonth')?.value || new Date().toISOString().slice(0, 7);
        const daysInMonth = this.getDaysInMonth(currentMonth);

        this.doctors.forEach(doctor => {
            const workData = this.workData[doctor.id] || {};
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>
                    <strong>${doctor.name} (${doctor.titleCoefficient})</strong><br>
                    <small class="text-muted">${doctor.title}</small>
                </td>
                <td>
                    <input type="number" class="form-control form-control-sm" 
                           data-field="attendanceDays" data-doctor-id="${doctor.id}" 
                           value="${workData.attendanceDays !== undefined ? workData.attendanceDays : daysInMonth}" 
                           min="0" max="31" placeholder=""
                           onchange="mainController.updateWorkData('${doctor.id}', 'attendanceDays', this.value)">
                </td>
                <td>
                    <input type="number" class="form-control form-control-sm" 
                           data-field="dischargeCount" data-doctor-id="${doctor.id}" 
                           value="${workData.dischargeCount || ''}" 
                           min="0" placeholder=""
                           onchange="mainController.updateWorkData('${doctor.id}', 'dischargeCount', this.value)">
                </td>
                <td>
                    <input type="number" class="form-control form-control-sm" 
                           data-field="medicalRevenue" data-doctor-id="${doctor.id}" 
                           value="${workData.medicalRevenue || ''}" 
                           min="0" step="0.01" placeholder=""
                           onchange="mainController.updateWorkData('${doctor.id}', 'medicalRevenue', this.value)">
                </td>
                <td>
                    <input type="number" class="form-control form-control-sm" 
                           data-field="bedDays" data-doctor-id="${doctor.id}" 
                           value="${workData.bedDays || ''}" 
                           min="0" placeholder=""
                           onchange="mainController.updateWorkData('${doctor.id}', 'bedDays', this.value)">
                </td>
                <td>
                    <input type="number" class="form-control form-control-sm" 
                           data-field="deduction" data-doctor-id="${doctor.id}" 
                           value="${workData.deduction !== undefined ? workData.deduction : 0}" 
                           min="0" step="0.01" placeholder=""
                           onchange="mainController.updateWorkData('${doctor.id}', 'deduction', this.value)">
                </td>
                <td>
                    <button class="btn btn-primary btn-sm w-100" 
                            onclick="mainController.showDoctorModal('${doctor.id}')">
                        <i class="fas fa-edit me-1"></i>编辑
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }

    /**
     * 更新工作数据
     */
    async updateWorkData(doctorId, field, value) {
        try {
            const numValue = parseFloat(value) || 0;
            
            if (!this.workData[doctorId]) {
                this.workData[doctorId] = {
                    doctorId: doctorId,
                    attendanceDays: 0,
                    dischargeCount: 0,
                    bedDays: undefined,
                    medicalRevenue: 0, // 新增医疗收入字段
                    rewardPenalty: 0
                };
            }
            
            this.workData[doctorId][field] = numValue;
            
            // 保存到存储
            await this.storageManager.saveCurrentWorkData(`workData_${doctorId}`, this.workData[doctorId]);
            
            // 更新数据汇总
            this.updateDataSummary();
            
        } catch (error) {
            console.error('更新工作数据失败:', error);
            this.showMessage('更新数据失败：' + error.message, 'danger');
        }
    }



    /**
     * 确认删除医生（从模态框中调用）
     */
    async confirmDeleteDoctor(doctorId) {
        const doctor = this.doctors.find(d => d.id === doctorId);
        if (!doctor) {
            this.showMessage('未找到要删除的医生信息', 'danger');
            return;
        }
        
        if (!confirm(`确定要删除医生 "${doctor.name}" 的信息吗？\n\n删除后将无法恢复，包括该医生的所有工作数据。`)) {
            return;
        }
        
        await this.deleteDoctor(doctorId);
        
        // 关闭模态框
        const modal = bootstrap.Modal.getInstance(document.getElementById('doctorModal'));
        if (modal) {
            modal.hide();
        }
    }

    /**
     * 删除医生
     */
    async deleteDoctor(doctorId) {
        try {
            // 从存储中删除
            await this.storageManager.deleteDoctor(doctorId);
            await this.storageManager.deleteWorkDataByDoctorId(doctorId);
            
            // 从内存中删除
            this.doctors = this.doctors.filter(d => d.id !== doctorId);
            delete this.workData[doctorId];
            
            // 重新渲染
            this.renderCombinedTable();
            this.updateDataSummary();
            
            this.showMessage('医生信息删除成功', 'success');
            
        } catch (error) {
            console.error('删除医生失败:', error);
            this.showMessage('删除失败：' + error.message, 'danger');
        }
    }

    /**
     * 检查并删除无姓名的医生数据
     */
    async cleanupInvalidDoctors() {
        console.log('开始检查无效医生数据...');
        
        // 直接从localStorage检查原始数据
        const rawDoctorsData = localStorage.getItem('performance_system_doctors');
        console.log('localStorage中的原始医生数据:', rawDoctorsData);
        
        if (!rawDoctorsData) {
            console.log('localStorage中没有医生数据');
            this.showMessage('没有找到医生数据', 'info');
            return;
        }
        
        let doctorsArray;
        try {
            doctorsArray = JSON.parse(rawDoctorsData);
        } catch (e) {
            console.error('解析医生数据失败:', e);
            this.showMessage('医生数据格式错误', 'danger');
            return;
        }
        
        console.log('解析后的医生数组:', doctorsArray);
        console.log('医生数组长度:', doctorsArray.length);
        
        // 详细检查每个医生记录
        doctorsArray.forEach((doctor, index) => {
            console.log(`医生 ${index}:`, {
                name: doctor.name,
                nameType: typeof doctor.name,
                nameLength: doctor.name ? doctor.name.length : 0,
                trimmedName: doctor.name ? doctor.name.trim() : '',
                id: doctor.id,
                title: doctor.title,
                fullDoctor: doctor
            });
        });
        
        // 找出无效的医生记录
        const validDoctors = [];
        const invalidDoctors = [];
        
        doctorsArray.forEach(doctor => {
            const name = doctor.name;
            const isInvalid = !name || 
                            name === null || 
                            name === undefined || 
                            (typeof name === 'string' && name.trim() === '') ||
                            name === 'undefined' ||
                            name === 'null';
            
            if (isInvalid) {
                invalidDoctors.push(doctor);
                console.log('发现无效医生:', doctor);
            } else {
                validDoctors.push(doctor);
            }
        });
        
        console.log('有效医生数量:', validDoctors.length);
        console.log('无效医生数量:', invalidDoctors.length);
        console.log('无效医生列表:', invalidDoctors);
        
        if (invalidDoctors.length === 0) {
            this.showMessage('未发现无姓名的医生数据', 'info');
            return;
        }
        
        // 删除无效医生的工作数据
        for (const doctor of invalidDoctors) {
            if (doctor.id) {
                try {
                    await this.storageManager.deleteWorkDataByDoctorId(doctor.id);
                    console.log('已删除工作数据:', doctor.id);
                } catch (error) {
                    console.log('删除工作数据时出错:', error.message);
                }
            }
        }
        
        // 保存清理后的医生列表
        try {
            localStorage.setItem('performance_system_doctors', JSON.stringify(validDoctors));
            console.log('已保存清理后的医生列表');
            
            // 重新加载数据
            await this.loadDoctors();
            this.renderCombinedTable();
            this.updateDataSummary();
            
            this.showMessage(`已删除 ${invalidDoctors.length} 个无姓名的医生记录`, 'success');
            console.log('无效医生数据清理完成');
            
        } catch (error) {
             console.error('保存清理后的数据失败:', error);
             this.showMessage('清理数据时发生错误', 'danger');
         }
    }

    /**
     * 验证医生数据有效性
     */
    validateDoctorData(doctor) {
        if (!doctor) {
            return { valid: false, message: '医生数据为空' };
        }
        
        if (!doctor.name || doctor.name.trim() === '') {
            return { valid: false, message: '医生姓名不能为空' };
        }
        
        if (!doctor.title || doctor.title.trim() === '') {
            return { valid: false, message: '医生职称不能为空' };
        }
        
        if (typeof doctor.titleCoefficient !== 'number' || doctor.titleCoefficient <= 0) {
            return { valid: false, message: '职称系数必须为正数' };
        }
        
        return { valid: true, message: '数据有效' };
    }

    /**
     * 设置当前月份
     */
    // 在 MainPageController 类中添加以下方法
    
    /**
     * 获取指定月份的天数
     */
    getDaysInMonth(yearMonth) {
        if (!yearMonth) return 30; // 默认30天
        
        const [year, month] = yearMonth.split('-').map(Number);
        return new Date(year, month, 0).getDate();
    }
    
    /**
     * 设置当前月份（修改版）
     */
    setCurrentMonth() {
        const monthInput = document.getElementById('currentMonth');
        const monthValue = monthInput.value;
        
        if (!monthValue) {
            // 如果输入框为空，使用当前设置的月份或默认月份
            if (this.currentMonth) {
                monthInput.value = this.currentMonth;
            } else {
                const currentDate = new Date();
                const defaultMonth = currentDate.toISOString().slice(0, 7);
                this.currentMonth = defaultMonth;
                monthInput.value = defaultMonth;
                localStorage.setItem('performance_system_current_month', defaultMonth);
            }
            this.showMessage('已使用默认月份设置', 'info');
        } else {
            this.currentMonth = monthValue;
            // 保存到localStorage
            localStorage.setItem('performance_system_current_month', monthValue);
        }
        
        const daysInMonth = this.getDaysInMonth(this.currentMonth);
        
        // 自动更新所有医生的出勤天数为该月的实际天数
        this.updateAllAttendanceDays(daysInMonth);
        
        this.updateDataSummary();
        this.showMessage(`月份设置成功，该月共${daysInMonth}天，已自动设置为默认出勤天数`, 'success');
    }
    
    /**
     * 更新所有医生的出勤天数
     */
    updateAllAttendanceDays(days) {
        this.doctors.forEach(doctor => {
            if (!this.workData[doctor.id]) {
                this.workData[doctor.id] = {
                    doctorId: doctor.id,
                    attendanceDays: days,
                    dischargeCount: 0,
                    bedDays: 0,
                    rewardPenalty: 0
                };
            } else {
                // 只在出勤天数为0或未设置时才自动设置
                if (!this.workData[doctor.id].attendanceDays || this.workData[doctor.id].attendanceDays === 0) {
                    this.workData[doctor.id].attendanceDays = days;
                }
            }
            
            // 保存到存储
            this.storageManager.saveCurrentWorkData(`workData_${doctor.id}`, this.workData[doctor.id]);
        });
        
        // 重新渲染表格以显示更新后的数据
        this.renderCombinedTable();
    }
    


    /**
     * 更新职称系数
     */
    updateTitleCoefficient(title) {
        const coefficientMap = {
            '住院医师': 1.0,
            '主治医师': 1.2,
            '副主任医师': 1.5,
            '主任医师': 1.8
        };
        
        const coefficient = coefficientMap[title] || 1.0;
        document.getElementById('titleCoefficient').value = coefficient;
    }

    /**
     * 渲染综合表格
     */
    renderCombinedTable() {
        const tbody = document.getElementById('combinedTableBody');
        tbody.innerHTML = '';

        // 过滤掉无效的医生数据（姓名为空、null、undefined或只包含空格）
        const validDoctors = this.doctors.filter(doctor => {
            return doctor && doctor.name && typeof doctor.name === 'string' && doctor.name.trim() !== '';
        });

        console.log('原始医生数量:', this.doctors.length);
        console.log('有效医生数量:', validDoctors.length);
        console.log('过滤后的医生列表:', validDoctors);

        if (validDoctors.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="9" class="text-center text-muted py-4">
                    <i class="fas fa-user-plus fa-2x mb-2"></i><br>
                    暂无医生信息，请点击"添加医生"按钮添加
                </td>
            `;
            tbody.appendChild(row);
            return;
        }

        // 获取当前选择月份的总天数
        const currentMonthDays = this.currentMonth ? this.getDaysInMonth(this.currentMonth) : 30;

        validDoctors.forEach(doctor => {
            const workData = this.workData[doctor.id] || {};
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>
                    <strong>${doctor.name}</strong><br>
                    <small class="text-muted">${doctor.title}</small>
                </td>
                <td>
                    <input type="number" class="form-control form-control-sm" 
                           data-field="attendanceDays" data-doctor-id="${doctor.id}" 
                           value="${workData.attendanceDays !== undefined ? workData.attendanceDays : ''}" 
                           min="0" max="31" placeholder=""
                           onchange="mainController.updateWorkData('${doctor.id}', 'attendanceDays', this.value)">
                </td>
                <td>
                    <input type="number" class="form-control form-control-sm" 
                           data-field="dischargeCount" data-doctor-id="${doctor.id}" 
                           value="${workData.dischargeCount || ''}" 
                           min="0" placeholder=""
                           onchange="mainController.updateWorkData('${doctor.id}', 'dischargeCount', this.value)">
                </td>
                <td>
                    <input type="number" class="form-control form-control-sm" 
                           data-field="bedDays" data-doctor-id="${doctor.id}" 
                           value="${workData.bedDays || ''}" 
                           min="0" placeholder=""
                           onchange="mainController.updateWorkData('${doctor.id}', 'bedDays', this.value)">
                </td>
                <td>
                    <div class="input-group input-group-sm" style="width: 150px;">
                        <select class="form-select" style="max-width: 50px;" 
                                data-field="rewardPenaltySign" data-doctor-id="${doctor.id}"
                                onchange="mainController.updateRewardPenaltySign('${doctor.id}', this.value)">
                            <option value="+" ${(workData.rewardPenalty || 0) >= 0 ? 'selected' : ''}>+</option>
                            <option value="-" ${(workData.rewardPenalty || 0) < 0 ? 'selected' : ''}>-</option>
                        </select>
                        <input type="number" class="form-control" 
                               data-field="rewardPenalty" data-doctor-id="${doctor.id}" 
                               value="${Math.abs(workData.rewardPenalty || 0)}" 
                               min="0" step="0.01" placeholder="" style="width: 100px;"
                               onchange="mainController.updateRewardPenalty('${doctor.id}', this.value)">
                    </div>
                </td>
                <td>
                    <div class="d-flex flex-column gap-1">
                        <button class="btn btn-outline-primary btn-sm" 
                                onclick="mainController.showDoctorModal('${doctor.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-success btn-sm" 
                                onclick="mainController.addNewDoctor()">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button class="btn btn-outline-danger btn-sm" 
                                onclick="mainController.deleteDoctor('${doctor.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }



    /**
     * 更新奖罚金额
     */
    updateRewardPenalty(doctorId, value) {
        try {
            const numValue = parseFloat(value) || 0;
            
            if (!this.workData[doctorId]) {
                this.workData[doctorId] = {
                    doctorId: doctorId,
                    attendanceDays: 0,
                    dischargeCount: 0,
                    bedDays: 0,
                    medicalRevenue: 0,
                    rewardPenalty: 0
                };
            }
            
            // 获取当前符号
            const signSelect = document.querySelector(`select[data-field="rewardPenaltySign"][data-doctor-id="${doctorId}"]`);
            const sign = signSelect ? signSelect.value : '+';
            
            // 根据符号设置正负值
            this.workData[doctorId].rewardPenalty = sign === '+' ? numValue : -numValue;
            
            // 保存到存储
            this.storageManager.saveCurrentWorkData(`workData_${doctorId}`, this.workData[doctorId]);
            
            // 更新数据汇总
            this.updateDataSummary();
            
        } catch (error) {
            console.error('更新奖罚数据失败:', error);
            this.showMessage('更新奖罚数据失败：' + error.message, 'danger');
        }
    }

    /**
     * 更新奖罚符号
     */
    updateRewardPenaltySign(doctorId, sign) {
        try {
            if (!this.workData[doctorId]) {
                this.workData[doctorId] = {
                    doctorId: doctorId,
                    attendanceDays: 0,
                    dischargeCount: 0,
                    bedDays: 0,
                    medicalRevenue: 0,
                    deduction: 0,
                    bonus: 0,
                    rewardPenalty: 0
                };
            }
            
            // 获取当前数值
            const currentValue = Math.abs(this.workData[doctorId].rewardPenalty || 0);
            
            // 根据符号设置正负值
            this.workData[doctorId].rewardPenalty = sign === '+' ? currentValue : -currentValue;
            
            // 保存到存储
            this.storageManager.saveCurrentWorkData(`workData_${doctorId}`, this.workData[doctorId]);
            
            // 更新数据汇总
            this.updateDataSummary();
            
        } catch (error) {
            console.error('更新奖罚符号失败:', error);
            this.showMessage('更新奖罚符号失败：' + error.message, 'danger');
        }
    }





    /**
     * 更新总奖金
     */
    updateTotalBonus(value) {
        this.totalBonus = parseFloat(value) || 0;
        // 保存到localStorage
        localStorage.setItem('performance_system_total_bonus', this.totalBonus.toString());
        this.updateDataSummary();
    }

    /**
     * 更新数据汇总显示
     */
    updateDataSummary() {
        // 过滤有效医生并更新医生数量
        const validDoctors = this.doctors.filter(doctor => {
            return doctor && doctor.name && typeof doctor.name === 'string' && doctor.name.trim() !== '';
        });
        const doctorCountBadge = document.getElementById('doctorCountBadge');
        doctorCountBadge.textContent = validDoctors.length;
        doctorCountBadge.className = validDoctors.length > 0 ? 'badge bg-success ms-2' : 'badge bg-secondary ms-2';

        // 更新月份状态
        const monthStatusBadge = document.getElementById('monthStatusBadge');
        if (this.currentMonth) {
            monthStatusBadge.textContent = this.currentMonth;
            monthStatusBadge.className = 'badge bg-success ms-2';
        } else {
            monthStatusBadge.textContent = '未设置';
            monthStatusBadge.className = 'badge bg-secondary ms-2';
        }

        // 更新奖金状态
        const bonusStatusBadge = document.getElementById('bonusStatusBadge');
        if (this.totalBonus > 0) {
            bonusStatusBadge.textContent = `${this.totalBonus}元`;
            bonusStatusBadge.className = 'badge bg-success ms-2';
        } else {
            bonusStatusBadge.textContent = '未设置';
            bonusStatusBadge.className = 'badge bg-secondary ms-2';
        }

        // 更新工作数据状态
        const workDataStatusBadge = document.getElementById('workDataStatusBadge');
        const hasWorkData = Object.keys(this.workData).length > 0;
        if (hasWorkData) {
            workDataStatusBadge.textContent = '已录入';
            workDataStatusBadge.className = 'badge bg-success ms-2';
        } else {
            workDataStatusBadge.textContent = '未录入';
            workDataStatusBadge.className = 'badge bg-secondary ms-2';
        }
    }

    /**
     * 预览数据
     */
    previewData() {
        // 实现数据预览功能
        console.log('预览数据功能');
    }

    /**
     * 计算绩效
     */
    calculatePerformance() {
        console.log('=== 开始绩效计算 ===');
        console.log('原始医生数据:', this.doctors);
        console.log('原始工作数据:', this.workData);
        console.log('当前月份:', this.currentMonth);
        console.log('总奖金:', this.totalBonus);
        
        try {
            // 过滤有效医生
            const validDoctors = this.doctors.filter(doctor => {
                const isValid = doctor && doctor.name && typeof doctor.name === 'string' && doctor.name.trim() !== '';
                console.log(`医生 ${doctor?.name || '未知'} 有效性检查:`, isValid, doctor);
                return isValid;
            });
            
            console.log('过滤后的有效医生:', validDoctors);
            console.log('有效医生数量:', validDoctors.length);
            
            // 验证数据完整性
            if (validDoctors.length === 0) {
                console.error('验证失败: 没有有效医生');
                this.showMessage('请先添加医生信息', 'warning');
                return;
            }

            if (!this.currentMonth) {
                console.error('验证失败: 没有设置月份');
                this.showMessage('请先设置计算月份', 'warning');
                return;
            }

            if (this.totalBonus <= 0) {
                console.error('验证失败: 总奖金无效', this.totalBonus);
                this.showMessage('请设置总奖金数额', 'warning');
                return;
            }
            
            console.log('数据验证通过，开始准备计算数据...');

            // 准备计算数据 - 组合医生信息和工作数据
            const doctorsWithData = validDoctors.map(doctor => {
                console.log(`处理医生 ${doctor.name} (ID: ${doctor.id})`);
                
                const doctorData = {
                    ...doctor
                };
                console.log('医生数据:', doctorData);

                // 获取或创建工作数据
                const existingWorkData = this.workData[doctor.id];
                console.log(`医生 ${doctor.name} 的现有工作数据:`, existingWorkData);
                
                const workData = existingWorkData || {
                    doctorId: doctor.id,
                    attendanceDays: this.getDaysInCurrentMonth(), // 默认为当月天数
                    dischargeCount: 0,
                    bedDays: 0,
                    medicalRevenue: 0, // 添加医疗业务总额
                    rewardPenalty: 0  // 默认奖罚为0
                };
                
                console.log(`医生 ${doctor.name} 的最终工作数据:`, workData);

                const combinedData = {
                    doctor: doctorData,
                    workData: workData
                };
                
                console.log(`医生 ${doctor.name} 的组合数据:`, combinedData);
                return combinedData;
            });

            console.log('=== 准备计算的完整数据 ===');
            console.log('医生数量:', doctorsWithData.length);
            console.log('详细数据:', doctorsWithData);
            console.log('总奖金:', this.totalBonus);

            // 执行计算
            console.log('=== 开始调用计算器 ===');
            console.log('传递给计算器的参数:');
            console.log('- doctorsWithData:', doctorsWithData);
            console.log('- totalBonus:', this.totalBonus);
            
            const result = this.calculator.calculateTeamPerformance(doctorsWithData, this.totalBonus);
            
            console.log('=== 计算器返回结果 ===');
            console.log('计算结果:', result);
            console.log('individualResults数量:', result?.individualResults?.length || 0);
            console.log('teamStats:', result?.teamStats);
            console.log('groupStats:', result?.groupStats);
            
            // 保存计算结果到sessionStorage供results.html使用
            try {
                // 解析currentMonth（格式："YYYY-MM"）为年份和月份
                const [yearFromMonth, monthFromMonth] = this.currentMonth.split('-');
                const dataToSave = {
                    year: parseInt(yearFromMonth),
                    month: parseInt(monthFromMonth),
                    totalBonus: this.totalBonus,
                    calculationTime: new Date().toISOString(),
                    results: {
                        individualResults: result.individualResults,
                        teamStats: result.teamStats,
                        groupStats: result.groupStats,
                        config: result.config
                    },
                    dataIntegrity: {
                        calculationSuccessful: true,
                        timestamp: new Date().toISOString()
                    }
                };
                
                console.log('=== 准备保存到sessionStorage ===');
                console.log('保存的数据结构:', dataToSave);
                console.log('individualResults数量:', dataToSave.results.individualResults?.length || 0);
                
                const jsonString = JSON.stringify(dataToSave);
                console.log('JSON字符串长度:', jsonString.length);
                console.log('JSON字符串前500字符:', jsonString.substring(0, 500));
                
                sessionStorage.setItem('performanceResults', jsonString);
                
                // 验证保存是否成功
                const savedData = sessionStorage.getItem('performanceResults');
                console.log('验证保存结果 - 数据长度:', savedData?.length || 0);
                
                if (savedData) {
                    const parsedSavedData = JSON.parse(savedData);
                    console.log('验证保存结果 - individualResults数量:', parsedSavedData.results?.individualResults?.length || 0);
                    console.log('绩效计算结果已成功保存到sessionStorage');
                } else {
                    throw new Error('保存验证失败：sessionStorage中没有找到数据');
                }
            } catch (error) {
                console.error('保存计算结果到sessionStorage失败:', error);
                console.error('错误详情:', error.stack);
                this.showMessage('保存计算结果失败：' + error.message, 'danger');
                return;
            }
            
            // 同时保存当前数据到localStorage作为备份
            console.log('=== 保存备份数据到localStorage ===');
            try {
                this.storageManager.saveCurrentData({
                    doctors: this.doctors,
                    workData: this.workData,
                    currentMonth: this.currentMonth,
                    totalBonus: this.totalBonus
                });
                console.log('备份数据保存成功');
            } catch (backupError) {
                console.error('备份数据保存失败:', backupError);
            }
            
            console.log('=== 准备跳转到结果页面 ===');
            console.log('即将跳转到 results.html');
            
            window.location.href = 'results.html';
            
        } catch (error) {
            console.error('=== 计算绩效过程中发生错误 ===');
            console.error('错误信息:', error.message);
            console.error('错误堆栈:', error.stack);
            console.error('当前状态:');
            console.error('- 医生数据:', this.doctors);
            console.error('- 工作数据:', this.workData);
            console.error('- 当前月份:', this.currentMonth);
            console.error('- 总奖金:', this.totalBonus);
            this.showMessage('计算失败：' + error.message, 'danger');
        }
    }

    /**
     * 保存当前数据
     */
    async saveCurrentData() {
        try {
            // 保存医生信息
            await this.storageManager.saveDoctors(this.doctors);
            
            // 保存工作数据
            for (const [doctorId, data] of Object.entries(this.workData)) {
                await this.storageManager.saveCurrentWorkData(`workData_${doctorId}`, data);
            }
            
            // 保存到历史记录
            this.saveToHistory();
            
            this.showMessage('数据保存成功', 'success');
            
        } catch (error) {
            console.error('保存数据失败:', error);
            this.showMessage('保存失败：' + error.message, 'danger');
        }
    }

    /**
     * 保存数据到历史记录
     */
    saveToHistory() {
        try {
            const historyData = {
                id: Date.now().toString(), // 使用时间戳作为唯一ID
                saveTime: new Date().toISOString(),
                displayTime: new Date().toLocaleString('zh-CN'),
                doctors: JSON.parse(JSON.stringify(this.doctors)), // 深拷贝
                workData: JSON.parse(JSON.stringify(this.workData)), // 深拷贝
                currentMonth: this.currentMonth,
                totalBonus: this.totalBonus,
                doctorCount: this.doctors.length,
                hasWorkData: Object.keys(this.workData).length > 0
            };

            // 获取现有历史记录
            const existingHistory = JSON.parse(localStorage.getItem('performance_system_history') || '[]');
            
            // 添加新记录到开头
            existingHistory.unshift(historyData);
            
            // 限制历史记录数量（保留最近20条）
            if (existingHistory.length > 20) {
                existingHistory.splice(20);
            }
            
            // 保存到localStorage
            localStorage.setItem('performance_system_history', JSON.stringify(existingHistory));
            
            console.log('历史数据保存成功:', historyData);
            
        } catch (error) {
            console.error('保存历史数据失败:', error);
        }
    }

    /**
     * 获取历史记录列表
     */
    getHistoryList() {
        try {
            return JSON.parse(localStorage.getItem('performance_system_history') || '[]');
        } catch (error) {
            console.error('获取历史记录失败:', error);
            return [];
        }
    }

    /**
     * 从历史记录加载数据
     */
    loadFromHistory(historyId) {
        try {
            const historyList = this.getHistoryList();
            const historyData = historyList.find(item => item.id === historyId);
            
            if (!historyData) {
                this.showMessage('未找到指定的历史记录', 'warning');
                return false;
            }
            
            // 恢复数据
            this.doctors = historyData.doctors || [];
            this.workData = historyData.workData || {};
            this.currentMonth = historyData.currentMonth || '';
            this.totalBonus = historyData.totalBonus || 0;
            
            // 更新界面
            this.renderCombinedTable();
            this.updateDataSummary();
            
            // 更新月份选择器
            const monthSelect = document.getElementById('monthSelect');
            if (monthSelect && this.currentMonth) {
                monthSelect.value = this.currentMonth;
            }
            
            // 更新总奖金输入框
            const bonusInput = document.getElementById('totalBonusInput');
            if (bonusInput) {
                bonusInput.value = this.totalBonus;
            }
            
            this.showMessage(`历史数据加载成功 (${historyData.displayTime})`, 'success');
            return true;
            
        } catch (error) {
            console.error('加载历史数据失败:', error);
            this.showMessage('加载历史数据失败：' + error.message, 'danger');
            return false;
        }
    }

    /**
     * 显示历史记录选择模态框
     */
    showHistoryModal() {
        const historyList = this.getHistoryList();
        
        if (historyList.length === 0) {
            this.showMessage('暂无历史记录', 'info');
            return;
        }
        
        // 创建模态框HTML
        const modalHtml = `
            <div class="modal fade" id="historyModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header bg-info text-white">
                            <h5 class="modal-title">
                                <i class="fas fa-history me-2"></i>
                                选择历史记录
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="table-responsive">
                                <table class="table table-hover">
                                    <thead class="table-light">
                                        <tr>
                                            <th>保存时间</th>
                                            <th>月份</th>
                                            <th>医生数量</th>
                                            <th>总奖金</th>
                                            <th>工作数据</th>
                                            <th>操作</th>
                                        </tr>
                                    </thead>
                                    <tbody id="historyTableBody">
                                        ${this.generateHistoryTableRows(historyList)}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                            <button type="button" class="btn btn-danger" id="clearAllHistoryBtn">
                                <i class="fas fa-trash me-1"></i>
                                清空所有历史
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 移除已存在的模态框
        const existingModal = document.getElementById('historyModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // 添加新模态框到页面
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // 设置事件监听器
        this.setupHistoryModalEventListeners();
        
        // 显示模态框
        const modal = new bootstrap.Modal(document.getElementById('historyModal'));
        modal.show();
        
        // 模态框关闭时清理DOM
        document.getElementById('historyModal').addEventListener('hidden.bs.modal', () => {
            document.getElementById('historyModal').remove();
        });
    }
    
    /**
     * 生成历史记录表格行
     */
    generateHistoryTableRows(historyList) {
        return historyList.map(history => {
            const workDataStatus = history.hasWorkData ? 
                '<span class="badge bg-success">已录入</span>' : 
                '<span class="badge bg-secondary">未录入</span>';
            
            return `
                <tr>
                    <td>${history.displayTime}</td>
                    <td>${history.currentMonth || '未设置'}</td>
                    <td>${history.doctorCount}</td>
                    <td>${history.totalBonus ? history.totalBonus + '元' : '未设置'}</td>
                    <td>${workDataStatus}</td>
                    <td>
                        <button class="btn btn-primary btn-sm load-history-btn" data-history-id="${history.id}">
                            <i class="fas fa-download me-1"></i>
                            加载
                        </button>
                        <button class="btn btn-danger btn-sm ms-1 delete-history-btn" data-history-id="${history.id}">
                            <i class="fas fa-trash me-1"></i>
                            删除
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    /**
     * 设置历史记录模态框事件监听器
     */
    setupHistoryModalEventListeners() {
        // 加载历史记录按钮
        document.addEventListener('click', (e) => {
            if (e.target.closest('.load-history-btn')) {
                const historyId = e.target.closest('.load-history-btn').dataset.historyId;
                this.loadFromHistory(historyId);
                
                // 关闭模态框
                const modal = bootstrap.Modal.getInstance(document.getElementById('historyModal'));
                if (modal) {
                    modal.hide();
                }
            }
        });
        
        // 删除单个历史记录按钮
        document.addEventListener('click', (e) => {
            if (e.target.closest('.delete-history-btn')) {
                const historyId = e.target.closest('.delete-history-btn').dataset.historyId;
                this.deleteHistoryRecord(historyId);
            }
        });
        
        // 清空所有历史记录按钮
        const clearAllBtn = document.getElementById('clearAllHistoryBtn');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => {
                this.clearAllHistory();
            });
        }
    }
    
    /**
     * 删除单个历史记录
     */
    deleteHistoryRecord(historyId) {
        if (!confirm('确定要删除这条历史记录吗？')) {
            return;
        }
        
        try {
            const historyList = this.getHistoryList();
            const updatedList = historyList.filter(item => item.id !== historyId);
            localStorage.setItem('performance_system_history', JSON.stringify(updatedList));
            
            // 刷新模态框内容
            this.refreshHistoryModal();
            this.showMessage('历史记录删除成功', 'success');
            
        } catch (error) {
            console.error('删除历史记录失败:', error);
            this.showMessage('删除失败：' + error.message, 'danger');
        }
    }
    
    /**
     * 清空所有历史记录
     */
    clearAllHistory() {
        if (!confirm('确定要清空所有历史记录吗？此操作不可恢复！')) {
            return;
        }
        
        try {
            localStorage.removeItem('performance_system_history');
            
            // 关闭模态框
            const modal = bootstrap.Modal.getInstance(document.getElementById('historyModal'));
            if (modal) {
                modal.hide();
            }
            
            this.showMessage('所有历史记录已清空', 'success');
            
        } catch (error) {
            console.error('清空历史记录失败:', error);
            this.showMessage('清空失败：' + error.message, 'danger');
        }
    }
    
    /**
     * 刷新历史记录模态框内容
     */
    refreshHistoryModal() {
        const historyList = this.getHistoryList();
        const tbody = document.getElementById('historyTableBody');
        
        if (tbody) {
            if (historyList.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">暂无历史记录</td></tr>';
            } else {
                tbody.innerHTML = this.generateHistoryTableRows(historyList);
            }
        }
    }

    /**
     * 显示消息
     */
    showMessage(message, type = 'info') {
        const messageArea = document.getElementById('messageArea');
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        messageArea.appendChild(alertDiv);
        
        // 自动移除消息
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }
}

// 页面加载完成后初始化控制器
document.addEventListener('DOMContentLoaded', () => {
    window.mainController = new MainPageController();
});