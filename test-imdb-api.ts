#!/usr/bin/env bun
// Test the imdb-api package to see if it works

const imdb = require('imdb-api');

async function testIMDbAPI() {
  console.log('🔍 Testing imdb-api package...\n');

  try {
    // Test 1: Search for an actor
    console.log('Test 1: Searching for Tom Hanks...');
    const searchResults = await imdb.search({ name: 'Tom Hanks' }, { apiKey: 'none' });
    console.log(`✅ Found ${searchResults.results.length} results`);
    if (searchResults.results.length > 0) {
      console.log(`First result: ${searchResults.results[0].title} (${searchResults.results[0].imdbid})`);
    }
  } catch (err: any) {
    console.error('❌ Search test failed:', err.message);
  }

  try {
    // Test 2: Get movie by ID (without API key)
    console.log('\nTest 2: Getting movie by IMDb ID (Inception)...');
    const movie = await imdb.get({ id: 'tt1375666' }, { apiKey: 'none' });
    console.log(`✅ Title: ${movie.title}`);
    console.log(`   Year: ${movie.year}`);
    console.log(`   Rating: ${movie.rating}`);
  } catch (err: any) {
    console.error('❌ Movie lookup failed:', err.message);
  }

  try {
    // Test 3: Get person by ID
    console.log('\nTest 3: Getting person by IMDb ID (Tom Hanks - nm0000158)...');
    const person = await imdb.get({ id: 'nm0000158' }, { apiKey: 'none' });
    console.log(`✅ Name: ${person.name}`);
    console.log(`   Birth year: ${person.birthdate}`);
  } catch (err: any) {
    console.error('❌ Person lookup failed:', err.message);
  }

  console.log('\n📊 Conclusion:');
  console.log('The imdb-api package may require an OMDB API key for full functionality.');
  console.log('Free API key available at: http://www.omdbapi.com/apikey.aspx');
}

testIMDbAPI().then(() => {
  console.log('\n✅ Test complete');
}).catch(err => {
  console.error('\n❌ Test failed:', err);
});
