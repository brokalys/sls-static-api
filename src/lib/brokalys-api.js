import { latviaRelationships } from '@brokalys/location-json-schemas';
import axios from 'axios';

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
  };

  const { data } = await axios.post(
    process.env.BROKALYS_API_URL,
    {
      query: `
        query DataExtraction_VZDPricesInRange($buildingFilter: BuildingFilter!, $vzdFilter: VZDFilter!) {
          buildings(
            filter: $buildingFilter,
            limit: null
          ) {
            vzd {
              ${apiField}(filter: $vzdFilter) {
                price
                area: ${areaField[filters.category]}
              }
            }
          }
        }
      `,
      variables: {
        buildingFilter: {
          location_classificator: {
            in: [
              filters.location_classificator,
              ...(latviaRelationships[filters.location_classificator] || []),
            ],
          },
        },
        vzdFilter: {
          sale_date: {
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

  const prices = [];
  for (const building of data.data.buildings) {
    for (const sale of building.vzd[apiField]) {
      prices.push({
        price: sale.price,
        price_per_sqm: sale.price / sale.area,
      });
    }
  }

  return prices;
}

export default { getPricesInRange, getVzdPricesInRange };
