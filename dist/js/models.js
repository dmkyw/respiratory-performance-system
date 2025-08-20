/**
 * 科室绩效分配系统 - 数据模型定义
 * 定义系统中使用的所有数据结构和模型类
 */

/**
 * 医生信息模型
 */
class Doctor {
    /**
     * 构造函数
     * @param {string} id - 医生ID
     * @param {string} name - 姓名
     * @param {string} title - 职称
     * @param {number} titleCoefficient - 职称系数
     * @param {number} workYears - 工作年限
     * @param {boolean} isCertified - 是否已取证
     */
    constructor(id, name, title, titleCoefficient, workYears, isCertified) {
        this.id = id || this.generateId();
        this.name = name || '';
        this.title = title || '住院医师';
        this.titleCoefficient = titleCoefficient || 1.0;
        this.workYears = workYears || 0;
        this.isCertified = isCertified !== undefined ? isCertified : true;
        // 移除 baseSalary 字段
        this.createdAt = new Date().toISOString();
        this.updatedAt = new Date().toISOString();
    }

    /**
     * 生成唯一ID
     * @returns {string} 唯一标识符
     */
    generateId() {
        return 'doctor_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * 获取新入职人员系数
     * @param {Object} config - 系统配置
     * @returns {number} 新入职人员系数
     */
    getNewEmployeeCoefficient(config = {}) {
        const defaultConfig = {
            uncertifiedCoeff: 0.6,
            certifiedWithinThreeYearsCoeff: 0.8,
            normalCoeff: 1.0,
            newEmployeeThreshold: 3
        };
        
        const cfg = { ...defaultConfig, ...config };
        
        // 如果工作年限超过阈值，返回正常系数
        if (this.workYears > cfg.newEmployeeThreshold) {
            return cfg.normalCoeff;
        }
        
        // 未取证
        if (!this.isCertified) {
            return cfg.uncertifiedCoeff;
        }
        
        // 已取证但在三年内
        if (this.workYears <= cfg.newEmployeeThreshold) {
            return cfg.certifiedWithinThreeYearsCoeff;
        }
        
        return cfg.normalCoeff;
    }

    /**
     * 验证医生数据
     * @returns {Object} 验证结果
     */
    validate() {
        const errors = [];
        
        if (!this.name || this.name.trim() === '') {
            errors.push('姓名不能为空');
        }
        
        if (!this.title || this.title.trim() === '') {
            errors.push('职称不能为空');
        }
        
        if (this.titleCoefficient <= 0) {
            errors.push('职称系数必须大于0');
        }
        
        if (this.workYears < 0) {
            errors.push('工作年限不能为负数');
        }
        
        // baseSalary字段已移除，不再验证
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * 转换为JSON对象
     * @returns {Object} JSON对象
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            title: this.title,
            titleCoefficient: this.titleCoefficient,
            workYears: this.workYears,
            isCertified: this.isCertified,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    /**
     * 从JSON对象创建Doctor实例
     * @param {Object} json - JSON对象
     * @returns {Doctor} Doctor实例
     */
    static fromJSON(json) {
        const doctor = new Doctor(
            json.id,
            json.name,
            json.title,
            json.titleCoefficient,
            json.workYears,
            json.isCertified
        );
        doctor.createdAt = json.createdAt || doctor.createdAt;
        doctor.updatedAt = json.updatedAt || doctor.updatedAt;
        return doctor;
    }
}

/**
 * 月度工作数据模型
 */
class MonthlyWorkData {
    /**
     * 构造函数
     * @param {string} doctorId - 医生ID
     * @param {number} attendanceDays - 出勤天数
     * @param {number} dischargeCount - 出院人数
     * @param {number} bedDays - 床日数
     * @param {number} medicalRevenue - 医疗收入
     * @param {number} rewardPenalty - 奖罚金额（正数为奖励，负数为扣除）
     */
    constructor(doctorId, attendanceDays, dischargeCount, bedDays, medicalRevenue, rewardPenalty) {
        this.doctorId = doctorId || '';
        this.attendanceDays = attendanceDays || 0;
        this.dischargeCount = dischargeCount || 0;
        this.bedDays = bedDays || 0;
        this.medicalRevenue = medicalRevenue || 0; // 新增：医疗收入字段
        this.rewardPenalty = rewardPenalty || 0; // 奖罚金额（正数为奖励，负数为扣除）
    }

    /**
     * 验证工作数据
     * @returns {Object} 验证结果
     */
    validate() {
        const errors = [];
        
        if (!this.doctorId) {
            errors.push('医生ID不能为空');
        }
        
        if (this.attendanceDays < 0 || this.attendanceDays > 31) {
            errors.push('出勤天数应在0-31之间');
        }
        
        if (this.dischargeCount < 0) {
            errors.push('出院人数不能为负数');
        }
        
        if (this.bedDays < 0) {
            errors.push('床日数不能为负数');
        }
        
        if (this.medicalRevenue < 0) {
            errors.push('医疗收入不能为负数');
        }
        
        // rewardPenalty可以为正数（奖励）或负数（扣除），无需验证范围
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * 转换为JSON对象
     * @returns {Object} JSON对象
     */
    toJSON() {
        return {
            doctorId: this.doctorId,
            attendanceDays: this.attendanceDays,
            dischargeCount: this.dischargeCount,
            bedDays: this.bedDays,
            medicalRevenue: this.medicalRevenue,
            rewardPenalty: this.rewardPenalty
        };
    }

    /**
     * 从JSON对象创建MonthlyWorkData实例
     * @param {Object} json - JSON对象
     * @returns {MonthlyWorkData} MonthlyWorkData实例
     */
    static fromJSON(json) {
        return new MonthlyWorkData(
            json.doctorId,
            json.attendanceDays,
            json.dischargeCount,
            json.bedDays,
            json.medicalRevenue,
            json.rewardPenalty
        );
    }
}

/**
 * 绩效记录模型
 */
class PerformanceRecord {
    /**
     * 构造函数
     * @param {string} id - 记录ID
     * @param {string} year - 年份
     * @param {string} month - 月份
     * @param {Array} doctors - 医生列表
     * @param {Array} workData - 工作数据列表
     * @param {Array} results - 计算结果列表
     * @param {Object} config - 计算配置
     */
    constructor(id, year, month, doctors, workData, results, config) {
        this.id = id || this.generateId();
        this.year = year || new Date().getFullYear().toString();
        this.month = month || (new Date().getMonth() + 1).toString();
        this.doctors = doctors || [];
        this.workData = workData || [];
        this.results = results || [];
        this.config = config || {};
        this.createdAt = new Date().toISOString();
        this.updatedAt = new Date().toISOString();
    }

    /**
     * 生成唯一ID
     * @returns {string} 唯一标识符
     */
    generateId() {
        return 'record_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * 获取年月字符串
     * @returns {string} 年月字符串
     */
    getYearMonth() {
        return `${this.year}-${this.month.padStart(2, '0')}`;
    }

    /**
     * 获取统计信息
     * @returns {Object} 统计信息
     */
    getStatistics() {
        if (!this.results || this.results.length === 0) {
            return {
                participantCount: 0,
                averageScore: 0,
                maxScore: 0,
                minScore: 0,
                totalScore: 0
            };
        }

        const scores = this.results.map(r => r.finalScore || 0);
        const totalScore = scores.reduce((sum, score) => sum + score, 0);
        
        return {
            participantCount: this.results.length,
            averageScore: totalScore / this.results.length,
            maxScore: Math.max(...scores),
            minScore: Math.min(...scores),
            totalScore: totalScore
        };
    }

    /**
     * 验证绩效记录
     * @returns {Object} 验证结果
     */
    validate() {
        const errors = [];
        
        if (!this.year || this.year.trim() === '') {
            errors.push('年份不能为空');
        }
        
        if (!this.month || this.month.trim() === '') {
            errors.push('月份不能为空');
        }
        
        const monthNum = parseInt(this.month);
        if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
            errors.push('月份必须在1-12之间');
        }
        
        if (!Array.isArray(this.doctors)) {
            errors.push('医生列表必须是数组');
        }
        
        if (!Array.isArray(this.workData)) {
            errors.push('工作数据列表必须是数组');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * 转换为JSON对象
     * @returns {Object} JSON对象
     */
    toJSON() {
        return {
            id: this.id,
            year: this.year,
            month: this.month,
            doctors: this.doctors.map(d => d.toJSON ? d.toJSON() : d),
            workData: this.workData.map(w => w.toJSON ? w.toJSON() : w),
            results: this.results,
            config: this.config,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    /**
     * 从JSON对象创建PerformanceRecord实例
     * @param {Object} json - JSON对象
     * @returns {PerformanceRecord} PerformanceRecord实例
     */
    static fromJSON(json) {
        const doctors = (json.doctors || []).map(d => 
            d instanceof Doctor ? d : Doctor.fromJSON(d)
        );
        const workData = (json.workData || []).map(w => 
            w instanceof MonthlyWorkData ? w : MonthlyWorkData.fromJSON(w)
        );
        
        const record = new PerformanceRecord(
            json.id,
            json.year,
            json.month,
            doctors,
            workData,
            json.results || [],
            json.config || {}
        );
        
        record.createdAt = json.createdAt || record.createdAt;
        record.updatedAt = json.updatedAt || record.updatedAt;
        
        return record;
    }
}

/**
 * 系统配置模型
 */
class SystemConfig {
    /**
     * 构造函数
     * @param {Object} config - 配置对象
     */
    constructor(config = {}) {
        // 绩效计算权重配置
        this.performanceWeights = {
            medicalRevenue: config.performanceWeights?.medicalRevenue || config.performanceWeights?.baseSalary || 50,
            discharge: config.performanceWeights?.discharge || 15,
            bedDays: config.performanceWeights?.bedDays || 25,
            attendance: config.performanceWeights?.attendance || 10
        };
        
        // 职称系数配置
        this.titleCoefficients = config.titleCoefficients || [
            { name: '住院医师', coefficient: 1.0, description: '初级职称' },
            { name: '主治医师', coefficient: 1.2, description: '中级职称' },
            { name: '副主任医师', coefficient: 1.5, description: '副高级职称' },
            { name: '主任医师', coefficient: 1.8, description: '正高级职称' }
        ];
        
        // 新入职人员系数配置
        this.newEmployeeConfig = {
            uncertifiedCoeff: config.newEmployeeConfig?.uncertifiedCoeff || 0.6,
            certifiedWithinThreeYearsCoeff: config.newEmployeeConfig?.certifiedWithinThreeYearsCoeff || 0.8,
            normalCoeff: config.newEmployeeConfig?.normalCoeff || 1.0,
            newEmployeeThreshold: config.newEmployeeConfig?.newEmployeeThreshold || 3
        };
        
        // 系统选项配置
        this.systemOptions = {
            autoSave: config.systemOptions?.autoSave !== undefined ? config.systemOptions.autoSave : true,
            confirmDelete: config.systemOptions?.confirmDelete !== undefined ? config.systemOptions.confirmDelete : true,
            decimalPlaces: config.systemOptions?.decimalPlaces || 2,
            maxHistoryRecords: config.systemOptions?.maxHistoryRecords || 100
        };
        
        this.updatedAt = new Date().toISOString();
    }

    /**
     * 验证权重总和
     * @returns {boolean} 权重总和是否为100
     */
    validateWeights() {
        const total = this.performanceWeights.medicalRevenue + 
                     this.performanceWeights.discharge + 
                     this.performanceWeights.bedDays + 
                     this.performanceWeights.attendance;
        return Math.abs(total - 100) < 0.01; // 允许小数误差
    }

    /**
     * 获取职称系数
     * @param {string} titleName - 职称名称
     * @returns {number} 职称系数
     */
    getTitleCoefficient(titleName) {
        const title = this.titleCoefficients.find(t => t.name === titleName);
        return title ? title.coefficient : 1.0;
    }

    /**
     * 添加或更新职称系数
     * @param {string} name - 职称名称
     * @param {number} coefficient - 系数值
     * @param {string} description - 描述
     */
    setTitleCoefficient(name, coefficient, description = '') {
        const existingIndex = this.titleCoefficients.findIndex(t => t.name === name);
        const titleData = { name, coefficient, description };
        
        if (existingIndex >= 0) {
            this.titleCoefficients[existingIndex] = titleData;
        } else {
            this.titleCoefficients.push(titleData);
        }
        
        this.updatedAt = new Date().toISOString();
    }

    /**
     * 删除职称系数
     * @param {string} name - 职称名称
     */
    removeTitleCoefficient(name) {
        this.titleCoefficients = this.titleCoefficients.filter(t => t.name !== name);
        this.updatedAt = new Date().toISOString();
    }

    /**
     * 重置为默认配置
     */
    resetToDefault() {
        const defaultConfig = new SystemConfig();
        Object.assign(this, defaultConfig);
    }

    /**
     * 转换为JSON对象
     * @returns {Object} JSON对象
     */
    toJSON() {
        return {
            performanceWeights: this.performanceWeights,
            titleCoefficients: this.titleCoefficients,
            newEmployeeConfig: this.newEmployeeConfig,
            systemOptions: this.systemOptions,
            updatedAt: this.updatedAt
        };
    }

    /**
     * 从JSON对象创建SystemConfig实例
     * @param {Object} json - JSON对象
     * @returns {SystemConfig} SystemConfig实例
     */
    static fromJSON(json) {
        const config = new SystemConfig(json);
        config.updatedAt = json.updatedAt || config.updatedAt;
        return config;
    }
}

// 导出模型类
if (typeof module !== 'undefined' && module.exports) {
    // Node.js环境
    module.exports = {
        Doctor,
        MonthlyWorkData,
        PerformanceRecord,
        SystemConfig
    };
} else {
    // 浏览器环境
    window.Doctor = Doctor;
    window.MonthlyWorkData = MonthlyWorkData;
    window.PerformanceRecord = PerformanceRecord;
    window.SystemConfig = SystemConfig;
}