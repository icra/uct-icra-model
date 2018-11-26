/*
  Primary settler implementation from G. Ekama notes
  Removal % of the particulated fractions: BPO, UPO and iSS

  Qi → [Primary Settler] → Qe
              ↓
              Qw
*/

//import files
if(typeof document == "undefined"){ State_Variables = require("./state-variables.js"); }

State_Variables.prototype.primary_settler=function(fw, removal_BPO, removal_UPO, removal_iSS){
  //inputs and default values
  fw          = isNaN(fw)          ? 0.005                       : fw;          //fraction of Q that goes to wastage  
  removal_BPO = isNaN(removal_BPO) ? 100-100*24.875*255/(25*440) : removal_BPO; //% | removal of the component X_BPO
  removal_UPO = isNaN(removal_UPO) ? 100-100*24.875* 10/(25*100) : removal_UPO; //% | removal of the component X_UPO
  removal_iSS = isNaN(removal_iSS) ? 100-100*24.875* 15/(25* 60) : removal_iSS; //% | removal of the component X_iSS

  //convert percentages to rate
  removal_BPO /= 100;
  removal_UPO /= 100;
  removal_iSS /= 100;

  //calculate wastage and primary effluent flowrates
  let Qi = this.Q;
  let Qw = fw * Qi; //ML/d
  let Qe = Qi - Qw; //ML/d

  //calculate PO (particulated organics) wastage and effluent
  let X_BPO_i = this.components.X_BPO;         //mg/L influent
  let X_UPO_i = this.components.X_UPO;         //mg/L influent
  let X_iSS_i = this.components.X_iSS;         //mg/L influent
  let X_BPO_w = Qi*X_BPO_i*removal_BPO/Qw;     //mg/L wastage
  let X_UPO_w = Qi*X_UPO_i*removal_UPO/Qw;     //mg/L wastage
  let X_iSS_w = Qi*X_iSS_i*removal_iSS/Qw;     //mg/L wastage
  let X_BPO_e = Qi*X_BPO_i*(1-removal_BPO)/Qe; //mg/L effluent
  let X_UPO_e = Qi*X_UPO_i*(1-removal_UPO)/Qe; //mg/L effluent
  let X_iSS_e = Qi*X_iSS_i*(1-removal_iSS)/Qe; //mg/L effluent

  //get soluble components not affected by primary settler
  let S_VFA  = this.components.S_VFA;  //mg/L soluble (not affected by primary settler)
  let S_FBSO = this.components.S_FBSO; //mg/L soluble (not affected by primary settler)
  let S_USO  = this.components.S_USO;  //mg/L soluble (not affected by primary settler)
  let S_FSA  = this.components.S_FSA;  //mg/L soluble (not affected by primary settler)
  let S_OP   = this.components.S_OP;   //mg/L soluble (not affected by primary settler)
  let S_NOx  = this.components.S_NOx;  //mg/L soluble (not affected by primary settler)

  //new output state variables (wastage and effluent)
  //syntax--------------------------(Qi, VFA,   FBSO,   BPO,     UPO,     USO,   iSS,     FSA,   OP,   NOx)
  let effluent = new State_Variables(Qe, S_VFA, S_FBSO, X_BPO_e, X_UPO_e, S_USO, X_iSS_e, S_FSA, S_OP, S_NOx);
  let wastage  = new State_Variables(Qw, S_VFA, S_FBSO, X_BPO_w, X_UPO_w, S_USO, X_iSS_w, S_FSA, S_OP, S_NOx);

  //calculate mass flux sludge produced (kg TSS)
  let primary_sludge = wastage.fluxes.totals.TSS.total;

  //pack process variables
  let process_variables={
    primary_sludge: {value:primary_sludge, unit:"kg_TSS/d", descr:"Primary sludge production"},
  };

  //results
  return {
    process_variables,
    effluent,
    wastage
  };
};

//test
(function test(){
  return;
  let inf = new State_Variables(); //use default values
  let pst = inf.primary_settler(); //use default values
  //show info
  console.log(inf.summary);
  console.log(pst.process_variables);
  console.log(pst.effluent.summary);
  console.log(pst.wastage.summary); //same as table page 8 G.Ekama notes
})();
