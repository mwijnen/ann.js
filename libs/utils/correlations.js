//
//Correlations: object that holds on to an array (really a dictionary of vectors) of doubles
//correlations between vectors are calculated. Most part of the calculation is already performed when the array value is set.
//after that only the cross terms as you will remain to be calculated. This is carried out once calculateCorrelations is called. 
//
function Correlations() {

  //vectors of orthogonal parameter data. There number of vectors matches the number of parameters. 
  this._vectors = [];
  //original array of values (dictionary of orthogonal record data)
  this._array = {};
  //array of ids that is used as an intermediary to convert and index to an key (id as present in _array). This array effectively freezes the order of the keys in _array
  this._ids = [];
  //sumX for each vector, used to calculate the correlation 
  this._sumX = [];
  //sumX2 (squared) for each vector, used to calculate the correlation 
  this._sumX2 = [];
  //mask that represents which parameters will be eliminated (value = 1 aka not 0) and which stay (value = 0). 
  this._eliminationMask = [];
}

//
//setArray: The precalculations are wrapped in this setter function. Note that parameters are not shielded, so it is possible for other users to incorerctly set _array in case this method is not used
//
Correlations.prototype.setArray = function(value){
  this._array = value;
  for (var key in value) //MW: this array is created to freeze the order of the keys in the _array object  
  { 
    this._ids.push(key);
  }
  this.setVectors();
}

//
//setVectors: method to initialize the vectors from the _array (input) and precalculate sumX and sumX2
//
Correlations.prototype.setVectors = function(){
  var n = this._ids.length;
  var m = this._array[this._ids[0]].length;
  var element = 0;
  for (var j = 0; j < m; j++) {
    this._vectors[j] = [];
    this._sumX[j] = 0;
    this._sumX2[j] = 0;
    for (var i = 0; i < n; i++) {
      element = this._array[this._ids[i]][j];
      this._vectors[j][i] = element;
      this._sumX[j] += element;
      this._sumX2[j] += element * element;
    }
  }
}

//
//
//
Correlations.prototype.calculateCorrelation = function(j,k) {
  var sumXY = 0;
  var n = this._vectors[0].length;
  for (var i = 0; i < n; i++){
    sumXY += this._vectors[j][i] * this._vectors[k][i];
  }
  var stdXj = Math.sqrt(this._sumX2[j] / n - this._sumX[j] * this._sumX[j] / n / n);
  var stdXk = Math.sqrt(this._sumX2[k] / n - this._sumX[k] * this._sumX[k] / n / n);
  var covariance = (sumXY / n - this._sumX[j] * this._sumX[k] / n / n);
  return covariance / stdXj / stdXk;
}

Correlations.prototype.calculateCorrelations = function() {
  this._eliminationMask = new Array(this._vectors.length+1).join('0').split('').map(parseFloat);
  var eliminationLog = {};
  var m = this._vectors.length;
  var correlation = 0;
  for (i = 0; i < m; i++){
    for (j = 0; j < i; j++){ //MW: only half the matrix is looped over, to avoid double calculations.
      if (i != j){
        if (this._eliminationMask[i] == 0 && this._eliminationMask[j] == 0) {//MW: once a parameter has been removed, it will no longer be used to eliminate other parameters.
          correlation = this.calculateCorrelation(i,j);
          if (correlation > .7){ //MW: only positive correlations are considered, because negative correlation occure at different outcomes within a single parameter. More sophisticated approach can be taken here.
            this._eliminationMask[i] = 1; //MW: the socond parameter is removed (j < i), this is just an arbitrary convention.
            eliminationLog[i] = [i,j];
          }
        }
      }
    }
  }
  //console.log(JSON.stringify(eliminationLog));
}
