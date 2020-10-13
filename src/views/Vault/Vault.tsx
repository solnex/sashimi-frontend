import React, {useEffect, useState, useCallback} from 'react'
import styled from 'styled-components'

import chef from '../../assets/img/chef.png'

import PageHeader from '../../components/PageHeader'
import Spacer from '../../components/Spacer'

import CardContent from "../../components/CardContent";
import Label from "../../components/Label";
import Value from "../../components/Value";
import Card from "../../components/Card";

import TokenPanel from "./components/TokenPanel";

import {vaults, weiUnitDecimal, contractAddresses, timeADay, vaultController} from '../../sushi/lib/constants';

import './Vault.less';
import {useTokenPrice} from "../../hooks/vault/useTokenPrice";
import {getVaultContract, getVaultTotalBalance, getVaultTotalSupply, getVaultUserBalance} from "../../utils/vault";
import {provider} from "web3-core";
import {useWallet} from "use-wallet";
import useBlock from "../../hooks/useBlock";
import BigNumber from "bignumber.js";
import {getBalance, getTotalSupply} from "../../utils/erc20";
import {getEthChainInfo} from "../../utils/getEthChainInfo";

interface Vault {
  tokenName: string,
  vaultAddr: string,
  stableCoinAddr: string,
  wei: keyof typeof weiUnitDecimal,
}

const getStakingDollarValue = (wethValuesInStaking: any, wethDollarPrice: number) => {
  let totalWethValue;
  if (wethValuesInStaking.length === 1) {
    totalWethValue = new BigNumber(wethValuesInStaking[0]);
  } else {
    totalWethValue = wethValuesInStaking.reduce((acc: number, cur: number) => {
      const accBN = new BigNumber(acc);
      const curBN = new BigNumber(cur);
      return accBN.plus(curBN);
    });
  }
  return totalWethValue.isNaN() ? new BigNumber(0) : totalWethValue.div(10 ** 18).times(wethDollarPrice);
};

const {
  ethscanType
} = getEthChainInfo();

