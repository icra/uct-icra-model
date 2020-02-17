/*
 * Bio P removal implementation
 * (work in progress)
*/

//load modules
try{
  State_Variables    = require("./state-variables.js");
  constants          = require("./constants.js");
  chemical_P_removal = require("./chemical-P-removal.js");
}catch(e){}

State_Variables.prototype.bio_p_removal = function(
  T, Vp, Rs, RAS, waste_from,
  system_type, S_NOx_RAS, number_of_an_zones, f_AN,
  DO, DO_RAS,
  mass_FeCl3,
){
  //===========================================================================
  // INPUTS
  //===========================================================================
    //default values
    T                  = isNaN(T         ) ? 14    : T         ; //ºC    | parameter
    Vp                 = isNaN(Vp        ) ? 21370 : Vp        ; //m3    | parameter
    Rs                 = isNaN(Rs        ) ? 20    : Rs        ; //d     | parameter
    RAS                = isNaN(RAS       ) ? 0.75  : RAS       ; //ø     | parameter
    waste_from         = waste_from || 'reactor'; //"reactor" or "sst"
    DO                 = isNaN(DO        ) ? 0     : DO        ; //mgO/L | parameter
    DO_RAS             = isNaN(DO_RAS    ) ? 0     : DO_RAS    ; //mgO/L | parameter
    system_type        = system_type || "AO (MLE)"; //string (option)
    S_NOx_RAS          = isNaN(S_NOx_RAS         )? 0.500 : S_NOx_RAS;          //mgNOx/L | NOx concentration at RAS
    number_of_an_zones = isNaN(number_of_an_zones)? 2     : number_of_an_zones; //anaerobic zones
    f_AN               = isNaN(f_AN              )? 0.1   : f_AN;               //ø | anaerobic mass fraction, different from fxt, value must be <= fxm

    //chemical P removal inputs
    mass_FeCl3 = isNaN(mass_FeCl3) ? 10 : mass_FeCl3; //kgFeCl3/d | dosed

    //input checks
    if(Vp  <= 0) throw new Error(`Reactor volume (Vp=${Vp}) not allowed`);
    if(Rs  <= 0) throw new Error(`Solids retention time (Rs=${Rs}) not allowed`);
    if(RAS <= 0) throw new Error(`SST recycle ratio (RAS=${RAS}) not allowed`);
    if(['reactor','sst'].indexOf(waste_from)==-1) throw new Error(`The input "waste_from" must be equal to "reactor" or "sst" ("${waste_from}" not allowed)`);
    if(['AO (MLE)','A2O (3 stage bardenpho)','UCT system'].indexOf(system_type)==-1){
      throw new Error(`Value of System type is not one of these three:
        ${['AO (MLE)','A2O (3 stage bardenpho)','UCT system']}`
      );
    }
    if(S_NOx_RAS          < 0) throw new Error(`Value of Recirculation NOx concentration (${S_NOx_RAS}) not allowed`);
    if(number_of_an_zones <=0) throw new Error(`Value of Number of Anaerobic Zones (${number_of_an_zones}) not allowed`);
    if(f_AN               < 0) throw new Error(`Value of Anaerobic Sludge Fraction (f_AN=${f_AN}) not allowed`);

  //influent state variables
  let Q      = this.Q;                 //ML/d    | state variable
  let S_FBSO = this.components.S_FBSO; //mgCOD/L | state variable
  let S_VFA  = this.components.S_VFA;  //mgCOD/L | state variable
  let S_USO  = this.components.S_USO;  //mgCOD/L | state variable
  let S_NOx  = this.components.S_NOx;  //mgNOx/L | state variable

  //fractionation related variables
  let frac = this.totals;                          //object  | {COD,TKN,TP,TOC,TSS}
  let FSti = Q*frac.COD.total;                     //kgCOD/d | total COD mass flux
  let Nti  = frac.TKN.total;                       //mgN/L   | total TKN mass flux
  let Pti  = frac.TP.total;                        //mgP/L   | total TP mass flux
  let Cti  = frac.TOC.total;                       //mgC/L   | total TOC influent
  let FiSS = Q*this.components.X_iSS;              //kgiSS/d | total iSS mass flux
  let Sbi  = frac.COD.bCOD;                        //mgCOD/L | bCOD = S_VFA+S_FBSO+X_BPO
  let Suse = frac.COD.usCOD;                       //mgCOD/L | usCOD
  let fSup = this.components.X_UPO/frac.COD.total; //ø       | X_UPO/Sti
  let fSus = this.components.S_USO/frac.COD.total; //ø       | S_USO/Sti

  //all mass fluxes
  let inf_fluxes = this.fluxes; //object: all mass fluxes. structure: {components, totals}

  //nitrate
  let Nne = this.components.S_NOx; //mgN/L

  //VSS mass ratios (UPO)
  const f_CV_UPO = this.mass_ratios.f_CV_UPO; //gCOD/gVSS | mass ratio
  const f_N_UPO  = this.mass_ratios.f_N_UPO;  //gN/gVSS   | mass ratio
  const f_P_UPO  = this.mass_ratios.f_P_UPO;  //gP/gVSS   | mass ratio
  const f_C_UPO  = this.mass_ratios.f_C_UPO;  //gC/gVSS   | mass ratio

  //VSS mass ratios (USO)
  const f_CV_USO = this.mass_ratios.f_CV_USO; //gCOD/gVSS | mass ratio
  const f_N_USO  = this.mass_ratios.f_N_USO;  //gN/gVSS   | mass ratio
  const f_P_USO  = this.mass_ratios.f_P_USO;  //gP/gVSS   | mass ratio
  const f_C_USO  = this.mass_ratios.f_C_USO;  //gC/gVSS   | mass ratio

  //VSS mass ratios (OHO)
  const f_CV_OHO = this.mass_ratios.f_CV_OHO; //gCOD/gVSS | mass ratio
  const f_N_OHO  = this.mass_ratios.f_N_OHO;  //gN/gVSS   | mass ratio
  const f_P_OHO  = this.mass_ratios.f_P_OHO;  //gP/gVSS   | mass ratio
  const f_C_OHO  = this.mass_ratios.f_C_OHO;  //gC/gVSS   | mass ratio

  //VSS mass ratios (PAO)
  const f_CV_PAO = this.mass_ratios.f_CV_PAO; //gCOD/gVSS | mass ratio
  const f_N_PAO  = this.mass_ratios.f_N_PAO;  //gN/gVSS   | mass ratio
  const f_P_PAO  = this.mass_ratios.f_P_PAO;  //gP/gVSS   | fraction of P in active PAO VSS
  const f_C_PAO  = this.mass_ratios.f_C_PAO;  //gC/gVSS   | mass ratio

  //kinetic constants (OHO)
  const YH     = constants.YH;       //0.66 gCOD/gCOD | heterotrophic yield coefficient (does not change with temperature)
  const fH     = constants.fH;       //0.20 ø         | endogenous OHO fraction
  const f_iOHO = constants.f_iOHO;   //0.15 giSS/gVSS | fraction of inert solids in biomass
  const bH     = constants.bH;       //0.24 1/d       | endogenous respiration rate at 20ºC
  const ϴ_bH   = constants.theta_bH; //1.029 ø        | bH temperature correction factor

  //kinetic constants (OHO) calculated
  const YHvss  = YH/f_CV_OHO;            //0.45 gVSS/gCOD
  const bHT    = bH*Math.pow(ϴ_bH,T-20); //1/d            | bH corrected by temperature

  //kinetic constants (PAO)
  const b_PAO    = constants.b_PAO;       //1/d       | PAOs endogenous residue respiration rate at 20ºC
  const ϴ_b_PAO  = constants.theta_b_PAO; //ø         | b_PAO temperature correction factor
  const f_PAO    = constants.f_PAO;       //ø         | endogenous PAO fraction
  const f_P_X_E  = constants.f_P_X_E;     //gP/gVSS   | fraction of P in the endogenous mass (OHO and PAO)
  const f_P_X_I  = constants.f_P_X_I;     //gP/gVSS   | fraction of P in inert VSS mass (UPO)
  const f_VT_PAO = constants.f_VT_PAO;    //gVSS/gTSS | fraction of PAO in TSS
  const f_P_iSS  = constants.f_P_iSS;     //gP/giSS   | fraction of P in iSS
  const f_iPAO   = constants.f_iPAO;      //giSS/gVSS | iSS content of PAOs

  //kinetic constants (PAO) calculated
  const Y_PAO   = YH/f_CV_PAO;                  //gVSS/gCOD   | ~0.45 = 0.666/1.481
  const b_PAO_T = b_PAO*Math.pow(ϴ_b_PAO,T-20); //1/d         | b_PAO corrected by temperature
  const f_XPAO  = (Y_PAO*Rs)/(1+b_PAO_T*Rs);    //gVSS·d/gCOD | PAO biomass production rate

  //FBSO related constants
  const k_v20   = constants.k_v20;              //0.070 L/mgVSS·d | note: a high value (~1000) makes FBSO effluent ~0
  const ϴ_k_v20 = constants.theta_k_v20;        //1.035 ø         | k_v20 temperature correction factor
  const k_vT    = k_v20*Math.pow(ϴ_k_v20,T-20); //L/mgVSS·d       | k_v corrected by temperature

  //COD conversion stoichiometric constants
  const i_8_6 = (5/8)*2*(32/14)/(1-YH); //gCOD/gNOx | ~8.6 (conv NOx to COD)
  const i_3_0 = 1/(1-YH);               //gCOD/gDO  | ~3.0 (conv DO to COD)

  //===========================================================================
  // EQUATIONS
  //===========================================================================
  //compute fermentables available for conversion into VFA by OHOs
  //TBD subtract FBSO not consumed also, ask george
  let S_FBSO_conv = Math.max(0,
    S_FBSO - i_8_6*(RAS*S_NOx_RAS + S_NOx) - i_3_0*(RAS*DO_RAS + DO)
  ); //mgCOD/L
  //console.log({S_FBSO, S_FBSO_conv});

  /*calculate MX_BH recursively*/
  //initial values for MX_BH calculation loop
  let S_FBSO_AN  = 0; //mgCOD/L | fermentable lost in the effluent of the last anaerobic reactor
  let F_ss_PAO   = 0; //kgCOD/d | VFA stored by PAOs
  let F_sb_OHO   = 0; //kgCOD/d | remaining bCOD for OHOs
  let MX_BH      = 0; //kgVSS   | active OHO biomass
  let MX_BH_next = 0; //kgVSS   | next iteration
  let iterations = 0; //number of iterations needed to compute MX_BH

  //OHO biomass production rate
  let f_XBH = (YHvss*Rs)/(1+bHT*Rs); //gVSS·d/gCOD

  //MX_BH calculation loop
  while(true){
    S_FBSO_AN  = S_FBSO_conv/(1+RAS)/Math.pow(1+(k_vT*(f_AN*MX_BH/(number_of_an_zones*Q*(1+RAS)))), number_of_an_zones); //mgCOD/L
    F_ss_PAO   = Math.max(0, Q*(S_FBSO_conv - (1+RAS)*S_FBSO_AN + S_VFA) ); //kgCOD/d | VFA stored by PAOs
    F_sb_OHO   = Math.max(0, Q*Sbi - F_ss_PAO);                             //kgCOD/d | remaining bCOD for OHOs
    MX_BH_next = F_sb_OHO*f_XBH;                                            //kgVSS   | active OHO biomass

    //show values for current iteration
    //console.log({S_FBSO_AN, F_ss_PAO, F_sb_OHO, MX_BH_next, MX_BH, iterations});

    //break loop if MX_BH value converged
    if(Math.abs(MX_BH-MX_BH_next)<0.00001){
      MX_BH = MX_BH_next; //update MX_BH
      break;
    }

    //update MX_BH value
    MX_BH = MX_BH_next;
    //console.log(MX_BH); //see iterations

    //max iterations, throw error
    if(++iterations>=1000){
      throw new Error(`max iterations (${iterations}) for MX_BH calculation loop reached`);
    }
  }

  //compute OHO VSS endogenous residue
  let MX_EH = fH * bHT * Rs * MX_BH; //kgVSS | endogenous residue OHOs

  //compute PAO VSS
  let MX_PAO   = f_XPAO*F_ss_PAO;         //kgVSS     | active PAO biomass
  let MX_E_PAO = f_PAO*b_PAO_T*MX_PAO*Rs; //kgVSS     | endogenous residue PAOs

  //compute f_CV_combined: VSS mass ratio for OHO+PAO
  const f_CV_combined = (function(){
    //calculate mass of VSS for OHOs and PAOs
    let OHO_VSS  = MX_BH  + MX_EH;    //kgVSS OHO
    let PAO_VSS  = MX_PAO + MX_E_PAO; //kgVSS PAO

    //calculate COD for OHO and PAO using respective f_CV
    let OHO_COD  = f_CV_OHO*OHO_VSS; //kgCOD OHO
    let PAO_COD  = f_CV_PAO*PAO_VSS; //kgCOD PAO

    //calculate new f_CV combined (OHOs + PAOs)
    const f_CV_combined = (OHO_COD + PAO_COD)/(OHO_VSS + PAO_VSS); //gCOD/gVSS

    //console.log({OHO_VSS, OHO_COD, PAO_VSS, PAO_COD, f_CV_combined});
    return f_CV_combined;
  })(); //gCOD/gVSS
  //console.log({f_CV_OHO, f_CV_PAO, f_CV_combined});

  //compute the rest of suspended solids
  let MX_I  = fSup*Rs*FSti/f_CV_combined;                              //kgVSS     | VSS inert biomass (UPO from PAOs+OHOs)
  let MX_V  = MX_BH + MX_EH + MX_I + MX_PAO + MX_E_PAO;                //kgVSS     | total VSS mass

  /*chemical P removal here*/
  //compute the influent P concentration required for sludge production
  let Ps = (f_P_OHO*(MX_BH+MX_EH+MX_E_PAO) + f_P_PAO*MX_PAO + f_P_UPO*MX_I)/(Rs*Q); //mgP/L
  if(Ps > Pti){
    console.warn(`Warning: Ps (${Ps}) > Pti (${Pti}): not enough influent TP to fill up the PAOs with polyphosphate`);
    //TBD: should this be an error instead of warning?
  }

  //compute soluble effluent organic P (unbiodegradable and biodegradable)
  let Pouse = f_P_USO*S_USO/f_CV_USO; //mgP/L
  let Pobse = 0; //mgP/L (calculate from S_b*f_P_FBSO/f_CV_FBSO) TBD

  /*compute P REMOVED*/
  let P_bio_PAO = f_P_PAO*MX_PAO/Rs/Q;                       //mgP/L | P removed by PAOs
  let P_bio_OHO = f_P_OHO*MX_BH/Rs/Q;                        //mgP/L | P removed by OHOs
  let P_bio_E   = f_P_X_E*(MX_E_PAO + MX_EH)/Rs/Q;           //mgP/L | P endogenous biomass
  let P_bio_I   = f_P_X_I*MX_I/Rs/Q;                         //mgP/L | P in X_UPO
  let P_bio_rem = P_bio_PAO + P_bio_OHO + P_bio_E + P_bio_I; //mgP/L | total bio P removal
  //bio P removal ends here ---------------------------------------------------

  //execute chemical P removal module
  //inorganic soluble P available for chemical P removal
  let Psa = Math.max(0, Pti - Ps - Pouse - Pobse - P_bio_rem); //mgP/L
  let cpr         = chemical_P_removal(Q, Psa, mass_FeCl3); //object
  let P_chem_rem  = cpr.PO4_removed.value/Q;                //mgP/L
  let F_extra_iSS = cpr.extra_iSS.value;                    //kgiSS/d
  let Pse         = cpr.PO4e.value;                         //mgP/L | PO4 effluent after chemical P removal

  //total P concentration removed = bio + chemical
  let P_total_rem = P_bio_rem + P_chem_rem; //mgP/L

  console.log({Pti, Ps, P_bio_rem, Pouse, Pobse, Psa, Pse});

  //compute iSS and TSS
  let MX_IO = FiSS*Rs + f_iOHO*MX_BH + f_iPAO*MX_PAO + F_extra_iSS*Rs; //kgiSS     | total inert solids (iSS + iOHO + iPAO + P_precipitation)
  let MX_T  = MX_V + MX_IO;                                            //kgTSS     | total TSS mass

  //solids concentrations
  let X_I  = MX_I/Vp  ||0; //kgVSS/m3 | influent uVSS
  let X_V  = MX_V/Vp  ||0; //kgVSS/m3 | total VSS conc
  let X_IO = MX_IO/Vp ||0; //kgiSS/m3 | inert solids (iSS + iOHO + P precipitation)
  let X_T  = MX_T/Vp  ||0; //kgTSS/m3 | total TSS conc

  //VSS ratios
  let f_VT    = MX_V  /MX_T ||0; //gVSS/gTSS | valor orientativo 0.80
  let f_avOHO = MX_BH /MX_V ||0; //gVSS/gVSS | fraction of active biomass in VSS
  let f_avPAO = MX_PAO/MX_V ||0; //gVSS/gVSS | fraction of active biomass in VSS
  let f_atOHO = MX_BH /MX_T ||0; //gVSS/gTSS | fraction of active biomass in TSS
  let f_atPAO = MX_PAO/MX_T ||0; //gVSS/gTSS | fraction of active biomass in TSS

  //conversion from VSS to COD (reactor concentrations)
  let X_OHO = f_CV_OHO*(MX_BH  + MX_EH   )/Vp*1000; //mgCOD/L | OHO conc in COD units
  let X_PAO = f_CV_PAO*(MX_PAO + MX_E_PAO)/Vp*1000; //mgCOD/L | PAO conc in COD units

  //secondary settler (SST) and recycle flow (RAS) equations
  let SST=(function(RAS){
    let f     = (1+RAS)/RAS;    //ø     | f=concentrating factor
    let X_RAS = f*X_T;          //kg/m3 | TSS concentration in RAS
    let Qr    = Q*RAS;          //ML/d  | RAS flowrate
    let Qw    = (Vp/Rs)/f/1000; //ML/d  | SST wastage flowrate
    return {f,X_RAS,Qr,Qw};
  })(RAS);

  //2.4 - page 12 | get the correct wastage flowrate according to "waste_from" input
  let Qw=(function(){ //ML/d | wastage flowrate
    if     (waste_from=='reactor') return (Vp/Rs)/1000;
    else if(waste_from=='sst')     return SST.Qw;
    else                           throw new Error(`waste from is "${waste_from}"`);
  })();

  //effluent flowrate
  let Qe = Q - Qw; //ML/d

  /*calculate BPO, UPO, and iSS concentrating factor in the recycle underflow*/
  let f = waste_from=='sst' ? SST.f : 1;

  //Nitrogen
  let Nai   = this.components.S_FSA; //mgN/L | total ammonia influent
  let Nobsi = frac.TKN.bsON;         //mgN/L | bsON influent (VFA + FBSO)
  let Nobpi = frac.TKN.bpON;         //mgN/L | bpON influent
  let Noupi = frac.TKN.upON;         //mgN/L | upON influent
  let Nobse = 0;                     //mgN/L | bsON effluent (not all FBSO is degraded) TODO
  let Nouse = frac.TKN.usON;         //mgN/L | usON influent = effluent

  //compute N in influent required for biomass production
  let Ns = (f_N_OHO*(MX_BH+MX_EH) + f_N_PAO*(MX_PAO+MX_E_PAO) + f_N_UPO*MX_I)/(Rs*Q); //mgN/L
  if(Ns > Nti) throw new Error(`Ns (${Ns}) > Nti (${Nti}): not enough influent TKN to produce biomass`);

  //effluent ammonia =  total TKN - Ns - usON  - bsON
  let Nae = Math.max(0, Nti       - Ns - Nouse - Nobse); //mgN/L

  //ammonia balance
  let Nae_balance = (Nae == (Nai + Nobsi + Nobpi - Ns + Noupi - Nobse)) ? 100 :
      100*Nae/(Nai + Nobsi + Nobpi - Ns + Noupi - Nobse); //percentage

  //concentration of wastage {BPO, UPO, iSS}
  //f is the concentrating factor (if we are wasting from SST) = (1+RAS)/RAS. Otherwise is 1
  //solids summary:
  //  MX_BH = FdSbi * X_BH;                         //kg_VSS | biomass production                   (OHO)
  //  MX_EH = fH * bHT * Rs * MX_BH;                //kg_VSS | endogenous residue OHOs              (OHO)
  //  MX_I  = FXti * Rs;                            //kg_VSS | unbiodegradable particulate organics (UPO)
  //  MX_V  = MX_BH + MX_EH + MX_I;                 //kg_VSS | total VSS                            (OHO+UPO)
  //  MX_IO = FiSS*Rs + f_iOHO*MX_BH + F_extra_iSS; //kg_iSS | total inert solids                   (iSS)
  //  MX_T  = MX_V + MX_IO;                         //kg_TSS | total TSS                            (OHO+UPO+iSS)
  let BPO_was = 0;                          //mg/L | BPO wastage | all BPO is turned into biomass (model assumption)
  let UPO_was = f*f_CV_UPO*(X_I)*1e3;       //mg/L | UPO wastage
  let iSS_was = f*X_IO*1000;                //mg/L | iSS wastage (precipitation by FeCl3 already included)

  let OHO_was = f*f_CV_OHO*(MX_BH +MX_EH   )/Vp*1e3; //mgCOD/L | OHO wastage
  let PAO_was = f*f_CV_PAO*(MX_PAO+MX_E_PAO)/Vp*1e3; //mgCOD/L | OHO wastage

  //output streams------------------( Q, VFA, FBSO,     BPO,     UPO,  USO,     iSS, FSA,  OP, NOx,     OHO,     PAO)
  let effluent = new State_Variables(Qe,   0,    0,       0,       0, Suse,       0, Nae, Pse, Nne,       0,       0);
  let wastage  = new State_Variables(Qw,   0,    0, BPO_was, UPO_was, Suse, iSS_was, Nae, Pse, Nne, OHO_was, PAO_was);

  //copy influent mass ratios for the new outputs
  effluent.mass_ratios = this.mass_ratios;
  wastage.mass_ratios  = this.mass_ratios;

  //get output mass fluxes (kg/d)
  let eff_fluxes = effluent.fluxes; //object
  let was_fluxes = wastage.fluxes;  //object

  //compute C in influent required for biomass production
  let Cs  = (f_C_OHO*(MX_BH+MX_EH) + f_C_PAO*(MX_PAO+MX_E_PAO) + f_C_UPO*MX_I)/(Rs*Q); //mgC/L | C influent required for sludge production
  if(Cs > Cti) throw new Error(`Cs (${Cs}) > Cti (${Cti}): not enough influent TOC to produce biomass`);

  //compute carbonaceous oxygen demand in bio P removal
  let FOc_OHO = (1 - YH)*F_sb_OHO + f_CV_OHO*(1 - fH   )*(    bHT*MX_BH  ); //kgO/d
  let FOc_PAO = (1 - YH)*F_ss_PAO + f_CV_PAO*(1 - f_PAO)*(b_PAO_T*MX_PAO ); //kgO/d
  let FOc     = FOc_OHO + FOc_PAO;                                          //kgO/d

  //compute COD balance
  //TBD we need to subtract here the FBSO not consumed also, ask george
  let exiting_COD = FOc + f_CV_combined*MX_V/Rs + Q*S_USO; //kgCOD/d
  let COD_balance = 100*exiting_COD/FSti;
  //console.log({COD_balance});

  //2.10 - TKN balance
  let FNti      = inf_fluxes.totals.TKN.total;          //kgN/d | total TKN influent
  let FNte      = eff_fluxes.totals.TKN.total;          //kgN/d | total TKN effluent
  let FNw       = was_fluxes.totals.TKN.total;          //kgN/d | total TKN wastage
  let FNout     = FNte + FNw;                           //kgN/d | total TKN out
  let N_balance = (FNout==FNti) ? 100 : 100*FNout/FNti; //percentage

  //nitrogenous oxygen demand
  const i_COD_NO3 = 64/14; //~4.57 gCOD/gN
  let FOn = i_COD_NO3*Q*Nae;  //kgO/d
  let FOt = FOc + FOn;        //kgO/d  | total oxygen demand
  let OUR = FOt/(Vp*24)*1000; //mg/L·h | oxygen uptake rate


  //2.11 - P balance
  let FPti      = inf_fluxes.totals.TP.total; //kgP/d | total TP influent
  let FPte      = eff_fluxes.totals.TP.total; //kgP/d | total TP effluent
  let FPw       = was_fluxes.totals.TP.total; //kgP/d | total TP wastage
  let FPout     = FPte + FPw;                 //kgP/d | total TP out
  let P_balance = (FPout==FPti) ? 100 : 100*FPout/FPti; //percentage

  console.log({FPti, FPte, FPw, FPout})

  //check if Ps i equal to P_bio_rem
  console.log({Ps, P_bio_rem}); //mgP/L | they should be equal

  //compute f_P_PAO_calculated
  //note: f_P_PAO_calculated should be lower than f_P_PAO (0.38)
  let f_P_PAO_calculated = (Q*Pti*Rs - f_P_OHO*(MX_BH+MX_EH+MX_E_PAO) - f_P_UPO*MX_I)/MX_PAO; //gP/gVSS
  //console.log({f_P_PAO, f_P_PAO_calculated});
  if(f_P_PAO_calculated > f_P_PAO){
    console.warn(`Warning: f_P_PAO_calculated (${f_P_PAO_calculated}) > f_P_PAO (${f_P_PAO}) [gP/gVSS]`);
    //TBD: should this be an error instead of warning?
  }

  /*calculate mass of iSS*/
  //fraction of fixed inorganic suspended solids of PAO
  let f_iPAO_calculated = f_iOHO + 3.268*f_P_PAO_calculated; //giSS/gVSS
  //(3.268 is experimental value)

  //max value is f_iPAO = 1.3 giSS/gVSS
  if(f_iPAO_calculated > f_iPAO){
    console.warn(`Warning: f_iPAO_calculated (${f_iPAO_calculated}) > f_iPAO (${f_iPAO}) [giSS/gVSS]`);
  }

  //total inert solids = iSS     + iOHO         + iPAO                     + precipitation
  let MX_IO_calculated = FiSS*Rs + f_iOHO*MX_BH + f_iPAO_calculated*MX_PAO + F_extra_iSS*Rs; //kgiSS
  //  MX_IO            = FiSS*Rs + f_iOHO*MX_BH + f_iPAO*MX_PAO            + F_extra_iSS*Rs; //kgiSS
  console.log({f_iPAO, f_iPAO_calculated, MX_IO, MX_IO_calculated});

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
  console.log({system_type});

  //fraction of P in TSS
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


  /*
    modification for Dp1 (denitrification potential)
    when there is bio P removal
  */
  let Dp1 = (function(){ //mgN/L
    let r         = 0;                               //recirculation from anoxic to anaerobic reactor
    let fxm       = 0.5;                             //ø | get value from "nitrification.js"
    let fx1       = fxm - f_AN;                      //ø
    let K2_20_PAO = 0.255;                           //gN/gVSS·d
    let K2T_PAO   = K2_20_PAO*Math.pow(1.080, T-20); //gN/gVSS·d

    //note: 40/14 is ≈ 2.86 stoichiometric constant (gCOD/gN) NO3 reduction to N2
    let Dp1 = S_FBSO_AN*(1+r)*(1-YH)/(40/14) +
              fx1*K2T_PAO*(F_sb_OHO/Q)*(YH/f_CV_OHO)/(1+bHT*Rs);

    return Dp1;
  })();

  //nominal hydraulic retention time
  let HRT = Vp/(Q*1000)*24; //h

  //bio P results
  let process_variables = {
    S_FBSO_conv : {value:S_FBSO_conv, unit:"mgCOD/L",    },
    S_FBSO_AN   : {value:S_FBSO_AN,   unit:"mgCOD/L",    },
    F_ss_PAO    : {value:F_ss_PAO,    unit:"kgCOD/d",    },
    F_sb_OHO    : {value:F_sb_OHO,    unit:"kgCOD/d",    },
    iterations  : {value:iterations,  unit:"iterations", },
    b_PAO_T     : {value:b_PAO_T,     unit:"1/d",        },
    MX_PAO      : {value:MX_PAO,      unit:"kgVSS",      },
    MX_E_PAO    : {value:MX_E_PAO,    unit:"kgVSS",      },
    P_bio_E     : {value:P_bio_E,     unit:"mgP/L",      },
    P_bio_I     : {value:P_bio_I,     unit:"mgP/L",      },
    P_bio_OHO   : {value:P_bio_OHO,   unit:"mgP/L",      },
    P_bio_PAO   : {value:P_bio_PAO,   unit:"mgP/L",      },
    P_bio_rem   : {value:P_bio_rem,   unit:"mgP/L",      },
    P_total_rem : {value:P_total_rem, unit:"mgP/L",      },
    f_P_TSS     : {value:f_P_TSS,     unit:"gP/gTSS",    },
    f_XPAO      : {value:f_XPAO,      unit:"gVSS·d/gCOD",},
    Dp1         : {value:Dp1,         unit:"mgN/L",      },

    //activated sludge process variables copied
    YHvss   :{value:YHvss,     unit:"gVSS/gCOD",   descr:"Heterotrophic yield coefficient"},
    fSus    :{value:fSus,      unit:"gUSO/gCOD",   descr:"USO/COD ratio (influent)"},
    fSup    :{value:fSup,      unit:"gUPO/gCOD",   descr:"UPO/COD ratio (influent)"},
    k_vT    :{value:k_vT,      unit:"L/mgVSS·d",   descr:"k_v20 corrected by temperature"},
    Ns      :{value:Ns,        unit:"mgN/L",       descr:"N required for sludge production"},
    Ps      :{value:Ps,        unit:"mgN/L",       descr:"P required for sludge production"},
    Cs      :{value:Cs,        unit:"mgC/L",       descr:"C required for sludge production"},
    HRT     :{value:HRT,       unit:"hour",        descr:"Nominal Hydraulic Retention Time"},
    bHT     :{value:bHT,       unit:"1/d",         descr:"OHO Endogenous respiration rate corrected by temperature"},
    f_XBH   :{value:f_XBH,     unit:"gVSS·d/gCOD", descr:"OHO Biomass production rate"},
    MX_BH   :{value:MX_BH,     unit:"kgVSS",       descr:"OHO Biomass produced VSS"},
    MX_EH   :{value:MX_EH,     unit:"kgVSS",       descr:"OHO Endogenous residue VSS"},
    MX_I    :{value:MX_I,      unit:"kgVSS",       descr:"Unbiodegradable organics VSS"},
    MX_V    :{value:MX_V,      unit:"kgVSS",       descr:"Volatile Suspended Solids"},
    MX_IO   :{value:MX_IO,     unit:"kgiSS",       descr:"Inert Solids (influent+biomass)"},
    MX_T    :{value:MX_T,      unit:"kgTSS",       descr:"Total Suspended Solids"},
    X_V     :{value:X_V,       unit:"kgVSS/m3",    descr:"VSS concentration in SST"},
    X_T     :{value:X_T,       unit:"kgTSS/m3",    descr:"TSS concentration in SST"},
    f_VT    :{value:f_VT,      unit:"gVSS/gTSS",   descr:"VSS/TSS ratio"},
    f_avOHO :{value:f_avOHO,   unit:"gOHO/gVSS",   descr:"Active fraction of the sludge (VSS)"},
    f_atOHO :{value:f_atOHO,   unit:"gOHO/gTSS",   descr:"Active fraction of the sludge (TSS)"},
    f_avPAO :{value:f_avPAO,   unit:"gPAO/gVSS",   descr:"Active fraction of the sludge (VSS)"},
    f_atPAO :{value:f_atPAO,   unit:"gPAO/gTSS",   descr:"Active fraction of the sludge (TSS)"},
    FOc     :{value:FOc,       unit:"kgO/d",       descr:"Carbonaceous Oxygen Demand"},
    FOn     :{value:FOn,       unit:"kgO/d",       descr:"Nitrogenous Oxygen Demand"},
    FOt     :{value:FOt,       unit:"kgO/d",       descr:"Total Oxygen Demand"},
    OUR     :{value:OUR,       unit:"mgO/L·h",     descr:"Oxygen Uptake Rate"},
    Qr      :{value:SST.Qr,    unit:"ML/d",        descr:"SST recycle flowrate"},
    f_RAS   :{value:SST.f,     unit:"ø",           descr:"SST concentrating factor"},
    X_RAS   :{value:SST.X_RAS, unit:"kg/m3",       descr:"SST recycle flow TSS concentration"},
    f       :{value:f,         unit:"ø",           descr:"Wastage concentrating factor"},
    COD_balance :{value:COD_balance, unit:"%", descr:"COD balance"},
    N_balance   :{value:N_balance,   unit:"%", descr:"N balance"},
    Nae_balance :{value:Nae_balance, unit:"%", descr:"Ammonia balance"},
    P_balance   :{value:P_balance,   unit:"%", descr:"P balance"},
  };

  return {
    process_variables,
    cpr,               //chemical P removal process variables
    effluent,          //State_Variables object
    wastage,           //State_Variables object
  }
}

/*test*/
{
  //return
  //syntax:                    ( Q, VFA, FBSO, BPO, UPO, USO, iSS, FSA, OP, NOx, OHO, PAO)
  let inf = new State_Variables(15,  22,  124, 439, 112,  53,  49,  39, 12,   0,   0,   0);
  //console.log(inf.totals);
  //console.log(inf.fluxes);

  let bip = inf.bio_p_removal();
  console.log(bip.process_variables);
}
