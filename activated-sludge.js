/*
  AS + SST implementation from G. Ekama notes

  Qi → [Activated Sludge + SST] → Qe
                  ↓ 
                  Qw
*/

//import files
if(typeof document == "undefined"){State_Variables=require("./state-variables.js");}

State_Variables.prototype.activated_sludge=function(T,Vp,Rs,RAS,waste_from,mass_FeCl3){
  //inputs and default values
  T          = isNaN(T )         ? 16     : T ;         //ºC   | Temperature
  Vp         = isNaN(Vp)         ? 8473.3 : Vp;         //m3   | Volume
  Rs         = isNaN(Rs)         ? 15     : Rs;         //days | Solids Retention Time or Sludge Age
  RAS        = isNaN(RAS)        ? 1.0    : RAS;        //ø    | SST underflow recycle ratio
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
  mass_FeCl3 = isNaN(mass_FeCl3) ? 50     : mass_FeCl3; //kg/d | mass of FeCl3 added for chemical P removal

  //flowrate
  let Q = this.Q; //ML/d

  //2 - page 9
  let frac = this.totals;    //object: fractionation (COD,TOC,TKN,TP,TSS)
  let COD  = frac.COD.total; //mg_COD/L influent "Sti"

  //fSus and fSup ratios
  let Suse = frac.COD.usCOD; //mg/L | USO influent == USO effluent
  let Supi = frac.COD.upCOD; //mg/L | UPO influent
  let fSus = Suse/COD;       //gUSO/gCOD influent
  let fSup = Supi/COD;       //gUPO/gCOD influent

  //2.1 - influent mass fluxes (kg/d)
  let fluxes = this.fluxes;             //object: all mass fluxes. structure: {components, totals}
  let FSbi   = fluxes.totals.COD.bCOD;  //kg_bCOD/d | biodegradable COD (VFA+FBSO+BPO) influent
  let FXti   = fluxes.totals.TSS.uVSS;  //kg_VSS/d  | UPO in VSS influent
  let FiSS   = fluxes.totals.TSS.iSS;   //kg_iSS/d  | iSS flux influent

  //2.2 - kinetics
  const bH = 0.24;                    //1/d | endogenous respiration rate at 20ºC
  let bHT  = bH*Math.pow(1.029,T-20); //1/d | endogenous respiration rate corrected by temperature

  //page 10
  const YH  = 0.45;               //gVSS/gCOD   | yield coefficient (does not change with temperature)
  //const YH  = 0.67/1.481;         //gVSS/gCOD   | yield coefficient (does not change with temperature)
  let f_XBH = (YH*Rs)/(1+bHT*Rs); //gVSS·d/gCOD | OHO biomass production rate

  //bCOD not degraded (FBSO)
  const k_v20       = 10000;                    //TODO change to 0.07 (high value makes that BSO effluent is ≈ 0) 
  const theta_k_v20 = 1.035;                    //temperature correction factor
  let k_vT  = k_v20*Math.pow(theta_k_v20,T-20); //L/(mgVSS·d)
  let S_b   = 1/(f_XBH*k_vT);                   //mgCOD/L
  let FdSbi = FSbi - Q*S_b;                     //kg/d COD

  //calculate biomass (OHOs)
  let MX_BH    = FdSbi * f_XBH;          //kgVSS     | OHO live biomass
  const fH     = 0.20;                   //ø         | UPO OHO fraction
  let MX_EH    = fH * bHT * Rs * MX_BH;  //kgVSS     | endogenous residue OHOs
  let MX_I     = FXti * Rs;              //kgVSS     | influent UPO
  let MX_V     = MX_BH + MX_EH + MX_I;   //kgVSS     | VSS
  const f_iOHO = 0.15;                   //giSS/gVSS | fraction of inert solids in biomass
  let MX_IO    = FiSS*Rs + f_iOHO*MX_BH; //kgiSS     | inert solids
  let MX_T     = MX_V + MX_IO;           //kgTSS     | TSS

  //biomass concentrations
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

  //2.5 
  let fi      = MX_V/MX_T;  //VSS/TSS ratio
  let f_avOHO = MX_BH/MX_V; //mgOHOVSS/mgVSS | fraction of active biomass in VSS
  let f_atOHO = fi*f_avOHO; //mgOHOVSS/mgTSS | fraction of active biomass in TSS

  //BPO, UPO, iSS concentrating factor in the recycle underflow
  let f = waste_from=='sst' ? SST.f : 1;

  /*Calculate N and P in influent required for sludge production*/
  //get mass ratios
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

  //2.6 - Nitrogen - page 12 | N in influent required for sludge production

  //Ns original formula (George)
  let Ns = (f_N_OHO*(MX_BH+MX_EH) + f_N_UPO*MX_I)/(Rs*Q); //mgN/L

  //Ns new formula corrected TODO discuss with George
  let Ns_new = (function(){                     //mgN/L
    let Ns_BPO = f_N_BPO*(1-fH)*MX_BH;          //kgN
    let Ns_UPO = f_N_UPO*(fH*MX_BH+MX_EH+MX_I); //kgN
    return (Ns_BPO+Ns_UPO)/(Rs*Q);              //kg/ML == g/m3 == mg/L
  })();
  //console.log({Ns, Ns_new}); //to see the difference
  Ns=Ns_new;

  //TKN effluent
  let Nti   = frac.TKN.total;        //mg/L | total TKN influent
  let Nte   = Nti - Ns;              //mg/L | total TKN effluent
  let Nobsi = frac.TKN.bsON;         //mg/L | bsON influent
  let Nouse = frac.TKN.usON;         //mg/L | usON influent = effluent
  let Nobpi = frac.TKN.bpON;         //mg/L | bpON influent
  let Noupi = frac.TKN.upON;         //mg/L | upON influent
  let Nobse = S_b*f_N_FBSO/fCV_FBSO; //mg/L | bsON effluent (not all FBSO is degraded)

  //effluent ammonia = total TKN - usON - bsON
  let Nae = Nte - Nouse - Nobse; //mg/L

  //NH4 balance
  let Nae_balance = 100*Nae/(this.components.S_FSA + Nobsi + Nobpi - ( Ns - Noupi ) ); //percentage

  //2.7 - oxygen demand - page 13
  //FOc original formula (George)
  let FOc = FdSbi*( (1-fCV_OHO*YH) + fCV_OHO*(1-fH)*bHT*f_XBH); //kgO/d  | carbonaceous oxygen demand
  //FOc new formula
  let FOc_new = (function(){
    let catabolism  = 1 - fCV_OHO*YH;                        //gCOD/gCOD | electrons used for energy (catabolism)
    let respiration = fCV_OHO*(1-fH)*bHT*(YH*Rs/(1+bHT*Rs)); //gCOD/gCOD | oxygen demand for endogenous respiration (O2->CO2)
    //console.log({catabolism, respiration});
    return FdSbi*(catabolism + respiration); //kgO/d
  })();

  let FOn = 4.57*Q*Nae;       //kgO/d  | nitrogenous oxygen demand
  let FOt = FOc + FOn;        //kgO/d  | total oxygen demand
  let OUR = FOt/(Vp*24)*1000; //mg/L·h | oxygen uptake rate

  //2.8 - effluent Phosphorus | P in influent required for sludge production
  //Ps original formula (George)
  let Ps = (f_P_OHO*(MX_BH+MX_EH) + f_P_UPO*MX_I)/(Rs*Q); //mgP/L | P influent required for sludge production
  //Ps new formula
  let Ps_new = (function(){                     //mgP/L
    let Ps_BPO = f_P_BPO*(1-fH)*MX_BH;          //kgP
    let Ps_UPO = f_P_UPO*(fH*MX_BH+MX_EH+MX_I); //kgP
    return (Ps_BPO+Ps_UPO)/(Rs*Q);              //kg/ML == g/m3 == mg/L
  })();
  Ps=Ps_new;

  let Pti   = frac.TP.total;         //mg/L | total P influent
  let Pte   = Pti - Ps;              //mg/L | total P effluent
  let Pouse = frac.TP.usOP;          //mg/L | P organic unbiodegradable soluble effluent
  let Pobse = S_b*f_P_FBSO/fCV_FBSO; //mg/L | P organic biodegradable soluble effluent
  let Pse   = Pte - Pouse - Pobse;   //mg/L | inorganic soluble P available for chemical P removal

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
  let iSS_was = f*X_IO*1000;                           //mg/L | iSS concentration (the iSS FeCl3 solids are added below)

  /*chemical P removal*/
  let cpr  = chemical_P_removal(Q, Pse, mass_FeCl3);
  Pse      = cpr.PO4e.value;         //mgP/L | overwrite Pse
  iSS_was += cpr.extra_iSS.value/Qw; //mg/L  | add the extra iSS from FeCl3 precipitation

  //influent nitrate goes directly to effluent
  let NOx = this.components.S_NOx;

  //output streams: effluent & wastage
  //syntax -------------------------(Q,  VFA, FBSO, BPO,     UPO,     USO,  iSS,     FSA, OP,  NOx)
  let effluent = new State_Variables(Qe, 0,   S_b,  0,       0,       Suse, 0,       Nae, Pse, NOx);
  let wastage  = new State_Variables(Qw, 0,   S_b,  BPO_was, UPO_was, Suse, iSS_was, Nae, Pse, NOx); 

  /*BALANCES*/
  let eff_fluxes = effluent.fluxes; //object
  let was_fluxes = wastage.fluxes;  //object

  //2.9 - COD Balance
  let FSti        = fluxes.totals.COD.total;     //kg/d | total COD influent
  let FSe         = eff_fluxes.totals.COD.total; //kg/d | total COD effluent: USO effluent flux + bCOD not degraded | Qe*(Suse+S_b)
  let FSw         = was_fluxes.totals.COD.total; //kg/d | total COD wastage

  //TODO discuss with george
  let FOc_real = FSti - FSe - FSw;
  //console.log({FOc, FOc_real});
  FOc=FOc_real;

  let FSout       = FSe + FSw + FOc;             //kg/d | total COD out flux
  let COD_balance = 100*FSti/FSout;              //percentage

  //2.10 - N balance
  let FNti      = fluxes.totals.TKN.total;     //kg/d as N | total TKN influent
  let FNte      = eff_fluxes.totals.TKN.total; //kg/d as N | total TKN effluent
  let FNw       = was_fluxes.totals.TKN.total; //kg/d as N | total TKN wastage
  let FNout     = FNte + FNw;                  //kg/d as N | total TKN out
  let N_balance = 100*FNti/FNout;              //percentage

  //2.11 - P balance
  let FPti      = fluxes.totals.TP.total;     //kg/d as P | total TP influent
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
    FOc_george :{value:FOc_new,       unit:"kgO/d",       descr:"Carbonaceous Oxygen Demand"},
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
    cpr,
    effluent, 
    wastage,
  };
};

