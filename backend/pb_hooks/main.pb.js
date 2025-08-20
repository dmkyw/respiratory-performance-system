// PocketBase hooks for 呼吸科临床治疗小组绩效分配系统

// 在医生删除时，自动删除相关的工作数据
onModelAfterDelete((e) => {
    if (e.model.tableName() !== 'doctors') {
        return
    }
    
    const doctorId = e.model.id
    
    // 删除该医生的所有月度工作数据
    $app.dao().deleteExternalAuth({
        collection: 'monthly_work_data',
        filter: `doctor_id = '${doctorId}'`
    })
    
    console.log(`已删除医生 ${doctorId} 的所有相关数据`)
}, 'doctors')

// 在工作数据更新时，自动更新时间戳
onModelBeforeUpdate((e) => {
    if (e.model.tableName() === 'monthly_work_data' || 
        e.model.tableName() === 'doctors' || 
        e.model.tableName() === 'performance_records' ||
        e.model.tableName() === 'system_config') {
        e.model.set('updated_at', new Date().toISOString())
    }
})

// CORS 配置
onBeforeServe((e) => {
    e.router.pre(function(c) {
        c.response().header().set('Access-Control-Allow-Origin', '*')
        c.response().header().set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        c.response().header().set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        
        if (c.request().method === 'OPTIONS') {
            return c.noContent(204)
        }
        
        return c.next()
    })
})

// 健康检查端点
routerAdd('GET', '/api/health', (c) => {
    return c.json(200, {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    })
})

// 数据统计端点
routerAdd('GET', '/api/stats', (c) => {
    try {
        const doctorsCount = $app.dao().totalRecords('doctors')
        const workDataCount = $app.dao().totalRecords('monthly_work_data')
        const recordsCount = $app.dao().totalRecords('performance_records')
        
        return c.json(200, {
            doctors: doctorsCount,
            workData: workDataCount,
            records: recordsCount,
            timestamp: new Date().toISOString()
        })
    } catch (error) {
        return c.json(500, {
            error: error.message
        })
    }
})