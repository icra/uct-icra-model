/**
  * Removal % of the particulated fractions BPO, UPO and iSS
  *
  */
State_Variables.prototype.primary_settler=function(removal_BPO, removal_UPO, removal_iSS){
  //inputs default values
  removal_BPO = removal_BPO || 100*(406/707); //%
  removal_UPO = removal_UPO || 100*(130/150); //%
  removal_iSS = removal_iSS || 100*(66/100);  //%

  let BPO_removed = this.components.organic.X_BPO*removal_BPO/100;
  let UPO_removed = this.components.organic.X_UPO*removal_UPO/100;
  let iSS_removed = this.components.inorganic.X_iSS*removal_iSS/100;

  //apply the removal in the state variables
  this.components.organic.X_BPO   -= BPO_removed;
  this.components.organic.X_UPO   -= UPO_removed;
  this.components.inorganic.X_iSS -= iSS_removed;

  //debug
  console.log("primary_settler("+removal_BPO+","+removal_UPO+","+removal_iSS+") applied");

  //end
  return {
    BPO_removed:{value:BPO_removed, unit:"mg/L", descr:"BPO removed by PST"},
    UPO_removed:{value:UPO_removed, unit:"mg/L", descr:"UPO removed by PST"},
    iSS_removed:{value:iSS_removed, unit:"mg/L", descr:"iSS removed by PST"},
  };
};
