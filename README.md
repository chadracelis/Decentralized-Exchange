Getting started

Make sure you have the following dependencies downloaded to ensure everything works properly without any issues

Global dependencies - 
•	Node @9.10.0
•	Python @2.7.7
•	Truffle @5.0.5
•	Node-gyp @3.6.2

Other -
•	Ganache
•	Metamask Exntesion for Google Chrome
•	Redux devtools extension

1. Start by cloning this repo
2. Inside the new folder, npm install to install all req'd dependencies
3. Open up Ganache and click 'Quick Start'
4. Under truffle-config.js, make sure the networks config matches your Ganache port. By default it should be host: 127.0.0.1 and port:   7545. 
5. Go to your terminal, cd your folder and type, 'truffle compile' to compile your contracts 
6. Then migrate your contracts to deploy to our local blockchain aka ganache - 'truffle migrate'. If any changes has been made to the contract after initial migration, type 'truffle migrate --reset'
7. 'npm start' to load up the new exchange on your local browser

*Optional*
-Load up your scripts, which-are premade orders of the exchange -> 'truffle exec scripts/seed-exchange.js'


