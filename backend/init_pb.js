/**
 * PocketBase初始化脚本
 * 用于导入schema和初始数据
 */

const fs = require('fs');
const path = require('path');

// 读取schema配置
function loadSchema() {
    const schemaPath = path.join(__dirname, 'pb_schema.json');
    return JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
}

// 创建默认系统配置
function getDefaultSystemConfig() {
    return [
        {
            config_key: 'calculation_settings',
            config_data: {
                attendanceWeight: 0.3,
                dischargeWeight: 0.4,
                bedDaysWeight: 0.2,
                revenueWeight: 0.1,
                newEmployeeMonths: 6,
                newEmployeeCoefficient: 0.8
            }
        },
        {
            config_key: 'app_settings',
            config_data: {
                appName: '呼吸科临床治疗小组绩效分配系统',
                version: '1.0.0',
                lastUpdated: new Date().toISOString()
            }
        }
    ];
}

// 示例医生数据
function getSampleDoctors() {
    return [
        {
            name: '张医生',
            title: '主任医师',
            title_coefficient: 1.5,
            work_years: 15,
            is_certified: true
        },
        {
            name: '李医生',
            title: '副主任医师',
            title_coefficient: 1.3,
            work_years: 10,
            is_certified: true
        },
        {
            name: '王医生',
            title: '主治医师',
            title_coefficient: 1.1,
            work_years: 5,
            is_certified: true
        }
    ];
}

// 导出配置
module.exports = {
    loadSchema,
    getDefaultSystemConfig,
    getSampleDoctors
};

// 如果直接运行此脚本
if (require.main === module) {
    console.log('PocketBase初始化配置:');
    console.log('Schema:', JSON.stringify(loadSchema(), null, 2));
    console.log('默认系统配置:', JSON.stringify(getDefaultSystemConfig(), null, 2));
    console.log('示例医生数据:', JSON.stringify(getSampleDoctors(), null, 2));
}