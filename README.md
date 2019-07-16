Getting started

Make sure you have the following dependencies downloaded to ensure everything works properly without any issues

Global dependencies - </br>
•	Node @9.10.0 </br>
•	Python @2.7.7 </br>
•	Truffle @5.0.5 </br>
•	Node-gyp @3.6.2 </br>

Other - </br>
•	Ganache </br>
•	Metamask Extension for Google Chrome </br>
•	Redux devtools extension </br>

1. Start by cloning this repo </br>
2. Inside the new folder, npm install to install all req'd dependencies </br>
3. Open up Ganache and click 'Quick Start' </br>
4. Under truffle-config.js, make sure the networks config matches your Ganache port. By default it should be host: 127.0.0.1 and port:   7545. </br>
5. Go to your terminal, cd your folder and type, 'truffle compile' to compile your contracts </br>
6. Then migrate your contracts to deploy to our local blockchain aka ganache - 'truffle migrate'. If any changes has been made to the contract after initial migration, type 'truffle migrate --reset' </br>
7. Go to your metamask extension and create a new network configured to your Ganache network. In that network, import a new account w/ one of the private keys inside your Ganache. </br>
8. 'npm start' to load up the new exchange on your local browser. (make sure you're on your ganache network in your metamask extension) </br>

*Optional* </br>
- Load up your scripts, which-are premade orders of the exchange -> 'truffle exec scripts/seed-exchange.js' </br>

<p></p>
You can check out the live preview of this project here -> https://dexifi-exchange.herokuapp.com/
<br> (Must have Metamask connected to Kovan for the application to load)


