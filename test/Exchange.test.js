import { tokens, ether, EVM_REVERT, ETHER_ADDRESS } from './helpers'

const Token = artifacts.require('./Token')
const Exchange = artifacts.require('./Exchange')

require('chai')
  .use(require('chai-as-promised'))
  .should()

contract('Exchange', ([deployer, feeAccount, user1, user2]) => {
  let token
  let exchange
  const feePercent = 1

  beforeEach(async () => {
    // Deploy token
    token = await Token.new()

    // Transfer some tokens to user1
    token.transfer(user1, tokens(1000), { from: deployer })

    // Deploy exchange
    exchange = await Exchange.new(feeAccount, feePercent)
  })

  describe('match', async () => {
    beforeEach(async () => {
      await exchange.makeOrder(token.address, tokens(1), ETHER_ADDRESS, ether(1), { from: user1 })
      await exchange.makeOrder(token.address, tokens(1), ETHER_ADDRESS, ether(0.9), { from: user1 })
      await exchange.makeOrder(ETHER_ADDRESS, tokens(1), token.address, ether(1.1), { from: user1 })
      await exchange.makeOrder(ETHER_ADDRESS, tokens(1), token.address, ether(1.2), { from: user1 })
    })
    it('get max price order index', async () => {
      const orderIdx = await exchange._maxPriceIdx()
      const event = orderIdx.logs[0].args
      
      event.ret.toString().should.equal('1')
    })

    it('get min price order index', async () => {
      const orderIdx = await exchange._minPriceIdx()
      const event = orderIdx.logs[0].args
      
      event.ret.toString().should.equal('3')
    })

    describe('do match', async () => {
      beforeEach(async () => {
        // user1 deposits ether only
        await exchange.depositEther({ from: user1, value: ether(10) })
        await exchange.depositEther({ from: user2, value: ether(10) })
        // give tokens to user2
        await token.transfer(user2, tokens(100), { from: deployer })
        // user2 deposits tokens only
        await token.approve(exchange.address, tokens(10), { from: user2 })
        await exchange.depositToken(token.address, tokens(10), { from: user2 })
        await token.approve(exchange.address, tokens(10), { from: user1 })
        await exchange.depositToken(token.address, tokens(10), { from: user1 })
      })
      it('check tokens', async () => {
        let balance = await exchange.tokens(token.address, user1)
        balance.toString().should.equal(tokens(10).toString())
        balance = await exchange.tokens(token.address, user2)
        balance.toString().should.equal(tokens(10).toString())
        balance = await exchange.tokens(ETHER_ADDRESS, user2)
        balance.toString().should.equal(tokens(10).toString())
      })
      it('1 to 1 match', async () => {
        const result = await exchange.doMatch(tokens(1), ETHER_ADDRESS, ether(1.1), { from: user2 })
        const event = result.logs[1].args

        event.id.toString().should.equal('3', 'id is correct')
        event.user.should.equal(user1, 'user is correct')
        event.tokenGet.should.equal(ETHER_ADDRESS, 'tokenGet is correct')
        event.amountGet.toString().should.equal(tokens(1).toString(), 'amountGet is correct')
        event.tokenGive.should.equal(token.address, 'tokenGive is correct')
        event.amountGive.toString().should.equal(ether(1.1).toString(), 'amountGive is correct')
        event.userFill.should.equal(user2, 'userFill is correct')
        event.timestamp.toString().length.should.be.at.least(1, 'timestamp is present')

        const orderFilled = await exchange.orderFilled('3')
        orderFilled.should.equal(true)
      })


      it('1 to 2 match', async () => {
        const result = await exchange.doMatchs(tokens(2), ETHER_ADDRESS, ether(2.6), { from: user2 })

        let orderFilled = await exchange.orderFilled('3')
        orderFilled.should.equal(true)
        orderFilled = await exchange.orderFilled('4')
        orderFilled.should.equal(true)
      })
    })
    describe('split order', async () => {
      beforeEach(async () => {
        await exchange.makeOrder(token.address, tokens(3), ETHER_ADDRESS, ether(0.3), { from: user1 })
      })
      it('check order', async () => {
        const order = await exchange.orders('5')
        order.id.toString().should.equal('5', 'id is correct')
        order.user.should.equal(user1, 'user is correct')
        order.tokenGet.should.equal(token.address, 'tokenGet is correct')
        order.amountGet.toString().should.equal(tokens(3).toString(), 'amountGet is correct')
        order.tokenGive.should.equal(ETHER_ADDRESS, 'tokenGive is correct')
        order.amountGive.toString().should.equal(ether(0.3).toString(), 'amountGive is correct 1')
        order.timestamp.toString().length.should.be.at.least(1, 'timestamp is present')

      })
      it('do split', async () => {
        const result = await exchange.splitOrder(5, tokens(2))

        const order = await exchange.orders('5')

        order.amountGet.toString().should.equal(tokens(1).toString(), 'amountGet is correct')
        order.amountGive.toString().should.equal(ether(0.1).toString(), 'amountGive is correct 2')
      })
    })
  })
  describe('make order sell>buy', async () => {
    beforeEach(async () => {
      await exchange.depositEther({ from: user1, value: ether(10) })
      await exchange.depositEther({ from: user2, value: ether(10) })
      // give tokens to user2
      await token.transfer(user2, tokens(50), { from: deployer })
      // user2 deposits tokens only
      await token.approve(exchange.address, tokens(20), { from: user2 })
      await exchange.depositToken(token.address, tokens(10), { from: user2 })
      await token.approve(exchange.address, tokens(20), { from: user1 })
      await exchange.depositToken(token.address, tokens(10), { from: user1 })

      await exchange.makeOrder(token.address, tokens(0.1), ETHER_ADDRESS, ether(0.1), { from: user1 })//buy
      await exchange.makeOrder(token.address, tokens(0.1), ETHER_ADDRESS, ether(0.1), { from: user1 })//buy
    })
    it('check order', async () => {
      const order = await exchange.orders('1')
      order.id.toString().should.equal('1', 'id is correct')
      order.user.should.equal(user1, 'user is correct')
      order.tokenGet.should.equal(token.address, 'tokenGet is correct')
      order.amountGet.toString().should.equal(tokens(0.1).toString(), 'amountGet is correct')
      order.tokenGive.should.equal(ETHER_ADDRESS, 'tokenGive is correct')
      order.amountGive.toString().should.equal(ether(0.1).toString(), 'amountGive is correct 1')
      order.timestamp.toString().length.should.be.at.least(1, 'timestamp is present')
    })
    it('do sell', async () => {
      await exchange.makeOrder(ETHER_ADDRESS, tokens(0.3), token.address, ether(0.3), { from: user2 })//buy

      const order = await exchange.orders('3')
      order.id.toString().should.equal('3', 'id is correct')
      order.user.should.equal(user2, 'user is correct')
      order.tokenGet.should.equal(ETHER_ADDRESS, 'tokenGet is correct')
      order.amountGet.toString().should.equal(tokens(0.1).toString(), 'amountGet is correct')
      order.tokenGive.should.equal(token.address, 'tokenGive is correct')
      order.amountGive.toString().should.equal(ether(0.1).toString(), 'amountGive is correct 1')
      order.timestamp.toString().length.should.be.at.least(1, 'timestamp is present')
    })
  })

  // describe('deployment', () => {
  //  it('tracks the fee account', async () => {
  //    const result = await exchange.feeAccount()
  //    result.should.equal(feeAccount)
  //  })

  //  it('tracks the fee percent', async () => {
  //    const result = await exchange.feePercent()
  //    result.toString().should.equal(feePercent.toString())
  //  })
  // })


  // describe('fallback', () => {
  //  it('reverts when Ether is sent', async () => {
  //    await exchange.sendTransaction({ value: 1, from: user1 }).should.be.rejectedWith(EVM_REVERT)
  //  })
  // })

  // describe('depositing Ether', async () => {
  //  let result
  //  let amount

  //  beforeEach(async () => {
  //    amount = ether(1)
  //    result = await exchange.depositEther({ from: user1, value: amount})
  //  })

  //  it('tracks the Ether deposit', async () => {
  //    const balance = await exchange.tokens(ETHER_ADDRESS, user1)
  //    balance.toString().should.equal(amount.toString())
  //  })

  //  it('emits a Deposit event', async () => {
  //    const log = result.logs[0]
  //    log.event.should.eq('Deposit')
  //    const event = log.args
  //    event.token.should.equal(ETHER_ADDRESS, 'token address is correct')
  //    event.user.should.equal(user1, 'user address is correct')
  //    event.amount.toString().should.equal(amount.toString(), 'amount is correct')
  //    event.balance.toString().should.equal(amount.toString(), 'balance is correct')
  //  })
  // })


  // describe('withdrawing Ether', async () => {
  //  let result
  //  let amount

  //  beforeEach(async () => {
  //    // Deposit Ether first
  //    amount = ether(1)
  //    await exchange.depositEther({ from: user1, value: amount })
  //  })

  //  describe('success', async () => {
  //    beforeEach(async () => {
  //      // Withdraw Ether
  //      result = await exchange.withdrawEther(amount, { from: user1 })
  //    })

  //    it('withdraws Ether funds', async () => {
  //      const balance = await exchange.tokens(ETHER_ADDRESS, user1)
  //      balance.toString().should.equal('0')
  //    })

  //    it('emits a "Withdraw" event', async () => {
  //      const log = result.logs[0]
  //      log.event.should.eq('Withdraw')
  //      const event = log.args
  //      event.token.should.equal(ETHER_ADDRESS)
  //      event.user.should.equal(user1)
  //      event.amount.toString().should.equal(amount.toString())
  //      event.balance.toString().should.equal('0')
  //    })

  //  })

  //  describe('failure', async () => {
  //    it('rejects withdraws for insufficient balances', async () => {
  //      await exchange.withdrawEther(ether(100), { from: user1 }).should.be.rejectedWith(EVM_REVERT)
  //    })
  //  })
  // })

  // describe('depositing tokens', () => {
  //  let result
  //  let amount

  //  describe('success', () => {
  //    beforeEach(async () => {
  //      amount = tokens(10)
  //      await token.approve(exchange.address, amount, { from: user1 })
  //      result = await exchange.depositToken(token.address, amount, { from: user1 })
  //    })

  //    it('tracks the token deposit', async () => {
  //      // Check exchange token balance
  //      let balance
  //      balance = await token.balanceOf(exchange.address)
  //      balance.toString().should.equal(amount.toString())
  //      // Check tokens on exchange
  //      balance = await exchange.tokens(token.address, user1)
  //      balance.toString().should.equal(amount.toString())
  //    })

  //    it('emits a Deposit event', async () => {
  //      const log = result.logs[0]
  //      log.event.should.eq('Deposit')
  //      const event = log.args
  //      event.token.should.equal(token.address, 'token address is correct')
  //      event.user.should.equal(user1, 'user address is correct')
  //      event.amount.toString().should.equal(amount.toString(), 'amount is correct')
  //      event.balance.toString().should.equal(amount.toString(), 'balance is correct')
  //    })
  //  })

  //  describe('failure', () => {
  //    it('rejects Ether deposits', async() => {
  //      await exchange.depositToken(ETHER_ADDRESS, tokens(10), { from: user1 }).should.be.rejectedWith(EVM_REVERT)
  //    })

  //    it('fails when no tokens are approved', async () => {
  //      // Don't approve any tokens before depositing
  //      await exchange.depositToken(token.address, tokens(10), { from: user1 }).should.be.rejectedWith(EVM_REVERT)
  //    })
  //  })
  // })

  // describe('withdrawing tokens', async () => {
  //  let result
  //  let amount

  //  describe('success', async () => {
  //    beforeEach(async () => {
  //      // Deposit tokens first
  //      amount = tokens(10)
  //      await token.approve(exchange.address, amount, { from: user1 })
  //      await exchange.depositToken(token.address, amount, { from: user1 })

  //      // Withdraw tokens
  //      result = await exchange.withdrawToken(token.address, amount, { from: user1 })
  //    })

  //    it('withdraws token funds', async () => {
  //      const balance = await exchange.tokens(token.address, user1)
  //      balance.toString().should.equal('0')
  //    })

  //    it('emits a "Withdraw" event', async () => {
  //      const log = result.logs[0]
  //      log.event.should.eq('Withdraw')
  //      const event = log.args
  //      event.token.should.equal(token.address)
  //      event.user.should.equal(user1)
  //      event.amount.toString().should.equal(amount.toString())
  //      event.balance.toString().should.equal('0')
  //    })
  //  })

  //  describe('failure', async () => {
  //    it('rejects Ether withdraws', async () => {
  //      await exchange.withdrawToken(ETHER_ADDRESS, tokens(10), { from: user1 }).should.be.rejectedWith(EVM_REVERT)
  //    })

  //    it('fails for insufficient balances', async () => {
  //      // Attempt to withdraw tokens without depositing any first
  //      await exchange.withdrawToken(token.address, tokens(10), { from: user1 }).should.be.rejectedWith(EVM_REVERT)
  //    })
  //  })
  // })

  // describe('checking balances', async () => {
  //  beforeEach(async () => {
  //    exchange.depositEther({ from: user1, value: ether(1) })
  //  })

  //  it('returns user balance', async () => {
  //    const result = await exchange.balanceOf(ETHER_ADDRESS, user1)
  //    result.toString().should.equal(ether(1).toString())
  //  })
  // })

  // describe('making orders', async () => {
  //  let result

  //  beforeEach(async () => {
  //    result = await exchange.makeOrder(token.address, tokens(1), ETHER_ADDRESS, ether(1), { from: user1 })
  //  })

  //  it('tracks the newly created order', async () => {
  //    const orderCount = await exchange.orderCount()
  //    orderCount.toString().should.equal('1')
  //    const order = await exchange.orders('1')
  //    order.id.toString().should.equal('1', 'id is correct')
  //    order.user.should.equal(user1, 'user is correct')
  //    order.tokenGet.should.equal(token.address, 'tokenGet is correct')
  //    order.amountGet.toString().should.equal(tokens(1).toString(), 'amountGet is correct')
  //    order.tokenGive.should.equal(ETHER_ADDRESS, 'tokenGive is correct')
  //    order.amountGive.toString().should.equal(ether(1).toString(), 'amountGive is correct')
  //    order.timestamp.toString().length.should.be.at.least(1, 'timestamp is present')
  //  })

  //  it('emits an "Order" event', async () => {
  //    const log = result.logs[0]
  //    log.event.should.eq('Order')
  //    const event = log.args
  //    event.id.toString().should.equal('1', 'id is correct')
  //    event.user.should.equal(user1, 'user is correct')
  //    event.tokenGet.should.equal(token.address, 'tokenGet is correct')
  //    event.amountGet.toString().should.equal(tokens(1).toString(), 'amountGet is correct')
  //    event.tokenGive.should.equal(ETHER_ADDRESS, 'tokenGive is correct')
  //    event.amountGive.toString().should.equal(ether(1).toString(), 'amountGive is correct')
  //    event.timestamp.toString().length.should.be.at.least(1, 'timestamp is present')
  //  })
  // })

  // describe('order actions', async () => {

  //   beforeEach(async () => {
  //     // user1 deposits ether only
  //     await exchange.depositEther({ from: user1, value: ether(1) })
  //     // give tokens to user2
  //     await token.transfer(user2, tokens(100), { from: deployer })
  //     // user2 deposits tokens only
  //     await token.approve(exchange.address, tokens(2), { from: user2 })
  //     await exchange.depositToken(token.address, tokens(2), { from: user2 })
  //     // user1 makes an order to buy tokens with Ether
  //     await exchange.makeOrder(token.address, tokens(1), ETHER_ADDRESS, ether(1), { from: user1 })
  //   })

  //   describe('filling orders', async () => {
  //     let result

  //     describe('success', async () => {
  //       beforeEach(async () => {
  //         // user2 fills order
  //         result = await exchange.fillOrder('1', { from: user2 })
  //       })

  //       it('executes the trade & charges fees', async () => {
  //         let balance
  //         balance = await exchange.balanceOf(token.address, user1)
  //         balance.toString().should.equal(tokens(1).toString(), 'user1 received tokens')
  //         balance = await exchange.balanceOf(ETHER_ADDRESS, user2)
  //         balance.toString().should.equal(ether(1).toString(), 'user2 received Ether')
  //         balance = await exchange.balanceOf(ETHER_ADDRESS, user1)
  //         balance.toString().should.equal('0', 'user1 Ether deducted')
  //         balance = await exchange.balanceOf(token.address, user2)
  //         balance.toString().should.equal(tokens(0.99).toString(), 'user2 tokens deducted with fee applied')
  //         const feeAccount = await exchange.feeAccount()
  //         balance = await exchange.balanceOf(token.address, feeAccount)
  //         balance.toString().should.equal(tokens(0.01).toString(), 'feeAccount received fee')
  //       })

  //       it('updates filled orders', async () => {
  //         const orderFilled = await exchange.orderFilled(1)
  //         orderFilled.should.equal(true)
  //       })

  //       it('emits a "Trade" event', async () => {
  //         const log = result.logs[0]
  //         log.event.should.eq('Trade')
  //         const event = log.args
  //         event.id.toString().should.equal('1', 'id is correct')
  //         event.user.should.equal(user1, 'user is correct')
  //         event.tokenGet.should.equal(token.address, 'tokenGet is correct')
  //         event.amountGet.toString().should.equal(tokens(1).toString(), 'amountGet is correct')
  //         event.tokenGive.should.equal(ETHER_ADDRESS, 'tokenGive is correct')
  //         event.amountGive.toString().should.equal(ether(1).toString(), 'amountGive is correct')
  //         event.userFill.should.equal(user2, 'userFill is correct')
  //         event.timestamp.toString().length.should.be.at.least(1, 'timestamp is present')
  //       })
  //     })

  //     describe('failure', async () => {

  //       it('rejects invalid order ids', async () => {
  //         const invalidOrderId = 99999
  //         await exchange.fillOrder(invalidOrderId, { from: user2 }).should.be.rejectedWith(EVM_REVERT)
  //       })

  //       it('rejects already-filled orders', async () => {
  //         // Fill the order
  //         await exchange.fillOrder('1', { from: user2 }).should.be.fulfilled
  //         // Try to fill it again
  //         await exchange.fillOrder('1', { from: user2 }).should.be.rejectedWith(EVM_REVERT)
  //       })

  //       it('rejects cancelled orders', async () => {
  //         // Cancel the order
  //         await exchange.cancelOrder('1', { from: user1 }).should.be.fulfilled
  //         // Try to fill the order
  //         await exchange.fillOrder('1', { from: user2 }).should.be.rejectedWith(EVM_REVERT)
  //       })
  //     })

  //   })

  //   describe('cancelling orders', async () => {
  //     let result

  //     describe('success', async () => {
  //       beforeEach(async () => {
  //         result = await exchange.cancelOrder('1', { from: user1 })
  //       })

  //       it('updates cancelled orders', async () => {
  //         const orderCancelled = await exchange.orderCancelled(1)
  //         orderCancelled.should.equal(true)
  //       })

  //       it('emits a "Cancel" event', async () => {
  //         const log = result.logs[0]
  //         log.event.should.eq('Cancel')
  //         const event = log.args
  //         event.id.toString().should.equal('1', 'id is correct')
  //         event.user.should.equal(user1, 'user is correct')
  //         event.tokenGet.should.equal(token.address, 'tokenGet is correct')
  //         event.amountGet.toString().should.equal(tokens(1).toString(), 'amountGet is correct')
  //         event.tokenGive.should.equal(ETHER_ADDRESS, 'tokenGive is correct')
  //         event.amountGive.toString().should.equal(ether(1).toString(), 'amountGive is correct')
  //         event.timestamp.toString().length.should.be.at.least(1, 'timestamp is present')
  //       })

  //     })

  //     describe('failure', async () => {
  //       it('rejects invalid order ids', async () => {
  //         const invalidOrderId = 99999
  //         await exchange.cancelOrder(invalidOrderId, { from: user1 }).should.be.rejectedWith(EVM_REVERT)
  //       })

  //       it('rejects unauthorized cancelations', async () => {
  //         // Try to cancel the order from another user
  //         await exchange.cancelOrder('1', { from: user2 }).should.be.rejectedWith(EVM_REVERT)
  //       })
  //     })
  //   })
  // })
})






















