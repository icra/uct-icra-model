/**
  * Removal % of the particulated fractions BPO, UPO and iSS
  *
  */
State_Variables.prototype.primary_settler=function(removal_BPO, removal_UPO, removal_iSS){
  //inputs default values
  removal_BPO = removal_BPO || 100*(406/707); //%
  removal_UPO = removal_UPO || 100*(130/150); //%
  removal_iSS = removal_iSS || 100*(66/100);  //%

  //apply removal rates
  this.components.organic.X_BPO   *= (100-removal_BPO)/100;
  this.components.organic.X_UPO   *= (100-removal_UPO)/100;
  this.components.inorganic.X_iSS *= (100-removal_iSS)/100;

  //debug
  console.log("primary_settler("+removal_BPO+","+removal_UPO+","+removal_iSS+") applied");

  //end
  return;
};
