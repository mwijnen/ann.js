//module that implements the neural network https://github.com/harthur/brain
var brain = require('brain');

//
//Network: wrapper class that holds the neural network and the set of previous transactions (training data)
//
function Network(trainingSet) {
  
  //training set object that holds the processed previous transactions
  this.trainingSet = trainingSet;
  //learning rate that determines that step size in the steepest descent method that is used to train the neural network
  this.learningRate = 0.1;
  //number of transaction that are used to train the network, unfortunately it is not feasible to use all transactions at this point 
  this.nTrans = 100;
  //holds the neural network
  this.net = null;
}

Network.prototype.train = function(){
  var data = [];
  for (var i = 0; i < this.nTrans; i++) {
    data.push({input: this.trainingSet.getTransactionInput(i), output: this.trainingSet.getTransactionOutput(i)});
  }
  //
  //setting upt the network
  //
  console.log("setting up the network ... ");
  this.net = new brain.NeuralNetwork({
    hiddenLayers: [200],
    learningRate: this.learningRate 
  });
  //
  //train the network
  //
  console.log("training the network ... ");
  this.net.train(data, {
      errorThresh: 0.01,
      iterations: 50,
      log: false 
  });
  //
  //display the network output for the first transactions
  //
  for (var i = 0; i < Math.min(this.nTrans, 100); i++) {
    var score = this.net.run(this.trainingSet.getTransactionInput(i))[0];
    var actual = this.trainingSet.getTransactionOutput(i)[0];
    console.log("transaction: " + i.toFixed(0) + ", actual outcome: " + actual.toFixed(1) + " forcasted outcome: " + score.toFixed(8));
  }

}

//
//scoreTransaction: method that scores the provided transaction based on a neural network that has been trained with previous transactions
//
Network.prototype.scoreTransaction = function(transaction){
  var orthogonal = this.trainingSet.orthogonalizeTransaction(transaction);
  var score = this.net.run(orthogonal);
  console.log("\ntransaction \"Chargeback\" score:")
  console.log(score[0].toFixed(8));
  return score;
}
