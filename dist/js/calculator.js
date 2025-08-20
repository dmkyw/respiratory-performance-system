/**
 * 科室绩效分配系统 - 绩效计算引擎
 * 实现绩效计算的核心逻辑，包括新入职人员系数处理
 */

/**
 * 绩效计算引擎类
 */
class PerformanceCalculator {
    constructor() {
        this.defaultConfig = {
            performanceWeights: {
                medicalRevenue: 50,    // 医疗业务总额权重（占个人工资总收入50%）
                discharge: 20,         // 出院人数权重
                bedDays: 20,           // 床日数权重
                attendance: 10         // 出勤权重
            },
            newEmployeeConfig: {
                uncertifiedCoeff: 0.7,        // 提高未认证系数，更公平
                certifiedWithinThreeYearsCoeff: 0.85,  // 提高新认证系数
                normalCoeff: 1.0,
                newEmployeeThreshold: 3,
                // 新增渐进式系数，根据工作年限逐步提升
                progressiveCoeff: {
                    firstYear: 0.7,
                    secondYear: 0.8,
                    thirdYear: 0.9
                }
            },
            // 新增绩效调节参数
            performanceAdjustment: {
                enableNonLinearScoring: true,  // 启用非线性评分
                minScoreThreshold: 20,         // 最低分数阈值
                excellenceBonus: 1.1,          // 优秀奖励系数
                excellenceThreshold: 90        // 优秀分数阈值
            }
        };
    }

    /**
     * 计算单个医生的绩效分数
     * @param {Doctor} doctor - 医生对象
     * @param {MonthlyWorkData} workData - 月度工作数据
     * @param {Object} config - 计算配置
     * @param {Object} groupStats - 组内统计数据
     * @returns {Object} 计算结果
     */
    calculateDoctorPerformance(doctor, workData, config, groupStats) {
        const cfg = { ...this.defaultConfig, ...config };
        
        // 验证输入数据
        this.validateInputs(doctor, workData, cfg);
        
        // 计算各项分数
        const medicalRevenueScore = this.calculateMedicalRevenueScore(doctor, cfg, groupStats);
        const dischargeScore = this.calculateDischargeScore(workData, cfg, groupStats);
        const bedDaysScore = this.calculateBedDaysScore(workData, cfg, groupStats);
        const attendanceScore = this.calculateAttendanceScore(workData, cfg, groupStats);
        
        // 计算加权总分
        const weightedScore = (
            medicalRevenueScore * cfg.performanceWeights.medicalRevenue +
            dischargeScore * cfg.performanceWeights.discharge +
            bedDaysScore * cfg.performanceWeights.bedDays +
            attendanceScore * cfg.performanceWeights.attendance
        ) / 100;
        
        // 应用职称系数
        const titleCoefficient = doctor.titleCoefficient || 1.0;
        const titleAdjustedScore = weightedScore * titleCoefficient;
        
        // 应用新入职人员系数（渐进式调节）
        let newEmployeeMultiplier = 1.0;
        if (doctor.isNewEmployee) {
            const baseMultiplier = doctor.isCertified ? 
                cfg.newEmployeeConfig.certifiedWithinThreeYearsCoeff : 
                cfg.newEmployeeConfig.uncertifiedCoeff;
            
            // 渐进式系数：根据工作月数逐渐接近正常水平
            const workMonths = doctor.workMonths || 1;
            const progressiveMultiplier = cfg.newEmployeeConfig.normalCoeff;
            const progressFactor = Math.min(1.0, workMonths / 12); // 12个月内逐渐调整
            
            newEmployeeMultiplier = baseMultiplier + (progressiveMultiplier - baseMultiplier) * progressFactor;
        }
        
        const newEmployeeCoeff = newEmployeeMultiplier;
        const finalScore = titleAdjustedScore * newEmployeeCoeff;
        
        return {
            doctorId: doctor.id,
            doctorName: doctor.name,
            scores: {
                medicalRevenue: medicalRevenueScore,
                discharge: dischargeScore,
                bedDays: bedDaysScore,
                attendance: attendanceScore
            },
            weightedScore: weightedScore,
            titleCoefficient: titleCoefficient,
            titleAdjustedScore: titleAdjustedScore,
            newEmployeeCoefficient: newEmployeeCoeff,
            finalScore: finalScore,
            workData: {
                attendanceDays: workData.attendanceDays,
                dischargeCount: workData.dischargeCount,
                bedDays: workData.bedDays
            },
            doctorInfo: {
                title: doctor.title,
                workYears: doctor.workYears,
                isCertified: doctor.isCertified
            }
        };
    }

