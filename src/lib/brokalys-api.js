import { latviaRelationships } from '@brokalys/location-json-schemas';
import axios from 'axios';
import groupBy from 'lodash.groupby';

export async function getPricesInRange(start, end, filters) {
  const { data } = await axios.post(
    process.env.BROKALYS_API_URL,
    {
      query: `
        query DataExtraction_PricesInRange($filter: PropertyFilter!) {
          properties(
            filter: $filter,
            limit: null
          ) {
            results {
              price
              price_per_sqm: calc_price_per_sqm
            }
          }
        }
      `,
      variables: {
        filter: {
          ...Object.entries(filters).reduce(
            (carry, [filter, value]) => ({
              ...carry,
              [filter]: { eq: value },
            }),
            {},
          ),
          ...(filters.type === 'rent'
            ? { rent_type: { in: ['monthly', 'unknown'] } }
            : {}),
          ...(filters.location_classificator
            ? {
                location_classificator: {
                  in: [
                    filters.location_classificator,
                    ...(latviaRelationships[filters.location_classificator] ||
                      []),
                  ],
                },
              }
            : {}),
          published_at: {
            gte: start,
            lte: end,
          },
        },
      },
    },
    {
      headers: {
        'x-api-key': process.env.BROKALYS_API_GATEWAY_KEY,
      },
    },
  );

  if (data.errors) {
    throw new Error('Error calling the API: ' + JSON.stringify(data.errors));
  }

  return data.data.properties.results;
}

export async function getVzdPricesInRange(start, end, filters) {
  const apiField = filters.category + 's';
  const areaField = {
    apartment: 'apartment_total_area_m2',
    premise: 'space_group_total_area_m2',
    house: 'building_total_area_m2',
    land: 'land_total_area_m2',
  };

  const { data } = await axios.post(
    process.env.BROKALYS_API_URL,
    {
      query: `
        query DataExtraction_VZDPricesInRange($filter: VZDFilter!) {
          vzd {
            ${apiField}(
              filter: $filter
              limit: null
            ) {
              sale_id
              price
              area: ${areaField[filters.category]}
            }
          }
        }
      `,
      variables: {
        filter: {
          sale_date: {
            gte: start,
            lte: end,
          },
          location_classificator: {
            in: [
              filters.location_classificator,
              ...(latviaRelationships[filters.location_classificator] || []),
            ],
          },
        },
      },
    },
    {
      headers: {
        'x-api-key': process.env.BROKALYS_API_GATEWAY_KEY,
      },
    },
  );

  if (data.errors) {
    throw new Error('Error calling the API: ' + JSON.stringify(data.errors));
  }

  return Object.values(groupBy(data.data.vzd[apiField], 'sale_id')).map(
    (sales) => {
      const totalArea = sales.reduce((carry, sale) => carry + sale.area, 0);
      const [{ price }] = sales;

      return {
        price,
        price_per_sqm: price > 0 && totalArea > 0 ? price / totalArea : null,
      };
    },
  );
}

export default { getPricesInRange, getVzdPricesInRange };
