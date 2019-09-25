/*
  Bio P removal implementation
*/

try{
  State_Variables    = require("./state-variables.js");
  chemical_P_removal = require("./chemical-P-removal.js");
}catch(e){}

function bio_p_removal(){

  //doubts
  let S_NOx_RAS = 0.5;   //mgCOD/L | new input or it can be calculated ?
  let f_CV      = 1.481; //mass ratio of OHOs and PAO combined | TBD this can be calculated as M

  //new inputs for Bio P removal
  let number_of_an_zones = 2;   //new | number of anoxic zones | TODO
  let f_AN               = 0.1; //new input | value <= fxm | TODO | anaerobic mass fraction, different from fxt (?)

  /*INPUTS*/
  //inputs -- state variables
  let S_FBSO      = 124;   //mgCOD/L | input state variable
  let S_VFA       = 22;    //mgCOD/L | input state variable
  let S_USO       = 53;    //mgCOD/L | input state variable
  let S_NOx       = 0;     //mgCOD/L | input state variable

  //inputs -- mass ratios
  let f_CV_UPO = 1.481;
  let f_CV_OHO = 1.481;
  let f_CV_PAO = 1.481;
  let f_N_OHO  = 0.100;
  let f_N_PAO  = 0.100;
  let f_N_UPO  = 0.100;
  let f_N_USO  = 0.0366;
  let f_P_OHO  = 0.025;
  let f_P_PAO  = 0.380; 
  let f_P_UPO  = 0.025;
  let f_P_USO  = 0;
  let f_CV_USO = 1.4930;

  //inputs -- constants
  let YH          = 0.666;  //see constants.js
  let fH          = 0.2;    //see constants.js
  let f_iOHO      = 0.15;   //TODO inert fraction of OHO
  let b_PAO       = 0.04;   //new TODO
  let theta_b_PAO = 1.029   //new TODO
  let f_PAO       = 0.25;   //TODO fraction of endogenous residue of the PAOs
  let f_iPAO      = 1.3;    //TODO inert fraction of PAO
  let f_i         = 0.15;   //TODO inert fraction of OHO and PAO (=OHO)

  //inputs -- plant parameters
  let DO          = 0;      //mgO/L | input
  let DO_RAS      = 0;      //mgO/L | input
  let Q           = 15;     //ML/d  | input
  let RAS         = 0.75;   //ø     | input
  let Rs          = 20;     //d     | input
  let T           = 14      //ºC    | input
  let Vp          = 21370;  //m3    | input
  let mass_FeCl3  = 10;     //kg/d  | input

  //variables already calculated in other modules
  let Nti         = 60;     //mgN/L   | state-variables.js
  let Pti         = 17;     //mgP/L   | state-variables.js
  let FSti        = 11250;  //kgCOD/d | state-variables.js
  let FiSS        = 735;    //kgiSS/d | state-variables.js

  let S_b         = 585;    //mgCOD/L | computed at as (is S_b or Sbi?) TBD
  let YHvss       = 0.45;   //        | computed at as
  let bHT         = 0.202;  //1/d     | computed at as
  let k_vT        = 0.0505; //        | computed at as

  let F_extra_iSS = 0;      //kgiSS/d | computed at cpr

  let fxm         = 0.5;    //computed at nit

  let f_P_X_E     = 0.03;  //gP/gVSS   | fraction of P in endogenous mass (OHO+PAO)
  let f_P_X_I     = 0.03;  //gP/gVSS   | fraction of P in inert mas (OHO+PAO)
  let f_VT_PAO    = 0.46;  //gPAOVSS/gTSS | se puede calcular (?) TBD
  let f_P_iSS     = 0.02;  //gP/giSS   | fraction of P in iSS


  /*EQUATIONS*/
  const Y_PAO = YH/f_CV_PAO;            //0.45 = 0.666/1.481
  const i_8_6 = (5/8)*2*(32/14)/(1-YH); //8.6 stoichiometric constant
  const i_3_0 = 1/(1-YH);               //3.0 stoichiometric constant
  //console.log({i_8_6,i_3_0});

  //fermentables available for conversion into VFA by OHOs
  let S_FBSO_conv = S_FBSO - i_8_6*(RAS*S_NOx_RAS + S_NOx) - i_3_0*(RAS*DO_RAS + DO); //mgCOD/L

  //loop
  let S_FBSO_AN  = 0; //initial seed value                        //mgCOD/L | fermentable lost in the effluent of the last anaerobic reactor 
  let F_ss_PAO   = Q*(S_FBSO_conv - (1+RAS)*S_FBSO_AN) + Q*S_VFA; //kgCOD/d | VFA stored by PAOs
  let F_sb_OHO   = Q*S_b - F_ss_PAO;                              //kgCOD/d | remaining bCOD for OHOs
  let MX_BH      = YHvss/(1+bHT*Rs)*F_sb_OHO*Rs;                  //kgVSS   | active OHO biomass
  let MX_BH_next = MX_BH;                                         //next iteration for MX_BH
  let iterations = 0;                                             //number of iterations needed to compute MX_BH

  //loop for MX_BH calculation
  while(true){
    S_FBSO_AN  = S_FBSO_conv/(1+RAS)/Math.pow(1+(k_vT*(f_AN*MX_BH/(number_of_an_zones*Q*(1+RAS)))), number_of_an_zones);
    F_ss_PAO   = Q*(S_FBSO_conv - (1+RAS)*S_FBSO_AN) + Q*S_VFA; //kgCOD/d
    F_sb_OHO   = Q*S_b - F_ss_PAO;                              //kgCOD/d
    MX_BH_next = YHvss/(1+bHT*Rs)*F_sb_OHO*Rs;                  //kgVSS
    if(Math.abs(MX_BH-MX_BH_next)<0.0001){break;}               //end loop if MX_BH converged
    MX_BH = MX_BH_next;                                         //update value of MX_BH
    if(++iterations>=1000){
      throw new Error(`max iterations (${iterations}) for MX_BH calculation loop reached`);
    }
  }

  let MX_EH    = fH*bHT*Rs*MX_BH;                                         //kgVSS     | endogenous residue OHOs

  let b_PAO_T  = b_PAO*Math.pow(theta_b_PAO, T-20);                       //1/d       | endogenous respiration rate corrected by temperature
  let f_XPAO   = Y_PAO/(1 + b_PAO_T*Rs);                                  //gVSS/gCOD | PAO biomass production rate
  let MX_PAO   = f_XPAO*F_ss_PAO*Rs;                                      //kgVSS     | active PAO biomass
  let MX_E_PAO = f_PAO*b_PAO_T*MX_PAO*Rs;                                 //kgVSS     | endogenous residue PAOs

  let MX_I     = f_i*Rs*FSti/f_CV;                                        //kgVSS     | VSS inert mass (PAOs+OHOs)
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

  //VSS to COD biomass conversion
  let X_OHO = f_CV_OHO*(MX_BH  + MX_EH   )/Vp*1000; //mgCOD/L | OHO conc in COD units
  let X_PAO = f_CV_PAO*(MX_PAO + MX_E_PAO)/Vp*1000; //mgCOD/L | PAO conc in COD units

  //N in influent required for biomass production
  let Ns = (f_N_OHO*(MX_BH + MX_EH) + f_N_PAO*(MX_PAO + MX_E_PAO) + f_N_UPO*MX_I)/(Rs*Q); //mgN/L

  //bioP + nitrification + NO denitrification condition
  //check condition depending on plant configuration TBD
  let conf={nit:true, dn:false, single_tank:true};
  if(conf.nit==true && conf.dn==false && conf.single_tank==true){
    if(f_AN>fxm) throw new Error("f_AN > fxm");
  }

  //carbonaceous oxygen demand in bio P removal
  let FOc = (1 - YH)*Q*S_b + f_CV*(1 - fH)*(b_PAO_T*MX_PAO + bHT*MX_BH); //kgO/d

  /*P REMOVAL*/
  //P removed by PAOs
  let P_bio_PAO = f_P_PAO*MX_PAO/Rs/Q;                //mgP/L
  let P_bio_OHO = f_P_OHO*MX_BH/Rs/Q;                 //mgP/L
  let P_bio_E   = f_P_X_E*(MX_E_PAO + MX_EH)/Rs/Q;    //mgP/L
  let P_bio_I   = f_P_X_I*MX_I/Rs/Q;                  //mgP/L

  //potential biological P removal
  let P_bio_rem = P_bio_PAO + P_bio_OHO + P_bio_E + P_bio_I; //mgP/L

  //-----------------------bio P removal acaba aqui

  //nota: cambiar Ps y Psa en activated sludge TODO
  //caso similar a FOt; volver a calcular
  //mgP/L | P influent required for sludge production
  let Ps    = ((f_P_OHO*(MX_BH+MX_EH)+f_P_PAO*(MX_PAO+MX_E_PAO)) +f_P_UPO*MX_I)/(Rs*Q); //mgP/L
  let Pouse = S_USO*f_P_USO/f_CV_USO; //mgP/L
  let Pobse = 0; //mgP/L

  if(Ps > Pti) new Error("Ps > Pti: not enough influent TP to produce biomass");

  //mgP/L | inorganic soluble P available for chemical P removal
  let Psa = Math.max(0, Pti - Ps - Pouse - Pobse - P_bio_rem);

  //execute chemical P removal module
  let cpr        = chemical_P_removal(Q, Psa, mass_FeCl3); //object
  let P_chem_rem = cpr.PO4_removed.value/Q;                //mgP/L

  //total P concentration removed = bio + chemical
  let P_total_rem = P_bio_rem + P_chem_rem; //mgP/L

  //P in TSS_effluent
  let X_P_e = f_P_TSS*X_T*1000; //g/m3 == mg/L

  /*Calcul output streams (effluent and wastage)*/
  //TODO SST only
  let f       = (1+RAS)/RAS;
  let BPO_was = 0;                         //mg/L | model assumption
  let UPO_was = f*f_CV_UPO*(MX_I/Vp)*1000; //mg/L | UPO wastage
  let Qw      = (Vp/Rs)/f/1000;            //ML/d | SST wastage flowrate
  let Qe      = Q - Qw;                    //ok

  let iSS_was = f*MX_IO/Vp*1000;            //mgiSS/L
  let OHO_was = f*X_OHO;                    //mgCOD/L | OHO wastage
  let PAO_was = f*X_PAO;                    //mgCOD/L | PAO wastage

  //console.log({Pti,Pouse,P_total_rem});
  let Pse   = Pti - Pouse - P_total_rem ; //mgP/L   | Total P soluble in effluent
  let Nouse = S_USO*f_N_USO/f_CV_USO; //mgN/L
  let Nae   = Nti - Ns - Nouse; //?

  //TODO parte "difícil" calcular nitratos para denitrification
  let Nne = 0; //?

  /*recalcular Dp1 para denitrification + bio P removal*/
  let Dp1 = 0; //mgN/L

  //output streams------------------(Q,  VFA FBSO BPO      UPO      USO    iSS      FSA  OP   NOx  OHO      PAO    )
  let effluent = new State_Variables(Qe, 0,  0,   0,       0,       S_USO, 0,       Nae, Pse, Nne, 0,       0      );
  let wastage  = new State_Variables(Qw, 0,  0,   BPO_was, UPO_was, S_USO, iSS_was, Nae, Pse, Nne, OHO_was, PAO_was);

  //console.log({effluent,wastage});

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
    P_bio_PAO   : {value:P_bio_PAO,   unit:"mgP/L",      descr:""},
    P_bio_OHO   : {value:P_bio_OHO,   unit:"mgP/L",      descr:""},
    P_bio_E     : {value:P_bio_E  ,   unit:"mgP/L",      descr:""},
    P_bio_I     : {value:P_bio_I  ,   unit:"mgP/L",      descr:""},
    P_bio_rem   : {value:P_bio_rem,   unit:"mgP/L",      descr:""},
    Psa         : {value:Psa,         unit:"mgP/L",      descr:""},
    Pse         : {value:Pse,         unit:"mgP/L",      descr:""},
    Nae         : {value:Nae,         unit:"mgN/L",      descr:""},
    f         : {value:f,         unit:"ø",              descr:""},
    X_OHO     : {value:X_OHO,     unit:"mgCOD/L",        descr:""},
    X_PAO     : {value:X_PAO,     unit:"mgCOD/L",        descr:""},
  };
  return process_variables;
};

(function(){
  console.log(bio_p_removal());
})();
