/*
  idea: calculate the mass balances separated from the main code
*/

//2.9 - COD Balance
let FSe = eff_fluxes.totals.COD.total; //kg/d | total COD effluent: USO effluent flux + bCOD not degraded | Qe*(Suse+Sbse)
let FSw = was_fluxes.totals.COD.total; //kg/d | total COD wastage
let FOc = (function(){
  let catabolism  = 1 - fCV_OHO*YH;           //gCOD/gCOD | electrons used for energy (catabolism)
  let respiration = fCV_OHO*(1-fH)*bHT*f_XBH; //gCOD/gCOD | oxygen demand for endogenous respiration (O2->CO2)
  return FdSbi*(catabolism + respiration);    //kgO/d
})();
let FSout       = FSe + FSw + FOc; //kg/d | total COD out flux
let COD_balance = 100*FSout/FSti;  //percentage
let Nae_balance = 100*Nae/(this.components.S_FSA + Nobsi + Nobpi - Ns + Noupi - Nobse); //percentage

//2.10 - TKN balance
let FNti      = inf_fluxes.totals.TKN.total; //kgN/d | total TKN influent
let FNte      = eff_fluxes.totals.TKN.total; //kgN/d | total TKN effluent
let FNw       = was_fluxes.totals.TKN.total; //kgN/d | total TKN wastage
let FNout     = FNte + FNw;                  //kgN/d | total TKN out
let N_balance = 100*FNout/FNti;              //percentage

//2.11 - P balance
let FPti      = inf_fluxes.totals.TP.total; //kgP/d | total TP influent
let FPte      = eff_fluxes.totals.TP.total; //kgP/d | total TP effluent
let FPw       = was_fluxes.totals.TP.total; //kgP/d | total TP wastage
let FPremoved = cpr.PO4_removed.value;      //kgP/d | total PO4 removed by FeCl3
let FPout     = FPte + FPw + FPremoved;     //kgP/d | total TP out
let P_balance = 100*FPout/FPti;             //percentage

//calculate TOD wastage (TODw)
const fH = constants.fH;                   //ø | 0.20 (endogenous residue fraction)
const fCV_OHO = this.mass_ratios.f_CV_OHO; //gCOD/gVSS
const fCV_UPO = this.mass_ratios.f_CV_UPO; //gCOD/gVSS
const fCV_BPO = this.mass_ratios.f_CV_BPO; //gCOD/gVSS
const f_N_OHO = this.mass_ratios.f_N_OHO;  //gVSS/gN
const f_N_UPO = this.mass_ratios.f_N_UPO;  //gVSS/gN
const f_N_BPO = this.mass_ratios.f_N_BPO;  //gVSS/gN
let Qw    = nit.wastage.Q;                                          //ML/d   | wastage flowrate
let f     = nit.as_process_variables.f.value;                       //ø      | (1+RAS)/RAS (or 1 if we waste from reactor)
let X_BH  = nit.as_process_variables.MX_BH.value/Vp;                //kg/m3  | OHO
let X_EH  = nit.as_process_variables.MX_EH.value/Vp;                //kg/m3  | endogenous residue
let X_I   = nit.as_process_variables.MX_I .value/Vp;                //kg/m3  | UPO
let X_IO  = nit.as_process_variables.MX_IO.value/Vp;                //kg/m3  | iSS
let sTODw = Qw*(was_frac.COD.sCOD + 4.57*(was_frac.TKN.sON + Nae)); //kg/d   | soluble TODw
let pTODw = Qw*(
  f*(
    (fCV_OHO + 4.57*f_N_OHO)*(X_BH+X_EH) +
    (fCV_UPO + 4.57*f_N_UPO)*(X_I)
  )*1000);                                                          //kg/d | particulated TODw
let TODw   = sTODw + pTODw;                                         //kg/d | total TOD in wastage
let TODout = TODw + TODe + FOt + FOd;                               //kg/d | total TOD out
let TOD_balance = 100*TODout/TODi;                                  //percentage

//2.10 - N balance
let FNti      = this.fluxes.totals.TKN.total         + Q *Nni; //kgN/d | total TN influent
let FNte      = nit.effluent.fluxes.totals.TKN.total + Qe*Nne; //kgN/d | total TN effluent
let FNw       = nit.wastage.fluxes.totals.TKN.total  + Qw*Nne; //kgN/d | total TN wastage
let FNout     = FNte + FNw + FN2g;                             //kgN/d | total TN out
let N_balance = 100*FNout/FNti;                                //percentage
