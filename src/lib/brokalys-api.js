import axios from 'axios';

export async function getPricesInRange(start, end, filters) {
  const { data } = await axios.post(
    'https://api.brokalys.com',
    {
      query: `
        {
          properties(
            filter: {
              ${Object.entries(filters).map(
                ([filter, value]) => `
                ${filter}: { eq: "${value}" }
              `,
              )}
              ${
                filters.type === 'rent'
                  ? 'rent_type: { in: ["monthly", "unknown"] }'
                  : ''
              }
              published_at: {
                gte: "${start}"
                lte: "${end}"
              }
            },
            limit: null
          ) {
            results {
              price
              price_per_sqm
            }
          }
        }
      `,
    },
    {
      headers: {
        Authorization: process.env.BROKALYS_PRIVATE_KEY,
      },
    },
  );

  if (data.errors) {
    throw new Error('Error calling the API: ' + JSON.stringify(data.errors));
  }

  return data.data;
}

export default { getPricesInRange };