    /**
     * 计算组内所有医生的绩效
     * @param {Array<Doctor>} doctors - 医生列表
     * @param {Array<MonthlyWorkData>} workDataList - 工作数据列表
     * @param {Object} config - 计算配置
     * @returns {Object} 计算结果
     */
    calculateGroupPerformance(doctors, workDataList, config) {
        const cfg = { ...this.defaultConfig, ...config };
        
        // 验证输入数据
        if (!Array.isArray(doctors) || doctors.length === 0) {
            throw new Error('医生列表不能为空');
        }
        
        if (!Array.isArray(workDataList) || workDataList.length === 0) {
            throw new Error('工作数据列表不能为空');
        }
        
        // 计算组内统计数据
        const groupStats = this.calculateGroupStatistics(doctors, workDataList);
        
        // 计算每个医生的绩效
        const results = [];
        
        doctors.forEach(doctor => {
            const workData = workDataList.find(w => w.doctorId === doctor.id);
            if (workData) {
                const result = this.calculateDoctorPerformance(doctor, workData, cfg, groupStats);
                results.push(result);
            } else {
                console.warn(`医生 ${doctor.name} 缺少工作数据`);
            }
        });
        
        // 计算总体统计
        const totalStats = this.calculateTotalStatistics(results);
        
        return {
            results: results,
            groupStats: groupStats,
            totalStats: totalStats,
            config: cfg,
            calculatedAt: new Date().toISOString()
        };
    }

    /**
     * 计算医疗业务总额分数（基于个人工资在医疗业务总额中的占比）
     * @param {Doctor} doctor - 医生对象
     * @param {Object} config - 配置
     * @param {Object} groupStats - 组内统计
     * @returns {number} 医疗业务总额分数
     */
    calculateMedicalRevenueScore(doctor, config, groupStats) {
        // 医疗业务总额分数功能已移除，因为baseSalary字段已被删除
        return 0;
    }

    /**
     * 计算出院人数分数
     * @param {MonthlyWorkData} workData - 工作数据
     * @param {Object} config - 配置
     * @param {Object} groupStats - 组内统计
     * @returns {number} 出院人数分数
     */
    calculateDischargeScore(workData, config, groupStats) {
        if (groupStats.maxDischarge === groupStats.minDischarge) {
            return 100; // 如果所有人出院数相同，都得满分
        }
        
        // 线性归一化到0-100分
        let normalizedScore = (
            (workData.dischargeCount - groupStats.minDischarge) / 
            (groupStats.maxDischarge - groupStats.minDischarge)
        ) * 100;
        
        // 应用非线性评分（如果启用）
        if (config.performanceAdjustment && config.performanceAdjustment.enableNonLinearScoring) {
            normalizedScore = this.applyNonLinearScoring(normalizedScore, config.performanceAdjustment);
        }
        
        return Math.max(config.performanceAdjustment?.minScoreThreshold || 0, Math.min(100, normalizedScore));
    }

    /**
     * 计算床日数分数
     * @param {MonthlyWorkData} workData - 工作数据
     * @param {Object} config - 配置
     * @param {Object} groupStats - 组内统计
     * @returns {number} 床日数分数
     */
    calculateBedDaysScore(workData, config, groupStats) {
        if (groupStats.maxBedDays === groupStats.minBedDays) {
            return 100; // 如果所有人床日数相同，都得满分
        }
        
        // 线性归一化到0-100分
        let normalizedScore = (
            (workData.bedDays - groupStats.minBedDays) / 
            (groupStats.maxBedDays - groupStats.minBedDays)
        ) * 100;
        
        // 应用非线性评分（如果启用）
        if (config.performanceAdjustment && config.performanceAdjustment.enableNonLinearScoring) {
            normalizedScore = this.applyNonLinearScoring(normalizedScore, config.performanceAdjustment);
        }
        
        return Math.max(config.performanceAdjustment?.minScoreThreshold || 0, Math.min(100, normalizedScore));
    }

