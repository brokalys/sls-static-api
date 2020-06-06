# Static Brokalys API
Retrieves information from the database asyncronously and stores forever for super-fast access.

[![Build Status](https://travis-ci.org/brokalys/sls-static-api.svg?branch=master)](https://travis-ci.org/brokalys/sls-static-api)
[![codecov](https://codecov.io/gh/brokalys/sls-static-api/branch/master/graph/badge.svg)](https://codecov.io/gh/brokalys/sls-static-api)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)


## Development
### Installation
```sh
yarn install
```

### Running locally
Prerequities:
- Java Runtime Engine (JRE) version 6.x or newer (`brew cask install java`) for local DyanmodDB

```sh
yarn start
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
sls create_domain # do this only for initial deployment
yarn deploy:ci
```
