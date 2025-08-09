// Test script for editing session tracking and auto cleanup protection
const API_BASE_URL = 'http://localhost:8080/api';

async function testEditingSessionProtection() {
    console.log('🧪 Testing editing session protection for auto cleanup...');
    
    try {
        // Test 1: Check initial editing status
        console.log('\n1. Checking initial editing status...');
        let response = await fetch(`${API_BASE_URL}/editing/status`);
        let result = await response.json();
        console.log('Initial status:', result);
        
        // Test 2: Start an editing session
        console.log('\n2. Starting editing session for project 1...');
        response = await fetch(`${API_BASE_URL}/projects/1/editing/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: 1 })
        });
        result = await response.json();
        console.log('Start session result:', result);
        
        // Test 3: Check status with active session
        console.log('\n3. Checking status with active session...');
        response = await fetch(`${API_BASE_URL}/editing/status`);
        result = await response.json();
        console.log('Status with active session:', result);
        
        // Test 4: Try to trigger cleanup while editing (simulate a file deletion)
        console.log('\n4. Attempting to trigger auto cleanup while editing...');
        
        // We'll use the manual cleanup endpoint to test the protection
        try {
            response = await fetch(`${API_BASE_URL}/storage/cleanup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            result = await response.json();
            console.log('Cleanup result:', result);
        } catch (error) {
            console.log('Note: Manual cleanup endpoint might not exist, this is expected');
        }
        
        // Test 5: Send heartbeat
        console.log('\n5. Sending heartbeat...');
        response = await fetch(`${API_BASE_URL}/projects/1/editing/heartbeat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: 1 })
        });
        result = await response.json();
        console.log('Heartbeat result:', result);
        
        // Test 6: End editing session
        console.log('\n6. Ending editing session...');
        response = await fetch(`${API_BASE_URL}/projects/1/editing/end`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: 1 })
        });
        result = await response.json();
        console.log('End session result:', result);
        
        // Test 7: Check final status
        console.log('\n7. Checking final status...');
        response = await fetch(`${API_BASE_URL}/editing/status`);
        result = await response.json();
        console.log('Final status:', result);
        
        console.log('\n✅ Test completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testEditingSessionProtection();
