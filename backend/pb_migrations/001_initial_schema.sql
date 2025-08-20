-- 创建医生信息表
CREATE TABLE doctors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '住院医师',
    title_coefficient REAL NOT NULL DEFAULT 1.0,
    work_years INTEGER NOT NULL DEFAULT 0,
    is_certified BOOLEAN NOT NULL DEFAULT true,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建月度工作数据表
CREATE TABLE monthly_work_data (
    id TEXT PRIMARY KEY,
    doctor_id TEXT NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    attendance_days REAL NOT NULL DEFAULT 0,
    discharge_count INTEGER NOT NULL DEFAULT 0,
    bed_days REAL NOT NULL DEFAULT 0,
    medical_revenue REAL NOT NULL DEFAULT 0,
    reward_penalty REAL NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    UNIQUE(doctor_id, year, month)
);

-- 创建绩效记录表
CREATE TABLE performance_records (
    id TEXT PRIMARY KEY,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    total_bonus REAL NOT NULL DEFAULT 0,
    calculation_config TEXT, -- JSON格式存储计算配置
    results TEXT NOT NULL, -- JSON格式存储计算结果
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(year, month)
);

-- 创建系统配置表
CREATE TABLE system_config (
    id TEXT PRIMARY KEY DEFAULT 'default',
    config_data TEXT NOT NULL, -- JSON格式存储配置数据
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_doctors_name ON doctors(name);
CREATE INDEX idx_monthly_work_data_doctor_id ON monthly_work_data(doctor_id);
CREATE INDEX idx_monthly_work_data_year_month ON monthly_work_data(year, month);
CREATE INDEX idx_performance_records_year_month ON performance_records(year, month);

-- 插入默认系统配置
INSERT INTO system_config (id, config_data) VALUES (
    'default',
    '{
        "attendanceCoeff": 1.0,
        "dischargeCoeff": 1.0,
        "bedDayCoeff": 1.0,
        "revenueCoeff": 0.0001,
        "uncertifiedCoeff": 0.6,
        "certifiedWithinThreeYearsCoeff": 0.8,
        "normalCoeff": 1.0,
        "newEmployeeThreshold": 3,
        "systemOptions": {
            "maxHistoryRecords": 100,
            "autoBackup": true,
            "backupInterval": 7
        }
    }'
);