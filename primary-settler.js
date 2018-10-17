/**
  * Removal % of the particulated fractions BPO, UPO and iSS
*/

//import "State_Variables" class
if(typeof(require)!="undefined"){var State_Variables=require("./state-variables.js");}

State_Variables.prototype.primary_settler=function(removal_BPO, removal_UPO, removal_iSS){
  //inputs default values
  removal_BPO = removal_BPO || 100*(406/707); //%
  removal_UPO = removal_UPO || 100*(130/150); //%
  removal_iSS = removal_iSS || 100*(66/100);  //%

  //calculate amount of particulated organics removed
  let BPO_removed = this.components.X_BPO*removal_BPO/100;
  let UPO_removed = this.components.X_UPO*removal_UPO/100;
  let iSS_removed = this.components.X_iSS*removal_iSS/100;

  //subtract the removed organics from the state variables
  this.components.X_BPO -= BPO_removed;
  this.components.X_UPO -= UPO_removed;
  this.components.X_iSS -= iSS_removed;

  //end
  return {
    BPO_removed:{value:BPO_removed, unit:"mg/L", descr:"BPO removed by PST"},
    UPO_removed:{value:UPO_removed, unit:"mg/L", descr:"UPO removed by PST"},
    iSS_removed:{value:iSS_removed, unit:"mg/L", descr:"iSS removed by PST"},
  };
};

//test
/*
let sv = new State_Variables('reactor');
console.log( sv.primary_settler() );
*/
