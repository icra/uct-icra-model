/**
  * Reactor implementation from G. Ekama hand notes
*/

//import "State_Variables" class
if(typeof(require)!="undefined"){var State_Variables=require("./state-variables.js");}

State_Variables.prototype.activated_sludge=function(Q, T, Vp, SRT){
  //inputs
  Q   = Q   || 24875;  //m3/d | Flowrate
  T   = T   || 16;     //ºC   | Temperature
  Vp  = Vp  || 8473.3; //m3   | Volume
  SRT = SRT || 15;     //days | Solids retention time

  //2 - page 9
  let iSS    = this.components.X_iSS; //mg_iSS/L
  let totals = this.compute_totals(); //object: complete fractionation inside
  let COD    = totals.Total_COD;      //mg_COD/L
  let BSO    = totals.COD[1].bsCOD;   //mg_COD/L
  let USO    = totals.COD[1].usCOD;   //mg_COD/L
  let BPO    = totals.COD[2].bpCOD;   //mg_COD/L
  let UPO    = totals.COD[2].upCOD;   //mg_COD/L

  //fSus and fSup ratios
  let fSus = USO/COD; //g_USO/g_COD
  let fSup = UPO/COD; //g_UPO/g_COD

  //2.1 - mass fluxes (kg/d)
  const fCV = this.mass_ratios.f_CV_UPO; //1.481
  let FSti = Q*COD/1000;                 //kg_COD/d  | total COD influent
  let FSbi = FSti*(1-fSus-fSup);         //kg_bCOD/d | biodegradable COD (VFA+FBSO) influent
  let FXti = FSti*fSup/fCV;              //kg_VSS/d  | UPO in VSS influent
  let FiSS = Q*iSS/1000;                 //kg_iSS/d  | iSS flux influent

  //2.2 - kinetics
  const bH = 0.24;                    //1/d | growth rate at 20ºC (standard)
  let bHT  = bH*Math.pow(1.029,T-20); //1/d | growth rate corrected by temperature
  //page 10
  const YH     = 0.45;                    //gVSS/gCOD
  let X_BH     = (YH*SRT)/(1+bHT*SRT);    //g_VSS*d/g_COD
  let MX_BH    = FSbi * X_BH;             //kg_VSS   | biomass produced
  const fH     = 0.20;                    //         | tabled value
  let MX_EH    = fH * bHT * SRT * MX_BH;  //kg_VSS   | endogenous respiration OHOs
  let MX_I     = FXti * SRT;              //kg_VSS   | unbiodegradable particulate organics
  let MX_V     = MX_BH + MX_EH + MX_I;    //kg_VSS   | total VSS
  const f_iOHO = 0.15;                    //g_iSS/gX | fraction of inert solids in biomass
  let MX_IO    = FiSS*SRT + f_iOHO*MX_BH; //kg_iSS   | total inert solids
  let MX_T     = MX_V + MX_IO;            //kg_TSS   | total TSS

  //2.3 - page 11
  let MLSS_X_TSS = MX_T/Vp; //kg/m3 | total solids concentration in the SST
  let HRT        = Vp/Q*24; //hours | hydraulic retention time

  //2.4 - page 12
  let Qw = Vp/SRT; //m3/day | wastage flow

  //2.5 
  let fi         = MX_V/MX_T;     //VSS/TSS ratio
  let MLSS_X_VSS = fi*MLSS_X_TSS; //kg/m3 | VSS concentration in the SST
  let f_avOHO    = MX_BH/MX_V;    //mgOHOVSS/mgVSS | fraction of active biomass in VSS
  let f_atOHO    = fi*f_avOHO;    //mgOHOVSS/mgTSS | fraction of active biomass in TSS

  //2.6 - Nitrogen - page 12
  const fn    = 0.10;                  //g_N/g_VSS
  let Ns      = fn*MX_V/(SRT*Q)*1000;  //mgN/L_influent | N in influent required for sludge production
  let Nte     = totals.Total_TKN - Ns; //mg/L as N (TKN effluent)
  let ON_FBSO = totals.ON[1].bsON;     //mg/L "Nobsi"
  let ON_USO  = totals.ON[1].usON;     //mg/L "Nouse"
  let ON_BPO  = totals.ON[2].bpON;     //mg/L "Nobsi"
  let ON_UPO  = totals.ON[2].upON;     //mg/L "Noupi"

  //effluent ammonia
  let Nae               = Nte - ON_USO; //mg/L as N (ammonia)
  let Nae_balance_error = Math.abs(1 - Nae/(this.components.S_FSA + ON_FBSO + ON_BPO - (Ns - ON_UPO))); //unitless

  //2.7 - oxygen demand - page 13
  let FOc = FSbi*((1-fCV*YH)+fCV*(1-fH)*bHT*X_BH); //kg_O/d | carbonaceous oxygen demand
  let FOn = 4.57*Q*Nae/1000;                       //kg_O/d | nitrogenous oxygen demand
  let FOt = FOc + FOn;                             //kg_O/d | total oxygen demand
  let OUR = FOt*1e3/(Vp*24);                       //mg/L·h | oxygen uptake rate

  //2.8 - effluent Phosphorus
  const fp = 0.025;                  //g_P/g_VSS
  let Ps  = fp * MX_V*1000/(Q*SRT);  //mg_P/l | P required for sludge production
  let Pti = totals.Total_TP;         //mg/L   | total P influent
  let Pte = Pti - Ps;                //mg/L   | total P effluent
  let Pse = Pte - totals.OP[1].usOP; //mg/L   | total inorganic soluble P effluent

  //2.9 - COD Balance
  let Suse              = totals.COD[1].usCOD;                  //mg/L as O | USO influent concentration
  let FSe               = (Q-Qw)*Suse/1000;                     //kg/d as O | USO effluent flux
  let FSw               = Qw*(Suse + fCV*MLSS_X_VSS*1000)/1000; //kg/d as O | COD wastage flux
  let FSout             = FSe + FOc + FSw;                      //kg/d as O | total COD out flux
  let COD_balance_error = Math.abs(1 - FSti/FSout);             //unitless  | COD balance

  //2.10 - N balance
  let FNti = Q*totals.Total_TKN/1000;                                                  //kg/d     | total TKN influent flux
  let FNte = Qw*(fn*MLSS_X_VSS*1000 + ON_USO + Nae)/1000 + (Q-Qw)*(ON_USO + Nae)/1000; //kg/d     | total TKN out flux
  let N_balance_error = Math.abs(1 - FNti/FNte);                                       //unitless | TKN balance

  //2.11 - P balance
  let FPti = Q*totals.Total_TP/1000;                               //kg/d     | total TP influent flux
  let FPte = Qw*(fp*MLSS_X_VSS*1000 + Pte)/1000 + (Q-Qw)*Pte/1000; //kg/d     | total TP out flux
  let P_balance_error = Math.abs(1 - FPti/FPte);                   //unitless | P balance

  //3 - nitrification
  const µAm = 0.45;                     //1/d | growth rate at 20ºC
  let µAmT  = µAm*Math.pow(1.123,T-20); //1/d | growth rate corrected by temperature
  const Kn  = 1.0;                      //mg/L as N at 20ºC
  let KnT   = Kn*Math.pow(1.123,T-20);  //mg/L as N corrected by temperature
  const bA  = 0.04;                     //1/d at 20ºC
  const bAT = bA*Math.pow(1.029,T-20);  //1/d | growth rate corrected by temperature

  //page 17
  let SF  = 1.25;                    //Safety factor. Design choice. moves the sludge age
  let fxm = 1 - SF*(bAT+1/SRT)/µAmT; //maximum design unaerated sludge mass fraction
  let MXu = fxm*MX_T;                //kg TSS | sludge that can be unaerated and still nitrify well
  let fxt = 0.39;                    //input or calculated? TBD

  //effluent ammonia nitrification
  let Nae_fxm = KnT/(SF-1);                                      //mg/L as N | effluent ammonia concentration if fxt == fxm
  let Nae_fxt = KnT*(bAT + 1/SRT)/( µAmT*(1-fxt) - bAT - 1/SRT); //mg/L as N | effluent ammonia concentration if fxt <  fxm

  //effluent TKN nitrification -- page 18
  let Nte_nitri = Nae_fxt + ON_USO;                  //mg/L as N
  let Nc        = totals.Total_TKN - Ns - Nte_nitri; //mg/L as N | Nitrification capacity

  //oxygen demand
  let FOn_nitri = 4.57*Q*Nc/1000;

  //temporal return for nitrification
  return {
    µAmT, KnT, bAT, fxm, MXu, Nae_fxm, Nae_fxt,
    Nte_nitri, Nc,
    FOn_nitri,
  }

  //continue here TODO
  //3.2 - denitrification - page 19
  return {
    //TODO
  }

  //console.log(totals);
  return {
    //balances
    COD_balance_error,
    N_balance_error,
    Nae_balance_error,
    P_balance_error,

    //COD
    fSus    :{value:fSus,       unit:"g_USO/g_COD",   descr:"USO/COD ratio"},
    fSup    :{value:fSup,       unit:"g_UPO/g_COD",   descr:"UPO/COD ratio"}, 
    FSti    :{value:FSti,       unit:"kg/d_as_O",     descr:"Flux COD influent"},
    FSout   :{value:FSout,      unit:"kg/d_as_O",     descr:"Flux COD out (effluent + FOc + wastage)"},
    FSbi    :{value:FSbi,       unit:"kg/d_as_O",     descr:"Flux biodegradable COD influent"},
    FSe     :{value:FSe,        unit:"kg/d_as_O",     descr:"Flux COD effluent"},
    FSw     :{value:FSw,        unit:"kg/d_as_O",     descr:"Flux COD wastage"},

    //Nitrogen
    FNti    :{value:FNti,       unit:"kg/d_as_N",     descr:"Flux TKN influent"},
    FNte    :{value:FNte,       unit:"kg/d_as_N",     descr:"Flux TKN effluent"},
    Ns      :{value:Ns,         unit:"mg/L_as_N",     descr:"N required for sludge production"},
    Nte     :{value:Nte,        unit:"mg/L_as_N",     descr:"TKN concentration effluent"},
    Nae     :{value:Nae,        unit:"mg/L_as_N",     descr:"FSA (ammonia, NH4) concentration effluent"},

    //Phosphorus
    FPti    :{value:FPti,       unit:"kg/d_as_P",     descr:"Flux TP influent"},
    FPte    :{value:FPte,       unit:"kg/d_as_P",     descr:"Flux TP effluent"},
    Ps      :{value:Ps,         unit:"mg/L_as_P",     descr:"P required for sludge production"},
    Pte     :{value:Pte,        unit:"mg/L_as_P",     descr:"TP concentration effluent"},
    Pse     :{value:Pse,        unit:"mg/L_as_P",     descr:"Inorganic Soluble P concentration effluent"},

    //VSS
    Qw      :{value:Qw,         unit:"m3/d",          descr:"Wastage flowrate"},
    HRT     :{value:HRT,        unit:"hour",          descr:"Hydraulic Retention Time"},
    bHT     :{value:bHT,        unit:"1/d",           descr:"OHO Growth rate corrected by temperature"},
    FXti    :{value:FXti,       unit:"kg_VSS/d",      descr:"Flux UPO in VSS influent"},
    FiSS    :{value:FiSS,       unit:"kg_iSS/d",      descr:"Flux iSS influent"},
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

    //Oxygen demand
    FOc     :{value:FOc,        unit:"kg/d_as_O",     descr:"Carbonaceous Oxygen Demand"},
    FOn     :{value:FOn,        unit:"kg/d_as_O",     descr:"Nitrogenous Oxygen Demand"},
    FOt     :{value:FOt,        unit:"kg/d_as_O",     descr:"Total Oxygen Demand"},
    OUR     :{value:OUR,        unit:"mg/L·h_as_O",   descr:"Oxygen Uptake Rate"},
  };
};

/* test
*/
  let sv               = new State_Variables('reactor');
  sv.components.S_VFA  = 50;
  sv.components.S_FBSO = 115;
  sv.components.X_BPO  = 255;
  sv.components.X_UPO  = 10;
  sv.components.S_USO  = 45;
  sv.components.X_iSS  = 15;
  sv.components.S_FSA  = 39.1;
  sv.components.S_OP   = 7.28;
  sv.components.S_NOx  = 0;
  console.log(sv.activated_sludge());