    /**
     * 计算出勤分数
     * @param {MonthlyWorkData} workData - 工作数据
     * @param {Object} config - 配置
     * @param {Object} groupStats - 组内统计
     * @returns {number} 出勤分数
     */
    calculateAttendanceScore(workData, config, groupStats) {
        if (groupStats.maxAttendance === groupStats.minAttendance) {
            return 100; // 如果所有人出勤天数相同，都得满分
        }
        
        // 线性归一化到0-100分
        let normalizedScore = (
            (workData.attendanceDays - groupStats.minAttendance) / 
            (groupStats.maxAttendance - groupStats.minAttendance)
        ) * 100;
        
        // 应用非线性评分（如果启用）
        if (config.performanceAdjustment && config.performanceAdjustment.enableNonLinearScoring) {
            normalizedScore = this.applyNonLinearScoring(normalizedScore, config.performanceAdjustment);
        }
        
        return Math.max(config.performanceAdjustment?.minScoreThreshold || 0, Math.min(100, normalizedScore));
    }

    /**
     * 应用非线性评分
     * @param {number} score - 原始分数
     * @param {Object} adjustmentConfig - 调节配置
     * @returns {number} 调节后的分数
     */
    applyNonLinearScoring(score, adjustmentConfig) {
        // 使用平方根函数进行非线性调节，减少极端值的影响
        let adjustedScore = Math.sqrt(score / 100) * 100;
        
        // 应用优秀奖励
        if (score >= adjustmentConfig.excellenceThreshold) {
            adjustedScore = adjustedScore * adjustmentConfig.excellenceBonus;
        }
        
        return Math.min(100, adjustedScore);
    }

    /**
     * 计算组内统计数据
     * @param {Array<Doctor>} doctors - 医生列表
     * @param {Array<MonthlyWorkData>} workDataList - 工作数据列表
     * @returns {Object} 统计数据
     */
    calculateGroupStatistics(doctors, workDataList) {
        const discharges = workDataList.map(w => w.dischargeCount || 0);
        const bedDays = workDataList.map(w => w.bedDays || 0);
        const attendances = workDataList.map(w => w.attendanceDays || 0);
        
        return {
            participantCount: doctors.length,
            totalDoctors: doctors.length,
            totalMedicalRevenue: 0,
            
            // 出院人数统计
            maxDischarge: Math.max(...discharges),
            minDischarge: Math.min(...discharges),
            avgDischarge: discharges.reduce((sum, val) => sum + val, 0) / discharges.length,
            totalDischarge: discharges.reduce((sum, val) => sum + val, 0),
            
            // 床日数统计
            maxBedDays: Math.max(...bedDays),
            minBedDays: Math.min(...bedDays),
            avgBedDays: bedDays.reduce((sum, val) => sum + val, 0) / bedDays.length,
            totalBedDays: bedDays.reduce((sum, val) => sum + val, 0),
            
            // 出勤天数统计
            maxAttendance: Math.max(...attendances),
            minAttendance: Math.min(...attendances),
            avgAttendance: attendances.reduce((sum, val) => sum + val, 0) / attendances.length,
            totalAttendance: attendances.reduce((sum, val) => sum + val, 0)
        };
    }

    /**
     * 计算总体统计数据
     * @param {Array} results - 计算结果列表
     * @returns {Object} 总体统计
     */
    calculateTotalStatistics(results) {
        if (!results || results.length === 0) {
            return {
                participantCount: 0,
                totalScore: 0,
                averageScore: 0,
                maxScore: 0,
                minScore: 0,
                scoreDistribution: []
            };
        }
        
        const scores = results.map(r => r.finalScore);
        const totalScore = scores.reduce((sum, score) => sum + score, 0);
        
        // 计算分数分布
        const scoreRanges = [
            { range: '90-100', count: 0 },
            { range: '80-89', count: 0 },
            { range: '70-79', count: 0 },
            { range: '60-69', count: 0 },
            { range: '0-59', count: 0 }
        ];
        
        scores.forEach(score => {
            if (score >= 90) scoreRanges[0].count++;
            else if (score >= 80) scoreRanges[1].count++;
            else if (score >= 70) scoreRanges[2].count++;
            else if (score >= 60) scoreRanges[3].count++;
            else scoreRanges[4].count++;
        });
        
        return {
            participantCount: results.length,
            totalScore: totalScore,
            averageScore: totalScore / results.length,
            maxScore: Math.max(...scores),
            minScore: Math.min(...scores),
            scoreDistribution: scoreRanges,
            
            // 系数应用统计
            newEmployeeCount: results.filter(r => r.newEmployeeCoefficient < 1.0).length,
            uncertifiedCount: results.filter(r => 
                r.doctorInfo && !r.doctorInfo.isCertified
            ).length,
            certifiedWithinThreeYearsCount: results.filter(r => 
                r.doctorInfo && r.doctorInfo.isCertified && 
                r.doctorInfo.workYears <= 3 && r.newEmployeeCoefficient === 0.8
            ).length
        };
    }

