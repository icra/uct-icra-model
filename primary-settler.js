/*
  Removal % of the particulated fractions BPO, UPO and iSS

    Qi → [Primary Settler] → Qe
                ↓
                Qw
*/

//node imports
if(typeof document == "undefined"){ State_Variables = require("./state-variables.js"); }

State_Variables.prototype.primary_settler=function(fw, removal_BPO, removal_UPO, removal_iSS){
  //inputs and default values
  fw          = isNaN(fw) ? 0.005 : fw; //fraction of Q that goes to wastage  
  removal_BPO = isNaN(removal_BPO) ? 100-100*24.875*255/(25*440) : removal_BPO; //%
  removal_UPO = isNaN(removal_UPO) ? 100-100*24.875* 10/(25*100) : removal_UPO; //%
  removal_iSS = isNaN(removal_iSS) ? 100-100*24.875* 15/(25* 60) : removal_iSS; //%

  //convert percentages to rate
  removal_BPO /= 100;
  removal_UPO /= 100;
  removal_iSS /= 100;

  //calculate wastage and primary effluent flowrates
  let Qi = this.Q;
  let Qw = fw * Qi; //m3/d
  let Qe = Qi - Qw; //m3/d

  //calculate PO (particulated organics) wastage and effluent
  let X_BPO_i = this.components.X_BPO; //mg/L influent
  let X_UPO_i = this.components.X_UPO; //mg/L influent
  let X_iSS_i = this.components.X_iSS; //mg/L influent
  let X_BPO_w = Qi*X_BPO_i*removal_BPO/Qw; //mg/L wastage
  let X_UPO_w = Qi*X_UPO_i*removal_UPO/Qw; //mg/L wastage
  let X_iSS_w = Qi*X_iSS_i*removal_iSS/Qw; //mg/L wastage
  let X_BPO_e = Qi*X_BPO_i*(1-removal_BPO)/Qe; //mg/L effluent
  let X_UPO_e = Qi*X_UPO_i*(1-removal_UPO)/Qe; //mg/L effluent
  let X_iSS_e = Qi*X_iSS_i*(1-removal_iSS)/Qe; //mg/L effluent

  //get the soluble components not affected by primary settler
  let S_VFA  = this.components.S_VFA;  //mg/L soluble (not affected by primary settler)
  let S_FBSO = this.components.S_FBSO; //mg/L soluble (not affected by primary settler)
  let S_USO  = this.components.S_USO;  //mg/L soluble (not affected by primary settler)
  let S_FSA  = this.components.S_FSA;  //mg/L soluble (not affected by primary settler)
  let S_OP   = this.components.S_OP;   //mg/L soluble (not affected by primary settler)
  let S_NOx  = this.components.S_NOx;  //mg/L soluble (not affected by primary settler)

  //crete 2 new state variables (for wastage and effluent)
  //                      constructor(Q, S_VFA, S_FBSO, X_BPO,   X_UPO,   S_USO, X_iSS,   S_FSA, S_OP, S_NOx){
  let effluent = new State_Variables(Qe, S_VFA, S_FBSO, X_BPO_e, X_UPO_e, S_USO, X_iSS_e, S_FSA, S_OP, S_NOx);
  let wastage  = new State_Variables(Qw, S_VFA, S_FBSO, X_BPO_w, X_UPO_w, S_USO, X_iSS_w, S_FSA, S_OP, S_NOx);

  /*
    console.log("=== INFLUENT CONCENTRATIONS");  console.log(this.totals);
    console.log("=== INFLUENT FLUXES");          console.log(this.fluxes.totals);
    console.log("=== EFFLUENT CONCENTRATIONS");  console.log(effluent.totals);
    console.log("=== EFFLUENT FLUXES");          console.log(effluent.fluxes.totals);
    console.log("=== WASTAGE  CONCENTRATIONS");  console.log(wastage.totals);
    console.log("=== WASTAGE  FLUXES");          console.log(wastage.fluxes.totals);
  */
  //calculate mass flux sludge produced (kg TSS)
  //it has to be the same value as wastage.fluxes.totals.TSS.total
  let BPO_removed = wastage.fluxes.components.X_BPO/this.mass_ratios.f_CV_BPO; //kg VSS
  let UPO_removed = wastage.fluxes.components.X_UPO/this.mass_ratios.f_CV_UPO; //kg VSS
  let iSS_removed = wastage.fluxes.components.X_iSS;                           //kg iSS
  let primary_sludge = BPO_removed + UPO_removed + iSS_removed;          //kg TSS
  //console.log(primary_sludge);
  //console.log(wastage.fluxes.totals.TSS.total);
  let process_variables={
    Qe:             {value:Qe, unit:"ML/d", descr:"Effluent flowrate"},
    Qw:             {value:Qw, unit:"ML/d", descr:"Wastage flowrate"},
    primary_sludge: {value:primary_sludge, unit:"kg/d", descr:"Primary sludge production"},
  };

  //results
  return {process_variables, effluent, wastage};
};

//test
(function test(){
  return;
  let inf = new State_Variables();
  let pst = inf.primary_settler();
  console.log(pst.wastage.totals); //table page 8
})();