function chemical_P_removal(Q, PO4i, mass_FeCl3){
  //inputs and default values
  Q          = isNaN(Q)          ? 1  : Q;          //ML/d
  PO4i       = isNaN(PO4i)       ? 7  : PO4i;       //mg/L as P (calculated as "Pse" in 'activated-sludge.js')
  mass_FeCl3 = isNaN(mass_FeCl3) ? 50 : mass_FeCl3; //kg/d | mass of FeCl3 added 

  //molecular weights (constants)
  const M_Fe        = 55.845;   //g/mol (Fe molecular weight)
  const M_P         = 30.974;   //g/mol (P molecular weight)
  const M_FeCl3     = 162.195;  //g/mol (FeCl3 molecular weight)
  const M_FeH2PO4OH = 250.9646; //g/mol ((Fe)(1.6)(H2PO4)(OH)(3.8) molecular weight)
  const M_FeOH3     = 106.866;  //g/mol (FeOH3 molecular weight)

  //get the PO4 effluent concentration from the Fe/P mole ratio
  //Fig 6-13, page 484, M&EA, 5th ed
  function get_PO4_eff(Fe_P_mole_ratio){
    /* 
      Calculate the residual soluble P concentration (C_P_residual), [mg/L] -> range: 0.01, 0.1, 1, 10 (log scale)
      Input: Fe to initial soluble P ratio, [mole/mole] -> range: 0, 1, 2, 3, 4, 5 (lineal scale)
    */

    //rename input to "inp"
    let inp = Fe_P_mole_ratio || 0;

    //min and max values are: 0.0001 and 5
    inp=Math.min(5,Math.max(0.0001,inp));

    //Figure 6-13 (Fe_P_mole ratio vs PO4_eff)
    let Figure=[
      {inp:8.00  , out:0.01},
      {inp:4.90  , out:0.02}, //if output is less than 0.02 is not linear
      {inp:4.50  , out:0.03},
      {inp:4.20  , out:0.04},
      {inp:3.90  , out:0.05},
      {inp:3.80  , out:0.06},
      {inp:3.70  , out:0.07},
      {inp:3.50  , out:0.08},
      {inp:3.35  , out:0.09},
      {inp:3.30  , out:0.10}, //book example has this value {PO4_eff:0.1, Fe_P_mole_ratio:3.3)
      {inp:2.60  , out:0.20},
      {inp:2.10  , out:0.30},
      {inp:2.00  , out:0.40},
      {inp:1.70  , out:0.50},
      {inp:1.50  , out:0.60},
      {inp:1.20  , out:0.70},
      {inp:1.10  , out:0.80},
      {inp:1.00  , out:0.90},
      {inp:1.00  , out:1.00}, //if input is greater than 1, it's no more linear
      {inp:0.20  , out:2.00},
      {inp:0.10  , out:3.00},
      {inp:0.10  , out:4.00},
      {inp:0.01  , out:5.00},
      {inp:0.01  , out:6.00},
      {inp:0.005 , out:7.00},
      {inp:0.001 , out:8.00},
      {inp:0.001 , out:9.00},
      {inp:0.0001, out:10.0},
    ];

    //perform linear interpolation (only if the ratio is not in the Figure)
    if(Figure.filter(row=>{return row.inp==inp}).length==0) {
      let Inps=Figure.map(row=>row.inp).sort(); //sort the values in ascending order
      for(let i=1;i<Inps.length;i++){
        if ((Inps[i-1]<inp) && (inp<Inps[i])){
          var i_below = Inps[i-1];
          var i_above = Inps[i];
          break;
        }
      }
      //find output above and below (o_above and o_below)
      let percentage = (inp-i_below)/(i_above-i_below);
      let o_below = Figure.find(row=>{return row.inp==i_below}).out;
      let o_above = Figure.find(row=>{return row.inp==i_above}).out;
      let o_inter = o_below + (o_above-o_below)*percentage;
      return o_inter;
    }else{ 
      //input is in the Figure
      return Figure.find(row=>{return inp==row.inp}).out;
    }
  };

  //get moles of P available in PO4
  let moles_P = Q*PO4i*1000/M_P; //moles/d of P

  //convert kg/d of FeCl3 to moles of Fe
  let mass_Fe  = M_Fe/M_FeCl3*mass_FeCl3; //kg/d of Fe
  let moles_Fe = mass_Fe*1000/M_Fe;       //moles/d Fe

  //get Fe/P mole ratio
  let Fe_P_mole_ratio = moles_Fe/moles_P; //mol_Fe/mol_P

  //get PO4 effluent and PO4 removed
  let PO4e        = get_PO4_eff(Fe_P_mole_ratio); //mg/L (Fig 6-13, page 484, M&EA, 5th ed, see function below 'get_PO4_eff')
  PO4e            = Math.min(PO4i, PO4e);         //PO4e cannot be higher than PO4i (i.e. if mass of FeCl3 = 0)
  let PO4_removed = Q*(PO4i - PO4e);              //kgP/d

  //get extra iSS sludge produced
  let extra_iSS = PO4_removed*(M_FeH2PO4OH+M_FeOH3*(Fe_P_mole_ratio-1.6))/M_P; //kg_iSS/d
  //chemical P removal end-----------------------------------------------------------------

  //return cpr process variables
  return {
    Fe_P_mole_ratio: {value:Fe_P_mole_ratio, unit:"molFe/molP", descr:"Fe/P mole ratio"},
    PO4i:            {value:PO4i,            unit:"mgP/L",      descr:"PO4 available"},
    PO4e:            {value:PO4e,            unit:"mgP/L",      descr:"PO4 effluent"},
    PO4_removed:     {value:PO4_removed,     unit:"kgP/d",      descr:"P removed"},
    extra_iSS:       {value:extra_iSS,       unit:"kgiSS/d",    descr:"iSS produced by FeCl3 coprecipitation (Fe(OH)3 and Fe(1.6)H2PO4(OH)3.8)"},
  };
};