const Vault: React.FC = () => {

  const [exchangeRatioAndAPY, setExchangeRatioAndAPY] = useState([]);
  const wethDollarPrice = useTokenPrice('ETH', 'USD');

  const {
    account,
    ethereum,
  }: { account: string; ethereum: provider } = useWallet();
  const block = useBlock();

  const [totalStableValue, setTotalStableValue] = useState(new BigNumber(0));
  const [totalUserStableValue, setUserTotalStableValue] = useState(new BigNumber(0));
  const [totalWethValueInStaking, setTotalWethValueInStaking] = useState([]);

  const fetchTotalStakingValue = useCallback(async () => {
    if (ethereum && wethDollarPrice) {
      const vaultsContract = vaults.map((vault: any) => getVaultContract(ethereum, vault.vaultAddr));

      // LP balance in Vault
      const stablesBalancePromise = Promise.all(vaultsContract.map((vaultContract: any) => {
        return getVaultTotalBalance(vaultContract, account);
      }));
      // svUNI-V2 Balance
      const stablesUserBalancePromise = Promise.all(vaultsContract.map((vaultContract: any) => {
        return getVaultUserBalance(vaultContract, account);
      }));
      // svUNI-V2 total supply of each pool
      const poolsLPTTotalSupplyPromise = Promise.all(vaultsContract.map((vaultContract: any) => {
        return getVaultTotalSupply(vaultContract, account);
      }));
      // LP TotalSupply
      const lpTokensTotalSupplyPromise = Promise.all(vaults.map((vault: any) => {
        return getTotalSupply(ethereum, vault.stableCoinAddr);
      }));

      const lpTokenWethValuePromise = Promise.all(vaults.map((vault: any) => {
        return getBalance(ethereum, contractAddresses.weth[1], vault.stableCoinAddr);
      }));

      const [stablesBalance, stablesUserBalance, poolsLPTTotalSupply, lpTokensTotalSupply, lpTokenWethValue]
        = await Promise.all([
          stablesBalancePromise, stablesUserBalancePromise, poolsLPTTotalSupplyPromise,
        lpTokensTotalSupplyPromise, lpTokenWethValuePromise]);

      const exchangeRatioAndAPY = stablesBalance.map((stableBalance: any, index) => {
        const apyTimePivot = (Date.now() - vaults[index].startTime) / timeADay;
        const balanceBN = new BigNumber(stableBalance);
        const lptBalanceBN = new BigNumber(poolsLPTTotalSupply[index] as number|string);
        const ratio = balanceBN.div(lptBalanceBN);
        return {
          ratio,
          apy: ratio.isNaN() ? '0.000' : ratio.minus(1).div(apyTimePivot).times(365 * 100).toFixed(4)
        }
      });

      const totalWethValueInStaking = stablesBalance.map((stableBalance: any, index: any) => {
        const lpBalance = new BigNumber(stableBalance);
        const totalLPBalance = new BigNumber(lpTokensTotalSupply[index] as number|string);
        const wethValue = new BigNumber(lpTokenWethValue[index] as number|string);
        return lpBalance.div(totalLPBalance).times(wethValue).times(2).toNumber();
      });

      const userWethValueInStaking = stablesUserBalance.map((stableUserBalance: any, index: any) => {
        const lptBalance = new BigNumber(stableUserBalance);
        const lpBalance = exchangeRatioAndAPY[index].ratio.times(lptBalance);
        const totalLPBalance = new BigNumber(lpTokensTotalSupply[index] as number|string);
        const wethValue = new BigNumber(lpTokenWethValue[index] as number|string);
        return lpBalance.div(totalLPBalance).times(wethValue).times(2).toNumber();
      });

      const totalStakingDollar = getStakingDollarValue(totalWethValueInStaking, wethDollarPrice);
      const userStakingDollar = getStakingDollarValue(userWethValueInStaking, wethDollarPrice);

      setTotalWethValueInStaking(totalWethValueInStaking);
      setExchangeRatioAndAPY(exchangeRatioAndAPY);
      setTotalStableValue(totalStakingDollar);
      setUserTotalStableValue(userStakingDollar);
    }
  }, [block, ethereum, wethDollarPrice]);

  useEffect(() => {
    fetchTotalStakingValue();
  }, [fetchTotalStakingValue]);

  return (
    <>
      <PageHeader
        icon={<img src={chef} height="120" alt="Sashimi" />}
        subtitle={'Welcome to the Sashimi Vault, stake token to earn token.'}
        title='Sashimi Vault(Beta)'
      />
      <StyleSubTitle>
        <a
          target="_blank"
          href={`https://${ethscanType}etherscan.io/address/${vaultController}`}>
          Click To Review The Controller Contract
        </a>
      </StyleSubTitle>

      <StyledWrapper>
        <StyledCard>
          <CardContent>
            <StyledBalances>
              <StyledBalance>
                <div style={{ flex: 1 }}>
                  <Label text="Total Staking Value" />
                  <Value
                    value={ethereum ? `$${totalStableValue.toNumber().toLocaleString('currency', {
                      minimumFractionDigits: 4,
                      maximumFractionDigits: 4,
                    })}` : 'Unlock Wallet'}
                  />
                </div>
              </StyledBalance>
            </StyledBalances>
          </CardContent>
        </StyledCard>

        <Spacer />

        <StyledCard>
          <CardContent>
            <StyledBalances>
              <StyledBalance>
                <div style={{ flex: 1 }}>
                  <Label text="Your Staking Value" />
                  <Value
                    value={ethereum ? `$${totalUserStableValue.toNumber().toLocaleString('currency', {
                      minimumFractionDigits: 4,
                      maximumFractionDigits: 4,
                    })}` : 'Unlock Wallet'}
                  />
                </div>
              </StyledBalance>
            </StyledBalances>
          </CardContent>
        </StyledCard>
      </StyledWrapper>

      <div className="vault-blank"/>
      <div className="vault-blank"/>

      {vaults.map((vault: any, index: any) =>
        <TokenPanel
          key={vault.tokenName}
          tokenName={vault.tokenName}
          vaultAddr={vault.vaultAddr}
          stableCoinAddr={vault.stableCoinAddr}
          weiUnit={vault.wei}
          uniAddressOrSymbolA={vault.uniAddressOrSymbolA}
          uniAddressOrSymbolB={vault.uniAddressOrSymbolB}
          // apy={Number.parseFloat(vaultsAPY[vault.tokenName])}
          valueLocked={totalWethValueInStaking[index] ? new BigNumber(totalWethValueInStaking[index]) : new BigNumber(0)}
          wethPrice={wethDollarPrice}
          ratio={exchangeRatioAndAPY[index] ? exchangeRatioAndAPY[index].ratio : new BigNumber(0)}
          apy={exchangeRatioAndAPY[index] ? exchangeRatioAndAPY[index].apy : '-'}
        />
      )}
    </>
  )
}

const StyleSubTitle = styled.div`
  color: #aa9585;
  font-size: 18px;
  font-weight: 400;
  margin: 0;
  padding: 0;
  text-align: center;
  padding-bottom: ${(props) => props.theme.spacing[6]}px;
`


const StyledWrapper = styled.div`
  align-items: center;
  width: 100%;
  display: flex;
  justify-content: center;
  @media (max-width: 768px) {
    width: 100%;
    flex-flow: column nowrap;
    align-items: stretch;
    padding: 0 16px;
  }
`

const StyledCard = styled(Card)`
  max-width: 450px;
`

const StyledBalances = styled.div`
  display: flex;
`

const StyledBalance = styled.div`
  align-items: center;
  display: flex;
  flex: 1;
`

export default Vault
