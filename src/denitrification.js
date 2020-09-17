/*
  Denitrification implementation
  from G. Ekama notes

  this function modifies the output of the nitrification module

  input structure:
    * parameters = object
    * result     = {process_variables, effluent, wastage}
*/

//import files
try{
  State_Variables=require("./state-variables.js");
  constants      =require("./constants.js");
  require("./nitrification.js");
}catch(e){}

State_Variables.prototype.denitrification=function(parameters, result){
  //check undefined inputs
  if(parameters==undefined) throw new Error("parameters is undefined");
  if(result    ==undefined) throw new Error("result     is undefined");

  //check effluent and wastage
  if(result.effluent.constructor!==State_Variables) throw new Error("effluent is not a State_Variables object");
  if(result.wastage.constructor !==State_Variables) throw new Error("wastage  is not a State_Variables object");

  //unpack result from Nitrification module
  let effluent = result.effluent;             //State_Variables object (from nitrification)
  let wastage  = result.wastage;              //State_Variables object (from nitrification)
  let as_ppvv  = result.as_process_variables; //object (from AS or BPR)
  let nit_ppvv = result.process_variables;    //object (from nitrification)

  //===========================================================================
  // PARAMETERS
  //===========================================================================
  let T            = parameters.T;            //ºC            | Temperature
  let Vp           = parameters.Vp;           //m3            | Volume of reactor
  let Rs           = parameters.Rs;           //days          | Solids Retention Time or Sludge Age
  let DO           = parameters.DO;           //mg/L          | DO in the aerobic reactor
  let RAS          = parameters.RAS;          //ø             | SST underflow recycle ratio
  let SF           = parameters.SF;           //ø             | nit safety factor
  let fxt          = parameters.fxt;          //ø             | nit unaerated sludge mass fraction
  let IR           = parameters.IR;           //ø             | internal recirculation ratio
  let DO_RAS       = parameters.DO_RAS;       //mgO/L         | DO in the underflow recycle
  let influent_alk = parameters.influent_alk; //mg/L as CaCO3 | influent alkalinity

  //check undefined parameters
  if(IR          ==undefined) throw new Error(`IR           is undefined`);
  if(DO_RAS      ==undefined) throw new Error(`DO_RAS       is undefined`);
  if(influent_alk==undefined) throw new Error(`influent_alk is undefined`);

  //check variable types
  if(typeof IR          !="number") throw new Error(`IR           is not a number`);
  if(typeof DO_RAS      !="number") throw new Error(`DO_RAS       is not a number`);
  if(typeof influent_alk!="number") throw new Error(`influent_alk is not a number`);

  //numerical checks for physical sense
  if(IR           < 0) throw new Error(`Value of Internal recirculation ratio (IR=${IR}) not allowed`);
  if(DO_RAS       < 0) throw new Error(`Value of Dissolved oxygen in the recycle stream (DO_RAS=${DO_RAS}) not allowed`);
  if(influent_alk < 0) throw new Error(`Value of Influent Alkalinity (influent_alk=${influent_alk}) not allowed`);

  //flowrate
  let Q = this.Q; //ML/d  | influent flowrate

  //fractionation (concentrations)
  let inf_frac = this.totals;     //object | influent fractionation
  let eff_frac = effluent.totals; //object | nit effluent fractionation
  let was_frac = wastage.totals;  //object | nit wastage fractionation

  //get necessary variables
  let Sti  = inf_frac.COD.total;         //mg/L  | total COD influent
  let Sbi  = inf_frac.COD.bCOD;          //mg/L  | bCOD  (VFA+FBSO+BPO)
  let Sbsi = inf_frac.COD.bsCOD;         //mg/L  | bsCOD (VFA+FBSO)
  let Sbse = effluent.components.S_FBSO; //mg/L  | bCOD not degraded "Sbse"
  let Nti  = inf_frac.TKN.total;         //mgN/L | total TKN influent
  let Nni  = this.components.S_NOx;      //mgN/L | influent nitrate (not including nitrification capacity)
  let Nae  = effluent.components.S_NH4;  //mgN/L | effluent ammonia
  let Nc   = nit_ppvv.Nc.value;          //mgN/L | nitrate generated in nitrification (does not include influent nitrate)
  let Nte  = eff_frac.TKN.total;         //mgN/L | nitrification TKN effluent

  //VSS mass ratios
  const fCV_UPO = this.mass_ratios.f_CV_UPO; //gCOD/gVSS
  const fCV_OHO = this.mass_ratios.f_CV_OHO; //gCOD/gVSS
  const fCV_PAO = this.mass_ratios.f_CV_PAO; //gCOD/gVSS
  const f_N_UPO = this.mass_ratios.f_N_UPO;  //gN/gVSS
  const f_N_OHO = this.mass_ratios.f_N_OHO;  //gN/gVSS
  const f_N_PAO = this.mass_ratios.f_N_PAO;  //gN/gVSS

  //denitrification kinetics (page 19)
  //3.2 - denitrification kinetic constants
  const K1_20 = constants.K1_20;                     //0.720 gN/gVSS·d | at 20ºC page 482 and 113
  const K2_20 = constants.K2_20;                     //0.101 gN/gVSS·d | at 20ºC page 482 and 113
  const K1T   = K1_20*Math.pow(constants.ϴ_K1,T-20); //gN/gVSS·d       | corrected by temperature (ϴ = 1.200)
  const K2T   = K2_20*Math.pow(constants.ϴ_K2,T-20); //gN/gVSS·d       | corrected by temperature (ϴ = 1.080)

  //3.2 bsCOD/bCOD ratio
  let fSb_s = Sbsi/Sbi||0; //ratio BSO/(BSO+BPO)

  //stoichiometric constants
  const i_NO3_N2  = 40/14; //~2.86 gCOD/gN | stoichiometric factor for NO3 reduction to N2
  const i_COD_NO3 = 64/14; //~4.57 gCOD/gN | conversion factor for NO3 in COD
  //console.log({i_NO3_N2, i_COD_NO3});//debugging

  //compute denitrification potential (Dp1)
  const YH    = constants.YH;             //0.666 gCOD/gCOD
  const YHvss = YH/fCV_OHO;               //0.45  gVSS/gCOD
  let f_XBH   = as_ppvv.f_XBH.value;      //gVSS·d/gCOD | YHvss*Rs/(1+bHT*Rs)
  let Dp1RBSO = Sbsi*(1-YH)/i_NO3_N2;     //mgN/L
  let Dp1BPO  = K2T*fxt*(Sbi-Sbse)*f_XBH; //mgN/L
  let Dp1     = Dp1RBSO+Dp1BPO;           //mgN/L

  /*
    modification for Dp1 (denitrification potential)
    when there is bio P removal
  */
  if(as_ppvv.MX_PAO){
    Dp1 = (function(){ //mgN/L
      let RR = parameters.RR; //ø | r-recycle (anoxic to anaerobic)
      if(RR==undefined)         throw new Error("r-recycle (anoxic to anaerobic, RR) is undefined");
      if(typeof RR != "number") throw new Error(`r-recycle (anoxic to anaerobic, RR) is not a number`);
      if(RR < 0)                throw new Error(`Value of r-recycle (anoxic to anaerobic) (RR=${RR}) not allowed`);

      let fxm       = nit_ppvv.fxm.value;                //ø | maximum unaerated sludge fraction for nitrification
      let f_AN      = parameters.f_AN;                   //ø | anaerobic sludge fraction
      let fx1       = fxm - f_AN;                        //ø
      let K2_20_PAO = constants.K2_20_PAO;               //0.255 gN/gVSS·d
      let ϴ_K2_PAO  = constants.ϴ_K2_PAO;            //1.080
      let K2T_PAO   = K2_20_PAO*Math.pow(ϴ_K2_PAO,T-20); //gN/gVSS·d

      //compute Dp1 modified for bio P removal
      //note: 40/14 is ≈ 2.86 stoichiometric constant (gCOD/gN) NO3 reduction to N2
      //let Dp1 = S_FBSO_AN*(1+r)*(1-YH)/(40/14) + K2T_PAO*fx1*(F_sb_OHO/Q)*(YH/f_CV_OHO)/(1+bHT*Rs);
      let S_FBSO_AN = as_ppvv.S_FBSO_AN.value;             //mgCOD/L
      let F_sb_OHO  = as_ppvv.F_sb_OHO.value;              //kgCOD/d
      let Dp1RBSO   = S_FBSO_AN*(1+RR)*(1-YH)/i_NO3_N2;    //mgN/L
      let Dp1BPO    = K2T_PAO*fx1*(F_sb_OHO/Q-Sbse)*f_XBH; //mgN/L
      let Dp1       = Dp1RBSO+Dp1BPO;                      //mgN/L
      return Dp1;
    })();
  }

  //compute optimum internal recirculation (a_opt)
  let a = IR; //symbol change from "IR" to "a"
  let a_opt = (function(){
    let A = DO/i_NO3_N2;
    let B = Nc-(Dp1-Nni)+((1+RAS)*DO + RAS*DO_RAS)/i_NO3_N2;
    let C = (1+RAS)*((Dp1-Nni)-RAS*DO_RAS/i_NO3_N2)-RAS*Nc;
    //console.log({A,B,C});
    return Math.max(0, (-B+Math.sqrt(B*B+4*A*C))/(2*A));
  })();

  //minimum possible effluent NOx concentration
  let Nne_opt = Nc/(a_opt+RAS+1) ||0; //mgNOx/L

  /*calculate effluent nitrate (Nne)*/
  //maximum effluent nitrate coming from nitrification
  let Nne_max = effluent.components.S_NOx;                           //mgN/L
  let Nne = null;                                                    //mgN/L
  if(a < a_opt) Nne = Nc/(a+RAS+1);                                  //mgN/L
  else          Nne = Nc - (Dp1-Nni) + (a*DO + RAS*DO_RAS)/i_NO3_N2; //mgN/L

  //effluent nitrate cannot be higher than the created from nitrification
  Nne = Math.min(Nne_max, Nne);
  //console.log({Nne_max, Nne});

  //modify state variables (effluent and wastage)
  effluent.components.S_NOx = Nne;
  wastage .components.S_NOx = Nne;

  //update fractionations
  eff_frac = effluent.totals; //object | nit effluent fractionation
  was_frac = wastage.totals;  //object | nit wastage fractionation

  //effluent total nitrogen (TKN+NOx)
  let FN2g = Math.max(0, Q*(Nni + Nc - Nne)); //kgN/d | N2 gas produced
  let TNe  = Nte + Nne;                       //mgN/L | total nitrogen (TN) effluent (TKN+NOx)

  //oxygen recovered by denitrification
  let FOd = Math.max(0, i_NO3_N2*Q*(Nc-Nne)); //kgO/d
  let FOc = as_ppvv.FOc.value;                //kgO/d
  let FOn = nit_ppvv.FOn.value;               //kgO/d
  let FOt = FOc + FOn - FOd;                  //kgO/d
  let OUR = FOt*1000/(Vp*(1-fxt)*24);         //mgO/L·h

  //debugging
  //console.log({Vp,fxt,FOc,FOn,FOd});
  //console.log({i_NO3_N2,Nc,Nne});
  //console.log({Q});

  //effluent alkalinity
  let Nobi  = inf_frac.TKN.bON;  //mg/L | biodegradable TKN influent "(Nobsi+Nobpi)"
  let Ns    = as_ppvv.Ns.value;  //mg/L | N required for sludge production
  let Noupi = inf_frac.TKN.upON; //mg/L | N unbiodegradable particulated (Noupi)

  //page 25: justification of 7.14 and 3.57 stoichiometric constants
  const i_7_14 = 100/14;
  const i_3_57 = 50/14;
  let effluent_alk = influent_alk + i_3_57*Nobi - i_3_57*(Ns-Noupi) - i_7_14*Nc + i_3_57*(Nc-Nne); //mg/L as CaCO3

  //check effluent alkalinity value, must be above 50 mgCaCO3/L
  if(effluent_alk < 50){
    console.warn(`WARNING: effluent_alk (${effluent_alk}) < 50 mgCaCO3/L`);
    //TBD should this be an error instead of warning?
  }

  //TOD balance (TOD = COD + i_COD_NO3*TKN)
  let Qe   = effluent.Q;                                             //ML/d | effluent flowrate
  let TODi = Q *(inf_frac.COD.total + i_COD_NO3*inf_frac.TKN.total); //kgO/d
  let TODe = Qe*(eff_frac.COD.total + i_COD_NO3*eff_frac.TKN.total); //kgO/d

  //calculate TOD wastage (TODw)
  let Qw    = wastage.Q;              //ML/d  | wastage flowrate
  let f_was = as_ppvv.f_was.value;    //ø     | (1+RAS)/RAS (or 1 if we waste from reactor)

  //biomass: OHO and PAO
  let MX_BH    = as_ppvv.MX_BH.value;                           //kg/m3 | OHO active biomass
  let MX_EH    = as_ppvv.MX_EH.value;                           //kg/m3 | OHO endogenous residue
  let MX_PAO   = as_ppvv.MX_PAO   ? as_ppvv.MX_PAO.value   : 0; //kg/m3 | PAO active biomass
  let MX_E_PAO = as_ppvv.MX_E_PAO ? as_ppvv.MX_E_PAO.value : 0; //kg/m3 | PAO endogenous residue
  let MX_I     = as_ppvv.MX_I.value;                            //kg/m3 | UPO

  //soluble TOD and particulated TOD
  let sTODw = Qw*(was_frac.COD.sCOD + i_COD_NO3*(was_frac.TKN.sON + Nae)); //kg/d | soluble TODw
  let pTODw = Qw*(
    f_was*(
      (fCV_OHO + i_COD_NO3*f_N_OHO)*(MX_BH +MX_EH   )/Vp +
      (fCV_PAO + i_COD_NO3*f_N_PAO)*(MX_PAO+MX_E_PAO)/Vp +
      (fCV_UPO + i_COD_NO3*f_N_UPO)*(MX_I           )/Vp
    )*1000);                                                //kg/d | particulated TODw
  let TODw   = sTODw + pTODw;                               //kg/d | total TOD in wastage
  let TODout = TODw + TODe + FOt + FOd;                     //kg/d | total TOD out
  let TOD_balance = (TODi==TODout) ? 100 : 100*TODout/TODi; //percentage
  if(isNaN(TOD_balance) || (TOD_balance < 99.9 || TOD_balance > 100.1) ) throw new Error(`TOD_balance is ${TOD_balance}%`);

  //2.10 - N balance
  let FNti      = this.fluxes.totals.TKN.total     + Q *Nni; //kgN/d | total TN influent
  let FNte      = effluent.fluxes.totals.TKN.total + Qe*Nne; //kgN/d | total TN effluent
  let FNw       = wastage.fluxes.totals.TKN.total  + Qw*Nne; //kgN/d | total TN wastage
  let FNout     = FNte + FNw + FN2g;                         //kgN/d | total TN out
  let N_balance = (FNout==FNti) ? 100 : 100*FNout/FNti;      //percentage
  if(isNaN(N_balance)   || (N_balance   < 99.9 || N_balance   > 100.1) ) throw new Error(`N_balance is ${N_balance}%`);
  //denitrification end-------------------------------------------------------------

  //calculate fx1min: minimum primary anoxic sludge mass fraction required to
  //utilitze all the readily biodegradable organics (BSO)
  let bHT    = as_ppvv.bHT.value; //1/d
  let fx1min = fSb_s*(1-YH)*(1+bHT*Rs)/(i_NO3_N2*K1T*YHvss*Rs);

  //check if fxt is lower than fx1min
  if(fxt<fx1min) throw new Error(`fxt (${fxt}) < fx1min (${fx1min})`);

  //calculate Rs balanced from "BalancedMLEEquations.pdf", page 3,
  //between equation 11 and 12
  let Rs_bal = (function(){
    const fH = constants.fH; //ø | 0.20 (endogenous residue fraction)
    //inputs
    let a_prac = IR;
    let Oa   = DO;                    //mgO/L
    let Os   = DO_RAS;                //mgO/L
    let s    = RAS;                   //ø
    let µA   = nit_ppvv.µAm_pH.value; //1/d
    let fSup = as_ppvv.fSup.value;    //ø | gUPO/gCOD
    let bAT  = nit_ppvv.bAT.value;    //1/d
    //intermediate calculations necessary for computing Rs_bal
    let A    = Sbi;                         //mgCOD/L | VFA + FBSO + BPO
    let B    = fSb_s*(1-YH)/i_NO3_N2;       //mg/L
    let C    = Nti - Nte;                   //mgN/L
    let D    = (a_prac*Oa + s*Os)/i_NO3_N2; //unit missing
    let E    = (a_prac+s)/(a_prac+s+1);     //unit missing
    //Rs_bal is a big equation splitted in "Rs_top" and "Rs_bot" (numerator and denominator)
    let Rs_top = C*E+D-A*B+A*SF*K2T*YHvss/µA-E*(f_N_OHO*A*YHvss+f_N_UPO*Sti*fSup/fCV_UPO);                                  //numerator
    let Rs_bot = A*(B*bHT+K2T*YHvss)-A*SF*bAT*K2T*YHvss/µA-bHT*(C*E+D)+E*bHT*(f_N_OHO*A*YHvss*fH+f_N_UPO*Sti*fSup/fCV_UPO); //denominator
    let Rs_bal = Rs_top/Rs_bot;
    return Math.max(0, Rs_bal); //Rs_bal can't be negative
  })();

  //denitrification results
  let process_variables = {
    K1T          :{value:K1T          ,unit:"gN/gVSS"    ,descr:"K denitrification rate 1"},
    K2T          :{value:K2T          ,unit:"gN/gVSS"    ,descr:"K denitrification rate 2"},
    //K3T          :{value:K3T          ,unit:"gN/gVSS"    ,descr:"K denitrification rate 3"},
    //K4T          :{value:K4T          ,unit:"gN/gVSS"    ,descr:"K denitrification rate 4"},
    fSb_s        :{value:fSb_s        ,unit:"gBSO/gBO"   ,descr:"BSO/(BSO+BPO) ratio"},
    Dp1          :{value:Dp1          ,unit:"mgN/L"      ,descr:"Denitrification potential"},
    a            :{value:a            ,unit:"ø"          ,descr:"IR (internal recirculation ratio)"},
    a_opt        :{value:a_opt        ,unit:"ø"          ,descr:"optimal IR"},
    fx1min       :{value:fx1min,       unit:"ø",          descr:"minimum primary anoxic sludge mass fraction required to utilize all readily biodegradable organics (VFA and FBSO)"},
    Rs_bal       :{value:Rs_bal       ,unit:"d"          ,descr:"SRT balanced (shortest sludge age for input wastewater characteristics that sets the size of the anoxic reactor so that it can exact denitrify the nitrate load at the maximum practical recycle ratio (IR) - Henze et al 2008, IWA Biological Wastewater Treatment, Ch 5.)"},
    Nne          :{value:Nne          ,unit:"mgN/L"      ,descr:"Effluent nitrate"},
    Nne_opt      :{value:Nne_opt      ,unit:"mgN/L"      ,descr:"Lowest effluent nitrate (using a_opt)"},
    TNe          :{value:TNe          ,unit:"mgN/L"      ,descr:"Effluent total nitrogen (TKN+NOx)"},
    FOd          :{value:FOd          ,unit:"kgO/d"      ,descr:"Oxygen recovered by denitrification"},
    FOt          :{value:FOt          ,unit:"kgO/d"      ,descr:"Total oxygen demand (FOc + FOn - FOd)"},
    OUR          :{value:OUR          ,unit:"mgO/L·h"    ,descr:"Oxygen Uptake Rate"},
    effluent_alk :{value:effluent_alk ,unit:"mgCaCO3/L"  ,descr:"Effluent alkalinity"},
    FN2g         :{value:FN2g         ,unit:"kgN/d"      ,descr:"N2 gas production (mass flux)"},
    //TODi         :{value:TODi         ,unit:"kgO/d"      ,descr:"Total oxygen demand (influent)"},
    //TODe         :{value:TODe         ,unit:"kgO/d"      ,descr:"Total oxygen demand (effluent)"},
    //TODw         :{value:TODw         ,unit:"kgO/d"      ,descr:"Total oxygen demand (wastage)"},
    //TODout       :{value:TODout       ,unit:"kgO/d"      ,descr:"Total oxygen demand (effluent + wastage + FOt + FOd)"},
    TOD_balance  :{value:TOD_balance  ,unit:"%"          ,descr:"Total oxygen demand balance (out/in)"},
    N_balance    :{value:N_balance    ,unit:"%"          ,descr:"Nitrogen balance (out/in)"},
  };

  //hide description (for debugging)
  //Object.values(process_variables).forEach(obj=>delete obj.descr);
  return {
    process_variables,               //denitrification process variables
    nit_process_variables: nit_ppvv, //nitrification process variables
    as_process_variables:  as_ppvv,  //activated sludge process variables
    effluent,                        //State_Variables object
    wastage,                         //State_Variables object
  };
};

