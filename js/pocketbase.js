/**
 * PocketBase JavaScript SDK
 * 简化版本，包含项目所需的核心功能
 */

class PocketBase {
    constructor(baseUrl = '') {
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.authStore = {
            token: '',
            model: null,
            isValid: false
        };
        this.beforeSend = null;
        this.afterSend = null;
    }

    /**
     * 发送HTTP请求
     */
    async send(path, options = {}) {
        let url = this.baseUrl + path;
        
        const config = {
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        // 添加认证头
        if (this.authStore.token) {
            config.headers['Authorization'] = this.authStore.token;
        }

        // 添加请求体
        if (options.body) {
            if (options.body instanceof FormData) {
                delete config.headers['Content-Type'];
                config.body = options.body;
            } else {
                config.body = JSON.stringify(options.body);
            }
        }

        // 添加查询参数
        if (options.query) {
            const params = new URLSearchParams();
            Object.entries(options.query).forEach(([key, value]) => {
                if (value !== null && value !== undefined) {
                    params.append(key, value);
                }
            });
            url += '?' + params.toString();
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('PocketBase request failed:', error);
            throw error;
        }
    }

    /**
     * 获取集合操作对象
     */
    collection(name) {
        return new Collection(this, name);
    }

    /**
     * 认证相关方法
     */
    get authStore() {
        return this._authStore;
    }

    set authStore(value) {
        this._authStore = value;
    }
}

class Collection {
    constructor(client, name) {
        this.client = client;
        this.name = name;
        this.basePath = `/api/collections/${name}`;
    }

    /**
     * 获取记录列表
     */
    async getList(page = 1, perPage = 30, options = {}) {
        const query = {
            page,
            perPage,
            ...options.query
        };

        if (options.filter) {
            query.filter = options.filter;
        }

        if (options.sort) {
            query.sort = options.sort;
        }

        if (options.expand) {
            query.expand = options.expand;
        }

        return this.client.send(`${this.basePath}/records`, {
            method: 'GET',
            query
        });
    }

    /**
     * 获取完整列表（所有记录）
     */
    async getFullList(options = {}) {
        const query = {
            perPage: 500,
            ...options.query
        };

        if (options.filter) {
            query.filter = options.filter;
        }

        if (options.sort) {
            query.sort = options.sort;
        }

        if (options.expand) {
            query.expand = options.expand;
        }

        return this.client.send(`${this.basePath}/records`, {
            method: 'GET',
            query
        });
    }

    /**
     * 获取单个记录
     */
    async getOne(id, options = {}) {
        const query = {};

        if (options.expand) {
            query.expand = options.expand;
        }

        return this.client.send(`${this.basePath}/records/${id}`, {
            method: 'GET',
            query
        });
    }

    /**
     * 创建记录
     */
    async create(data, options = {}) {
        const query = {};

        if (options.expand) {
            query.expand = options.expand;
        }

        return this.client.send(`${this.basePath}/records`, {
            method: 'POST',
            body: data,
            query
        });
    }

    /**
     * 更新记录
     */
    async update(id, data, options = {}) {
        const query = {};

        if (options.expand) {
            query.expand = options.expand;
        }

        return this.client.send(`${this.basePath}/records/${id}`, {
            method: 'PATCH',
            body: data,
            query
        });
    }

    /**
     * 删除记录
     */
    async delete(id) {
        return this.client.send(`${this.basePath}/records/${id}`, {
            method: 'DELETE'
        });
    }

    /**
     * 获取第一个匹配的记录
     */
    async getFirstListItem(filter, options = {}) {
        const result = await this.getList(1, 1, {
            ...options,
            filter
        });

        if (result.items && result.items.length > 0) {
            return result.items[0];
        }

        throw new Error('No records found');
    }
}

// 导出PocketBase类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PocketBase;
} else {
    window.PocketBase = PocketBase;
}