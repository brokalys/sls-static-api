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
          UnprocessedKeys: {},
        }),
      });

      const output = await batchGet('table-name', [
        { hash: 'test_123' },
        { hash: 'test_333' },
      ]);

      expect(output).toEqual(expectation);
    });

    test('recursively retrieves data', async () => {
      dynamodb.doc.batchGet.mockReturnValueOnce({
        promise: () => ({
          Responses: { 'table-name': [{ hash: 'test_123' }] },
          UnprocessedKeys: { 'table-name': { Keys: [{ hash: 'test_444' }] } },
        }),
      });
      dynamodb.doc.batchGet.mockReturnValueOnce({
        promise: () => ({
          Responses: { 'table-name': [{ hash: 'test_444' }] },
          UnprocessedKeys: {},
        }),
      });

      const output = await batchGet('table-name', [
        { hash: 'test_123' },
        { hash: 'test_333' },
        { hash: 'test_444' },
      ]);

      expect(output).toEqual([{ hash: 'test_123' }, { hash: 'test_444' }]);
    });
  });

  describe('put', () => {
    test('inserts data', async () => {
      await put('table-name', { hash: 'test_333' });

      expect(dynamodb.doc.put).toBeCalled();
    });
  });
});
