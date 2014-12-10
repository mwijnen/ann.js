fs = require('fs') //MW: enable file io 
eval(fs.readFileSync('./../training_data/correlations.js')+'');

var array = {
  "a":[1,1,-1,4], 
  "b":[2,2,-2,3], 
  "c":[2,2,-2,2], 
  "d":[2,2,-2,4]
};

correlation = new Correlations();
correlation.setArray(array);
console.log(correlation.calculateCorrelation(0,1));
console.log(correlation.calculateCorrelation(0,2));
console.log(correlation.calculateCorrelation(0,3));

correlation.calculateCorrelations();