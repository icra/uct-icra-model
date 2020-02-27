/*
  Activated Sludge (AS) + Secondary Settler (SST)
  implementation from G. Ekama notes

  configuration (recycle not drawn):
  +-------------------------------------+
  | Qi → [Aerobic reactor] → [SST] → Qe |
  |             ↓                       |
  |             Qw                      |
  +-------------------------------------+
  or
  +-------------------------------------+
  | Qi → [Aerobic reactor] → [SST] → Qe |
  |                            ↓        |
  |                            Qw       |
  +-------------------------------------+
*/

//load modules
try{
  State_Variables    = require("./state-variables.js");
  constants          = require("./constants.js");
  chemical_P_removal = require("./chemical-P-removal.js");
}catch(e){}

State_Variables.prototype.activated_sludge=function(parameters){
  //===========================================================================
  // PARAMETERS
  //===========================================================================
    let T          = parameters.T;          //ºC     | Temperature
    let Vp         = parameters.Vp;         //m3     | Volume of reactor
    let Rs         = parameters.Rs;         //days   | Solids Retention Time or Sludge Age
    let DO         = parameters.DO;         //mg/L   | DO in the aerobic reactor
    let RAS        = parameters.RAS;        //ø      | SST underflow recycle ratio
    let waste_from = parameters.waste_from; //string | origin of wastage ('sst' or 'reactor')
    let mass_FeCl3 = parameters.mass_FeCl3; //kg/d   | mass of FeCl3 added for P precipitation

    //check undefined parameters
    if(undefined==T         ) throw new Error(`T          is undefined`);
    if(undefined==Vp        ) throw new Error(`Vp         is undefined`);
    if(undefined==Rs        ) throw new Error(`Rs         is undefined`);
    if(undefined==DO        ) throw new Error(`DO         is undefined`);
    if(undefined==RAS       ) throw new Error(`RAS        is undefined`);
    if(undefined==waste_from) throw new Error(`waste_from is undefined`);
    if(undefined==mass_FeCl3) throw new Error(`mass_FeCl3 is undefined`);

    //check variable types
    if("number"!=typeof T          ) throw new Error(`T          is not a number`);
    if("number"!=typeof Vp         ) throw new Error(`Vp         is not a number`);
    if("number"!=typeof Rs         ) throw new Error(`Rs         is not a number`);
    if("number"!=typeof DO         ) throw new Error(`DO         is not a number`);
    if("number"!=typeof RAS        ) throw new Error(`RAS        is not a number`);
    if("string"!=typeof waste_from ) throw new Error(`waste_from is not a string`);
    if("number"!=typeof mass_FeCl3 ) throw new Error(`mass_FeCl3 is not a number`);

    //numerical checks for physical sense
    if(Vp  <= 0) throw new Error(`Value of Reactor volume (Vp=${Vp}) not allowed`);
    if(Rs  <= 0) throw new Error(`Value of Solids retention time (Rs=${Rs}) not allowed`);
    if(RAS <  0) throw new Error(`Value of SST recycle ratio (RAS=${RAS}) not allowed`);
    if(DO  <  0) throw new Error(`Value of Dissolved oxygen (DO=${DO}) not allowed`);
    if(['reactor','sst'].indexOf(waste_from)==-1) throw new Error(`The input "waste_from" must be equal to "reactor" or "sst" ("${waste_from}" not allowed)`);

  //flowrate
  let Q = this.Q; //ML/d

  //influent fractionation objects
  let inf_frac = this.totals; //all concentrations. structure: {COD,TKN,TP,TOC,TSS}
  let inf_flux = this.fluxes; //all mass fluxes. structure: {components, totals}

  //COD fractions
  let Sti  = inf_frac.COD.total;        //mgCOD/L | total influent COD "Sti"
  let Susi = inf_frac.COD.usCOD;        //mgCOD/L | USO influent == USO effluent (Susi==Suse)
  let Supi = inf_frac.COD.upCOD;        //mgCOD/L | UPO influent
  let fSus = Susi/Sti||0;               //ø       | influent USO/COD ratio
  let fSup = Supi/Sti||0;               //ø       | influent UPO/COD ratio
  let FSti = inf_flux.totals.COD.total; //kgCOD/d | influent total COD
  let FSbi = inf_flux.totals.COD.bCOD;  //kgCOD/d | influent biodegradable COD (VFA+FBSO+BPO)

  //influent iSS and inert VSS mass fluxes
  let FiSS = inf_flux.totals.TSS.iSS;   //kgiSS/d | influent iSS
  let FXti = inf_flux.totals.TSS.uVSS;  //kgVSS/d | influent unbiodegradable VSS

  //VSS mass ratios
  const f_CV_FBSO = this.mass_ratios.f_CV_FBSO; //gCOD/gVSS
  const f_CV_BPO  = this.mass_ratios.f_CV_BPO;  //gCOD/gVSS
  const f_CV_UPO  = this.mass_ratios.f_CV_UPO;  //gCOD/gVSS
  const f_CV_OHO  = this.mass_ratios.f_CV_OHO;  //gCOD/gVSS
  const f_N_FBSO  = this.mass_ratios.f_N_FBSO;  //gN/gVSS
  const f_N_BPO   = this.mass_ratios.f_N_BPO;   //gN/gVSS
  const f_N_UPO   = this.mass_ratios.f_N_UPO;   //gN/gVSS
  const f_N_OHO   = this.mass_ratios.f_N_OHO;   //gN/gVSS
  const f_P_FBSO  = this.mass_ratios.f_P_FBSO;  //gP/gVSS
  const f_P_BPO   = this.mass_ratios.f_P_BPO;   //gP/gVSS
  const f_P_UPO   = this.mass_ratios.f_P_UPO;   //gP/gVSS
  const f_P_OHO   = this.mass_ratios.f_P_OHO;   //gP/gVSS
  const f_C_FBSO  = this.mass_ratios.f_C_FBSO;  //gC/gVSS
  const f_C_BPO   = this.mass_ratios.f_C_BPO;   //gC/gVSS
  const f_C_UPO   = this.mass_ratios.f_C_UPO;   //gC/gVSS
  const f_C_OHO   = this.mass_ratios.f_C_OHO;   //gC/gVSS

  //===========================================================================
  // EQUATIONS
  //===========================================================================
  //compute nominal hydraulic retention time
  let HRT=Vp/(Q*1000)*24; //h

  //2.2 - kinetics - page 10
  const YH    = constants.YH;           //0.66 gCOD/gCOD | heterotrophic yield coefficient (does not change with temperature)
  const YHvss = YH/f_CV_OHO;            //0.45 gVSS/gCOD | heterotrophic yield coefficient (does not change with temperature)
  const fH    = constants.fH;           //0.20 ø         | endogenous OHO fraction
  const bH    = constants.bH;           //0.24 1/d       | endogenous respiration rate at 20ºC
  const ϴ_bH  = constants.theta_bH;     //1.029 ø        | bH temperature correction factor
  let bHT     = bH*Math.pow(ϴ_bH,T-20); //1/d            | endogenous respiration rate corrected by temperature

  //kinetics for effluent FBSO (not all influent FBSO is degraded)
  const k_v20   = constants.k_v20;              //0.070 L/mgVSS·d | note: a high value (~1000) makes FBSO effluent ~0
  const ϴ_k_v20 = constants.theta_k_v20;        //1.035 ø         | k_v20 temperature correction factor
  let k_vT      = k_v20*Math.pow(ϴ_k_v20,T-20); //L/mgVSS·d       | k_v corrected by temperature

  //compute OHO biomass production rate
  let f_XBH = (YHvss*Rs)/(1+bHT*Rs); //gVSS·d/gCOD

  //compute effluent FBSO ('Sbse') and COD mass flux for OHOs
  let S_FBSO = this.components.S_FBSO;           //mgCOD/L | influent S_FBSO
  let Sbse   = Math.min(S_FBSO, 1/(f_XBH*k_vT)); //mgCOD/L | FBSO effluent concentration: cannot be higher than influent S_FBSO
  let FdSbi  = Math.max(0, FSbi - Q*Sbse);       //kgCOD/d | influent biodegradable COD mass flux that will generate biomass

  //total VSS production
  let MX_BH = FdSbi * f_XBH;         //kgVSS  | OHO live biomass VSS
  let MX_EH = fH * bHT * Rs * MX_BH; //kgVSS  | endogenous residue OHOs
  let MX_I  = FXti * Rs;             //kgVSS  | influent uVSS
  let MX_V  = MX_BH + MX_EH + MX_I;  //kgVSS  | total VSS

  //2.8 - effluent Phosphorus
  let Ps    = (f_P_OHO*(MX_BH+MX_EH)+f_P_UPO*MX_I)/(Rs*Q); //mgP/L | P influent required for sludge production
  let Pti   = inf_frac.TP.total;                               //mgP/L | total P influent
  let Pouse = inf_frac.TP.usOP;                                //mgP/L | P organic unbiodegradable soluble effluent
  let Pobse = Sbse*f_P_FBSO/f_CV_FBSO;                     //mgP/L | P organic biodegradable soluble effluent

  //compute inorganic P available for chemical P removal (PO4)
  let Psa = Math.max(0, Pti - Ps - Pouse - Pobse); //mgP/L
  //console.log({Pti,Ps,Pouse,Pobse,Psa});

  /*execute chemical P removal module*/
  let cpr = chemical_P_removal({Q, PO4i:Psa, mass_FeCl3}); //object
  let F_extra_iSS = cpr.extra_iSS.value;            //kgiSS/d
  let Pse         = cpr.PO4e.value;                 //mgP/L | PO4 effluent after chemical P removal

  //compute total inert solids
  const f_iOHO = constants.f_iOHO;                     //0.15 giSS/gVSS | fraction of inert solids in biomass
  let MX_IO = FiSS*Rs + f_iOHO*MX_BH + F_extra_iSS*Rs; //kgiSS          | total inert solids (iSS + iOHO + P_precipitation)

  //compute total solids (TSS = VSS + iSS)
  let MX_T = MX_V + MX_IO; //kgTSS | MX_T = MX_BH + MX_EH + MX_I + MX_IO

  //compute all solids concentrations
  let X_BH = MX_BH/Vp; //kgVSS/m3 | live biomass OHO VSS
  let X_EH = MX_EH/Vp; //kgVSS/m3 | endogenous residue OHOs VSS
  let X_I  = MX_I/Vp;  //kgVSS/m3 | influent uVSS
  let X_V  = MX_V/Vp;  //kgVSS/m3 | total VSS
  let X_IO = MX_IO/Vp; //kgiSS/m3 | inert solids (iSS + iOHO + P precipitation)
  let X_T  = MX_T/Vp;  //kgTSS/m3 | total

  //2.5 - compute VSS ratios
  let f_VT     = MX_V/MX_T  ||0; //VSS/TSS ratio
  let f_AV_OHO = MX_BH/MX_V ||0; //gOHOVSS/gVSS | fraction of active biomass in VSS
  let f_AT_OHO = MX_BH/MX_T ||0; //gOHOVSS/gTSS | fraction of active biomass in TSS

  //2.6 - Nitrogen - page 12
  let Ns    = (f_N_OHO*(MX_BH+MX_EH)+f_N_UPO*MX_I)/(Rs*Q); //mgN/L | N in influent required for sludge production
  let Nti   = inf_frac.TKN.total;                              //mgN/L | total TKN influent
  let Nai   = this.components.S_NH4;                       //mgN/L | total ammonia influent
  let Nobsi = inf_frac.TKN.bsON;                               //mgN/L | bsON influent (VFA + FBSO)
  let Nouse = inf_frac.TKN.usON;                               //mgN/L | usON influent = effluent
  let Nobpi = inf_frac.TKN.bpON;                               //mgN/L | bpON influent
  let Noupi = inf_frac.TKN.upON;                               //mgN/L | upON influent
  let Nobse = Sbse*f_N_FBSO/f_CV_FBSO;                     //mgN/L | bsON effluent (not all FBSO is degraded)

  //effluent ammonia = total TKN - Ns - usON - bsON
  let Nae = Math.max(0, Nti - Ns - Nouse - Nobse); //mgN/L
  //console.log({Nae,Nti,Ns,Nouse,Nobse}); //debugging

  //ammonia balance
  //console.log({Nae,Nai,Nobsi,Nobpi,Ns,Noupi,Nobse});
  let Nae_balance = (Nae == (Nai + Nobsi + Nobpi - Ns + Noupi - Nobse)) ? 100 :
      100*Nae/(Nai + Nobsi + Nobpi - Ns + Noupi - Nobse); //percentage

  //in AS only: influent nitrate = effluent nitrate
  let Nne = this.components.S_NOx; //mgN/L

  //calculate necessary C for biomass
  let Cs  = (f_C_OHO*(MX_BH+MX_EH)+f_C_UPO*MX_I)/(Rs*Q); //mgC/L | C in influent required for sludge production
  let Cti = inf_frac.TOC.total;                              //mgC/L | total TOC influent

  //secondary settler (SST) and recycle flow (RAS) equations
  //TODO: create an independent module (future)
  let SST=(function(RAS){
    let f     = (1+RAS)/RAS;    //ø     | concentrating factor
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

  /*compute BPO, UPO, and iSS concentrating factor in the recycle underflow*/
  let f_was   = waste_from=='sst' ? SST.f : 1;  //ø       | RAS concentrating factor
  let BPO_was = 0;                              //mgCOD/L | BPO wastage | all BPO is turned into biomass (model assumption)
  let UPO_was = f_was*f_CV_UPO*X_I*1e3;         //mgCOD/L | UPO wastage
  let iSS_was = f_was*X_IO*1e3;                 //mgiSS/L | iSS wastage (precipitation by FeCl3 already included)
  let OHO_was = f_was*f_CV_OHO*(X_BH+X_EH)*1e3; //mgCOD/L | OHO wastage

  //output streams------------------( Q, VFA, FBSO,     BPO,     UPO,  USO,     iSS, NH4, PO4, NOx, O2,     OHO, PAO)
  let effluent = new State_Variables(Qe,   0, Sbse,       0,       0, Susi,       0, Nae, Pse, Nne, DO,       0,   0);
  let wastage  = new State_Variables(Qw,   0, Sbse, BPO_was, UPO_was, Susi, iSS_was, Nae, Pse, Nne, DO, OHO_was,   0);

  //copy influent mass ratios for the new outputs
  effluent.mass_ratios = Object.assign({}, this.mass_ratios);
  wastage .mass_ratios = Object.assign({}, this.mass_ratios);

  //get output mass fluxes (kg/d)
  let eff_flux = effluent.fluxes; //object
  let was_flux = wastage.fluxes;  //object

  //2.9 - COD Balance
  let FSe = eff_flux.totals.COD.total; //kg/d | total COD effluent: USO effluent flux + bCOD not degraded | Qe*(Susi+Sbse)
  let FSw = was_flux.totals.COD.total; //kg/d | total COD wastage

  //2.7 - oxygen demand - page 13
  //carbonaceous oxygen demand
  let FOc = (function(){
    let catabolism  = 1 - YH;                    //gCOD/gCOD | electrons used for energy (catabolism)
    let respiration = f_CV_OHO*(1-fH)*bHT*f_XBH; //gCOD/gCOD | electrons used for endogenous respiration (O2->CO2)
    return FdSbi*(catabolism + respiration);    //kgO/d
  })();

  //nitrogenous oxygen demand
  const i_COD_NO3 = 64/14; //~4.57 gCOD/gN
  let FOn = i_COD_NO3*Q*Nae;  //kgO/d
  let FOt = FOc + FOn;        //kgO/d  | total oxygen demand
  let OUR = FOt/(Vp*24)*1000; //mg/L·h | oxygen uptake rate

  //COD balance
  let FSout       = FSe + FSw + FOc; //kg/d | total COD out flux
  let COD_balance = (FSout==FSti) ? 100 : 100*FSout/FSti; //percentage

  //2.10 - TKN balance
  let FNti      = inf_flux.totals.TKN.total;          //kgN/d | total TKN influent
  let FNte      = eff_flux.totals.TKN.total;          //kgN/d | total TKN effluent
  let FNw       = was_flux.totals.TKN.total;          //kgN/d | total TKN wastage
  let FNout     = FNte + FNw;                           //kgN/d | total TKN out
  let N_balance = (FNout==FNti) ? 100 : 100*FNout/FNti; //percentage

  //2.11 - P balance
  let FPti      = inf_flux.totals.TP.total;           //kgP/d | total TP influent
  let FPte      = eff_flux.totals.TP.total;           //kgP/d | total TP effluent
  let FPw       = was_flux.totals.TP.total;           //kgP/d | total TP wastage
  let FPremoved = cpr.PO4_removed.value;                //kgP/d | total PO4 removed by FeCl3
  let FPout     = FPte + FPw + FPremoved;               //kgP/d | total TP out
  let P_balance = (FPout==FPti) ? 100 : 100*FPout/FPti; //percentage

  //do we have enough influent nutrients to generate biomass?
  if(Ns > Nti) throw new Error(`Ns (${Ns}) > Nti (${Nti}): not enough influent TKN to produce biomass`);
  if(Ps > Pti) throw new Error(`Ps (${Ps}) > Pti (${Pti}): not enough influent TP to produce biomass`);
  if(Cs > Cti) throw new Error(`Cs (${Cs}) > Cti (${Cti}): not enough influent TOC to produce biomass`);

  //are balances 100%?
  if(isNaN(COD_balance) || (COD_balance < 99.9 || COD_balance > 100.1) ) throw new Error(`COD_balance is ${COD_balance}%`);
  if(isNaN(N_balance  ) || (N_balance   < 99.9 || N_balance   > 100.1) ) throw new Error(`N_balance is ${N_balance}%`);
  if(isNaN(Nae_balance) || (Nae_balance < 99.9 || Nae_balance > 100.1) ) throw new Error(`Nae_balance is ${Nae_balance}%`);
  if(isNaN(P_balance  ) || (P_balance   < 99.9 || P_balance   > 100.1) ) throw new Error(`P_balance is ${P_balance}%`);

  //process_variables
  let process_variables={
    YHvss    :{value:YHvss,     unit:"gVSS/gCOD",   descr:"Heterotrophic yield coefficient"},
    fSus     :{value:fSus,      unit:"gUSO/gCOD",   descr:"USO/COD ratio (influent)"},
    fSup     :{value:fSup,      unit:"gUPO/gCOD",   descr:"UPO/COD ratio (influent)"},
    k_vT     :{value:k_vT,      unit:"L/mgVSS·d",   descr:"k_v20 corrected by temperature"},
    Ns       :{value:Ns,        unit:"mgN/L",       descr:"influent N required for sludge production"},
    Ps       :{value:Ps,        unit:"mgP/L",       descr:"influent P required for sludge production"},
    Cs       :{value:Cs,        unit:"mgC/L",       descr:"influent C required for sludge production"},
    HRT      :{value:HRT,       unit:"hour",        descr:"Nominal Hydraulic Retention Time"},
    bHT      :{value:bHT,       unit:"1/d",         descr:"OHO Endogenous respiration rate corrected by temperature"},
    f_XBH    :{value:f_XBH,     unit:"gVSS·d/gCOD", descr:"OHO Biomass production rate"},
    MX_BH    :{value:MX_BH,     unit:"kgVSS",       descr:"OHO Biomass produced VSS"},
    MX_EH    :{value:MX_EH,     unit:"kgVSS",       descr:"OHO Endogenous residue VSS"},
    MX_I     :{value:MX_I,      unit:"kgVSS",       descr:"Unbiodegradable organics VSS"},
    MX_V     :{value:MX_V,      unit:"kgVSS",       descr:"Volatile Suspended Solids"},
    MX_IO    :{value:MX_IO,     unit:"kgiSS",       descr:"Inert Solids (influent+biomass)"},
    MX_T     :{value:MX_T,      unit:"kgTSS",       descr:"Total Suspended Solids"},
    X_V      :{value:X_V,       unit:"kgVSS/m3",    descr:"VSS concentration in SST"},
    X_T      :{value:X_T,       unit:"kgTSS/m3",    descr:"TSS concentration in SST"},
    f_VT     :{value:f_VT,      unit:"gVSS/gTSS",   descr:"VSS/TSS ratio"},
    f_AV_OHO :{value:f_AV_OHO,  unit:"gOHO/gVSS",   descr:"ActiveOHO/VSS ratio"},
    f_AT_OHO :{value:f_AT_OHO,  unit:"gOHO/gTSS",   descr:"ActiveOHO/TSS ratio"},
    FOc      :{value:FOc,       unit:"kgO/d",       descr:"Carbonaceous Oxygen Demand"},
    FOn      :{value:FOn,       unit:"kgO/d",       descr:"Nitrogenous Oxygen Demand"},
    FOt      :{value:FOt,       unit:"kgO/d",       descr:"Total Oxygen Demand"},
    OUR      :{value:OUR,       unit:"mgO/L·h",     descr:"Oxygen Uptake Rate"},

    f_was    :{value:f_was,     unit:"ø",           descr:"wastage concentrating factor"},
    Qr       :{value:SST.Qr,    unit:"ML/d",        descr:"RAS recycle flowrate"},
    X_T_RAS  :{value:SST.X_RAS, unit:"kgTSS/m3",    descr:"RAS recycle flow TSS concentration"},

    COD_balance :{value:COD_balance, unit:"%", descr:"COD balance"},
    N_balance   :{value:N_balance,   unit:"%", descr:"N balance"},
    Nae_balance :{value:Nae_balance, unit:"%", descr:"Ammonia balance"},
    P_balance   :{value:P_balance,   unit:"%", descr:"P balance"},
  };

  //hide descriptions (debug)
  //Object.values(process_variables).forEach(obj=>delete obj.descr);
  //Object.values(cpr).forEach(obj=>delete obj.descr);
  return {
    process_variables, //activated sludge process variables
    cpr,               //chemical P removal process variables
    effluent,          //State_Variables object
    wastage,           //State_Variables object
  };
};

/*test*/
(function(){
  return
  //--------new State_Variables(     Q, VFA, FBSO, BPO, UPO, USO, iSS,  NH4,   OP, NOx, O2  OHO, PAO)
  let inf = new State_Variables(24.875,  50,  115, 255,  10,  45,  15, 39.1, 7.28,   0, 0,  0,   0);

  let as = inf.activated_sludge({
    T          : 16,        //ºC
    Vp         : 8473.3,    //m3
    Rs         : 15,        //days
    DO         : 2.0,       //mgO2/L
    RAS        : 1.0,       //ø
    waste_from : 'reactor', //string
    mass_FeCl3 : 3000,      //kgFeCl3/d
  });

  //show results
  console.log("=== AS process variables");   console.log(as.process_variables);
  /*
  console.log("=== AS chemical P removal "); console.log(as.cpr);
  console.log("=== Effluent summary");       console.log(as.effluent.summary);
  console.log("=== Effluent summary");       console.log(as.effluent.components);
  console.log("=== Wastage summary");        console.log(as.wastage.components);
  console.log("=== Wastage totals");         console.log(as.wastage.totals);
  console.log("=== Effluent summary");       console.log(as.effluent.components);
  console.log("=== Effluent totals");        console.log(as.effluent.totals);
  */
})();
