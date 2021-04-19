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
              calc_price_per_sqm: price_per_sqm
            }
          }
        }
      `,
      variables: {
        filter: {
          ...Object.entries(filters).map(([filter, value]) => ({
            [filter]: { eq: value },
          })),
          ...(filters.type === 'rent'
            ? { rent_type: { in: ['monthly', 'unknown'] } }
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

  return data.data;
}

export default { getPricesInRange };
