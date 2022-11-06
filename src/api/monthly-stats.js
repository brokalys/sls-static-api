import { latviaRelationships } from '@brokalys/location-json-schemas';
import Joi from 'joi';
import numbers from 'numbers';

import dynamodb from '../lib/dynamodb';
import createHash from '../lib/hash';
import moment from '../lib/moment';
import sqs from '../lib/sqs';

import Bugsnag from '@bugsnag/js';
import BugsnagPluginAwsLambda from '@bugsnag/plugin-aws-lambda';

const busgnagLogger = {
  debug: function () {},
  info: console.info,
  warn: console.warn,
  error: console.error,
};

Bugsnag.start({
  apiKey: process.env.BUGSNAG_KEY,
  logger: busgnagLogger,
  releaseStage: process.env.STAGE,
  enabledReleaseStages: ['staging', 'prod'],
  plugins: [BugsnagPluginAwsLambda],
});

const VALID_LOCATION_IDS = Array.from(
  Object.entries(latviaRelationships).reduce(
    (carry, [locationId, children]) => {
      carry.add(locationId);
      children.forEach((child) => carry.add(child));
      return carry;
    },
    new Set(),
  ),
);

const validationSchema = Joi.object({
  discard: Joi.number().min(0).max(1).precision(2),
  start_datetime: Joi.date()
    .default('2018-01-01')
    .when(Joi.ref('/source'), {
      is: 'real-sales',
      then: Joi.date().min('1998-01-01'),
      otherwise: Joi.date().min('2018-01-01'),
    }),
  end_datetime: Joi.date()
    .default(moment.utc().format('YYYY-MM-DD'))
    .min(Joi.ref('start_datetime'))
    .max(new Date()),
  filters: Joi.object({
    category: Joi.string().valid('apartment', 'house', 'land').required(),
    type: Joi.string().valid('sell', 'rent').when(Joi.ref('/source'), {
      is: 'real-sales',
      otherwise: Joi.required(),
    }),
    location_classificator: Joi.string()
      .valid(...VALID_LOCATION_IDS)
      .when(Joi.ref('/source'), {
        is: 'real-sales',
        then: Joi.required(),
      }),
  }).required(),
  source: Joi.string()
    .valid('classifieds', 'real-sales')
    .default('classifieds'),
  period: Joi.string().valid('month', 'quarter', 'year').default('month'),
});

function decodeQuerystring(qs) {
  function decodeValue(value) {
    try {
      return JSON.parse(decodeURIComponent(value));
    } catch (e) {
      return value;
    }
  }
  return Object.entries(qs || {}).reduce(
    (carry, [key, value]) => ({
      ...carry,
      [key]: decodeValue(value),
    }),
    {},
  );
}

function prepareSearchQueries(filters, dates, source) {
  return dates
    .map(([startDate, endDate]) => ({
      filters: {
        ...filters,
        type: source === 'classifieds' ? filters.type : 'sell',
      },
      start_datetime: startDate.toISOString(),
      end_datetime: endDate.toISOString(),
      source: source === 'classifieds' ? undefined : source,
    }))
    .map((self) => ({
      ...self,
      hash: createHash(self),
    }));
}

function calculateStatistics(prices) {
  return {
    min: Math.ceil(numbers.basic.min(prices)) || null,
    max: Math.ceil(numbers.basic.max(prices)) || null,

    mean: Math.ceil(numbers.statistic.mean(prices)) || null,
    mode: Math.ceil(numbers.statistic.mode(prices)) || null,
    median: Math.ceil(numbers.statistic.median(prices)) || null,
  };
}

function discardData(data, amount = 0) {
  const itemCount = data.length;
  const discardStart = Math.floor((itemCount * amount) / 2);

  return data
    .sort((a, b) => a - b)
    .splice(discardStart, itemCount - discardStart * 2);
}

export const handler = async (event) => {
  const queryStringParameters = decodeQuerystring(event.queryStringParameters);
  const validation = validationSchema.validate(queryStringParameters);

  if (validation.error) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        errors: validation.error.details,
      }),
    };
  }

  const { start_datetime, end_datetime, filters, discard, source, period } =
    validation.value;

  const startDate = moment.utc(start_datetime);
  const endDate = moment.utc(end_datetime);

  const momentRange = moment().range(startDate, endDate);
  const dates = Array.from(momentRange.by(period, { excludeEnd: true })).map(
    (date) => [date, date.clone().endOf(period)],
  );

  // Build search queries for all dates
  const searchQueries = prepareSearchQueries(filters, dates, source);

  // Load the dynamodb results
  const data = await dynamodb.batchGet(
    process.env.CACHE_DYNAMODB_TABLE_NAME,
    searchQueries.map(({ hash }) => ({ hash })),
  );

  // Calculate how many more results are missing
  const loadingResults = searchQueries.length - data.length;

  // Trigger SQS actions for each result that's not found in the archive
  if (loadingResults > 0) {
    const foundRows = data.map(({ hash }) => hash);
    const notFoundRows = searchQueries.filter(
      ({ hash }) => !foundRows.includes(hash),
    );

    await Promise.all(notFoundRows.map((row) => sqs.sendMessage(row)));
  }

  const results = data
    .map((row) => {
      const prices = discardData(row.prices, discard);
      const pricesPerSqm = discardData(row.pricesPerSqm, discard);

      return {
        count: prices.length,
        start_datetime: row.start_datetime,
        end_datetime: row.end_datetime,

        price: calculateStatistics(prices),
        pricePerSqm: calculateStatistics(pricesPerSqm),
      };
    })
    .sort((a, b) =>
      moment(a.start_datetime).isAfter(b.start_datetime) ? 1 : -1,
    );

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      loadingResults,
      results,
    }),
  };
};

const bugsnagHandler = Bugsnag.getPlugin('awsLambda').createHandler();
export const run = bugsnagHandler(handler);
