/*
  Activated Sludge (AS) + Secondary Settler (SST)
  implementation from G. Ekama notes

  Qi → [Activated Sludge + SST] → Qe
               ↓
               Qw
*/

//load modules
try{
  State_Variables    = require("./state-variables.js");
  constants          = require("./constants.js");
  chemical_P_removal = require("./chemical-P-removal.js");
}catch(e){}

State_Variables.prototype.activated_sludge=function(
  T, Vp, Rs, RAS, waste_from,
  mass_FeCl3
  ){
  //===========================================================================
  // INPUTS
  //===========================================================================
  //default values
  T   = isNaN(T)   ? 16     : T;   //ºC   | Temperature
  Vp  = isNaN(Vp)  ? 8473.3 : Vp;  //m3   | Volume of reactor
  Rs  = isNaN(Rs)  ? 15     : Rs;  //days | Solids Retention Time or Sludge Age
  RAS = isNaN(RAS) ? 1.0    : RAS; //ø    | SST underflow recycle ratio
  /*
    option 'waste_from':

    waste_from="reactor" | waste_from="sst"
    ---------------------+-----------------
     Q→[AS]→[SST]→Qe     | Q→[AS]→[SST]→Qe
         |               |          |
         v Qw            |          v Qw
  */
  waste_from = waste_from || 'reactor'; //"reactor" or "sst"

  //chemical P removal inputs
  mass_FeCl3 = isNaN(mass_FeCl3) ? 50 : mass_FeCl3; //kg/d | mass of FeCl3 added for P precipitation

  //input checks
  if(Vp  <= 0) throw new Error(`Reactor volume (Vp=${Vp}) not allowed`);
  if(Rs  <= 0) throw new Error(`Solids retention time (Rs=${Rs}) not allowed`);
  if(RAS <= 0) throw new Error(`SST recycle ratio (RAS=${RAS}) not allowed`);
  if(['reactor','sst'].indexOf(waste_from)==-1) throw new Error(`The input "waste_from" must be equal to "reactor" or "sst" ("${waste_from}" not allowed)`);

  //get necessary mass ratios
  const f_N_OHO  = this.mass_ratios.f_N_OHO;   //gN/gVSS
  const f_N_UPO  = this.mass_ratios.f_N_UPO;   //gN/gVSS
  const f_N_FBSO = this.mass_ratios.f_N_FBSO;  //gN/gVSS
  const f_N_BPO  = this.mass_ratios.f_N_BPO;   //gN/gVSS

  const f_P_OHO  = this.mass_ratios.f_P_OHO;   //gP/gVSS
  const f_P_UPO  = this.mass_ratios.f_P_UPO;   //gP/gVSS
  const f_P_FBSO = this.mass_ratios.f_P_FBSO;  //gP/gVSS
  const f_P_BPO  = this.mass_ratios.f_P_BPO;   //gP/gVSS

  const f_C_OHO  = this.mass_ratios.f_C_OHO;   //gC/gVSS
  const f_C_UPO  = this.mass_ratios.f_C_UPO;   //gC/gVSS
  const f_C_FBSO = this.mass_ratios.f_C_FBSO;  //gC/gVSS
  const f_C_BPO  = this.mass_ratios.f_C_BPO;   //gC/gVSS

  const f_CV_OHO  = this.mass_ratios.f_CV_OHO;  //gCOD/gVSS
  const f_CV_UPO  = this.mass_ratios.f_CV_UPO;  //gCOD/gVSS
  const f_CV_FBSO = this.mass_ratios.f_CV_FBSO; //gCOD/gVSS
  const f_CV_BPO  = this.mass_ratios.f_CV_BPO;  //gCOD/gVSS

  //flowrate
  const Q = this.Q; //ML/d

  //2 - page 9
  let frac = this.totals;    //object: influent fractionation (COD,TOC,TKN,TP,TSS)
  let Sti  = frac.COD.total; //mgCOD/L | total influent COD "Sti"

  //fSus and fSup ratios
  let Suse = frac.COD.usCOD; //mg/L | USO influent == USO effluent (Susi==Suse)
  let Supi = frac.COD.upCOD; //mg/L | UPO influent
  let fSus = Suse/Sti ||0;   //gUSO/gCOD influent
  let fSup = Supi/Sti ||0;   //gUPO/gCOD influent
  //console.log({Supi,Sti,fSup});

  //2.1 - influent mass fluxes (kg/d)
  let inf_fluxes = this.fluxes;           //object: all mass fluxes. structure: {components, totals}
  let FSti = inf_fluxes.totals.COD.total; //kgCOD/d | influent total COD
  let FSbi = inf_fluxes.totals.COD.bCOD;  //kgCOD/d | influent biodegradable COD (VFA+FBSO+BPO)
  let FXti = inf_fluxes.totals.TSS.uVSS;  //kgVSS/d | influent unbiodegradable VSS
  let FiSS = inf_fluxes.totals.TSS.iSS;   //kgiSS/d | influent iSS

  //===========================================================================
  // EQUATIONS
  //===========================================================================
  //2.2 - kinetics - page 10
  const YH    = constants.YH;           //0.66 gCOD/gCOD | heterotrophic yield coefficient (does not change with temperature)
  const YHvss = YH/f_CV_OHO;            //0.45 gVSS/gCOD | heterotrophic yield coefficient (does not change with temperature)
  const fH    = constants.fH;           //0.20 ø         | endogenous OHO fraction
  const bH    = constants.bH;           //0.24 1/d       | endogenous respiration rate at 20ºC
  const ϴ_bH  = constants.theta_bH;     //1.029 ø        | bH temperature correction factor
  let bHT     = bH*Math.pow(ϴ_bH,T-20); //1/d            | endogenous respiration rate corrected by temperature

  //kinetics for "not all influent FBSO is degraded"
  const k_v20   = constants.k_v20;              //0.070 L/mgVSS·d | note: a high value (~1000) makes FBSO effluent ~0
  const ϴ_k_v20 = constants.theta_k_v20;        //1.035 ø         | k_v20 temperature correction factor
  let k_vT      = k_v20*Math.pow(ϴ_k_v20,T-20); //L/mgVSS·d       | k_v corrected by temperature
  //console.log({k_vT});

  //compute OHO biomass production rate
  let f_XBH = (YHvss*Rs)/(1+bHT*Rs); //gVSS·d/gCOD

  //effluent FBSO
  let S_FBSO_i = this.components.S_FBSO;          //mgCOD/L | influent S_FBSO
  let S_b   = Math.min(S_FBSO_i, 1/(f_XBH*k_vT)); //mgCOD/L | FBSO effluent concentration: cannot be higher than influent S_FBSO
  let FdSbi = Math.max(0, FSbi - Q*S_b);          //kgCOD/d | influent biodegradable COD mass flux that will generate biomass

  //total VSS production
  let MX_BH = FdSbi * f_XBH;         //kgVSS  | OHO live biomass VSS
  let MX_EH = fH * bHT * Rs * MX_BH; //kgVSS  | endogenous residue OHOs
  let MX_I  = FXti * Rs;             //kgVSS  | influent uVSS
  let MX_V  = MX_BH + MX_EH + MX_I;  //kgVSS  | total VSS

  //2.8 - effluent Phosphorus
  let Ps    = (f_P_OHO*(MX_BH+MX_EH)+f_P_UPO*MX_I)/(Rs*Q); //mgP/L | P influent required for sludge production
  let Pti   = frac.TP.total;                               //mgP/L | total P influent
  let Pouse = frac.TP.usOP;                                //mgP/L | P organic unbiodegradable soluble effluent
  let Pobse = S_b*f_P_FBSO/f_CV_FBSO;                      //mgP/L | P organic biodegradable soluble effluent

  let Psa = Math.max(0, Pti - Ps - Pouse - Pobse); //mgP/L | inorganic soluble P available for chemical P removal
  //console.log({Pti,Ps,Pouse,Pobse,Psa});//debug

  /*chemical P removal*/
  let cpr = chemical_P_removal(Q, Psa, mass_FeCl3); //object
  let F_extra_iSS = cpr.extra_iSS.value;            //kgiSS/d
  let Pse         = cpr.PO4e.value;                 //mgP/L | PO4 effluent after chemical P removal

  //total inert solids
  const f_iOHO = constants.f_iOHO;                     //0.15 giSS/gVSS | fraction of inert solids in biomass
  let MX_IO = FiSS*Rs + f_iOHO*MX_BH + F_extra_iSS*Rs; //kgiSS          | total inert solids (iSS + iOHO + P_precipitation)

  //total solids TSS = VSS + iSS
  let MX_T = MX_V + MX_IO; //kgTSS | MX_T = MX_BH + MX_EH + MX_I + MX_IO

  //all solids concentrations
  let X_BH = MX_BH/Vp; //kgVSS/m3 | live biomass OHO VSS
  let X_EH = MX_EH/Vp; //kgVSS/m3 | endogenous residue OHOs VSS
  let X_I  = MX_I/Vp;  //kgVSS/m3 | influent uVSS
  let X_V  = MX_V/Vp;  //kgVSS/m3 | total VSS
  let X_IO = MX_IO/Vp; //kgiSS/m3 | inert solids (iSS + iOHO + P precipitation)
  let X_T  = MX_T/Vp;  //kgTSS/m3 | total

  //2.3 - page 11
  let HRT = Vp/(Q*1000)*24; //h | nominal hydraulic retention time

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

  //2.5 - VSS ratios
  let f_VT    = MX_V/MX_T  ||0; //VSS/TSS ratio
  let f_avOHO = MX_BH/MX_V ||0; //gOHOVSS/gVSS | fraction of active biomass in VSS
  let f_atOHO = MX_BH/MX_T ||0; //gOHOVSS/gTSS | fraction of active biomass in TSS

  //2.6 - Nitrogen - page 12
  let Ns    = (f_N_OHO*(MX_BH+MX_EH)+f_N_UPO*MX_I)/(Rs*Q); //mgN/L | N in influent required for sludge production
  let Nti   = frac.TKN.total;                              //mgN/L | total TKN influent
  let Nai   = this.components.S_FSA;                       //mgN/L | total ammonia influent
  let Nobsi = frac.TKN.bsON;                               //mgN/L | bsON influent (VFA + FBSO)
  let Nouse = frac.TKN.usON;                               //mgN/L | usON influent = effluent
  let Nobpi = frac.TKN.bpON;                               //mgN/L | bpON influent
  let Noupi = frac.TKN.upON;                               //mgN/L | upON influent
  let Nobse = S_b*f_N_FBSO/f_CV_FBSO;                      //mgN/L | bsON effluent (not all FBSO is degraded)

  //effluent ammonia = total TKN - Ns - usON - bsON
  let Nae = Math.max(0, Nti - Ns - Nouse - Nobse); //mgN/L
  //console.log({Nae,Nti,Ns,Nouse,Nobse}); //debugging

  //ammonia balance
  let Nae_balance = (Nae == (Nai + Nobsi + Nobpi - Ns + Noupi - Nobse)) ? 100 :
      100*Nae/(Nai + Nobsi + Nobpi - Ns + Noupi - Nobse); //percentage

  //in AS only: influent nitrate = effluent nitrate
  let Nne = this.components.S_NOx; //mgN/L

  //calculate necessary C for biomass
  let Cs  = (f_C_OHO*(MX_BH+MX_EH)+f_C_UPO*MX_I)/(Rs*Q); //mgC/L | C in influent required for sludge production
  let Cti = frac.TOC.total;                              //mgC/L | total TOC influent

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
  let OHO_was = f*f_CV_OHO*(X_BH+X_EH)*1e3; //mg/L | OHO wastage

  //output streams------------------(Q,  VFA FBSO BPO      UPO      USO   iSS      FSA  OP   NOx  OHO    )
  let effluent = new State_Variables(Qe, 0,  S_b, 0,       0,       Suse, 0,       Nae, Pse, Nne, 0      );
  let wastage  = new State_Variables(Qw, 0,  S_b, BPO_was, UPO_was, Suse, iSS_was, Nae, Pse, Nne, OHO_was);

  //copy influent mass ratios for the new outputs
  effluent.mass_ratios = this.mass_ratios;
  wastage.mass_ratios  = this.mass_ratios;

  //get output mass fluxes (kg/d)
  let eff_fluxes = effluent.fluxes; //object
  let was_fluxes = wastage.fluxes;  //object

  //2.9 - COD Balance
  let FSe = eff_fluxes.totals.COD.total; //kg/d | total COD effluent: USO effluent flux + bCOD not degraded | Qe*(Suse+Sbse)
  let FSw = was_fluxes.totals.COD.total; //kg/d | total COD wastage

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
  let FNti      = inf_fluxes.totals.TKN.total;          //kgN/d | total TKN influent
  let FNte      = eff_fluxes.totals.TKN.total;          //kgN/d | total TKN effluent
  let FNw       = was_fluxes.totals.TKN.total;          //kgN/d | total TKN wastage
  let FNout     = FNte + FNw;                           //kgN/d | total TKN out
  let N_balance = (FNout==FNti) ? 100 : 100*FNout/FNti; //percentage

  //2.11 - P balance
  let FPti      = inf_fluxes.totals.TP.total;           //kgP/d | total TP influent
  let FPte      = eff_fluxes.totals.TP.total;           //kgP/d | total TP effluent
  let FPw       = was_fluxes.totals.TP.total;           //kgP/d | total TP wastage
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
    YHvss   :{value:YHvss,     unit:"gVSS/gCOD",   descr:"Heterotrophic yield coefficient"},
    fSus    :{value:fSus,      unit:"gUSO/gCOD",   descr:"USO/COD ratio (influent)"},
    fSup    :{value:fSup,      unit:"gUPO/gCOD",   descr:"UPO/COD ratio (influent)"},
    k_vT    :{value:k_vT,      unit:"L/mgVSS·d",   descr:"k_v20 corrected by temperature"},
    Ns      :{value:Ns,        unit:"mgN/L",       descr:"N required for sludge production"},
    Ps      :{value:Ps,        unit:"mgP/L",       descr:"P required for sludge production"},
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

  //hide description (debug)
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
{
  //return
  //--------new State_Variables(     Q, VFA, FBSO, BPO, UPO, USO, iSS,  FSA,   OP, NOx, OHO, PAO)
  let inf = new State_Variables(24.875,  50,  115, 255,  10,  45,  15, 39.1, 7.28,   0,   0,   0);

  //-----------activated_sludge( T,     Vp, Rs, RAS, waste_from, mass_FeCl3)
  let as = inf.activated_sludge(16, 8473.3, 15, 1.0,  'reactor',       3000);

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
};
