/*
  Bio P removal implementation
*/

function bio_p_removal(){
  /*INPUTS*/
  let N           = 2;      //new | number of anoxic zones | TODO
  let S_FBSO      = 124;    //input
  let RAS         = 0.75;   //input
  let S_NOx       = 0;      //input
  let S_NOx_RAS   = 0.5;    //input
  let DO_RAS      = 0;      //input
  let DO          = 0;      //input
  let k_vT        = 0.0505; //ok
  let f_AN        = 0.1;    //new | value <= fxm | TODO | anaerobic mass fraction
  let YHvss       = 0.45;   //ok
  let bHT         = 0.202;  //ok
  let Rs          = 20;     //input
  let Q           = 15;     //input
  let S_b         = 585;    //ok
  let S_VFA       = 22;     //input
  let b_PAO       = 0.04;   //new TODO
  let theta_b_PAO = 1.029   //new TODO
  let T           = 14      //input
  let Y_PAO       = 0.45    //YH/f_CV_PAO
  let f_PAO       = 0.25;   //fraction of endogenous residue of the PAOs
  let fH          = 0.2;    //
  let f_i         = 0.15;   //inert fraction of OHO and PAO (=OHO)
  let f_iOHO      = 0.15;   //inert fraction of OHO
  let f_iPAO      = 1.3;    //inert fraction of PAO
  let f_CV        = 1.481;  //mass ratio of OHOs and PAO
  let f_CV_OHO    = 1.4810;
  let f_CV_PAO    = 1.4810;
  let S_t         = 11250;  //mg/L | total COD
  let Vp          = 21370;  //input m3
  let FiSS        = 735;    //kg/d
  let F_extra_iSS = 0;      //chemical P removal
  let f_P_OHO     = 0.025;
  let f_P_PAO     = 0.38; 
  let f_P_X_E     = 0.03;  //gP/gVSS   | fraction of P in endogenous mass (OHO+PAO)
  let f_P_X_I     = 0.03;  //gP/gVSS   | fraction of P in inert mas (OHO+PAO)
  let f_VT_PAO    = 0.46;  //gPAOVSS/gTSS | se puede calcular (?) TBD
  let f_P_iSS     = 0.02;  //gP/giSS   | fraction of P in iSS
  let f_N_OHO     = 0.1;
  let f_N_PAO     = 0.1;
  let f_N_UPO     = 0.1;
  let fxm         = 0.5;   //ok (nitrification.js)
  let YH          = 0.666; //constants.js

  /*EQUATIONS*/
  let S_FBSO_conv = S_FBSO - 8.6*(RAS*S_NOx_RAS + S_NOx) - 3*(RAS*DO_RAS + DO); //mgCOD/L | fermentables available for conversion into VFA by OHOs

  //loop
  let S_FBSO_AN  = 0; //initial seed value                        //mgCOD/L | fermentable lost in the effluent of the last anaerobic reactor 
  let F_ss_PAO   = Q*(S_FBSO_conv - (1+RAS)*S_FBSO_AN) + Q*S_VFA; //kgCOD/d | VFA stored by PAOs
  let F_sb_OHO   = S_b*Q - F_ss_PAO;                              //kgCOD/d | remaining bCOD for OHOs
  let MX_BH      = YHvss/(1+bHT*Rs)*F_sb_OHO*Rs;                  //kgVSS   | active OHO biomass
  let MX_BH_next = MX_BH;
  let iterations = 0; //number of iterations needed to compute MX_BH

  //loop
  while(true){
    S_FBSO_AN = S_FBSO_conv/(1+RAS)/Math.pow(1+(k_vT*(f_AN*MX_BH/(N*Q*(1+RAS)))), N);
    F_ss_PAO = Q*(S_FBSO_conv - (1+RAS)*S_FBSO_AN) + Q*S_VFA;
    F_sb_OHO = S_b*Q - F_ss_PAO;
    MX_BH_next = YHvss/(1+bHT*Rs)*F_sb_OHO*Rs;
    if(Math.abs(MX_BH-MX_BH_next)<0.0001){
      break;
    }
    MX_BH = MX_BH_next;
    iterations++;
    if(iterations>1000){
      throw new Error('too many iterations for MX_BH calculation loop');
    }
  }

  let b_PAO_T  = b_PAO*Math.pow(theta_b_PAO, T-20);                       //1/d       | endogenous respiration rate corrected by temperature
  let f_XPAO   = Y_PAO/(1+b_PAO_T*Rs);                                    //gVSS/gCOD | PAO biomass production rate
  let MX_PAO   = f_XPAO*F_ss_PAO*Rs;                                      //kgVSS     | active PAO biomass
  let MX_E_PAO = f_PAO*b_PAO_T*MX_PAO*Rs;                                 //kgVSS     | endogenous residue PAOs
  let MX_EH    = fH * bHT * Rs * MX_BH;                                   //kgVSS     | endogenous residue OHOs
  let MX_I     = f_i * Rs * S_t / f_CV;                                   //kgVSS     | inert mass
  let X_OHO    = f_CV_OHO*(MX_BH+MX_EH)/Vp*1000;                          //mgCOD/L   | OHO conc in COD units
  let X_PAO    = f_CV_PAO*(MX_PAO+MX_E_PAO)/Vp*1000;                      //mgCOD/L   | PAO conc in COD units
  let MX_V     = MX_BH + MX_EH + MX_I + MX_PAO + MX_E_PAO;                //kgVSS     | total VSS mass
  let MX_IO    = FiSS*Rs + f_iOHO*MX_BH + f_iPAO*MX_PAO + F_extra_iSS*Rs; //kgiSS     | total inert solids (iSS + iOHO + iPAO + P_precipitation)
  let MX_T     = MX_V + MX_IO;                                            //kgTSS     | total TSS mass
  let X_V      = MX_V/Vp;                                                 //kgVSS/m3  | total VSS conc
  let X_T      = MX_T/Vp;                                                 //kgTSS/m3  | total TSS conc
  let f_VT     = MX_V/MX_T;                                               //gVSS/gTSS | valor orientativo 0.80 TBD
  let f_P_TSS = (1/MX_T)*(
    (
      f_P_OHO*MX_BH + 
      f_P_X_E*(MX_EH+MX_E_PAO) + 
      f_P_X_I*MX_I
    )/f_VT + 
    f_P_PAO*MX_PAO/f_VT_PAO + 
    f_P_iSS*MX_IO
  ); //particulate P (gP/gTSS)

  //requirement of N (Ns)
  let Ns = (f_N_OHO*(MX_BH+MX_EH)+ f_N_PAO*(MX_PAO+MX_E_PAO) +f_N_UPO*MX_I)/(Rs*Q); //mgN/L | N in influent required for sludge production

  //bioP + nitrification + NO denitrification condition

  //check condition depending on plant configuration TBD
  let conf={nit:true, dn:false, single_tank:true};
  if(conf.nit==true && conf.dn==false && conf.single_tank==true){
    if(f_AN>fxm) throw new Error("f_AN > fxm");
  }

  //carbonaceous oxygen demand
  let FOc = (1-YH)*Q*S_b + f_CV*(1-fH)*(b_PAO_T*MX_PAO + bHT*MX_BH);
  //kgO/d

  //P removal
  //TODO lunes 2/9/2019

  //bioP process variables
  let process_variables = {
    //----k
    S_FBSO_conv : {value:S_FBSO_conv, unit:"mgCOD/L",    descr:""},
    S_FBSO_AN   : {value:S_FBSO_AN,   unit:"mgCOD/L",    descr:""},
    MX_BH       : {value:MX_BH,       unit:"kgVSS",      descr:""},
    MX_BH_next  : {value:MX_BH_next,  unit:"kgVSS",      descr:""},
    iterations  : {value:iterations,  unit:"iterations", descr:""},
    F_ss_PAO    : {value:F_ss_PAO,    unit:"kgCOD/d",    descr:""},
    F_sb_OHO    : {value:F_sb_OHO,    unit:"kgCOD/d",    descr:""},
    b_PAO_T     : {value:b_PAO_T,     unit:"1/d",        descr:""},
    f_XPAO      : {value:f_XPAO,      unit:"gVSS/gCOD",  descr:""},
    MX_PAO      : {value:MX_PAO,      unit:"kgVSS",      descr:""},
    MX_E_PAO    : {value:MX_E_PAO,    unit:"kgVSS",      descr:""},
    MX_EH       : {value:MX_EH,       unit:"kgVSS",      descr:""},
    MX_I        : {value:MX_I,        unit:"kgVSS",      descr:""},
    MX_V        : {value:MX_V,        unit:"kgVSS",      descr:""},
    MX_IO       : {value:MX_IO,       unit:"kgiSS",      descr:""},
    MX_T        : {value:MX_T,        unit:"kgTSS",      descr:""},
    X_V         : {value:X_V,         unit:"kgVSS/m3",   descr:""},
    X_T         : {value:X_T,         unit:"kgTSS/m3",   descr:""},
    f_VT        : {value:f_VT,        unit:"gVSS/gTSS",  descr:""},
    f_P_TSS     : {value:f_P_TSS,     unit:"gP/gTSS",    descr:""},
    FOc         : {value:FOc,         unit:"kgO/d",      descr:""},
  };
  return process_variables;
};

(function(){
  console.log(bio_p_removal());
})();
