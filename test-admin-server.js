const express = require('express');
const app = express();

app.use(express.json());

// Test admin login endpoint
app.post('/test-admin-login', (req, res) => {
    // Return a mock admin user for testing
    const adminUser = {
        id: 1,
        username: 'admin',
        isAdmin: true
    };
    
    res.json({
        success: true,
        message: 'Test admin login successful',
        user: adminUser
    });
});

app.listen(3001, () => {
    console.log('Test server running on http://localhost:3001');
    console.log('Use this admin user for testing:');
    console.log('Username: admin');
    console.log('Password: any password will work for this test');
});