    /**
     * 验证输入数据
     * @param {Doctor} doctor - 医生对象
     * @param {MonthlyWorkData} workData - 工作数据
     * @param {Object} config - 配置
     */
    validateInputs(doctor, workData, config) {
        if (!doctor || typeof doctor !== 'object') {
            throw new Error('医生对象无效');
        }
        
        if (!workData || typeof workData !== 'object') {
            throw new Error('工作数据无效');
        }
        
        if (!config || typeof config !== 'object') {
            throw new Error('配置对象无效');
        }
        
        // 验证医生数据
        const doctorValidation = doctor.validate ? doctor.validate() : { isValid: true };
        if (!doctorValidation.isValid) {
            throw new Error(`医生数据验证失败: ${doctorValidation.errors.join(', ')}`);
        }
        
        // 验证工作数据
        const workDataValidation = workData.validate ? workData.validate() : { isValid: true };
        if (!workDataValidation.isValid) {
            throw new Error(`工作数据验证失败: ${workDataValidation.errors.join(', ')}`);
        }
        
        // 验证权重配置
        if (config.performanceWeights) {
            const weights = config.performanceWeights;
            const totalWeight = weights.medicalRevenue + weights.discharge + weights.bedDays + weights.attendance;
            if (Math.abs(totalWeight - 100) > 0.01) {
                throw new Error(`权重总和必须为100，当前为${totalWeight}`);
            }
        }
    }

    /**
     * 生成绩效报告
     * @param {Object} calculationResult - 计算结果
     * @returns {Object} 绩效报告
     */
    generatePerformanceReport(calculationResult) {
        const { results, groupStats, totalStats, config } = calculationResult;
        
        // 排序结果（按最终分数降序）
        const sortedResults = [...results].sort((a, b) => b.finalScore - a.finalScore);
        
        // 生成排名
        const rankedResults = sortedResults.map((result, index) => ({
            ...result,
            rank: index + 1,
            percentile: ((results.length - index) / results.length * 100).toFixed(1)
        }));
        
        // 生成分析
        const analysis = this.generateAnalysis(rankedResults, groupStats, totalStats, config);
        
        return {
            summary: {
                title: '绩效分配计算报告',
                calculatedAt: calculationResult.calculatedAt,
                participantCount: totalStats.participantCount,
                averageScore: totalStats.averageScore.toFixed(2),
                scoreRange: `${totalStats.minScore.toFixed(2)} - ${totalStats.maxScore.toFixed(2)}`
            },
            results: rankedResults,
            statistics: {
                group: groupStats,
                total: totalStats
            },
            analysis: analysis,
            config: config
        };
    }

    /**
     * 生成分析报告
     * @param {Array} rankedResults - 排名结果
     * @param {Object} groupStats - 组内统计
     * @param {Object} totalStats - 总体统计
     * @param {Object} config - 配置
     * @returns {Object} 分析报告
     */
    generateAnalysis(rankedResults, groupStats, totalStats, config) {
        const analysis = {
            highlights: [],
            insights: [],
            recommendations: []
        };
        
        // 亮点分析
        if (rankedResults.length > 0) {
            const topPerformer = rankedResults[0];
            analysis.highlights.push(`最高分获得者：${topPerformer.doctorName}（${topPerformer.finalScore.toFixed(2)}分）`);
            
            if (totalStats.newEmployeeCount > 0) {
                analysis.highlights.push(`本月有${totalStats.newEmployeeCount}名新入职人员参与分配`);
            }
            
            if (totalStats.uncertifiedCount > 0) {
                analysis.highlights.push(`其中${totalStats.uncertifiedCount}名未取证人员`);
            }
        }
        
        // 洞察分析
        const scoreVariance = this.calculateVariance(rankedResults.map(r => r.finalScore));
        if (scoreVariance < 100) {
            analysis.insights.push('组内绩效分数较为均衡，差异不大');
        } else {
            analysis.insights.push('组内绩效分数存在较大差异，需关注工作量分配');
        }
        
        // 新入职人员分析
        if (totalStats.newEmployeeCount > 0) {
            const newEmployeeAvg = rankedResults
                .filter(r => r.newEmployeeCoefficient < 1.0)
                .reduce((sum, r) => sum + r.finalScore, 0) / totalStats.newEmployeeCount;
            
            analysis.insights.push(
                `新入职人员平均分数：${newEmployeeAvg.toFixed(2)}分（应用系数后）`
            );
        }
        
        // 建议
        if (totalStats.averageScore < 60) {
            analysis.recommendations.push('整体绩效偏低，建议检查工作量分配和考核标准');
        }
        
        if (totalStats.newEmployeeCount > totalStats.participantCount * 0.3) {
            analysis.recommendations.push('新入职人员比例较高，建议加强培训和指导');
        }
        
        return analysis;
    }

