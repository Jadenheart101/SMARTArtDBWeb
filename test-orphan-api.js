const http = require('http');

function makeRequest(options, data = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
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

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function testOrphanAPI() {
    console.log('🧪 Testing orphan detection API endpoint...');

    try {
        // Test the art orphan detection endpoint
        const response = await makeRequest({
            hostname: 'localhost',
            port: 8080,
            path: '/api/admin/database/orphaned/art',
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('📊 API Response Status:', response.status);
        console.log('📋 Orphaned art records found:', response.data.data?.orphanedCount || 0);
        
        if (response.data.data?.orphanedRecords?.length > 0) {
            console.log('⚠️  Found orphaned records:');
            console.table(response.data.data.orphanedRecords);
        } else {
            console.log('✅ No orphaned art records found - orphan detection is working correctly!');
        }

        console.log('🎯 Full API Response:');
        console.log(JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testOrphanAPI();
