/*
  Primary settler implementation from G. Ekama notes
  Removal % of the particulated fractions: BPO, UPO and iSS

  Qi → [Primary Settler] → Qe
              ↓
              Qw
*/

//import files
try{
  State_Variables=require("./state-variables.js");
}catch(e){}

State_Variables.prototype.primary_settler=function(parameters){
  //===========================================================================
  // PARAMETERS
  //===========================================================================
  let fw          = parameters.fw;          //fraction of Q that goes to wastage
  let removal_BPO = parameters.removal_BPO; //% | removal of the component X_BPO
  let removal_UPO = parameters.removal_UPO; //% | removal of the component X_UPO
  let removal_iSS = parameters.removal_iSS; //% | removal of the component X_iSS

  //check undefined parameters
  if(fw         ==undefined) throw new Error(`fw          is undefined`);
  if(removal_BPO==undefined) throw new Error(`removal_BPO is undefined`);
  if(removal_UPO==undefined) throw new Error(`removal_UPO is undefined`);
  if(removal_iSS==undefined) throw new Error(`removal_iSS is undefined`);

  //check variable types
  if(typeof(fw         )!="number") throw new Error(`fw          is not a number`);
  if(typeof(removal_BPO)!="number") throw new Error(`removal_BPO is not a number`);
  if(typeof(removal_UPO)!="number") throw new Error(`removal_UPO is not a number`);
  if(typeof(removal_iSS)!="number") throw new Error(`removal_iSS is not a number`);

  //numerical checks for physical sense
  if(fw          <  0) throw new Error(`Value of PST Wastage fraction (fw=${fw}) not allowed`);
  if(removal_BPO <  0) throw new Error(`Value of BPO removal (removal_BPO=${removal_BPO}) not allowed`);
  if(removal_UPO <  0) throw new Error(`Value of UPO removal (removal_UPO=${removal_UPO}) not allowed`);
  if(removal_iSS <  0) throw new Error(`Value of iSS removal (removal_iSS=${removal_iSS}) not allowed`);

  //convert percentages to rate
  removal_BPO /= 100;
  removal_UPO /= 100;
  removal_iSS /= 100;

  //influent biomass (OHO and PAO) are removed as UPO
  //(is not important because influent OHO is always 0)
  let removal_OHO = removal_UPO;
  let removal_PAO = removal_UPO;

  //calculate wastage and primary effluent flowrates
  let Qi = this.Q;  //ML/d
  let Qw = fw * Qi; //ML/d
  let Qe = Qi - Qw; //ML/d

  //calculate new distribution of particulated organics
  //influent
  let X_BPO_i = this.components.X_BPO; //mgCOD/L influent
  let X_UPO_i = this.components.X_UPO; //mgCOD/L influent
  let X_iSS_i = this.components.X_iSS; //mgCOD/L influent
  let X_OHO_i = this.components.X_OHO; //mgCOD/L influent
  let X_PAO_i = this.components.X_PAO; //mgCOD/L influent

  //wastage
  let X_BPO_w = Qi*X_BPO_i*removal_BPO/Qw; //mgCOD/L wastage
  let X_UPO_w = Qi*X_UPO_i*removal_UPO/Qw; //mgCOD/L wastage
  let X_iSS_w = Qi*X_iSS_i*removal_iSS/Qw; //mgCOD/L wastage
  let X_OHO_w = Qi*X_OHO_i*removal_OHO/Qw; //mgCOD/L wastage
  let X_PAO_w = Qi*X_PAO_i*removal_PAO/Qw; //mgCOD/L wastage

  //effluent
  let X_BPO_e = Qi*X_BPO_i*(1-removal_BPO)/Qe; //mgCOD/L effluent
  let X_UPO_e = Qi*X_UPO_i*(1-removal_UPO)/Qe; //mgCOD/L effluent
  let X_iSS_e = Qi*X_iSS_i*(1-removal_iSS)/Qe; //mgCOD/L effluent
  let X_OHO_e = Qi*X_OHO_i*(1-removal_OHO)/Qe; //mgCOD/L effluent
  let X_PAO_e = Qi*X_PAO_i*(1-removal_PAO)/Qe; //mgCOD/L effluent

  //soluble components not affected by primary settler
  let S_VFA  = this.components.S_VFA;  //mg/L soluble
  let S_FBSO = this.components.S_FBSO; //mg/L soluble
  let S_USO  = this.components.S_USO;  //mg/L soluble
  let S_NH4  = this.components.S_NH4;  //mg/L soluble
  let S_PO4  = this.components.S_PO4;  //mg/L soluble
  let S_NOx  = this.components.S_NOx;  //mg/L soluble
  let S_O2   = this.components.S_O2;   //mg/L soluble

  //new output state variables (wastage and effluent)
  //syntax                          (Qi, S_VFA, S_FBSO,   X_BPO,   X_UPO, S_USO,   X_iSS, S_NH4, S_PO4, S_NOx, S_O2,   X_OHO,   X_PAO)
  let effluent = new State_Variables(Qe, S_VFA, S_FBSO, X_BPO_e, X_UPO_e, S_USO, X_iSS_e, S_NH4, S_PO4, S_NOx, S_O2, X_OHO_e, X_PAO_e);
  let wastage  = new State_Variables(Qw, S_VFA, S_FBSO, X_BPO_w, X_UPO_w, S_USO, X_iSS_w, S_NH4, S_PO4, S_NOx, S_O2, X_OHO_w, X_PAO_w);

  //copy mass ratios for the new outputs
  effluent.mass_ratios = this.mass_ratios;
  wastage.mass_ratios  = this.mass_ratios;

  //return both output state variables objects
  return {effluent, wastage};
};

//test
(function test(){
  return
  //syntax                     (  Q, VFA, FBSO, BPO, UPO, USO, iSS,  NH4,   PO4, NOx, O2, OHO PAO)
  let inf = new State_Variables(100,  50,  186, 406, 130,  58, 100, 59.6, 14.15,   0,  0,   0,  0);
  let pst = inf.primary_settler({
    fw          : 0.005,                       //ø
    removal_BPO : 100-100*24.875*255/(25*440), //%
    removal_UPO : 100-100*24.875* 10/(25*100), //%
    removal_iSS : 100-100*24.875* 15/(25* 60), //%
  });
  //show info
  console.log(inf.components);
  console.log(pst.effluent.components);
  //console.log(pst.wastage.components);
})();