    /**
     * 计算方差
     * @param {Array<number>} values - 数值数组
     * @returns {number} 方差
     */
    calculateVariance(values) {
        if (values.length === 0) return 0;
        
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
        return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    }

    /**
     * 应用整数化分配和差额平衡算法
     * 确保每个医生的绩效为整数，且总分配与目标金额差额为0
     * @param {Array} individualResults - 个人计算结果数组
     * @param {number} totalBonus - 目标总奖金
     */
    applyIntegerAllocationWithBalancing(individualResults, totalBonus) {
        console.log('=== 开始整数化处理和差额分配 ===');
        console.log('目标总奖金:', totalBonus);
        
        // 第一步：对所有分配金额进行四舍五入
        const roundedResults = individualResults.map(result => {
            const originalAllocation = result.finalAllocation;
            const roundedAllocation = Math.round(originalAllocation);
            const roundingDifference = originalAllocation - roundedAllocation;
            
            return {
                ...result,
                originalAllocation: originalAllocation,
                roundedAllocation: roundedAllocation,
                roundingDifference: roundingDifference
            };
        });
        
        // 计算四舍五入后的总分配和差额
        const totalRounded = roundedResults.reduce((sum, result) => sum + result.roundedAllocation, 0);
        let remainingDifference = totalBonus - totalRounded;
        
        console.log('四舍五入后总分配:', totalRounded);
        console.log('需要调整的差额:', remainingDifference);
        
        // 第二步：如果差额在合理范围内（10元以内），进行科学分配
        if (Math.abs(remainingDifference) <= 10 && Math.abs(remainingDifference) > 0) {
            console.log('差额在合理范围内，开始科学分配调整');
            
            // 按分配金额大小排序，优先调整分配金额较小的医生
            const sortedForAdjustment = [...roundedResults].sort((a, b) => a.roundedAllocation - b.roundedAllocation);
            
            // 根据差额正负决定调整方向
            const adjustmentDirection = remainingDifference > 0 ? 1 : -1; // 正数表示需要增加，负数表示需要减少
            const adjustmentCount = Math.abs(remainingDifference);
            
            console.log('调整方向:', adjustmentDirection > 0 ? '增加' : '减少');
            console.log('需要调整的人数:', adjustmentCount);
            
            // 对前N个分配金额最小的医生进行调整
            for (let i = 0; i < adjustmentCount && i < sortedForAdjustment.length; i++) {
                const targetResult = sortedForAdjustment[i];
                
                // 在原数组中找到对应的结果并调整
                const originalIndex = individualResults.findIndex(r => r.doctorId === targetResult.doctorId);
                if (originalIndex !== -1) {
                    const adjustedAmount = targetResult.roundedAllocation + adjustmentDirection;
                    roundedResults[originalIndex].roundedAllocation = adjustedAmount;
                    
                    console.log(`调整医生 ${targetResult.doctorName}: ${targetResult.roundedAllocation} → ${adjustedAmount}`);
                }
            }
            
            // 验证调整后的总额
            const finalTotal = roundedResults.reduce((sum, result) => sum + result.roundedAllocation, 0);
            console.log('调整后总分配:', finalTotal);
            console.log('最终差额:', totalBonus - finalTotal);
            
        } else if (Math.abs(remainingDifference) > 10) {
            console.warn('差额超过10元，可能存在计算错误，差额为:', remainingDifference);
            // 对于超过10元的差额，按比例调整后再四舍五入
            const adjustmentFactor = totalBonus / totalRounded;
            roundedResults.forEach(result => {
                result.roundedAllocation = Math.round(result.roundedAllocation * adjustmentFactor);
            });
        }
        
        // 第三步：将调整后的整数分配金额更新回原始结果
        individualResults.forEach((result, index) => {
            result.finalAllocation = roundedResults[index].roundedAllocation;
            console.log(`最终分配 - ${result.doctorName}: ${result.finalAllocation}元`);
        });
        
        // 最终验证
        const finalTotalCheck = individualResults.reduce((sum, result) => sum + result.finalAllocation, 0);
        console.log('=== 整数化处理完成 ===');
        console.log('最终总分配:', finalTotalCheck);
        console.log('目标总奖金:', totalBonus);
        console.log('最终差额:', totalBonus - finalTotalCheck);
        
        return individualResults;
    }

