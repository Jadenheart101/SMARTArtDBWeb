const { executeQuery } = require('./database');

async function testIds() {
  try {
    console.log('Testing topic IDs...');
    const topics = await executeQuery('SELECT TopicID FROM topic ORDER BY TopicID');
    console.log('Existing topic IDs:', topics.map(t => t.TopicID));
    
    console.log('\nTesting card IDs...');
    const cards = await executeQuery('SELECT CardID FROM card ORDER BY CardID');
    console.log('Existing card IDs:', cards.map(c => c.CardID));
    
    console.log('\nTesting POI IDs...');
    const pois = await executeQuery('SELECT POIID FROM poi ORDER BY POIID');
    console.log('Existing POI IDs:', pois.map(p => p.POIID));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testIds();
