// Test script to verify the Add Art Info functionality is working
console.log('🎯 Testing Add Art Info functionality...');

// Simulate what the browser does when clicking "Add Art Info"
const testData = {
    mediaFilename: '1754743997357_qsutbgg.jpg',
    mockResponse: {
        success: true,
        files: [
            {
                id: 4,
                name: '1754743997357_qsutbgg.jpg',
                originalName: '1754743997357_qsutbgg.jpg',
                displayName: null,
                url: '/uploads/user_anonymous/images/1754743997357_qsutbgg.jpg',
                size: 123456,
                mimeType: 'image/jpeg',
                fileType: 'image'
            },
            {
                id: 2,
                name: '1754742876402_Vulkxi.png',
                originalName: '1754742876402_Vulkxi.png',
                displayName: null,
                url: '/uploads/user_anonymous/images/1754742876402_Vulkxi.png',
                size: 789012,
                mimeType: 'image/png',
                fileType: 'image'
            },
            {
                id: 1,
                name: '1754742557081_qsutbgg.jpg',
                originalName: '1754742557081_qsutbgg.jpg',
                displayName: null,
                url: '/uploads/user_anonymous/images/1754742557081_qsutbgg.jpg',
                size: 345678,
                mimeType: 'image/jpeg',
                fileType: 'image'
            }
        ]
    }
};

console.log('🔍 Looking for:', testData.mediaFilename);

// Test the matching logic
const mediaFile = testData.mockResponse.files.find(file => 
    file.name === testData.mediaFilename || 
    file.originalName === testData.mediaFilename ||
    (file.url && file.url.includes(testData.mediaFilename))
);

if (mediaFile) {
    console.log('✅ SUCCESS! Found matching file:', {
        id: mediaFile.id,
        name: mediaFile.name,
        url: mediaFile.url
    });
    
    const imageInfo = {
        id: mediaFile.id,
        src: mediaFile.url,
        name: mediaFile.displayName || mediaFile.originalName || mediaFile.name,
        file_name: mediaFile.name
    };
    
    console.log('📋 Image info object created:', imageInfo);
    console.log('🎉 Add Art Info should now work properly!');
} else {
    console.log('❌ FAILED! No matching file found');
    console.log('Available files:');
    testData.mockResponse.files.forEach(file => {
        console.log(`  - name: "${file.name}"`);
        console.log(`  - originalName: "${file.originalName}"`);
        console.log(`  - url: "${file.url}"`);
    });
}
