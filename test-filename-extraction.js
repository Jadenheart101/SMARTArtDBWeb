// Test filename extraction from project ImageURL
const testProject = {
    ImageURL: "/uploads/user_anonymous/images/1754449687142_qsutbgg.jpg"
};

console.log('Testing filename extraction...');
console.log('Project ImageURL:', testProject.ImageURL);

// Extract media filename from the URL (same logic as in loadProjectArtInfo)
const urlParts = testProject.ImageURL.split('/');
const filename = urlParts[urlParts.length - 1];

console.log('URL parts:', urlParts);
console.log('Extracted filename:', filename);

// This should be: 1754449687142_qsutbgg.jpg
