//
//Parameters: this object holds the unique parameters of the record field and has the capability to convert the records to their orthogonal counterparts
//
function Parameters() {

  //list with all the orthogonal parameters stored by the payment id as key
  this._orthogonal = {};
  //method to verify whether key/id is already present
  this.inOrthogonal = function(id) {
    return (id in this._orthogonal);
  }

  //correlation object
  this._correlations = new Correlations();
  //unique values per parameter
  this._uniqueValues = {};
  //return number of unique values for a certain parameter (key)
  this.getNumberOfUniqueValues = function(key) {
    return (key in _uniqueValues) ? _uniqueValues[key].length : null;
  }
  
  //list of manually excluded parameters
  this.exclude = ["first_name", "last_name", "last_status_update", "phone", "mobile", "status", "amount", "frequency_score"];
  
  //parameter mapping, needed to map original records to an orthogonal representation of the record 
  this._parameterMapping = {}; 
  //lookup list that belongs to _parameterMapping list
  this._mappingLookUp = {};
}

//
//includeField: this method evaluates whether a parameter should be part of the orthogonal representation of the record.
//conditions:
//  key exists in the uniqueValues list
//  key is not part of the EXCLUDE list
//  key has to have more than one value, since otherwise there is not statistical value in this parameter
//  key can not be unique for each record, since otherwise there is not statistical value in this parameter
//
Parameters.prototype.includeField = function(key) {
  if (key in this._uniqueValues) {
    var condition01 = this.exclude.indexOf(key) == -1; //MW: parameters that are on the manual exclude list are excluded
    var condition02 = this._uniqueValues[key].length > 1; //MW: homogeneous parameters are excluded
    var condition03 = this._uniqueValues[key].length < this._uniqueValues["id"].length -1; //MW: parameters that are different for each transaction don't have any forcasting value and are excluded. The minus one here deals with the NULL item
    return condition01 && condition02 && condition03;
  }
  return false;
}

//
//generateMapping: this creates a dictionary style list with values as key and an indices (that represents the dimension in the orthogonal mapping) as values. 
//also a lookup version is created that stores indices as keys. this, to facilitate fast lookup both ways.
//
Parameters.prototype.generateMapping = function() {
  console.log("generating parameter mapping ...");
  var k = 0;
  for (var key in this._uniqueValues) {
    if (this.includeField(key)) {
      for (var i = 0; i < this._uniqueValues[key].length; i++) {
        this._parameterMapping[key + "-" + this._uniqueValues[key][i]] = k;
        this._mappingLookUp[k] = key + "-" + this._uniqueValues[key][i];
        k++;
      }
    }
  }
}

//
//orthogonalize: method that maps a record the its orthogonal counterpart (for single record)
//input is a record, the parameter mapping and two manual definitions are used for the mapping
//
Parameters.prototype.orthogonalize = function(record) {
  var d = Object.keys(this._mappingLookUp).length + 2; //MW: add two for the scalar fields amount and frequency factor
  var a = new Array(d+1).join('0').split('').map(parseFloat);
  var index = null;
  for (var key in record) {
    switch(key) {
      case "amount": //MW: the amount is manually set to the position #keys (-1 + 1) = #keys = d - 2
        index = d - 2;
        a[index] = record[key];
        break;
      case "frequency_score": //MW: the frequency score is manually set to the position #keys (-1 + 2) = #keys + 1 = d - 1
        index = d - 1;
        a[index] = record[key];
        break;
      default:
        if (this.includeField(key)) { //MW: make sure the field should be included in the representation
          index = this._parameterMapping[key + "-" + record[key]];
          if (index == undefined) {
            throw "orthogonalize:key value combination not found - the programm has been corrupted. stopping now ...";
          }
          a[index] = 1.0;
        }
    }
  }
  return a;
}

//
//orthogonalizeSet: method that maps a set of records to its orthogonal counterpars (for set of records)
//
Parameters.prototype.orthogonalizeSet = function(records) {
  console.log("converting the records to their orthogonal counterparts ..."); 
  for (var i in records) {
    var id = records[i]["id"];
    if (!this.inOrthogonal(id))
    {
      this._orthogonal[id] = this.orthogonalize(records[i]);
    }
  }
}

//
//calculateCorrelations: method that directs the correlation object to perform a correlation calculation on the entire orthogonal training set
//
Parameters.prototype.calculateCorrelations = function() {
  console.log("calculating correlations of the orthogonal parameters ..."); 
  this._correlations.setArray(this._orthogonal);
  this._correlations.calculateCorrelations();
}

//
//eliminateCorrelatedParameters: method that eliminates the correlated parameters from the orthogonamal representation
//
Parameters.prototype.eliminateCorrelatedParameters = function() {
  console.log("eliminating correlated parameters ..."); 
  for (var k in this._orthogonal) {
    this.eliminateByMask(this._orthogonal[k])
  }
}

//
//eliminateByMask: method that eliminates array elements based on a mask
//
Parameters.prototype.eliminateByMask = function(row) {
  var mask = this._correlations._eliminationMask;
  if (row.length != mask.length) { throw "eliminateByMask:Input error - mask size needs to match row size"; }
  //
  //MW: super important for the elimination to work backwards. Otherwise the elimination indices will be messed up.
  //
  for (var i = mask.length - 1; i >= 0; i--) {
    if (mask[i] != 0 ) {
      row.splice(i,1);
    }
  }
}

