/*
 * Bio P removal implementation
 * this is a standalone module: to be integrated to uct-icra model
 * (work in progress)
*/

//load modules
try{
  State_Variables    = require("./state-variables.js");
  chemical_P_removal = require("./chemical-P-removal.js");
}catch(e){}

function bio_p_removal(S_NOx_RAS, number_of_an_zones, f_P_X_E, f_P_X_I, f_P_iSS){
  /*DOUBTS SOLVED*/
    //new inputs
    S_NOx_RAS          = 0.500; //mgNOx/L | NOx at RAS
    number_of_an_zones = 2;     //zones
    f_P_X_E            = 0.025; //gP/gVSS | fraction of P in endogenous mass (OHO+PAO)
    f_P_X_I            = 0.03;  //gP/gVSS | UPO fraction of P in inert mas
    f_P_iSS            = 0.02;  //gP/giSS | fraction of P in iSS

    let f_VT_PAO = 0.46; //gPAOVSS/gTSS | can be calculated

    //values already calculated
    let S_FBSO        = 124;      //mgCOD/L   | (ok) state variable
    let S_VFA         =  22;      //mgCOD/L   | (ok) state variable
    let S_USO         =  53;      //mgCOD/L   | (ok) state variable
    let S_NOx         =   0;      //mgNOx/L   | (ok) state variable
    const f_CV_UPO    = 1.4810;   //gCOD/gVSS | (ok) mass ratio
    const f_N_UPO     = 0.1000;   //gN/gVSS   | (ok) mass ratio
    const f_P_UPO     = 0.0250;   //gP/gVSS   | (ok) mass ratio
    const f_CV_USO    = 1.4930;   //gCOD/gVSS | (ok) mass ratio
    const f_N_USO     = 0.0366;   //gN/gVSS   | (ok) mass ratio
    const f_P_USO     = 0.0000;   //gP/gVSS   | (ok) mass ratio
    const f_CV_OHO    = 1.4810;   //gCOD/gVSS | (ok) mass ratio
    const f_N_OHO     = 0.1000;   //gN/gVSS   | (ok) mass ratio
    const f_P_OHO     = 0.0250;   //gP/gVSS   | (ok) mass ratio
    const f_CV_PAO    = 1.4810;   //gCOD/gVSS | (ok) mass ratio
    const f_N_PAO     = 0.1000;   //gN/gVSS   | (ok) mass ratio
    const YH          = 0.666;    //gCOD/gCOD | (ok) kinetic constant
    const fH          = 0.200;    //ø         | (ok) kinetic constant
    const f_iOHO      = 0.150;    //giSS/gVSS | (ok) kinetic constant
    const b_PAO       = 0.040;    //1/d       | (ok) kinetic constant
    const theta_b_PAO = 1.029;    //ø         | (ok) kinetic constant
    const f_PAO       = 0.250;    //ø         | (ok) kinetic constant
    let f_i           = 0.150;    //ø         | (ok) fSup (X_UPO/Sti)
    let DO            = 0;        //mgO/L     | (ok) parameter
    let DO_RAS        = 0;        //mgO/L     | (ok) parameter
    let Q             = 15;       //ML/d      | (ok) state variable
    let RAS           = 0.75;     //ø         | (ok) parameter
    let Rs            = 20;       //d         | (ok) parameter
    let T             = 14        //ºC        | (ok) parameter
    let Vp            = 21370;    //m3        | (ok) parameter
    let mass_FeCl3    = 10;       //kg/d      | (ok) parameter
    let Nti           = 60;       //mgN/L     | (ok) fractionation
    let Pti           = 17;       //mgP/L     | (ok) fractionation
    let FSti          = 11250;    //kgCOD/d   | (ok) fractionation
    let FiSS          = 735;      //kgiSS/d   | (ok) fractionation
    let YHvss         = 0.45;     //gVSS/gCOD | (ok) activated sludge
    let bHT           = 0.202171; //1/d       | (ok) activated sludge
    let k_vT          = 0.0505;   //L/mgVSS·d | (ok) activated sludge
    let F_extra_iSS   = 0;        //kgiSS/d   | (ok) chemical P removal
    let fxm           = 0.5;      //ø         | (ok) nitrification
    let S_b           = 585;      //mgCOD/L   | (ok) bCOD = Sbi = VFA+FBSO+BPO

  //DOUBTS NOT SOLVED==========================================================
    //anaerobic mass fraction, different from fxt
    let f_AN = 0.1; //ø | see doubt nº 8
    //new input | value <= fxm

    //f_P_PAO and f_P_PAO_calculated
    let f_P_PAO = 0.3800; //gP/gVSS | (doubt nº4)
    //f_P_PAO_calculated should be lower than 0.38
    //we get higher value

    //f_iPAO and f_iPAO_calculated
    let f_iPAO = 1.300; //giSS/gVSS
    //inert fraction of PAO, not constant, has
    //to be calculated (0.15 - 1.3) (1.3 is PAOs full of polyPP)
    //calculated should be lower than 1.3, we get higher value

  /*EQUATIONS*/
  const Y_PAO = YH/f_CV_PAO;            //gVSS/gCOD | ~0.45 = 0.666/1.481
  const i_8_6 = (5/8)*2*(32/14)/(1-YH); //gCOD/gNOx | ~8.6 (conv NOx to COD)
  const i_3_0 = 1/(1-YH);               //gCOD/gDO  | ~3.0 (conv DO to COD)
  //console.log({Y_PAO, i_8_6, i_3_0});

  //fermentables available for conversion into VFA by OHOs
  let S_FBSO_conv = S_FBSO - i_8_6*(RAS*S_NOx_RAS + S_NOx) - i_3_0*(RAS*DO_RAS + DO); //mgCOD/L
  S_FBSO_conv = Math.max(S_FBSO_conv, 0); //avoid negative
  console.log({S_FBSO, S_FBSO_conv});

  //initial values for MX_BH calculation loop
  let S_FBSO_AN  = 0; /*initial seed value*/                      //mgCOD/L | fermentable lost in the effluent of the last anaerobic reactor
  let F_ss_PAO   = Q*(S_FBSO_conv - (1+RAS)*S_FBSO_AN) + Q*S_VFA; //kgCOD/d | VFA stored by PAOs
  let F_sb_OHO   = Q*S_b - F_ss_PAO;                              //kgCOD/d | remaining bCOD for OHOs
  let MX_BH      = YHvss/(1+bHT*Rs)*F_sb_OHO*Rs;                  //kgVSS   | active OHO biomass
  let MX_BH_next = MX_BH;                                         //kgVSS   | next iteration
  let iterations = 0; //number of iterations needed to compute MX_BH

  //MX_BH calculation loop
  while(true){
    S_FBSO_AN  = S_FBSO_conv/(1+RAS)/Math.pow(1+(k_vT*(f_AN*MX_BH/(number_of_an_zones*Q*(1+RAS)))), number_of_an_zones);
    F_ss_PAO   = Q*(S_FBSO_conv - (1+RAS)*S_FBSO_AN) + Q*S_VFA; //kgCOD/d
    F_sb_OHO   = Q*S_b - F_ss_PAO;                              //kgCOD/d
    MX_BH_next = YHvss/(1+bHT*Rs)*F_sb_OHO*Rs;                  //kgVSS
    MX_BH = MX_BH_next;                                         //update value of MX_BH
    if(Math.abs(MX_BH-MX_BH_next)<0.0001){break;}               //end loop if MX_BH converged
    if(++iterations>=1000){
      throw new Error(`max iterations (${iterations}) for MX_BH calculation loop reached`);
    }
  }

  //OHO VSS endogenous residue
  let MX_EH = fH * bHT * Rs * MX_BH; //kgVSS | endogenous residue OHOs

  //PAO VSS
  let b_PAO_T  = b_PAO*Math.pow(theta_b_PAO, T-20); //1/d       | endogenous respiration rate corrected by temperature
  let f_XPAO   = Y_PAO/(1 + b_PAO_T*Rs);            //gVSS/gCOD | PAO biomass production rate
  let MX_PAO   = f_XPAO*F_ss_PAO*Rs;                //kgVSS     | active PAO biomass
  let MX_E_PAO = f_PAO*b_PAO_T*MX_PAO*Rs;           //kgVSS     | endogenous residue PAOs

  //calculation for f_CV combined (OHO and PAO)
  //gCOD/gVSS | mass ratio of OHOs and PAO combined
  //this can be calculated
  let f_CV_combined = (function(){
    //calculate mass of VSS for OHOs and PAOs
    let OHO_VSS  = MX_BH  + MX_EH;    //kgVSS OHO
    let PAO_VSS  = MX_PAO + MX_E_PAO; //kgVSS PAO

    //calculate COD for OHO and PAO using respective f_CV
    let OHO_COD  = f_CV_OHO*OHO_VSS;  //kgCOD OHO
    let PAO_COD  = f_CV_PAO*PAO_VSS;  //kgCOD PAO

    //calculate new f_CV combined (OHOs + PAOs)
    let f_CV_combined = (OHO_COD + PAO_COD)/(OHO_VSS + PAO_VSS); //gCOD/gVSS

    let OHO_PAO_VSS = OHO_VSS/PAO_VSS; //gOHOVSS/gPAOVSS
    console.log({OHO_PAO_VSS});

    //console.log({OHO_VSS, OHO_COD, PAO_VSS, PAO_COD, f_CV_combined});
    return f_CV_combined;
  })();
  //console.log({f_CV_OHO, f_CV_PAO, f_CV_combined});

  //OHOs + PAOs
  let MX_I  = f_i*Rs*FSti/f_CV_combined;                               //kgVSS     | VSS inert mass (PAOs+OHOs)
  let MX_V  = MX_BH + MX_EH + MX_I + MX_PAO + MX_E_PAO;                //kgVSS     | total VSS mass
  let MX_IO = FiSS*Rs + f_iOHO*MX_BH + f_iPAO*MX_PAO + F_extra_iSS*Rs; //kgiSS     | total inert solids (iSS + iOHO + iPAO + P_precipitation)
  let MX_T  = MX_V + MX_IO;                                            //kgTSS     | total TSS mass
  let X_V   = MX_V/Vp;                                                 //kgVSS/m3  | total VSS conc
  let X_T   = MX_T/Vp;                                                 //kgTSS/m3  | total TSS conc
  let f_VT  = MX_V/MX_T;                                               //gVSS/gTSS | valor orientativo 0.80

  //PAOVSS/TSS
  let f_VT_PAO_calculated = (MX_PAO + MX_E_PAO)/MX_T;
  console.log({f_VT_PAO, f_VT_PAO_calculated});

  //VSS to COD biomass conversion
  let X_OHO = f_CV_OHO*(MX_BH  + MX_EH   )/Vp*1000; //mgCOD/L | OHO conc in COD units
  let X_PAO = f_CV_PAO*(MX_PAO + MX_E_PAO)/Vp*1000; //mgCOD/L | PAO conc in COD units

  //N in influent required for biomass production
  let Ns = (f_N_OHO*(MX_BH+MX_EH) + f_N_PAO*(MX_PAO+MX_E_PAO) + f_N_UPO*MX_I)/(Rs*Q); //mgN/L

  //bioP + nitrification + NO denitrification condition
  //check condition depending on plant configuration TBD
  let conf={nit:true, dn:false, single_tank:true};
  if(conf.nit==true && conf.dn==false && conf.single_tank==true){
    if(f_AN>fxm) throw new Error("f_AN > fxm");
  }

  //carbonaceous oxygen demand in bio P removal
  let FOc_OHO = (1 - YH)*F_sb_OHO + f_CV_OHO*(1 - fH   )*(    bHT*MX_BH  ); //kgO/d
  let FOc_PAO = (1 - YH)*F_ss_PAO + f_CV_PAO*(1 - f_PAO)*(b_PAO_T*MX_PAO ); //kgO/d
  let FOc     = FOc_OHO + FOc_PAO; //kgO/d

  //COD balance
  let exiting_COD = FOc + f_CV_combined*MX_V/Rs + Q*(S_USO );
  //TODO remember to include the S_b FBSO not consumed when integration
  let COD_balance = 100*exiting_COD/FSti;
  //console.log({COD_balance});

  /*P REMOVAL*/
  //P removed by PAOs
  let P_bio_PAO = f_P_PAO*MX_PAO/Rs/Q;             //mgP/L
  let P_bio_OHO = f_P_OHO*MX_BH/Rs/Q;              //mgP/L
  let P_bio_E   = f_P_X_E*(MX_E_PAO + MX_EH)/Rs/Q; //mgP/L
  let P_bio_I   = f_P_X_I*MX_I/Rs/Q;               //mgP/L

  //potential biological P removal
  let P_bio_rem = P_bio_PAO + P_bio_OHO + P_bio_E + P_bio_I; //mgP/L

  //bio P removal ends here ---------------------------------------------------

  //note: change Ps and Psa in activated sludge TODO
  //similar case for FOt, recalculate
  //mgP/L | P influent required for sludge production

  let Ps = ( (f_P_OHO*(MX_BH+MX_EH+MX_E_PAO) + f_P_PAO*(MX_PAO) ) + f_P_UPO*MX_I)/(Rs*Q); //mgP/L
  //console.log({Ps,P_bio_rem}); //mgP/L | they should be equal

  let f_P_PAO_calculated = (Q*Pti*Rs - f_P_OHO*(MX_BH+MX_EH+MX_E_PAO) - f_P_UPO*MX_I)/MX_PAO;
  //note: f_P_PAO_calculated should be lower than f_P_PAO (0.38)
  console.log({f_P_PAO, f_P_PAO_calculated});

  let Pouse = S_USO*f_P_USO/f_CV_USO; //mgP/L
  let Pobse = 0; //mgP/L  (calculate from S_b*f_P_FBSO/f_CV_FBSO)

  if(Ps > Pti) console.warn("Ps > Pti: not enough influent TP to fill up the PAOs with polyphosphate");

  //mgP/L | inorganic soluble P available for chemical P removal
  let Psa = Math.max(0, Pti - Ps - Pouse - Pobse - P_bio_rem);
  //console.log({Psa});

  //execute chemical P removal module
  let cpr        = chemical_P_removal(Q, Psa, mass_FeCl3); //object
  let P_chem_rem = cpr.PO4_removed.value/Q;                //mgP/L

  //total P concentration removed = bio + chemical
  let P_total_rem = P_bio_rem + P_chem_rem; //mgP/L

  /*calculate mass of iSS*/
  let f_iPAO_calculated = f_iOHO + 3.268*f_P_PAO_calculated; //giSS/gPAOVSS
  //(3.268 is experimental value giSS/gPP)
  MX_IO = FiSS*Rs + f_iOHO*MX_BH + f_iPAO_calculated*MX_PAO + F_extra_iSS*Rs; //kgiSS 
  //total inert solids (iSS + iOHO + P_precipitation)
  console.log({f_iPAO, f_iPAO_calculated});

  /*
    at this point we need a select system type and reactor volume
      - AO (MLE)
      - A2O (3 stage bardenpho)
      - UCT system

    - AO:  we need underflow "s" recycle ratio (the 'a' recycle is calculated)
    - A2O: we need underflow "s" recycle ratio (the 'a' recycle is calculated)
    - UCT: we calculate the 'a' recycle. The 'r' recycle (from anoxic to
      anaerobic) and the 's' recycle are given as inputs.
  */

  //
  let f_P_TSS = (1/MX_T)*(
    (
      f_P_OHO*MX_BH +
      f_P_X_E*(MX_EH+MX_E_PAO) +
      f_P_X_I*MX_I
    )/f_VT +
    f_P_PAO*MX_PAO/f_VT_PAO +
    f_P_iSS*MX_IO
  ); //particulate P (gP/gTSS)

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
  let Pse   = Pti - Pouse - P_total_rem ; //mgP/L | Total P soluble in effluent
  let Nouse = S_USO*f_N_USO/f_CV_USO;     //mgN/L
  let Nae   = Nti - Ns - Nouse;           //?

  //calculate nitrate for denitrification TODO
  let Nne = 0; //mgN/L

  /*
    modification for Dp1 (denitrification potential)
    when there is bio P removal
  */
  let Dp1 = (function(){ //mgN/L
    let r=0; //recirculation from anoxic to anaerobic reactor

    let fx1       = fxm - f_AN;                      //ø
    let K2_20_PAO = 0.255;                           //gN/gVSS·d
    let K2T_PAO   = K2_20_PAO*Math.pow(1.080, T-20); //gN/gVSS·d

    //new equation
    let Dp1 = S_FBSO_AN*(1+r)*(1-YH)/2.86 +
              fx1*K2T_PAO*(F_sb_OHO/Q)*(YH/f_CV_OHO)/(1+bHT*Rs);

    return Dp1;
  })();

  //output streams-TBD-TODO---------(Q,  VFA FBSO BPO      UPO      USO    iSS      FSA  OP   NOx  OHO      PAO    )
  let effluent = new State_Variables(Qe, 0,  0,   0,       0,       S_USO, 0,       Nae, Pse, Nne, 0,       0      );
  let wastage  = new State_Variables(Qw, 0,  0,   BPO_was, UPO_was, S_USO, iSS_was, Nae, Pse, Nne, OHO_was, PAO_was);

  //bioP process variables
  let process_variables={
    S_FBSO_conv : {value:S_FBSO_conv, unit:"mgCOD/L",   },
    S_FBSO_AN   : {value:S_FBSO_AN,   unit:"mgCOD/L",   },
    F_ss_PAO    : {value:F_ss_PAO,    unit:"kgCOD/d",   },
    F_sb_OHO    : {value:F_sb_OHO,    unit:"kgCOD/d",   },
    MX_BH       : {value:MX_BH,       unit:"kgVSS",     },
    MX_BH_next  : {value:MX_BH_next,  unit:"kgVSS",     },
    iterations  : {value:iterations,  unit:"iterations",},
    MX_EH       : {value:MX_EH,       unit:"kgVSS",     },
    b_PAO_T     : {value:b_PAO_T,     unit:"1/d",       },
    f_XPAO      : {value:f_XPAO,      unit:"gVSS/gCOD", },
    MX_PAO      : {value:MX_PAO,      unit:"kgVSS",     },
    MX_E_PAO    : {value:MX_E_PAO,    unit:"kgVSS",     },
    MX_I        : {value:MX_I,        unit:"kgVSS",     },
    MX_V        : {value:MX_V,        unit:"kgVSS",     },
    MX_IO       : {value:MX_IO,       unit:"kgiSS",     },
    MX_T        : {value:MX_T,        unit:"kgTSS",     },
    X_V         : {value:X_V,         unit:"kgVSS/m3",  },
    X_T         : {value:X_T,         unit:"kgTSS/m3",  },
    f_VT        : {value:f_VT,        unit:"gVSS/gTSS", },
    f_P_TSS     : {value:f_P_TSS,     unit:"gP/gTSS",   },
    X_OHO       : {value:X_OHO,       unit:"mgCOD/L",   },
    X_PAO       : {value:X_PAO,       unit:"mgCOD/L",   },
    Ns          : {value:Ns,          unit:"mgN/L",     },
    FOc         : {value:FOc,         unit:"kgO/d",     },
    P_bio_PAO   : {value:P_bio_PAO,   unit:"mgP/L",     },
    P_bio_OHO   : {value:P_bio_OHO,   unit:"mgP/L",     },
    P_bio_E     : {value:P_bio_E  ,   unit:"mgP/L",     },
    P_bio_I     : {value:P_bio_I  ,   unit:"mgP/L",     },
    P_bio_rem   : {value:P_bio_rem,   unit:"mgP/L",     },
    Ps          : {value:Ps,          unit:"mgP/L",     },
    Psa         : {value:Psa,         unit:"mgP/L",     },
    Pse         : {value:Pse,         unit:"mgP/L",     },
    P_total_rem : {value:P_total_rem, unit:"mgP/L",     },
    f           : {value:f,           unit:"ø",         },
    Nae         : {value:Nae,         unit:"mgN/L",     },
    Nne         : {value:Nne,         unit:"mgN/L",     },
    Dp1         : {value:Dp1,         unit:"mgN/L",     },
    COD_balance : {value:COD_balance, unit:"%"},
  };

  return {process_variables, effluent, wastage};
};

