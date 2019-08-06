import React, { Component } from 'react'
import { connect } from 'react-redux'
import { Tabs, Tab } from 'react-bootstrap'
import Spinner from './Spinner'
import {
  loadBalances,
  depositEther,
  depositToken,
  withdrawEther,
  withdrawToken,
} from '../store/interactions'
import {
  exchangeSelector,
  tokenSelector,
  accountSelector,
  web3Selector,
  etherBalanceSelector,
  tokenBalanceSelector,
  exchangeEtherBalanceSelector,
  exchangeTokenBalanceSelector,
  balancesLoadingSelector,
  etherDepositAmountSelector,
  etherWithdrawAmountSelector,
  tokenDepositAmountSelector,
  tokenWithdrawAmountSelector,
} from '../store/selectors'
import {
  // Track state of input amount and declare it when submitted 
  etherDepositAmountChanged,
  etherWithdrawAmountChanged,
  tokenDepositAmountChanged,
  tokenWithdrawAmountChanged,
} from '../store/actions'


const showForm = (props) => {
  const {
    dispatch,
    exchange,
    web3,
    account,
    etherBalance,
    tokenBalance,
    exchangeEtherBalance,
    exchangeTokenBalance,
    etherDepositAmount,
    token,
    tokenDepositAmount,
    etherWithdrawAmount,
    tokenWithdrawAmount
  } = props

  return(
    <Tabs defaultActiveKey="deposit" className="text-white">

      <Tab eventKey="deposit" title="Deposit">
        <table className="table table-dark table-sm balance-table-custom">
          <thead>
            <tr>
              <th>Token</th>
              <th>Wallet</th>
              <th>Exchange</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>ETH</td>
              <td>{etherBalance}</td>
              <td>{exchangeEtherBalance}</td>
            </tr>
          </tbody>
        </table>

        <form className="row" onSubmit={(event) => {
          event.preventDefault()
          depositEther(dispatch, exchange, web3, etherDepositAmount, account)
        }}>
          <div className="col-12 col-sm pr-sm-2">
            <input
            type="text"
            placeholder="ETH Amount"
            onChange={(e) => dispatch( etherDepositAmountChanged(e.target.value) ) }
            className="form-control form-control-sm text-white input-custom"
            required />
          </div>
          <div className="col-12 col-sm-auto pl-sm-0">
            <button type="submit" className="btn btn-block btn-sm text-white button-custom">Deposit</button>
          </div>
        </form>

        <table className="table table-dark table-sm balance-table-custom">
          <tbody>
            <tr>
              <td>DEFI</td>
              <td>{tokenBalance}</td>
              <td>{exchangeTokenBalance}</td>
            </tr>
          </tbody>
        </table>

        <form className="row" onSubmit={(event) => {
          event.preventDefault()
          depositToken(dispatch, exchange, web3, token, tokenDepositAmount, account)
        }}>
          <div className="col-12 col-sm pr-sm-2">
            <input
            type="text"
            placeholder="DEFI Amount"
            onChange={(e) => dispatch( tokenDepositAmountChanged(e.target.value) )}
            className="form-control form-control-sm text-white input-custom"
            required />
          </div>
          <div className="col-12 col-sm-auto pl-sm-0">
            <button type="submit" className="btn btn-block btn-sm text-white button-custom">Deposit</button>
          </div>
        </form>
      </Tab>

      <Tab eventKey="withdraw" title="Withdraw">
        <table className="table table-dark table-sm balance-table-custom">
          <thead>
            <tr>
              <th>Token</th>
              <th>Wallet</th>
              <th>Exchange</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>ETH</td>
              <td>{etherBalance}</td>
              <td>{exchangeEtherBalance}</td>
            </tr>
          </tbody>
        </table>

        <form className="row" onSubmit={(event) => {
          event.preventDefault()
          withdrawEther(dispatch, exchange, web3, etherWithdrawAmount, account)
        }}>
          <div className="col-12 col-sm pr-sm-2">
            <input
            type="text"
            placeholder="ETH Amount"
            onChange={(e) => dispatch( etherWithdrawAmountChanged(e.target.value) )}
            className="form-control form-control-sm text-white input-custom"
            required />
          </div>
          <div className="col-12 col-sm-auto pl-sm-0">
            <button type="submit" className="btn btn-block btn-sm text-white button-custom">Withdraw</button>
          </div>
        </form>

        <table className="table table-dark table-sm balance-table-custom">
          <tbody>
            <tr>
              <td>DEFI</td>
              <td>{tokenBalance}</td>
              <td>{exchangeTokenBalance}</td>
            </tr>
          </tbody>
        </table>

        <form className="row" onSubmit={(event) => {
          event.preventDefault()
          withdrawToken(dispatch, exchange, web3, token, tokenWithdrawAmount, account)
        }}>
          <div className="col-12 col-sm pr-sm-2">
            <input
            type="text"
            placeholder="DEFI Amount"
            onChange={(e) => dispatch( tokenWithdrawAmountChanged(e.target.value) )}
            className="form-control form-control-sm text-white input-custom"
            required />
          </div>
          <div className="col-12 col-sm-auto pl-sm-0">
            <button type="submit" className="btn btn-block btn-sm text-white button-custom">Withdraw</button>
          </div>
        </form>
      </Tab>
      
    </Tabs>
  )
}

class Balance extends Component {
  componentWillMount() {
    this.loadBlockchainData()
  }

  async loadBlockchainData() {
    const { dispatch, web3, exchange, token, account } = this.props
    await loadBalances(dispatch, web3, exchange, token, account)
  }

  render() {
    return (
      <div className="card bg-dark text-white card-custom">
        <div className="card-header card-header-custom">
          <h4 className="h4-custom">&nbsp; Balance</h4>
        </div>
        <div className="card-body card-body-custom">
          {this.props.showForm ? showForm(this.props) : <Spinner />}
        </div>
      </div>
    )
  }
}

function mapStateToProps(state) {
  const balancesLoading = balancesLoadingSelector(state)

  return {
    account: accountSelector(state),
    exchange: exchangeSelector(state),
    token: tokenSelector(state),
    web3: web3Selector(state),
    etherBalance: etherBalanceSelector(state),
    tokenBalance: tokenBalanceSelector(state),
    exchangeEtherBalance: exchangeEtherBalanceSelector(state),
    exchangeTokenBalance: exchangeTokenBalanceSelector(state),
    balancesLoading,
    showForm: !balancesLoading,
    etherDepositAmount: etherDepositAmountSelector(state),
    etherWithdrawAmount: etherWithdrawAmountSelector(state),
    tokenDepositAmount: tokenDepositAmountSelector(state),
    tokenWithdrawAmount: tokenWithdrawAmountSelector(state),
  }
}

export default connect(mapStateToProps)(Balance)
