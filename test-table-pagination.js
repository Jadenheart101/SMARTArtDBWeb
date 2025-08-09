const http = require('http');

function makeRequest(path) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost',
            port: 8080,
            path: path,
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        }, (res) => {
            let responseData = '';
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            res.on('end', () => {
                try {
                    const parsedData = JSON.parse(responseData);
                    resolve({ status: res.statusCode, data: parsedData });
                } catch (e) {
                    resolve({ status: res.statusCode, data: responseData });
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        req.end();
    });
}

async function testTablePagination() {
    console.log('🧪 Testing database table pagination...');

    const tables = ['project', 'card', 'art', 'user', 'media_files', 'poi', 'project_topics'];

    for (const tableName of tables) {
        try {
            console.log(`\n📊 Testing ${tableName} table:`);
            
            const response = await makeRequest(`/api/admin/database/tables/${tableName}?page=1&limit=50`);
            
            if (response.status === 200 && response.data.success) {
                const { pagination } = response.data.data;
                
                console.log(`  ✅ API Response: page=${pagination.page}, limit=${pagination.limit}, total=${pagination.total}, totalPages=${pagination.totalPages}`);
                
                // Simulate the frontend logic
                if (pagination && pagination.total !== undefined) {
                    if (pagination.page && pagination.limit && !isNaN(pagination.page) && !isNaN(pagination.limit)) {
                        const start = ((pagination.page - 1) * pagination.limit) + 1;
                        const end = Math.min(pagination.page * pagination.limit, pagination.total);
                        console.log(`  📋 Display should show: "${start}-${end} of ${pagination.total} records"`);
                    } else {
                        console.log(`  📋 Display should show: "${pagination.total} records"`);
                    }
                } else {
                    console.log(`  📋 Display should show: "0 records"`);
                }
                
                // Test pagination controls
                const hasPrev = pagination.page > 1;
                const hasNext = pagination.page < pagination.totalPages;
                console.log(`  🔄 Pagination: Previous=${hasPrev ? 'enabled' : 'disabled'}, Next=${hasNext ? 'enabled' : 'disabled'}`);
                
            } else {
                console.log(`  ❌ Failed to load ${tableName}: ${response.status}`);
            }
        } catch (error) {
            console.error(`  ❌ Error testing ${tableName}:`, error.message);
        }
    }
}

testTablePagination();
