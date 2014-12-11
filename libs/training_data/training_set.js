//
//TrainingSet: this object holds the array of training data, the class is responsible for loading and preporcessing the data
//
function TrainingSet() {

  //parameter object holds all unique values and has the capability to process the parameters to an orthogonal set
  this._parameters = new Parameters();
  //historical transaction set
  this._transactions = null; 
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
}

//
//load: loads the transactions from file
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
}

//
//createFrequencyScore: update transactions with frequency score attributes
//
TrainingSet.prototype.createFrequencyScore = function() {
  console.log("updating transactions with frequency_score ...");
  for (var i in this._transactions){
    this._transactions[i]["frequency_score"] = this.frequencyScore(this._transactions[i]["full_name"], Date.parse(this._transactions[i]["created_at"]));
  }
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
  var keys = this.getKeys();
  //
  //query unique values per parameter
  //
  for (var i in keys) {
    this._parameters._uniqueValues[keys[i]] = _.chain(this._transactions).map(function(item) { return item[keys[i]] }).uniq().value();
  }
  this._parameters.generateMapping();
}

//
//preProcess: performs all actions needed to load and process the training set
//
TrainingSet.prototype.preProcess = function() {
  this._transactions = JSON.parse(this.load("./data/", "example_transactions.json"));
  this.adjustTransactions();
  this.createFrequencyScore();
  this.categorize();
  this._parameters.orthogonalizeSet(this._transactions);
  this._parameters.calculateCorrelations();
  this._parameters.eliminateCorrelatedParameters();
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
  return (status.length != 0) ? [1.0] : [0.0]; 
}

//
//getLength: method to obtain the dimensions of the training set. Number of transactions (index = 0) and number of parameters (index = 1).
//
TrainingSet.prototype.getLength = function(index){
  if (index == 0){
    return this._parameters._correlations._ids.length;  
  }
  else if (index == 1) {
    var key = this._parameters._correlations._ids[0]
    return this._parameters._orthogonal[key].length;
  }
  return 0;    
}

//
//orthogonalizeTransaction: method that processes the transaction and returns its orthogonal counterpart.
//
TrainingSet.prototype.orthogonalizeTransaction = function(transaction){
  transaction["full_name"] = transaction["first_name"] + " " + transaction["last_name"];
  transaction["amount"] = transaction["amount"] / this._amountScaleFactor;
  transaction["frequency_score"] = this.frequencyScore(transaction["full_name"], Date.parse(transaction["created_at"]));
  console.log("\ntransaction:");
  console.log(JSON.stringify(transaction));
  var orthogonal = this._parameters.orthogonalize(transaction);
  console.log("\northogonal representation:");
  console.log(JSON.stringify(orthogonal));
  this._parameters.eliminateByMask(orthogonal);
  console.log("\northogonal representation after correlated parameters have been removed:");
  console.log(JSON.stringify(orthogonal));
  return orthogonal;
}