/*
  Removal % of the particulated fractions BPO, UPO and iSS
*/

//node imports
if(typeof document == "undefined"){ State_Variables=require("./state-variables.js"); }

State_Variables.prototype.primary_settler=function(Q, fw, removal_BPO, removal_UPO, removal_iSS){
  //inputs and default values
  Q           = isNaN(Q          ) ? 25000         : Q          ; //m3/d
  fw          = isNaN(fw         ) ? 0.005         : fw         ; //fraction of Q that goes to wastage  
  removal_BPO = isNaN(removal_BPO) ? 100*(406/707) : removal_BPO; //%
  removal_UPO = isNaN(removal_UPO) ? 100*(130/150) : removal_UPO; //%
  removal_iSS = isNaN(removal_iSS) ? 100*(66/100)  : removal_iSS; //%

  //calculate wastage and primary effluent flowrates
  let Qw = fw * Q;  //m3/d
  let Qe = Q  - Qw; //m3/d

  //calculate PO (particulated organics) eliminated (kg/d)
  let BPO_removed = Q*this.components.X_BPO/1000*removal_BPO/100; //kg/d
  let UPO_removed = Q*this.components.X_UPO/1000*removal_UPO/100; //kg/d
  let iSS_removed = Q*this.components.X_iSS/1000*removal_iSS/100; //kg/d

  //subtract the removed organics from the state variables TODO
  //this.components.X_BPO -= BPO_removed; //mg/L
  //this.components.X_UPO -= UPO_removed; //mg/L
  //this.components.X_iSS -= iSS_removed; //mg/L

  //results
  return{
    Qe:         {value:Qe,          unit:"m3/d", descr:"Primary effluent flowrate"},
    Qw:         {value:Qw,          unit:"m3/d", descr:"Wastage flowrate"},
    BPO_removed:{value:BPO_removed, unit:"kg/d", descr:"Mass of BPO removed by PST"},
    UPO_removed:{value:UPO_removed, unit:"kg/d", descr:"Mass of UPO removed by PST"},
    iSS_removed:{value:iSS_removed, unit:"kg/d", descr:"Mass of iSS removed by PST"},
  };
};

//test
(function test(){
  return;
  let sv=new State_Variables();
  console.log(sv.primary_settler());
})();