/*test*/
(function(){
  return
  //new influent
  //syntax---------------------(Q,  VFA, FBSO, BPO, UPO, USO, iSS, FSA,  OP,   NOx)
  let inf = new State_Variables(25, 50,  115,  440, 100,  45,  60, 39.1, 7.28, 0);
  //apply AS wasting from {reactor, sst}
  let as_rea = inf.activated_sludge(16, 8473.3, 15, 1.0, 'reactor', 3000); //AS wasting from the reactor
  let as_sst = inf.activated_sludge(16, 8473.3, 15, 1.0, 'sst',     3000); //AS wasting from the sst
  //show results
  //console.log("=== Influent");             console.log(inf.summary);
  console.log("=== AS process variables");   console.log(as_rea.process_variables);
  console.log("=== AS chemical P removal "); console.log(as_rea.cpr);
  return;
  ////=== waste from reactor
  console.log("=== Effluent summary (waste from reactor)"); console.log(as_rea.effluent.summary);
  console.log("=== Wastage summary (waste from reactor)");  console.log(as_rea.wastage.summary);
  ////=== waste from sst
  console.log("=== Effluent summary (waste from sst)");     console.log(as_sst.effluent.summary);
  console.log("=== Wastage summary (waste from sst)");      console.log(as_sst.wastage.summary);
})();
