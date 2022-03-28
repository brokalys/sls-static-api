import { run } from './monthly-stats';

import dynamodb from '../lib/dynamodb';
import sqs from '../lib/sqs';

jest.mock('../lib/dynamodb');
jest.mock('../lib/sqs');

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
      start_datetime: '2013-02-01',
    }, // too far in the past
    {
      filters: { category: 'apartment', type: 'sell' },
      start_datetime: '2017-12-01',
    }, // start cannot be before 2018-01-01
    { discard: 1.1 }, // too large discard
    { discard: -1 }, // too small discard
    { discard: 0.133 }, // precision wrong (max: 2)
    { source: 'wrong', filters: { category: 'apartment', type: 'sell' } }, // unrecognized source
    { filters: { category: 'apartment', type: 'sell' }, period: 'wrong' }, // unrecognized period

    // Real sales
    { source: 'real-sales' }, // location_classificator is required
    { source: 'real-sales', filters: { category: 'apartment' } }, // location_classificator is required
    { source: 'real-sales', filters: { category: 'apartment', type: 'sell' } }, // location_classificator is required
    {
      source: 'real-sales',
      filters: { category: 'land', location_classificator: 'latvia-riga' },
    }, // land is not allowed

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

  test('returns the data upon success for classifieds', async () => {
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
    expect(sqs.sendMessage).not.toBeCalled();
  });

  test('returns the data grouped in quarters', async () => {
    dynamodb.batchGet.mockReturnValueOnce([
      {
        hash: 'first_hash',
        start_datetime: '2018-01-01T00:00:00.000Z',
        prices: [100, 200, 300],
        pricesPerSqm: [10, 20, 30],
      },
      {
        hash: 'second_hash',
        start_datetime: '2018-05-01T00:00:00.000Z',
        prices: [400],
        pricesPerSqm: [40],
      },
    ]);

    const output = await run({
      queryStringParameters: {
        start_datetime: '2018-01-01',
        end_datetime: '2018-09-01',
        filters: { category: 'apartment', type: 'sell' },
        period: 'quarter',
      },
    });

    expect(output).toMatchSnapshot();
    expect(sqs.sendMessage).not.toBeCalled();
  });

  test('returns the data upon success for real sales', async () => {
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
        source: 'real-sales',
        start_datetime: '2013-01-01',
        end_datetime: '2018-04-01',
        filters: {
          category: 'apartment',
          location_classificator: 'latvia-riga',
        },
      },
    });

    expect(output).toMatchSnapshot();
    expect(sqs.sendMessage).toBeCalled();
  });

  test('discards 50% of the results', async () => {
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
    expect(sqs.sendMessage).not.toBeCalled();
  });

  test('triggers a SQS to load the complete dataset if something is missing', async () => {
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

    expect(sqs.sendMessage).toBeCalled();
    expect(sqs.sendMessage).not.toBeCalledWith({
      hash: 'first_hash',
      filters: {
        category: 'apartment',
      },
    });
  });

  test('triggers a SQS to load the complete dataset for missing quarter', async () => {
    dynamodb.batchGet.mockReturnValueOnce([
      {
        hash: 'aa909b5ed7c41e67cc8ace57a78dd996',
        start_datetime: '2018-01-01T00:00:00.000Z',
        prices: [100, 200, 300],
        pricesPerSqm: [10, 20, 30],
      },
    ]);

    await run({
      queryStringParameters: {
        start_datetime: '2018-01-01',
        end_datetime: '2018-09-01',
        filters: { category: 'apartment', type: 'sell' },
        period: 'quarter',
      },
    });

    expect(sqs.sendMessage).toBeCalledWith({
      hash: expect.any(String),
      start_datetime: '2018-04-01T00:00:00.000Z',
      end_datetime: '2018-06-30T23:59:59.999Z',
      filters: {
        category: 'apartment',
        type: 'sell',
      },
      source: undefined,
    });
  });
});
