import dynamodb from 'serverless-dynamodb-client';

import { batchGet, put } from './dynamodb';

jest.mock('serverless-dynamodb-client');

describe('dynamodb', () => {
  describe('batchGet', () => {
    test('retrieves data', async () => {
      const expectation = [{ hash: 'test_123' }];
      dynamodb.doc.batchGet.mockReturnValue({
        promise: () => ({
          Responses: { 'table-name': expectation },
        }),
      });

      const output = await batchGet('table-name', [
        { hash: 'test_123' },
        { hash: 'test_333' },
      ]);

      expect(output).toEqual(expectation);
    });
  });

  describe('put', () => {
    test('inserts data', async () => {
      await put('table-name', { hash: 'test_333' });

      expect(dynamodb.doc.put).toBeCalled();
    });
  });
});
