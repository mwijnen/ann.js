fs = require('fs') //MW: enable file io 
_ = require('underscore');
eval(fs.readFileSync('./libs/utils/correlations.js')+'');
eval(fs.readFileSync('./libs/training_data/parameters.js')+'');
eval(fs.readFileSync('./libs/training_data/training_set.js')+'');
eval(fs.readFileSync('./libs/ann/network.js')+'');


//create the training set from the example transactions
var trainingSet = new TrainingSet();
trainingSet.preProcess();

//create the neural network and score the "new" transaction
var network = new Network(trainingSet);
network.train();

//load the transaction from file and calculate score
var transaction = JSON.parse(trainingSet.load("./data/", "new_transaction.json"))[0];
console.log("\nscoring the \"new\" transaction ... ");

//score the transaction
network.scoreTransaction(transaction);

