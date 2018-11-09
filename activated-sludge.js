/*
  AS implementation from G. Ekama handwritten notes

    Qi → [Activated Sludge] → Qe
                ↓
                Qw
*/

//node imports
if(typeof document == "undefined"){State_Variables=require("./state-variables.js");}

State_Variables.prototype.activated_sludge=function(T, Vp, Rs){
  //inputs and default values
  T  = isNaN(T ) ? 16     : T ; //ºC   | Temperature
  Vp = isNaN(Vp) ? 8473.3 : Vp; //m3   | Volume
  Rs = isNaN(Rs) ? 15     : Rs; //days | Solids Retention Time

  //flowrate: convert from ML/d to m3/d
  let Q = this.Q*1000; //m3/d

  //2 - page 9
  let frac = this.totals;           //object: fractionation (COD,TOC,TKN,TP,TSS)
  let COD  = frac.COD.total;        //mg_COD/L influent

  //fSus and fSup ratios
  let fSus = frac.COD.usCOD/COD; //g_USO/g_COD influent
  let fSup = frac.COD.upCOD/COD; //g_UPO/g_COD influent

  //2.1 - influent mass fluxes (kg/d)
  let fluxes = this.fluxes;               //object: all mass fluxes. structure: {components, totals}
  const fCV  = this.mass_ratios.f_CV_UPO; //1.481 gUPO/gVSS
  let FSti   = fluxes.totals.COD.total;   //kg_COD/d  | total COD influent
  let FSbi   = fluxes.totals.COD.bCOD;    //kg_bCOD/d | biodegradable COD (VFA+FBSO+BPO) influent
  let FXti   = fluxes.totals.TSS.uVSS;    //kg_VSS/d  | UPO in VSS influent
  let FiSS   = fluxes.totals.TSS.iSS;     //kg_iSS/d  | iSS flux influent

  //2.2 - kinetics
  const bH = 0.24;                    //1/d | growth rate at 20ºC (standard)
  let bHT  = bH*Math.pow(1.029,T-20); //1/d | growth rate corrected by temperature

  //page 10
  const YH     = 0.45;                   //gVSS/gCOD
  let X_BH     = (YH*Rs)/(1+bHT*Rs);     //g_VSS*d/g_COD | biomass production rate
  let MX_BH    = FSbi * X_BH;            //kg_VSS   | biomass produced
  const fH     = 0.20;                   //         | tabled value
  let MX_EH    = fH * bHT * Rs * MX_BH;  //kg_VSS   | endogenous respiration OHOs
  let MX_I     = FXti * Rs;              //kg_VSS   | unbiodegradable particulate organics
  let MX_V     = MX_BH + MX_EH + MX_I;   //kg_VSS   | total VSS
  const f_iOHO = 0.15;                   //g_iSS/gX | fraction of inert solids in biomass
  let MX_IO    = FiSS*Rs + f_iOHO*MX_BH; //kg_iSS   | total inert solids
  let MX_T     = MX_V + MX_IO;           //kg_TSS   | total TSS

  //2.3 - page 11
  let MLSS_X_TSS = MX_T/Vp; //kg/m3 | total solids concentration in the SST
  let HRT        = Vp/Q*24; //hours | hydraulic retention time

  //2.4 - page 12
  let Qw = Vp/Rs;  //m3/day | wastage flow
  let Qe = Q - Qw; //m3/day | effluent flow

  //2.5 
  let fi         = MX_V/MX_T;     //VSS/TSS ratio
  let MLSS_X_VSS = fi*MLSS_X_TSS; //kg/m3 | VSS concentration in the SST
  let f_avOHO    = MX_BH/MX_V;    //mgOHOVSS/mgVSS | fraction of active biomass in VSS
  let f_atOHO    = fi*f_avOHO;    //mgOHOVSS/mgTSS | fraction of active biomass in TSS

  //2.6 - Nitrogen - page 12
  const fn    = this.mass_ratios.f_N_UPO; //0.10 gN/gVSS
  let Ns      = fn*MX_V/(Rs*Q)*1000; //mgN/L_influent | N in influent required for sludge production
  let Nte     = frac.TKN.total - Ns; //mg/L as N (TKN effluent)
  let ON_FBSO = frac.TKN.bsON;       //mg/L "Nobsi" influent
  let ON_USO  = frac.TKN.usON;       //mg/L "Nouse" influent
  let ON_BPO  = frac.TKN.bpON;       //mg/L "Nobsi" influent
  let ON_UPO  = frac.TKN.upON;       //mg/L "Noupi" influent

  //effluent ammonia
  let Nae         = Nte - ON_USO; //mg/L as N (ammonia)
  let Nae_balance = 100*Nae/(this.components.S_FSA + ON_FBSO + ON_BPO - (Ns - ON_UPO)); //percentage

  //2.7 - oxygen demand - page 13
  let FOc = FSbi*((1-fCV*YH)+fCV*(1-fH)*bHT*X_BH); //kg_O/d | carbonaceous oxygen demand
  let FOn = 4.57*Q*Nae/1000;                       //kg_O/d | nitrogenous oxygen demand
  let FOt = FOc + FOn;                             //kg_O/d | total oxygen demand
  let OUR = FOt*1e3/(Vp*24);                       //mg/L·h | oxygen uptake rate

  //2.8 - effluent Phosphorus
  const fp = this.mass_ratios.f_P_UPO; //0.025 gP/gVSS
  let Ps  = fp*MX_V/(Rs*Q)*1000;       //mg_P/l | P required for sludge production
  let Pti = frac.TP.total;             //mg/L   | total P influent
  let Pte = Pti - Ps;                  //mg/L   | total P effluent
  let Pse = Pte - frac.TP.usOP;        //mg/L   | total inorganic soluble P effluent

  //2.9 - COD Balance
    let Suse        = frac.COD.usCOD;                       //mg/L as O | USO influent == effluent
    let FSe         = Qe*Suse/1000;                         //kg/d as O | USO effluent flux
    let FSw         = Qw*(Suse + fCV*MLSS_X_VSS*1000)/1000; //kg/d as O | COD wastage flux
    let FSout       = FSe + FOc + FSw;                      //kg/d as O | total COD out flux
    let COD_balance = 100*FSti/FSout;                       //percentage

  //2.10 - N balance
    let FNti      = fluxes.totals.TKN.total;                     //kg/d as N | total TKN influent
    let FNw       = Qw*(fn*MLSS_X_VSS*1000 + ON_USO + Nae)/1000; //kg/d as N | total TKN wastage
    let FNte      = Qe*(ON_USO + Nae)/1000;                      //kg/d as N | total TKN effluent
    let FNout     = FNw + FNte                                   //kg/d as N | total TKN out
    let N_balance = 100*FNti/FNout;                              //percentage

  //2.11 - P balance
    let FPti      = fluxes.totals.TP.total;             //kg/d as P | total TP influent
    let FPw       = Qw*(fp*MLSS_X_VSS*1000 + Pte)/1000; //kg/d as P | total TP wastage
    let FPte      = Qe*Pte/1000;                        //kg/d as P | total TP effluent
    let FPout     = FPw + FPte;                         //kg/d as P | total TP out
    let P_balance = 100*FPti/FPout;                     //P balance
  //AS end

  //activated sludge
  let BPO_eff = 0; //mg/L | BPO concentration in the effluent TODO
  let BPO_was = 0; //mg/L | BPO concentration in the wastage  TODO
  let UPO_eff = 0; //mg/L | UPO concentration in the effluent TODO
  let UPO_was = 0; //mg/L | UPO concentration in the wastage  TODO
  let iSS_eff = 0; //mg/L | iSS concentration in the effluent TODO
  let iSS_was = 0; //mg/L | iSS concentration in the wastage  TODO

  //create 2 new state variables (effluent, wastage) TODO
  //syntax ------------->constructor(Q,  VFA, FBSO,     BPO,     UPO,  USO,     iSS, FSA, PO4, NOx)
  let effluent = new State_Variables(Qe,   0,    0, BPO_eff, UPO_eff, Suse, iSS_eff, Nae, Pse,   0);
  let wastage  = new State_Variables(Qw,   0,    0, BPO_was, UPO_was, Suse, iSS_was, Nae, Pse,   0);

  //return {effluent, wastage, process_variables};
  let process_variables={
    //balances
    COD_balance, N_balance, Nae_balance, P_balance,

    //effluent things
    FNte    :{value:FNte,       unit:"kg/d_as_N",     descr:"Flux TKN effluent"},
    Nte     :{value:Nte,        unit:"mg/L_as_N",     descr:"TKN concentration effluent"},
    FPte    :{value:FPte,       unit:"kg/d_as_P",     descr:"Flux TP effluent"},
    Pte     :{value:Pte,        unit:"mg/L_as_P",     descr:"TP concentration effluent"},

    //wastage
    FSw     :{value:FSw,        unit:"kg/d_as_O",     descr:"Flux COD wastage"},

    //process
    fSus    :{value:fSus,       unit:"g_USO/g_COD",   descr:"USO/COD ratio (influent)"},
    fSup    :{value:fSup,       unit:"g_UPO/g_COD",   descr:"UPO/COD ratio (influent)"}, 
    FSout   :{value:FSout,      unit:"kg/d_as_O",     descr:"Flux COD out (effluent + FOc + wastage)"},
    Ns      :{value:Ns,         unit:"mg/L_as_N",     descr:"N required for sludge production"},
    Ps      :{value:Ps,         unit:"mg/L_as_P",     descr:"P required for sludge production"},
    HRT     :{value:HRT,        unit:"hour",          descr:"Hydraulic Retention Time"},
    bHT     :{value:bHT,        unit:"1/d",           descr:"OHO Growth rate corrected by temperature"},
    X_BH    :{value:X_BH,       unit:"g_VSS·d/g_COD", descr:"Biomass production rate"},
    MX_BH   :{value:MX_BH,      unit:"kg_VSS",        descr:"Biomass produced VSS"},
    MX_EH   :{value:MX_EH,      unit:"kg_VSS",        descr:"Endogenoous residue VSS"},
    MX_I    :{value:MX_I,       unit:"kg_VSS",        descr:"Unbiodegradable organics VSS"},
    MX_V    :{value:MX_V,       unit:"kg_VSS",        descr:"Volatile Suspended Solids"},
    MX_IO   :{value:MX_IO,      unit:"kg_iSS",        descr:"Inert Solids (influent+biomass)"},
    MX_T    :{value:MX_T,       unit:"kg_TSS",        descr:"Total Suspended Solids"},
    fi      :{value:fi,         unit:"g_VSS/g_TSS",   descr:"VSS/TSS ratio"},
    X_V     :{value:MLSS_X_VSS, unit:"kg_VSS/m3",     descr:"VSS concentration at SST"},
    X_T     :{value:MLSS_X_TSS, unit:"kg_TSS/m3",     descr:"TSS concentration at SST"},
    f_avOHO :{value:f_avOHO,    unit:"g_OHO/g_VSS",   descr:"Active fraction of the sludge (VSS)"},
    f_atOHO :{value:f_atOHO,    unit:"g_OHO/g_TSS",   descr:"Active fraction of the sludge (TSS)"},
    FOc     :{value:FOc,        unit:"kg/d_as_O",     descr:"Carbonaceous Oxygen Demand"},
    FOn     :{value:FOn,        unit:"kg/d_as_O",     descr:"Nitrogenous Oxygen Demand"},
    FOt     :{value:FOt,        unit:"kg/d_as_O",     descr:"Total Oxygen Demand"},
    OUR     :{value:OUR,        unit:"mg/L·h_as_O",   descr:"Oxygen Uptake Rate"},
  };

  return {effluent, wastage, process_variables};
};

/*test*/
(function test(){
  let sv = new State_Variables(24.875,50,115,255,10,45,15,39.1,7.28,0);
  //console.log(sv.totals);
  //console.log(sv.fluxes);
  let as = sv.activated_sludge();
  console.log(as.process_variables);
  return;
})();
