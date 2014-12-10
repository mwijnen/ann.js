fs = require('fs') //MW: enable file io 
_ = require('underscore');
eval(fs.readFileSync('./../utils/correlations.js')+'');
eval(fs.readFileSync('./parameters.js')+'');

//TrainingSet: this object holds the array of training data, the class is responsible for loading and preporcessing the data
function TrainingSet() {
  
  var _parameters = new Parameters();
  this.getParameters = function() {
    return _parameters;
  };

  var _example_transactions = null;
  this.getExampleTransactions = function(){
    return _example_transactions;
  };
  this.setExampleTransactions = function(value){
    _example_transactions = value;
  };
  this.updateExampleTransactions = function(index, key, value) {
    _example_transactions[index][key] = value;
  };

  var _new_transaction = null;  
  this.getNewTransaction = function(){
    return _new_transaction;
  };
  this.setNewTransaction = function(value){
    _new_transaction = value;
  };
  this.updateNewTransaction = function(key, value) {
    _new_transaction[0][key] = value;
  };

  var _transactionHistory = [];
  this.getTransactionHistory = function(){
    if (_transactionHistory.length == 0 && _example_transactions != null){
      _transactionHistory = _example_transactions.map(function(val) {
        return {full_name: val["full_name"], created_at: Date.parse(val["created_at"])};
      });
    }
    return _transactionHistory;
  }

  var _numberOfMiliSecondsPerWeek = 7 * 24 * 60 * 60 * 1000;  
  this.getFrequencyScoreScaleFactor = function() {
    return _numberOfMiliSecondsPerWeek;
  }

  var _amountScaleFactor = 500000;
  this.getAmountScaleFactor = function() {
    return _amountScaleFactor;
  }

  var _keys = [];
  this.getKeys = function(){
    if (_keys.length == 0 && _transactionHistory.length != 0 && _example_transactions != null){
      for(var k in _example_transactions[0]){
        _keys.push(k);
      }
    }
    return _keys;
  }
}

//load: loads the example transactions into the training set
TrainingSet.prototype.load = function(path, filename) {
  console.log("loading data from file:" + filename + " ...");
  return fs.readFileSync(path + filename, 'utf8');
}

//updateRecordsWithFullName: update records with the full_name attribute
TrainingSet.prototype.updateRecordsAmountAndFullName = function() {
  console.log("updating records amount and adding full name ...");
  var records = this.getExampleTransactions();
  for (var i in records){
    this.updateExampleTransactions(i, "full_name", records[i]["first_name"] + " " + records[i]["last_name"]);
    this.updateExampleTransactions(i, "amount", records[i]["amount"] / this.getAmountScaleFactor());
  }
  var record = this.getNewTransaction()[0];
  this.updateNewTransaction("full_name", record["first_name"] + " " + record["last_name"]);
  this.updateNewTransaction("amount", record["amount"] / this.getAmountScaleFactor());
}

//frequencyScore: finds the previous transaction and gives a score based on time to previous transaction on exp(-x) scale
TrainingSet.prototype.frequencyScore = function(fullName, createdAt){
  if (typeof createdAt != "number") {
    throw "getPreviousTransaction:Type error - createdAt should be of type number";
  }
  var previousTransactions = this.getTransactionHistory().filter(function(value){
    return value.full_name === fullName && value.created_at < createdAt;  
  });
  //if (previousTransactions.count == 0) { return 0.0; }
  //previousTransactions.sort(function(a,b) { return b.created_at - a.created_at }); //MW: alternatively sort (desc) the values and select the first item
  var previousTransaction = 0;
  for (var i in previousTransactions) {
    if (previousTransactions[i].created_at > previousTransaction) { previousTransaction = previousTransactions[i].created_at; }
  }
  return Math.exp(-(createdAt - previousTransaction)/this.getFrequencyScoreScaleFactor());
}

//updateRecordsWithFrequencyScore: update record with a frequency score that is based on their most recent payment
TrainingSet.prototype.updateRecordsFrequencyScore = function() {
  console.log("updating records frequency score ...");
  var records = this.getExampleTransactions();
  var transactionHistory = this.getTransactionHistory();
  for (var i in records){
    this.updateExampleTransactions(i, "frequency_score", this.frequencyScore(records[i]["full_name"], Date.parse(records[i]["created_at"])));
  }
  var record = this.getNewTransaction()[0];
  this.updateNewTransaction("frequency_score", this.frequencyScore(record["full_name"], Date.parse(record["created_at"])));
}

//categorize: feeds the records to parameter object where the unique field values are organized
TrainingSet.prototype.categorize = function() {
  console.log("categorizing parameters ...");
  var allRecords = this.getExampleTransactions();
  allRecords.push(this.getNewTransaction()[0]); //MW: make sure the new transaction will be part of the solution space
  var keys = this.getKeys();
  for (var i in keys) {
    this.getParameters()._uniqueValues[keys[i]] = _.chain(allRecords).map(function(item) { return item[keys[i]] }).uniq().value();
  }
  this.getParameters().generateMapping();
  allRecords.pop(); //MW: taking the new_transaction out again
}

//initialize: performs all actions needed to load and process the training set
TrainingSet.prototype.initialize = function() {
  this.setNewTransaction(JSON.parse(this.load("./../../data/", "new_transaction.json")));
  this.setExampleTransactions(JSON.parse(this.load("./../../data/", "example_transactions.json")));
  this.updateRecordsAmountAndFullName();
  this.updateRecordsFrequencyScore();
  this.categorize();
  this.getParameters().orthogonalizeSet(this.getExampleTransactions());
  this.getParameters().calculateCorrelations();
  this.getParameters().eliminateCorrelatedParameters();
}

t = new TrainingSet();

t.initialize(t);


// console.log(t.getExampleTransactions()[1]);
//console.log(t.getNewTransaction());

//console.log(t.getTransactionHistory());
//console.log(t.getKeys());

// t.initialize();