State_Variables.prototype.bio_p_removal=function(
  S_NOx_RAS          ,
  number_of_an_zones ,
  f_P_X_E            ,
  f_P_X_I            ,
  f_P_iSS            ,
){
  /*DOUBTS SOLVED*/
    S_NOx_RAS          = 0.500; //mgNOx/L | NOx at RAS
    number_of_an_zones = 2;     //zones
    f_P_X_E            = 0.025; //gP/gVSS | fraction of P in endogenous mass (OHO+PAO)
    f_P_X_I            = 0.03;  //gP/gVSS | UPO fraction of P in inert mas
    f_P_iSS            = 0.02;  //gP/giSS | fraction of P in iSS

    let f_VT_PAO = 0.46; //gPAOVSS/gTSS | can be calculated?

    let S_FBSO        = this.components.S_FBSO; //mgCOD/L   | (ok) state variable
    let S_VFA         = this.components.S_VFA;  //mgCOD/L   | (ok) state variable
    let S_USO         = this.components.S_USO;  //mgCOD/L   | (ok) state variable
    let S_NOx         = this.components.S_NOx;  //mgNOx/L   | (ok) state variable

    const f_CV_UPO    = this.mass_ratios.f_CV_UPO; //gCOD/gVSS | (ok) mass ratio
    const f_N_UPO     = this.mass_ratios.f_N_UPO ; //gN/gVSS   | (ok) mass ratio
    const f_P_UPO     = this.mass_ratios.f_P_UPO ; //gP/gVSS   | (ok) mass ratio
    const f_CV_USO    = this.mass_ratios.f_CV_USO; //gCOD/gVSS | (ok) mass ratio
    const f_N_USO     = this.mass_ratios.f_N_USO ; //gN/gVSS   | (ok) mass ratio
    const f_P_USO     = this.mass_ratios.f_P_USO ; //gP/gVSS   | (ok) mass ratio
    const f_CV_OHO    = this.mass_ratios.f_CV_OHO; //gCOD/gVSS | (ok) mass ratio
    const f_N_OHO     = this.mass_ratios.f_N_OHO ; //gN/gVSS   | (ok) mass ratio
    const f_P_OHO     = this.mass_ratios.f_P_OHO ; //gP/gVSS   | (ok) mass ratio
    const f_CV_PAO    = this.mass_ratios.f_CV_PAO; //gCOD/gVSS | (ok) mass ratio
    const f_N_PAO     = this.mass_ratios.f_N_PAO ; //gN/gVSS   | (ok) mass ratio

    const YH          = 0.666;    //gCOD/gCOD | (ok) kinetic constant
    const fH          = 0.200;    //ø         | (ok) kinetic constant
    const f_iOHO      = 0.150;    //giSS/gVSS | (ok) kinetic constant
    const b_PAO       = 0.040;    //1/d       | (ok) kinetic constant
    const theta_b_PAO = 1.029;    //ø         | (ok) kinetic constant
    const f_PAO       = 0.250;    //ø         | (ok) kinetic constant
    let f_i           = 0.150;    //ø         | (ok) fSup (X_UPO/Sti)
    let DO            = 0;        //mgO/L     | (ok) parameter
    let DO_RAS        = 0;        //mgO/L     | (ok) parameter
    let Q             = 15;       //ML/d      | (ok) state variable
    let RAS           = 0.75;     //ø         | (ok) parameter
    let Rs            = 20;       //d         | (ok) parameter
    let T             = 14        //ºC        | (ok) parameter
    let Vp            = 21370;    //m3        | (ok) parameter
    let mass_FeCl3    = 10;       //kg/d      | (ok) parameter
    let Nti           = 60;       //mgN/L     | (ok) fractionation
    let Pti           = 17;       //mgP/L     | (ok) fractionation
    let FSti          = 11250;    //kgCOD/d   | (ok) fractionation
    let FiSS          = 735;      //kgiSS/d   | (ok) fractionation
    let YHvss         = 0.45;     //gVSS/gCOD | (ok) activated sludge
    let bHT           = 0.202171; //1/d       | (ok) activated sludge
    let k_vT          = 0.0505;   //L/mgVSS·d | (ok) activated sludge
    let F_extra_iSS   = 0;        //kgiSS/d   | (ok) chemical P removal
    let fxm           = 0.5;      //ø         | (ok) nitrification
    let S_b           = 585;      //mgCOD/L   | (ok) bCOD = Sbi = VFA+FBSO+BPO
}

/*test*/
(function(){
  //return
  console.log("===========================================");
  console.log("bio P removal -- standalone pre integration");
  console.log("===========================================");
  let bip = bio_p_removal();
  console.log(bip.process_variables);
})();
