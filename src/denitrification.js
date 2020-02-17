/*
  AS + Nitrification + Denitrification + SST
  implementation from G. Ekama notes

  Qi → [AS + N + DN + SST] → Qe
         ↓
         Qw
*/

//import files
try{
  State_Variables=require("./state-variables.js");
  constants      =require("./constants.js");
  require("./nitrification.js");
}catch(e){}

State_Variables.prototype.denitrification=function(
    T,Vp,Rs,RAS,waste_from,mass_FeCl3,
    SF,fxt,DO,pH,
    IR,DO_RAS,influent_alk
  ){
  /*inputs and default values*/
    //activated sludge inputs
    T   = isNaN(T  ) ? 16     : T  ; //ºC   | Temperature
    Vp  = isNaN(Vp ) ? 8473.3 : Vp ; //m3   | Volume
    Rs  = isNaN(Rs ) ? 15     : Rs ; //days | Solids retention time
    RAS = isNaN(RAS) ? 1.0    : RAS; //ø    | SST underflow recycle ratio
    waste_from = waste_from || 'reactor'; //"reactor" or "sst"

    //chemical P removal inputs
    mass_FeCl3 = isNaN(mass_FeCl3) ? 50 : mass_FeCl3; //kg/d | mass of FeCl3 added for chemical P removal

    //nitrification inputs
    SF  = isNaN(SF)  ? 1.25 : SF ; //safety factor | Design choice. Moves the sludge age.
    fxt = isNaN(fxt) ? 0.39 : fxt; //ratio         | current unaerated sludge mass fraction
    DO  = isNaN(DO)  ? 2.0  : DO ; //mg/L          | DO in the aerobic reactor
    pH  = isNaN(pH)  ? 7.2  : pH ; //pH units

    //denitrification inputs (this module)
    IR           = isNaN(IR)           ? 5.4 : IR;           //ø             | internal recirculation ratio
    DO_RAS       = isNaN(DO_RAS)       ? 1.0 : DO_RAS;       //mgO/L         | DO in the underflow recycle
    influent_alk = isNaN(influent_alk) ? 250 : influent_alk; //mg/L as CaCO3 | influent alkalinity

  //input checks
    if(IR     <= 0) throw new Error(`Value of Internal recirculation ratio (IR=${IR}) not allowed`);
    if(DO_RAS <  0) throw new Error(`Value of Dissolved oxygen in the recycle stream (DO_RAS=${DO_RAS}) not allowed`);

  //get mass ratios
    const fH = constants.fH;                   //ø | 0.20 (endogenous residue fraction)
    const fCV_OHO = this.mass_ratios.f_CV_OHO; //gCOD/gVSS
    const fCV_UPO = this.mass_ratios.f_CV_UPO; //gCOD/gVSS
    const fCV_BPO = this.mass_ratios.f_CV_BPO; //gCOD/gVSS
    const f_N_OHO = this.mass_ratios.f_N_OHO;  //gN/gVSS
    const f_N_UPO = this.mass_ratios.f_N_UPO;  //gN/gVSS
    const f_N_BPO = this.mass_ratios.f_N_BPO;  //gN/gVSS

  //execute as+nitrification first
  let nit=this.nitrification(T,Vp,Rs,RAS,waste_from,mass_FeCl3,SF,fxt,DO,pH); //object

  //get fractionations
    let inf_frac = this.totals;         //object | influent fractionation
    let eff_frac = nit.effluent.totals; //object | nit effluent fractionation
    let was_frac = nit.wastage.totals;  //object | nit wastage fractionation

  //get necessary variables
    let Q    = this.Q;                         //ML/d  | influent flowrate
    let S_b  = nit.effluent.components.S_FBSO; //mg/L  | bCOD not degraded "Sbse"
    let Sbi  = inf_frac.COD.bCOD;              //mg/L  | bCOD  (VFA+FBSO+BPO)
    let Sbsi = inf_frac.COD.bsCOD;             //mg/L  | bsCOD (VFA+FBSO)
    let Sti  = inf_frac.COD.total;             //mg/L  | total COD influent
    let Nae  = nit.effluent.components.S_FSA;  //mgN/L | effluent ammonia
    let Nc   = nit.process_variables.Nc.value; //mgN/L | nitrate generated in nitrification (does not include influent nitrate)
    let Nni  = this.components.S_NOx;          //mgN/L | influent nitrate (not including nitrification capacity)
    let Nti  = inf_frac.TKN.total;             //mgN/L | total TKN influent
    let Nte  = eff_frac.TKN.total;             //mgN/L | total TKN effluent

  //denitrification kinetics (page 19)
    //3.2 - denitrification kinetic constants
    const K1_20 = constants.K1_20;                         //0.720 gN/gVSS·d | at 20ºC page 482 and 113
    const K2_20 = constants.K2_20;                         //0.101 gN/gVSS·d | at 20ºC page 482 and 113
    //const K3_20 = constants.K3_20;                         //0.072 gN/gVSS·d | at 20ºC page 482 and 113
    //const K4_20 = constants.K4_20;                         //0.048 gN/gVSS·d | at 20ºC page 482 and 113
    const K1T   = K1_20*Math.pow(constants.theta_K1,T-20); //gN/gVSS·d       | corrected by temperature (theta = 1.200)
    const K2T   = K2_20*Math.pow(constants.theta_K2,T-20); //gN/gVSS·d       | corrected by temperature (theta = 1.080)
    //const K3T   = K3_20*Math.pow(constants.theta_K3,T-20); //gN/gVSS·d       | corrected by temperature (theta = 1.029)
    //const K4T   = K4_20*Math.pow(constants.theta_K4,T-20); //gN/gVSS·d       | corrected by temperature (theta = 1.029)

  //3.2
  let fSb_s = Sbsi/Sbi||0; //ratio BSO/(BSO+BPO)

  //stoichiometric constants
    const i_NO3_N2  = 40/14; //~2.86 gCOD/gN | stoichiometric factor for NO3 reduction to N2
    const i_COD_NO3 = 64/14; //~4.57 gCOD/gN | conversion factor for NO3 in COD
    //console.log({i_NO3_N2, i_COD_NO3});//debugging

  //denitrification potential
    const YH    = constants.YH;                         //0.666 gCOD/gCOD
    const YHvss = YH/fCV_OHO;                           //0.45  gVSS/gCOD
    let f_XBH   = nit.as_process_variables.f_XBH.value; //gVSS·d/gCOD | YHvss*Rs/(1+bHT*Rs)
    let Dp1RBSO = Sbsi*(1-YH)/i_NO3_N2;                 //mgN/L | influent
    let Dp1BPO  = K2T*fxt*(Sbi-S_b)*f_XBH;              //mgN/L | influent
    let Dp1     = Dp1RBSO+Dp1BPO;                       //mgN/L | influent

  //optimum internal recirculation (a_opt)
  let a = IR; //symbol change from "IR" to "a"

  //debugging
  //console.log({Nc,Nni});
  //console.log({Dp1});

  let a_opt = (function(){
    let A = DO/i_NO3_N2;
    let B = Nc-(Dp1-Nni)+((1+RAS)*DO + RAS*DO_RAS)/i_NO3_N2; //TBD equation to be checked when we have influent NOx>0
    let C = (1+RAS)*((Dp1-Nni)-RAS*DO_RAS/i_NO3_N2)-RAS*Nc;
    //console.log({A,B,C}); //debugging
    return Math.max(0, (-B+Math.sqrt(B*B+4*A*C))/(2*A));
  })();

  //minimum effluent NOx concentration
  let Nne_opt = Nc/(a_opt+RAS+1); //mg/L

  /*calculate effluent nitrate (Nne)*/
  //maximum effluent nitrate coming from nitrification
  let Nne_max = nit.effluent.components.S_NOx;
  let Nne = null;                                                    //mgN/L
  if(a < a_opt) Nne = Nc/(a+RAS+1);                                  //mgN/L
  else          Nne = Nc - (Dp1-Nni) + (a*DO + RAS*DO_RAS)/i_NO3_N2; //mgN/L

  //effluent nitrate cannot be higher than the created from nitrification
  Nne = Math.min(Nne_max, Nne);
  //console.log({Nne_max, Nne});

  //effluent total nitrogen (TKN+NOx)
  let FN2g = Math.max(0, Q*(Nni + Nc - Nne)); //kgN/d | N2 gas produced
  let TNe  = Nte + Nne;                       //mgN/L | total nitrogen (TN) effluent (TKN+NOx)

  //oxygen recovered by denitrification
  let FOd = Math.max(0, i_NO3_N2*Q*(Nc-Nne));    //kgO/d
  let FOc = nit.as_process_variables.FOc.value;  //kgO/d
  let FOn = nit.process_variables.FOn.value;     //kgO/d
  let FOt = FOc + FOn - FOd;                     //kgO/d
  let OUR = FOt*1000/(Vp*(1-fxt)*24);            //mgO/L·h

  //debugging
  //console.log({Vp,fxt,FOc,FOn,FOd});
  //console.log({i_NO3_N2,Nc,Nne});
  //console.log({Q});

  //effluent alkalinity
  let Nobi  = inf_frac.TKN.bON;                  //mg/L | biodegradable TKN influent "(Nobsi+Nobpi)"
  let Ns    = nit.as_process_variables.Ns.value; //mg/L | N required for sludge production
  let Noupi = inf_frac.TKN.upON;                 //mg/L | N unbiodegradable particulated (Noupi)

  //page 25: justification of 7.14 and 3.57 stoichiometric constants
  const i_7_14 = 100/14;
  const i_3_57 = 50/14;
  let effluent_alk = influent_alk + i_3_57*Nobi - i_3_57*(Ns-Noupi) - i_7_14*Nc + i_3_57*(Nc-Nne); //mg/L as CaCO3

  //check effluent alkalinity value, must be above 50 mgCaCO3/L
  if(effluent_alk < 50){
    console.warn(`Warning: effluent_alk (${effluent_alk}) < 50 mgCaCO3/L`);
    //TBD should this be an error instead of warning?
  }

  //TOD balance (TOD = COD + i_COD_NO3*TKN)
  let Qe   = nit.effluent.Q;                                         //ML/d | effluent flowrate
  let TODi = Q *(inf_frac.COD.total + i_COD_NO3*inf_frac.TKN.total); //kgO/d
  let TODe = Qe*(eff_frac.COD.total + i_COD_NO3*eff_frac.TKN.total); //kgO/d

  //calculate TOD wastage (TODw)
  let Qw    = nit.wastage.Q;                           //ML/d  | wastage flowrate
  let f     = nit.as_process_variables.f.value;        //ø     | (1+RAS)/RAS (or 1 if we waste from reactor)
  let X_BH  = nit.as_process_variables.MX_BH.value/Vp; //kg/m3 | OHO
  let X_EH  = nit.as_process_variables.MX_EH.value/Vp; //kg/m3 | endogenous residue
  let X_I   = nit.as_process_variables.MX_I .value/Vp; //kg/m3 | UPO
  let X_IO  = nit.as_process_variables.MX_IO.value/Vp; //kg/m3 | iSS
  let sTODw = Qw*(was_frac.COD.sCOD + i_COD_NO3*(was_frac.TKN.sON + Nae)); //kg/d | soluble TODw
  let pTODw = Qw*(
    f*(
      (fCV_OHO + i_COD_NO3*f_N_OHO)*(X_BH+X_EH) +
      (fCV_UPO + i_COD_NO3*f_N_UPO)*(X_I)
    )*1000);                                                //kg/d | particulated TODw
  let TODw   = sTODw + pTODw;                               //kg/d | total TOD in wastage
  let TODout = TODw + TODe + FOt + FOd;                     //kg/d | total TOD out
  let TOD_balance = (TODi==TODout) ? 100 : 100*TODout/TODi; //percentage

  //2.10 - N balance
  let FNti      = this.fluxes.totals.TKN.total         + Q *Nni; //kgN/d | total TN influent
  let FNte      = nit.effluent.fluxes.totals.TKN.total + Qe*Nne; //kgN/d | total TN effluent
  let FNw       = nit.wastage.fluxes.totals.TKN.total  + Qw*Nne; //kgN/d | total TN wastage
  let FNout     = FNte + FNw + FN2g;                             //kgN/d | total TN out
  let N_balance = (FNout==FNti) ? 100 : 100*FNout/FNti;          //percentage
  //denitrification end-------------------------------------------------------------

  //check TOD and N balance
  if(isNaN(TOD_balance) || (TOD_balance < 99.9 || TOD_balance > 100.1) ) throw new Error(`TOD_balance is ${TOD_balance}%`);
  if(isNaN(N_balance)   || (N_balance   < 99.9 || N_balance   > 100.1) ) throw new Error(`N_balance is ${N_balance}%`);

  //create output streams (effluent and wastage)
  let Suse    = inf_frac.COD.usCOD;           //mg/L | USO influent == effluent
  let Pse     = nit.effluent.components.S_OP; //mg/L | PO4 nit effluent
  let UPO_was = nit.wastage.components.X_UPO; //mg/L | UPO concentration
  let iSS_was = nit.wastage.components.X_iSS; //mg/L | iSS concentration
  let OHO_was = nit.wastage.components.X_OHO; //mg/L | OHO concentration

  //create output streams---------->(Q   VFA FBSO BPO UPO      USO   iSS      FSA  PO4  NOx  OHO    )
  let effluent = new State_Variables(Qe, 0,  S_b, 0,  0,       Suse, 0,       Nae, Pse, Nne, 0      );
  let wastage  = new State_Variables(Qw, 0,  S_b, 0,  UPO_was, Suse, iSS_was, Nae, Pse, Nne, OHO_was);

  //copy influent mass ratios
  effluent.mass_ratios = this.mass_ratios;
  wastage.mass_ratios  = this.mass_ratios;

  let bHT = nit.as_process_variables.bHT.value; //1/d

  //calculate fx1min: minimum primary anoxic sludge mass fraction required to
  //utilitze all the readily biodegradable organics (BSO)
  let fx1min = fSb_s*(1-YH)*(1+bHT*Rs)/(i_NO3_N2*K1T*YHvss*Rs);

  //check if fxt is lower than fx1min
  if(fxt<fx1min) throw new Error(`fxt (${fxt}) < fx1min (${fx1min})`);

  //calculate Rs balanced from "BalancedMLEEquations.pdf", page 3,
  //between equation 11 and 12
  let Rs_bal = (function(){
    //inputs
    let a_prac = IR;
    let Oa   = DO;                                  //mgO/L
    let Os   = DO_RAS;                              //mgO/L
    let s    = RAS;                                 //ø
    let µA   = nit.process_variables.µAm_pH.value;  //1/d
    let fSup = nit.as_process_variables.fSup.value; //ø | gUPO/gCOD
    let bAT  = nit.process_variables.bAT.value;     //1/d
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
    process_variables,                               //denitrification process variables
    nit_process_variables: nit.process_variables,    //nitrification process variables
    as_process_variables:  nit.as_process_variables, //activated sludge process variables
    effluent,                                        //State_Variables object
    wastage,                                         //State_Variables object
  };
};

/*test*/
(function(){
  return
  //syntax--------------------------(Q   VFA FBSO BPO  UPO  USO iSS   FSA   OP    NOx OHO PAO)
  let influent = new State_Variables(58, 50, 186, 706, 150,  57, 100, 59.6, 14.15, 0, 0,  0);

  //as+n+dn syntax---------------(T   Vp      Rs  RAS  waste_from mass_FeCl3 SF    fxt   DO   pH   IR   DO_RAS influent_alk)
  let dn=influent.denitrification(16, 8473.3, 15, 1.0, 'reactor', 3000,      1.25, 0.39, 2.0, 7.2, 5.0, 1.0,   250         );

  //show process variables
  /*
    console.log("=== Influent summary");           console.log(influent.summary);
    console.log("=== AS+NIT+DN effluent summary"); console.log(dn.effluent.summary);
    console.log("=== AS+NIT+DN wastage summary");  console.log(dn.wastage.summary);
    console.log("=== AS process");                 console.log(dn.as_process_variables);
    console.log("=== NIT process");                console.log(dn.nit_process_variables);
  */
  console.log("=== DN process");                 console.log(dn.process_variables);
})();
