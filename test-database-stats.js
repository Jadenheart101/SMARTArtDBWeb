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

async function testDatabaseStats() {
    console.log('🧪 Testing database stats API...');

    try {
        const response = await makeRequest('/api/admin/database/stats');
        
        console.log('📊 API Response Status:', response.status);
        
        if (response.data.success) {
            console.log('✅ Database stats loaded successfully!');
            console.log('📋 Table Counts:');
            
            const tableCounts = response.data.data.tableCounts;
            Object.entries(tableCounts).forEach(([table, count]) => {
                console.log(`  ${table}: ${count} records`);
            });
            
            console.log('\n🎯 Tab Button Updates:');
            const tabMappings = {
                'user': 'Users',
                'project': 'Projects', 
                'project_topics': 'Topics',
                'poi': 'POIs',
                'card': 'Cards',
                'art': 'Art',
                'media_files': 'Media Files'
            };
            
            Object.entries(tabMappings).forEach(([tableName, displayName]) => {
                const count = tableCounts[tableName] || 0;
                console.log(`  ${displayName} tab should show: "${displayName} (${count})"`);
            });
            
        } else {
            console.log('❌ Failed to load database stats:', response.data);
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testDatabaseStats();
