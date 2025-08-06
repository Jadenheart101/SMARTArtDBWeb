// Test script to check if media preview auto-displays on login
console.log('🧪 Testing Media Preview Auto-Display Fix');

// Simulate the login flow
function testLoginFlow() {
    console.log('Testing login flow...');
    
    // Check if media preview modal exists
    const mediaPreviewModal = document.getElementById('mediaPreviewModal');
    if (mediaPreviewModal) {
        console.log('✅ Media preview modal found');
        console.log('Modal display style:', mediaPreviewModal.style.display);
        
        if (mediaPreviewModal.style.display === 'block') {
            console.log('❌ ISSUE: Media preview modal is visible on page load!');
        } else {
            console.log('✅ Media preview modal is properly hidden');
        }
    } else {
        console.log('⚠️ Media preview modal not found (might not be loaded yet)');
    }
    
    // Check for any existing onclick errors
    const mediaItems = document.querySelectorAll('.media-item');
    console.log(`Found ${mediaItems.length} media items`);
    
    if (mediaItems.length > 0) {
        console.log('Testing first media item click handler...');
        try {
            // Test if the onclick handler has proper syntax
            const firstItem = mediaItems[0];
            const onclickAttr = firstItem.getAttribute('onclick');
            console.log('Onclick attribute:', onclickAttr);
            
            if (onclickAttr && onclickAttr.includes('previewMediaSafe')) {
                console.log('✅ Using safe preview function');
            } else if (onclickAttr && onclickAttr.includes('previewMedia')) {
                console.log('⚠️ Still using old previewMedia function');
            }
        } catch (error) {
            console.log('❌ Error with media item click handler:', error);
        }
    }
}

// Wait for DOM to be ready, then test
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', testLoginFlow);
} else {
    testLoginFlow();
}

// Also test after a short delay to account for dynamic content
setTimeout(testLoginFlow, 2000);
