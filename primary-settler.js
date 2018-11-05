/*
  Removal % of the particulated fractions BPO, UPO and iSS
*/

State_Variables.prototype.primary_settler=function(Q, removal_BPO, removal_UPO, removal_iSS){
  //inputs and default values
  Q           = Q           || 25000*0.005;   //m3/d
  removal_BPO = removal_BPO || 100*(406/707); //%
  removal_UPO = removal_UPO || 100*(130/150); //%
  removal_iSS = removal_iSS || 100*(66/100);  //%

  //calculate the concentration of particulated organics removed
  let BPO_removed = this.components.X_BPO*removal_BPO/100; //mg/L
  let UPO_removed = this.components.X_UPO*removal_UPO/100; //mg/L
  let iSS_removed = this.components.X_iSS*removal_iSS/100; //mg/L

  //subtract the removed organics from the state variables TODO
  //this.components.X_BPO -= BPO_removed; //mg/L
  //this.components.X_UPO -= UPO_removed; //mg/L
  //this.components.X_iSS -= iSS_removed; //mg/L

  //end
  return {
    BPO_removed:{value:Q*BPO_removed/1000, unit:"kg/d", descr:"Mass of BPO removed by PST"},
    UPO_removed:{value:Q*UPO_removed/1000, unit:"kg/d", descr:"Mass of UPO removed by PST"},
    iSS_removed:{value:Q*iSS_removed/1000, unit:"kg/d", descr:"Mass of iSS removed by PST"},
  };
};

//import "State_Variables" class only in node
if(typeof document == "undefined"){ State_Variables=require("./state-variables.js"); }

//test
(function test(){
  return;
  let sv=new State_Variables('reactor');
  console.log(sv.primary_settler());
})();
