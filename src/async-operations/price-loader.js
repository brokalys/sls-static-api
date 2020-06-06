import api from '../lib/brokalys-api';
import dynamodb from '../lib/dynamodb';

export const run = async (event) => {
  const query = JSON.parse(event.Records[0].Sns.Message);

  const data = await api.getPricesInRange(
    query.start_datetime,
    query.end_datetime,
    query.filters,
  );

  const { results } = data.properties;

  await dynamodb.put(`${process.env.APP_STAGE}-properties-monthly`, {
    ...query,
    count: results.length,
    prices: results.map(({ price }) => price).filter((price) => !!price),
    pricesPerSqm: results
      .map(({ price_per_sqm }) => price_per_sqm)
      .filter((price_per_sqm) => !!price_per_sqm),
  });
};
