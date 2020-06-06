import { run } from './monthly-stats';

import dynamodb from '../lib/dynamodb';
import sns from '../lib/sns';

jest.mock('../lib/dynamodb');
jest.mock('../lib/sns');

describe('monthly-stats', () => {
  beforeEach(jest.resetAllMocks);

  test.each([
    encodeURIComponent(JSON.stringify({ category: 'APARTMENT', type: 'sell' })), // case sensitive
    encodeURIComponent(JSON.stringify({ category: 'apartment', type: 'SELL' })), // case sensitive
    encodeURIComponent(JSON.stringify({ category: 'unknown', type: 'sell' })), // unknown values
    encodeURIComponent(
      JSON.stringify({ category: 'apartment', type: 'unknown' }),
    ), // unknown values
    encodeURIComponent(JSON.stringify({ unknown: 'apartment', type: 'sell' })), // unknown keys
    encodeURIComponent(JSON.stringify({})), // missing category
    encodeURIComponent({ category: 'apartment', type: 'sell' }), // not JSON-encoded

    // wrong datatypes
    '',
    'wrong',
    undefined,
    null,
    123,
    1.23,
    true,
    false,
    {},
  ])(
    'returns a validation error if filter validation fails with: %# - %j',
    async (input) => {
      const output = await run({
        queryStringParameters: {
          filters: input,
        },
      });

      expect(output).toEqual(
        expect.objectContaining({
          statusCode: 400,
        }),
      );
    },
  );

  test.each([
    { filters: {} }, // missing filters
    { filters: { category: 'apartment' } }, // missing type filter
    { filters: { type: 'sell' } }, // missing category filter
    {
      filters: { category: 'apartment', type: 'sell' },
      end_datetime: '2050-01-01',
    }, // cannot be in future
    {
      filters: { category: 'apartment', type: 'sell' },
      start_datetime: '2020-02-01',
      end_datetime: '2020-01-01',
    }, // start cannot be before end
    {
      filters: { category: 'apartment', type: 'sell' },
      start_datetime: '2017-12-01',
    }, // start cannot be before 2018-01-01
    { discard: 1.1 }, // too large discard
    { discard: -1 }, // too small discard
    { discard: 0.133 }, // precision wrong (max: 2)

    // wrong datatypes
    '',
    'wrong',
    undefined,
    null,
    123,
    1.23,
    true,
    false,
    {},
  ])(
    'returns a validation error if root-level validation fails with: %# - %j',
    async (input) => {
      const output = await run({
        queryStringParameters: input,
      });

      expect(output).toEqual(
        expect.objectContaining({
          statusCode: 400,
        }),
      );
    },
  );

  test('returns the data upon success', async () => {
    dynamodb.batchGet.mockReturnValueOnce([
      {
        hash: 'third_hash',
        start_datetime: '2018-03-01T00:00:00.000Z',
        prices: [],
        pricesPerSqm: [],
      },
      {
        hash: 'first_hash',
        start_datetime: '2018-01-01T00:00:00.000Z',
        prices: [100],
        pricesPerSqm: [10],
      },
      {
        hash: 'second_hash',
        start_datetime: '2018-02-01T00:00:00.000Z',
        prices: [200, 300],
        pricesPerSqm: [20, 30],
      },
    ]);

    const output = await run({
      queryStringParameters: {
        start_datetime: '2018-01-01',
        end_datetime: '2018-04-01',
        filters: { category: 'apartment', type: 'sell' },
      },
    });

    expect(output).toMatchSnapshot();
    expect(sns.publish).not.toBeCalled();
  });

  test.only('discards 50% of the results', async () => {
    dynamodb.batchGet.mockReturnValueOnce([
      {
        hash: 'third_hash',
        start_datetime: '2018-03-01T00:00:00.000Z',
        prices: [100, 200, 300],
        pricesPerSqm: [10, 20, 30],
      },
      {
        hash: 'first_hash',
        start_datetime: '2018-01-01T00:00:00.000Z',
        prices: [100],
        pricesPerSqm: [10],
      },
      {
        hash: 'second_hash',
        start_datetime: '2018-02-01T00:00:00.000Z',
        prices: [200, 300, 400, 500],
        pricesPerSqm: [20, 30, 40, 50],
      },
    ]);

    const output = await run({
      queryStringParameters: {
        discard: 0.5,
        start_datetime: '2018-01-01',
        end_datetime: '2018-04-01',
        filters: { category: 'apartment', type: 'sell' },
      },
    });

    expect(output).toMatchSnapshot();
    expect(sns.publish).not.toBeCalled();
  });

  test('triggers a SNS to load the complete dataset if something is missing', async () => {
    dynamodb.batchGet.mockReturnValueOnce([
      {
        hash: 'first_hash',
        prices: [100],
        pricesPerSqm: [10],
      },
    ]);

    await run({
      queryStringParameters: {
        start_datetime: '2018-01-01',
        end_datetime: '2018-03-01',
        filters: { category: 'apartment', type: 'sell' },
      },
    });

    expect(sns.publish).toBeCalled();
    expect(sns.publish).not.toBeCalledWith({
      hash: 'first_hash',
      filters: {
        category: 'apartment',
      },
    });
  });
});
