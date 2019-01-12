/*
  AS + Nitrification + Denitrification + SST implementation from G. Ekama notes

  Qi → [Activated Sludge + Nitrification + Denitrification + SST] → Qe
                  ↓ 
                  Qw
*/

//import files
try{
  State_Variables=require("./state-variables.js");
  constants      =require("./constants.js");
  require("./nitrification.js");
}catch(e){}

State_Variables.prototype.denitrification=function(T,Vp,Rs,RAS,waste_from,mass_FeCl3, SF,fxt,DO,pH, IR,DO_RAS,influent_alk){
  /*inputs and default values*/
  //as inputs
  T   = isNaN(T  ) ? 16     : T  ; //ºC   | Temperature
  Vp  = isNaN(Vp ) ? 8473.3 : Vp ; //m3   | Volume
  Rs  = isNaN(Rs ) ? 15     : Rs ; //days | Solids retention time
  RAS = isNaN(RAS) ? 1.0    : RAS; //ø    | SST underflow recycle ratio
  waste_from = waste_from || 'reactor'; //"reactor" or "sst"
  if(['reactor','sst'].indexOf(waste_from)==-1) throw `The input "waste_from" must be equal to "reactor" or "sst" (not "${waste_from}")`;
  mass_FeCl3 = isNaN(mass_FeCl3) ? 50 : mass_FeCl3; //kg/d | mass of FeCl3 added for chemical P removal

  //nitrification inputs
  SF  = isNaN(SF ) ? 1.25 : SF ; //safety factor | Design choice. Moves the sludge age.
  fxt = isNaN(fxt) ? 0.39 : fxt; //ratio         | current unaerated sludge mass fraction
  DO  = isNaN(DO ) ? 2.0  : DO ; //mg/L          | DO in the aerobic reactor
  pH  = isNaN(pH ) ? 7.2  : pH ; //pH units

  //denitrification inputs
  IR           = isNaN(IR)           ? 5.4 : IR;           //ø             | internal recirculation ratio
  DO_RAS       = isNaN(DO_RAS)       ? 1.0 : DO_RAS;       //mgO/L         | DO in the underflow recycle
  influent_alk = isNaN(influent_alk) ? 250 : influent_alk; //mg/L as CaCO3 | influent alkalinity

  //execute as+nit
  let nit=this.nitrification(T,Vp,Rs,RAS,waste_from,mass_FeCl3,SF,fxt,DO,pH); //object

  //influent nitrate (not including nitrification capacity)
  let Nni = this.components.S_NOx;

  //get fractionations
  let inf_frac = this.totals;         //object | influent fractionation
  let eff_frac = nit.effluent.totals; //object | nit effluent fractionation
  let was_frac = nit.wastage.totals;  //object | nit wastage fractionation

  //flowrate
  let Q = this.Q; //ML/d

  //denitrification starts at page 19
  //3.2 - denitrification kinetics
  //const K1_20 = constants.K1_20;                         //0.720 gN/gVSS·d | at 20ºC page 482 and 113
  const K2_20 = constants.K2_20;                         //0.101 gN/gVSS·d | at 20ºC page 482 and 113
  //const K3_20 = constants.K3_20;                         //0.072 gN/gVSS·d | at 20ºC page 482 and 113
  //const K4_20 = constants.K4_20;                         //0.048 gN/gVSS·d | at 20ºC page 482 and 113
  //const K1T   = K1_20*Math.pow(constants.theta_K1,T-20); //gN/gVSS·d       | corrected by temperature (theta = 1.200)
  const K2T   = K2_20*Math.pow(constants.theta_K2,T-20); //gN/gVSS·d       | corrected by temperature (theta = 1.080)
  //const K3T   = K3_20*Math.pow(constants.theta_K3,T-20); //gN/gVSS·d       | corrected by temperature (theta = 1.029)
  //const K4T   = K4_20*Math.pow(constants.theta_K4,T-20); //gN/gVSS·d       | corrected by temperature (theta = 1.029)

  //3.2
  let Sbsi  = inf_frac.COD.bsCOD;             //mg/L | biodegradable soluble COD
  let Sbi   = inf_frac.COD.bCOD;              //mg/L | biodegradable COD
  let fSb_s = Sbsi/Sbi;                       //ratio BSO/(BSO+BPO)
  let S_b   = nit.effluent.components.S_FBSO; //mg/L of bCOD not degraded

  //Denitrification potential
  const fCV   = this.mass_ratios.f_CV_OHO;            //1.481 gUPO/gVSS
  const YH    = constants.YH;                         //0.450 gVSS/gCOD
  let f_XBH   = nit.as_process_variables.f_XBH.value; //gVSS·d/gCOD | YH*Rs/(1+bHT*Rs)
  let Dp1RBSO = Sbsi*(1-fCV*YH)/2.86;                 //mgNO3-N/L   | influent
  let Dp1BPO  = K2T*fxt*(Sbi-S_b)*f_XBH;              //mgNO3-N/L   | influent
  let Dp1     = Dp1RBSO + Dp1BPO;                     //mgNO3-N/L   | influent

  //Nitrate generated in nitrification (does not include influent nitrate)
  let Nc = nit.process_variables.Nc.value; //mgN/L

  //optimum internal recirculation (a_opt)
  let a = IR; //symbol change from "IR" to "a"
  let a_opt = (function(){
    let A = DO/2.86;
    let B = Nc-(Dp1-Nni)+((1+RAS)*DO + RAS*DO_RAS)/2.86;
    let C = (1+RAS)*((Dp1-Nni)-RAS*DO_RAS/2.86)-RAS*Nc;
    return (-B+Math.sqrt(B*B+4*A*C))/(2*A);
  })();

  //minimum effluent NOx concentration
  let Nne_opt = Nc/(a_opt + RAS + 1); //mg/L

  //effluent nitrate (Nne)
  let Nne = 0;                                                   //mgN/L
  if(a < a_opt) Nne = Nc/(a+RAS+1);                              //mgN/L
  else          Nne = Nc - (Dp1-Nni) + (a*DO + RAS*DO_RAS)/2.86; //mgN/L

  //N2 gas produced
  let N2g  = Nni + Nc - Nne; //mgN/L
  let FN2g = Q*N2g;          //kgN/d

  //TN effluent (TKN+NOx)
  let TKNe = eff_frac.TKN.total; //mg/L
  let TNe  = TKNe + Nne;         //mg/L

  //oxygen recovered by denitrification
  let FOd = 2.86*Q*(Nc-Nne);                     //kgO/d
  let FOc = nit.as_process_variables.FOc.value;  //kgO/d
  let FOn = nit.process_variables.FOn.value; //kgO/d
  let FOt = FOc + FOn - FOd;                     //kgO/d
  let OUR = FOt*1000/(Vp*(1-fxt)*24);            //mgO/L·h

  //effluent alkalinity
  let bON  = inf_frac.TKN.bON;                  //mg/L | biodegradable TKN influent
  let Ns   = nit.as_process_variables.Ns.value; //mg/L | N required for sludge production
  let upON = inf_frac.TKN.upON;                 //mg/L | N unbiodegradable particulated
  let effluent_alk = influent_alk + 3.57*(bON-(Ns-upON)) - 7.14*Nc + 2.86*(Nc-Nne); //mg/L as CaCO3

  //TOD balance (TOD=COD+4.57*TKN)
  let Qe   = nit.effluent.Q;                                    //ML/d | effluent flowrate
  let TODi = Q *(inf_frac.COD.total + 4.57*inf_frac.TKN.total); //kgO/d
  let TODe = Qe*(eff_frac.COD.total + 4.57*eff_frac.TKN.total); //kgO/d

  //calculate TOD wastage (TODw)
  const fH = constants.fH;                   //ø | 0.20 (endogenous residue fraction)
  const fCV_OHO = this.mass_ratios.f_CV_OHO; //gCOD/gVSS
  const fCV_UPO = this.mass_ratios.f_CV_UPO; //gCOD/gVSS
  const fCV_BPO = this.mass_ratios.f_CV_BPO; //gCOD/gVSS
  const f_N_OHO = this.mass_ratios.f_N_OHO;  //gVSS/gN
  const f_N_UPO = this.mass_ratios.f_N_UPO;  //gVSS/gN
  const f_N_BPO = this.mass_ratios.f_N_BPO;  //gVSS/gN
  let Qw    = nit.wastage.Q;                                          //ML/d   | wastage flowrate
  let Nae   = nit.effluent.components.S_FSA;                          //mg/L   | effluent ammonia
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
  //denitrification end-------------------------------------------------------------

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

  //denitrification results
  let process_variables = {
    //K1T          :{value:K1T          ,unit:"gN/gVSS"    ,descr:"K denitrification rate 1"},
    K2T          :{value:K2T          ,unit:"gN/gVSS"    ,descr:"K denitrification rate 2"},
    //K3T          :{value:K3T          ,unit:"gN/gVSS"    ,descr:"K denitrification rate 3"},
    //K4T          :{value:K4T          ,unit:"gN/gVSS"    ,descr:"K denitrification rate 4"},
    fSb_s        :{value:fSb_s        ,unit:"gBSO/gBO"   ,descr:"BSO/(BSO+BPO) ratio"},
    Dp1          :{value:Dp1          ,unit:"mgN/L"      ,descr:"Denitrification potential"},
    a            :{value:a            ,unit:"ø"          ,descr:"IR (internal recirculation ratio)"},
    a_opt        :{value:a_opt        ,unit:"ø"          ,descr:"optimal IR"},
    Nne          :{value:Nne          ,unit:"mgN/L"      ,descr:"Effluent nitrate"},
    Nne_opt      :{value:Nne_opt      ,unit:"mgN/L"      ,descr:"Lowest effluent nitrate (using a_opt)"},
    TNe          :{value:TNe          ,unit:"mgN/L"      ,descr:"Effluent total nitrogen"},
    FOd          :{value:FOd          ,unit:"kgO/d"      ,descr:"Oxygen recovered by denitrification"},
    FOt          :{value:FOt          ,unit:"kgO/d"      ,descr:"Total oxygen demand (FOc + FOn - FOd)"},
    OUR          :{value:OUR          ,unit:"mgO/L·h"    ,descr:"Oxygen Uptake Rate"},
    effluent_alk :{value:effluent_alk ,unit:"mgCaCO3/L"  ,descr:"Effluent alkalinity"},
    //N2g          :{value:N2g          ,unit:"mgN/L"      ,descr:"N2 gas production (concentration)"},           
    FN2g         :{value:FN2g         ,unit:"kgN/d"      ,descr:"N2 gas production (mass flux)"},           
    //TODi         :{value:TODi         ,unit:"kgO/d"      ,descr:"Total oxygen demand (influent)"},
    //TODe         :{value:TODe         ,unit:"kgO/d"      ,descr:"Total oxygen demand (effluent)"},
    //TODw         :{value:TODw         ,unit:"kgO/d"      ,descr:"Total oxygen demand (wastage)"},
    //TODout       :{value:TODout       ,unit:"kgO/d"      ,descr:"Total oxygen demand (effluent + wastage + FOt + FOd)"},
    TOD_balance  :{value:TOD_balance  ,unit:"%"          ,descr:"Total oxygen demand balance (out/in)"},
    N_balance    :{value:N_balance    ,unit:"%"          ,descr:"Nitrogen balance (out/in)"},
  };

  //hide description (debug)
  //Object.values(process_variables).forEach(obj=>delete obj.descr);
  return {
    process_variables,
    nit_process_variables: nit.process_variables,
    as_process_variables:  nit.as_process_variables,
    cpr:                   nit.cpr,
    errors:                nit.errors,
    effluent,
    wastage,
  };
};

/*test*/
(function(){
  return
  //syntax--------------------------(Q       VFA FBSO BPO  UPO USO iSS FSA   OP    NOx OHO)
  let influent = new State_Variables(24.875, 50, 115, 255, 10, 45, 15, 39.1, 7.28, 10, 0  );

  //as+n+dn syntax---------------(T   Vp      Rs  RAS  waste_from mass_FeCl3 SF    fxt   DO   pH   IR   DO_RAS influent_alk)
  let dn=influent.denitrification(16, 8473.3, 15, 1.0, 'reactor', 3000,      1.25, 0.39, 2.0, 7.2, 5.0, 1.0,   250         );

  //show process variables
  console.log("=== Influent summary");           console.log(influent.summary);
  console.log("=== AS+NIT+DN effluent summary"); console.log(dn.effluent.summary);
  console.log("=== AS+NIT+DN wastage summary");  console.log(dn.wastage.summary);
  console.log("=== AS process");                 console.log(dn.as_process_variables);
  console.log("=== NIT process");                console.log(dn.nit_process_variables);
  console.log("=== DN process");                 console.log(dn.process_variables);
  console.log("=== DN chemical P removal");      console.log(dn.cpr);
})();
