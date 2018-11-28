/*
  AS + SST implementation from G. Ekama notes

  Qi → [Activated Sludge + SST] → Qe
                  ↓ 
                  Qw
*/

//import files
if(typeof document == "undefined"){State_Variables=require("./state-variables.js");}

State_Variables.prototype.activated_sludge=function(T,Vp,Rs,RAS,waste_from){
  //inputs and default values
  T   = isNaN(T )  ? 16     : T ;  //ºC   | Temperature
  Vp  = isNaN(Vp)  ? 8473.3 : Vp;  //m3   | Volume
  Rs  = isNaN(Rs)  ? 15     : Rs;  //days | Solids Retention Time or Sludge Age
  RAS = isNaN(RAS) ? 1.0    : RAS; //ø    | SST underflow recycle ratio
  waste_from = waste_from || 'reactor'; //"reactor" or "sst"
  /** option 'waste_from':
    * waste from reactor:  || waste from sst:
    * ---------------------++---------------------
    * Q-->[AS]->[SST]-->Qe || Q-->[AS]->[SST]-->Qe
    *      |               ||            |
    *      v Qw            ||            v Qw
  *** ---------------------++---------------------*/
  if(['reactor','sst'].indexOf(waste_from)==-1) throw `The input "waste_from" must be equal to "reactor" or "sst" (not "${waste_from}")`;

  //flowrate
  let Q = this.Q; //ML/d

  //2 - page 9
  let frac = this.totals;    //object: fractionation (COD,TOC,TKN,TP,TSS)
  let COD  = frac.COD.total; //mg_COD/L influent "Sti"

  //fSus and fSup ratios
  let fSus = frac.COD.usCOD/COD; //g_USO/g_COD influent
  let fSup = frac.COD.upCOD/COD; //g_UPO/g_COD influent

  //2.1 - influent mass fluxes (kg/d)
  let fluxes = this.fluxes;             //object: all mass fluxes. structure: {components, totals}
  let FSti   = fluxes.totals.COD.total; //kg_COD/d  | total COD influent
  let FSbi   = fluxes.totals.COD.bCOD;  //kg_bCOD/d | biodegradable COD (VFA+FBSO+BPO) influent
  let FXti   = fluxes.totals.TSS.uVSS;  //kg_VSS/d  | UPO in VSS influent
  let FiSS   = fluxes.totals.TSS.iSS;   //kg_iSS/d  | iSS flux influent

  //2.2 - kinetics
  const bH = 0.24;                    //1/d | growth rate at 20ºC
  let bHT  = bH*Math.pow(1.029,T-20); //1/d | growth rate corrected by temperature

  //page 10
  const YH  = 0.45;               //gVSS/gCOD     | yield coefficient (does not change with temperature)
  let f_XBH = (YH*Rs)/(1+bHT*Rs); //g_VSS·d/g_COD | OHO biomass production rate

  //bCOD not degraded (FBSO)
  const k_v20 = 100.07;                    //TODO it should be 0.07 when done (current value makes it that FBSO is degraded to ~0 mg/L at the effluent) 
  let k_vT  = k_v20*Math.pow(1.035, T-20); //L/(mgVSS·d)
  let S_b   = 1/(f_XBH*k_vT);              //mgCOD/L
  let FdSbi = FSbi - Q*S_b;                //kg/d

  //calculate biomass (OHOs)
  let MX_BH    = FdSbi * f_XBH;          //kg_VSS        | OHO biomass produced
  const fH     = 0.20;                   //ø             | UPO OHO fraction
  let MX_EH    = fH * bHT * Rs * MX_BH;  //kg_VSS        | endogenous residue OHOs
  let MX_I     = FXti * Rs;              //kg_VSS        | unbiodegradable particulate organics
  let MX_V     = MX_BH + MX_EH + MX_I;   //kg_VSS        | VSS TODO ask george if we should multiply MX_BH*(1-fH)
  const f_iOHO = 0.15;                   //g_iSS/gX      | fraction of inert solids in biomass
  let MX_IO    = FiSS*Rs + f_iOHO*MX_BH; //kg_iSS        | inert solids
  let MX_T     = MX_V + MX_IO;           //kg_TSS        | TSS

  //biomass concentrations
  let X_BH = MX_BH/Vp; //kgVSS/m3 | live biomass concentration
  let X_EH = MX_EH/Vp; //kgVSS/m3 | endogenous residue OHOs
  let X_I  = MX_I/Vp;  //kgVSS/m3 | UPOs
  let X_V  = MX_V/Vp;  //kgVSS/m3 | VSS
  let X_IO = MX_IO/Vp; //kgiSS/m3 | inert solids
  let X_T  = MX_T/Vp;  //kgTSS/m3 | TSS

  //secondary Settler (SST) and recycle flow state variables
  let SST=(function(RAS){
    let f     = (1+RAS)/RAS;    //ø     | concentrating factor
    let X_RAS = f*X_T;          //kg/m3 | TSS concentration
    let Qr    = Q*RAS;          //ML/d  | recycle flowrate
    let Qw    = (Vp/Rs)/f/1000; //ML/d  | SST wastage flowrate
    return {f,X_RAS,Qr,Qw};
  })(RAS);

  //2.3 - page 11 | TODO ask george if HRT is different when wasting from SST
  let HRT = Vp/(Q*1000)*24; //hours | nominal hydraulic retention time

  //2.4 - page 12
  let Qw = (function(){
    if     (waste_from=='reactor') return (Vp/Rs)/1000;
    else if(waste_from=='sst')     return SST.Qw;
    else                           throw {waste_from};
  })();            //ML/day | wastage flow
  let Qe = Q - Qw; //ML/day | effluent flow

  //BPO, UPO, iSS concentrating factor
  let f = waste_from=='sst' ? SST.f : 1;

  //2.5 
  let fi      = MX_V/MX_T;  //VSS/TSS ratio
  let f_avOHO = MX_BH/MX_V; //mgOHOVSS/mgVSS | fraction of active biomass in VSS
  let f_atOHO = fi*f_avOHO; //mgOHOVSS/mgTSS | fraction of active biomass in TSS

  //get mass ratios
  const f_N_OHO  = this.mass_ratios.f_N_OHO;  //gN/gVSS
  const f_N_UPO  = this.mass_ratios.f_N_UPO;  //gN/gVSS
  const f_N_FBSO = this.mass_ratios.f_N_FBSO; //gN/gVSS
  const f_N_BPO  = this.mass_ratios.f_N_BPO;  //gP/gVSS

  const f_P_OHO  = this.mass_ratios.f_P_OHO;  //gP/gVSS
  const f_P_UPO  = this.mass_ratios.f_P_UPO;  //gP/gVSS
  const f_P_FBSO = this.mass_ratios.f_P_FBSO; //gP/gVSS
  const f_P_BPO  = this.mass_ratios.f_P_BPO;  //gP/gVSS

  const fCV_OHO  = this.mass_ratios.f_CV_OHO;  //gCOD/gVSS
  const fCV_UPO  = this.mass_ratios.f_CV_UPO;  //gCOD/gVSS
  const fCV_FBSO = this.mass_ratios.f_CV_FBSO; //gCOD/gVSS
  const fCV_BPO  = this.mass_ratios.f_CV_BPO;  //gCOD/gVSS

  //2.6 - Nitrogen - page 12
  let Ns      = (f_N_OHO*(MX_BH+MX_EH) + f_N_UPO*MX_I)/(Rs*Q); //mgN/L_influent | N in influent required for sludge production
  let Nte     = frac.TKN.total - Ns;                           //mg/L as N (TKN effluent)
  let ON_FBSO = frac.TKN.bsON;                                 //mg/L "Nobsi" influent
  let ON_USO  = frac.TKN.usON;                                 //mg/L "Nouse" influent
  let ON_BPO  = frac.TKN.bpON;                                 //mg/L "Nobsi" influent
  let ON_UPO  = frac.TKN.upON;                                 //mg/L "Noupi" influent

  //effluent ammonia
  let Nae = Nte - ON_USO - S_b/fCV_FBSO*f_N_FBSO; //mg/L as N (ammonia)

  //Effluent ammonia balance
  let Nae_balance = 100*Nae/(this.components.S_FSA+ON_FBSO+ON_BPO-(Ns-ON_UPO)); //percentage

  //2.7 - oxygen demand - page 13
  let FOc = FdSbi*((1-fCV_OHO*YH)+fCV_OHO*(1-fH)*bHT*f_XBH); //kg_O/d | carbonaceous oxygen demand
  let FOn = 4.57*Q*Nae;                                     //kg_O/d | nitrogenous oxygen demand
  let FOt = FOc + FOn;                                      //kg_O/d | total oxygen demand
  let OUR = FOt/(Vp*24)*1000;                               //mg/L·h | oxygen uptake rate

  //2.8 - effluent Phosphorus

  //Ps original formula (George)
  let Ps = (f_P_OHO*(MX_BH+MX_EH) + f_P_UPO*MX_I)/(Rs*Q); //mgP/L_influent | P in influent required for sludge production

  //Ps new formula corrected TODO discuss with George
  let Ps2 = (function(){                            //mg/L | P in influent required for sludge production
    let Ps_BPO = f_P_BPO*(1-fH)*MX_BH;              //kgP
    let Ps_UPO = f_P_UPO*(fH*MX_BH + MX_EH + MX_I); //kgP
    return (Ps_BPO+Ps_UPO)/(Rs*Q);                  //kg/ML == g/m3 == mg/L
  })();
  Ps=Ps2;
  console.log({Ps,Ps2});
  //CONTINUE HERE

  let Pti = frac.TP.total;                                 //mg/L | total P influent
  let Pte = Pti - Ps;                                      //mg/L | total P effluent
  let Pse = Pte - frac.TP.usOP - S_b/fCV_FBSO*f_P_FBSO;    //mg/L | inorganic soluble P effluent

  /*BALANCES*/
  //2.9 - COD Balance
  let Suse        = frac.COD.usCOD;                                       //mg/L as O | USO influent == effluent
  let FSe         = Qe*(S_b + Suse);                                      //kg/d as O | USO effluent flux + bCOD not degraded
  let FSw         = Qw*(S_b + Suse + f*(fCV_OHO*(X_BH+X_EH)+fCV_UPO*X_I)*1000); //kg/d as O | COD wastage flux
  let FSout       = FSe + FOc + FSw;                                      //kg/d as O | total COD out flux
  let COD_balance = 100*FSti/FSout;                                       //percentage

  //2.10 - N balance
  let FNti      = fluxes.totals.TKN.total;                                      //kg/d as N | total TKN influent
  let FNw       = Qw*(Nae + ON_USO + f*(f_N_OHO*(X_BH+X_EH)+f_N_UPO*X_I)*1000); //kg/d as N | total TKN wastage
  let FNte      = Qe*(ON_USO + Nae);                                            //kg/d as N | total TKN effluent
  let FNout     = FNw + FNte                                                    //kg/d as N | total TKN out
  let N_balance = 100*FNti/FNout;                                               //percentage

  //2.11 - P balance
  let FPti      = fluxes.totals.TP.total;                                //kg/d as P | total TP influent
  let FPw       = Qw*(Pte + f*(f_P_OHO*(X_BH+X_EH) + f_P_UPO*X_I)*1000); //kg/d as P | total TP wastage
  let FPte      = Qe*Pte;                                                //kg/d as P | total TP effluent
  let FPout     = FPw + FPte;                                            //kg/d as P | total TP out
  let P_balance = 100*FPti/FPout;                                        //percentage
  //AS end --------------------------------------------------------------------------

  //Calculate the concentration of BPO, UPO and iSS at the wastage
  //Solids summary:
  //  MX_BH = FdSbi * X_BH;           //kg_VSS | biomass production                   (BPO)
  //  MX_EH = fH * bHT * Rs * MX_BH;  //kg_VSS | endogenous residue OHOs              (UPO)
  //  MX_I  = FXti * Rs;              //kg_VSS | unbiodegradable particulate organics (UPO)
  //  MX_V  = MX_BH + MX_EH + MX_I;   //kg_VSS | total VSS                            (BPO+UPO)
  //  MX_IO = FiSS*Rs + f_iOHO*MX_BH; //kg_iSS | total inert solids                   (iSS)
  //  MX_T  = MX_V + MX_IO;           //kg_TSS | total TSS                            (BPO+UPO+iSS)
  //  f is the concentrating factor (if we are wasting from SST) = (1+RAS)/RAS. Otherwise is 1
  let BPO_was = f*fCV_BPO*(1-fH)*X_BH*1000;            //mg/L | BPO concentration
  let UPO_was = f*fCV_UPO*(fH*X_BH + X_EH + X_I)*1000; //mg/L | UPO concentration
  let iSS_was = f*X_IO*1000;                           //mg/L | iSS concentration

  //influent nitrate goes directly to effluent
  let NOx = this.components.S_NOx;

  //create output state variables (effluent, wastage)
  //syntax ------------> constructor(Q,  VFA, FBSO, BPO,     UPO,     USO,  iSS,     FSA, OP,  NOx)
  let effluent = new State_Variables(Qe, 0,   S_b,  0,       0,       Suse, 0,       Nae, Pse, NOx);
  let wastage  = new State_Variables(Qw, 0,   S_b,  BPO_was, UPO_was, Suse, iSS_was, Nae, Pse, NOx); 

  let FTPw = wastage.fluxes.totals.TP.total;       
  let FTPe = effluent.fluxes.totals.TP.total;       
  console.log({
    FPti,
    FTPw,
    FTPe,
    balance:100*(FTPw+FTPe)/FPti,
  });

  //process_variables
  let process_variables={
    fSus    :{value:fSus,      unit:"gUSO/gCOD",   descr:"USO/COD ratio (influent)"},
    fSup    :{value:fSup,      unit:"gUPO/gCOD",   descr:"UPO/COD ratio (influent)"}, 
    Ns      :{value:Ns,        unit:"mgN/L",       descr:"N required for sludge production"},
    Ps      :{value:Ps,        unit:"mgN/L",       descr:"P required for sludge production"},
    HRT     :{value:HRT,       unit:"hour",        descr:"Nominal Hydraulic Retention Time"},
    bHT     :{value:bHT,       unit:"1/d",         descr:"OHO Growth rate corrected by temperature"},
    f_XBH   :{value:f_XBH,     unit:"gVSS·d/gCOD", descr:"OHO Biomass production rate"},
    MX_BH   :{value:MX_BH,     unit:"kgVSS",       descr:"OHO Biomass produced VSS"},
    MX_EH   :{value:MX_EH,     unit:"kgVSS",       descr:"OHO Endogenous residue VSS"},
    MX_I    :{value:MX_I,      unit:"kgVSS",       descr:"Unbiodegradable organics VSS"},
    MX_V    :{value:MX_V,      unit:"kgVSS",       descr:"Volatile Suspended Solids"},
    MX_IO   :{value:MX_IO,     unit:"kgiSS",       descr:"Inert Solids (influent+biomass)"},
    MX_T    :{value:MX_T,      unit:"kgTSS",       descr:"Total Suspended Solids"},
    fi      :{value:fi,        unit:"gVSS/gTSS",   descr:"VSS/TSS ratio"},
    X_V     :{value:X_V,       unit:"kgVSS/m3",    descr:"VSS concentration in SST"},
    X_T     :{value:X_T,       unit:"kgTSS/m3",    descr:"TSS concentration in SST"},
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
  return {
    process_variables,
    effluent, 
    wastage,
  };
};

/*test*/
(function(){
  //return;
  //new influent
  //syntax---------------------(Q,  VFA, FBSO, BPO, UPO, USO, iSS, FSA,  OP,   NOx)
  let inf = new State_Variables(25, 50,  115,  440, 100,  45,  60, 39.1, 7.28, 0);
  //apply AS wasting from {reactor, sst}
  let as_rea = inf.activated_sludge(16, 8473.3, 15, 1.0, 'reactor'); //AS wasting from the reactor
  return
  let as_sst = inf.activated_sludge(16, 8473.3, 15, 1.0, 'sst');     //AS wasting from the sst
  console.log("=== AS process variables"); console.log(as_rea.effluent.components);
  return;
  //show results
  console.log("=== Influent");             console.log(inf.summary);
  console.log("=== AS process variables"); console.log(as_rea.process_variables);
  return;
  ////=== waste from reactor
  console.log("=== Effluent summary (waste from reactor)"); console.log(as_rea.effluent.summary);
  console.log("=== Wastage summary (waste from reactor)");  console.log(as_rea.wastage.summary);
  ////=== waste from sst
  console.log("=== Effluent summary (waste from sst)");     console.log(as_sst.effluent.summary);
  console.log("=== Wastage summary (waste from sst)");      console.log(as_sst.wastage.summary);
})();
