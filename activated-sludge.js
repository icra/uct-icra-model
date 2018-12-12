/*
  AS + SST implementation from G. Ekama notes
  Qi → [Activated Sludge + SST] → Qe
                  ↓ 
                  Qw
*/
//import files
try{
  State_Variables   =require("./state-variables.js");
  chemical_P_removal=require("./chemical-P-removal.js");
}catch(e){}

State_Variables.prototype.activated_sludge=function(T,Vp,Rs,RAS,waste_from,mass_FeCl3){
  //inputs and default values
  T   = isNaN(T )  ? 16     : T ;  //ºC   | Temperature
  Vp  = isNaN(Vp)  ? 8473.3 : Vp;  //m3   | Volume
  Rs  = isNaN(Rs)  ? 15     : Rs;  //days | Solids Retention Time or Sludge Age
  RAS = isNaN(RAS) ? 1.0    : RAS; //ø    | SST underflow recycle ratio
  /* 
    option 'waste_from'

    "reactor"             || "sst"
    ----------------------++----------------------
    Q-->[AS]-->[SST]-->Qe || Q-->[AS]-->[SST]-->Qe
         |                ||             |
         v Qw             ||             v Qw
  */
  waste_from = waste_from || 'reactor'; //"reactor" or "sst"
  if(['reactor','sst'].indexOf(waste_from)==-1) throw `The input "waste_from" must be equal to "reactor" or "sst" (not "${waste_from}")`;
  mass_FeCl3 = isNaN(mass_FeCl3) ? 50 : mass_FeCl3; //kg/d | mass of FeCl3 added for chemical P removal

  //get necessary mass ratios
  const f_N_OHO  = this.mass_ratios.f_N_OHO;   //gN/gVSS
  const f_N_UPO  = this.mass_ratios.f_N_UPO;   //gN/gVSS
  const f_N_FBSO = this.mass_ratios.f_N_FBSO;  //gN/gVSS
  const f_N_BPO  = this.mass_ratios.f_N_BPO;   //gN/gVSS
  const f_P_OHO  = this.mass_ratios.f_P_OHO;   //gP/gVSS
  const f_P_UPO  = this.mass_ratios.f_P_UPO;   //gP/gVSS
  const f_P_FBSO = this.mass_ratios.f_P_FBSO;  //gP/gVSS
  const f_P_BPO  = this.mass_ratios.f_P_BPO;   //gP/gVSS
  const fCV_OHO  = this.mass_ratios.f_CV_OHO;  //gCOD/gVSS
  const fCV_UPO  = this.mass_ratios.f_CV_UPO;  //gCOD/gVSS
  const fCV_FBSO = this.mass_ratios.f_CV_FBSO; //gCOD/gVSS
  const fCV_BPO  = this.mass_ratios.f_CV_BPO;  //gCOD/gVSS

  //flowrate
  let Q = this.Q; //ML/d

  //2 - page 9
  let frac = this.totals;    //object: influent fractionation (COD,TOC,TKN,TP,TSS)
  let COD  = frac.COD.total; //mg_COD/L influent "Sti"

  //fSus and fSup ratios
  let Suse = frac.COD.usCOD; //mg/L | USO influent == USO effluent
  let Supi = frac.COD.upCOD; //mg/L | UPO influent
  let fSus = Suse/COD;       //gUSO/gCOD influent
  let fSup = Supi/COD;       //gUPO/gCOD influent

  //2.1 - influent mass fluxes (kg/d)
  let inf_fluxes = this.fluxes;                //object: all mass fluxes. structure: {components, totals}
  let FSbi       = inf_fluxes.totals.COD.bCOD; //kg_bCOD/d | biodegradable COD (VFA+FBSO+BPO) influent
  let FXti       = inf_fluxes.totals.TSS.uVSS; //kg_VSS/d  | UPO in VSS influent
  let FiSS       = inf_fluxes.totals.TSS.iSS;  //kg_iSS/d  | iSS flux influent

  //2.2 - kinetics - page 10
  const YH  = 0.45;                    //gVSS/gCOD | yield coefficient (does not change with temperature)
  const bH  = 0.24;                    //1/d | endogenous respiration rate at 20ºC
  let bHT   = bH*Math.pow(1.029,T-20); //1/d | endogenous respiration rate corrected by temperature
  let f_XBH = (YH*Rs)/(1+bHT*Rs);      //gVSS·d/gCOD | OHO biomass production rate

  //bCOD not degraded (FBSO)
  const k_v20 = 10000;                      //change to 0.07 (current value makes that BSO effluent is ≈ 0) TODO
  let k_vT    = k_v20*Math.pow(1.035,T-20); //L/(mgVSS·d)
  let S_b     = 1/(f_XBH*k_vT);             //mgCOD/L
  let FdSbi   = FSbi - Q*S_b;               //kg/d COD

  //total VSS solids
  let MX_BH = FdSbi * f_XBH;          //kgVSS | OHO live biomass
  const fH  = 0.20;                   //ø     | UPO OHO fraction
  let MX_EH = fH * bHT * Rs * MX_BH;  //kgVSS | endogenous residue OHOs
  let MX_I  = FXti * Rs;              //kgVSS | influent UPO
  let MX_V  = MX_BH + MX_EH + MX_I;   //kgVSS | total VSS

  //2.8 - effluent Phosphorus 
  let Ps    = (f_P_OHO*(MX_BH+MX_EH) + f_P_UPO*MX_I)/(Rs*Q); //mgP/L | P influent required for sludge production
  let Pti   = frac.TP.total;                                 //mgP/L | total P influent
  let Pte   = Pti - Ps;                                      //mgP/L | total P effluent
  let Pouse = frac.TP.usOP;                                  //mgP/L | P organic unbiodegradable soluble effluent
  let Pobse = S_b*f_P_FBSO/fCV_FBSO;                         //mgP/L | P organic biodegradable soluble effluent
  let Psa   = Pte - Pouse - Pobse;                           //mgP/L | inorganic soluble P available for chemical P removal

  /*chemical P removal*/
  let cpr         = chemical_P_removal(Q, Psa, mass_FeCl3); //object
  let F_extra_iSS = cpr.extra_iSS.value;                    //kgiSS/d
  let Pse         = cpr.PO4e.value;                         //mgP/L | PO4 effluent after chemical P removal

  //total inert solids
  const f_iOHO = 0.15;                                 //giSS/gVSS | fraction of inert solids in biomass
  let MX_IO = FiSS*Rs + f_iOHO*MX_BH + F_extra_iSS*Rs; //kgiSS | total inert solids

  //total solids TSS = VSS + iSS
  let MX_T = MX_V + MX_IO; //kgTSS | MX_BH + MX_EH + MX_I + MX_IO

  //all solids concentrations
  let X_BH = MX_BH/Vp; //kgVSS/m3 | live biomass concentration
  let X_EH = MX_EH/Vp; //kgVSS/m3 | endogenous residue OHOs
  let X_I  = MX_I/Vp;  //kgVSS/m3 | influent UPO
  let X_V  = MX_V/Vp;  //kgVSS/m3 | VSS
  let X_IO = MX_IO/Vp; //kgiSS/m3 | inert solids
  let X_T  = MX_T/Vp;  //kgTSS/m3 | TSS

  //2.3 - page 11
  let HRT = Vp/(Q*1000)*24; //h | nominal hydraulic retention time

  //secondary settler (SST) and recycle flow
  let SST=(function(RAS){
    let f     = (1+RAS)/RAS;    //ø     | concentrating factor
    let X_RAS = f*X_T;          //kg/m3 | TSS concentration
    let Qr    = Q*RAS;          //ML/d  | recycle flowrate
    let Qw    = (Vp/Rs)/f/1000; //ML/d  | SST wastage flowrate
    return {f,X_RAS,Qr,Qw};
  })(RAS);

  //2.4 - page 12
  let Qw = (function(){ //ML/d | wastage flowrate
    if     (waste_from=='reactor') return (Vp/Rs)/1000;
    else if(waste_from=='sst')     return SST.Qw;
    else                           throw {waste_from};
  })();

  //effluent flowrate
  let Qe = Q - Qw; //ML/d

  //BPO, UPO, iSS concentrating factor in the recycle underflow
  let f = waste_from=='sst' ? SST.f : 1;

  //2.5
  let fi      = MX_V/MX_T;  //VSS/TSS ratio
  let f_avOHO = MX_BH/MX_V; //mgOHOVSS/mgVSS | fraction of active biomass in VSS
  let f_atOHO = fi*f_avOHO; //mgOHOVSS/mgTSS | fraction of active biomass in TSS

  //2.6 - Nitrogen - page 12 
  let Ns    = (f_N_OHO*(MX_BH+MX_EH) + f_N_UPO*MX_I)/(Rs*Q); //mgN/L | N in influent required for sludge production
  let Nti   = frac.TKN.total;                                //mgN/L | total TKN influent
  let Nte   = Nti - Ns;                                      //mgN/L | total TKN effluent
  let Nobsi = frac.TKN.bsON;                                 //mgN/L | bsON influent
  let Nouse = frac.TKN.usON;                                 //mgN/L | usON influent = effluent
  let Nobpi = frac.TKN.bpON;                                 //mgN/L | bpON influent
  let Noupi = frac.TKN.upON;                                 //mgN/L | upON influent
  let Nobse = S_b*f_N_FBSO/fCV_FBSO;                         //mgN/L | bsON effluent (not all FBSO is degraded)

  //effluent ammonia = total TKN - usON - bsON
  let Nae = Nte - Nouse - Nobse; //mg/L

  //ammonia balance
  let Nae_balance = 100*Nae/(this.components.S_FSA + Nobsi + Nobpi - Ns + Noupi - Nobse); //percentage

  //concentration of wastage {BPO, UPO, iSS}
  //f is the concentrating factor (if we are wasting from SST) = (1+RAS)/RAS. Otherwise is 1
  //solids summary:
  //  MX_BH = FdSbi * X_BH;                                  //kg_VSS | biomass production                   (OHO)
  //  MX_EH = fH * bHT * Rs * MX_BH;                         //kg_VSS | endogenous residue OHOs              (OHO)
  //  MX_I  = FXti * Rs;                                     //kg_VSS | unbiodegradable particulate organics (UPO)
  //  MX_V  = MX_BH + MX_EH + MX_I;                          //kg_VSS | total VSS                            (OHO+UPO)
  //  MX_IO = FiSS*Rs + f_iOHO*MX_BH + F_extra_iSS;          //kg_iSS | total inert solids                   (iSS)
  //  MX_T  = MX_V + MX_IO;                                  //kg_TSS | total TSS                            (OHO+UPO+iSS)
  let BPO_was = f*fCV_OHO*(1-fH)*X_BH*1000;                  //mg/L   | BPO concentration
  let UPO_was = f*(fCV_OHO*(fH*X_BH+X_EH)+fCV_UPO*X_I)*1000; //mg/L   | UPO concentration
  let iSS_was = f*X_IO*1000;                                 //mg/L   | iSS concentration (precipitation iSS already included in X_IO)

  //influent nitrate
  let Nni = this.components.S_NOx;

  //output streams------------------(Q,  VFA FBSO BPO      UPO      USO   iSS      FSA  OP   NOx)
  let effluent = new State_Variables(Qe, 0,  S_b, 0,       0,       Suse, 0,       Nae, Pse, Nni);
  let wastage  = new State_Variables(Qw, 0,  S_b, BPO_was, UPO_was, Suse, iSS_was, Nae, Pse, Nni); 

  //get output fluxes
  let eff_fluxes = effluent.fluxes; //object
  let was_fluxes = wastage.fluxes;  //object

  //2.9 - COD Balance
  let FSti = inf_fluxes.totals.COD.total; //kg/d | total COD influent
  let FSe  = eff_fluxes.totals.COD.total; //kg/d | total COD effluent: USO effluent flux + bCOD not degraded | Qe*(Suse+S_b)
  let FSw  = was_fluxes.totals.COD.total; //kg/d | total COD wastage

  //2.7 - oxygen demand - page 13
  //carbonaceous oxygen demand
  let FOc = (function(){
    let catabolism  = 1 - fCV_OHO*YH;           //gCOD/gCOD | electrons used for energy (catabolism)
    let respiration = fCV_OHO*(1-fH)*bHT*f_XBH; //gCOD/gCOD | oxygen demand for endogenous respiration (O2->CO2)
    return FdSbi*(catabolism + respiration);    //kgO/d
  })();
  //console.log({FOc});
  //FOc = FSti - (FSe+FSw);
  //console.log({FOc});
  let FOn = 4.57*Q*Nae;       //kgO/d  | nitrogenous oxygen demand
  let FOt = FOc + FOn;        //kgO/d  | total oxygen demand
  let OUR = FOt/(Vp*24)*1000; //mg/L·h | oxygen uptake rate

  //COD balance
  let FSout       = FSe + FSw + FOc; //kg/d | total COD out flux
  let COD_balance = 100*FSout/FSti;  //percentage

  //2.10 - N balance
  let FNti      = inf_fluxes.totals.TKN.total; //kg/d as N | total TKN influent
  let FNte      = eff_fluxes.totals.TKN.total; //kg/d as N | total TKN effluent
  let FNw       = was_fluxes.totals.TKN.total; //kg/d as N | total TKN wastage
  let FNout     = FNte + FNw;                  //kg/d as N | total TKN out
  let N_balance = 100*FNti/FNout;              //percentage

  //2.11 - P balance
  let FPti      = inf_fluxes.totals.TP.total; //kg/d as P | total TP influent
  let FPte      = eff_fluxes.totals.TP.total; //kg/d as P | total TP effluent
  let FPw       = was_fluxes.totals.TP.total; //kg/d as P | total TP wastage
  let FPremoved = cpr.PO4_removed.value;      //kg/d as P | total PO4 removed by FeCl3
  let FPout     = FPte + FPw + FPremoved;     //kg/d as P | total TP out
  let P_balance = 100*FPti/FPout;             //percentage

  //process_variables
  let process_variables={
    fSus    :{value:fSus,      unit:"gUSO/gCOD",   descr:"USO/COD ratio (influent)"},
    fSup    :{value:fSup,      unit:"gUPO/gCOD",   descr:"UPO/COD ratio (influent)"}, 
    Ns      :{value:Ns,        unit:"mgN/L",       descr:"N required for sludge production"},
    Ps      :{value:Ps,        unit:"mgN/L",       descr:"P required for sludge production"},
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
    fi      :{value:fi,        unit:"gVSS/gTSS",   descr:"VSS/TSS ratio"},
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
  Object.values(process_variables).forEach(obj=>delete obj.descr);
  Object.values(cpr).forEach(obj=>delete obj.descr);
  return {
    process_variables,
    cpr,
    errors:[], //no error checking in AS
    effluent, 
    wastage,
  };
};

/*test*/
(function(){
  //return
  //new influent
  //syntax---------------------(Q       VFA FBSO BPO  UPO USO iSS FSA   OP    NOx)
  let inf = new State_Variables(24.875, 50, 115, 255, 10, 45, 15, 39.1, 7.28, 0  ); //settled ww

  //syntax---------------------(T   Vp      Rs  RAS  waste_from mass_FeCl3)
  let as = inf.activated_sludge(16, 8473.3, 15, 1.0, 'reactor', 3000);

  //show results
  console.log("=== AS process variables");   console.log(as.process_variables);
  console.log("=== AS chemical P removal "); console.log(as.cpr);
  return
  console.log("=== Effluent summary");       console.log(as.effluent.summary);
  console.log("=== Wastage summary");        console.log(as.wastage.summary);
})();
