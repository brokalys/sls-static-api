import api from '../lib/brokalys-api';
import dynamodb from '../lib/dynamodb';

export const run = async (event) => {
  const query = JSON.parse(event.Records[0].body);

  // Don't hit the API unnecessarily
  const currentData = await dynamodb.get(
    process.env.CACHE_DYNAMODB_TABLE_NAME,
    query.hash,
  );
  if (currentData) {
    return;
  }

  const getterFn =
    query.source === 'real-sales'
      ? api.getVzdPricesInRange
      : api.getPricesInRange;

  const data = await getterFn(
    query.start_datetime,
    query.end_datetime,
    query.filters,
  );

  await dynamodb.put(process.env.CACHE_DYNAMODB_TABLE_NAME, {
    ...query,
    count: data.length,
    prices: data.map(({ price }) => price).filter((price) => !!price),
    pricesPerSqm: data
      .map(({ price_per_sqm }) => price_per_sqm)
      .filter((price_per_sqm) => !!price_per_sqm),
  });
};
