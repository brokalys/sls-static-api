import axios from 'axios';

import { getPricesInRange } from './brokalys-api';

describe('api', () => {
  describe('getPricesInRange', () => {
    beforeAll(() => {
      axios.post.mockResolvedValue({
        data: {
          data: {
            results: [],
          },
        },
      });
    });

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

    test('appends all the RIGA neighborhoods to the filter when latvia-riga location classificator used', async () => {
      await getPricesInRange(
        '2019-01-01T00:00:00.000Z',
        '2019-02-01T00:00:00.000Z',
        {
          category: 'apartment',
          location_classificator: 'latvia-riga',
        },
      );

      expect(axios.post).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          variables: expect.objectContaining({
            filter: expect.objectContaining({
              location_classificator: {
                in: [
                  'latvia-riga',
                  'latvia-riga-agenskalns',
                  'latvia-riga-atgazene',
                  'latvia-riga-avoti',
                  'latvia-riga-beberbeki',
                  'latvia-riga-bergi',
                  'latvia-riga-bierini',
                  'latvia-riga-bisumuiza',
                  'latvia-riga-bolderaja',
                  'latvia-riga-brasa',
                  'latvia-riga-breksi',
                  'latvia-riga-bukulti',
                  'latvia-riga-bulli',
                  'latvia-riga-centrs',
                  'latvia-riga-ciekurkalns',
                  'latvia-riga-daugavgriva',
                  'latvia-riga-dreilini',
                  'latvia-riga-dzirciems',
                  'latvia-riga-darzciems',
                  'latvia-riga-darzini',
                  'latvia-riga-grizinkalns',
                  'latvia-riga-imanta',
                  'latvia-riga-ilguciems',
                  'latvia-riga-jaunciems',
                  'latvia-riga-jugla',
                  'latvia-riga-katlakalns',
                  'latvia-riga-kleisti',
                  'latvia-riga-kundzinsala',
                  'latvia-riga-kengarags',
                  'latvia-riga-kipsala',
                  'latvia-riga-mangalsala',
                  'latvia-riga-maskavasForstate',
                  'latvia-riga-mezaparks',
                  'latvia-riga-mezciems',
                  'latvia-riga-milgravis',
                  'latvia-riga-mukupurvs',
                  'latvia-riga-pleskodale',
                  'latvia-riga-purvciems',
                  'latvia-riga-petersalaAndrejsala',
                  'latvia-riga-plavnieki',
                  'latvia-riga-rumbula',
                  'latvia-riga-salas',
                  'latvia-riga-sarkandaugava',
                  'latvia-riga-skanste',
                  'latvia-riga-skirotava',
                  'latvia-riga-spilve',
                  'latvia-riga-suzi',
                  'latvia-riga-sampeteris',
                  'latvia-riga-teika',
                  'latvia-riga-tornakalns',
                  'latvia-riga-trisciems',
                  'latvia-riga-vecdaugava',
                  'latvia-riga-vecmilgravis',
                  'latvia-riga-vecpilseta',
                  'latvia-riga-vecaki',
                  'latvia-riga-voleri',
                  'latvia-riga-zasulauks',
                  'latvia-riga-ziepniekkalns',
                  'latvia-riga-zolitude',
                ],
              },
            }),
          }),
        }),
        expect.any(Object),
      );
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