/*test*/
(function(){
  return
  //syntax---------------------( Q,  VFA, FBSO, BPO, UPO, USO, iSS,  NH4,   PO4, NOx, O2, OHO, PAO)
  let inf = new State_Variables(58,   50,  186, 706, 150,  57, 100, 59.6, 14.15,   0,  0,   0,   0);
  let parameters = {
    T            : 16,        //ºC
    Vp           : 8473.3,    //m3
    Rs           : 15,        //days
    DO           : 2.0,       //mgO2/L
    RAS          : 1.0,       //ø
    waste_from   : 'sst',     //string
    ideal_sst    : 1.0,       //number between 0 and infinite
    Me           : "Fe",
    mass_MeCl3   : 3000,      //kgFeCl3/d
    a_1          : 1,
    a_2          : 1,
    SF           : 1.25,      //ø
    fxt          : 0.39,      //ø
    pH           : 7.2,       //pH units
    IR           : 5.0,       //ø
    DO_RAS       : 1.0,       //ø
    influent_alk : 250,       //mgCaCO3/L
  };
  let as  = inf.activated_sludge(parameters);
  let effluent = as.effluent;
  let nit = inf.nitrification(parameters, as);
  let dn  = inf.denitrification(parameters, nit);

  //show process variables
  /*
    console.log("=== Influent summary");           console.log(influent.summary);
    console.log("=== AS+NIT+DN effluent summary"); console.log(dn.effluent.summary);
    console.log("=== AS+NIT+DN wastage summary");  console.log(dn.wastage.summary);
    console.log("=== AS process");                 console.log(dn.as_process_variables);
    console.log("=== NIT process");                console.log(dn.nit_process_variables);
  */
  console.log("=== DN process variables");
  console.log(dn.process_variables);
})();
