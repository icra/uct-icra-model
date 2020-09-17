/*
  Bio P removal implementation
  configuration (recycle not drawn):
  +------------------------------------------------------------------------------+
  | Qi → [Anaerobic reactor] → [Anoxic reactor] → [Aerobic reactor] → [SST] → Qe |
  |                                                      ↓                       |
  |                                                      Qw                      |
  +------------------------------------------------------------------------------+
  or
  +------------------------------------------------------------------------------+
  | Qi → [Anaerobic reactor] → [Anoxic reactor] → [Aerobic reactor] → [SST] → Qe |
  |                                                                     ↓        |
  |                                                                     Qw       |
  +------------------------------------------------------------------------------+
*/

//load modules
try{
  State_Variables             = require("./state-variables.js");
  constants                   = require("./constants.js");
  chemical_P_removal          = require("./chemical-P-removal.js");
  chemical_P_removal_improved = require("./chemical-P-removal-improved.js");
}catch(e){}

State_Variables.prototype.bio_p_removal=function(parameters){
  //===========================================================================
  // PARAMETERS
  //===========================================================================
    let T          = parameters.T;          //ºC      | Temperature
    let Vp         = parameters.Vp;         //m3      | Volume of reactor
    let Rs         = parameters.Rs;         //days    | Solids Retention Time or Sludge Age
    let DO         = parameters.DO;         //mg/L    | DO in the aerobic reactor
    let RAS        = parameters.RAS;        //ø       | SST underflow recycle ratio
    let waste_from = parameters.waste_from; //string  | origin of wastage ('sst' or 'reactor')
    let mass_MeCl3 = parameters.mass_MeCl3; //kg/d    | mass of FeCl3 added for P precipitation
    let ideal_sst  = parameters.ideal_sst;  //ideality of the SST (number between 0 and infinite)

    //bio P specific inputs
    let S_NOx_RAS  = parameters.S_NOx_RAS;  //mgNOx/L | NOx concentration at RAS
    let DO_RAS     = parameters.DO_RAS;     //mgO/L   | Dissolved oxygen at recycle
    let IR         = parameters.IR;         //ø       | aerobic to anoxic recycle ratio
    let f_AN       = parameters.f_AN;       //ø       | anaerobic mass fraction, different from fxt, value must be <= fxm
    let an_zones   = parameters.an_zones;   //number of anaerobic zones

    //check undefined parameters
      if(undefined==T         ) throw new Error(`T          is undefined`);
      if(undefined==Vp        ) throw new Error(`Vp         is undefined`);
      if(undefined==Rs        ) throw new Error(`Rs         is undefined`);
      if(undefined==DO        ) throw new Error(`DO         is undefined`);
      if(undefined==RAS       ) throw new Error(`RAS        is undefined`);
      if(undefined==waste_from) throw new Error(`waste_from is undefined`);
      if(undefined==mass_MeCl3) throw new Error(`mass_MeCl3 is undefined`);
      if(undefined==ideal_sst)  throw new Error(`ideal_sst  is undefined`);
      if(undefined==S_NOx_RAS ) throw new Error(`S_NOx_RAS  is undefined`);
      if(undefined==DO_RAS    ) throw new Error(`DO_RAS     is undefined`);
      if(undefined==IR        ) throw new Error(`IR         is undefined`);
      if(undefined==f_AN      ) throw new Error(`f_AN       is undefined`);
      if(undefined==an_zones  ) throw new Error(`an_zones   is undefined`);

    //check variable types
      if("number"!=typeof T         ) throw new Error(`T          is not a number`);
      if("number"!=typeof Vp        ) throw new Error(`Vp         is not a number`);
      if("number"!=typeof Rs        ) throw new Error(`Rs         is not a number`);
      if("number"!=typeof DO        ) throw new Error(`DO         is not a number`);
      if("number"!=typeof RAS       ) throw new Error(`RAS        is not a number`);
      if("string"!=typeof waste_from) throw new Error(`waste_from is not a string`);
      if("number"!=typeof mass_MeCl3) throw new Error(`mass_MeCl3 is not a number`);
      if("number"!=typeof ideal_sst ) throw new Error(`ideal_sst  is not a number`);
      if("number"!=typeof S_NOx_RAS ) throw new Error(`S_NOx_RAS  is not a number`);
      if("number"!=typeof DO_RAS    ) throw new Error(`DO_RAS     is not a number`);
      if("number"!=typeof IR        ) throw new Error(`IR         is not a number`);
      if("number"!=typeof f_AN      ) throw new Error(`f_AN       is not a number`);
      if("number"!=typeof an_zones  ) throw new Error(`an_zones   is not a number`);

    //numerical checks for physical sense
      if(T   > 50)      throw new Error(`Value of Temperature (T=${T}) not allowed`);
      if(Vp  <= 0)      throw new Error(`Value of Reactor volume (Vp=${Vp}) not allowed`);
      if(Rs  <= 0)      throw new Error(`Value of Solids retention time (Rs=${Rs}) not allowed`);
      if(RAS <= 0)      throw new Error(`Value of SST recycle ratio (RAS=${RAS}) not allowed`);
      if(ideal_sst < 0) throw new Error(`Value of ideal_sst (${ideal_sst}) not allowed`);

      //DO: between 0 and 15 (checked at ecoinvent)
      if(DO     < 0 || DO > 15) throw new Error(`Value of Dissolved oxygen (DO=${DO}) not allowed`);
      if(DO_RAS < 0 || DO > 15) throw new Error(`Value of DO in RAS recycle (DO_RAS=${DO_RAS}) not allowed`);

      if(S_NOx_RAS <  0) throw new Error(`Value of Recirculation NOx concentration (${S_NOx_RAS}) not allowed`);
      if(IR        <  0) throw new Error(`Value of Aerobic to anoxic recycle ratio (IR=${IR}) not allowed`);
      if(an_zones  <  0) throw new Error(`Value of Number of Anaerobic Zones (${an_zones}) not allowed`);

      //f_AN: between 0 and 1
      if(f_AN <= 0 || f_AN>=1) throw new Error(`Value of Anaerobic Sludge Fraction (f_AN=${f_AN}) not allowed`);

      //waste_from: 'reactor' or 'sst'
      if(['reactor','sst'].indexOf(waste_from)==-1){
        throw new Error(`The input "waste_from" must be equal to "reactor" or "sst" ("${waste_from}" not allowed)`);
      }

  //influent state variables
  let Q      = this.Q;                 //ML/d    | flowrate
  let S_VFA  = this.components.S_VFA;  //mgCOD/L | volatile fatty acids (BSO)
  let S_FBSO = this.components.S_FBSO; //mgCOD/L | fermentable biodeg soluble organics (BSO)
  let S_USO  = this.components.S_USO;  //mgCOD/L | unbiodeg soluble organics
  let X_UPO  = this.components.X_UPO;  //mgCOD/L | influent unbiodegradable particulate organics (UPO)
  let S_NOx  = this.components.S_NOx;  //mgNOx/L | influent nitrate and nitrite
  let S_O2   = this.components.S_O2;   //mgO2/L  | influent dissolved oxygen

  //influent fractionation objects
  let inf_frac = this.totals; //all concentrations. structure: {COD,TKN,TP,TOC,TSS}
  let inf_flux = this.fluxes; //all mass fluxes. structure: {components, totals}

  //COD fractions
  let FSti = inf_flux.totals.COD.total;   //kgCOD/d | influent total COD mass flux
  let FSbi = inf_flux.totals.COD.bCOD;    //kgCOD/d | influent bCOD (S_VFA + S_FBSO + X_BPO)
  let fSup = X_UPO/inf_frac.COD.total||0; //ø       | influent X_UPO/Sti ratio
  let fSus = S_USO/inf_frac.COD.total||0; //ø       | influent S_USO/Sti ratio

  //influent iSS and inert VSS mass fluxes
  let FiSS = inf_flux.totals.TSS.iSS;   //kgiSS/d | influent iSS
  let FXti = inf_flux.totals.TSS.uVSS;  //kgVSS/d | influent unbiodegradable VSS

  //VSS mass ratios
  const f_CV_UPO = this.mass_ratios.f_CV_UPO; //gCOD/gVSS
  const f_CV_OHO = this.mass_ratios.f_CV_OHO; //gCOD/gVSS
  const f_CV_PAO = this.mass_ratios.f_CV_PAO; //gCOD/gVSS
  const f_N_UPO  = this.mass_ratios.f_N_UPO;  //gN/gVSS
  const f_N_OHO  = this.mass_ratios.f_N_OHO;  //gN/gVSS
  const f_N_PAO  = this.mass_ratios.f_N_PAO;  //gN/gVSS
  const f_C_UPO  = this.mass_ratios.f_C_UPO;  //gC/gVSS
  const f_C_OHO  = this.mass_ratios.f_C_OHO;  //gC/gVSS
  const f_C_PAO  = this.mass_ratios.f_C_PAO;  //gC/gVSS
  const f_P_UPO  = this.mass_ratios.f_P_UPO;  //gP/gVSS
  const f_P_OHO  = this.mass_ratios.f_P_OHO;  //gP/gVSS
  const f_P_PAO  = this.mass_ratios.f_P_PAO;  //gP/gVSS

  //kinetic constants (OHO)
  const YH     = constants.YH;           //0.66 gCOD/gCOD | heterotrophic yield coefficient (does not change with temperature)
  const YHvss  = YH/f_CV_OHO;            //0.45 gVSS/gCOD | YH expressed as VSS/COD yield
  const f_iOHO = constants.f_iOHO;       //0.15 giSS/gVSS | fraction of inert solids in biomass
  const fH     = constants.fH;           //0.20 ø         | endogenous OHO fraction
  const bH     = constants.bH;           //0.24 1/d       | endogenous respiration rate at 20ºC
  const ϴ_bH   = constants.ϴ_bH;         //1.029 ø        | bH temperature correction factor
  const bHT    = bH*Math.pow(ϴ_bH,T-20); //1/d            | bH corrected by temperature

  //kinetic constants (PAO)
  const Y_PAO   = YH/f_CV_PAO;                  //gVSS/gCOD | ~0.45 = 0.666/1.481
  const f_iPAO  = constants.f_iPAO;             //giSS/gVSS | iSS content of PAOs
  const f_PAO   = constants.f_PAO;              //ø         | endogenous PAO fraction
  const b_PAO   = constants.b_PAO;              //1/d       | PAOs endogenous residue respiration rate at 20ºC
  const ϴ_b_PAO = constants.ϴ_b_PAO;            //ø         | b_PAO temperature correction factor
  const b_PAO_T = b_PAO*Math.pow(ϴ_b_PAO,T-20); //1/d       | b_PAO corrected by temperature

  //P in iSS mass fraction
  const f_P_iSS = constants.f_P_iSS; //0.02  gP/giSS   | fraction of P in iSS

  //FBSO constants
  const k_v20   = constants.k_v20;              //0.070 L/mgVSS·d | note: a high value (~1000) makes FBSO effluent ~0
  const ϴ_k_v20 = constants.ϴ_k_v20;            //1.035 ø         | k_v20 temperature correction factor
  const k_vT    = k_v20*Math.pow(ϴ_k_v20,T-20); //L/mgVSS·d       | k_v corrected by temperature

  //COD conversion (stoichiometric constants)
  const i_8_6 = (5/8)*2*(32/14)/(1-YH); //gCOD/gNOx | ~8.6 (conv NOx to COD)
  const i_3_0 = 1/(1-YH);               //gCOD/gDO  | ~3.0 (conv DO  to COD)

  //===========================================================================
  // EQUATIONS
  //===========================================================================
  //compute nominal hydraulic retention time
  let HRT=Vp/(Q*1000)*24; //h

  //compute S_FBSO available for OHOs to turn into S_VFA
  //TODO subtract FBSO not consumed also ("Sbse"), confirm with George
  let S_FBSO_conv = Math.max(0,
    S_FBSO - i_8_6*(RAS*S_NOx_RAS + S_NOx) - i_3_0*(RAS*DO_RAS + S_O2)
  ); //mgCOD/L
  //console.log({S_FBSO, S_FBSO_conv});

  /*calculate MX_BH recursively (loop)*/
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
    S_FBSO_AN  = S_FBSO_conv/(1+RAS)/Math.pow(1+(k_vT*(f_AN*MX_BH/(an_zones*Q*(1+RAS)))), an_zones); //mgCOD/L
    F_ss_PAO   = Math.max(0, Q*(S_FBSO_conv - (1+RAS)*S_FBSO_AN + S_VFA) ); //kgCOD/d | VFA stored by PAOs
    F_sb_OHO   = Math.max(0, FSbi - F_ss_PAO);                              //kgCOD/d | remaining bCOD for OHOs
    MX_BH_next = F_sb_OHO*f_XBH;                                            //kgVSS   | active OHO biomass

    //(debugging) show current iteration
    //console.log({S_FBSO_AN, F_ss_PAO, F_sb_OHO, MX_BH_next, MX_BH, iterations});

    //end loop if MX_BH value is found (converged)
    if(Math.abs(MX_BH-MX_BH_next)<0.00001){
      MX_BH = MX_BH_next; //update MX_BH
      break;
    }

    //update MX_BH value
    MX_BH = MX_BH_next;
    //console.log(MX_BH); //see iterations

    //end loop if max iterations done (throw error)
    if(++iterations>=1000){
      throw new Error(`max iterations (${iterations}) for MX_BH calculation loop reached`);
    }
  }

  //compute OHO VSS endogenous residue
  let MX_EH = fH*bHT*MX_BH*Rs; //kgVSS

  //compute PAO VSS (active and endogenous biomass)
  let f_XPAO   = (Y_PAO*Rs)/(1 + b_PAO_T*Rs); //gVSS·d/gCOD | PAO biomass production rate
  let MX_PAO   = f_XPAO*F_ss_PAO;             //kgVSS       | active PAO biomass
  let MX_E_PAO = f_PAO*b_PAO_T*MX_PAO*Rs;     //kgVSS       | endogenous residue PAOs

  //compute f_CV_combined: VSS mass ratio for OHO+PAO
  const f_CV_combined=(function(){
    //calculate mass of VSS for OHOs and PAOs
    let OHO_VSS  = MX_BH  + MX_EH;    //kgVSS OHO
    let PAO_VSS  = MX_PAO + MX_E_PAO; //kgVSS PAO

    //calculate COD for OHO and PAO using respective f_CV
    let OHO_COD  = f_CV_OHO*OHO_VSS; //kgCOD OHO
    let PAO_COD  = f_CV_PAO*PAO_VSS; //kgCOD PAO

    //calculate new f_CV combined (OHOs + PAOs)
    const f_CV_combined = (OHO_COD + PAO_COD)/(OHO_VSS + PAO_VSS)||0; //gCOD/gVSS

    //console.log({OHO_VSS, OHO_COD, PAO_VSS, PAO_COD, f_CV_combined});
    return f_CV_combined;
  })(); //gCOD/gVSS
  //console.log({f_CV_OHO, f_CV_PAO, f_CV_combined});

  //compute the rest of suspended solids
  let MX_I = FXti*Rs;                                  //kgVSS | VSS inert biomass (UPO)
  let MX_V = MX_BH + MX_EH + MX_I + MX_PAO + MX_E_PAO; //kgVSS | total VSS mass

  //compute the influent P concentration required for sludge production
  let Pti = inf_frac.TP.total; //mgP/L | total TP influent concentration
  let Ps  = (f_P_OHO*MX_BH + f_P_PAO*MX_PAO + f_P_UPO*(MX_I + MX_EH + MX_E_PAO))/(Rs*Q); //mgP/L

  if(Ps > Pti){
    throw new Error(`Ps (${Ps}) > Pti (${Pti}): not enough influent TP to fill up the PAOs with polyphosphate`);
    //TODO: should this be an error instead of warning?
  }

  //effluent organic P (soluble = bsOP, usOP)
  let Pouse = inf_frac.TP.usOP;
  let Pobse = 0; //mgP/L (calculate from Sbse*f_P_FBSO/f_CV_FBSO) TODO

  /*compute bio P removal fractions (PAO, OHO, E, I)*/
  const f_PO4_rel = constants.f_PO4_rel;                       //0.5 gP/gCOD | ratio P release/VFA uptake (1molP/1molCOD)
  let PO4_release = f_PO4_rel*F_ss_PAO/Q;                      //mgP/L of influent
  let P_bio_PAO   = f_P_PAO*MX_PAO/Rs/Q;                       //mgP/L | P removed by PAOs
  let P_bio_OHO   = f_P_OHO*MX_BH/Rs/Q;                        //mgP/L | P removed by OHOs
  let P_bio_E     = f_P_UPO*(MX_E_PAO + MX_EH)/Rs/Q;           //mgP/L | P endogenous biomass
  let P_bio_I     = f_P_UPO*MX_I/Rs/Q;                         //mgP/L | P in X_UPO
  let P_bio_rem   = P_bio_PAO + P_bio_OHO + P_bio_E + P_bio_I; //mgP/L | total bio P removal
  //console.log({PO4_release, P_bio_PAO, P_bio_OHO, P_bio_E, P_bio_I, P_bio_rem});

  /*chemical P removal (module)*/
  //compute Psa: inorganic soluble P available for chemical P removal
  let Psa         = Math.max(0, Pti - Ps - Pouse - Pobse);  //mgP/L
  let cpr         = chemical_P_removal({Q, PO4i:Psa, mass_MeCl3}); //object | chemical P removal results
  let P_chem_rem  = cpr.PO4_removed.value/Q;                //mgP/L
  let F_extra_iSS = cpr.extra_iSS.value;                    //kgiSS/d precipitation
  let Pse         = cpr.PO4e.value;                         //mgP/L | PO4 effluent after chemical P removal
  /*
  console.log(cpr);
  console.log({
    Pti,
    Ps,
    P_bio_rem,
    Psa,
    mass_MeCl3,
    P_chem_rem,
    Pse,
    Pobse,
    Pouse,
  });
  */

  //chemical P removal improved TODO
  parameters.Q = Q;
  parameters.PO4i = Psa;
  let cpr_v2  = chemical_P_removal_improved(parameters); //object
  P_chem_rem  = cpr_v2.PO4_removed.value/Q;              //mgP/L
  F_extra_iSS = cpr_v2.extra_iSS.value;                  //kgiSS/d
  Pse         = cpr_v2.PO4e.value;                       //mgP/L | PO4 effluent after chemical P removal
  delete parameters.Q;
  delete parameters.PO4i;

  //total P concentration removed = bio + chemical
  let P_total_rem = P_bio_rem + P_chem_rem; //mgP/L

  //compute iSS and TSS
  let MX_IO = FiSS*Rs + f_iOHO*MX_BH + f_iPAO*MX_PAO + F_extra_iSS*Rs; //kgiSS | total inert solids (iSS + iOHO + iPAO + P_precipitation)
  let MX_T  = MX_V + MX_IO;                                            //kgTSS | total TSS mass

  //compute all solids concentrations
  let X_I  = MX_I/Vp  ||0; //kgVSS/m3 | influent uVSS conc
  let X_V  = MX_V/Vp  ||0; //kgVSS/m3 | total VSS conc
  let X_IO = MX_IO/Vp ||0; //kgiSS/m3 | inert solids (iSS+iOHO+iPAO+P_precipitation) conc
  let X_T  = MX_T/Vp  ||0; //kgTSS/m3 | total TSS conc

  //VSS ratios (a:active, v:vss, t:tss)
  let f_VT     = MX_V  /MX_T ||0;     //gVSS/gTSS | ratio VSS/TSS (orientative value ~0.80)
  let f_AV_OHO = MX_BH /MX_V ||0;     //gVSS/gVSS | ratio active biomass in VSS (OHO)
  let f_AV_PAO = MX_PAO/MX_V ||0;     //gVSS/gVSS | ratio active biomass in VSS (PAO)
  let f_AT_OHO = MX_BH /MX_T ||0;     //gVSS/gTSS | ratio active biomass in TSS (OHO)
  let f_AT_PAO = MX_PAO/MX_T ||0;     //gVSS/gTSS | ratio active biomass in TSS (PAO)
  let f_AV     = f_AV_OHO + f_AV_PAO; //gVSS/gVSS | ratio active biomass in VSS (OHO+PAO)
  let f_AT     = f_AT_OHO + f_AT_PAO; //gVSS/gTSS | ratio active biomass in TSS (OHO+PAO)

  /*Nitrogen*/
  let Nai   = this.components.S_NH4; //mgN/L | total ammonia influent
  let Nobsi = inf_frac.TKN.bsON;     //mgN/L | bsON influent (VFA + FBSO)
  let Nobpi = inf_frac.TKN.bpON;     //mgN/L | bpON influent
  let Noupi = inf_frac.TKN.upON;     //mgN/L | upON influent
  let Nobse = 0;                     //mgN/L | bsON effluent (not all FBSO is degraded) TODO
  let Nouse = inf_frac.TKN.usON;     //mgN/L | usON influent = effluent

  //compute influent N required for biomass production
  let Nti = inf_frac.TKN.total; //mgN/L | influent TKN concentration
  let Ns  = (f_N_OHO*MX_BH + f_N_PAO*MX_PAO + f_N_UPO*(MX_I+MX_EH+MX_E_PAO))/(Rs*Q); //mgN/L
  if(Ns > Nti) throw new Error(`Ns (${Ns}) > Nti (${Nti}): not enough influent TKN to produce biomass`);

  //effluent ammonia =  TKN - Ns - usON  - bsON
  let Nae = Math.max(0, Nti - Ns - Nouse - Nobse); //mgN/L

  //ammonia balance
  let Nae_balance = (Nae == (Nai + Nobsi + Nobpi - Ns + Noupi - Nobse)) ? 100 :
      100*Nae/(Nai + Nobsi + Nobpi - Ns + Noupi - Nobse); //percentage

  /*Carbon*/
  //compute influent C required for biomass production
  let Cti = inf_frac.TOC.total; //mgC/L | total TOC influent concentration
  let Cs  = (f_C_OHO*MX_BH + f_C_PAO*MX_PAO + f_C_UPO*(MX_I+MX_EH+MX_E_PAO))/(Rs*Q); //mgC/L
  if(Cs > Cti) throw new Error(`Cs (${Cs}) > Cti (${Cti}): not enough influent TOC to produce biomass`);

  //secondary settler (SST) and recycle flow (RAS) equations
  let SST=(function(RAS){
    let f     = ideal_sst*(1+RAS)/RAS; //ø     | f=concentrating factor
    let X_RAS = f*X_T;                 //kg/m3 | TSS concentration in RAS
    let Qr    = Q*RAS;                 //ML/d  | RAS flowrate
    let Qw    = (Vp/Rs)/f/1000;        //ML/d  | SST wastage flowrate
    return {f,X_RAS,Qr,Qw};
  })(RAS);

  //compute wastage flowrate according to "waste_from" input
  let Qw=(function(){ //ML/d | wastage flowrate
    if     (waste_from=='reactor') return (Vp/Rs)/1000;
    else if(waste_from=='sst')     return SST.Qw;
    else                           throw new Error(`waste from is "${waste_from}"`);
  })();

  //effluent flowrate
  let Qe = Q - Qw; //ML/d

  /*compute BPO, UPO, and iSS concentrating factor in the recycle underflow*/
  let f_was   = waste_from=='sst' ? SST.f : 1;           //ø       | RAS concentrating factor
  let BPO_was = 0;                                       //mgCOD/L | BPO wastage | all BPO is turned into biomass (model assumption)
  let UPO_was = f_was*f_CV_UPO*X_I*1e3;                  //mgCOD/L | UPO wastage
  let iSS_was = f_was*X_IO*1e3;                          //mgiSS/L | iSS wastage (precipitation by FeCl3 already included)
  let OHO_was = f_was*f_CV_OHO*(MX_BH +MX_EH   )/Vp*1e3; //mgCOD/L | OHO wastage
  let PAO_was = f_was*f_CV_PAO*(MX_PAO+MX_E_PAO)/Vp*1e3; //mgCOD/L | PAO wastage

  //output streams------------------( Q, VFA, FBSO,     BPO,     UPO,   USO,     iSS, FSA,  OP,   NOx, O2,     OHO,     PAO)
  let effluent = new State_Variables(Qe,   0,    0,       0,       0, S_USO,       0, Nae, Pse, S_NOx, DO,       0,       0);
  let wastage  = new State_Variables(Qw,   0,    0, BPO_was, UPO_was, S_USO, iSS_was, Nae, Pse, S_NOx, DO, OHO_was, PAO_was);

  //copy influent mass ratios for the new outputs
  effluent.mass_ratios = Object.assign({}, this.mass_ratios);
  wastage .mass_ratios = Object.assign({}, this.mass_ratios);

  //recalculate f_P_PAO mass ratio (since PAO mass is MX_PAO + MX_E_PAO)
  //and they have different P content
  let f_P_PAO_combined = (f_P_PAO*MX_PAO + f_P_UPO*MX_E_PAO)/(MX_PAO + MX_E_PAO)||0;
  //console.log({f_P_PAO_combined});

  //overwrite wastage f_P_PAO
  wastage.mass_ratios.f_P_PAO = f_P_PAO_combined;

  //get output mass fluxes (kg/d) (with the new f_P_PAO value)
  let eff_flux = effluent.fluxes; //object
  let was_flux = wastage.fluxes;  //object

  //COD balance
  //compute carbonaceous oxygen demand
  let FOc_OHO = (1 - YH)*F_sb_OHO + f_CV_OHO*(1 - fH   )*(    bHT*MX_BH  ); //kgO/d
  let FOc_PAO = (1 - YH)*F_ss_PAO + f_CV_PAO*(1 - f_PAO)*(b_PAO_T*MX_PAO ); //kgO/d
  let FOc     = FOc_OHO + FOc_PAO;                                          //kgO/d

  //TODO subtract Sbse, confirm with george
  let exiting_COD = FOc + f_CV_combined*MX_V/Rs + Q*S_USO; //kgCOD/d
  let COD_balance = (exiting_COD==FSti) ? 100 : 100*exiting_COD/FSti;

  //TKN balance
  let FNti      = inf_flux.totals.TKN.total;            //kgN/d | total TKN influent
  let FNte      = eff_flux.totals.TKN.total;            //kgN/d | total TKN effluent
  let FNw       = was_flux.totals.TKN.total;            //kgN/d | total TKN wastage
  let FNout     = FNte + FNw;                           //kgN/d | total TKN out
  let N_balance = (FNout==FNti) ? 100 : 100*FNout/FNti; //percentage

  //nitrogenous oxygen demand
  const i_COD_NO3 = 64/14;    //~4.57 gCOD/gN
  let FOn = i_COD_NO3*Q*Nae;  //kgO/d
  let FOt = FOc + FOn;        //kgO/d  | total oxygen demand
  let OUR = FOt/(Vp*24)*1000; //mg/L·h | oxygen uptake rate

  //P balance
  let FPti       = inf_flux.totals.TP.total;             //kgP/d | total TP influent
  let FPte       = eff_flux.totals.TP.total;             //kgP/d | total TP effluent
  let FPw        = was_flux.totals.TP.total;             //kgP/d | total TP wastage
  let FPremoved  = cpr_v2.PO4_removed.value;             //kgP/d | PO4 removed by FeCl3
  let FPout      = FPte + FPw + FPremoved;               //kgP/d | total TP out
  let P_balance  = (FPout==FPti) ? 100 : 100*FPout/FPti; //percentage
  //console.log({P_balance,FPti,FPout,FPte,FPw,FPremoved});

  //===========================================================================
  //CALCULATED FRACTIONS
  //===========================================================================

  /*1. compute f_P_PAO (0.38 gP/gVSS) | only for active VSS mass*/
  //note: f_P_PAO_calculated should be lower than f_P_PAO (0.38)
  let f_P_PAO_calculated = (Q*Pti*Rs - Q*Psa*Rs - f_P_OHO*MX_BH - f_P_UPO*(MX_I + MX_EH + MX_E_PAO))/MX_PAO||0; //gP/gVSS
  if(f_P_PAO_calculated > f_P_PAO){
    console.warn(`WARNING: f_P_PAO_calculated (${f_P_PAO_calculated}) > f_P_PAO (${f_P_PAO}) [gP/gVSS]`);
  }

  /*2. compute f_iPAO (1.3 giSS/gVSS) TODO */
  //fraction of fixed inorganic suspended solids of PAO
  //f_iPAO has to be calculated (0.15 - 1.3) (1.3 is PAOs full of polyPP)
  //f_iPAO_calculated should be lower than 1.3
  let f_iPAO_calculated = Math.min(f_iPAO, f_iOHO + 3.268*f_P_PAO_calculated); //giSS/gVSS
  //(3.268 is experimental value)
  if(f_iPAO_calculated > f_iPAO){
    console.warn(`WARNING: f_iPAO_calculated (${f_iPAO_calculated}) > f_iPAO (${f_iPAO}) [giSS/gVSS]`);
    //TODO confirm with george in the future
  }

  /*3. compute MX_IO (kgiSS)*/
  //total inert solids = iSS     + iOHO         + iPAO                     + precipitation
  let MX_IO_calculated = FiSS*Rs + f_iOHO*MX_BH + f_iPAO_calculated*MX_PAO + F_extra_iSS*Rs; //kgiSS
  //  MX_IO            = FiSS*Rs + f_iOHO*MX_BH + f_iPAO*MX_PAO            + F_extra_iSS*Rs; //kgiSS

  /*4. compute f_VT_PAO (PAOVSS/TSS ratio)*/
  let f_VT_PAO = (MX_PAO + MX_E_PAO)/MX_T||0; //gPAOVSS/gTSS
  let f_P_TSS = (1/MX_T)*(
    (
      f_P_OHO*(MX_BH+MX_EH+MX_E_PAO) +
      f_P_UPO*MX_I
    )/f_VT +
    f_P_PAO*MX_PAO/f_VT_PAO +
    f_P_iSS*MX_IO
  )||0; //particulate P (gP/gTSS)

  //P in TSS_effluent
  //TODO comprobar si el balance de P funciona con este valor
  let X_P_e = f_P_TSS*X_T*1e3; //gP/m3 | P content of TSS
  let FX_P_e = Qw*X_P_e;       //kgP/d in effluent TSS

  /*debug
    console.log([
      {f_P_PAO,  f_P_PAO_calculated},
      {f_iPAO,   f_iPAO_calculated},
      {f_P_TSS, X_P_e},
    ]);
  */

  /*
    TODO at this point we need a select system type and reactor volume
      - AO (MLE)
      - A2O (3 stage bardenpho)
      - UCT system
    - AO:  we need underflow "s" recycle ratio (the 'a' recycle is calculated)
    - A2O: we need underflow "s" recycle ratio (the 'a' recycle is calculated)
    - UCT: we calculate the 'a' recycle. The 'r' recycle (from anoxic to
      anaerobic) and the 's' recycle are given as inputs.
  */

  //are balances 100%?
  if(isNaN(COD_balance) || (COD_balance < 99.9 || COD_balance > 100.1) ) throw new Error(`COD_balance is ${COD_balance}%`);
  if(isNaN(N_balance  ) || (N_balance   < 99.9 || N_balance   > 100.1) ) throw new Error(`N_balance is ${N_balance}%`);
  if(isNaN(Nae_balance) || (Nae_balance < 99.9 || Nae_balance > 100.1) ) throw new Error(`Nae_balance is ${Nae_balance}%`);
  if(isNaN(P_balance  ) || (P_balance   < 99.9 || P_balance   > 100.1) ) throw new Error(`P_balance is ${P_balance}%`);

  //Volume of anaerobic zone
  let Vp_AN = f_AN*Vp; //m3

  //pack all process variables
  let process_variables={
    fSus        :{value:fSus,        unit:"gUSO/gCOD",   descr:"USO/COD ratio (influent)"},
    fSup        :{value:fSup,        unit:"gUPO/gCOD",   descr:"UPO/COD ratio (influent)"},
    YHvss       :{value:YHvss,       unit:"gVSS/gCOD",   descr:"OHO yield coefficient"},
    Y_PAO       :{value:Y_PAO,       unit:"gVSS/gCOD",   descr:"PAO yield coefficient"},
    k_vT        :{value:k_vT,        unit:"L/mgVSS·d",   descr:"k_v20 corrected by temperature"},
    bHT         :{value:bHT,         unit:"1/d",         descr:"OHO endogenous respiration rate corrected by temperature"},
    b_PAO_T     :{value:b_PAO_T,     unit:"1/d",         descr:"PAO endogenous respiration rate corrected by temperature"},

    //hydraulic retention time
    HRT         :{value:HRT,         unit:"hour",        descr:"Nominal Hydraulic Retention Time"},

    //influent concentrations required for sludge production
    Ns          :{value:Ns,          unit:"mgN/L",       descr:"N required for sludge production"},
    Cs          :{value:Cs,          unit:"mgC/L",       descr:"C required for sludge production"},
    Ps          :{value:Ps,          unit:"mgP/L",       descr:"P required for sludge production"},

    //Biomass production
    S_FBSO_conv :{value:S_FBSO_conv, unit:"mgCOD/L",     descr:""},
    S_FBSO_AN   :{value:S_FBSO_AN,   unit:"mgCOD/L",     descr:""},
    F_ss_PAO    :{value:F_ss_PAO,    unit:"kgCOD/d",     descr:""},
    F_sb_OHO    :{value:F_sb_OHO,    unit:"kgCOD/d",     descr:""},
    iterations  :{value:iterations,  unit:"iterations",  descr:"iterations to compute MX_BH"},
    f_XBH       :{value:f_XBH,       unit:"gVSS·d/gCOD", descr:"OHO biomass production rate"},
    f_XPAO      :{value:f_XPAO,      unit:"gVSS·d/gCOD", descr:"PAO biomass production rate"},
    MX_BH       :{value:MX_BH,       unit:"kgVSS",       descr:"OHO active biomass VSS"},
    MX_PAO      :{value:MX_PAO,      unit:"kgVSS",       descr:"PAO active biomass VSS"},
    MX_EH       :{value:MX_EH,       unit:"kgVSS",       descr:"OHO endogenous residue VSS"},
    MX_E_PAO    :{value:MX_E_PAO,    unit:"kgVSS",       descr:"PAO endogenous residue VSS"},
    MX_I        :{value:MX_I,        unit:"kgVSS",       descr:"Unbiodegradable organics VSS"},
    MX_V        :{value:MX_V,        unit:"kgVSS",       descr:"Total volatile suspended solids"},
    MX_IO       :{value:MX_IO,       unit:"kgiSS",       descr:"Inert Solids (influent+biomass)"},
    MX_T        :{value:MX_T,        unit:"kgTSS",       descr:"Total suspended solids"},
    X_V         :{value:X_V,         unit:"kgVSS/m3",    descr:"VSS concentration in reactor"},
    X_T         :{value:X_T,         unit:"kgTSS/m3",    descr:"TSS concentration in reactor"},
    f_VT        :{value:f_VT,        unit:"gVSS/gTSS",   descr:"VSS/TSS ratio"},
    f_VT_PAO    :{value:f_VT_PAO,    unit:"gVSS/gTSS",   descr:"PAO/TSS ratio"},
    f_AV        :{value:f_AV,        unit:"gAVSS/gVSS",  descr:"Active_VSS/VSS ratio"},
    f_AT        :{value:f_AT,        unit:"gAVSS/gTSS",  descr:"Active_VSS/TSS ratio "},

    //Misc
    Vp_AN       :{value:Vp_AN,       unit:"m3",          descr:"Volume of the anaerobic zone"},

    //Phosphorus
    Pti         :{value:Pti,         unit:"mgP/L",       descr:"Influent TP"},
    PO4_release :{value:PO4_release, unit:"mgP/L",       descr:""},
    P_bio_PAO   :{value:P_bio_PAO,   unit:"mgP/L",       descr:"P removed by active PAO VSS"},
    P_bio_OHO   :{value:P_bio_OHO,   unit:"mgP/L",       descr:"P removed by active OHO VSS"},
    P_bio_E     :{value:P_bio_E,     unit:"mgP/L",       descr:"P removed by endogenous VSS (OHO+PAO)"},
    P_bio_I     :{value:P_bio_I,     unit:"mgP/L",       descr:"P removed by inert biomass VSS"},
    P_bio_rem   :{value:P_bio_rem,   unit:"mgP/L",       descr:"Total Bio P removal"},
    Psa         :{value:Psa,         unit:"mgP/L",       descr:"P available for chemical P removal"},
    Pse         :{value:Pse,         unit:"mgP/L",       descr:"PO4 effluent after chemical P removal"},
    P_chem_rem  :{value:P_chem_rem,  unit:"mgP/L",       descr:"Chemical P removal"},
    P_total_rem :{value:P_total_rem, unit:"mgP/L",       descr:"Total P removal (bio+chem)"},

    //calculated fractions
    f_P_PAO_calculated :{value:f_P_PAO_calculated, unit:"gP/gVSS", descr:"P content of PAO VSS"},
    f_iPAO_calculated  :{value:f_iPAO_calculated,  unit:"gP/giSS", descr:"P content of iSS"},
    f_P_TSS            :{value:f_P_TSS,            unit:"gP/gTSS", descr:"P content of TSS"},

    //O2 demand
    FOc         :{value:FOc,         unit:"kgO/d",       descr:"Carbonaceous Oxygen Demand"},
    FOn         :{value:FOn,         unit:"kgO/d",       descr:"Nitrogenous Oxygen Demand"},
    FOt         :{value:FOt,         unit:"kgO/d",       descr:"Total Oxygen Demand"},
    OUR         :{value:OUR,         unit:"mgO/L·h",     descr:"Oxygen Uptake Rate"},

    //SST related
    Qe          :{value:Qe,          unit:"ML/d",        descr:"Effluent flowrate"},
    Qr          :{value:SST.Qr,      unit:"ML/d",        descr:"SST recycle flowrate"},
    f_was       :{value:f_was,       unit:"ø",           descr:"wastage concentrating factor"},
    X_T_RAS     :{value:SST.X_RAS,   unit:"kgTSS/m3",    descr:"RAS recycle flow TSS concentration"},

    //Mass balances
    COD_balance :{value:COD_balance, unit:"%", descr:"COD balance"},
    N_balance   :{value:N_balance,   unit:"%", descr:"N balance"},
    Nae_balance :{value:Nae_balance, unit:"%", descr:"Ammonia balance"},
    P_balance   :{value:P_balance,   unit:"%", descr:"P balance"},
  };

  /*hide descriptions (debugging)
    Object.values(process_variables).forEach(value=>{
      delete value.descr;
    });
  */

  return{
    process_variables,
    cpr,      //chemical P removal process variables (model 1)
    cpr_v2,   //chemical P removal process variables (model 2)
    effluent, //State_Variables object
    wastage,  //State_Variables object
  }
};

