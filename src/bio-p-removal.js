/*
 * Bio P removal implementation
 *
*/

//load modules
try{
  State_Variables    = require("./state-variables.js");
  constants          = require("./constants.js");
  chemical_P_removal = require("./chemical-P-removal.js");
}catch(e){}

State_Variables.prototype.bio_p_removal=function(
  T, Vp, Rs, DO, RAS, IR, waste_from,
  system_type, S_NOx_RAS, number_of_an_zones, f_AN,
  DO, DO_RAS,
  mass_FeCl3,
){
  //===========================================================================
  // INPUTS
  //===========================================================================
    //default input values
    T           = isNaN(T)         ?    14 : T        ; //ºC    | temperature
    Vp          = isNaN(Vp)        ? 21370 : Vp       ; //m3    | volume
    DO          = isNaN(DO)        ?     0 : DO       ; //mgO/L | Dissolved oxygen
    Rs          = isNaN(Rs)        ?    20 : Rs       ; //d     | SRT, sludge age
    RAS         = isNaN(RAS)       ?  0.75 : RAS      ; //ø     | sludge recycle ratio based on influent flow
    IR          = isNaN(IR)        ?   1.5 : IR       ; //ø     | aerobic to anoxic recycle ratio
    waste_from  = waste_from       || 'reactor'       ; //string (option)
    system_type = system_type      || 'AO (MLE)'      ; //string (option)
    S_NOx_RAS   = isNaN(S_NOx_RAS) ?   0.5 : S_NOx_RAS; //mgNOx/L | NOx concentration at RAS
    f_AN        = isNaN(f_AN)      ?   0.1 : f_AN     ; //ø       | anaerobic mass fraction, different from fxt, value must be <= fxm
    DO_RAS      = isNaN(DO_RAS)    ?     0 : DO_RAS   ; //mgO/L   | Dissolved oxygen at recycle
    number_of_an_zones = isNaN(number_of_an_zones)? 2 : number_of_an_zones; //anaerobic zones

    //chemical P removal inputs
    mass_FeCl3 = isNaN(mass_FeCl3) ? 100 : mass_FeCl3; //kgFeCl3/d | dosed

    //input checks (numbers)
    if(Vp       <= 0) throw new Error(`Reactor volume (Vp=${Vp}) not allowed`);
    if(Rs       <= 0) throw new Error(`Solids retention time (Rs=${Rs}) not allowed`);
    if(RAS      <= 0) throw new Error(`SST recycle ratio (RAS=${RAS}) not allowed`);
    if(IR       <= 0) throw new Error(`aerobic to anoxic recycle ratio (IR=${IR}) not allowed`);
    if(S_NOx_RAS < 0) throw new Error(`Value of Recirculation NOx concentration (${S_NOx_RAS}) not allowed`);
    if(number_of_an_zones <=0) throw new Error(`Value of Number of Anaerobic Zones (${number_of_an_zones}) not allowed`);
    if(f_AN      < 0) throw new Error(`Value of Anaerobic Sludge Fraction (f_AN=${f_AN}) not allowed`);
    if(DO        < 0) throw new Error(`Value of Dissolved Oxygen (DO=${DO}) not allowed`);
    if(DO_RAS    < 0) throw new Error(`Value of DO in recycle (DO_RAS=${DO_RAS}) not allowed`);

    //input checks (strings)
    if(['reactor','sst'].indexOf(waste_from)==-1){
      throw new Error(`The input "waste_from" must be equal to "reactor" or "sst" ("${waste_from}" not allowed)`);
    }
    if(['AO (MLE)','A2O (3 stage bardenpho)','UCT system'].indexOf(system_type)==-1){
      throw new Error(`Value of System type is not one of these three:
        ${['AO (MLE)','A2O (3 stage bardenpho)','UCT system']}`
      );
    }

    //get vss mass ratios
    const f_CV_UPO = this.mass_ratios.f_CV_UPO; //gCOD/gVSS
    const f_CV_USO = this.mass_ratios.f_CV_USO; //gCOD/gVSS
    const f_CV_OHO = this.mass_ratios.f_CV_OHO; //gCOD/gVSS
    const f_CV_PAO = this.mass_ratios.f_CV_PAO; //gCOD/gVSS
    const f_N_UPO  = this.mass_ratios.f_N_UPO;  //gN/gVSS
    const f_N_USO  = this.mass_ratios.f_N_USO;  //gN/gVSS
    const f_N_OHO  = this.mass_ratios.f_N_OHO;  //gN/gVSS
    const f_N_PAO  = this.mass_ratios.f_N_PAO;  //gN/gVSS
    const f_C_UPO  = this.mass_ratios.f_C_UPO;  //gC/gVSS
    const f_C_USO  = this.mass_ratios.f_C_USO;  //gC/gVSS
    const f_C_OHO  = this.mass_ratios.f_C_OHO;  //gC/gVSS
    const f_C_PAO  = this.mass_ratios.f_C_PAO;  //gC/gVSS
    const f_P_UPO  = this.mass_ratios.f_P_UPO;  //gP/gVSS
    const f_P_USO  = this.mass_ratios.f_P_USO;  //gP/gVSS
    const f_P_OHO  = this.mass_ratios.f_P_OHO;  //gP/gVSS
    const f_P_PAO  = this.mass_ratios.f_P_PAO;  //gP/gVSS

    //influent state variables
    let Q      = this.Q;                 //ML/d    | flowrate
    let S_VFA  = this.components.S_VFA;  //mgCOD/L | volatile fatty acids (BSO)
    let S_FBSO = this.components.S_FBSO; //mgCOD/L | fermentable biodeg soluble organics (BSO)
    let S_USO  = this.components.S_USO;  //mgCOD/L | unbiodeg soluble organics
    let X_UPO  = this.components.X_UPO;  //mgCOD/L | influent unbiodegradable particulate organics (UPO)
    let S_NOx  = this.components.S_NOx;  //mgNOx/L | influent nitrate and nitrite
    let S_PO4  = this.components.S_PO4;  //mgPO4/L | influent orthophosphate (PO4)

    //fractionation objects
    let inf_frac = this.totals; //all concentrations. structure: {COD,TKN,TP,TOC,TSS}
    let inf_flux = this.fluxes; //all mass fluxes. structure: {components, totals}

    //COD fractions
    let FSti = inf_flux.totals.COD.total; //kgCOD/d | total COD influent mass flux
    let FSbi = inf_flux.totals.COD.bCOD;  //kgCOD/d | bCOD = S_VFA+S_FBSO+X_BPO influent mass flux
    let fSup = X_UPO/inf_frac.COD.total;  //ø       | X_UPO/Sti ratio
    let fSus = S_USO/inf_frac.COD.total;  //ø       | S_USO/Sti ratio

    //iSS influent and inert VSS mass fluxes
    let FiSS = inf_flux.components.X_iSS; //kgiSS/d
    let FXti = inf_flux.totals.TSS.uVSS;  //kgVSS/d

    //kinetic constants (OHO)
    const YH     = constants.YH;           //0.66 gCOD/gCOD | heterotrophic yield coefficient (does not change with temperature)
    const YHvss  = YH/f_CV_OHO;            //0.45 gVSS/gCOD | YH expressed as VSS/COD yield
    const f_iOHO = constants.f_iOHO;       //0.15 giSS/gVSS | fraction of inert solids in biomass
    const fH     = constants.fH;           //0.20 ø         | endogenous OHO fraction
    const bH     = constants.bH;           //0.24 1/d       | endogenous respiration rate at 20ºC
    const ϴ_bH   = constants.theta_bH;     //1.029 ø        | bH temperature correction factor
    const bHT    = bH*Math.pow(ϴ_bH,T-20); //1/d            | bH corrected by temperature

    //kinetic constants (PAO)
    const Y_PAO   = YH/f_CV_PAO;                  //gVSS/gCOD | ~0.45 = 0.666/1.481
    const f_iPAO  = constants.f_iPAO;             //giSS/gVSS | iSS content of PAOs
    const f_PAO   = constants.f_PAO;              //ø         | endogenous PAO fraction
    const b_PAO   = constants.b_PAO;              //1/d       | PAOs endogenous residue respiration rate at 20ºC
    const ϴ_b_PAO = constants.theta_b_PAO;        //ø         | b_PAO temperature correction factor
    const b_PAO_T = b_PAO*Math.pow(ϴ_b_PAO,T-20); //1/d       | b_PAO corrected by temperature

    //mass fractions (P, VSS, TSS)
    const f_P_iSS = constants.f_P_iSS;  //0.02  gP/giSS   | fraction of P in iSS

    //FBSO constants
    const k_v20   = constants.k_v20;              //0.070 L/mgVSS·d | note: a high value (~1000) makes FBSO effluent ~0
    const ϴ_k_v20 = constants.theta_k_v20;        //1.035 ø         | k_v20 temperature correction factor
    const k_vT    = k_v20*Math.pow(ϴ_k_v20,T-20); //L/mgVSS·d       | k_v corrected by temperature

    //COD conversion (stoichiometric constants)
    const i_8_6 = (5/8)*2*(32/14)/(1-YH); //gCOD/gNOx | ~8.6 (conv NOx to COD)
    const i_3_0 = 1/(1-YH);               //gCOD/gDO  | ~3.0 (conv DO  to COD)

  //===========================================================================
  // EQUATIONS
  //===========================================================================
  //nominal hydraulic retention time
  let HRT=Vp/(Q*1000)*24; //h

  //compute S_FBSO available for OHOs to turn into S_VFA
  //TODO subtract FBSO not consumed also ("Sbse"), confirm with George
  let S_FBSO_conv = Math.max(0,
    S_FBSO - i_8_6*(RAS*S_NOx_RAS + S_NOx) - i_3_0*(RAS*DO_RAS + DO)
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
    S_FBSO_AN  = S_FBSO_conv/(1+RAS)/Math.pow(1+(k_vT*(f_AN*MX_BH/(number_of_an_zones*Q*(1+RAS)))), number_of_an_zones); //mgCOD/L
    F_ss_PAO   = Math.max(0, Q*(S_FBSO_conv - (1+RAS)*S_FBSO_AN + S_VFA) ); //kgCOD/d | VFA stored by PAOs
    F_sb_OHO   = Math.max(0, FSbi - F_ss_PAO);                             //kgCOD/d | remaining bCOD for OHOs
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
    const f_CV_combined = (OHO_COD + PAO_COD)/(OHO_VSS + PAO_VSS); //gCOD/gVSS

    //console.log({OHO_VSS, OHO_COD, PAO_VSS, PAO_COD, f_CV_combined});
    return f_CV_combined;
  })(); //gCOD/gVSS
  //console.log({f_CV_OHO, f_CV_PAO, f_CV_combined});

  //compute the rest of suspended solids
  let MX_I = FXti*Rs;                                  //kgVSS | VSS inert biomass (UPO)
  let MX_V = MX_BH + MX_EH + MX_I + MX_PAO + MX_E_PAO; //kgVSS | total VSS mass

  /*chemical P removal*/
  //compute the influent P concentration required for sludge production
  let Pti = inf_frac.TP.total; //mgP/L | total TP influent concentration
  let Ps  = (f_P_OHO*MX_BH + f_P_PAO*MX_PAO + f_P_UPO*(MX_I + MX_EH + MX_E_PAO))/(Rs*Q); //mgP/L
  if(Ps > Pti){
    throw new Error(`Warning: Ps (${Ps}) > Pti (${Pti}): not enough influent TP to fill up the PAOs with polyphosphate`);
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
  let cpr         = chemical_P_removal(Q, Psa, mass_FeCl3); //object | chemical P removal results
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
    mass_FeCl3,
    P_chem_rem,
    Pse,
    Pobse,
    Pouse,
  });
  */

  //total P concentration removed = bio + chemical
  let P_total_rem = P_bio_rem + P_chem_rem; //mgP/L

  //compute iSS and TSS
  let MX_IO = FiSS*Rs + f_iOHO*MX_BH + f_iPAO*MX_PAO + F_extra_iSS*Rs; //kgiSS | total inert solids (iSS + iOHO + iPAO + P_precipitation)
  let MX_T  = MX_V + MX_IO;                                            //kgTSS | total TSS mass

  //TSS concentrations
  let X_I  = MX_I/Vp  ||0; //kgVSS/m3 | influent uVSS conc
  let X_V  = MX_V/Vp  ||0; //kgVSS/m3 | total VSS conc
  let X_IO = MX_IO/Vp ||0; //kgiSS/m3 | inert solids (iSS+iOHO+iPAO+P_precipitation) conc
  let X_T  = MX_T/Vp  ||0; //kgTSS/m3 | total TSS conc

  //VSS ratios (a:active, v:vss, t:tss)
  let f_VT    = MX_V  /MX_T ||0;   //gVSS/gTSS | ratio VSS/TSS (orientative value ~0.80)
  let f_avOHO = MX_BH /MX_V ||0;   //gVSS/gVSS | ratio active biomass in VSS (OHO)
  let f_avPAO = MX_PAO/MX_V ||0;   //gVSS/gVSS | ratio active biomass in VSS (PAO)
  let f_atOHO = MX_BH /MX_T ||0;   //gVSS/gTSS | ratio active biomass in TSS (OHO)
  let f_atPAO = MX_PAO/MX_T ||0;   //gVSS/gTSS | ratio active biomass in TSS (PAO)
  let f_AV    = f_avOHO + f_avPAO; //gVSS/gVSS | ratio active biomass in VSS (OHO+PAO)
  let f_AT    = f_atOHO + f_atPAO; //gVSS/gTSS | ratio active biomass in TSS (OHO+PAO)

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

  //effluent ammonia =  total TKN - Ns - usON  - bsON
  let Nae = Math.max(0, Nti       - Ns - Nouse - Nobse); //mgN/L

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
    let f     = (1+RAS)/RAS;    //ø     | f=concentrating factor
    let X_RAS = f*X_T;          //kg/m3 | TSS concentration in RAS
    let Qr    = Q*RAS;          //ML/d  | RAS flowrate
    let Qw    = (Vp/Rs)/f/1000; //ML/d  | SST wastage flowrate
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
  let f_RAS   = waste_from=='sst' ? SST.f : 1; //ø    | RAS concentrating factor
  let BPO_was = 0;                             //mg/L | BPO wastage | all BPO is turned into biomass (model assumption)
  let UPO_was = f_RAS*f_CV_UPO*X_I*1e3;        //mg/L | UPO wastage
  let iSS_was = f_RAS*X_IO*1e3;                //mg/L | iSS wastage (precipitation by FeCl3 already included)

  //biomass wastage
  let OHO_was = f_RAS*f_CV_OHO*(MX_BH  + MX_EH   )/Vp*1e3; //mgCOD/L | OHO wastage
  let PAO_was = f_RAS*f_CV_PAO*(MX_PAO + MX_E_PAO)/Vp*1e3; //mgCOD/L | PAO wastage

  //output streams------------------( Q, VFA, FBSO,     BPO,     UPO,   USO,     iSS, FSA,  OP,   NOx,     OHO,     PAO)
  let effluent = new State_Variables(Qe,   0,    0,       0,       0, S_USO,       0, Nae, Pse, S_NOx,       0,       0);
  let wastage  = new State_Variables(Qw,   0,    0, BPO_was, UPO_was, S_USO, iSS_was, Nae, Pse, S_NOx, OHO_was, PAO_was);

  //copy influent mass ratios for the new outputs
  effluent.mass_ratios = this.mass_ratios; //object
  wastage.mass_ratios  = this.mass_ratios; //object

  //recalculate f_P_PAO mass ratio (since PAO mass is MX_PAO + MX_E_PAO)
  //and they have different P content
  let f_P_PAO_combined = (f_P_PAO*MX_PAO + f_P_UPO*MX_E_PAO)/(MX_PAO + MX_E_PAO);
  console.log({f_P_PAO_combined});

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
  let COD_balance = 100*exiting_COD/FSti;

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
  let FPremoved  = cpr.PO4_removed.value;                //kgP/d | PO4 removed by FeCl3
  let FPout      = FPte + FPw + FPremoved;               //kgP/d | total TP out
  let P_balance  = (FPout==FPti) ? 100 : 100*FPout/FPti; //percentage
  //console.log({P_balance,FPti,FPout,FPte,FPw,FPremoved});

  //===========================================================================
  //CALCULATED FRACTIONS
  //===========================================================================

  /*1. compute f_P_PAO (0.38 gP/gVSS) | only for active VSS mass*/
  //note: f_P_PAO_calculated should be lower than f_P_PAO (0.38)
  let f_P_PAO_calculated = (Q*Pti*Rs - Q*Psa*Rs - f_P_OHO*MX_BH - f_P_UPO*(MX_I + MX_EH + MX_E_PAO))/MX_PAO; //gP/gVSS
  if(f_P_PAO_calculated > f_P_PAO){
    console.warn(`Warning: f_P_PAO_calculated (${f_P_PAO_calculated}) > f_P_PAO (${f_P_PAO}) [gP/gVSS]`);
  }

  /*2. compute f_iPAO (1.3 giSS/gVSS) TODO */
  //fraction of fixed inorganic suspended solids of PAO
  //f_iPAO has to be calculated (0.15 - 1.3) (1.3 is PAOs full of polyPP)
  //f_iPAO_calculated should be lower than 1.3
  let f_iPAO_calculated = f_iOHO + 3.268*f_P_PAO_calculated; //giSS/gVSS
  //(3.268 is experimental value)
  if(f_iPAO_calculated > f_iPAO){
    console.warn(`Warning: f_iPAO_calculated (${f_iPAO_calculated}) > f_iPAO (${f_iPAO}) [giSS/gVSS]`);
  }

  /*3. compute MX_IO (kgiSS)*/
  //total inert solids = iSS     + iOHO         + iPAO                     + precipitation
  let MX_IO_calculated = FiSS*Rs + f_iOHO*MX_BH + f_iPAO_calculated*MX_PAO + F_extra_iSS*Rs; //kgiSS
  //  MX_IO            = FiSS*Rs + f_iOHO*MX_BH + f_iPAO*MX_PAO            + F_extra_iSS*Rs; //kgiSS

  /*4. compute f_VT_PAO (PAOVSS/TSS ratio)*/
  let f_VT_PAO = (MX_PAO + MX_E_PAO)/MX_T;
  let f_P_TSS = (1/MX_T)*(
    (
      f_P_OHO*(MX_BH+MX_EH+MX_E_PAO) +
      f_P_UPO*MX_I
    )/f_VT +
    f_P_PAO*MX_PAO/f_VT_PAO +
    f_P_iSS*MX_IO
  ); //particulate P (gP/gTSS)

  //P in TSS_effluent
  //TODO comprobar si el balance de P funciona con este valor
  let X_P_e = f_P_TSS*X_T*1e3; //gP/m3 | P content of TSS
  let FX_P_e = Qw*X_P_e;       //kgP/d in effluent TSS

  /*debug
  */
  console.log([
    {f_P_PAO,  f_P_PAO_calculated},
    {f_iPAO,   f_iPAO_calculated},
    {MX_IO,    MX_IO_calculated},
    {f_VT_PAO},
    {f_P_TSS, X_P_e},
  ]);

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

  //TODO
  //console.log({system_type});

  /*
    modification for Dp1 (denitrification potential)
    when there is bio P removal
    TODO
  */
  let Dp1 = (function(){ //mgN/L
    let r         = 0;                                 //recirculation from anoxic to anaerobic reactor
    let fxm       = 0.5;                               //ø | get value from "nitrification.js"
    let fx1       = fxm - f_AN;                        //ø
    let K2_20_PAO = constants.K2_20_PAO;               //0.255 gN/gVSS·d
    let ϴ_K2_PAO  = constants.theta_K2_PAO;            //1.080 
    let K2T_PAO   = K2_20_PAO*Math.pow(ϴ_K2_PAO,T-20); //gN/gVSS·d

    //compute Dp1 modified for bio P removal
    //note: 40/14 is ≈ 2.86 stoichiometric constant (gCOD/gN) NO3 reduction to N2
    let Dp1 = S_FBSO_AN*(1+r)*(1-YH)/(40/14) +
      fx1*K2T_PAO*(F_sb_OHO/Q)*(YH/f_CV_OHO)/(1+bHT*Rs);

    return Dp1;
  })();

  //END

  //pack all process variables
  let process_variables={
    fSus        :{value:fSus,        unit:"gUSO/gCOD",   descr:"USO/COD ratio (influent)"},
    fSup        :{value:fSup,        unit:"gUPO/gCOD",   descr:"UPO/COD ratio (influent)"},
    YHvss       :{value:YHvss,       unit:"gVSS/gCOD",   descr:"OHO yield coefficient"},
    Y_PAO       :{value:Y_PAO,       unit:"gVSS/gCOD",   descr:"PAO yield coefficient"},
    bHT         :{value:bHT,         unit:"1/d",         descr:"OHO endogenous respiration rate corrected by temperature"},
    b_PAO_T     :{value:b_PAO_T,     unit:"1/d",         descr:"PAO endogenous respiration rate corrected by temperature"},
    k_vT        :{value:k_vT,        unit:"L/mgVSS·d",   descr:"k_v20 corrected by temperature"},

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
    X_V         :{value:X_V,         unit:"kgVSS/m3",    descr:"VSS concentration"},
    X_T         :{value:X_T,         unit:"kgTSS/m3",    descr:"TSS concentration"},
    f_VT        :{value:f_VT,        unit:"gVSS/gTSS",   descr:"VSS/TSS ratio"},
    f_AV        :{value:f_AV,        unit:"gAVSS/gVSS",  descr:"Active_VSS/VSS ratio"},
    f_AT        :{value:f_AT,        unit:"gAVSS/gTSS",  descr:"Active_VSS/TSS ratio "},

    //Misc
    Ns          :{value:Ns,          unit:"mgN/L",       descr:"N required for sludge production"},
    Cs          :{value:Cs,          unit:"mgC/L",       descr:"C required for sludge production"},
    HRT         :{value:HRT,         unit:"hour",        descr:"Nominal Hydraulic Retention Time"},

    //Phosphorus
    Pti         :{value:Pti,         unit:"mgP/L",       descr:"Influent TP"},
    Ps          :{value:Ps,          unit:"mgP/L",       descr:"P required for sludge production"},
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
    f_P_TSS     :{value:f_P_TSS,     unit:"gP/gTSS",     descr:"P/TSS ratio"},

    //O2 demand
    FOc         :{value:FOc,         unit:"kgO/d",       descr:"Carbonaceous Oxygen Demand"},
    FOn         :{value:FOn,         unit:"kgO/d",       descr:"Nitrogenous Oxygen Demand"},
    FOt         :{value:FOt,         unit:"kgO/d",       descr:"Total Oxygen Demand"},
    OUR         :{value:OUR,         unit:"mgO/L·h",     descr:"Oxygen Uptake Rate"},

    //SST related
    Qe          :{value:Qe,          unit:"ML/d",        descr:"Effluent flowrate"},
    Qr          :{value:SST.Qr,      unit:"ML/d",        descr:"SST recycle flowrate"},
    f_RAS       :{value:f_RAS,       unit:"ø",           descr:"SST concentrating factor"},
    X_RAS       :{value:SST.X_RAS,   unit:"kg/m3",       descr:"SST recycle flow TSS concentration"},

    //Dp1
    Dp1         :{value:Dp1,         unit:"mgN/L",       descr:"Denitrification Potential"},

    //Mass balances
    COD_balance :{value:COD_balance, unit:"%", descr:"COD balance"},
    N_balance   :{value:N_balance,   unit:"%", descr:"N balance"},
    Nae_balance :{value:Nae_balance, unit:"%", descr:"Ammonia balance"},
    P_balance   :{value:P_balance,   unit:"%", descr:"P balance"},
  };

  /*hide descriptions (debugging)
  */
  Object.values(process_variables).forEach(value=>{
    delete value.descr;
  });
  console.log("=================");
  console.log("PROCESS VARIABLES");
  console.log("=================");
  console.log(process_variables);

  return{
    process_variables,
    cpr,      //chemical P removal process variables
    effluent, //State_Variables object
    wastage,  //State_Variables object
  }
};

/*test*/
(function(){
  //return
  //syntax:                    ( Q, VFA, FBSO, BPO, UPO, USO, iSS, FSA, OP, NOx, OHO, PAO)
  let inf = new State_Variables(15,  22,  124, 439, 112,  53,  49,  39, 12,   0,   0,   0);
  //console.log(inf.totals);
  //console.log(inf.summary);
  //console.log(inf.fluxes);

  let bip = inf.bio_p_removal();
})();
