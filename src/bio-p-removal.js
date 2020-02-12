/*
 * Bio P removal implementation
 * (work in progress)
 * module to be integrated to uct-icra model
*/

//load modules
try{
  State_Variables    = require("./state-variables.js");
  chemical_P_removal = require("./chemical-P-removal.js");
  constants          = require("./constants.js");
}catch(e){}

/* 
  - variables a sobreescriure per bio P:
    - MX_BH (loop)
    - MX_I (inclou PAO)
    - MX_V (inclou PAO)
    - MX_IO (inclou PAO)
    - Ns (inclou PAO)
    - FOc (inclou PAO)
    - COD_balance (inclou PAO)
  - noves variables
    - anàleg per PAOs de:
      - OHO_was = f*fCV_OHO*(MX_BH +MX_EH   )/Vp*1000; //mg/L | OHO wastage
      - PAO_was = f*fCV_PAO*(MX_PAO+MX_E_PAO)/Vp*1000; //mg/L | PAO wastage
*/

//integration
State_Variables.prototype.bio_p_removal = function(
  S_NOx_RAS,
  number_of_an_zones,
  f_P_X_E,
  f_P_X_I,
  f_P_iSS,
  DO,
  DO_RAS,
  RAS,
  Rs,
  T,
  Vp,
  mass_FeCl3,
){
  //DOUBTS NOT SOLVED==========================================================
    //fraction of PAO in TSS
    let f_VT_PAO = 0.46; //gVSS/gTSS

    //anaerobic mass fraction
    //different from fxt
    //new input | value <= fxm
    let f_AN = 0.1; //ø

    //f_P_PAO and f_P_PAO_calculated
    let f_P_PAO = 0.3800; //gP/gVSS
    //f_P_PAO_calculated should be lower than 0.38
    //we get higher value

    //f_iPAO and f_iPAO_calculated
    let f_iPAO = 1.300; //giSS/gVSS
    //inert fraction of PAO, not constant, has
    //to be calculated (0.15 - 1.3) (1.3 is PAOs full of polyPP)
    //calculated should be lower than 1.3, we get higher value

    //other constants
    let F_extra_iSS = 0;   //kgiSS/d | chemical P removal

    //another doubt: giSS/

  //end DOUBTS NOT SOLVED======================================================

  //default values for new inputs (1/2): specific for bio P
  S_NOx_RAS          = S_NOx_RAS          || 0.500; //mgNOx/L | NOx concentration at RAS
  number_of_an_zones = number_of_an_zones || 2;     //anoxic zones
  f_P_X_E            = f_P_X_E            || 0.025; //gP/gVSS | P in endogenous mass (OHO+PAO)
  f_P_X_I            = f_P_X_I            || 0.03;  //gP/gVSS | UPO fraction of P in inert mas
  f_P_iSS            = f_P_iSS            || 0.02;  //gP/giSS | fraction of P in iSS

  //default values for new inputs (2/2): plant parameters
  DO         = DO         || 0;     //mgO/L | parameter
  DO_RAS     = DO_RAS     || 0;     //mgO/L | parameter
  RAS        = RAS        || 0.75;  //ø     | parameter
  Rs         = Rs         || 20;    //d     | parameter
  T          = T          || 14     //ºC    | parameter
  Vp         = Vp         || 21370; //m3    | parameter
  mass_FeCl3 = mass_FeCl3 || 10;    //kg/d  | parameter

  //influent state variables
  const Q      = this.Q;                 //ML/d    | state variable
  const S_FBSO = this.components.S_FBSO; //mgCOD/L | state variable
  const S_VFA  = this.components.S_VFA;  //mgCOD/L | state variable
  const S_USO  = this.components.S_USO;  //mgCOD/L | state variable
  const S_NOx  = this.components.S_NOx;  //mgNOx/L | state variable

  //fractionation related variables
  const frac = this.totals;                          //object  | {COD,TKN,TP,TOC,TSS}
  const fSup = this.components.X_UPO/frac.COD.total; //ø       | X_UPO/Sti
  const FSti = Q*frac.COD.total;                     //kgCOD/d | total COD mass flux
  const Nti  = frac.TKN.total;                       //mgN/L   | total TKN mass flux
  const Pti  = frac.TP.total;                        //mgP/L   | total TP mass flux
  const FiSS = Q*this.components.X_iSS;              //kgiSS/d | total iSS mass flux
  const Sbi  = frac.COD.bCOD;                        //mgCOD/L | bCOD = S_VFA+S_FBSO+X_BPO

  //VSS mass ratios (UPO)
  const f_CV_UPO = this.mass_ratios.f_CV_UPO; //gCOD/gVSS | mass ratio
  const f_N_UPO  = this.mass_ratios.f_N_UPO;  //gN/gVSS   | mass ratio
  const f_P_UPO  = this.mass_ratios.f_P_UPO;  //gP/gVSS   | mass ratio

  //VSS mass ratios (USO)
  const f_CV_USO = this.mass_ratios.f_CV_USO; //gCOD/gVSS | mass ratio
  const f_N_USO  = this.mass_ratios.f_N_USO;  //gN/gVSS   | mass ratio
  const f_P_USO  = this.mass_ratios.f_P_USO;  //gP/gVSS   | mass ratio

  //VSS mass ratios (OHO)
  const f_CV_OHO = this.mass_ratios.f_CV_OHO; //gCOD/gVSS | mass ratio
  const f_N_OHO  = this.mass_ratios.f_N_OHO;  //gN/gVSS   | mass ratio
  const f_P_OHO  = this.mass_ratios.f_P_OHO;  //gP/gVSS   | mass ratio

  //VSS mass ratios (PAO)
  const f_CV_PAO = this.mass_ratios.f_CV_PAO; //gCOD/gVSS | mass ratio
  const f_N_PAO  = this.mass_ratios.f_N_PAO;  //gN/gVSS   | mass ratio

  //kinetic constants (OHO)
  const YH     = constants.YH;           //0.66 gCOD/gCOD | heterotrophic yield coefficient (does not change with temperature)
  const YHvss  = YH/f_CV_OHO;            //0.45 gVSS/gCOD
  const fH     = constants.fH;           //0.20 ø         | endogenous OHO fraction
  const f_iOHO = constants.f_iOHO;       //0.15 giSS/gVSS | fraction of inert solids in biomass
  const bH     = constants.bH;           //0.24 1/d       | endogenous respiration rate at 20ºC
  const ϴ_bH   = constants.theta_bH;     //1.029 ø        | bH temperature correction factor
  const bHT    = bH*Math.pow(ϴ_bH,T-20); //1/d            | bH corrected by temperature

  //kinetic constants (PAO)
  const Y_PAO   = YH/f_CV_PAO;                  //gVSS/gCOD | ~0.45 = 0.666/1.481
  const b_PAO   = constants.b_PAO;              //1/d       | PAOs endogenous residue respiration rate at 20ºC
  const ϴ_b_PAO = constants.theta_b_PAO;        //ø         | b_PAO temperature correction factor
  const b_PAO_T = b_PAO*Math.pow(ϴ_b_PAO,T-20); //1/d       | b_PAO corrected by temperature
  const f_PAO   = constants.f_PAO;              //ø         | endogenous PAO fraction
  const f_XPAO  = Y_PAO/(1 + b_PAO_T*Rs);       //gVSS/gCOD | PAO biomass production rate

  //FBSO related constants
  const k_v20   = constants.k_v20;              //0.070 L/mgVSS·d | note: a high value (~1000) makes FBSO effluent ~0
  const ϴ_k_v20 = constants.theta_k_v20;        //1.035 ø         | k_v20 temperature correction factor
  const k_vT    = k_v20*Math.pow(ϴ_k_v20,T-20); //L/mgVSS·d       | k_v corrected by temperature

  //COD conversion stoichiometric constants
  const i_8_6 = (5/8)*2*(32/14)/(1-YH); //gCOD/gNOx | ~8.6 (conv NOx to COD)
  const i_3_0 = 1/(1-YH);               //gCOD/gDO  | ~3.0 (conv DO to COD)

  //variables already calculated -- end

  //===========================================================================
  // EQUATIONS
  //===========================================================================

  //calculate fermentables available for conversion into VFA by OHOs
  const S_FBSO_conv = Math.max(0,
    S_FBSO - i_8_6*(RAS*S_NOx_RAS + S_NOx) - i_3_0*(RAS*DO_RAS + DO)
  ); //mgCOD/L
  //console.log({S_FBSO, S_FBSO_conv});

  //initial values for MX_BH calculation loop
  let S_FBSO_AN  = 0; //mgCOD/L | fermentable lost in the effluent of the last anaerobic reactor
  let F_ss_PAO   = 0; //kgCOD/d | VFA stored by PAOs
  let F_sb_OHO   = 0; //kgCOD/d | remaining bCOD for OHOs
  let MX_BH      = 0; //kgVSS   | active OHO biomass
  let MX_BH_next = 0; //kgVSS   | next iteration
  let iterations = 0; //number of iterations needed to compute MX_BH

  //MX_BH calculation loop
  while(true){
    S_FBSO_AN  = S_FBSO_conv/(1+RAS)/Math.pow(1+(k_vT*(f_AN*MX_BH/(number_of_an_zones*Q*(1+RAS)))), number_of_an_zones);
    F_ss_PAO   = Math.max(0, Q*(S_FBSO_conv - (1+RAS)*S_FBSO_AN + S_VFA) ); //kgCOD/d
    F_sb_OHO   = Math.max(0, Q*Sbi - F_ss_PAO);                             //kgCOD/d
    MX_BH_next = YHvss/(1+bHT*Rs)*F_sb_OHO*Rs;                              //kgVSS

    //break loop condition
    if(Math.abs(MX_BH-MX_BH_next)<0.0001){
      MX_BH = MX_BH_next;
      break;
    }

    //update MX_BH value
    MX_BH = MX_BH_next;

    //max iterations (break condition)
    if(++iterations>=1000){
      throw new Error(`max iterations (${iterations}) for MX_BH calculation loop reached`);
    }
  }
  //console.log({S_FBSO_AN, F_ss_PAO, F_sb_OHO, MX_BH, iterations});

  //OHO VSS endogenous residue
  const MX_EH = fH * bHT * Rs * MX_BH; //kgVSS | endogenous residue OHOs

  //PAO VSS
  const MX_PAO   = f_XPAO*F_ss_PAO*Rs;      //kgVSS     | active PAO biomass
  const MX_E_PAO = f_PAO*b_PAO_T*MX_PAO*Rs; //kgVSS     | endogenous residue PAOs

  //calculation for f_CV_combined: VSS mass ratio for OHO+PAO
  const f_CV_combined = (function(){
    //calculate mass of VSS for OHOs and PAOs
    const OHO_VSS  = MX_BH  + MX_EH;    //kgVSS OHO
    const PAO_VSS  = MX_PAO + MX_E_PAO; //kgVSS PAO

    //calculate COD for OHO and PAO using respective f_CV
    const OHO_COD  = f_CV_OHO*OHO_VSS; //kgCOD OHO
    const PAO_COD  = f_CV_PAO*PAO_VSS; //kgCOD PAO

    //calculate new f_CV combined (OHOs + PAOs)
    const f_CV_combined = (OHO_COD + PAO_COD)/(OHO_VSS + PAO_VSS); //gCOD/gVSS

    //console.log({OHO_VSS, OHO_COD, PAO_VSS, PAO_COD, f_CV_combined});
    return f_CV_combined;
  })(); //gCOD/gVSS
  //console.log({f_CV_OHO, f_CV_PAO, f_CV_combined});

  //OHOs + PAOs
  const MX_I  = fSup*Rs*FSti/f_CV_combined;                              //kgVSS     | VSS inert mass (PAOs+OHOs)
  const MX_V  = MX_BH + MX_EH + MX_I + MX_PAO + MX_E_PAO;                //kgVSS     | total VSS mass
  const MX_IO = FiSS*Rs + f_iOHO*MX_BH + f_iPAO*MX_PAO + F_extra_iSS*Rs; //kgiSS     | total inert solids (iSS + iOHO + iPAO + P_precipitation)
  const MX_T  = MX_V + MX_IO;                                            //kgTSS     | total TSS mass
  const X_T   = MX_T/Vp;                                                 //kgTSS/m3  | total TSS conc
  const f_VT  = MX_V/MX_T;                                               //gVSS/gTSS | valor orientativo 0.80

  //conversion from VSS to COD (reactor concentrations)
  const X_OHO = f_CV_OHO*(MX_BH  + MX_EH   )/Vp*1000; //mgCOD/L | OHO conc in COD units
  const X_PAO = f_CV_PAO*(MX_PAO + MX_E_PAO)/Vp*1000; //mgCOD/L | PAO conc in COD units

  //N in influent required for biomass production
  const Ns = (f_N_OHO*(MX_BH+MX_EH) + f_N_PAO*(MX_PAO+MX_E_PAO) + f_N_UPO*MX_I)/(Rs*Q); //mgN/L

  //carbonaceous oxygen demand in bio P removal
  let FOc_OHO = (1 - YH)*F_sb_OHO + f_CV_OHO*(1 - fH   )*(    bHT*MX_BH  ); //kgO/d
  let FOc_PAO = (1 - YH)*F_ss_PAO + f_CV_PAO*(1 - f_PAO)*(b_PAO_T*MX_PAO ); //kgO/d
  let FOc     = FOc_OHO + FOc_PAO; //kgO/d

  //COD balance
  let exiting_COD = FOc + f_CV_combined*MX_V/Rs + Q*S_USO; //kgCOD/d
  //TODO remember to include the FBSO not consumed when integration
  let COD_balance = 100*exiting_COD/FSti;
  //console.log({COD_balance});

  /*P REMOVAL*/
  let P_bio_PAO = f_P_PAO*MX_PAO/Rs/Q;                       //mgP/L | P removed by PAOs
  let P_bio_OHO = f_P_OHO*MX_BH/Rs/Q;                        //mgP/L | P removed by OHOs
  let P_bio_E   = f_P_X_E*(MX_E_PAO + MX_EH)/Rs/Q;           //mgP/L | P endogenous biomass
  let P_bio_I   = f_P_X_I*MX_I/Rs/Q;                         //mgP/L | P in X_UPO
  let P_bio_rem = P_bio_PAO + P_bio_OHO + P_bio_E + P_bio_I; //mgP/L | total bio P removal
  //bio P removal ends here ---------------------------------------------------

  //P influent required for sludge production
  //note: change Ps and Psa in activated sludge TODO
  //similar case for FOt, recalculate
  let Ps = (f_P_OHO*(MX_BH+MX_EH+MX_E_PAO) + f_P_PAO*MX_PAO + f_P_UPO*MX_I)/(Rs*Q); //mgP/L
  //console.log({Ps, P_bio_rem}); //mgP/L | they should be equal

  //f_P_PAO_calculated
  //note: f_P_PAO_calculated should be lower than f_P_PAO (0.38)
  let f_P_PAO_calculated = (Q*Pti*Rs - f_P_OHO*(MX_BH+MX_EH+MX_E_PAO) - f_P_UPO*MX_I)/MX_PAO; //check book if this equation is right
  console.log({f_P_PAO, f_P_PAO_calculated});

  let Pouse = f_P_USO*S_USO/f_CV_USO; //mgP/L
  let Pobse = 0; //mgP/L  (calculate from S_b*f_P_FBSO/f_CV_FBSO)

  if(Ps > Pti){
    console.warn(`Ps (${Ps}) > Pti (${Pti}): not enough influent TP to fill up the PAOs with polyphosphate`);
  }

  //mgP/L | inorganic soluble P available for chemical P removal
  let Psa = Math.max(0, Pti - Ps - Pouse - Pobse - P_bio_rem); //check if this is ok TODO
  //console.log({Psa});

  //execute chemical P removal module
  let cpr        = chemical_P_removal(Q, Psa, mass_FeCl3); //object
  let P_chem_rem = cpr.PO4_removed.value/Q;                //mgP/L

  //total P concentration removed = bio + chemical
  let P_total_rem = P_bio_rem + P_chem_rem; //mgP/L

  /*calculate mass of iSS*/
  let f_iPAO_calculated = f_iOHO + 3.268*f_P_PAO_calculated; //giSS/gPAOVSS
  //(3.268 is experimental value giSS/gPP)

  //total inert solids = iSS     + iOHO         + iPAO                     + precipitation
  let MX_IO_calculated = FiSS*Rs + f_iOHO*MX_BH + f_iPAO_calculated*MX_PAO + F_extra_iSS*Rs; //kgiSS
  //      MX_IO        = FiSS*Rs + f_iOHO*MX_BH + f_iPAO*MX_PAO            + F_extra_iSS*Rs; //kgiSS

  //console.log({f_iPAO, f_iPAO_calculated, MX_IO_calculated});

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
  let X_P_e = f_P_TSS*X_T*1000; //gP/m3

  /*Calcul output streams (effluent and wastage)*/
  //TODO SST only

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
    let fxm       = 0.5; //ø       | nitrification
    let fx1       = fxm - f_AN;                      //ø
    let K2_20_PAO = 0.255;                           //gN/gVSS·d
    let K2T_PAO   = K2_20_PAO*Math.pow(1.080, T-20); //gN/gVSS·d

    //new equation
    let Dp1 = S_FBSO_AN*(1+r)*(1-YH)/2.86 +
              fx1*K2T_PAO*(F_sb_OHO/Q)*(YH/f_CV_OHO)/(1+bHT*Rs);

    return Dp1;
  })();

  //bio P results
  let process_variables = {
    S_FBSO_conv : {value:S_FBSO_conv, unit:"mgCOD/L",    },
    S_FBSO_AN   : {value:S_FBSO_AN,   unit:"mgCOD/L",    },
    F_ss_PAO    : {value:F_ss_PAO,    unit:"kgCOD/d",    },
    F_sb_OHO    : {value:F_sb_OHO,    unit:"kgCOD/d",    },
    iterations  : {value:iterations,  unit:"iterations", },
    MX_BH       : {value:MX_BH,       unit:"kgVSS",      },
    MX_EH       : {value:MX_EH,       unit:"kgVSS",      },
    b_PAO_T     : {value:b_PAO_T,     unit:"1/d",        },
    f_XPAO      : {value:f_XPAO,      unit:"gVSS/gCOD",  },
    MX_PAO      : {value:MX_PAO,      unit:"kgVSS",      },
    MX_E_PAO    : {value:MX_E_PAO,    unit:"kgVSS",      },
    MX_I        : {value:MX_I,        unit:"kgVSS",      },
    MX_V        : {value:MX_V,        unit:"kgVSS",      },
    MX_IO       : {value:MX_IO,       unit:"kgiSS",      },
    MX_T        : {value:MX_T,        unit:"kgTSS",      },
    f_VT        : {value:f_VT,        unit:"gVSS/gTSS",  },
    f_P_TSS     : {value:f_P_TSS,     unit:"gP/gTSS",    },
    X_OHO       : {value:X_OHO,       unit:"mgCOD/L",    },
    X_PAO       : {value:X_PAO,       unit:"mgCOD/L",    },
    Ns          : {value:Ns,          unit:"mgN/L",      },
    FOc         : {value:FOc,         unit:"kgO/d",      },
    P_bio_PAO   : {value:P_bio_PAO,   unit:"mgP/L",      },
    P_bio_OHO   : {value:P_bio_OHO,   unit:"mgP/L",      },
    P_bio_E     : {value:P_bio_E  ,   unit:"mgP/L",      },
    P_bio_I     : {value:P_bio_I  ,   unit:"mgP/L",      },
    P_bio_rem   : {value:P_bio_rem,   unit:"mgP/L",      },
    Ps          : {value:Ps,          unit:"mgP/L",      },
    Psa         : {value:Psa,         unit:"mgP/L",      },
    Pse         : {value:Pse,         unit:"mgP/L",      },
    P_total_rem : {value:P_total_rem, unit:"mgP/L",      },
    Nae         : {value:Nae,         unit:"mgN/L",      },
    Nne         : {value:Nne,         unit:"mgN/L",      },
    Dp1         : {value:Dp1,         unit:"mgN/L",      },
    COD_balance : {value:COD_balance, unit:"%",          },
  };

  return process_variables;
}

/*test*/
{
  //return
  //syntax:                    ( Q, VFA, FBSO, BPO, UPO, USO, iSS, FSA, OP, NOx, OHO, PAO)
  let inf = new State_Variables(25,  50,  115, 255,  10,  45,  15,  39, 15,   0,   0,   0);
  let bip = inf.bio_p_removal();
  console.log(bip);
}
