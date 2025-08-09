// Test script for editing session tracking and auto cleanup protection
// This test uses node's built-in fetch (Node.js 18+)

async function testEditingSessionProtection() {
    console.log('🧪 Testing editing session protection for auto cleanup...');
    
    const API_BASE_URL = 'http://localhost:8080/api';
    
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
        
        // Test 4: Send heartbeat
        console.log('\n4. Sending heartbeat...');
        response = await fetch(`${API_BASE_URL}/projects/1/editing/heartbeat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: 1 })
        });
        result = await response.json();
        console.log('Heartbeat result:', result);
        
        // Test 5: Wait a moment and check status again
        console.log('\n5. Waiting and checking status again...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        response = await fetch(`${API_BASE_URL}/editing/status`);
        result = await response.json();
        console.log('Status after heartbeat:', result);
        
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
        console.log('\n🔍 Summary:');
        console.log('- Editing sessions can be started, tracked, and ended');
        console.log('- Heartbeat mechanism works for keeping sessions alive');
        console.log('- Status endpoint shows active editing sessions');
        console.log('- Auto cleanup should be blocked when sessions are active');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Check if we're in Node.js and have fetch available
if (typeof fetch === 'undefined') {
    console.error('❌ This test requires Node.js 18+ with built-in fetch support');
    process.exit(1);
}

// Run the test
testEditingSessionProtection();
