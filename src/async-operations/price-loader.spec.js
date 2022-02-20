import { run } from './price-loader';

import api from '../lib/brokalys-api';
import dynamodb from '../lib/dynamodb';

jest.mock('../lib/brokalys-api');
jest.mock('../lib/dynamodb');

function makeEvent(customMessage = {}) {
  return {
    Records: [
      {
        body: JSON.stringify({
          start_datetime: '2019-01-01T00:00:00.000Z',
          end_datetime: '2019-02-01T00:00:00.000Z',
          filters: {
            category: 'apartment',
          },
          ...customMessage,
        }),
      },
    ],
  };
}

describe('price-loader', () => {
  let event;

  beforeEach(() => {
    event = makeEvent();
  });

  beforeEach(jest.resetAllMocks);

  test('writes the data in dynamodb upon successful data retrieval for classifieds', async () => {
    api.getPricesInRange.mockReturnValueOnce([
      { price: 100, price_per_sqm: 10 },
      { price: 200, price_per_sqm: 20 },
    ]);

    await run(event);

    expect(dynamodb.put).toBeCalledWith(
      expect.any(String),
      expect.objectContaining({
        count: 2,
        prices: [100, 200],
        pricesPerSqm: [10, 20],
      }),
    );
  });

  test('writes the data in dynamodb upon successful data retrieval for VZD', async () => {
    api.getVzdPricesInRange.mockReturnValueOnce([
      { price: 100, price_per_sqm: 10 },
      { price: 200, price_per_sqm: 20 },
    ]);

    await run(makeEvent({ source: 'real-sales' }));

    expect(dynamodb.put).toBeCalledWith(
      expect.any(String),
      expect.objectContaining({
        count: 2,
        prices: [100, 200],
        pricesPerSqm: [10, 20],
      }),
    );
  });

  test('throws an error if the API threw a fatal error', () => {
    api.getPricesInRange.mockImplementationOnce(() => {
      throw new Error('Issue with the API');
    });

    expect(run(event)).rejects.toThrowError();
    expect(dynamodb.put).not.toBeCalled();
  });
});
