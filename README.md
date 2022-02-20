# Static Brokalys API

Retrieves information from the database asyncronously and stores forever for super-fast access.

[![Build status](https://github.com/brokalys/sls-static-api/actions/workflows/deploy.yaml/badge.svg)](https://github.com/brokalys/sls-static-api/actions/workflows/deploy.yaml)
[![codecov](https://codecov.io/gh/brokalys/sls-static-api/branch/master/graph/badge.svg)](https://codecov.io/gh/brokalys/sls-static-api)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

## API description

### GET /stats/monthly

Returns statistical data for a given time-period. If the data has not yet been retrieved and cached - spawn a asynchronous operation for getting all the data.

Response contains:

- `loadingResults`: how many async operations have been executed to gather more data (feel free to re-run the request after a couple of seconds to get the missing data);
- `results`: an array of results;

Live example: [click here](https://static-api.brokalys.com/stats/monthly?filters=%7B%22category%22%3A%22apartment%22%2C%22type%22%3A%22sell%22%2C%22location_classificator%22%3A%22latvia-riga-agenskalns%22%7D)

**Querystring parameters**

| Field                      | Required | Available values                                     | Example                | Description                                                                                                                                 |
| -------------------------- | -------- | ---------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `filters`                  | Yes      | -                                                    | -                      | A url-encoded JSON object with the filters                                                                                                  |
| > `category`               | Yes      | `apartment`, `house`, `land`                         | `apartment`            | Category to filter by                                                                                                                       |
| > `type`                   | Yes      | `sell`, `rent`                                       | `sell`                 | Type to filter by                                                                                                                           |
| > `location_classificator` | Yes      | Any `string`                                         | `location-riga-latvia` | Location classificator to filter by                                                                                                         |
| `start_datetime`           | No       | Any [ISO 8601] datetime after 2018-01-01 (including) | `2019-01-01`           | Start datetime of the data-set                                                                                                              |
| `enddatetime`              | No       | Any [ISO 8601] datetime before now                   | `2019-05-01`           | End datetime of the data-set                                                                                                                |
| `discard`                  | No       | Any float with precision of 2                        | `0.15`                 | How many values (%) should be discarded from the dataset? This helps build more realistic graphs with trimmed-mean as it discards extremes. |

**Response example**

```json
{
  "loadingResults": 3,
  "results": [
    {
      "count": 184,
      "start_datetime": "2018-01-01T00:00:00.000Z",
      "end_datetime": "2018-01-31T23:59:59.999Z",
      "price": {
        "min": 143,
        "max": 850000,
        "mean": 165538,
        "mode": 36000,
        "median": 137250
      },
      "pricePerSqm": {
        "min": 2,
        "max": 4769,
        "mean": 1930,
        "mode": 2322,
        "median": 1692
      }
    }
  ]
}
```

---

## Development

### Installation

```sh
yarn install
```

### Testing

```sh
yarn test
```

### Deployment

```sh
# dev stage
yarn deploy

# prod stage
yarn sls create_domain # do this only for initial deployment
yarn deploy:ci
```

[iso 8601]: https://en.wikipedia.org/wiki/ISO_8601