/*test*/
(function(){
  return
  //syntax:                    ( Q, VFA, FBSO, BPO, UPO, USO, iSS, FSA, OP, NOx, O2, OHO, PAO)
  let inf = new State_Variables(15,  22,  124, 439, 112,  53,  49,  39, 12,   0,  0,   0,   0);
  //console.log(inf.totals);
  //console.log(inf.summary);
  //console.log(inf.fluxes);
  let bip = inf.bio_p_removal({
    T          : 14,    //ºC
    Vp         : 21370, //m3
    Rs         : 20,    //days
    DO         : 2.0,   //mgO2/L
    RAS        : 0.75,  //ø
    IR         : 1.5,   //ø
    waste_from : 'sst', //string
    ideal_sst  : 1.0,   //number between 0 and 1

    Me         : "Fe",  //string
    mass_MeCl3 : 100,   //kg/d
    a_1        : 1,     //cpr calibrated value 1
    a_2        : 1,     //cpr calibrated value 2
    pH         : 7.2,   //pH units

    S_NOx_RAS  : 0.5,   //mgNOx/L
    f_AN       : 0.1,   //ø
    DO_RAS     : 0,     //mgO/L
    an_zones   : 2,     //number of anaerobic zones
  });
  console.log({wastage:bip.wastage.summary});
  console.log({wastage:bip.process_variables});
})();
