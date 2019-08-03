import React, { Component } from 'react';
import './App.css';
import { connect } from 'react-redux';
import {
  loadWeb3,
  loadAccount,
  loadToken,
  loadExchange
} from '../store/interactions';
import Navbar from './Navbar';
import Content from './Content';
import { contractsLoadedSelector } from '../store/selectors';

class App extends Component {
  
  // Load blockchain before rendering component
  componentWillMount() {
    this.loadBlockchainData(this.props.dispatch);
  }

  // Connect to blockchain via Web3
  async loadBlockchainData(dispatch) {
    const web3 = loadWeb3(dispatch);
    await web3.eth.net.getNetworkType()
    const networkId = await web3.eth.net.getId(); // Allow to fetch contract data despite the network type
    await loadAccount(web3, dispatch); // Fetch accounts provided via Metamask
    const token = await loadToken(web3, networkId, dispatch)
    if(!token) {
      window.alert('Token smart contract not detected on the current network. Please select another network with Metamask.')
      return
    }
    const exchange = await loadExchange(web3, networkId, dispatch)
    if(!exchange) {
      window.alert('Exchange smart contract not detected on the current network. Please select another network with Metamask.')
      return
    }
  }

  render() {
    const { contractsLoaded } = this.props;
    return (
      <div>
        <Navbar />
        { contractsLoaded ? <Content /> : <div className="content"></div> }
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {
    contractsLoaded: contractsLoadedSelector(state)
  }
}

export default connect(mapStateToProps)(App);

