/**
 * PocketBase存储管理器
 * 替代localStorage，使用PocketBase作为后端存储
 */

class PocketBaseStorageManager {
    constructor(baseUrl = '') {
        this.pb = new PocketBase(baseUrl || this.getDefaultBaseUrl());
        this.isOnline = navigator.onLine;
        this.localCache = new Map();
        
        // 监听网络状态
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.syncLocalChanges();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
        });
    }

    /**
     * 获取默认的PocketBase URL
     */
    getDefaultBaseUrl() {
        // 在生产环境中，这应该是你的Render PocketBase URL
        return process.env.POCKETBASE_URL || 'http://localhost:8090';
    }

    /**
     * 检查PocketBase连接状态
     */
    async checkConnection() {
        try {
            await this.pb.send('/api/health');
            return true;
        } catch (error) {
            console.warn('PocketBase连接失败，使用本地缓存:', error.message);
            return false;
        }
    }

    /**
     * 安全的JSON解析
     */
    safeJSONParse(str, defaultValue = null) {
        try {
            return JSON.parse(str);
        } catch (error) {
            console.error('JSON解析失败:', error);
            return defaultValue;
        }
    }

    /**
     * 安全的JSON字符串化
     */
    safeJSONStringify(obj) {
        try {
            return JSON.stringify(obj);
        } catch (error) {
            console.error('JSON字符串化失败:', error);
            return '{}';
        }
    }

    /**
     * 获取医生列表
     */
    async getDoctors() {
        try {
            if (this.isOnline && await this.checkConnection()) {
                const result = await this.pb.collection('doctors').getFullList({
                    sort: 'created'
                });
                
                // 转换为前端期望的格式
                const doctors = result.items || result;
                const formattedDoctors = doctors.map(doctor => ({
                    id: doctor.id,
                    name: doctor.name,
                    title: doctor.title,
                    titleCoefficient: doctor.title_coefficient,
                    workYears: doctor.work_years,
                    isCertified: doctor.is_certified,
                    createdAt: doctor.created,
                    updatedAt: doctor.updated
                }));
                
                // 缓存到本地
                this.localCache.set('doctors', formattedDoctors);
                localStorage.setItem('doctors_cache', this.safeJSONStringify(formattedDoctors));
                
                return formattedDoctors;
            } else {
                // 离线模式，从本地缓存读取
                const cached = this.localCache.get('doctors') || 
                              this.safeJSONParse(localStorage.getItem('doctors_cache'), []);
                return cached;
            }
        } catch (error) {
            console.error('获取医生列表失败:', error);
            // 降级到本地缓存
            return this.safeJSONParse(localStorage.getItem('doctors_cache'), []);
        }
    }

    /**
     * 保存医生列表
     */
    async saveDoctors(doctors) {
        try {
            // 先保存到本地缓存
            this.localCache.set('doctors', doctors);
            localStorage.setItem('doctors_cache', this.safeJSONStringify(doctors));
            
            if (this.isOnline && await this.checkConnection()) {
                // 同步到PocketBase
                const existingDoctors = await this.pb.collection('doctors').getFullList();
                const existing = existingDoctors.items || existingDoctors;
                
                for (const doctor of doctors) {
                    const pbDoctor = {
                        name: doctor.name,
                        title: doctor.title,
                        title_coefficient: doctor.titleCoefficient,
                        work_years: doctor.workYears,
                        is_certified: doctor.isCertified
                    };
                    
                    const existingDoctor = existing.find(d => d.id === doctor.id);
                    if (existingDoctor) {
                        await this.pb.collection('doctors').update(doctor.id, pbDoctor);
                    } else {
                        await this.pb.collection('doctors').create(pbDoctor);
                    }
                }
                
                return true;
            }
            
            return true;
        } catch (error) {
            console.error('保存医生列表失败:', error);
            return false;
        }
    }

    /**
     * 添加医生
     */
    async addDoctor(doctor) {
        try {
            const pbDoctor = {
                name: doctor.name,
                title: doctor.title,
                title_coefficient: doctor.titleCoefficient,
                work_years: doctor.workYears,
                is_certified: doctor.isCertified
            };
            
            if (this.isOnline && await this.checkConnection()) {
                const result = await this.pb.collection('doctors').create(pbDoctor);
                
                // 更新本地缓存
                const doctors = await this.getDoctors();
                const newDoctor = {
                    id: result.id,
                    name: result.name,
                    title: result.title,
                    titleCoefficient: result.title_coefficient,
                    workYears: result.work_years,
                    isCertified: result.is_certified,
                    createdAt: result.created,
                    updatedAt: result.updated
                };
                
                doctors.push(newDoctor);
                await this.saveDoctors(doctors);
                
                return newDoctor;
            } else {
                // 离线模式，生成临时ID
                const tempId = 'temp_' + Date.now();
                const newDoctor = {
                    id: tempId,
                    ...doctor,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    _isTemp: true
                };
                
                const doctors = await this.getDoctors();
                doctors.push(newDoctor);
                await this.saveDoctors(doctors);
                
                return newDoctor;
            }
        } catch (error) {
            console.error('添加医生失败:', error);
            throw error;
        }
    }

    /**
     * 更新医生
     */
    async updateDoctor(id, updatedData) {
        try {
            const pbDoctor = {
                name: updatedData.name,
                title: updatedData.title,
                title_coefficient: updatedData.titleCoefficient,
                work_years: updatedData.workYears,
                is_certified: updatedData.isCertified
            };
            
            if (this.isOnline && await this.checkConnection() && !id.startsWith('temp_')) {
                await this.pb.collection('doctors').update(id, pbDoctor);
            }
            
            // 更新本地缓存
            const doctors = await this.getDoctors();
            const index = doctors.findIndex(d => d.id === id);
            if (index !== -1) {
                doctors[index] = {
                    ...doctors[index],
                    ...updatedData,
                    updatedAt: new Date().toISOString()
                };
                await this.saveDoctors(doctors);
            }
            
            return true;
        } catch (error) {
            console.error('更新医生失败:', error);
            return false;
        }
    }

    /**
     * 删除医生
     */
    async deleteDoctor(id) {
        try {
            if (this.isOnline && await this.checkConnection() && !id.startsWith('temp_')) {
                await this.pb.collection('doctors').delete(id);
                // 同时删除相关的工作数据
                const workData = await this.pb.collection('monthly_work_data').getFullList({
                    filter: `doctor_id = "${id}"`
                });
                
                const items = workData.items || workData;
                for (const item of items) {
                    await this.pb.collection('monthly_work_data').delete(item.id);
                }
            }
            
            // 更新本地缓存
            const doctors = await this.getDoctors();
            const filteredDoctors = doctors.filter(d => d.id !== id);
            await this.saveDoctors(filteredDoctors);
            
            // 删除相关工作数据
            await this.deleteWorkDataByDoctorId(id);
            
            return true;
        } catch (error) {
            console.error('删除医生失败:', error);
            return false;
        }
    }

    /**
     * 根据ID获取医生
     */
    async getDoctorById(id) {
        const doctors = await this.getDoctors();
        return doctors.find(doctor => doctor.id === id) || null;
    }

    /**
     * 获取工作数据
     */
    async getWorkData() {
        try {
            if (this.isOnline && await this.checkConnection()) {
                const result = await this.pb.collection('monthly_work_data').getFullList({
                    sort: 'created',
                    expand: 'doctor_id'
                });
                
                const workData = result.items || result;
                const formattedData = {};
                
                workData.forEach(item => {
                    const doctorId = item.doctor_id;
                    if (!formattedData[doctorId]) {
                        formattedData[doctorId] = [];
                    }
                    
                    formattedData[doctorId].push({
                        year: item.year,
                        month: item.month,
                        attendanceDays: item.attendance_days,
                        dischargeCount: item.discharge_count,
                        bedDays: item.bed_days,
                        medicalRevenue: item.medical_revenue,
                        rewardPenalty: item.reward_penalty || 0
                    });
                });
                
                // 缓存到本地
                this.localCache.set('workData', formattedData);
                localStorage.setItem('workData_cache', this.safeJSONStringify(formattedData));
                
                return formattedData;
            } else {
                // 离线模式
                const cached = this.localCache.get('workData') || 
                              this.safeJSONParse(localStorage.getItem('workData_cache'), {});
                return cached;
            }
        } catch (error) {
            console.error('获取工作数据失败:', error);
            return this.safeJSONParse(localStorage.getItem('workData_cache'), {});
        }
    }

    /**
     * 保存工作数据
     */
    async saveWorkData(doctorId, workDataArray) {
        try {
            // 先保存到本地缓存
            const allWorkData = await this.getWorkData();
            allWorkData[doctorId] = workDataArray;
            this.localCache.set('workData', allWorkData);
            localStorage.setItem('workData_cache', this.safeJSONStringify(allWorkData));
            
            if (this.isOnline && await this.checkConnection()) {
                // 删除现有数据
                const existing = await this.pb.collection('monthly_work_data').getFullList({
                    filter: `doctor_id = "${doctorId}"`
                });
                
                const items = existing.items || existing;
                for (const item of items) {
                    await this.pb.collection('monthly_work_data').delete(item.id);
                }
                
                // 添加新数据
                for (const data of workDataArray) {
                    const pbData = {
                        doctor_id: doctorId,
                        year: data.year,
                        month: data.month,
                        attendance_days: data.attendanceDays,
                        discharge_count: data.dischargeCount,
                        bed_days: data.bedDays,
                        medical_revenue: data.medicalRevenue,
                        reward_penalty: data.rewardPenalty || 0
                    };
                    
                    await this.pb.collection('monthly_work_data').create(pbData);
                }
            }
            
            return true;
        } catch (error) {
            console.error('保存工作数据失败:', error);
            return false;
        }
    }

    /**
     * 删除医生的工作数据
     */
    async deleteWorkDataByDoctorId(doctorId) {
        try {
            const allWorkData = await this.getWorkData();
            delete allWorkData[doctorId];
            
            this.localCache.set('workData', allWorkData);
            localStorage.setItem('workData_cache', this.safeJSONStringify(allWorkData));
            
            return true;
        } catch (error) {
            console.error('删除工作数据失败:', error);
            return false;
        }
    }

    /**
     * 获取绩效记录
     */
    async getRecords() {
        try {
            if (this.isOnline && await this.checkConnection()) {
                const result = await this.pb.collection('performance_records').getFullList({
                    sort: '-created'
                });
                
                const records = result.items || result;
                const formattedRecords = records.map(record => ({
                    id: record.id,
                    year: record.year,
                    month: record.month,
                    totalBonus: record.total_bonus,
                    calculationConfig: record.calculation_config,
                    results: record.results,
                    createdAt: record.created,
                    updatedAt: record.updated
                }));
                
                // 缓存到本地
                this.localCache.set('records', formattedRecords);
                localStorage.setItem('records_cache', this.safeJSONStringify(formattedRecords));
                
                return formattedRecords;
            } else {
                // 离线模式
                const cached = this.localCache.get('records') || 
                              this.safeJSONParse(localStorage.getItem('records_cache'), []);
                return cached;
            }
        } catch (error) {
            console.error('获取绩效记录失败:', error);
            return this.safeJSONParse(localStorage.getItem('records_cache'), []);
        }
    }

    /**
     * 添加绩效记录
     */
    async addRecord(record) {
        try {
            const pbRecord = {
                year: record.year,
                month: record.month,
                total_bonus: record.totalBonus,
                calculation_config: record.calculationConfig,
                results: record.results
            };
            
            if (this.isOnline && await this.checkConnection()) {
                const result = await this.pb.collection('performance_records').create(pbRecord);
                
                // 更新本地缓存
                const records = await this.getRecords();
                const newRecord = {
                    id: result.id,
                    year: result.year,
                    month: result.month,
                    totalBonus: result.total_bonus,
                    calculationConfig: result.calculation_config,
                    results: result.results,
                    createdAt: result.created,
                    updatedAt: result.updated
                };
                
                records.unshift(newRecord);
                this.localCache.set('records', records);
                localStorage.setItem('records_cache', this.safeJSONStringify(records));
                
                return newRecord;
            } else {
                // 离线模式
                const tempId = 'temp_' + Date.now();
                const newRecord = {
                    id: tempId,
                    ...record,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    _isTemp: true
                };
                
                const records = await this.getRecords();
                records.unshift(newRecord);
                this.localCache.set('records', records);
                localStorage.setItem('records_cache', this.safeJSONStringify(records));
                
                return newRecord;
            }
        } catch (error) {
            console.error('添加绩效记录失败:', error);
            throw error;
        }
    }

    /**
     * 获取系统配置
     */
    async getConfig(key) {
        try {
            if (this.isOnline && await this.checkConnection()) {
                const result = await this.pb.collection('system_config').getFirstListItem(
                    `config_key = "${key}"`
                );
                
                return result.config_data;
            } else {
                // 离线模式，返回默认配置
                const defaultConfigs = {
                    'calculation_settings': {
                        attendanceWeight: 0.3,
                        dischargeWeight: 0.4,
                        bedDaysWeight: 0.2,
                        revenueWeight: 0.1,
                        newEmployeeMonths: 6,
                        newEmployeeCoefficient: 0.8
                    }
                };
                
                return defaultConfigs[key] || {};
            }
        } catch (error) {
            console.error('获取系统配置失败:', error);
            return {};
        }
    }

    /**
     * 同步本地更改到服务器
     */
    async syncLocalChanges() {
        if (!this.isOnline || !await this.checkConnection()) {
            return;
        }

        try {
            // 同步临时医生数据
            const doctors = await this.getDoctors();
            const tempDoctors = doctors.filter(d => d._isTemp);
            
            for (const doctor of tempDoctors) {
                const pbDoctor = {
                    name: doctor.name,
                    title: doctor.title,
                    title_coefficient: doctor.titleCoefficient,
                    work_years: doctor.workYears,
                    is_certified: doctor.isCertified
                };
                
                const result = await this.pb.collection('doctors').create(pbDoctor);
                
                // 更新本地缓存中的ID
                doctor.id = result.id;
                delete doctor._isTemp;
            }
            
            // 同步临时绩效记录
            const records = await this.getRecords();
            const tempRecords = records.filter(r => r._isTemp);
            
            for (const record of tempRecords) {
                const pbRecord = {
                    year: record.year,
                    month: record.month,
                    total_bonus: record.totalBonus,
                    calculation_config: record.calculationConfig,
                    results: record.results
                };
                
                const result = await this.pb.collection('performance_records').create(pbRecord);
                
                // 更新本地缓存中的ID
                record.id = result.id;
                delete record._isTemp;
            }
            
            console.log('本地更改同步完成');
        } catch (error) {
            console.error('同步本地更改失败:', error);
        }
    }

    /**
     * 导出所有数据
     */
    async exportAllData() {
        const doctors = await this.getDoctors();
        const workData = await this.getWorkData();
        const records = await this.getRecords();
        
        return {
            doctors,
            workData,
            records,
            exportTime: new Date().toISOString()
        };
    }

    /**
     * 清除所有记录
     */
    async clearAllRecords() {
        try {
            if (this.isOnline && await this.checkConnection()) {
                // 清除PocketBase中的记录
                const records = await this.pb.collection('performance_records').getFullList();
                const items = records.items || records;
                
                for (const record of items) {
                    await this.pb.collection('performance_records').delete(record.id);
                }
            }
            
            // 清除本地缓存
            this.localCache.set('records', []);
            localStorage.setItem('records_cache', '[]');
            
            return true;
        } catch (error) {
            console.error('清除记录失败:', error);
            return false;
        }
    }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PocketBaseStorageManager;
} else {
    window.PocketBaseStorageManager = PocketBaseStorageManager;
}