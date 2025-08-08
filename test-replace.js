const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testReplacement() {
    try {
        console.log('🔄 Testing media replacement: qsutbgg → Vulkxi');
        console.log('📝 Replacing media ID 19 with Vulkxi.png...');
        
        const form = new FormData();
        form.append('file', fs.createReadStream('uploads/user_anonymous/images/1754607302361_Vulkxi.png'));
        form.append('userId', '1');
        
        const response = await fetch('http://localhost:8080/api/media/19/replace', {
            method: 'POST',
            body: form
        });
        
        const result = await response.text();
        console.log(`📊 Response Status: ${response.status}`);
        console.log('📋 Response Body:', result);
        
        if (response.status === 200) {
            console.log('✅ Replacement successful!');
            
            // Now check the database to see the updated record
            console.log('🔍 Checking database update...');
            const mysql = require('mysql2/promise');
            const connection = await mysql.createConnection({
                host: 'localhost',
                user: 'root',
                password: '',
                database: 'smartart'
            });
            
            const [rows] = await connection.execute('SELECT * FROM media_files WHERE id = 19');
            if (rows.length > 0) {
                const file = rows[0];
                console.log('📄 Updated record:');
                console.log(`   ID: ${file.id}`);
                console.log(`   Original: ${file.original_name}`);
                console.log(`   Stored: ${file.file_name}`);
                console.log(`   Path: ${file.file_path}`);
                console.log(`   Updated: ${file.updated_at}`);
            }
            
            await connection.end();
        } else {
            console.log('❌ Replacement failed');
        }
        
    } catch (error) {
        console.error('💥 Error:', error.message);
    }
}

testReplacement();
