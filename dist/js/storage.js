/**
 * 科室绩效分配系统 - 存储管理器
 * 实现本地数据存储、检索和管理功能
 * 支持localStorage和PocketBase两种存储方式
 */

/**
 * 本地存储管理器类
 */
class StorageManager {
    constructor() {
        this.storageKeys = {
            doctors: 'performance_system_doctors',
            records: 'performance_system_records',
            config: 'performance_system_config',
            currentData: 'performance_system_current_data',
            totalBonus: 'performance_system_total_bonus'
        };
        
        // 检查是否启用PocketBase
        this.usePocketBase = this.shouldUsePocketBase();
        
        if (this.usePocketBase) {
            this.pocketBaseStorage = new PocketBaseStorageManager();
        }
        
        // 初始化存储
        this.initializeStorage();
    }
    
    /**
     * 检查是否应该使用PocketBase
     */
    shouldUsePocketBase() {
        // 检查是否有PocketBase配置
        const pbUrl = localStorage.getItem('pocketbase_url') || 
                     window.POCKETBASE_URL || 
                     (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1');
        
        return pbUrl && typeof PocketBaseStorageManager !== 'undefined';
    }

    /**
     * 初始化存储
     */
    initializeStorage() {
        // 检查是否支持localStorage
        if (!this.isStorageSupported()) {
            console.warn('LocalStorage不支持，数据将无法持久化保存');
            return;
        }

        // 初始化默认配置
        if (!this.getConfig()) {
            this.saveConfig(new SystemConfig());
        }

        // 初始化医生列表
        if (!this.getDoctors()) {
            this.saveDoctors([]);
        }

        // 初始化绩效记录
        if (!this.getRecords()) {
            this.saveRecords([]);
        }
    }

    /**
     * 检查是否支持localStorage
     * @returns {boolean} 是否支持
     */
    isStorageSupported() {
        try {
            const test = 'test';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * 安全的JSON解析
     * @param {string} jsonString - JSON字符串
     * @param {*} defaultValue - 默认值
     * @returns {*} 解析结果或默认值
     */
    safeJSONParse(jsonString, defaultValue = null) {
        try {
            return JSON.parse(jsonString);
        } catch (e) {
            console.warn('JSON解析失败:', e);
            return defaultValue;
        }
    }

    /**
     * 安全的JSON字符串化
     * @param {*} data - 要序列化的数据
     * @returns {string} JSON字符串
     */
    safeJSONStringify(data) {
        try {
            return JSON.stringify(data);
        } catch (e) {
            console.error('JSON序列化失败:', e);
            return '{}';
        }
    }

    // ==================== 医生数据管理 ====================

    /**
     * 获取所有医生
     * @returns {Array<Doctor>} 医生列表
     */
    async getDoctors() {
        if (this.usePocketBase) {
            return await this.pocketBaseStorage.getDoctors();
        }
        
        if (!this.isStorageSupported()) return [];
        
        const doctorsData = localStorage.getItem(this.storageKeys.doctors);
        if (!doctorsData) return [];
        
        const doctorsJson = this.safeJSONParse(doctorsData, []);
        return doctorsJson.map(d => Doctor.fromJSON(d));
    }

    /**
     * 保存医生列表
     * @param {Array<Doctor>} doctors - 医生列表
     * @returns {boolean} 是否保存成功
     */
    async saveDoctors(doctors) {
        if (this.usePocketBase) {
            return await this.pocketBaseStorage.saveDoctors(doctors);
        }
        
        if (!this.isStorageSupported()) return false;
        
        try {
            const doctorsJson = doctors.map(d => d.toJSON ? d.toJSON() : d);
            localStorage.setItem(this.storageKeys.doctors, this.safeJSONStringify(doctorsJson));
            return true;
        } catch (e) {
            console.error('保存医生数据失败:', e);
            return false;
        }
    }

    /**
     * 添加医生
     * @param {Doctor} doctor - 医生对象
     * @returns {boolean} 是否添加成功
     */
    async addDoctor(doctor) {
        if (this.usePocketBase) {
            return await this.pocketBaseStorage.addDoctor(doctor);
        }
        
        const doctors = await this.getDoctors();
        
        // 检查是否已存在同名医生
        const existingDoctor = doctors.find(d => d.name === doctor.name);
        if (existingDoctor) {
            throw new Error(`医生 ${doctor.name} 已存在`);
        }
        
        doctors.push(doctor);
        return await this.saveDoctors(doctors);
    }

    /**
     * 更新医生信息
     * @param {string} doctorId - 医生ID
     * @param {Object} updateData - 更新数据
     * @returns {boolean} 是否更新成功
     */
    async updateDoctor(doctorId, updateData) {
        if (this.usePocketBase) {
            return await this.pocketBaseStorage.updateDoctor(doctorId, updateData);
        }
        
        const doctors = await this.getDoctors();
        const doctorIndex = doctors.findIndex(d => d.id === doctorId);
        
        if (doctorIndex === -1) {
            throw new Error('医生不存在');
        }
        
        // 更新医生信息
        Object.assign(doctors[doctorIndex], updateData);
        doctors[doctorIndex].updatedAt = new Date().toISOString();
        
        return await this.saveDoctors(doctors);
    }

    /**
     * 删除医生
     * @param {string} doctorId - 医生ID
     * @returns {boolean} 是否删除成功
     */
    async deleteDoctor(doctorId) {
        if (this.usePocketBase) {
            return await this.pocketBaseStorage.deleteDoctor(doctorId);
        }
        
        console.log('StorageManager.deleteDoctor 被调用，医生ID:', doctorId);
        
        const doctors = await this.getDoctors();
        console.log('当前医生列表:', doctors);
        
        const filteredDoctors = doctors.filter(d => d.id !== doctorId);
        console.log('过滤后的医生列表:', filteredDoctors);
        
        if (filteredDoctors.length === doctors.length) {
            console.error('医生不存在，ID:', doctorId);
            throw new Error('医生不存在');
        }
        
        // 删除医生相关的所有工作数据
        console.log('开始删除医生工作数据...');
        const workDataDeleted = await this.deleteWorkDataByDoctorId(doctorId);
        console.log('工作数据删除结果:', workDataDeleted);
        
        const saveResult = await this.saveDoctors(filteredDoctors);
        console.log('医生列表保存结果:', saveResult);
        
        return saveResult;
    }

    /**
     * 删除指定医生的所有工作数据
     * @param {string} doctorId - 医生ID
     * @returns {boolean} 是否删除成功
     */
    async deleteWorkDataByDoctorId(doctorId) {
        if (this.usePocketBase) {
            return await this.pocketBaseStorage.deleteWorkDataByDoctorId(doctorId);
        }
        
        if (!this.isStorageSupported()) return false;
        
        try {
            // 获取所有工作数据键
            const keysToUpdate = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('workData_')) {
                    keysToUpdate.push(key);
                }
            }
            
            // 从每个月份的工作数据中删除该医生的数据
            keysToUpdate.forEach(key => {
                const data = localStorage.getItem(key);
                if (data) {
                    const workData = this.safeJSONParse(data, {});
                    if (workData[doctorId]) {
                        delete workData[doctorId];
                        localStorage.setItem(key, this.safeJSONStringify(workData));
                    }
                }
            });
            
            return true;
        } catch (e) {
            console.error('删除医生工作数据失败:', e);
            return false;
        }
    }

    /**
     * 保存单个医生的工作数据
     * @param {string} doctorId - 医生ID
     * @param {Object} workData - 工作数据
     * @returns {boolean} 是否保存成功
     */
    async saveWorkData(doctorId, workData) {
        if (this.usePocketBase) {
            return await this.pocketBaseStorage.saveWorkData(doctorId, workData);
        }
        
        if (!this.isStorageSupported()) return false;
        
        try {
            // 获取当前年月
            const now = new Date();
            const year = now.getFullYear();
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            const key = `${year}-${month}`;
            
            // 获取当前月份的所有工作数据
            const currentData = this.getCurrentWorkData(key) || {};
            
            // 更新指定医生的数据
            currentData[doctorId] = workData;
            
            // 保存回存储
            return this.saveCurrentWorkData(key, currentData);
        } catch (e) {
            console.error('保存工作数据失败:', e);
            return false;
        }
    }

    /**
     * 根据ID获取医生
     * @param {string} doctorId - 医生ID
     * @returns {Doctor|null} 医生对象或null
     */
    async getDoctorById(doctorId) {
        const doctors = await this.getDoctors();
        return doctors.find(d => d.id === doctorId) || null;
    }

    /**
     * 获取所有医生（别名方法）
     * @returns {Array<Doctor>} 医生列表
     */
    async getAllDoctors() {
        return await this.getDoctors();
    }

    /**
     * 获取所有绩效记录（别名方法）
     * @returns {Array<PerformanceRecord>} 绩效记录列表
     */
    async getAllPerformanceRecords() {
        return await this.getRecords();
    }

    /**
     * 添加绩效记录（别名方法）
     * @param {PerformanceRecord} record - 绩效记录
     * @returns {boolean} 是否添加成功
     */
    async addPerformanceRecord(record) {
        return await this.addRecord(record);
    }

    /**
     * 清除所有绩效记录（别名方法）
     * @returns {boolean} 是否清除成功
     */
    async clearPerformanceRecords() {
        return await this.clearAllRecords();
    }

    // ==================== 绩效记录管理 ====================

    /**
     * 获取所有绩效记录
     * @returns {Array<PerformanceRecord>} 绩效记录列表
     */
    async getRecords() {
        if (this.usePocketBase) {
            return await this.pocketBaseStorage.getRecords();
        }
        
        if (!this.isStorageSupported()) return [];
        
        const recordsData = localStorage.getItem(this.storageKeys.records);
        if (!recordsData) return [];
        
        const recordsJson = this.safeJSONParse(recordsData, []);
        return recordsJson.map(r => PerformanceRecord.fromJSON(r));
    }

    /**
     * 保存绩效记录列表
     * @param {Array<PerformanceRecord>} records - 绩效记录列表
     * @returns {boolean} 是否保存成功
     */
    async saveRecords(records) {
        if (this.usePocketBase) {
            return await this.pocketBaseStorage.saveRecords(records);
        }
        
        if (!this.isStorageSupported()) return false;
        
        try {
            // 限制历史记录数量
            const config = this.getConfig();
            const maxRecords = config?.systemOptions?.maxHistoryRecords || 100;
            
            // 按创建时间排序，保留最新的记录
            const sortedRecords = records.sort((a, b) => 
                new Date(b.createdAt) - new Date(a.createdAt)
            ).slice(0, maxRecords);
            
            const recordsJson = sortedRecords.map(r => r.toJSON ? r.toJSON() : r);
            localStorage.setItem(this.storageKeys.records, this.safeJSONStringify(recordsJson));
            return true;
        } catch (e) {
            console.error('保存绩效记录失败:', e);
            return false;
        }
    }

    /**
     * 添加绩效记录
     * @param {PerformanceRecord} record - 绩效记录
     * @returns {boolean} 是否添加成功
     */
    async addRecord(record) {
        if (this.usePocketBase) {
            return await this.pocketBaseStorage.addRecord(record);
        }
        
        const records = await this.getRecords();
        
        // 检查是否已存在相同年月的记录
        const existingRecord = records.find(r => 
            r.year === record.year && r.month === record.month
        );
        
        if (existingRecord) {
            // 更新现有记录
            return await this.updateRecord(existingRecord.id, record);
        } else {
            // 添加新记录
            records.push(record);
            return await this.saveRecords(records);
        }
    }

    /**
     * 更新绩效记录
     * @param {string} recordId - 记录ID
     * @param {Object} updateData - 更新数据
     * @returns {boolean} 是否更新成功
     */
    async updateRecord(recordId, updateData) {
        if (this.usePocketBase) {
            return await this.pocketBaseStorage.updateRecord(recordId, updateData);
        }
        
        const records = await this.getRecords();
        const recordIndex = records.findIndex(r => r.id === recordId);
        
        if (recordIndex === -1) {
            throw new Error('绩效记录不存在');
        }
        
        // 更新记录
        Object.assign(records[recordIndex], updateData);
        records[recordIndex].updatedAt = new Date().toISOString();
        
        return await this.saveRecords(records);
    }

    /**
     * 删除绩效记录
     * @param {string} recordId - 记录ID
     * @returns {boolean} 是否删除成功
     */
    async deleteRecord(recordId) {
        if (this.usePocketBase) {
            return await this.pocketBaseStorage.deleteRecord(recordId);
        }
        
        const records = await this.getRecords();
        const filteredRecords = records.filter(r => r.id !== recordId);
        
        if (filteredRecords.length === records.length) {
            throw new Error('绩效记录不存在');
        }
        
        return await this.saveRecords(filteredRecords);
    }

    /**
     * 根据年月查询绩效记录
     * @param {string} year - 年份
     * @param {string} month - 月份
     * @returns {PerformanceRecord|null} 绩效记录或null
     */
    getRecordByYearMonth(year, month) {
        const records = this.getRecords();
        return records.find(r => r.year === year && r.month === month) || null;
    }

    /**
     * 获取年份列表
     * @returns {Array<string>} 年份列表
     */
    getAvailableYears() {
        const records = this.getRecords();
        const years = [...new Set(records.map(r => r.year))];
        return years.sort((a, b) => b.localeCompare(a)); // 降序排列
    }

    /**
     * 根据年份获取月份列表
     * @param {string} year - 年份
     * @returns {Array<string>} 月份列表
     */
    getAvailableMonths(year) {
        const records = this.getRecords();
        const months = records
            .filter(r => r.year === year)
            .map(r => r.month)
            .sort((a, b) => parseInt(b) - parseInt(a)); // 降序排列
        return [...new Set(months)];
    }

    // ==================== 系统配置管理 ====================

    /**
     * 获取系统配置
     * @returns {SystemConfig|null} 系统配置或null
     */
    async getConfig() {
        if (this.usePocketBase) {
            return await this.pocketBaseStorage.getConfig();
        }
        
        if (!this.isStorageSupported()) return new SystemConfig();
        
        const configData = localStorage.getItem(this.storageKeys.config);
        if (!configData) return null;
        
        const configJson = this.safeJSONParse(configData, {});
        return SystemConfig.fromJSON(configJson);
    }

    /**
     * 保存系统配置
     * @param {SystemConfig} config - 系统配置
     * @returns {boolean} 是否保存成功
     */
    async saveConfig(config) {
        if (this.usePocketBase) {
            return await this.pocketBaseStorage.saveConfig(config);
        }
        
        if (!this.isStorageSupported()) return false;
        
        try {
            const configJson = config.toJSON ? config.toJSON() : config;
            localStorage.setItem(this.storageKeys.config, this.safeJSONStringify(configJson));
            return true;
        } catch (e) {
            console.error('保存系统配置失败:', e);
            return false;
        }
    }

    /**
     * 获取系统配置（别名方法）
     * @returns {SystemConfig|null} 系统配置或null
     */
    getSystemConfig() {
        return this.getConfig() || new SystemConfig();
    }

    /**
     * 更新系统配置（别名方法）
     * @param {SystemConfig} config - 系统配置
     * @returns {boolean} 是否更新成功
     */
    updateSystemConfig(config) {
        return this.saveConfig(config);
    }

    /**
     * 获取所有当前工作数据
     * @returns {Object} 所有工作数据
     */
    getAllCurrentWorkData() {
        if (!this.isStorageSupported()) return {};
        
        const allData = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('workData_')) {
                const monthKey = key.replace('workData_', '');
                const data = localStorage.getItem(key);
                if (data) {
                    allData[monthKey] = this.safeJSONParse(data, {});
                }
            }
        }
        return allData;
    }

    /**
     * 清除所有数据
     * @returns {boolean} 是否清除成功
     */
    clearAllData() {
        return this.resetSystem();
    }

    // ==================== 当前数据管理 ====================

    /**
     * 保存当前工作数据
     * @param {Object} data - 当前数据
     * @returns {boolean} 是否保存成功
     */
    saveCurrentData(data) {
        if (!this.isStorageSupported()) return false;
        
        try {
            localStorage.setItem(this.storageKeys.currentData, this.safeJSONStringify(data));
            return true;
        } catch (e) {
            console.error('保存当前数据失败:', e);
            return false;
        }
    }

    /**
     * 获取当前工作数据
     * @returns {Object|null} 当前数据或null
     */
    getCurrentData() {
        if (!this.isStorageSupported()) return null;
        
        const currentData = localStorage.getItem(this.storageKeys.currentData);
        if (!currentData) return null;
        
        return this.safeJSONParse(currentData, null);
    }

    /**
     * 获取指定月份的工作数据
     * @param {string} key - 年月键值（格式：YYYY-MM）
     * @returns {Object|null} 工作数据或null
     */
    getCurrentWorkData(key) {
        if (!this.isStorageSupported()) return null;
        
        const workDataKey = `workData_${key}`;
        const workData = localStorage.getItem(workDataKey);
        if (!workData) return null;
        
        return this.safeJSONParse(workData, null);
    }

    /**
     * 保存指定月份的工作数据
     * @param {string} key - 年月键值（格式：YYYY-MM）
     * @param {Object} data - 工作数据
     * @returns {boolean} 是否保存成功
     */
    saveCurrentWorkData(key, data) {
        if (!this.isStorageSupported()) return false;
        
        try {
            const workDataKey = `workData_${key}`;
            localStorage.setItem(workDataKey, this.safeJSONStringify(data));
            return true;
        } catch (e) {
            console.error('保存工作数据失败:', e);
            return false;
        }
    }

    /**
     * 清除当前工作数据
     * @returns {boolean} 是否清除成功
     */
    clearCurrentData() {
        if (!this.isStorageSupported()) return false;
        
        try {
            localStorage.removeItem(this.storageKeys.currentData);
            return true;
        } catch (e) {
            console.error('清除当前数据失败:', e);
            return false;
        }
    }

    // ==================== 数据导入导出 ====================

    /**
     * 导出所有数据
     * @returns {Object} 导出的数据对象
     */
    async exportAllData() {
        const doctors = await this.getDoctors();
        const records = await this.getRecords();
        const config = await this.getConfig();
        
        return {
            doctors: doctors.map(d => d.toJSON()),
            records: records.map(r => r.toJSON()),
            config: config?.toJSON() || {},
            exportTime: new Date().toISOString(),
            version: '1.0.0'
        };
    }

    /**
     * 导入数据
     * @param {Object} data - 要导入的数据
     * @param {boolean} overwrite - 是否覆盖现有数据
     * @returns {boolean} 是否导入成功
     */
    async importData(data, overwrite = false) {
        try {
            if (!data || typeof data !== 'object') {
                throw new Error('无效的数据格式');
            }

            // 验证数据结构
            if (!Array.isArray(data.doctors) || !Array.isArray(data.records)) {
                throw new Error('数据结构不正确');
            }

            if (overwrite) {
                // 覆盖模式：直接替换所有数据
                if (data.doctors) {
                    const doctors = data.doctors.map(d => Doctor.fromJSON(d));
                    await this.saveDoctors(doctors);
                }
                
                if (data.records) {
                    const records = data.records.map(r => PerformanceRecord.fromJSON(r));
                    await this.saveRecords(records);
                }
                
                if (data.config) {
                    const config = SystemConfig.fromJSON(data.config);
                    await this.saveConfig(config);
                }
            } else {
                // 合并模式：合并数据
                if (data.doctors) {
                    const existingDoctors = await this.getDoctors();
                    const newDoctors = data.doctors.map(d => Doctor.fromJSON(d));
                    
                    // 合并医生数据（避免重复）
                    const mergedDoctors = [...existingDoctors];
                    newDoctors.forEach(newDoctor => {
                        const exists = existingDoctors.find(d => d.name === newDoctor.name);
                        if (!exists) {
                            mergedDoctors.push(newDoctor);
                        }
                    });
                    
                    await this.saveDoctors(mergedDoctors);
                }
                
                if (data.records) {
                    const existingRecords = await this.getRecords();
                    const newRecords = data.records.map(r => PerformanceRecord.fromJSON(r));
                    
                    // 合并绩效记录（避免重复）
                    const mergedRecords = [...existingRecords];
                    newRecords.forEach(newRecord => {
                        const exists = existingRecords.find(r => 
                            r.year === newRecord.year && r.month === newRecord.month
                        );
                        if (!exists) {
                            mergedRecords.push(newRecord);
                        }
                    });
                    
                    await this.saveRecords(mergedRecords);
                }
            }

            return true;
        } catch (e) {
            console.error('导入数据失败:', e);
            throw e;
        }
    }

    // ==================== 数据清理 ====================

    /**
     * 清空所有历史记录
     * @returns {boolean} 是否清空成功
     */
    async clearAllRecords() {
        return await this.saveRecords([]);
    }

    /**
     * 重置系统（清空所有数据）
     * @returns {boolean} 是否重置成功
     */
    async resetSystem() {
        if (this.usePocketBase) {
            return await this.pocketBaseStorage.resetSystem();
        }
        
        try {
            await this.saveDoctors([]);
            await this.saveRecords([]);
            await this.saveConfig(new SystemConfig());
            this.clearCurrentData();
            return true;
        } catch (e) {
            console.error('重置系统失败:', e);
            return false;
        }
    }

    /**
     * 获取存储使用情况
     * @returns {Object} 存储使用情况
     */
    getStorageUsage() {
        if (!this.isStorageSupported()) {
            return { supported: false };
        }

        try {
            let totalSize = 0;
            const details = {};
            
            Object.entries(this.storageKeys).forEach(([key, storageKey]) => {
                const data = localStorage.getItem(storageKey);
                const size = data ? data.length : 0;
                details[key] = {
                    size: size,
                    sizeKB: (size / 1024).toFixed(2)
                };
                totalSize += size;
            });

            return {
                supported: true,
                totalSize: totalSize,
                totalSizeKB: (totalSize / 1024).toFixed(2),
                details: details
            };
        } catch (e) {
            console.error('获取存储使用情况失败:', e);
            return { supported: true, error: e.message };
        }
    }

    // ==================== 总奖金数据管理 ====================

    /**
     * 获取总奖金数额
     * @param {string} monthKey - 月份键值（格式：YYYY-MM）
     * @returns {number} 总奖金数额
     */
    async getTotalBonus(monthKey) {
        if (this.usePocketBase) {
            return await this.pocketBaseStorage.getTotalBonus(monthKey);
        }
        
        if (!this.isStorageSupported()) return 0;
        
        const bonusData = localStorage.getItem(this.storageKeys.totalBonus);
        if (!bonusData) return 0;
        
        const bonusJson = this.safeJSONParse(bonusData, {});
        return bonusJson[monthKey] || 0;
    }

    /**
     * 保存总奖金数额
     * @param {string} monthKey - 月份键值（格式：YYYY-MM）
     * @param {number} amount - 总奖金数额
     * @returns {boolean} 是否保存成功
     */
    async saveTotalBonus(monthKey, amount) {
        if (this.usePocketBase) {
            return await this.pocketBaseStorage.saveTotalBonus(monthKey, amount);
        }
        
        if (!this.isStorageSupported()) {
            console.error('localStorage不支持');
            return false;
        }
        
        // 验证参数
        if (!monthKey || typeof monthKey !== 'string') {
            console.error('monthKey参数无效:', monthKey);
            return false;
        }
        
        if (typeof amount !== 'number' && typeof amount !== 'string') {
            console.error('amount参数无效:', amount);
            return false;
        }
        
        try {
            const bonusData = localStorage.getItem(this.storageKeys.totalBonus);
            let bonusJson = this.safeJSONParse(bonusData, {});
            
            // 确保bonusJson是一个有效对象
            if (!bonusJson || typeof bonusJson !== 'object' || Array.isArray(bonusJson)) {
                console.warn('bonusJson不是有效对象，使用空对象:', bonusJson);
                bonusJson = {};
            }
            
            bonusJson[monthKey] = parseFloat(amount) || 0;
            
            localStorage.setItem(this.storageKeys.totalBonus, this.safeJSONStringify(bonusJson));
            console.log('总奖金保存成功:', { monthKey, amount: bonusJson[monthKey] });
            return true;
        } catch (e) {
            console.error('保存总奖金数据失败:', e);
            return false;
        }
    }

    /**
     * 删除指定月份的总奖金数据
     * @param {string} monthKey - 月份键值（格式：YYYY-MM）
     * @returns {boolean} 是否删除成功
     */
    async deleteTotalBonus(monthKey) {
        if (this.usePocketBase) {
            return await this.pocketBaseStorage.deleteTotalBonus(monthKey);
        }
        
        if (!this.isStorageSupported()) return false;
        
        try {
            const bonusData = localStorage.getItem(this.storageKeys.totalBonus);
            const bonusJson = this.safeJSONParse(bonusData, {});
            
            delete bonusJson[monthKey];
            
            localStorage.setItem(this.storageKeys.totalBonus, this.safeJSONStringify(bonusJson));
            return true;
        } catch (e) {
            console.error('删除总奖金数据失败:', e);
            return false;
        }
    }

    /**
     * 获取所有月份的总奖金数据
     * @returns {Object} 所有月份的总奖金数据
     */
    async getAllTotalBonus() {
        if (this.usePocketBase) {
            return await this.pocketBaseStorage.getAllTotalBonus();
        }
        
        if (!this.isStorageSupported()) return {};
        
        const bonusData = localStorage.getItem(this.storageKeys.totalBonus);
        return this.safeJSONParse(bonusData, {});
    }
}

// 创建全局存储管理器实例
const storageManager = new StorageManager();

// 导出存储管理器
if (typeof module !== 'undefined' && module.exports) {
    // Node.js环境
    module.exports = {
        StorageManager,
        storageManager
    };
} else {
    // 浏览器环境
    window.StorageManager = StorageManager;
    window.storageManager = storageManager;
}