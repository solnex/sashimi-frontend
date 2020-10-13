import * as testKovan from './constants/test-kovan';
import * as online from './constants/online';
import * as onlineTest from './constants/online-test';

const CHAIN_ENV = process.env.REACT_APP_CHAIN_ENV || 'main';

const output = {
  main: online,
  kovan: testKovan,
  'online-test': onlineTest
};

const WEI_UNIT_DECIMAL = {
  mwei: 6,
  ether: 18,
  wbtc: 8,
};

export const {
  contractAddresses,
  supportedInvestmentPools,
  unStakeOnlyPools,
  notETHPairPools,
  hiddenPools,
  doublePools,
  unStakeOnlyDoublePools,
  supportedPools,
  waitingInfo,
  vaultController,
  vaults,
  vaultAPYAPI,
  vaultStableTokenPriceAPI,
  tokenPriceAPI = 'https://min-api.cryptocompare.com/data/price', // ?fsym=ETH&tsyms=USD
  weiUnitDecimal = WEI_UNIT_DECIMAL,
  timeADay = 86400000,
} = {
  ...output[CHAIN_ENV],
};