    /**
     * 计算团队绩效（适配main.js调用）- 新的科学分配算法
     * @param {Array} doctorsWithData - 包含医生和工作数据的数组
     * @param {number} totalBonus - 总奖金额度
     * @returns {Object} 计算结果，格式适配results.js
     */
    calculateTeamPerformance(doctorsWithData, totalBonus = 0) {
        console.log('=== Calculator: 开始团队绩效计算 ===');
        console.log('Calculator: 接收到的医生数据:', doctorsWithData);
        console.log('Calculator: 接收到的总奖金:', totalBonus);
        console.log('Calculator: 医生数量:', doctorsWithData?.length || 0);
        
        // 提取医生列表和工作数据列表
        const doctors = doctorsWithData.map(item => item.doctor);
        const workDataList = doctorsWithData.map(item => item.workData);
        
        console.log('提取的医生列表:', doctors);
        console.log('提取的工作数据列表:', workDataList);
        
        // 新的权重分配逻辑：基于总奖金的权重分配
        const weights = {
            medicalRevenue: 0.50,  // 医疗业务总额权重50%
            bedDays: 0.25,         // 床日数权重25%
            discharge: 0.15,       // 出院人数权重15%
            attendance: 0.10       // 出勤权重10%
        };
        
        console.log('Calculator: 使用的权重配置:', weights);
        
        // 计算各项总和
        const totals = {
            medicalRevenue: workDataList.reduce((sum, data) => sum + (data.medicalRevenue || 0), 0),
            bedDays: workDataList.reduce((sum, data) => sum + (data.bedDays || 0), 0),
            discharge: workDataList.reduce((sum, data) => sum + (data.dischargeCount || 0), 0),
            attendance: workDataList.reduce((sum, data) => sum + (data.attendanceDays || 0), 0)
        };
        
        console.log('Calculator: 开始计算各项指标总和...');
        doctorsWithData.forEach((item, index) => {
            const workData = item.workData;
            console.log(`Calculator: 处理第${index + 1}个医生 ${item.doctor?.name}:`);
            console.log(`  - 医疗业务总额: ${workData.medicalRevenue || 0}`);
            console.log(`  - 床日数: ${workData.bedDays || 0}`);
            console.log(`  - 出院人数: ${workData.dischargeCount || 0}`);
            console.log(`  - 出勤天数: ${workData.attendanceDays || 0}`);
        });
        
        console.log('Calculator: 计算得出的总和:', totals);
        
        // 按权重分配总奖金
        const allocatedAmounts = {
            medicalRevenue: totalBonus * weights.medicalRevenue,
            bedDays: totalBonus * weights.bedDays,
            discharge: totalBonus * weights.discharge,
            attendance: totalBonus * weights.attendance
        };
        
        console.log('按权重分配的金额:', allocatedAmounts);
        
        // 计算每个医生的分配结果
        console.log('Calculator: 开始计算每个医生的绩效分配...');
        const individualResults = [];
        
        for (let i = 0; i < doctors.length; i++) {
            const doctor = doctors[i];
            const workData = workDataList[i];
            
            console.log(`Calculator: 计算第${i + 1}个医生 ${doctor.name} 的绩效:`);
            console.log(`  医生信息:`, doctor);
            console.log(`  工作数据:`, workData);
            
            // 计算各项分配金额
            const medicalRevenueAllocation = totals.medicalRevenue > 0 ? 
                (workData.medicalRevenue || 0) / totals.medicalRevenue * allocatedAmounts.medicalRevenue : 0;
            
            const bedDaysAllocation = totals.bedDays > 0 ? 
                (workData.bedDays || 0) / totals.bedDays * allocatedAmounts.bedDays : 0;
            
            const dischargeAllocation = totals.discharge > 0 ? 
                (workData.dischargeCount || 0) / totals.discharge * allocatedAmounts.discharge : 0;
            
            const attendanceAllocation = totals.attendance > 0 ? 
                (workData.attendanceDays || 0) / totals.attendance * allocatedAmounts.attendance : 0;
            
            console.log(`  医疗业务总额分配: ${workData.medicalRevenue || 0} / ${totals.medicalRevenue} * ${allocatedAmounts.medicalRevenue} = ${medicalRevenueAllocation}`);
            console.log(`  床日数分配: ${workData.bedDays || 0} / ${totals.bedDays} * ${allocatedAmounts.bedDays} = ${bedDaysAllocation}`);
            console.log(`  出院人数分配: ${workData.dischargeCount || 0} / ${totals.discharge} * ${allocatedAmounts.discharge} = ${dischargeAllocation}`);
            console.log(`  出勤分配: ${workData.attendanceDays || 0} / ${totals.attendance} * ${allocatedAmounts.attendance} = ${attendanceAllocation}`);
            
            // 计算初步分配金额（各项之和）
            const preliminaryAllocation = medicalRevenueAllocation + bedDaysAllocation + dischargeAllocation + attendanceAllocation;
            console.log(`  初步分配金额: ${preliminaryAllocation}`);
            
            // 应用职称系数
            const titleCoefficient = doctor.titleCoefficient || 1.0;
            const titleAdjustedAllocation = preliminaryAllocation * titleCoefficient;
            console.log(`  职称系数: ${titleCoefficient}, 职称调整后金额: ${titleAdjustedAllocation}`);
            
            // 应用新入职人员系数
            let newEmployeeCoeff = 1.0;
            if (doctor.isNewEmployee) {
                newEmployeeCoeff = doctor.isCertified ? 0.85 : 0.7;
                // 渐进式调整
                const workMonths = doctor.workMonths || 1;
                const progressFactor = Math.min(1.0, workMonths / 12);
                newEmployeeCoeff = newEmployeeCoeff + (1.0 - newEmployeeCoeff) * progressFactor;
            }
            
            // 最终分配金额
            const finalAllocation = titleAdjustedAllocation * newEmployeeCoeff;
            console.log(`  新员工系数: ${newEmployeeCoeff}, 最终分配金额: ${finalAllocation}`);
            
            // 计算分数（用于显示）
            const scores = {
                medicalRevenue: totals.medicalRevenue > 0 ? (workData.medicalRevenue || 0) / totals.medicalRevenue * 100 : 0,
                bedDays: totals.bedDays > 0 ? (workData.bedDays || 0) / totals.bedDays * 100 : 0,
                discharge: totals.discharge > 0 ? (workData.dischargeCount || 0) / totals.discharge * 100 : 0,
                attendance: totals.attendance > 0 ? (workData.attendanceDays || 0) / totals.attendance * 100 : 0
            };
            
            const weightedScore = scores.medicalRevenue * weights.medicalRevenue * 100 + 
                                scores.bedDays * weights.bedDays * 100 + 
                                scores.discharge * weights.discharge * 100 + 
                                scores.attendance * weights.attendance * 100;
            
            const finalScore = weightedScore * titleCoefficient * newEmployeeCoeff;
            
            individualResults.push({
                doctorId: doctor.id,
                doctorName: doctor.name,
                scores: scores,
                weightedScore: weightedScore,
                titleCoefficient: titleCoefficient,
                titleAdjustedScore: weightedScore * titleCoefficient,
                newEmployeeCoefficient: newEmployeeCoeff,
                finalScore: finalScore,
                allocationRatio: totalBonus > 0 ? finalAllocation / totalBonus : 0,
                preliminaryAllocation: preliminaryAllocation,
                finalAllocation: finalAllocation,
                allocationDetails: {
                    medicalRevenue: medicalRevenueAllocation,
                    bedDays: bedDaysAllocation,
                    discharge: dischargeAllocation,
                    attendance: attendanceAllocation
                },
                workData: {
                    attendanceDays: workData.attendanceDays,
                    dischargeCount: workData.dischargeCount,
                    bedDays: workData.bedDays
                },
                doctorInfo: {
                    title: doctor.title,
                    workYears: doctor.workYears,
                    isCertified: doctor.isCertified
                }
            });
        }
        
        // 计算总分配金额和差额
        const totalAllocated = individualResults.reduce((sum, result) => sum + result.finalAllocation, 0);
        const difference = totalBonus - totalAllocated;
        
        console.log('Calculator: 总分配金额:', totalAllocated, '差额:', difference);
        console.log('Calculator: 所有医生的个人计算结果:', individualResults);
        
        // 如果差额较大，按比例调整
        if (Math.abs(difference) > 1) {
            const adjustmentFactor = totalBonus / totalAllocated;
            individualResults.forEach(result => {
                result.finalAllocation *= adjustmentFactor;
            });
        }
        
        // 新增：整数化处理和差额分配算法
        this.applyIntegerAllocationWithBalancing(individualResults, totalBonus);
        
        // 计算统计数据
        const scores = individualResults.map(r => r.finalScore);
        const teamStats = {
            totalDoctors: doctors.length,
            totalScore: scores.reduce((sum, score) => sum + score, 0),
            averageScore: scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0,
            maxScore: scores.length > 0 ? Math.max(...scores) : 0,
            minScore: scores.length > 0 ? Math.min(...scores) : 0,
            newEmployeeCount: individualResults.filter(r => r.newEmployeeCoefficient < 1.0).length,
            uncertifiedCount: individualResults.filter(r => !r.doctorInfo.isCertified).length
        };
        
        const result = {
            individualResults: individualResults,
            teamStats: teamStats,
            groupStats: {
                participantCount: doctors.length,
                totalDoctors: doctors.length,
                totalMedicalRevenue: totals.medicalRevenue,
                totalDischarge: totals.discharge,
                totalBedDays: totals.bedDays,
                totalAttendance: totals.attendance
            },
            config: {
                performanceWeights: {
                    medicalRevenue: weights.medicalRevenue * 100,
                    discharge: weights.discharge * 100,
                    bedDays: weights.bedDays * 100,
                    attendance: weights.attendance * 100
                }
            },
            calculatedAt: new Date().toISOString()
        };
        
        console.log('=== Calculator: 计算完成 ===');
        console.log('Calculator: 最终返回结果:', result);
        console.log('Calculator: individualResults数量:', result.individualResults?.length || 0);
        
        return result;
    }

