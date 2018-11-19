/*
  AS + Nitrification + Denitrification + SST implementation from G. Ekama notes

  Qi → [Activated Sludge + Nitrification + Denitrification + SST] → Qe
                  ↓ 
                  Qw
*/

//import files
if(typeof document == "undefined"){
  State_Variables=require("./state-variables.js");
  require("./nitrification.js");
}

State_Variables.prototype.denitrification=function(T,Vp,Rs,RAS,waste_from, SF,fxt,DO,pH, IR,DO_RAS,influent_alk){
  /*inputs and default values*/
  //as inputs
  T   = isNaN(T  ) ? 16     : T  ; //ºC   | Temperature
  Vp  = isNaN(Vp ) ? 8473.3 : Vp ; //m3   | Volume
  Rs  = isNaN(Rs ) ? 15     : Rs ; //days | Solids retention time
  RAS = isNaN(RAS) ? 1.0    : RAS; //ø    | SST underflow recycle ratio
  waste_from = waste_from || 'reactor'; //"reactor" or "sst"
  if(['reactor','sst'].indexOf(waste_from)==-1) throw `The input "waste_from" must be equal to "reactor" or "sst" (not "${waste_from}")`;

  //nitrification inputs
  SF  = isNaN(SF ) ? 1.25 : SF ; //safety factor | Design choice. Moves the sludge age.
  fxt = isNaN(fxt) ? 0.39 : fxt; //ratio         | current unaerated sludge mass fraction
  DO  = isNaN(DO)  ? 2.0  : DO ; //mg/L          | DO in the aerobic reactor
  pH  = isNaN(pH ) ? 7.2  : pH ; //pH units

  //denitrification inputs
  IR           = isNaN(IR)           ? 5.4 : IR;           //ø             | internal recirculation ratio
  DO_RAS       = isNaN(DO_RAS)       ? 1.0 : DO_RAS;       //mgO/L         | DO in the underflow recycle
  influent_alk = isNaN(influent_alk) ? 250 : influent_alk; //mg/L as CaCO3 | influent alkalinity

  //flowrate
  let Q = this.Q; //ML/d

  //compute AS+Nit results
  let nit = this.nitrification(T,Vp,Rs,RAS,waste_from, SF,fxt,DO); //Object{process_variables, as_process_variables, effluent, wastage}

  //denitrification starts at page 19
  //3.2 - denitrification kinetics
  const K1_20 = 0.72;                       //mgNO3-N/mgOHOVSS·d | at 20ºC page 482
  const K2_20 = 0.10;                       //mgNO3-N/mgOHOVSS·d | at 20ºC page 482
  const K3_20 = 0.10;                       //mgNO3-N/mgOHOVSS·d | at 20ºC page 482
  const K4_20 = 0.00;                       //mgNO3-N/mgOHOVSS·d | at 20ºC page 482
  const K1T   = K1_20*Math.pow(1.200,T-20); //mgNO3-N/mgOHOVSS·d | corrected by temperature
  const K2T   = K2_20*Math.pow(1.080,T-20); //mgNO3-N/mgOHOVSS·d | corrected by temperature
  const K3T   = K3_20*Math.pow(1.029,T-20); //mgNO3-N/mgOHOVSS·d | corrected by temperature
  const K4T   = K4_20*Math.pow(1.029,T-20); //mgNO3-N/mgOHOVSS·d | corrected by temperature

  //3.2
  let frac  = this.totals;    //Object
  let Sbsi  = frac.COD.bsCOD; //mg/L  | biodegradable soluble COD
  let Sbi   = frac.COD.bCOD;  //mg/L  | biodegradable COD
  let fSb_s = Sbsi/Sbi;       //ratio BSO/(BPO+BSO)

  //Denitrification potential
  const fCV   = this.mass_ratios.f_CV_UPO;            //1.481 gUPO/gVSS
  const YH    = 0.45;                                 //gVSS/gCOD
  let f_XBH   = nit.as_process_variables.f_XBH.value; //1/d | YH*Rs/(1+bHT)
  let Dp1RBSO = fSb_s*Sbi*(1-fCV*YH)/2.86;            //mgNO3-N/L | influent
  let Dp1BPO  = K2T*fxt*Sbi*f_XBH;                    //mgNO3-N/L | influent
  let Dp1     = Dp1RBSO + Dp1BPO;                     //mgNO3-N/L | influent

  //Nitrate generated in nitrification
  let Nc = nit.process_variables.Nc_fxt.value; //mgN/L

  //optimum internal recirculation
  let a = IR; //symbol change from "IR" to "a"
  let a_opt = (function(){
    let A = DO/2.86;
    let B = Nc - Dp1 + ((1+RAS)*DO + RAS*DO_RAS)/2.86;
    let C = (1+RAS)*(Dp1 - RAS*DO_RAS/2.86) - RAS*Nc;
    return (-B+Math.sqrt(B*B+4*A*C))/(2*A);
  })();

  //minimum effluent NOx concentration
  let NOx_min_eff = Nc/(a_opt + RAS + 1); //mg/L

  //calculate the effluent nitrate (Nne)
  let Nne; //mg/L
  if(a < a_opt) Nne = Nc/(a+RAS+1);
  else          Nne = Nc-Dp1+(a*DO+RAS*DO_RAS)/2.86;

  //calculate TN in the effluent (TKN+NOx)
  let TKNe = nit.process_variables.Nte_fxt.value; //mg/L
  let TNe  = TKNe + Nne;                          //mg/L

  //oxygen recovered by denitrification
  let FOd = 2.86*Q*(Nc-Nne);                     //kgO/d
  let FOc = nit.as_process_variables.FOc.value;  //kgO/d
  let FOn = nit.process_variables.FOn_fxt.value; //kgO/d
  let FOt = FOc + FOn - FOd;                     //kgO/d
  let OUR = FOt*1000/(Vp*(1-fxt)*24);            //mgO/L·h

  //calculate effluent alkalinity
  let bON  = frac.TKN.bON;                      //mg/L | biodegradable TKN influent
  let Ns   = nit.as_process_variables.Ns.value; //mg/L | N required for sludge production
  let upON = frac.TKN.upON;                     //mg/L | N unbiodegradable particulated
  let effluent_alk = influent_alk + 3.57*(bON-(Ns-upON)) - 7.14*Nc + 2.86*(Nc-Nne); //mg/L as CaCO3

  //TOD balance
  let TODi = Q*(frac.COD.total                + 4.57*frac.TKN.total);                //kg/d
  let TODe = Q*(nit.effluent.totals.COD.total + 4.57*nit.effluent.totals.TKN.total); //kg/d

  //calculate TOD wastage (TODw)
  const fCV_OHO = this.mass_ratios.f_CV_OHO;
  const f_N_OHO = this.mass_ratios.f_N_OHO;
  const fCV_UPO = this.mass_ratios.f_CV_UPO;
  const f_N_UPO = this.mass_ratios.f_N_UPO;
  let Qw      = nit.wastage.Q;                                                               //ML/d  | wastage flowrate
  let Nae     = nit.process_variables.Nae_fxt.value;                                         //mg/L  | effluent ammonia
  let f       = nit.as_process_variables.f.value;                                            //ø     | (1+RAS)/RAS (or 1 if we waste from reactor)
  let X_BH    = nit.as_process_variables.MX_BH.value/Vp;                                     //kg/m3 | OHO
  let X_EH    = nit.as_process_variables.MX_EH.value/Vp;                                     //kg/m3 | endogenous residue
  let X_I     = nit.as_process_variables.MX_I .value/Vp;                                     //kg/m3 | UPO
  let X_IO    = nit.as_process_variables.MX_IO.value/Vp;                                     //kg/m3 | iSS
  let sTODw   = Qw*(nit.wastage.totals.COD.sCOD + 4.57*(nit.wastage.totals.TKN.sON + Nae));  //kg/d  | soluble      TODw
  let pTODw   = Qw*(f*((fCV_OHO+4.57*f_N_OHO)*(X_BH+X_EH)+(fCV_UPO+4.57*f_N_UPO)*X_I)*1000); //kg/d  | particulated TODw
  let TODw    = sTODw + pTODw;                                                               //kg/d  | total TOD in wastage
  let TODout  = TODw + TODe + FOt + FOd;                                                     //kg/d  | total TOD out
  let balance = 100*TODout/TODi;                                                             //percentage

  //calculate new state variables
  let Qe      = nit.effluent.Q;                              //ML/d | effluent flowrate
  let Suse    = frac.COD.usCOD;                              //mg/L as O | USO influent == effluent
  let Pse     = nit.effluent.components.S_OP;                //mg/L
  const fH    = 0.20;                                        //tabled value
  let BPO_was = f*fCV_OHO*(1-fH)*X_BH*1000;                  //mg/L | BPO concentration
  let UPO_was = f*(fCV_OHO*(fH*X_BH+X_EH)+fCV_UPO*X_I)*1000; //mg/L | UPO concentration
  let iSS_was = f*X_IO*1000;                                 //mg/L | iSS concentration

  //syntax ------------------------>(Q,  VFA, FBSO, BPO,     UPO,     USO,  iSS,     FSA, PO4, NOx)
  let effluent = new State_Variables(Qe, 0,   0,    0,       0,       Suse, 0,       Nae, Pse, Nne);
  let wastage  = new State_Variables(Qw, 0,   0,    BPO_was, UPO_was, Suse, iSS_was, Nae, Pse, Nne);

  //results
  let process_variables = {
    K2T,
    fSb_s,
    Dp1,
    a, a_opt,
    NOx_min_eff, Nne, TNe,
    FOd, FOt, OUR,
    effluent_alk,
    TODi, TODe, TODw, TODout, balance,
  };

  let nit_process_variables = nit.process_variables;
  return {
    process_variables,
    nit_process_variables,
  }
};

/*test*/
(function(){
  //return;

  //new influent syntax-------------(Q,      VFA, FBSO, BPO, UPO, USO, iSS, FSA,  OP,   NOx)
  let influent = new State_Variables(24.875, 50,  115,  255, 10,  45,  15,  39.1, 7.28, 0  );

  //as+n+dn syntax-----------------(T,  Vp,     Rs, RAS, waste_from, SF,   fxt,  DO,  pH,  IR,  DO_RAS, influent_alk)
  let dn = influent.denitrification(16, 8473.3, 15, 1.0, 'reactor',  1.25, 0.39, 2.0, 7.2, 5.4, 1.0,    250         );
  console.log(dn);
})();
