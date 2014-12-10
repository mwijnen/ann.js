fs = require('fs') //MW: enable file io 
_ = require('underscore');
eval(fs.readFileSync('./../utils/correlations.js')+'');
eval(fs.readFileSync('./parameters.js')+'');

//
//TrainingSet: this object holds the array of training data, the class is responsible for loading and preporcessing the data
//
function TrainingSet() {
  
  //parameter object holds all unique values and has the capability to process the parameters to an orthogonal set
  this._parameters = new Parameters();
  //historical transaction set
  this._transactions = null;
  //new transaction
  this._newTransaction = null;  
  //transaction history per user, used to create transaction frequency score
  var _transactionHistory = [];
  //property that wraps the initialization query
  this.getTransactionHistory = function(){
    if (_transactionHistory.length == 0 && this._transactions != null){
      _transactionHistory = this._transactions.map(function(val) {
        return {full_name: val["full_name"], created_at: Date.parse(val["created_at"])};
      });
    }
    return _transactionHistory;
  }
  //scale factor used to scale time to a one week horizon. 
  this.frequencyScoreScaleFactor = 7 * 24 * 60 * 60 * 1000; 
  //scale factor for the transaction amount
  this._amountScaleFactor = 500000;
  //parameter keys
  var _keys = [];
  //property that wraps the initialization if the parameter array
  this.getKeys = function(){
    if (_keys.length == 0 && _transactionHistory.length != 0 && this._transactions != null){
      for(var k in this._transactions[0]){
        _keys.push(k);
      }
    }
    return _keys;
  }
  //method to obtain the number of transaction that is present in the TrainingSet
  this.numberOfTransaction = function(){
    return this._parameters._correlations._ids.length;
  }
}

//
//load: loads the example transactions into the training set
//
TrainingSet.prototype.load = function(path, filename) {
  console.log("loading data from file:" + filename + " ...");
  return fs.readFileSync(path + filename, 'utf8');
}

//
//adjustTransactions: update transactions with; full_name and amount
//
TrainingSet.prototype.adjustTransactions = function() {
  console.log("updating transactions full_name and amount ...");
  for (var i in this._transactions){
    this._transactions[i]["full_name"] = this._transactions[i]["first_name"] + " " + this._transactions[i]["last_name"];
    this._transactions[i]["amount"] = this._transactions[i]["amount"] / this._amountScaleFactor;
  }
  this._newTransaction[0]["full_name"] = this._newTransaction[0]["first_name"] + " " + this._newTransaction[0]["last_name"];
  this._newTransaction[0]["amount"] = this._newTransaction[0]["amount"] / this._amountScaleFactor;
}

//
//createFrequencyScore: update transactions with frequency score attributes
//
TrainingSet.prototype.createFrequencyScore = function() {
  console.log("updating transactions with frequency_score ...");
  for (var i in this._transactions){
    this._transactions[i]["frequency_score"] = this.frequencyScore(this._transactions[i]["full_name"], Date.parse(this._transactions[i]["created_at"]));
  }
  this._newTransaction[0]["frequency_score"] = this.frequencyScore(this._newTransaction[0]["full_name"], Date.parse(this._newTransaction[0]["created_at"]));
}

//
//frequencyScore: finds the previous transaction and gives a score based on time to previous transaction on exp(-x) scale
//
TrainingSet.prototype.frequencyScore = function(fullName, createdAt){
  if (typeof createdAt != "number") {
    throw "getPreviousTransaction:Type error - createdAt should be of type number";
  }
  //
  //query transaction history list based on user and current transaction date 
  //
  var prevList = this.getTransactionHistory().filter(function(value){
    return value.full_name === fullName && value.created_at < createdAt;  
  });

  //if (prevList.count == 0) { return 0.0; }
  //prevList.sort(function(a,b) { return b.created_at - a.created_at }); //MW: alternative implementation (slower) sort (desc) the values and select the first item
  var _prev_ = 0;
  for (var i in prevList) {
    if (prevList[i].created_at > _prev_) { _prev_ = prevList[i].created_at; }
  }
  return Math.exp(-(createdAt - _prev_)/this.frequencyScoreScaleFactor);
}

//
//categorize: feeds the records to parameter object where the unique field values are organized
//
TrainingSet.prototype.categorize = function() {
  console.log("categorizing parameters ...");
  this._transactions.push(this._newTransaction[0]); //MW: make sure the new transaction will be part of the solution space
  var keys = this.getKeys();
  //
  //query unique values per parameter
  //
  for (var i in keys) {
    this._parameters._uniqueValues[keys[i]] = _.chain(this._transactions).map(function(item) { return item[keys[i]] }).uniq().value();
  }
  this._parameters.generateMapping();
  this._transactions.pop(); //MW: taking the new_transaction out again
}

//
//preProcess: performs all actions needed to load and process the training set
//
TrainingSet.prototype.preProcess = function() {
  this._newTransaction = JSON.parse(this.load("./../../data/", "new_transaction.json"));
  this._transactions = JSON.parse(this.load("./../../data/", "example_transactions.json"));
  this.adjustTransactions();
  this.createFrequencyScore();
  this.categorize();
  this._parameters.orthogonalizeSet(this._transactions);
  this._parameters.calculateCorrelations();
  this._parameters.eliminateCorrelatedParameters();

  console.log(this.getTransactionInput(0));
  console.log(this.getTransactionOutput(0));
}

//
//getTransaction: gives the processed transaction data for the index^th transaction
//
TrainingSet.prototype.getTransactionInput = function(index) {
  var id = this._parameters._correlations._ids[index];
  return this._parameters._orthogonal[id];
}

//
//getTransactionOutput: indicates whether the transaction has been "Chargedback".
//
TrainingSet.prototype.getTransactionOutput = function(index) {
  var id = this._parameters._correlations._ids[index];
  var status = this._transactions.filter(function(value){
    return value["id"] === id && value["status"] === "Chargeback";  
  });
  return (status.length != 0); 
}

t = new TrainingSet();

t.preProcess(t);

