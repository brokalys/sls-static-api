import axios from 'axios';

import { getPricesInRange } from './brokalys-api';

describe('api', () => {
  describe('getPricesInRange', () => {
    test('successfully retrieves the price data', async () => {
      const expectation = {
        results: [
          {
            price: 100,
            price_per_sqm: 10,
          },
          {
            price: 200,
            price_per_sqm: 20,
          },
        ],
      };
      axios.post.mockResolvedValueOnce({ data: { data: expectation } });

      const output = await getPricesInRange(
        '2019-01-01T00:00:00.000Z',
        '2019-02-01T00:00:00.000Z',
        {
          category: 'apartment',
        },
      );

      expect(output).toEqual(expectation);
    });

    test('fails retrieving the price data due to validation error', async () => {
      const expectation = {
        data: null,
        errors: {
          message: 'A mysterious error occurred',
        },
      };
      axios.post.mockResolvedValueOnce({ data: expectation });

      expect(
        getPricesInRange(
          '2019-01-01T00:00:00.000Z',
          '2019-02-01T00:00:00.000Z',
          {
            category: 'wrong',
          },
        ),
      ).rejects.toThrowError();
    });

    test('fails retrieving the price data due to API server error', () => {
      axios.post.mockImplementation(() => {
        throw new Error('Fatal API Error');
      });

      expect(
        getPricesInRange(
          '2019-01-01T00:00:00.000Z',
          '2019-02-01T00:00:00.000Z',
          {
            category: 'apartment',
          },
        ),
      ).rejects.toThrowError();
    });
  });
});
