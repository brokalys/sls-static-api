jest.mock('aws-sdk', () => {
  const DynamoDB = jest.fn();
  DynamoDB.DocumentClient = jest.fn().mockReturnValue({
    batchGet: jest.fn().mockReturnValue({ promise: jest.fn() }),
    put: jest.fn().mockReturnValue({ promise: jest.fn() }),
  });

  return {
    DynamoDB,
    SNS: jest.fn().mockReturnValue({
      publish: jest.fn().mockReturnValue({ promise: jest.fn() }),
    }),
  };
});

jest.mock('axios');

process.env.CACHE_DYNAMODB_TABLE_NAME = 'dynamo-table-name';