    /**
     * 导出计算结果为CSV格式
     * @param {Object} calculationResult - 计算结果
     * @returns {string} CSV字符串
     */
    exportToCSV(calculationResult) {
        const { results } = calculationResult;
        
        const headers = [
            '排名', '姓名', '职称', '工作年限', '是否取证',
            '出勤天数', '出院人数', '床日数',
            '医疗业务分', '出院分', '床日分', '出勤分',
            '加权分数', '职称系数', '职称调整后分数', '新入职系数', '最终分数'
        ];
        
        const sortedResults = [...results].sort((a, b) => b.finalScore - a.finalScore);
        
        const rows = sortedResults.map((result, index) => [
            index + 1,
            result.doctorName,
            result.doctorInfo.title,
            result.doctorInfo.workYears,
            result.doctorInfo.isCertified ? '是' : '否',
            result.workData.attendanceDays,
            result.workData.dischargeCount,
            result.workData.bedDays,
            result.scores.medicalRevenue.toFixed(2),
            result.scores.discharge.toFixed(2),
            result.scores.bedDays.toFixed(2),
            result.scores.attendance.toFixed(2),
            result.weightedScore.toFixed(2),
            result.titleCoefficient,
            result.titleAdjustedScore.toFixed(2),
            result.newEmployeeCoefficient,
            result.finalScore.toFixed(2)
        ]);
        
        const csvContent = [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');
        
        return csvContent;
    }
}

// 创建全局计算器实例
const performanceCalculator = new PerformanceCalculator();

// 导出计算器
if (typeof module !== 'undefined' && module.exports) {
    // Node.js环境
    module.exports = {
        PerformanceCalculator,
        performanceCalculator
    };
} else {
    // 浏览器环境
    window.PerformanceCalculator = PerformanceCalculator;
    window.performanceCalculator = performanceCalculator;
}