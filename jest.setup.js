jest.mock('axios');

process.env.CACHE_DYNAMODB_TABLE_NAME = 'dynamo-table-name';

// Fake API key
process.env.BUGSNAG_KEY = '8b93fbfe33771146a3769536ead44162';
