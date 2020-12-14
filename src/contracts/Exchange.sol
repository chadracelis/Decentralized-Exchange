// SPDX-License-Identifier: SimPL-2.0
pragma solidity >=0.7.4 <0.8.0;

import './Token.sol';

contract Exchange {

    using SafeMath for uint;
    using SafeMath for uint256;
    uint256 public decimals = 10**8;

    // Variables
    address public feeAccount;
    uint256 public feePercent;
    uint256 public orderCount;
    address constant ETHER = address(0);

    mapping(address => mapping(address => uint256)) public tokens;
    mapping(uint256 => _Order) public orders;
    mapping(uint256 => bool) public orderCancelled;
    mapping(uint256 => bool) public orderFilled;

    event LOG_PRICE(uint256 ret);
    event LOG_RETURN(uint256 ret);
    // Events
    event Deposit(address token, address user, uint256 amount, uint256 balance);
    event Withdraw(address token, address user, uint256 amount, uint256 balance);
    event Order(
        uint256 id,
        address user,
        address tokenGet,
        uint256 amountGet,
        address tokenGive,
        uint256 amountGive,
        uint256 timestamp
    );
    event Cancel(
        uint256 id,
        address user,
        address tokenGet,
        uint256 amountGet,
        address tokenGive,
        uint256 amountGive,
        uint256 timestamp
    );
    event Trade(
        uint256 id,
        address user,
        address tokenGet,
        uint256 amountGet,
        address tokenGive,
        uint256 amountGive,
        address userFill,
        uint256 timestamp
    );

    // Structs
    struct _Order {
        uint256 id;
        address user;
        address tokenGet;
        uint256 amountGet;
        address tokenGive;
        uint256 amountGive;
        uint256 timestamp;
    }

    constructor(address _feeAccount, uint256 _feePercent) {
        feeAccount = _feeAccount;
        feePercent = _feePercent;
    }

    // Fallback: reverts if Ether is sent to this smart contract by mistake
    fallback() external payable{
        revert();
    }

    receive() external payable{}

    function depositEther() public payable {
        tokens[ETHER][msg.sender] = tokens[ETHER][msg.sender].add(msg.value);
        emit Deposit(ETHER, msg.sender, msg.value, tokens[ETHER][msg.sender]);
    }

    function withdrawEther(uint _amount) public payable {
        require(tokens[ETHER][msg.sender] >= _amount, 'Insufficient funds');
        tokens[ETHER][msg.sender] = tokens[ETHER][msg.sender].sub(_amount);
        msg.sender.transfer(_amount);
        emit Withdraw(ETHER, msg.sender, _amount, tokens[ETHER][msg.sender]);
    }

    function depositToken(address _token, uint _amount) public {
        require(_token != ETHER, 'Token cannot be Ether');
        require(Token(_token).transferFrom(msg.sender, address(this), _amount), 'call of transferFrom does not match');
        tokens[_token][msg.sender] = tokens[_token][msg.sender].add(_amount);
        emit Deposit(_token, msg.sender, _amount, tokens[_token][msg.sender]);
    }

    function withdrawToken(address _token, uint256 _amount) public {
        require(_token != ETHER, 'Token cannot be Ether');
        require(tokens[_token][msg.sender] >= _amount, 'Insufficient funds');
        tokens[_token][msg.sender] = tokens[_token][msg.sender].sub(_amount);
        require(Token(_token).transfer(msg.sender, _amount), 'call of transfer does not match');
        emit Withdraw(_token, msg.sender, _amount, tokens[_token][msg.sender]);
    }

    function balanceOf(address _token, address _user) public view returns(uint256) {
        return tokens[_token][_user];
    }

    function makeOrder(address _tokenGet, uint256 _amountGet, address _tokenGive, uint256 _amountGive) public {
        uint256 surplus = _amountGet;
        surplus = doMatchs(_amountGet, _tokenGive,_amountGive);
        if (surplus == 0) return;
        uint256 price = _amountGive.mul(decimals).div(_amountGet);
        orderCount++;
        orders[orderCount] = _Order(orderCount, msg.sender, _tokenGet, surplus, _tokenGive, price.mul(surplus).div(decimals), block.timestamp);
        emit Order(orderCount, msg.sender, _tokenGet, surplus, _tokenGive, price.mul(surplus).div(decimals), block.timestamp);
    }

    function doMatchs(uint256 _amountGet, address _tokenGive, uint256 _amountGive) public returns(uint256){
        uint256 amountGet = _amountGet;
        uint256 price = _amountGive.mul(decimals).div(_amountGet);
        while (amountGet > 0){
            uint256 qty = doMatch(amountGet,_tokenGive,price.mul(amountGet).div(decimals));
            if (qty == 0) break;
            amountGet = amountGet.sub(qty);  
        }
        require(amountGet >= 0);

        // if (amountGet > 0){ // 部分成交
        //     makeOrder(_tokenGet,amountGet,_tokenGive,price.mul(amountGet).div(decimals));
        // }

        return amountGet;
    }
    function doMatch(uint256 _amountGet, address _tokenGive, uint256 _amountGive) public returns(uint256){
        bool bs_type = false;
        uint256 price = _amountGive.mul(decimals).div(_amountGet);

        if (_tokenGive == 0x0000000000000000000000000000000000000000){//buy token
            bs_type = true;
        }

        if (bs_type) {
            uint256 idx = _minPriceIdx();
            if (idx == 0) return 0;
            _Order storage _order = orders[idx];

            if (price >= _order.amountGive.mul(decimals).div(_order.amountGet)) {
                if (_amountGet >= _order.amountGet) {
                    fillOrder(idx);
                    return _order.amountGet;
                }
                else {
                    splitOrder(idx,_amountGet);
                    makeOrder(_order.tokenGet, _amountGet, _order.tokenGive, price.mul(_amountGet).div(decimals));
                    fillOrder(orderCount); 
                    return _amountGet;
                }
            }
            else return 0;
        }
        else{
            uint256 idx = _maxPriceIdx();
            if (idx == 0) return 0;
            _Order storage _order = orders[idx];
            
            if (price <= _order.amountGive.mul(decimals).div(_order.amountGet)) {
                if (_amountGet >= _order.amountGet) {
                    fillOrder(idx);                    
                    return _order.amountGet;
                }
                else {
                    splitOrder(idx,_amountGet);
                    makeOrder(_order.tokenGet, _amountGet, _order.tokenGive, price.mul(_amountGet).div(decimals));
                    fillOrder(orderCount); 
                    return _amountGet;
                }
            }
            else return 0;
        }

    }

    function splitOrder(uint256 _id, uint256 count) public{
        _Order storage _order = orders[_id];
        require(count < _order.amountGet,'Can not split order by count');
        uint256 price = _order.amountGive.mul(decimals).div(_order.amountGet);
        _order.amountGet = _order.amountGet - count;
        _order.amountGive = price.mul(_order.amountGet).div(decimals);
        // emit Order(_order.id, _order.user, _order.tokenGet, _order.amountGet, _order.tokenGive, _order.amountGive, _order.timestamp);
    }
    // find max price from buy orders, and return order index
    function _maxPriceIdx() public returns(uint256){
        uint256 max = 0;
        uint256 idx = 0;
        for (uint256 i = 1; i <= orderCount; i++){
            if (orderCancelled[i]) continue;
            if (orderFilled[i]) continue;
            _Order storage _order = orders[i];
            if (_order.tokenGive != 0x0000000000000000000000000000000000000000) continue;
            uint256 _max = _order.amountGive.div(_order.amountGet);
            if (max < _max) {
                max = _max;
                idx = i;
            }
        }
        emit LOG_RETURN(idx);
        return idx;
    }

    function _minPriceIdx() public returns(uint256){
        uint256 min = 2**256 - 1;
        uint256 idx = 0;
        for (uint256 i = 1; i <= orderCount; i++){
            if (orderCancelled[i]) continue;
            if (orderFilled[i]) continue;
            _Order storage _order = orders[i];
            if (_order.tokenGive == 0x0000000000000000000000000000000000000000) continue;
            uint256 _min = _order.amountGive.div(_order.amountGet);
            if (min > _min) {
                min = _min;
                idx = i;
            }
        }
        emit LOG_RETURN(idx);
        return idx;
    }

    function cancelOrder(uint256 _id) public {
        _Order storage _order = orders[_id];
        require(address(_order.user) == msg.sender, "Current user does not match order's address");
        require(_order.id == _id, 'Order does not exist');
        orderCancelled[_id] = true;
        emit Cancel(_order.id, msg.sender, _order.tokenGet, _order.amountGet, _order.tokenGive, _order.amountGive, block.timestamp);
    }

    function fillOrder(uint256 _id) public {
        require(_id > 0 && _id <= orderCount, 'Order does not exist');
        require(!orderFilled[_id], 'Order is already filled');
        require(!orderCancelled[_id], 'Order is already cancelled');
        _Order storage _order = orders[_id];
        _trade(_order.id, _order.user, _order.tokenGet, _order.amountGet, _order.tokenGive, _order.amountGive);
        orderFilled[_order.id] = true;
    }

    function _trade(
        uint256 _orderId,
        address _user,
        address _tokenGet,
        uint256 _amountGet,
        address _tokenGive,
        uint256 _amountGive)
        internal {
            // Fee paid by the user that fills the order 
            uint256 _feeAmount = _amountGive.mul(feePercent).div(100);
            tokens[_tokenGet][msg.sender] = tokens[_tokenGet][msg.sender].sub(_amountGet.add(_feeAmount));
            tokens[_tokenGet][_user] = tokens[_tokenGet][_user].add(_amountGet);
            tokens[_tokenGet][feeAccount] = tokens[_tokenGet][feeAccount].add(_feeAmount);
            tokens[_tokenGive][_user] = tokens[_tokenGive][_user].sub(_amountGive);
            tokens[_tokenGive][msg.sender] = tokens[_tokenGive][msg.sender].add(_amountGive);
            emit Trade(_orderId, _user, _tokenGet, _amountGet, _tokenGive, _amountGive, msg.sender, block.timestamp);
        }
}
